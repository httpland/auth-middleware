import { assertEquals, describe, it } from "./_dev_deps.ts";
import { concat, quoted } from "./utils.ts";

describe("concat", () => {
  it("should return concatenated string", () => {
    const table: [string[], string][] = [
      [[""], ""],
      [["", "", ""], ""],
      [["a", "b", "c"], "abc"],
      [["a", "", "c"], "ac"],
    ];

    table.forEach(([input, expected]) => {
      assertEquals(concat(...input), expected);
    });
  });
});

describe("quoted", () => {
  it("should return quoted string", () => {
    const table: [string, string][] = [
      ["", `""`],
      ["a", `"a"`],
      [`""`, `""`],
      [`"a`, `""a"`],
      [`"a"`, `"a"`],
      [` "" `, `" "" "`],
    ];

    table.forEach(([input, expected]) => {
      assertEquals(quoted(input), expected);
    });
  });
});
