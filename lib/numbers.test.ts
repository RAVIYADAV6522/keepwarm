import { describe, expect, it } from "vitest";
import { getNumbers } from "./numbers";

const TZ = "America/Chicago";
const NOW = new Date("2026-10-06T14:00:00Z"); // Tue Oct 6
const DAY = 86_400_000;
const row = (o: Partial<Parameters<typeof getNumbers>[0][number]>) => ({
  stage: "new" as const,
  source: "call" as const,
  quoteAmount: null,
  createdAt: NOW,
  closedAt: null,
  contactAttempts: 0,
  lastContactAt: null,
  ...o,
});

describe("getNumbers", () => {
  it("counts open, waiting, won and lost", () => {
    const n = getNumbers(
      [
        row({}),
        row({ stage: "waiting_on_yes", quoteAmount: 125_000, contactAttempts: 1, lastContactAt: NOW }),
        row({ stage: "waiting_on_yes", quoteAmount: 340_000, contactAttempts: 1, lastContactAt: NOW }),
        row({ stage: "done", quoteAmount: 210_000, closedAt: new Date(NOW.getTime() - 2 * DAY) }),
        row({ stage: "done", quoteAmount: 99_900, closedAt: new Date("2026-09-20T12:00:00Z") }), // last month
        row({ stage: "lost", quoteAmount: 420_000, closedAt: new Date(NOW.getTime() - DAY) }),
      ],
      NOW,
      TZ,
    );
    expect(n).toMatchObject({ open: 3, notContacted: 1, waitingCount: 2, waitingCents: 465_000, wonCount: 1, wonCents: 210_000, lostCount: 1 });
  });

  it("buckets new jobs into Monday-start weeks by source", () => {
    const n = getNumbers(
      [
        row({ source: "text", createdAt: new Date("2026-10-05T15:00:00Z") }), // Mon this week
        row({ source: "web_form", createdAt: new Date("2026-10-04T15:00:00Z") }), // Sun last week
        row({ source: "call", createdAt: new Date("2026-08-01T15:00:00Z") }), // too old
      ],
      NOW,
      TZ,
    );
    expect(n.bars).toHaveLength(6);
    expect(n.bars[5]).toMatchObject({ label: "This wk", total: 1 });
    expect(n.bars[5].bySource.text).toBe(1);
    expect(n.bars[4].bySource.web_form).toBe(1);
    expect(n.bars.reduce((s, b) => s + b.total, 0)).toBe(2);
  });
});
