import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, type Customer, type Job } from "@/db/schema";
import { displayName } from "./format";

// Customer profiles: Denise thinks in customers ("Tony's Diner always calls about the freezer"),
// so this rolls their jobs up into the few numbers that matter.

type JobLite = Pick<Job, "stage" | "quoteAmount" | "createdAt" | "equipment">;

export type CustomerSummary = {
  id: number;
  name: string;
  contact: string;
  phone: string | null;
  jobs: number;
  open: number;
  revenueCents: number; // quotes on jobs marked done
  winRate: number | null; // done / (done + lost), null until something has closed
  lastJobAt: Date | null;
};

export function summarizeCustomer(c: Customer, jobs: JobLite[]): CustomerSummary {
  const done = jobs.filter((j) => j.stage === "done");
  const lost = jobs.filter((j) => j.stage === "lost");
  const closed = done.length + lost.length;
  return {
    id: c.id,
    name: displayName(c),
    contact: c.businessName ? c.name ?? "" : "",
    phone: c.phone,
    jobs: jobs.length,
    open: jobs.length - closed,
    revenueCents: done.reduce((n, j) => n + (j.quoteAmount ?? 0), 0),
    winRate: closed ? done.length / closed : null,
    lastJobAt: jobs.reduce<Date | null>((latest, j) => (!latest || j.createdAt > latest ? j.createdAt : latest), null),
  };
}

// Best customers first: most revenue, then most recent.
export function rankCustomers(list: CustomerSummary[]): CustomerSummary[] {
  return [...list].sort((a, b) => b.revenueCents - a.revenueCents || (b.lastJobAt?.getTime() ?? 0) - (a.lastJobAt?.getTime() ?? 0));
}

export async function setCustomerNote(db: Db, customerId: number, note: string) {
  await db.update(customers).set({ notes: note.trim() || null }).where(eq(customers.id, customerId));
}
