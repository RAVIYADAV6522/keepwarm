import { describe, expect, it } from "vitest";
import { config } from "./config";
import { countCalls, getTodayList, type TodayJobFields } from "./today";

const cfg = { ...config, BUSINESS_TZ: "America/Chicago" };
// Tuesday Oct 6 2026, 9:00 in Chicago (14:00 UTC).
const NOW = new Date("2026-10-06T14:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

let nextId = 1;
type J = TodayJobFields & { id: number };
function job(overrides: Partial<TodayJobFields> = {}): J {
  return {
    id: nextId++,
    stage: "new",
    urgency: "routine",
    source: "call",
    contactAttempts: 1,
    nextFollowUpAt: null,
    snoozedUntil: null,
    quoteSentAt: null,
    quoteAmount: null,
    lastContactAt: ago(HOUR),
    lastInboundAt: null,
    scheduledFor: null,
    createdAt: ago(HOUR),
    ...overrides,
  };
}

const keysOf = (jobs: J[], now = NOW) => getTodayList(jobs, now, cfg).map((g) => g.key);
const groupOf = (j: J, now = NOW) =>
  getTodayList([j], now, cfg).map((g) => ({ key: g.key, reason: g.items[0].reason }))[0];

describe("getTodayList groups", () => {
  it("1. emergencies: emergency urgency in new or waiting_on_quote", () => {
    const g = groupOf(job({ urgency: "emergency", contactAttempts: 0, lastContactAt: null, createdAt: ago(40 * 60_000) }));
    expect(g).toEqual({ key: "emergency", reason: "Emergency · by call 40 min ago" });
    expect(groupOf(job({ urgency: "emergency", stage: "waiting_on_quote" }))?.key).toBe("emergency");
  });

  it("an emergency that is already quoted is no longer an emergency", () => {
    expect(groupOf(job({ urgency: "emergency", stage: "waiting_on_yes", quoteSentAt: ago(HOUR) }))).toBeUndefined();
  });

  it("2. new and never contacted", () => {
    const g = groupOf(job({ contactAttempts: 0, lastContactAt: null, source: "web_form", createdAt: ago(2 * HOUR) }));
    expect(g).toEqual({ key: "new", reason: "New · via web form 2h ago" });
  });

  it("3. follow-up due today or overdue", () => {
    expect(groupOf(job({ nextFollowUpAt: ago(-3 * HOUR) }))).toEqual({ key: "follow_up", reason: "Follow-up due today" });
    expect(groupOf(job({ nextFollowUpAt: ago(DAY) }))).toEqual({ key: "follow_up", reason: "Follow-up due yesterday" });
  });

  it("3. a customer message puts the job on the list as a reply", () => {
    const g = groupOf(job({ stage: "waiting_on_yes", quoteSentAt: ago(HOUR), lastInboundAt: ago(10 * 60_000), nextFollowUpAt: ago(10 * 60_000) }));
    expect(g).toEqual({ key: "follow_up", reason: "They messaged 10 min ago" });
  });

  it("4. waiting on their yes for 2+ days", () => {
    const g = groupOf(job({ stage: "waiting_on_yes", quoteSentAt: ago(3 * DAY), lastContactAt: ago(3 * DAY) }));
    expect(g).toEqual({ key: "waiting_yes", reason: "No reply in 3 days" });
  });

  it("4. a quote sent yesterday is not nagged yet", () => {
    expect(groupOf(job({ stage: "waiting_on_yes", quoteSentAt: ago(DAY), lastContactAt: ago(DAY) }))).toBeUndefined();
  });

  it("5. said yes needs scheduling", () => {
    expect(groupOf(job({ stage: "said_yes" }))).toEqual({ key: "said_yes", reason: "Said yes · needs a date" });
  });

  it("6. quotes you owe", () => {
    expect(groupOf(job({ stage: "waiting_on_quote", createdAt: ago(26 * HOUR) }))).toEqual({ key: "quotes_owed", reason: "Asked yesterday" });
  });

  it("7. gone quiet after 2 days without contact, any open stage", () => {
    expect(groupOf(job({ lastContactAt: ago(4 * DAY), createdAt: ago(8 * DAY) }))).toEqual({ key: "gone_quiet", reason: "No contact in 4 days" });
  });

  it("7. falls back to created_at when nobody has been contacted", () => {
    const j = job({ stage: "scheduled", lastContactAt: null, createdAt: ago(3 * DAY) });
    expect(groupOf(j)?.key).toBe("gone_quiet");
  });

  it("closed jobs never appear", () => {
    expect(keysOf([job({ stage: "done", lastContactAt: ago(9 * DAY) }), job({ stage: "lost", contactAttempts: 0, lastContactAt: null })])).toEqual([]);
  });

  it("a recently contacted job in progress is not on the list", () => {
    expect(keysOf([job({ stage: "new", contactAttempts: 1, lastContactAt: ago(HOUR) })])).toEqual([]);
  });
});

describe("getTodayList rules", () => {
  it("each job appears once, in its first matching group", () => {
    // Matches emergency, new, follow-up and gone quiet — should only show as emergency.
    const j = job({ urgency: "emergency", contactAttempts: 0, nextFollowUpAt: ago(DAY), lastContactAt: null, createdAt: ago(5 * DAY) });
    const groups = getTodayList([j], NOW, cfg);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("emergency");
  });

  it("groups come out in priority order", () => {
    const jobs = [
      job({ lastContactAt: ago(5 * DAY) }),
      job({ stage: "waiting_on_quote" }),
      job({ stage: "said_yes" }),
      job({ stage: "waiting_on_yes", quoteSentAt: ago(2 * DAY), lastContactAt: ago(2 * DAY) }),
      job({ nextFollowUpAt: ago(HOUR) }),
      job({ contactAttempts: 0, lastContactAt: null }),
      job({ urgency: "emergency" }),
    ];
    expect(keysOf(jobs)).toEqual(["emergency", "new", "follow_up", "waiting_yes", "said_yes", "quotes_owed", "gone_quiet"]);
  });

  it("waiting-on-yes is sorted by quote amount, biggest first", () => {
    const small = job({ stage: "waiting_on_yes", quoteSentAt: ago(5 * DAY), quoteAmount: 125_000, lastContactAt: ago(DAY) });
    const big = job({ stage: "waiting_on_yes", quoteSentAt: ago(2 * DAY), quoteAmount: 340_000, lastContactAt: ago(DAY) });
    const [g] = getTodayList([small, big], NOW, cfg);
    expect(g.items.map((i) => i.job.id)).toEqual([big.id, small.id]);
  });

  it("emergencies and new leads are oldest first", () => {
    const newer = job({ contactAttempts: 0, lastContactAt: null, createdAt: ago(HOUR) });
    const older = job({ contactAttempts: 0, lastContactAt: null, createdAt: ago(5 * HOUR) });
    const [g] = getTodayList([newer, older], NOW, cfg);
    expect(g.items.map((i) => i.job.id)).toEqual([older.id, newer.id]);
  });

  it("a follow-up date in the future suppresses gone quiet", () => {
    const j = job({ lastContactAt: ago(6 * DAY), nextFollowUpAt: new Date(NOW.getTime() + 3 * DAY) });
    expect(keysOf([j])).toEqual([]);
  });

  it("a booked future visit is not gone quiet; a past one asks to mark done", () => {
    const booked = job({ stage: "scheduled", lastContactAt: ago(5 * DAY), scheduledFor: new Date(NOW.getTime() + 2 * DAY) });
    expect(keysOf([booked])).toEqual([]);
    const past = job({ stage: "scheduled", lastContactAt: ago(5 * DAY), scheduledFor: ago(3 * DAY) });
    expect(groupOf(past)).toEqual({ key: "gone_quiet", reason: "Visit was Sat, Oct 3 · mark done?" });
  });

  it("suggests marking lost after 3 unanswered attempts, but never does it", () => {
    const j = job({ contactAttempts: 3, lastContactAt: ago(4 * DAY) });
    const [g] = getTodayList([j], NOW, cfg);
    expect(g.items[0].suggestLost).toBe(true);
    expect(j.stage).toBe("new");
  });

  it("thresholds come from config", () => {
    const j = job({ lastContactAt: ago(3 * DAY) });
    expect(keysOf([j], NOW)).toEqual(["gone_quiet"]);
    expect(getTodayList([j], NOW, { ...cfg, STALE_DAYS: 5 })).toEqual([]);
  });

  it("'today' ends at midnight in the business timezone, not UTC", () => {
    // 23:30 on Mon Oct 5 in Chicago = 04:30 UTC on Oct 6.
    const lateNight = new Date("2026-10-06T04:30:00Z");
    const tonight = job({ nextFollowUpAt: new Date("2026-10-06T04:50:00Z") }); // 23:50 Chicago, still Oct 5
    const tomorrowMorning = job({ nextFollowUpAt: new Date("2026-10-06T10:00:00Z") }); // 05:00 Chicago Oct 6
    const groups = getTodayList([tonight, tomorrowMorning], lateNight, cfg);
    expect(groups[0].items.map((i) => i.job.id)).toEqual([tonight.id]);
  });

  it("a snoozed job is off every group until its day, then comes back as a reminder", () => {
    const monday = new Date("2026-10-12T14:00:00Z"); // 9:00 Chicago
    const j = job({ urgency: "emergency", contactAttempts: 0, lastContactAt: null, snoozedUntil: monday, nextFollowUpAt: monday });
    expect(keysOf([j])).toEqual([]);
    const wakeUp = getTodayList([{ ...j, urgency: "routine", stage: "said_yes" }], monday, cfg)[0];
    expect(wakeUp.key).toBe("follow_up");
    expect(wakeUp.items[0].reason).toBe("Reminder you set for today");
  });

  it("counts calls separately from quotes to write", () => {
    const groups = getTodayList([job({ contactAttempts: 0, lastContactAt: null }), job({ stage: "waiting_on_quote" }), job({ stage: "said_yes" })], NOW, cfg);
    expect(countCalls(groups)).toEqual({ total: 3, calls: 2, quotes: 1 });
  });
});
