import { Basic, parseUserPass, type UserPass } from "./basic.ts";
import {
  assert,
  assertEquals,
  assertErr,
  assertOk,
  assertSpyCallArgs,
  assertSpyCalls,
  assertThrows,
  describe,
  equalsResponse,
  it,
  spy,
} from "../_dev_deps.ts";
import { timingSafeEqual } from "../utils.ts";
import { AuthenticationHeader, Status } from "../deps.ts";

describe("Basic", () => {
  it("should contain property", () => {
    const basic = new Basic(() => true);

    assertEquals(basic.scheme, "Basic");
    assertEquals(basic.challenge(), `Basic realm="Secure area"`);
  });

  it("should provide timing safe equal", () => {
    assertEquals(Basic.timingSafeEqual, timingSafeEqual);
  });

  it("should change realm", () => {
    const basic = new Basic(() => true, { realm: "area" });

    assertEquals(basic.challenge(), `Basic realm="area"`);
  });

  it("should add charset param", () => {
    const basic = new Basic(() => true, { charset: "UTF-8" });

    assertEquals(
      basic.challenge(),
      `Basic realm="Secure area", charset="UTF-8"`,
    );
  });

  it("should return Ok true when the user pass matched", async () => {
    const authorizer = spy(() => true);
    const basic = new Basic(authorizer);

    assertOk(await basic.authenticate({ params: btoa("admin:123456") }));
    assertSpyCallArgs(authorizer, 0, [{
      username: "admin",
      password: "123456",
    }]);
  });

  it("should return Err(400) response when the challenge is invalid", async () => {
    const authorizer = spy(() => false);
    const basic = new Basic(authorizer);
    const result = await basic.authenticate({ params: {} });

    assertSpyCalls(authorizer, 0);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response("Authorization header should be valid challenge", {
          status: Status.BadRequest,
        }),
        true,
      ),
    );
  });

  it("should return Err(400) response when the challenge is not base64", async () => {
    const authorizer = spy(() => false);
    const basic = new Basic(authorizer);
    const result = await basic.authenticate({ params: "<invalid:base64>" });

    assertSpyCalls(authorizer, 0);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(
          "Authorization challenge should be valid base-64 encoding",
          {
            status: Status.BadRequest,
          },
        ),
        true,
      ),
    );
  });

  it("should return Err(400) response when the user-pass is invalid", async () => {
    const authorizer = spy(() => false);
    const basic = new Basic(authorizer);
    const result = await basic.authenticate({ params: btoa("invalid") });

    assertSpyCalls(authorizer, 0);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(
          "Authorization challenge should be valid user-pass",
          {
            status: Status.BadRequest,
          },
        ),
        true,
      ),
    );
  });

  it("should return Err(401) response when the user pass matched", async () => {
    const authorizer = spy(() => false);
    const basic = new Basic(authorizer);
    const result = await basic.authenticate({ params: btoa("admin:123456") });

    assertSpyCalls(authorizer, 1);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(null, {
          status: Status.Unauthorized,
          headers: {
            [AuthenticationHeader.WWWAuthenticate]: `Basic realm="Secure area"`,
          },
        }),
        true,
      ),
    );
  });

  it("should throw error if the options is invalid", () => {
    assertThrows(() => new Basic(() => true, { realm: "\x00" }));
  });
});

describe("parseUserPass", () => {
  it("should pass cases", () => {
    const table: [string, UserPass][] = [
      [":", { userId: "", password: "" }],
      [" : ", { userId: " ", password: " " }],
      [" :", { userId: " ", password: "" }],
      ["admin:123456", { userId: "admin", password: "123456" }],
      ["a:::", { userId: "a", password: "::" }],
      ["a:dmin:123456", { userId: "a", password: "dmin:123456" }],
      ["a:dmin:123456", { userId: "a", password: "dmin:123456" }],
      ["abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ", {
        userId: "abcdefghijklmnopqrstuvwxyz",
        password: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      }],
    ];

    table.forEach(([token, expected]) => {
      assertEquals(parseUserPass(token), expected);
    });
  });

  it("should throw error when input is invalid", () => {
    const table: string[] = [
      "",
      " ",
      "abc",
      "\x00",
      "\x00:",
    ];

    table.forEach((token) => assertThrows(() => parseUserPass(token)));
  });
});
