import {
  calculateResponse,
  Digest,
  type DigestResponseParams,
  unq,
} from "./digest.ts";
import {
  assert,
  assertEquals,
  assertFalse,
  assertSpyCalls,
  describe,
  it,
  spy,
} from "../_dev_deps.ts";

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

  it("should return false if the params is string", async () => {
    const result = await new Digest(() => {}).authenticate({
      request: { method: "" },
      params: "",
    });
    assertFalse(result);
  });

  it("should return false if the params is not digest response", async () => {
    const selectUser = spy(() => {});
    const result = await new Digest(selectUser).authenticate({
      request: { method: "" },
      params: {},
    });

    assertSpyCalls(selectUser, 0);
    assertFalse(result);
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

  it("should return false if the algorithm is not supported", async () => {
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
    assertFalse(result);
  });

  it("should return false if the selected user does not match", async () => {
    const selectUser = spy(() => {});
    const result = await new Digest(selectUser).authenticate({
      request: {
        method: "",
      },
      params: { ...params },
    });

    assertSpyCalls(selectUser, 1);
    assertFalse(result);
  });

  it("should return false if the selected user name does not match", async () => {
    const selectUser = spy(() => ({ username: "", password: "" }));
    const result = await new Digest(selectUser).authenticate({
      request: {
        method: "",
      },
      params: { ...params },
    });

    assertSpyCalls(selectUser, 1);
    assertFalse(result);
  });

  it("should return true if the response is matched", async () => {
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
    assert(result);
  });

  it("should return false if the algorithm is not supported", async () => {
    const result = await new Digest(() => {}).authenticate({
      params: {
        ...params,
        algorithm: "unknown",
      },
      request: { method: "" },
    });
    assertFalse(result);
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
