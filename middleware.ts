// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import {
  AuthenticationHeader,
  type Handler,
  isErr,
  isString,
  type Middleware,
  parseAuthorization,
  Status,
  unsafe,
} from "./deps.ts";
import type { Authentication } from "./types.ts";
import { equalsCaseInsensitive, toArray } from "./utils.ts";

/** Create authentication middleware with authorization.
 *
 * @example
 * ```ts
 * import auth from "https://deno.land/x/http_auth@$VERSION/mod.ts";
 * import {
 *   assertSpyCall,
 *   assertSpyCalls,
 *   spy,
 * } from "https://deno.land/std@0.177.0/testing/mock.ts";
 * import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
 *
 * const handler = spy(() => new Response());
 * const authenticate = spy(() => false);
 * const middleware = auth({ scheme: "<auth-scheme>", authenticate });
 * const response = await middleware(
 *   new Request("http://localhost", {
 *     headers: { authorization: "<auth-scheme> <token>" },
 *   }),
 *   handler,
 * );
 *
 * assertSpyCalls(handler, 0);
 * assertSpyCall(authenticate, 0, { args: ["<token>"] });
 * assertEquals(response.status, 401);
 * assertEquals(response.headers.get("www-authenticate"), "<auth-scheme>");
 * ```
 */
export function auth(
  authentication:
    | Authentication
    | readonly [Authentication, ...readonly Authentication[]],
): Middleware {
  const authentications = toArray(authentication);

  return _auth.bind(null, authentications);
}

export async function _auth(
  authentications: readonly Authentication[],
  request: Request,
  next: Handler,
) {
  const authorization = request.headers.get(AuthenticationHeader.Authorization);

  if (!isString(authorization)) return respond();

  const result = unsafe(() => parseAuthorization(authorization));

  if (isErr(result)) return respond();

  const { authScheme, params } = result.value;

  for (const authentication of authentications) {
    // Case insensitive @see https://www.rfc-editor.org/rfc/rfc9110.html#section-11.1
    if (!params || !equalsCaseInsensitive(authentication.scheme, authScheme)) {
      continue;
    }

    const pass = await authentication.authenticate(params, request);

    if (pass) return next(request);
  }

  return respond();

  async function respond(): Promise<Response> {
    const wwwAuthenticate = (await Promise.all(
      authentications.map((auth) => auth.challenge(request)),
    ))
      .join(", ");
    const headers = { [AuthenticationHeader.WWWAuthenticate]: wwwAuthenticate };

    return new Response(null, { status: Status.Unauthorized, headers });
  }
}
