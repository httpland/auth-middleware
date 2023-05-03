// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { type AuthParams, type Token68 } from "./deps.ts";
import { type Quoted } from "./utils.ts";

/** Authentication API. */
export interface Authentication {
  /** The authentication scheme. */
  readonly scheme: string;

  challenge: (context: CommonAuthContext) => string | Promise<string>;

  authenticate: (
    context: AuthContext,
  ) => AuthenticationResult | Promise<AuthenticationResult>;
}

export type AuthenticationResult =
  | { type: "ok" }
  | { type: "error"; response: Response };

export interface AuthenticationOk {
  type: "ok";
}

export interface AuthenticationError {
  type: "error";
  response: Response;
}

export interface AuthParamsContext {
  readonly authScheme: string;
  readonly params: AuthParams | Token68 | null;
}

export interface CommonAuthContext {
  readonly request: Request;
}

export interface AuthContext extends AuthParamsContext, CommonAuthContext {}

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
