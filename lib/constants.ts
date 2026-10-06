// Shared enums. Kept free of database imports so client components can use them too.

export const EQUIPMENT = ["walk_in_cooler", "walk_in_freezer", "reach_in", "ice_machine", "other"] as const;
export const URGENCY = ["emergency", "soon", "routine"] as const;
export const SOURCES = ["call", "text", "email", "web_form", "notebook"] as const;
export const STAGES = ["new", "waiting_on_quote", "waiting_on_yes", "said_yes", "scheduled", "done", "lost"] as const;
export const ACTIVITY_TYPES = [
  "created",
  "called",
  "texted",
  "emailed",
  "voicemail",
  "note",
  "stage_change",
  "quote_sent",
  "inbound_message",
] as const;

export type Equipment = (typeof EQUIPMENT)[number];
export type Urgency = (typeof URGENCY)[number];
export type Source = (typeof SOURCES)[number];
export type Stage = (typeof STAGES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const SNOOZE_OPTIONS = ["tomorrow", "monday", "next_week"] as const;
export type SnoozeOption = (typeof SNOOZE_OPTIONS)[number];
export const SNOOZE_LABEL: Record<SnoozeOption, string> = { tomorrow: "Tomorrow", monday: "Monday", next_week: "In a week" };

export const LOG_KINDS = ["talked", "voicemail", "texted", "emailed", "quote_sent", "said_yes"] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const LOG_LABEL: Record<LogKind, string> = {
  talked: "Talked to them",
  voicemail: "Left voicemail",
  texted: "Texted",
  emailed: "Emailed",
  quote_sent: "Sent quote",
  said_yes: "They said yes",
};
