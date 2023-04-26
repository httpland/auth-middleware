// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { timingSafeEqual as _timingSafeEqual } from "./deps.ts";
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
