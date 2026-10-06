import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { jobs } from "@/db/schema";
import { displayName, STAGE_LABEL } from "./format";
import { findCustomer, findOpenJob } from "./intake";
import { normalizePhone } from "./phone";

export type CustomerMatch = {
  customerId: number;
  name: string;
  pastJobs: number;
  openJob: { id: number; problem: string; stage: string } | null;
};

// "Repeat customer found: Tony's Diner · 3 past jobs"
export async function matchCustomer(db: Db, phone: string | null, email: string | null): Promise<CustomerMatch | null> {
  const customer = await findCustomer(db, normalizePhone(phone), email?.trim().toLowerCase() || null);
  if (!customer) return null;
  const [all, open] = await Promise.all([
    db.select({ id: jobs.id }).from(jobs).where(eq(jobs.customerId, customer.id)).orderBy(desc(jobs.createdAt)),
    findOpenJob(db, customer.id),
  ]);
  return {
    customerId: customer.id,
    name: displayName(customer),
    pastJobs: all.length - (open ? 1 : 0),
    openJob: open ? { id: open.id, problem: open.problem, stage: STAGE_LABEL[open.stage] } : null,
  };
}
