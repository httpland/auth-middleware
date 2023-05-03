// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { DEFAULT_REALM } from "../constants.ts";
import { AuthenticationHeader, isString, stringifyChallenge } from "../deps.ts";
import { badRequest, err, ok, Quoted, quoted, unauthorized } from "../utils.ts";
import type {
  Authentication,
  AuthenticationResult,
  AuthParamsContext,
} from "../types.ts";

/** Bearer options. */
export interface BearerOptions {
  readonly realm?: string;
}

export class Bearer implements Authentication {
  #realm: Quoted;
  #authorizeToken: (token: string) => boolean | Promise<boolean>;

  scheme = "Bearer";

  constructor(
    authorizeToken: (token: string) => boolean | Promise<boolean>,
    options?: BearerOptions,
  ) {
    this.#realm = quoted(options?.realm ?? DEFAULT_REALM);
    this.#authorizeToken = authorizeToken;
  }

  async authenticate(
    context: Pick<AuthParamsContext, "params">,
  ): Promise<AuthenticationResult> {
    const { params } = context;

    if (!isString(params)) {
      return err(badRequest(null, {
        headers: {
          [AuthenticationHeader.WWWAuthenticate]: createChallenge(
            this.#realm,
            BearerError.InvalidRequest,
          ),
        },
      }));
    }

    const result = await this.#authorizeToken(params);

    if (!result) {
      return err(
        unauthorized(createChallenge(this.#realm, BearerError.InvalidToken)),
      );
    }

    return ok();
  }

  challenge(): string {
    return createChallenge(this.#realm);
  }
}

function createChallenge(realm: Quoted, error?: BearerError): string {
  const params: Record<string, string> = error
    ? { error: quoted(error), realm }
    : { realm };

  return stringifyChallenge({ authScheme: "Bearer", params });
}

const enum BearerError {
  InvalidRequest = "invalid_request",
  InvalidToken = "invalid_token",
}
