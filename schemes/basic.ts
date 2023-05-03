// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  isErr,
  isString,
  isUndefined,
  stringifyChallenge,
  unsafe,
} from "../deps.ts";
import {
  badRequest,
  err,
  ok,
  omitBy,
  quoted,
  timingSafeEqual,
  unauthorized,
} from "../utils.ts";
import { DEFAULT_REALM } from "../constants.ts";
import type {
  Authentication,
  AuthenticationResult,
  AuthParamsContext,
  Realm,
  User,
} from "../types.ts";

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

const enum Msg {
  InvalidChallenge = "Authorization header should be valid challenge",
  InvalidBase64 = "Authorization challenge should be valid base-64 encoding",
  InvalidUserPass = "Authorization challenge should be valid user-pass",
}

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

  async authenticate(
    context: Pick<AuthParamsContext, "params">,
  ): Promise<AuthenticationResult> {
    const { params } = context;

    if (!isString(params)) return err(badRequest(Msg.InvalidChallenge));

    const b64Result = unsafe(() => atob(params));

    if (isErr(b64Result)) return err(badRequest(Msg.InvalidBase64));

    const b64Token = b64Result.value;
    const resultUserPass = unsafe(() => parseUserPass(b64Token));

    if (isErr(resultUserPass)) return err(badRequest(Msg.InvalidUserPass));

    const userPass = resultUserPass.value;
    const user: User = {
      username: userPass.userId,
      password: userPass.password,
    };

    const result = await this.authorizer(user);

    if (!result) return err(unauthorized(this.challenge()));

    return ok();
  }

  challenge(): string {
    return this.#wwwAuthenticate;
  }

  static timingSafeEqual = timingSafeEqual;
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
