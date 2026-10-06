import { and, desc, eq, notInArray } from "drizzle-orm";
import type { Db } from "@/db";
import { activities, customers, inboundLog, jobs, type Customer, type Job } from "@/db/schema";
import type { Equipment, Source, Urgency } from "./constants";
import { extract, type ExtractResult } from "./extract";
import { sendEmergencyAlert } from "./notify";
import { normalizePhone } from "./phone";

// One pipeline for every door a job can come in through:
//   web form, email, text, missed call (automatic)  ->  intake()
//   Denise's "+" screen (after she confirms)       ->  createJob()

export type JobInput = {
  customerName: string | null;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  problem: string;
  equipment: Equipment;
  urgency: Urgency;
  source: Source;
};

const CLOSED: Job["stage"][] = ["done", "lost"];

export async function findCustomer(db: Db, phone: string | null, email: string | null): Promise<Customer | null> {
  if (phone) {
    const [c] = await db.select().from(customers).where(eq(customers.phone, phone));
    if (c) return c;
  }
  if (email) {
    const [c] = await db.select().from(customers).where(eq(customers.email, email.toLowerCase()));
    if (c) return c;
  }
  return null;
}

export async function findOpenJob(db: Db, customerId: number): Promise<Job | null> {
  const [j] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.customerId, customerId), notInArray(jobs.stage, CLOSED)))
    .orderBy(desc(jobs.createdAt))
    .limit(1);
  return j ?? null;
}

// Find the customer by phone (then email) or create them; fill in any details we didn't have.
async function upsertCustomer(db: Db, input: JobInput, now: Date): Promise<Customer> {
  const phone = normalizePhone(input.phone);
  const email = input.email?.trim().toLowerCase() || null;
  const existing = await findCustomer(db, phone, email);
  if (existing) {
    const patch = {
      name: existing.name ?? input.customerName,
      businessName: existing.businessName ?? input.businessName,
      phone: existing.phone ?? phone,
      email: existing.email ?? email,
      address: existing.address ?? input.address,
    };
    const [updated] = await db.update(customers).set(patch).where(eq(customers.id, existing.id)).returning();
    return updated;
  }
  const [created] = await db
    .insert(customers)
    .values({ name: input.customerName, businessName: input.businessName, phone, email, address: input.address, createdAt: now })
    .returning();
  return created;
}

export async function createJob(
  db: Db,
  input: JobInput,
  opts: { raw?: string | null; autoAdded?: boolean } = {},
  now = new Date(),
): Promise<Job> {
  const customer = await upsertCustomer(db, input, now);
  const [job] = await db
    .insert(jobs)
    .values({
      customerId: customer.id,
      problem: input.problem.trim() || "New request — see original message",
      equipment: input.equipment,
      urgency: input.urgency,
      source: input.source,
      stage: "new",
      rawInput: opts.raw?.trim() || null,
      autoAdded: opts.autoAdded ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const how = opts.autoAdded ? "Added automatically" : "Added";
  await db.insert(activities).values({ jobId: job.id, type: "created", note: `${how} from ${input.source.replace("_", " ")}`, createdAt: now });
  return job;
}

// A repeat customer wrote again about a job that is still open: keep it on one card.
export async function attachMessage(db: Db, job: Job, raw: string, source: Source, now = new Date()) {
  await db
    .update(jobs)
    .set({ lastInboundAt: now, nextFollowUpAt: now, contactAttempts: 0, updatedAt: now })
    .where(eq(jobs.id, job.id));
  await db.insert(activities).values({
    jobId: job.id,
    type: "inbound_message",
    note: `New ${source.replace("_", " ")}: ${raw.trim().slice(0, 500)}`,
    createdAt: now,
  });
}

function toInput(x: ExtractResult, source: Source): JobInput {
  return {
    customerName: x.customer_name,
    businessName: x.business_name,
    phone: x.phone,
    email: x.email,
    address: x.address,
    problem: x.problem,
    equipment: x.equipment,
    urgency: x.urgency,
    source,
  };
}

export type IntakeResult =
  | { outcome: "created"; job: Job; extracted: ExtractResult; alerted: boolean }
  | { outcome: "attached"; job: Job; extracted: ExtractResult }
  | { outcome: "ignored"; extracted: ExtractResult };

export async function intake(
  db: Db,
  raw: string,
  source: Source,
  opts: { overrides?: Partial<JobInput> } = {},
  now = new Date(),
): Promise<IntakeResult> {
  const extracted = await extract(raw, source);

  if (!extracted.is_job_request) {
    await db.insert(inboundLog).values({ source, raw, outcome: "ignored: not a job request", createdAt: now });
    return { outcome: "ignored", extracted };
  }

  const input = { ...toInput(extracted, source), ...opts.overrides };
  const customer = await findCustomer(db, normalizePhone(input.phone), input.email);
  const openJob = customer ? await findOpenJob(db, customer.id) : null;

  // Attach to their open job — unless this is a fresh emergency about something else.
  const newEmergency = input.urgency === "emergency" && openJob?.urgency !== "emergency";
  if (openJob && !newEmergency) {
    await attachMessage(db, openJob, raw, source, now);
    await db.insert(inboundLog).values({ source, raw, outcome: "attached", jobId: openJob.id, createdAt: now });
    return { outcome: "attached", job: openJob, extracted };
  }

  const job = await createJob(db, input, { raw, autoAdded: true }, now);
  await db.insert(inboundLog).values({ source, raw, outcome: "created", jobId: job.id, createdAt: now });
  const alerted = job.urgency === "emergency" ? await sendEmergencyAlert(db, job.id) : false;
  return { outcome: "created", job, extracted, alerted };
}
