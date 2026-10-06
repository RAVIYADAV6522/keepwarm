import type { Customer, Job } from "@/db/schema";
import { displayName, money } from "./format";
import { formatPhone } from "./phone";

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
    quoteDollars: job.quoteAmount == null ? "" : String(Math.round(job.quoteAmount / 100)),
  };
}
