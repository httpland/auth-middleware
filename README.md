# auth-middleware

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno)](https://deno.land/x/auth-middleware)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/auth_middleware/mod.ts)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/httpland/auth-middleware)](https://github.com/httpland/auth-middleware/releases)
[![codecov](https://codecov.io/github/httpland/auth-middleware/branch/main/graph/badge.svg)](https://codecov.io/gh/httpland/auth-middleware)
[![GitHub](https://img.shields.io/github/license/httpland/auth-middleware)](https://github.com/httpland/auth-middleware/blob/main/LICENSE)

[![test](https://github.com/httpland/auth-middleware/actions/workflows/test.yaml/badge.svg)](https://github.com/httpland/auth-middleware/actions/workflows/test.yaml)
[![NPM](https://nodei.co/npm/@httpland/auth-middleware.png?mini=true)](https://nodei.co/npm/@httpland/auth-middleware/)

HTTP authentication middleware.

Compliant with
[RFC 9110, 11 HTTP Authentication](https://www.rfc-editor.org/rfc/rfc9110.html#name-http-authentication).

## Middleware

For a definition of Universal HTTP middleware, see the
[http-middleware](https://github.com/httpland/http-middleware) project.

## Usage

You specify the Authenticate scheme and provide the authentication function for
token.

```ts
import {
  auth,
  Authentication,
  type Handler,
} from "https://deno.land/x/auth_middleware@$VERSION/mod.ts";

declare const authentication: Authentication;
declare const request: Request;
declare const handler: Handler;

const middleware = auth(authentication);
const response = await middleware(request, handler);
```

## Basic authentication

Provides ready-to-use Authorization for Basic Authentication.

Compliant with
[RFC 7617, The 'Basic' HTTP Authentication Scheme](https://www.rfc-editor.org/rfc/rfc7617).

```ts
import {
  auth,
  Basic,
  type Handler,
  type User,
} from "https://deno.land/x/auth_middleware@$VERSION/mod.ts";
import { assert } from "https://deno.land/std/testing/asserts.ts";
import { assertSpyCalls, spy } from "https://deno.land/std/testing/mock.ts";

declare const admin: User;
declare const request: Request;
declare const handler: Handler;

const middleware = auth(
  new Basic(({ username, password }) => {
    const userResult = Basic.timingSafeEqual(username, admin.username);
    const passResult = Basic.timingSafeEqual(password, admin.password);

    return userResult && passResult;
  }),
);
const spiedHandler = spy(handler);
const response = await middleware(request, spiedHandler);

assertSpyCalls(spiedHandler, 0);
assert(response.headers.has("www-authenticate"));
```

yield:

```http
WWW-Authenticate: Basic realm="Secure area"
```

## License

Copyright © 2023-present [httpland](https://github.com/httpland).

Released under the [MIT](./LICENSE) license
