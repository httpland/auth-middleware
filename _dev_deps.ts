export {
  assert,
  assertEquals,
  assertFalse,
  assertThrows,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
export { describe, it } from "https://deno.land/std@0.184.0/testing/bdd.ts";
export {
  assertSpyCall,
  assertSpyCallArgs,
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.184.0/testing/mock.ts";
export { Status } from "https://deno.land/std@0.184.0/http/http_status.ts";
export { equalsResponse } from "https://deno.land/x/http_utils@1.0.0/response.ts";
export { AuthenticationHeader, toHashString } from "./deps.ts";
import {
  AuthenticationError,
  AuthenticationOk,
  AuthenticationResult,
} from "./types.ts";
export { err, ok } from "./utils.ts";

export function assertErr(
  input: AuthenticationResult,
  msg?: string,
): asserts input is AuthenticationError {
  if (input.type !== "error") throw Error(msg);
}

export function assertOk(
  input: AuthenticationResult,
  msg?: string,
): asserts input is AuthenticationOk {
  if (input.type !== "ok") throw Error(msg);
}
