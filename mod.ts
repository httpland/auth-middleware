// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

export { auth } from "./middleware.ts";
export { type Authorizer, Basic, type BasicOptions } from "./schemes/basic.ts";
export {
  Digest,
  type DigestAlgorithm,
  type DigestOptions,
  type SelectUser,
} from "./schemes/digest.ts";
export { Bearer, type BearerOptions } from "./schemes/bearer.ts";
export type { Authentication, User } from "./types.ts";
export { type Handler, type Middleware } from "./deps.ts";
