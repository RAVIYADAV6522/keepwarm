import type { Customer, Job } from "@/db/schema";
import { BUSINESS_NAME, config, OWNER_NAME } from "./config";
import { displayName, money } from "./format";
import { suggestedText } from "./messages";
import { formatPhone } from "./phone";
import { formatDate } from "./time";

// Plain, serialisable shape handed to client components (cards, sheets).
export type CardJob = {
  id: number;
  name: string;
  contact: string;
  phone: string | null; // E.164 for tel:/sms: links
  phoneDisplay: string;
  email: string | null;
  problem: string;
  source: Job["source"];
  stage: Job["stage"];
  amount: string;
  quoteDollars: string;
  textBody: string; // ready-to-send text for where the job is at
};

export function toCardJob(job: Job & { customer: Customer }): CardJob {
  const c = job.customer;
  return {
    id: job.id,
    name: displayName(c),
    contact: c.businessName ? c.name ?? "" : "",
    phone: c.phone,
    phoneDisplay: formatPhone(c.phone),
    email: c.email,
    problem: job.problem,
    source: job.source,
    stage: job.stage,
    amount: money(job.quoteAmount),
    quoteDollars: job.quoteAmount == null ? "" : (job.quoteAmount / 100).toFixed(2).replace(/\.00$/, ""),
    textBody: suggestedText(
      {
        firstName: c.name?.trim().split(/\s+/)[0] || null,
        stage: job.stage,
        urgency: job.urgency,
        equipment: job.equipment,
        amount: money(job.quoteAmount),
        visit: job.scheduledFor ? formatDate(job.scheduledFor, config.BUSINESS_TZ) : null,
      },
      { owner: OWNER_NAME, business: BUSINESS_NAME },
    ),
  };
}
