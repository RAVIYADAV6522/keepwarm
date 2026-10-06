import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { activities, jobs, type ActivityType, type Job, type Stage, type Urgency } from "@/db/schema";
import { config } from "./config";
import { LOG_LABEL, type LogKind } from "./constants";
import { money, STAGE_LABEL } from "./format";
import { endOfDay, tomorrowMorning } from "./time";

// Every state change to a job goes through here, so the rules live in one file.

const LOG_ACTIVITY: Record<LogKind, ActivityType> = {
  talked: "called",
  voicemail: "voicemail",
  texted: "texted",
  emailed: "emailed",
  quote_sent: "quote_sent",
  said_yes: "stage_change",
};

async function addActivity(db: Db, jobId: number, type: ActivityType, note: string | null, now: Date) {
  await db.insert(activities).values({ jobId, type, note, createdAt: now });
}

async function load(db: Db, jobId: number): Promise<Job> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} not found`);
  return job;
}

export async function logContact(
  db: Db,
  jobId: number,
  kind: LogKind,
  opts: { note?: string; quoteCents?: number | null } = {},
  now = new Date(),
) {
  const job = await load(db, jobId);
  const tz = config.BUSINESS_TZ;
  const patch: Partial<Job> = { lastContactAt: now, updatedAt: now };

  // Contacting them takes care of a follow-up that was due today.
  if (job.nextFollowUpAt && job.nextFollowUpAt <= endOfDay(now, tz)) patch.nextFollowUpAt = null;

  switch (kind) {
    case "talked":
      patch.contactAttempts = 0; // we reached them — that counts as a reply
      break;
    case "voicemail":
      patch.contactAttempts = job.contactAttempts + 1;
      patch.nextFollowUpAt = tomorrowMorning(now, tz); // try again tomorrow
      break;
    case "texted":
    case "emailed":
      patch.contactAttempts = job.contactAttempts + 1;
      break;
    case "quote_sent":
      patch.stage = "waiting_on_yes";
      patch.quoteSentAt = now;
      patch.contactAttempts = 0;
      if (opts.quoteCents != null) patch.quoteAmount = opts.quoteCents;
      break;
    case "said_yes":
      patch.stage = "said_yes";
      patch.contactAttempts = 0;
      patch.lastInboundAt = now;
      break;
  }

  await db.update(jobs).set(patch).where(eq(jobs.id, jobId));

  let summary = LOG_LABEL[kind];
  if (kind === "quote_sent" && patch.quoteAmount) summary = `Sent quote · ${money(patch.quoteAmount)}`;
  if (kind === "said_yes") summary = "They said yes · moved to Said yes";
  const note = opts.note?.trim();
  await addActivity(db, jobId, LOG_ACTIVITY[kind], note ? `${summary} — ${note}` : summary, now);
}

export async function moveStage(
  db: Db,
  jobId: number,
  stage: Stage,
  opts: { lostReason?: string; scheduledFor?: Date | null } = {},
  now = new Date(),
) {
  const job = await load(db, jobId);
  if (job.stage === stage) return;

  const closing = stage === "done" || stage === "lost";
  const patch: Partial<Job> = {
    stage,
    updatedAt: now,
    closedAt: closing ? now : null,
    lostReason: stage === "lost" ? opts.lostReason?.trim() || null : null,
  };
  if (closing) patch.nextFollowUpAt = null;
  if (stage === "said_yes") patch.contactAttempts = 0;
  if (stage === "waiting_on_yes" && !job.quoteSentAt) patch.quoteSentAt = now;
  if (stage === "scheduled" && opts.scheduledFor !== undefined) patch.scheduledFor = opts.scheduledFor;
  // Reopening a closed job starts the clock again so it shows up on Today.
  if (job.stage === "done" || job.stage === "lost") patch.lastContactAt = now;

  await db.update(jobs).set(patch).where(eq(jobs.id, jobId));
  const note = stage === "lost" && patch.lostReason ? `Marked lost · ${patch.lostReason}` : `Moved to ${STAGE_LABEL[stage]}`;
  await addActivity(db, jobId, "stage_change", note, now);
}

export async function updateJob(
  db: Db,
  jobId: number,
  fields: {
    quoteAmount?: number | null;
    nextFollowUpAt?: Date | null;
    scheduledFor?: Date | null;
    urgency?: Urgency;
  },
  now = new Date(),
) {
  await db.update(jobs).set({ ...fields, updatedAt: now }).where(eq(jobs.id, jobId));
}

export async function addNote(db: Db, jobId: number, note: string, now = new Date()) {
  if (!note.trim()) return;
  await addActivity(db, jobId, "note", note.trim(), now);
  await db.update(jobs).set({ updatedAt: now }).where(eq(jobs.id, jobId));
}
