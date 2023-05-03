import {
  calculateResponse,
  Digest,
  type DigestResponseParams,
  unq,
} from "./digest.ts";
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

describe("unq", () => {
  it("should return unquoted string", () => {
    const table: [string, string][] = [
      ["", ""],
      [`""`, ""],
      [`abc`, "abc"],
      [`"abc"`, "abc"],
      [`""abc""`, `"abc"`],
      [`"abc`, `"abc`],
      [`abc"`, `abc"`],
      [`""abc`, `""abc`],
      [`abc""`, `abc""`],
      [`""abc"`, `"abc`],
    ];

    table.forEach(([input, expected]) => {
      assertEquals(unq(input), expected);
    });
  });
});

describe("Digest", () => {
  const nonce = () => "test";
  it("should be Digest", () => {
    assertEquals(new Digest(() => {}).scheme, "Digest");
  });

  it("should return Err(400) if the params is invalid", async () => {
    const fn = spy(() => {});
    const result = await new Digest(fn).authenticate({
      request: { method: "" },
      params: "",
    });

    assertSpyCalls(fn, 0);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(`Authorization challenge should be valid`, {
          status: Status.BadRequest,
        }),
        true,
      ),
    );
  });

  it("should return Err(400) if the params is invalid digest response", async () => {
    const fn = spy(() => {});
    const selectUser = spy(() => {});
    const result = await new Digest(selectUser).authenticate({
      request: { method: "" },
      params: {},
    });

    assertSpyCalls(fn, 0);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(`auth-param should be valid`, {
          status: Status.BadRequest,
        }),
        true,
      ),
    );
  });

  const params: DigestResponseParams = {
    response: `""`,
    cnonce: `""`,
    nc: "",
    qop: "",
    uri: `""`,
    realm: `""`,
    username: `""`,
    nonce: `""`,
  };

  it("should return Err(400) if the algorithm is not supported", async () => {
    const selectUser = spy(() => {});
    const result = await new Digest(selectUser).authenticate({
      request: {
        method: "",
      },
      params: {
        ...params,
        algorithm: "unknown",
      },
    });

    assertSpyCalls(selectUser, 0);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(
          `auth-param of "algorithm" should be one of "MD5", "MD5-sess", "SHA-256", "SHA-256-sess", "SHA-512-256", "SHA-512-256-sess"`,
          { status: Status.BadRequest },
        ),
        true,
      ),
    );
  });

  it("should return Err(401) if the selected user does not exist", async () => {
    const selectUser = spy(() => {});
    const nonce = spy(() => "abc");
    const result = await new Digest(selectUser, { nonce })
      .authenticate({
        request: {
          method: "",
        },
        params: { ...params },
      });

    assertSpyCalls(selectUser, 1);
    assertSpyCalls(nonce, 1);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(null, {
          status: Status.Unauthorized,
          headers: {
            [AuthenticationHeader.WWWAuthenticate]:
              `Digest realm="Secure area", qop="auth", nonce="abc"`,
          },
        }),
        true,
      ),
    );
  });

  it("should return Err(401) if the selected user does not match", async () => {
    const selectUser = spy(() => ({ username: "admin", password: "123456" }));
    const nonce = spy(() => "abc");
    const result = await new Digest(selectUser, { nonce })
      .authenticate({
        request: {
          method: "",
        },
        params: { ...params, username: `"user"` },
      });

    assertSpyCalls(selectUser, 1);
    assertSpyCalls(nonce, 1);
    assertErr(result);
    assert(
      await equalsResponse(
        result.response,
        new Response(null, {
          status: Status.Unauthorized,
          headers: {
            [AuthenticationHeader.WWWAuthenticate]:
              `Digest realm="Secure area", qop="auth", nonce="abc"`,
          },
        }),
        true,
      ),
    );
  });

  it("should return Ok if the response is matched", async () => {
    const username = "admin";
    const password = "123";
    const method = "GET";
    const algorithm = "MD5";
    const response = calculateResponse({
      realm: unq(params.realm),
      cnonce: unq(params.cnonce),
      nc: params.nc,
      nonce: unq(params.nonce),
      uri: unq(params.uri),
      qop: params.qop,
      username,
      algorithm,
      method,
      secret: password,
    });
    const selectUser = spy(() => ({ username, password }));
    const result = await new Digest(selectUser)
      .authenticate({
        params: { ...params, algorithm, response, username: `"${username}"` },
        request: { method },
      });

    assertSpyCalls(selectUser, 1);
    assertOk(result);
  });

  it("should return default challenge", async () => {
    assertEquals(
      await new Digest(() => {}, { nonce }).challenge(),
      `Digest realm="Secure area", qop="auth", nonce="test"`,
    );
  });

  it("should add opaque param", async () => {
    assertEquals(
      await new Digest(() => {}, { nonce, opaque: "opaque" }).challenge(),
      `Digest realm="Secure area", qop="auth", opaque="opaque", nonce="test"`,
    );
  });

  it("should add charset param", async () => {
    assertEquals(
      await new Digest(() => {}, { nonce, charset: "UTF-8" }).challenge(),
      `Digest charset=UTF-8, realm="Secure area", qop="auth", nonce="test"`,
    );
  });

  it("should add domain param", async () => {
    assertEquals(
      await new Digest(() => {}, { nonce, domain: ["/admin", "/secure"] })
        .challenge(),
      `Digest realm="Secure area", qop="auth", domain="/admin /secure", nonce="test"`,
    );
  });

  it("should change realm param", async () => {
    assertEquals(
      await new Digest(() => {}, { nonce, realm: "secure@localhost" })
        .challenge(),
      `Digest realm="secure@localhost", qop="auth", nonce="test"`,
    );
  });

  it("should add algorithm param", async () => {
    assertEquals(
      await new Digest(() => {}, { nonce, algorithm: "MD5" })
        .challenge(),
      `Digest realm="Secure area", qop="auth", algorithm=MD5, nonce="test"`,
    );
  });
});
