import type { Equipment, Stage, Urgency } from "./constants";
import { EQUIPMENT_LABEL } from "./format";

// A ready-to-send text for where the job is at. Denise sends it from her own phone (an sms: link),
// so customers still see her number and the app never texts anyone by itself.

export type MessageJob = {
  firstName: string | null;
  stage: Stage;
  urgency: Urgency;
  equipment: Equipment;
  amount: string; // "$1,250", or "" when there is no quote
  visit: string | null; // "Thu, Oct 8"
};

export type Sender = { owner: string; business: string };

export function suggestedText(job: MessageJob, from: Sender): string {
  const hi = `Hi ${job.firstName ?? "there"}, it's ${from.owner} from ${from.business}.`;
  const what = job.equipment === "other" ? "your equipment" : `your ${EQUIPMENT_LABEL[job.equipment].toLowerCase()}`;

  switch (job.stage) {
    case "new":
      return job.urgency === "emergency"
        ? `${hi} Just got your message about ${what}. We'll get someone out as fast as we can. Can you talk now?`
        : `${hi} Got your request about ${what}. When's a good time for a quick call?`;
    case "waiting_on_quote":
      return `${hi} I'm putting together your quote for ${what} and will send it over shortly.`;
    case "waiting_on_yes":
      return `${hi} Just checking in on the ${job.amount ? `${job.amount} ` : ""}quote for ${what}. Want me to get a tech scheduled?`;
    case "said_yes":
      return `${hi} Thanks for the go-ahead on ${what}. What day works for a visit this week?`;
    case "scheduled":
      return `${hi} Confirming our visit${job.visit ? ` on ${job.visit}` : ""} for ${what}. See you then!`;
    case "done":
      return `${hi} Checking that ${what} is still running well since our visit.`;
    case "lost":
      return `${hi} Following up on ${what}. Still need a hand with it?`;
  }
}

// "?&body=" is the form both iPhone and Android Messages understand.
export function smsHref(phone: string, body: string): string {
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}
