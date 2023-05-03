// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  AuthParams,
  isObject,
  isString,
  isUndefined,
  stringifyChallenge,
  toHashString,
} from "../deps.ts";
import {
  badRequest,
  concat,
  err,
  ok,
  omitBy,
  type Quoted,
  quoted,
  timingSafeEqual,
  unauthorized,
} from "../utils.ts";
import { Char, DEFAULT_REALM } from "../constants.ts";
import type {
  Authentication,
  AuthenticationResult,
  AuthParamsContext,
  Realm,
  User,
} from "../types.ts";
import { Crypto } from "./_wasm/mod.ts";

const enum Algorithm {
  MD5 = "MD5",
  MD5sess = `${Algorithm.MD5}-sess`,
  SHA_256 = "SHA-256",
  SHA_256sess = `${Algorithm.SHA_256}-sess`,
  SHA_512_256 = "SHA-512-256",
  SHA_512_256sess = `${Algorithm.SHA_512_256}-sess`,
}

const algorithms = [
  Algorithm.MD5,
  Algorithm.MD5sess,
  Algorithm.SHA_256,
  Algorithm.SHA_256sess,
  Algorithm.SHA_512_256,
  Algorithm.SHA_512_256sess,
];

/** Digest algorithm. */
export type DigestAlgorithm = `${Algorithm}`;

/** Digest options. */
export interface DigestOptions {
  /** Algorithm. */
  readonly algorithm?: DigestAlgorithm;

  /** Realm.
   * @default "Secure area"
   */
  readonly realm?: string;

  /** Calculate nonce. */
  readonly nonce?: () => string | Promise<string>;

  /** A string of data, specified by the server.
   * It is recommended that this string be Base64 or hexadecimal data.
   */
  readonly opaque?: string;

  /** Protection space specified with URI. */
  readonly domain?: string[];

  /** Encoding scheme. */
  readonly charset?: "UTF-8";

  // TODO:(miyauci) support features
  // readonly qop?: readonly QOP[];
  // readonly userhash?: boolean;
}

/** User selection API. */
export interface SelectUser {
  (username: string): User | void | Promise<User | void>;
}

/** HTTP Digest authentication. */
export class Digest implements Authentication {
  scheme = "Digest";

  #staticOptions: AuthParams;
  #algorithm: DigestAlgorithm;
  #nonce: () => string | Promise<string>;
  #selectUser: SelectUser;

  constructor(
    selectUser: SelectUser,
    options: DigestOptions = {},
  ) {
    const {
      realm = DEFAULT_REALM,
      algorithm,
      charset,
      nonce = calculateNonce,
      opaque,
      domain,
    } = options;
    const params: Omit<DigestRequestParams, "nonce"> = {
      charset,
      realm: quoted(realm),
      qop: `"auth"`,
      algorithm,
      opaque: isString(opaque) ? quoted(opaque) : undefined,
      domain: domain && quoted(domain.join(" ")),
    };

    this.#staticOptions = omitBy(params, isUndefined);
    this.#algorithm = algorithm ?? Algorithm.MD5;
    this.#nonce = nonce;
    this.#selectUser = selectUser;
  }

  async authenticate(
    context:
      & { readonly request: Pick<Request, "method"> }
      & Pick<AuthParamsContext, "params">,
  ): Promise<AuthenticationResult> {
    const { request, params } = context;

    if (!isObject(params)) {
      return err(badRequest(`Authorization challenge should be valid`));
    }

    if (!isDigestResponseParams(params)) {
      return err(badRequest(`auth-param should be valid`));
    }

    const {
      nc,
      cnonce,
      qop,
      nonce,
      uri,
      response,
      realm,
      algorithm = Algorithm.MD5,
    } = params;

    if (!isDigestAlgorithm(algorithm)) {
      return err(
        badRequest(
          `auth-param of "algorithm" should be one of ${
            algorithms.map(quoted).join(", ")
          }`,
        ),
      );
    }

    const username = unq(params.username);
    const maybeUser = await this.#selectUser(username);

    if (!maybeUser || !timingSafeEqual(username, maybeUser.username)) {
      return err(unauthorized(await this.challenge()));
    }

    const res = calculateResponse({
      cnonce: unq(cnonce),
      method: request.method,
      nc: unq(nc),
      nonce: unq(nonce),
      qop,
      realm: unq(realm),
      secret: maybeUser.password,
      uri: unq(uri),
      username: maybeUser.username,
      algorithm,
    });

    const result = timingSafeEqual(unq(response), res);

    if (!result) return err(unauthorized(await this.challenge()));

    return ok();
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

/** Whether the input is {@link DigestAlgorithm} or not. */
export function isDigestAlgorithm(input: string): input is DigestAlgorithm {
  switch (input) {
    case Algorithm.MD5:
    case Algorithm.MD5sess:
    case Algorithm.SHA_256sess:
    case Algorithm.SHA_256:
    case Algorithm.SHA_512_256:
    case Algorithm.SHA_512_256sess: {
      return true;
    }

    default: {
      return false;
    }
  }
}

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

export function calculateResponse(context: {
  username: string;
  nonce: string;
  secret: string;
  method: string;
  uri: string;
  realm: string;
  nc: string;
  cnonce: string;
  qop: string;
  algorithm: DigestAlgorithm;
}): string {
  const {
    method,
    uri,
    username,
    realm,
    secret,
    nonce,
    nc,
    cnonce,
    qop,
    algorithm,
  } = context;
  const sess = algorithm.endsWith("sess");
  const H = Supported[normalizeAlgorithm(algorithm as Algorithm)];
  const _A1 = concat(username, ":", realm, ":", secret);
  const A1 = sess ? concat(H(_A1), ":", nonce, ":", cnonce) : _A1;
  const A2 = `${method}:${uri}`;

  /** Calculate key for digest.
   * @see [RFC 7616, 3.3.  The WWW-Authenticate Response Header Field](https://datatracker.ietf.org/doc/html/rfc7616#section-3.3)
   */
  function KD(secret: string, data: string): string {
    return H(concat(secret, ":", data));
  }

  const response = KD(H(A1), `${nonce}:${nc}:${cnonce}:${qop}:${H(A2)}`);

  return response;
}

export function sha256(input: string): string {
  return toHashString(
    Crypto.subtle.digestSync(
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

interface DigestParams extends Realm {
  readonly nonce: Quoted;
  readonly opaque?: Quoted;
}

interface DigestRequestParams extends DigestParams {
  readonly algorithm?: `${Algorithm}`;
  readonly charset?: "UTF-8";
  readonly domain?: Quoted;
  readonly qop: Quoted;
}

export interface DigestResponseParams extends DigestParams {
  readonly response: Quoted;
  readonly username: Quoted;
  readonly uri: Quoted;
  readonly cnonce: Quoted;
  readonly nc: string;
  readonly qop: string;
}

function isDigestResponseParams(
  // deno-lint-ignore no-explicit-any
  authParams: Record<string, any>,
): authParams is DigestResponseParams {
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
