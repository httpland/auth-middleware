import {
  assert,
  assertSpyCall,
  assertSpyCalls,
  AuthenticationHeader,
  describe,
  equalsResponse,
  err,
  it,
  ok,
  spy,
  Status,
} from "./_dev_deps.ts";
import { auth } from "./mod.ts";

describe("auth", () => {
  it("should return unauthenticated response when the authorization header is none. The handler and authenticate should not call", async () => {
    const handler = spy(() => new Response());
    const authenticate = spy(() => ok());
    const challenge = spy(() => "test");

    const middleware = auth({ scheme: "a", authenticate, challenge });
    const response = await middleware(
      new Request("http://localhost"),
      handler,
    );

    assertSpyCalls(handler, 0);
    assertSpyCalls(authenticate, 0);
    assertSpyCalls(challenge, 1);
    assert(
      equalsResponse(
        response,
        new Response(null, {
          status: Status.Unauthorized,
          headers: {
            [AuthenticationHeader.WWWAuthenticate]: "test",
          },
        }),
      ),
    );
  });

  it("should return challenge unauthenticated response when the authorization header is invalid. The handler and authenticate should not call", async () => {
    const handler = spy(() => new Response());
    const authenticate = spy(() => ok());
    const challenge = spy(() => "test");
    const middleware = auth({
      scheme: "a",
      authenticate,
      challenge,
    });
    const response = await middleware(
      new Request("http://localhost", {
        headers: { [AuthenticationHeader.Authorization]: "" },
      }),
      handler,
    );

    assertSpyCalls(handler, 0);
    assertSpyCalls(authenticate, 0);
    assertSpyCalls(challenge, 0);
    assert(
      equalsResponse(
        response,
        new Response(`Authorization header should be valid syntax`, {
          status: Status.BadRequest,
        }),
      ),
    );
  });

  it("should return unauthenticated response when the authorization is false. The handler should not call", async () => {
    const handler = spy(() => new Response());
    const initResponse = new Response();
    const authenticate = spy(() => err(initResponse));
    const challenge = spy(() => "test");

    const middleware = auth({
      scheme: "a",
      authenticate: authenticate,
      challenge,
    });
    const response = await middleware(
      new Request("http://localhost", {
        headers: { [AuthenticationHeader.Authorization]: "a" },
      }),
      handler,
    );

    assertSpyCalls(handler, 0);
    assertSpyCalls(authenticate, 1);
    assertSpyCalls(challenge, 0);
    assert(response === initResponse);
  });

  it("should return handler response when the authorization is valid", async () => {
    const authenticate = spy(() => ok());
    const handler = spy(() => new Response());
    const challenge = spy(() => "");

    const middleware = auth({
      scheme: "a",
      authenticate,
      challenge,
    });
    const response = await middleware(
      new Request("http://localhost", {
        headers: { [AuthenticationHeader.Authorization]: "a   token" },
      }),
      handler,
    );

    assertSpyCalls(challenge, 0);
    assertSpyCall(authenticate, 0);
    assertSpyCalls(handler, 1);
    assert(equalsResponse(
      response,
      new Response(null, { status: 200 }),
    ));
  });

  it(
    "should return handler response when the authorization case insensitive scheme is same",
    async () => {
      const authenticate = spy(() => ok());
      const handler = spy(() => new Response());
      const challenge = spy(() => "");

      const middleware = auth({
        scheme: "A",
        authenticate,
        challenge,
      });
      const response = await middleware(
        new Request("http://localhost", {
          headers: { [AuthenticationHeader.Authorization]: "a   token" },
        }),
        handler,
      );

      assertSpyCalls(challenge, 0);
      assertSpyCalls(authenticate, 1);
      assertSpyCalls(handler, 1);
      assert(equalsResponse(
        response,
        new Response(null, { status: 200 }),
      ));
    },
  );
});