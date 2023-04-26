// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { type AuthParams, type Token68 } from "./deps.ts";
import { type Quoted } from "./utils.ts";

/** Authentication API. */
export interface Authentication {
  /** The authentication scheme. */
  readonly scheme: string;

  challenge: (request: Request) => string | Promise<string>;
  authenticate: (
    params: AuthParameters,
    request: Request,
  ) => boolean | Promise<boolean>;
}

export type AuthParameters = AuthParams | Token68;

export interface Realm {
  /** Realm. */
  readonly realm: Quoted;
}

/** User API. */
export interface User {
  /** The user name. */
  readonly username: string;

  /** The user password. */
  readonly password: string;
}
