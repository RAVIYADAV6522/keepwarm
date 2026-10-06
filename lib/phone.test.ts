import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["(312) 555-0142", "+13125550142"],
    ["312.555.0142", "+13125550142"],
    ["1-312-555-0142", "+13125550142"],
    ["+1 312 555 0142", "+13125550142"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("%s -> %s", (raw, e164) => {
    expect(normalizePhone(raw)).toBe(e164);
  });

  it.each(["", "555-0142", "call me", null, undefined])("rejects %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });

  it("formats US numbers for display", () => {
    expect(formatPhone("+13125550142")).toBe("(312) 555-0142");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });
});
