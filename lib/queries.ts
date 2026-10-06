import "server-only";
import { and, asc, desc, eq, gte, inArray, ne, notInArray } from "drizzle-orm";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/db";
import { activities, customers, jobs, type Customer, type Job } from "@/db/schema";
import { config } from "./config";
import { buildDigest } from "./digest";
import { rankCustomers, summarizeCustomer } from "./customers";
import { startOfDay } from "./time";
import { countCalls, getTodayList, isSnoozed } from "./today";

export type JobWithCustomer = Job & { customer: Customer };

const CLOSED: Job["stage"][] = ["done", "lost"];

async function db() {
  await connection(); // always read fresh data at request time
  return getDb();
}

function joinRows(rows: { jobs: Job; customers: Customer }[]): JobWithCustomer[] {
  return rows.map((r) => ({ ...r.jobs, customer: r.customers }));
}

// cache(): the layout (sidebar counts) and the page both ask for these on the same request —
// run each query once per request instead of once per caller.
export const getOpenJobs = cache(async (): Promise<JobWithCustomer[]> => {
  const d = await db();
  const rows = await d
    .select()
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(notInArray(jobs.stage, CLOSED));
  return joinRows(rows);
});

export const getToday = cache(async () => {
  const now = new Date();
  const [open, handled] = await Promise.all([getOpenJobs(), handledToday(now)]);
  const groups = getTodayList(open, now, config);
  const snoozed = open.filter((j) => isSnoozed(j, now)).sort((a, b) => a.snoozedUntil!.getTime() - b.snoozedUntil!.getTime());
  return { groups, snoozed, handled, ...countCalls(groups) };
});

// Jobs she has already dealt with today (called, texted, quoted, moved...), for the progress bar.
const HANDLED_TYPES = ["called", "texted", "emailed", "voicemail", "quote_sent", "stage_change"] as const;
async function handledToday(now: Date): Promise<number> {
  const d = await db();
  const rows = await d
    .selectDistinct({ jobId: activities.jobId })
    .from(activities)
    .where(and(inArray(activities.type, [...HANDLED_TYPES]), gte(activities.createdAt, startOfDay(now, config.BUSINESS_TZ))));
  return rows.length;
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

export async function getCustomers() {
  const d = await db();
  const [all, rows] = await Promise.all([
    d.select().from(customers),
    d.select({ customerId: jobs.customerId, stage: jobs.stage, quoteAmount: jobs.quoteAmount, createdAt: jobs.createdAt, equipment: jobs.equipment }).from(jobs),
  ]);
  return rankCustomers(all.map((c) => summarizeCustomer(c, rows.filter((j) => j.customerId === c.id))));
}

export async function getCustomer(id: number) {
  const d = await db();
  const [customer] = await d.select().from(customers).where(eq(customers.id, id));
  if (!customer) return null;
  const list = await d.select().from(jobs).where(eq(jobs.customerId, id)).orderBy(desc(jobs.createdAt));
  return { customer, jobs: list, summary: summarizeCustomer(customer, list) };
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

export async function getDigest(now = new Date()) {
  const [today, open] = await Promise.all([getToday(), getOpenJobs()]);
  const waitingCents = open.filter((j) => j.stage === "waiting_on_yes").reduce((n, j) => n + (j.quoteAmount ?? 0), 0);
  return buildDigest(today, { open: open.length, waitingCents }, now);
}
