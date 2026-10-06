import type { Equipment, Source, Stage, Urgency } from "./constants";
import { formatPhone } from "./phone";

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  waiting_on_quote: "Waiting on quote",
  waiting_on_yes: "Waiting on their yes",
  said_yes: "Said yes",
  scheduled: "Scheduled",
  done: "Done",
  lost: "Lost",
};

export const SOURCE_LABEL: Record<Source, string> = {
  call: "Call",
  text: "Text",
  email: "Email",
  web_form: "Web form",
  notebook: "Notebook",
};

export const SOURCE_VIA: Record<Source, string> = {
  call: "by call",
  text: "by text",
  email: "by email",
  web_form: "via web form",
  notebook: "noted",
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  walk_in_cooler: "Walk-in cooler",
  walk_in_freezer: "Walk-in freezer",
  reach_in: "Reach-in",
  ice_machine: "Ice machine",
  other: "Other",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  emergency: "Emergency",
  soon: "Soon",
  routine: "Routine",
};

export type Tone = "red" | "amber" | "green" | "blue" | "clay" | "neutral";

// Chip classes per meaning. Written out in full so Tailwind can see them.
export const TONE_CHIP: Record<Tone, string> = {
  red: "text-red bg-red-s",
  amber: "text-amber bg-amber-s",
  green: "text-green bg-green-s",
  blue: "text-blue bg-blue-s",
  clay: "text-clay-ink bg-clay",
  neutral: "text-ink2 bg-muted",
};

export const TONE_TEXT: Record<Tone, string> = {
  red: "text-red",
  amber: "text-amber",
  green: "text-green",
  blue: "text-blue",
  clay: "text-clay-ink",
  neutral: "text-ink2",
};

export const TONE_DOT: Record<Tone, string> = {
  red: "bg-red",
  amber: "bg-amber",
  green: "bg-green",
  blue: "bg-blue",
  clay: "bg-clay-ink",
  neutral: "bg-ink2",
};

export function money(cents: number | null | undefined): string {
  if (cents == null) return "";
  return "$" + Math.round(cents / 100).toLocaleString("en-US");
}

export function dollarsToCents(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function displayName(c: { businessName: string | null; name: string | null; phone?: string | null; email?: string | null }): string {
  return c.businessName || c.name || formatPhone(c.phone) || c.email || "Unknown caller";
}

export function plural(n: number, word: string, many = word + "s"): string {
  return `${n} ${n === 1 ? word : many}`;
}
