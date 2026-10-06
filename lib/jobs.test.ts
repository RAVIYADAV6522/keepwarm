import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { activities, customers, jobs } from "@/db/schema";
import { testDb } from "@/test/db";
import { logContact, moveStage, snooze, snoozeTarget, wake } from "./jobs";

const NOW = new Date("2026-10-06T14:00:00Z"); // 9:00 Chicago
let db: Db;
let jobId: number;

beforeEach(async () => {
  db = await testDb();
  const [c] = await db.insert(customers).values({ name: "Tony", phone: "+13125550142" }).returning();
  const [j] = await db.insert(jobs).values({ customerId: c.id, problem: "Freezer down", source: "call", createdAt: NOW }).returning();
  jobId = j.id;
});

const get = async () => (await db.select().from(jobs).where(eq(jobs.id, jobId)))[0];
const log = async () => db.select().from(activities).where(eq(activities.jobId, jobId));

describe("logContact", () => {
  it("voicemail counts an attempt and brings them back tomorrow morning", async () => {
    await logContact(db, jobId, "voicemail", {}, NOW);
    const j = await get();
    expect(j.contactAttempts).toBe(1);
    expect(j.lastContactAt).toEqual(NOW);
    expect(j.nextFollowUpAt?.toISOString()).toBe("2026-10-07T14:00:00.000Z"); // 9:00 tomorrow Chicago
  });

  it("talking to them resets attempts and clears a follow-up due today", async () => {
    await db.update(jobs).set({ contactAttempts: 2, nextFollowUpAt: NOW }).where(eq(jobs.id, jobId));
    await logContact(db, jobId, "talked", { note: "Coming at 2pm" }, NOW);
    const j = await get();
    expect(j.contactAttempts).toBe(0);
    expect(j.nextFollowUpAt).toBeNull();
    expect((await log()).map((a) => a.note)).toContain("Talked to them — Coming at 2pm");
  });

  it("keeps a follow-up she set for later in the week", async () => {
    const friday = new Date("2026-10-09T14:00:00Z");
    await db.update(jobs).set({ nextFollowUpAt: friday }).where(eq(jobs.id, jobId));
    await logContact(db, jobId, "texted", {}, NOW);
    expect((await get()).nextFollowUpAt).toEqual(friday);
  });

  it("sending a quote moves to waiting on their yes and stores the amount", async () => {
    await logContact(db, jobId, "quote_sent", { quoteCents: 125_000 }, NOW);
    const j = await get();
    expect(j.stage).toBe("waiting_on_yes");
    expect(j.quoteAmount).toBe(125_000);
    expect(j.quoteSentAt).toEqual(NOW);
    expect((await log()).at(-1)?.note).toBe("Sent quote · $1,250");
  });

  it("they said yes moves to said yes and resets attempts", async () => {
    await db.update(jobs).set({ contactAttempts: 2 }).where(eq(jobs.id, jobId));
    await logContact(db, jobId, "said_yes", {}, NOW);
    const j = await get();
    expect(j.stage).toBe("said_yes");
    expect(j.contactAttempts).toBe(0);
  });
});

describe("snooze", () => {
  const MONDAY = new Date("2026-10-12T14:00:00Z"); // 9:00 Chicago

  it("Tuesday's 'Monday' option is next Monday at 9am; 'in a week' is 7 days out", () => {
    expect(snoozeTarget("monday", NOW, "America/Chicago")).toEqual(MONDAY);
    expect(snoozeTarget("next_week", NOW, "America/Chicago").toISOString()).toBe("2026-10-13T14:00:00.000Z");
  });

  it("snoozing sets the wake-up day as the follow-up and logs it", async () => {
    await snooze(db, jobId, MONDAY, NOW);
    const j = await get();
    expect(j.snoozedUntil).toEqual(MONDAY);
    expect(j.nextFollowUpAt).toEqual(MONDAY);
    expect((await log()).map((a) => a.note)).toContain("Snoozed until Mon, Oct 12");
  });

  it("any contact or stage change ends the snooze", async () => {
    await snooze(db, jobId, MONDAY, NOW);
    await logContact(db, jobId, "texted", {}, NOW);
    expect((await get()).snoozedUntil).toBeNull();
    await snooze(db, jobId, MONDAY, NOW);
    await moveStage(db, jobId, "waiting_on_quote", {}, NOW);
    expect((await get()).snoozedUntil).toBeNull();
  });

  it("bringing it back now puts it on today's list", async () => {
    await snooze(db, jobId, MONDAY, NOW);
    await wake(db, jobId, NOW);
    const j = await get();
    expect(j.snoozedUntil).toBeNull();
    expect(j.nextFollowUpAt).toEqual(NOW);
  });
});

describe("moveStage", () => {
  it("done closes the job and writes a stage_change activity", async () => {
    await moveStage(db, jobId, "done", {}, NOW);
    const j = await get();
    expect(j.stage).toBe("done");
    expect(j.closedAt).toEqual(NOW);
    expect((await log()).at(-1)).toMatchObject({ type: "stage_change", note: "Moved to Done" });
  });

  it("lost keeps the reason", async () => {
    await moveStage(db, jobId, "lost", { lostReason: "Went with someone else" }, NOW);
    expect(await get()).toMatchObject({ stage: "lost", lostReason: "Went with someone else" });
  });

  it("new can jump straight to scheduled with a visit date", async () => {
    const visit = new Date("2026-10-08T14:00:00Z");
    await moveStage(db, jobId, "scheduled", { scheduledFor: visit }, NOW);
    expect(await get()).toMatchObject({ stage: "scheduled", scheduledFor: visit });
  });

  it("reopening a lost job clears the close", async () => {
    await moveStage(db, jobId, "lost", {}, NOW);
    await moveStage(db, jobId, "waiting_on_quote", {}, NOW);
    expect(await get()).toMatchObject({ stage: "waiting_on_quote", closedAt: null, lostReason: null });
  });
});
