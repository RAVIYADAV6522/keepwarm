// Every threshold the Today list uses, in one place so it is easy to tune with Denise.
export const config = {
  STALE_DAYS: 2, // "this one has not heard from us in two days"
  QUOTE_FOLLOWUP_DAYS: 2, // nudge on a sent quote after this many days
  MAX_ATTEMPTS: 3, // after this many unanswered tries, suggest "Mark as lost?"
  BUSINESS_TZ: process.env.BUSINESS_TZ || "America/Chicago",
};

export type TodayConfig = typeof config;

// Demo tools (Simulate leads, Reset, sample emails) appear only on the public demo and in local development.
export const DEMO_MODE = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true" || process.env.SHOW_PASSCODE === "true";

export const OWNER_NAME = process.env.OWNER_NAME || "Denise";
export const BUSINESS_NAME = process.env.BUSINESS_NAME || "Denise's Refrigeration";
