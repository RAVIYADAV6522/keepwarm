import { describe, expect, it } from "vitest";
import { extract } from "./extract";
import { extractWithRules } from "./extract-rules";

// Realistic inputs from Denise's four doors.
export const FIXTURES = {
  messySms: "hey denise its marco from luigis. walk in is sitting at 44, usually 37. can u send someone + price?? 312-555-0125",
  webFormEmail: `---------- Forwarded message ---------
From: Website <noreply@deniserefrigeration.com>
Subject: New contact form submission

Name: Maya Chen
Business: Green Leaf Bistro
Phone: (773) 555-0118
Email: maya@greenleafbistro.com
Address: 1450 N Damen Ave
Message: Our walk-in cooler has been icing up on the back wall. Not urgent yet but we'd like someone this week.`,
  notebook: "Tony (Tony's Diner) walk-in freezer down, 28 and climbing, $3k meat. 312 555 0142",
  spam: "Get your business to rank on Google page 1! Our SEO package is 50% off this week only. Reply STOP to unsubscribe.",
};

describe("rule-based extractor", () => {
  it("messy SMS", () => {
    const r = extractWithRules(FIXTURES.messySms, "text");
    expect(r).toMatchObject({
      is_job_request: true,
      customer_name: "Marco",
      business_name: "Luigis",
      phone: "+13125550125",
      equipment: "walk_in_cooler",
    });
    expect(r.problem.toLowerCase()).toContain("walk in");
  });

  it("forwarded web-form email", () => {
    const r = extractWithRules(FIXTURES.webFormEmail, "email");
    expect(r).toMatchObject({
      is_job_request: true,
      customer_name: "Maya Chen",
      business_name: "Green Leaf Bistro",
      phone: "+17735550118",
      email: "maya@greenleafbistro.com",
      address: "1450 N Damen Ave",
      equipment: "walk_in_cooler",
      urgency: "soon",
    });
    expect(r.problem).toBe("Our walk-in cooler has been icing up on the back wall");
  });

  it("terse notebook note is an emergency", () => {
    const r = extractWithRules(FIXTURES.notebook, "notebook");
    expect(r).toMatchObject({
      customer_name: "Tony",
      business_name: "Tony's Diner",
      phone: "+13125550142",
      equipment: "walk_in_freezer",
      urgency: "emergency",
    });
  });

  it("spam email is not a job", () => {
    expect(extractWithRules(FIXTURES.spam, "email").is_job_request).toBe(false);
  });

  it("never returns an empty problem", () => {
    expect(extractWithRules("312-555-0199", "call").problem).toBe("New request — see original message");
  });
});

// Runs only when a key is present, so CI and reviewers without a key stay green.
describe.skipIf(!process.env.ANTHROPIC_API_KEY)("Claude extractor", () => {
  it("handles all four fixtures", { timeout: 60_000 }, async () => {
    const [sms, form, note, spam] = await Promise.all([
      extract(FIXTURES.messySms, "text"),
      extract(FIXTURES.webFormEmail, "email"),
      extract(FIXTURES.notebook, "notebook"),
      extract(FIXTURES.spam, "email"),
    ]);
    expect(sms).toMatchObject({ method: "claude", phone: "+13125550125", equipment: "walk_in_cooler", is_job_request: true });
    expect(form).toMatchObject({ method: "claude", customer_name: "Maya Chen", email: "maya@greenleafbistro.com" });
    expect(note).toMatchObject({ method: "claude", urgency: "emergency", equipment: "walk_in_freezer" });
    expect(spam.is_job_request).toBe(false);
  });
});

describe("rule-based extractor on webhook text", () => {
  it("drops the 'Text from' prefix and reads a lowercase intro", () => {
    const r = extractWithRules("Text from +17735550144:\njoe from joes tacos walk in freezer not freezing, food is thawing", "text");
    expect(r).toMatchObject({ customer_name: "Joe", business_name: "Joes Tacos", urgency: "emergency", equipment: "walk_in_freezer" });
    expect(r.problem).toBe("Walk in freezer not freezing, food is thawing");
  });

  it("keeps the lowercase s after an apostrophe in business names", () => {
    const r = extractWithRules("Tony from Tony's Diner, ice machine is leaking again. 312-555-0142", "notebook");
    expect(r).toMatchObject({ business_name: "Tony's Diner", phone: "+13125550142", equipment: "ice_machine" });
  });

  it("reads a voicemail transcript", () => {
    const r = extractWithRules("Missed call from (708) 555-0188. Voicemail:\nHi, this is Mark with Northgate Warehouse. One of our walk-in coolers is alarming at 48 degrees.", "call");
    expect(r.phone).toBe("+17085550188");
    expect(r.problem).toBe("One of our walk-in coolers is alarming at 48 degrees");
  });
});
