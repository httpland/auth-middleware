import { Bearer } from "./bearer.ts";
import {
  assert,
  assertEquals,
  assertErr,
  assertOk,
  assertSpyCalls,
  describe,
  equalsResponse,
  it,
  spy,
  Status,
} from "../_dev_deps.ts";
import { AuthenticationHeader } from "../deps.ts";

describe("Bearer", () => {
  it("should be Bearer scheme", () => {
    assertEquals(new Bearer(() => true).scheme, "Bearer");
  });

  it("should return challenge value", () => {
    assertEquals(
      new Bearer(() => true).challenge(),
      `Bearer realm="Secure area"`,
    );
  });

  it("should return Err(400) if the params are invalid", async () => {
    const authorize = spy(() => true);
    const result = await new Bearer(authorize).authenticate({ params: null });

    assertSpyCalls(authorize, 0);
    assertErr(result);
    assert(
      equalsResponse(
        result.response,
        new Response(null, {
          status: Status.BadRequest,
          headers: {
            [AuthenticationHeader.WWWAuthenticate]:
              `Bearer error="invalid_request", realm="Secure area"`,
          },
        }),
        true,
      ),
    );
  });

  it("should return Ok if the toke matched", async () => {
    const authorize = spy(() => true);
    const result = await new Bearer(authorize).authenticate({
      params: "token",
    });

    assertSpyCalls(authorize, 1);
    assertOk(result);
  });

  it("should return Err(401) if the toke does not match", async () => {
    const authorize = spy(() => false);
    const result = await new Bearer(authorize).authenticate({
      params: "token",
    });

    assertSpyCalls(authorize, 1);
    assertErr(result);
    assert(
      equalsResponse(
        result.response,
        new Response(null, {
          status: Status.Unauthorized,
          headers: {
            [AuthenticationHeader.WWWAuthenticate]:
              `Bearer error="invalid_token", realm="Secure area"`,
          },
        }),
      ),
    );
  });
});
