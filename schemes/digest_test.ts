import { unq } from "./digest.ts";
import { assertEquals, describe, it } from "../_dev_deps.ts";

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
