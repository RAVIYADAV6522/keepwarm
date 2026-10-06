import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(toCsv(["name", "note"], [["Tony's Diner", 'said "asap", call back\nafter 3']])).toBe(
      'name,note\r\nTony\'s Diner,"said ""asap"", call back\nafter 3"\r\n',
    );
  });

  it("writes empty cells, numbers and dates", () => {
    expect(toCsv(["a", "b", "c"], [[null, 1250, new Date("2026-10-06T14:00:00Z")]])).toBe("a,b,c\r\n,1250,2026-10-06T14:00:00.000Z\r\n");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(toCsv(["x"], [["=HYPERLINK(\"evil\")"]])).toBe('x\r\n"\'=HYPERLINK(""evil"")"\r\n');
  });
});
