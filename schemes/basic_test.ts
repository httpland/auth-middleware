import { Basic, parseUserPass, type UserPass } from "./basic.ts";
import {
  assert,
  assertEquals,
  assertSpyCallArgs,
  assertThrows,
  describe,
  it,
  spy,
} from "../_dev_deps.ts";
import { timingSafeEqual } from "../utils.ts";

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

  it("should return true when the user pass matched", async () => {
    const authorizer = spy(() => true);
    const basic = new Basic(authorizer);

    assert(await basic.authenticate(btoa("admin:123456")));
    assertSpyCallArgs(authorizer, 0, [{
      username: "admin",
      password: "123456",
    }]);
  });

  it("should return false when the user pass matched", async () => {
    const authorizer = spy(() => false);
    const basic = new Basic(authorizer);

    assert(!await basic.authenticate(btoa("admin:123456")));
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
