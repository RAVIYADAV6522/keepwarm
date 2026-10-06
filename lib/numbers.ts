import type { Job } from "@/db/schema";
import type { Source } from "./constants";
import { SOURCES } from "./constants";
import { startOfDay, startOfMonth, startOfWeek } from "./time";

// "My husband keeps asking me for numbers and I cannot even tell him how many open jobs we have."
// Plain counts over the jobs table — pure, so it's easy to test and to trust.

type Row = Pick<Job, "stage" | "source" | "quoteAmount" | "createdAt" | "closedAt" | "contactAttempts" | "lastContactAt" | "lostReason">;

export type WeekBar = { label: string; start: Date; total: number; bySource: Record<Source, number> };

export function getNumbers(rows: Row[], now: Date, tz: string, weeks = 6) {
  const open = rows.filter((r) => r.stage !== "done" && r.stage !== "lost");
  const waiting = rows.filter((r) => r.stage === "waiting_on_yes");
  const monthStart = startOfMonth(now, tz);
  const weekAgo = new Date(startOfDay(now, tz).getTime() - 6 * 86_400_000);
  const closedThisMonth = (stage: Row["stage"]) => rows.filter((r) => r.stage === stage && r.closedAt && r.closedAt >= monthStart);
  const sum = (list: Row[]) => list.reduce((n, r) => n + (r.quoteAmount ?? 0), 0);
  const won = closedThisMonth("done");
  const lost = closedThisMonth("lost");

  const thisWeek = startOfWeek(now, tz);
  const bars: WeekBar[] = Array.from({ length: weeks }, (_, i) => {
    const start = startOfWeek(new Date(thisWeek.getTime() - (weeks - 1 - i) * 7 * 86_400_000 + 12 * 3_600_000), tz);
    return {
      start,
      label: i === weeks - 1 ? "This wk" : start.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" }),
      total: 0,
      bySource: Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<Source, number>,
    };
  });
  for (const r of rows) {
    for (let i = bars.length - 1; i >= 0; i--) {
      if (r.createdAt >= bars[i].start) {
        if (i < bars.length - 1 || r.createdAt <= now) {
          bars[i].total++;
          bars[i].bySource[r.source]++;
        }
        break;
      }
    }
  }

  return {
    open: open.length,
    notContacted: open.filter((r) => r.stage === "new" && r.contactAttempts === 0 && !r.lastContactAt).length,
    newThisWeek: rows.filter((r) => r.createdAt >= weekAgo).length,
    waitingCount: waiting.length,
    waitingCents: sum(waiting),
    wonCount: won.length,
    wonCents: sum(won),
    lostCount: lost.length,
    lostCents: sum(lost),
    // "Why did we lose them?" — most common reason first.
    lostReasons: Object.entries(
      lost.reduce<Record<string, number>>((acc, r) => {
        const why = r.lostReason?.trim() || "No reason given";
        acc[why] = (acc[why] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    bars,
  };
}
