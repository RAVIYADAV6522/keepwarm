import "server-only";
import { and, asc, desc, eq, gte, inArray, ne, notInArray } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import { activities, customers, jobs, type Customer, type Job } from "@/db/schema";
import { config } from "./config";
import { countCalls, getTodayList } from "./today";

export type JobWithCustomer = Job & { customer: Customer };

const CLOSED: Job["stage"][] = ["done", "lost"];

async function db() {
  await connection(); // always read fresh data at request time
  return getDb();
}

function joinRows(rows: { jobs: Job; customers: Customer }[]): JobWithCustomer[] {
  return rows.map((r) => ({ ...r.jobs, customer: r.customers }));
}

export async function getOpenJobs(): Promise<JobWithCustomer[]> {
  const d = await db();
  const rows = await d
    .select()
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(notInArray(jobs.stage, CLOSED));
  return joinRows(rows);
}

export async function getToday(now = new Date()) {
  const groups = getTodayList(await getOpenJobs(), now, config);
  return { groups, ...countCalls(groups) };
}

export async function getAllJobs(): Promise<JobWithCustomer[]> {
  const d = await db();
  const rows = await d
    .select()
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .orderBy(desc(jobs.updatedAt));
  return joinRows(rows);
}

export async function getJob(id: number) {
  const d = await db();
  const [row] = await d.select().from(jobs).innerJoin(customers, eq(jobs.customerId, customers.id)).where(eq(jobs.id, id));
  if (!row) return null;
  const [log, past] = await Promise.all([
    d.select().from(activities).where(eq(activities.jobId, id)).orderBy(desc(activities.createdAt), desc(activities.id)),
    d
      .select({ id: jobs.id, problem: jobs.problem, stage: jobs.stage, createdAt: jobs.createdAt, quoteAmount: jobs.quoteAmount })
      .from(jobs)
      .where(and(eq(jobs.customerId, row.customers.id), ne(jobs.id, id)))
      .orderBy(desc(jobs.createdAt)),
  ]);
  return { job: { ...row.jobs, customer: row.customers }, activities: log, otherJobs: past };
}

// Used by the "Repeat customer found" banner on Add job.
export async function findCustomerByPhone(phone: string) {
  const d = await db();
  const [customer] = await d.select().from(customers).where(eq(customers.phone, phone));
  if (!customer) return null;
  const history = await d
    .select({ id: jobs.id, stage: jobs.stage, problem: jobs.problem })
    .from(jobs)
    .where(eq(jobs.customerId, customer.id))
    .orderBy(asc(jobs.createdAt));
  return { customer, history };
}

export async function getJobsSince(since: Date) {
  const d = await db();
  return d
    .select({
      source: jobs.source,
      stage: jobs.stage,
      quoteAmount: jobs.quoteAmount,
      createdAt: jobs.createdAt,
      closedAt: jobs.closedAt,
    })
    .from(jobs)
    .where(gte(jobs.createdAt, since));
}

export async function getJobsByStage(stages: Job["stage"][]) {
  const d = await db();
  return d
    .select({ stage: jobs.stage, quoteAmount: jobs.quoteAmount, closedAt: jobs.closedAt, createdAt: jobs.createdAt, source: jobs.source })
    .from(jobs)
    .where(inArray(jobs.stage, stages));
}
