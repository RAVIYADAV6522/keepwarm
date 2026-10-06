import { describe, expect, it } from "vitest";
import { smsHref, suggestedText, type MessageJob } from "./messages";

const from = { owner: "Denise", business: "Denise's Refrigeration" };
const job = (over: Partial<MessageJob>): MessageJob => ({
  firstName: "Carl",
  stage: "new",
  urgency: "routine",
  equipment: "reach_in",
  amount: "",
  visit: null,
  ...over,
});

describe("suggestedText", () => {
  it("nudges a quote with the amount", () => {
    expect(suggestedText(job({ stage: "waiting_on_yes", amount: "$1,250" }), from)).toBe(
      "Hi Carl, it's Denise from Denise's Refrigeration. Just checking in on the $1,250 quote for your reach-in. Want me to get a tech scheduled?",
    );
  });

  it("answers an emergency with urgency", () => {
    const text = suggestedText(job({ urgency: "emergency", equipment: "walk_in_freezer" }), from);
    expect(text).toContain("your walk-in freezer");
    expect(text).toContain("Can you talk now?");
  });

  it("confirms a booked visit with its date", () => {
    expect(suggestedText(job({ stage: "scheduled", visit: "Thu, Oct 8" }), from)).toContain("Confirming our visit on Thu, Oct 8");
  });

  it("works without a name, an amount or known equipment", () => {
    const text = suggestedText(job({ firstName: null, stage: "waiting_on_yes", equipment: "other" }), from);
    expect(text).toMatch(/^Hi there,/);
    expect(text).toContain("the quote for your equipment");
  });
});

describe("smsHref", () => {
  it("encodes the message body", () => {
    expect(smsHref("+13125550177", "Hi Carl, $1,250?")).toBe("sms:+13125550177?&body=Hi%20Carl%2C%20%241%2C250%3F");
  });
});
