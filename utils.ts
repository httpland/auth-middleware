// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  AuthenticationHeader,
  Status,
  timingSafeEqual as _timingSafeEqual,
} from "./deps.ts";
import type { AuthenticationError, AuthenticationOk } from "./types.ts";
import { Char } from "./constants.ts";

/** Whether the inputs same as case insensitive or not. */
export function equalsCaseInsensitive(left: string, right: string): boolean {
  return !left.localeCompare(right, undefined, { sensitivity: "base" });
}

export function toArray<T>(input: T): T extends readonly unknown[] ? T : [T] {
  return Array.isArray(input) ? input as never : [input] as never;
}

export function timingSafeEqual(left: string, right: string): boolean {
  const l = new TextEncoder().encode(left);
  const r = new TextEncoder().encode(right);

  return _timingSafeEqual(l, r);
}

// deno-lint-ignore no-explicit-any
export function omitBy<T extends Record<any, any>, U extends T[keyof T]>(
  record: T,
  fn: (input: T[keyof T]) => input is U,
): Record<keyof T, Exclude<T[keyof T], U>> {
  // deno-lint-ignore no-explicit-any
  const obj: Record<any, any> = {};

  for (const key in record) {
    const value = record[key];

    if (!fn(value)) obj[key] = value;
  }
  return obj;
}

/** Concat string. */
export function concat(...args: readonly string[]): string {
  return args.reduce((acc, cur) => acc + cur, "");
}

export type Quoted = `"${string}"`;

export function quoted<T extends string>(
  input: T,
): T extends `"${string}"` ? T : `"${T}"` {
  if (input.startsWith(Char.DQuote) && input.endsWith(Char.DQuote)) {
    return input as never;
  }

  return `${Char.DQuote}${input}${Char.DQuote}` as never;
}

export function ok(): AuthenticationOk {
  return { type: "ok" };
}

export function err(response: Response): AuthenticationError {
  return { type: "error", response };
}

export function badRequest(
  body?: BodyInit | null | undefined,
  init?: ResponseInit,
): Response {
  return new Response(body, { ...init, status: Status.BadRequest });
}

export function unauthorized(authenticate: string): Response {
  return new Response(null, {
    status: Status.Unauthorized,
    headers: {
      [AuthenticationHeader.WWWAuthenticate]: authenticate,
    },
  });
}
