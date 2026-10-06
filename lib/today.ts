import type { Job } from "@/db/schema";
import { config as defaultConfig, type TodayConfig } from "./config";
import { SOURCE_VIA, type Tone } from "./format";
import { daysSince, endOfDay, formatDate, relativeDay, timeAgo } from "./time";

// The Today list: "I just want to wake up and know who I need to call today."
// Plain rules, no AI — Denise should always be able to tell why someone is on her list.

export type TodayJobFields = Pick<
  Job,
  | "stage"
  | "urgency"
  | "source"
  | "contactAttempts"
  | "nextFollowUpAt"
  | "quoteSentAt"
  | "quoteAmount"
  | "lastContactAt"
  | "lastInboundAt"
  | "scheduledFor"
  | "createdAt"
>;

export type GroupKey = "emergency" | "new" | "follow_up" | "waiting_yes" | "said_yes" | "quotes_owed" | "gone_quiet";

export type TodayItem<T> = { job: T; reason: string; suggestLost: boolean };
export type TodayGroup<T> = { key: GroupKey; label: string; tone: Tone; items: TodayItem<T>[] };

type Rule = {
  key: GroupKey;
  label: string;
  tone: Tone;
  match: (j: TodayJobFields) => boolean;
  reason: (j: TodayJobFields) => string;
  sort: (a: TodayJobFields, b: TodayJobFields) => number;
};

const t = (d: Date | null) => (d ? d.getTime() : 0);
const lastTouch = (j: TodayJobFields) => j.lastContactAt ?? j.createdAt;

export function getTodayList<T extends TodayJobFields>(
  jobs: T[],
  now: Date,
  cfg: TodayConfig = defaultConfig,
): TodayGroup<T>[] {
  const tz = cfg.BUSINESS_TZ;
  const todayEnds = endOfDay(now, tz);
  const ago = (d: Date) => timeAgo(d, now, tz);
  const olderThan = (d: Date | null, days: number) => !!d && daysSince(d, now) >= days;

  const rules: Rule[] = [
    {
      key: "emergency",
      label: "Emergencies",
      tone: "red",
      match: (j) => j.urgency === "emergency" && (j.stage === "new" || j.stage === "waiting_on_quote"),
      reason: (j) => `Emergency · ${SOURCE_VIA[j.source]} ${ago(j.createdAt)}`,
      sort: (a, b) => t(a.createdAt) - t(b.createdAt),
    },
    {
      key: "new",
      label: "New — not called yet",
      tone: "clay",
      match: (j) => j.stage === "new" && j.contactAttempts === 0 && !j.lastContactAt,
      reason: (j) => `New · ${SOURCE_VIA[j.source]} ${ago(j.createdAt)}`,
      sort: (a, b) => t(a.createdAt) - t(b.createdAt),
    },
    {
      key: "follow_up",
      label: "Follow-ups due",
      tone: "clay",
      match: (j) => !!j.nextFollowUpAt && j.nextFollowUpAt <= todayEnds,
      reason: (j) =>
        j.lastInboundAt && j.lastInboundAt >= (j.lastContactAt ?? j.createdAt)
          ? `They messaged ${ago(j.lastInboundAt)}`
          : `Follow-up due ${relativeDay(j.nextFollowUpAt!, now, tz)}`,
      sort: (a, b) => t(a.nextFollowUpAt) - t(b.nextFollowUpAt),
    },
    {
      key: "waiting_yes",
      label: `Waiting on their yes ${cfg.QUOTE_FOLLOWUP_DAYS}+ days`,
      tone: "amber",
      match: (j) => j.stage === "waiting_on_yes" && olderThan(j.quoteSentAt, cfg.QUOTE_FOLLOWUP_DAYS),
      reason: (j) => `No reply in ${daysSince(j.quoteSentAt!, now)} days`,
      sort: (a, b) => (b.quoteAmount ?? 0) - (a.quoteAmount ?? 0),
    },
    {
      key: "said_yes",
      label: "Said yes — needs scheduling",
      tone: "green",
      match: (j) => j.stage === "said_yes",
      reason: () => "Said yes · needs a date",
      sort: (a, b) => t(a.createdAt) - t(b.createdAt),
    },
    {
      key: "quotes_owed",
      label: "Quotes you owe",
      tone: "neutral",
      match: (j) => j.stage === "waiting_on_quote",
      reason: (j) => `Asked ${ago(j.createdAt)}`,
      sort: (a, b) => t(a.createdAt) - t(b.createdAt),
    },
    {
      key: "gone_quiet",
      label: `Gone quiet — no contact in ${cfg.STALE_DAYS}+ days`,
      tone: "neutral",
      match: (j) => {
        if (j.nextFollowUpAt && j.nextFollowUpAt > now) return false; // she already picked a day
        if (j.stage === "scheduled" && j.scheduledFor && j.scheduledFor > now) return false; // visit is booked
        return olderThan(lastTouch(j), cfg.STALE_DAYS);
      },
      reason: (j) =>
        j.stage === "scheduled" && j.scheduledFor
          ? `Visit was ${formatDate(j.scheduledFor, tz)} · mark done?`
          : `No contact in ${daysSince(lastTouch(j), now)} days`,
      sort: (a, b) => t(lastTouch(a)) - t(lastTouch(b)),
    },
  ];

  const open = jobs.filter((j) => j.stage !== "done" && j.stage !== "lost");
  const placed = new Set<T>();

  return rules
    .map((rule) => {
      const matched = open.filter((j) => !placed.has(j) && rule.match(j)).sort(rule.sort);
      matched.forEach((j) => placed.add(j));
      return {
        key: rule.key,
        label: rule.label,
        tone: rule.tone,
        items: matched.map((job) => ({
          job,
          reason: rule.reason(job),
          suggestLost: job.contactAttempts >= cfg.MAX_ATTEMPTS,
        })),
      };
    })
    .filter((g) => g.items.length > 0);
}

// "Quotes you owe" are writing, not calling — the header counts the rest.
export function countCalls<T>(groups: TodayGroup<T>[]) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const quotes = groups.find((g) => g.key === "quotes_owed")?.items.length ?? 0;
  return { total, calls: total - quotes, quotes };
}
