// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { type AuthParams, type Token68 } from "./deps.ts";

export interface Authentication {
  /** The authentication scheme. */
  readonly scheme: string;

  challenge(request: Request): string | Promise<string>;
  authenticate(
    params: AuthParams | Token68,
    request: Request,
  ): boolean | Promise<boolean>;
}
