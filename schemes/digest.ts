// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  AuthParams,
  crypto,
  isString,
  isUndefined,
  stringifyChallenge,
  toHashString,
} from "../deps.ts";
import { concat, omitBy, type Quoted, quoted } from "../utils.ts";
import { Char, DEFAULT_REALM } from "../constants.ts";
import type { Authentication, Parameters, Realm } from "../types.ts";

const enum Algorithm {
  MD5 = "MD5",
  MD5sess = `${Algorithm.MD5}-sess`,
  SHA_256 = "SHA-256",
  SHA_256sess = `${Algorithm.SHA_256}-sess`,
}

export interface DigestOptions {
  /** Algorithm. */
  readonly algorithm?: `${Algorithm}`;

  /** Realm.
   * @default "Secure area"
   */
  readonly realm?: string;

  /** Calculate nonce. */
  readonly nonce?: () => string;
  // readonly opaque?: string;
  // readonly stale?: boolean;
  // readonly domain?: string[];
  readonly qop?: readonly QOP[];

  /** Encoding scheme. */
  readonly charset?: "UTF-8";
}

interface DigestArgs extends Realm {
  readonly algorithm?: `${Algorithm}`;
  readonly nonce: Quoted;
  readonly qop: string;
  readonly charset?: "UTF-8";
}

type QOP = "auth" | "auth-init";

export class Digest implements Authentication {
  scheme = "Digest";

  #staticOptions: AuthParams;
  #hash: (input: string) => string;
  #algorithm: `${Algorithm}`;
  #sess: boolean;
  #nonce: () => string;

  constructor(
    public users: Readonly<Record<string, string>>,
    public readonly options: DigestOptions = {},
  ) {
    const {
      qop = ["auth"],
      realm = DEFAULT_REALM,
      algorithm,
      charset,
      nonce = calculateNonce,
    } = options;
    const params: Omit<DigestArgs, "nonce"> = {
      charset,
      realm: quoted(realm),
      qop: qop.join(", "),
      algorithm,
    };
    const algo = algorithm ?? Algorithm.MD5;

    this.#staticOptions = omitBy(params, isUndefined);
    this.#algorithm = algo;
    this.#hash = Supported[normalizeAlgorithm(algo as Algorithm)];
    this.#sess = algo.endsWith("sess");
    this.#nonce = nonce;
  }

  authenticate(token: Parameters, request: Request): boolean {
    if (isString(token) || !isDigestParams(token)) return false;

    const {
      nc,
      cnonce,
      qop,
      nonce,
      uri,
      response,
      realm,
      algorithm = Algorithm.MD5,
    } = token;

    if (algorithm !== this.#algorithm) return false;

    const method = request.method;
    const a1List = Object.entries(this.users).map(([username, passwd]) => {
      const A1 = calcA1({ username, realm, passwd });

      const a1 = this.#sess
        ? `${this.#hash(A1)}:${unq(nonce)}:${unq(cnonce)}`
        : A1;

      return a1;
    });
    const A2 = `${method}:${unq(uri)}`;
    const hashList = a1List.map((A1) =>
      this.#KD(
        this.#H(A1),
        `${unq(nonce)}:${nc}:${unq(cnonce)}:${unq(qop)}:${this.#H(A2)}`,
      )
    ).map(quoted);

    return hashList.includes(response);
  }

  challenge(): string {
    const nonce = this.#nonce();
    const challenge = stringifyChallenge({
      authScheme: this.scheme,
      params: { ...this.#staticOptions, nonce: quoted(nonce) },
    });

    return challenge;
  }

  /**
   * @see [RFC 7616, 3.3.  The WWW-Authenticate Response Header Field](https://datatracker.ietf.org/doc/html/rfc7616#section-3.3)
   */
  #H(data: string): string {
    return this.#hash(data);
  }

  /** Calculate key for digest.
   * @see [RFC 7616, 3.3.  The WWW-Authenticate Response Header Field](https://datatracker.ietf.org/doc/html/rfc7616#section-3.3)
   */
  #KD(secret: string, data: string): string {
    return this.#H(concat(secret, ":", data));
  }
}

const Supported = {
  [Algorithm.MD5]: md5,
  [Algorithm.SHA_256]: sha256,
};

/** Un-quoted string. */
export function unq(input: string): string {
  if (input.startsWith(Char.DQuote) && input.endsWith(Char.DQuote)) {
    return input.slice(1, -1);
  }

  return input;
}

function calculateNonce(): string {
  return btoa(crypto.randomUUID());
}

export function calcA1(
  { username, realm, passwd }: {
    username: string;
    realm: string;
    passwd: string;
  },
): string {
  return concat(username, ":", unq(realm), ":", passwd);
}

export function md5(input: string): string {
  return toHashString(
    crypto.subtle.digestSync(Algorithm.MD5, new TextEncoder().encode(input)),
  );
}

export function sha256(input: string): string {
  return toHashString(
    crypto.subtle.digestSync(
      Algorithm.SHA_256,
      new TextEncoder().encode(input),
    ),
  );
}

function normalizeAlgorithm(
  algorithm: Algorithm,
): Algorithm.MD5 | Algorithm.SHA_256 {
  switch (algorithm) {
    case Algorithm.MD5sess: {
      return Algorithm.MD5;
    }
    case Algorithm.SHA_256sess: {
      return Algorithm.SHA_256;
    }

    default: {
      return algorithm;
    }
  }
}

interface DigestParams extends AuthParams, Realm {
  readonly response: Quoted;
  readonly username: Quoted;
  readonly nonce: Quoted;
  readonly uri: Quoted;
  readonly cnonce: Quoted;
  readonly qop: string;
  readonly nc: string;
}

function isDigestParams(
  authParams: Partial<AuthParams>,
): authParams is DigestParams {
  return Object
    .values(DigestParamKey)
    .every((key) => key in authParams);
}

enum DigestParamKey {
  Response = "response",
  Username = "username",
  Realm = "realm",
  URI = "uri",
  Cnonce = "cnonce",
  Nc = "nc",
  Nonce = "nonce",
  QOP = "qop",
}
