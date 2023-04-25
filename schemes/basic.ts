// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  type AuthParams,
  isErr,
  isString,
  stringifyChallenge,
  unsafe,
} from "../deps.ts";
import type { Authentication } from "../types.ts";

export interface User {
  readonly name: string;
  readonly password: string;
}

export interface Authorizer {
  (user: User): boolean | Promise<boolean>;
}

export interface BasicOptions extends Partial<BasicAuthParams> {
  /**
   * @default `"Secure area"`
   */
  readonly realm?: string;
}

export interface BasicAuthParams {
  /** Realm. */
  readonly realm: string;

  readonly charset?: "UTF-8";
}

const DEFAULT_AUTH_PARAM: BasicAuthParams = {
  realm: `"Secure area"`,
};

/** HTTP Basic Authentication.
 *
 * @example
 * ```ts
 * import auth from "https://deno.land/x/http_auth@$VERSION/mod.ts";
 * import Basic from "https://deno.land/x/http_auth@$VERSION/basic.ts";
 * import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
 *
 * const middleware = auth(
 *   new Basic({ "<user-id>": "<password>", admin: "123456" }),
 * );
 * const response = await middleware(
 *   new Request("http://localhost"),
 *   () => new Response(),
 * );
 *
 * assertEquals(
 *   response.headers.get("www-authenticate"),
 *   `Basic realm="Secure aria"`,
 * );
 * ```
 */
export class Basic implements Authentication {
  #wwwAuthenticate: string;

  readonly scheme = "Basic";

  constructor(
    public readonly authorizer: Authorizer,
    readonly options: BasicOptions = DEFAULT_AUTH_PARAM,
  ) {
    const { realm = DEFAULT_AUTH_PARAM.realm, charset } = options;

    const data: AuthParams = charset ? { realm, charset } : { realm };
    this.#wwwAuthenticate = stringifyChallenge({
      authScheme: this.scheme,
      params: data,
    });
  }

  async authenticate(token: AuthParams): Promise<boolean> {
    if (!isString(token)) return false;

    const b64Result = unsafe(() => atob(token));

    if (isErr(b64Result)) return false;

    const b64Token = b64Result.value;
    const resultUserPass = unsafe(() => parseUserPass(b64Token));

    if (isErr(resultUserPass)) return false;

    const userPass = resultUserPass.value;

    return await this.authorizer({
      name: userPass.userId,
      password: userPass.password,
    });
  }

  challenge(): string {
    return this.#wwwAuthenticate;
  }
}

/** @see https://www.rfc-editor.org/rfc/rfc7617#section-2 */
// deno-lint-ignore no-control-regex
const ReUserPass = /^([^\x00-\x1F\x7F]*?):([^\x00-\x1F\x7F]*)$/;

export interface UserPass {
  readonly userId: string;
  readonly password: string;
}

/** Parse string into {@link UserPass}.
 * @throws {SyntaxError}
 */
export function parseUserPass(input: string): UserPass {
  const result = ReUserPass.exec(input);

  if (!result || !isString(result[1]) || !isString(result[2])) {
    throw SyntaxError("invalid syntax");
  }

  return { userId: result[1], password: result[2] };
}
