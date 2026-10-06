import type { Job } from "@/db/schema";
import { config } from "./config";
import type { Tone } from "./format";
import { daysSince, formatDate } from "./time";

// The one-line status chip shown on All jobs: where is this job at, in plain words?
export function jobMeta(j: Pick<Job, "stage" | "urgency" | "contactAttempts" | "lastContactAt" | "createdAt" | "quoteSentAt" | "scheduledFor" | "lostReason">, now: Date): [string, Tone] {
  const quiet = daysSince(j.lastContactAt ?? j.createdAt, now);
  switch (j.stage) {
    case "new":
      if (j.urgency === "emergency") return ["Emergency", "red"];
      return j.contactAttempts === 0 && !j.lastContactAt ? ["Not called yet", "clay"] : [`Tried ${j.contactAttempts}×`, "neutral"];
    case "waiting_on_quote":
      return quiet >= config.STALE_DAYS ? [`Quiet ${quiet} days`, "neutral"] : ["Quote owed", "neutral"];
    case "waiting_on_yes": {
      const d = j.quoteSentAt ? daysSince(j.quoteSentAt, now) : 0;
      return d >= config.QUOTE_FOLLOWUP_DAYS ? [`No reply ${d} days`, "amber"] : ["Quote sent", "amber"];
    }
    case "said_yes":
      return ["Needs a date", "green"];
    case "scheduled":
      return j.scheduledFor ? [formatDate(j.scheduledFor, config.BUSINESS_TZ), "blue"] : ["Needs a date", "green"];
    case "done":
      return ["Done", "green"];
    case "lost":
      return [j.lostReason ? `Lost · ${j.lostReason}` : "Lost", "neutral"];
  }
}
