// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  isErr,
  isString,
  isUndefined,
  stringifyChallenge,
  unsafe,
} from "../deps.ts";
import { omitBy, quoted } from "../utils.ts";
import { DEFAULT_REALM } from "../constants.ts";
import type { Authentication, Parameters, Realm } from "../types.ts";

export interface User {
  /** The user name. */
  readonly name: string;

  /** The user password. */
  readonly password: string;
}

export interface Authorizer {
  (user: User): boolean | Promise<boolean>;
}

/** Basic authentication options. */
export interface BasicOptions {
  /**
   * @default `"Secure area"`
   */
  readonly realm?: string;

  readonly charset?: "UTF-8";
}

interface BasicAuthParams extends Realm {
  readonly charset?: `"UTF-8"`;
}

const DEFAULT_AUTH_PARAM = {
  realm: DEFAULT_REALM,
};

/** HTTP Basic Authentication. */
export class Basic implements Authentication {
  #wwwAuthenticate: string;

  readonly scheme = "Basic";

  /**
   * @throws {Error} If the options include invalid member.
   */
  constructor(
    public readonly authorizer: Authorizer,
    options: BasicOptions = DEFAULT_AUTH_PARAM,
  ) {
    const { realm = DEFAULT_AUTH_PARAM.realm, charset } = options;
    const params: BasicAuthParams = {
      realm: quoted(realm),
      charset: charset && quoted(charset),
    };
    const data = omitBy(params, isUndefined);
    this.#wwwAuthenticate = stringifyChallenge({
      authScheme: this.scheme,
      params: data,
    });
  }

  async authenticate(params: Parameters): Promise<boolean> {
    if (!isString(params)) return false;

    const b64Result = unsafe(() => atob(params));

    if (isErr(b64Result)) return false;

    const b64Token = b64Result.value;
    const resultUserPass = unsafe(() => parseUserPass(b64Token));

    if (isErr(resultUserPass)) return false;

    const userPass = resultUserPass.value;
    const user: User = { name: userPass.userId, password: userPass.password };

    return await this.authorizer(user);
  }

  challenge(): string {
    return this.#wwwAuthenticate;
  }
}

/** @see https://www.rfc-editor.org/rfc/rfc7617#section-2 */
// deno-lint-ignore no-control-regex
const reUserPass = /^([^\x00-\x1F\x7F]*?):([^\x00-\x1F\x7F]*)$/;

export interface UserPass {
  /** User ID. */
  readonly userId: string;

  /** User password. */
  readonly password: string;
}

/** Parse string into {@link UserPass}.
 * @throws {SyntaxError} If the input is invalid syntax.
 */
export function parseUserPass(input: string): UserPass {
  const result = reUserPass.exec(input);

  if (!result || !isString(result[1]) || !isString(result[2])) {
    throw SyntaxError("invalid user-pass syntax");
  }

  return { userId: result[1], password: result[2] };
}
