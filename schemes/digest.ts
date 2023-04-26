// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  AuthParams,
  isString,
  isUndefined,
  stringifyChallenge,
  toHashString,
} from "../deps.ts";
import {
  concat,
  omitBy,
  type Quoted,
  quoted,
  timingSafeEqual,
} from "../utils.ts";
import { Char, DEFAULT_REALM } from "../constants.ts";
import type { Authentication, Parameters, Realm, User } from "../types.ts";
import { Crypto } from "./_wasm/mod.ts";

const enum Algorithm {
  MD5 = "MD5",
  MD5sess = `${Algorithm.MD5}-sess`,
  SHA_256 = "SHA-256",
  SHA_256sess = `${Algorithm.SHA_256}-sess`,
  SHA_512_256 = "SHA-512-256",
  SHA_512_256sess = `${Algorithm.SHA_512_256}-sess`,
}

export interface DigestOptions {
  /** Algorithm. */
  readonly algorithm?: `${Algorithm}`;

  /** Realm.
   * @default "Secure area"
   */
  readonly realm?: string;

  /** Calculate nonce. */
  readonly nonce?: () => string | Promise<string>;

  // TODO:(miyauci) Support this field.

  /** A string of data, specified by the server.
   * It is recommended that this string be Base64 or hexadecimal data.
   */
  readonly opaque?: string;

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
  readonly opaque?: Quoted;
}

type QOP = "auth" | "auth-init";

export class Digest implements Authentication {
  scheme = "Digest";

  #staticOptions: AuthParams;
  #hash: (input: string) => string | Promise<string>;
  #algorithm: `${Algorithm}`;
  #sess: boolean;
  #nonce: () => string | Promise<string>;

  constructor(
    public readonly authorizer: (
      username: string,
    ) => User | void | Promise<User | void>,
    public readonly options: DigestOptions = {},
  ) {
    const {
      qop = ["auth"],
      realm = DEFAULT_REALM,
      algorithm,
      charset,
      nonce = calculateNonce,
      opaque,
    } = options;
    const params: Omit<DigestArgs, "nonce"> = {
      charset,
      realm: quoted(realm),
      qop: qop.join(", "),
      algorithm,
      opaque: isString(opaque) ? quoted(opaque) : undefined,
    };

    this.#staticOptions = omitBy(params, isUndefined);
    this.#algorithm = algorithm ?? Algorithm.MD5;
    this.#hash = Supported[normalizeAlgorithm(this.#algorithm as Algorithm)];
    this.#sess = this.#algorithm.endsWith("sess");
    this.#nonce = nonce;
  }

  async authenticate(token: Parameters, request: Request): Promise<boolean> {
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

    const username = unq(token.username);
    const maybeUser = await this.authorizer(username);

    if (!maybeUser || !timingSafeEqual(username, maybeUser.username)) {
      return false;
    }

    const method = request.method;
    const res = await calculateResponse({
      cnonce: unq(cnonce),
      method,
      nc: unq(nc),
      nonce: unq(nonce),
      qop,
      realm: unq(realm),
      secret: maybeUser.password,
      uri: unq(uri),
      username: maybeUser.username,
      hash: this.#hash.bind(this),
    }, { sess: this.#sess });

    return unq(response) === res;
  }

  async challenge(): Promise<string> {
    const nonce = await this.#nonce();
    const challenge = stringifyChallenge({
      authScheme: this.scheme,
      params: { ...this.#staticOptions, nonce: quoted(nonce) },
    });

    return challenge;
  }
}

const Supported = {
  [Algorithm.MD5]: md5,
  [Algorithm.SHA_256]: sha256,
  [Algorithm.SHA_512_256]: sha512_256,
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

export function md5(input: string): string {
  return toHashString(
    Crypto.subtle.digestSync(Algorithm.MD5, new TextEncoder().encode(input)),
  );
}

export function sha512_256(input: string): string {
  return toHashString(
    Crypto.subtle.digestSync(
      Algorithm.SHA_512_256,
      new TextEncoder().encode(input),
    ),
  );
}

async function calculateResponse(
  { method, uri, username, realm, secret, hash, nonce, nc, cnonce, qop }: {
    username: string;
    nonce: string;
    secret: string;
    method: string;
    uri: string;
    realm: string;
    nc: string;
    cnonce: string;
    qop: string;
    hash: (input: string) => string | Promise<string>;
  },
  options?: { sess?: boolean },
): Promise<string> {
  const _A1 = concat(username, ":", realm, ":", secret);
  const A1 = options?.sess
    ? concat(await hash(_A1), ":", nonce, ":", cnonce)
    : _A1;
  const A2 = `${method}:${uri}`;

  /** Calculate key for digest.
   * @see [RFC 7616, 3.3.  The WWW-Authenticate Response Header Field](https://datatracker.ietf.org/doc/html/rfc7616#section-3.3)
   */
  function KD(secret: string, data: string) {
    return hash(concat(secret, ":", data));
  }

  const response = await KD(
    await hash(A1),
    concat(nonce, ":", nc, ":", cnonce, ":", qop, ":", await hash(A2)),
  );

  return response;
}

export async function sha256(input: string): Promise<string> {
  return toHashString(
    await crypto.subtle.digest(
      Algorithm.SHA_256,
      new TextEncoder().encode(input),
    ),
  );
}

function normalizeAlgorithm(
  algorithm: Algorithm,
): Algorithm.MD5 | Algorithm.SHA_256 | Algorithm.SHA_512_256 {
  switch (algorithm) {
    case Algorithm.MD5sess: {
      return Algorithm.MD5;
    }
    case Algorithm.SHA_256sess: {
      return Algorithm.SHA_256;
    }

    case Algorithm.SHA_512_256sess: {
      return Algorithm.SHA_512_256;
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
