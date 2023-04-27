import { assertEquals, describe, it, toHashString } from "../../_dev_deps.ts";
import { Crypto } from "./mod.ts";

const MD5 = {
  input: "abc",
  output: "900150983cd24fb0d6963f7d28e17f72",
};

const Sha256 = {
  input: "abc",
  output: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
};

const Sha512_256 = {
  input: "abc",
  output: "53048e2681941ef99b2e29b76b4c7dabe4c2d0c634fc6d46e0e2f13107e7af23",
};

describe("digestSync", () => {
  it("should work MD5 hashing", () => {
    const result = Crypto.subtle.digestSync(
      "MD5",
      new TextEncoder().encode(MD5.input),
    );

    assertEquals(toHashString(result), MD5.output);
  });

  it("should work SHA-256 hashing", () => {
    const result = Crypto.subtle.digestSync(
      "SHA-256",
      new TextEncoder().encode(Sha256.input),
    );

    assertEquals(toHashString(result), Sha256.output);
  });

  it("should work SHA-512/256 hashing", () => {
    const result = Crypto.subtle.digestSync(
      "SHA-512-256",
      new TextEncoder().encode(Sha512_256.input),
    );

    assertEquals(toHashString(result), Sha512_256.output);
  });
});
