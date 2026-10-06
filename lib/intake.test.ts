import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { activities, customers, inboundLog, jobs } from "@/db/schema";
import { testDb } from "@/test/db";
import { intake } from "./intake";
import { snooze } from "./jobs";
import { seed } from "./seed";
import { getTodayList } from "./today";

let db: Db;
const NOW = new Date();

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY; // deterministic: rules only
  db = await testDb();
  await seed(db, NOW);
});

const customerByPhone = async (phone: string) => (await db.select().from(customers).where(eq(customers.phone, phone)))[0];

describe("intake", () => {
  it("a new web-form lead becomes a new auto-added job with a new customer", async () => {
    const r = await intake(db, "Website contact form\nName: Priya Shah\nBusiness: Sunset Sushi\nPhone: (773) 555-0177\nMessage: Sushi case warm, won't get below 45.", "web_form", {}, NOW);
    expect(r.outcome).toBe("created");
    if (r.outcome !== "created") return;
    expect(r.job).toMatchObject({ stage: "new", source: "web_form", autoAdded: true });
    expect(await customerByPhone("+17735550177")).toMatchObject({ businessName: "Sunset Sushi", name: "Priya Shah" });
  });

  it("a text from a repeat customer with an open job lands on that job and puts it on Today", async () => {
    const carl = await customerByPhone("+13125550177");
    const r = await intake(db, "Text from +13125550177:\nWe're good with the $1,250, go ahead", "text", { overrides: { phone: "+13125550177" } }, NOW);
    expect(r.outcome).toBe("attached");
    if (r.outcome !== "attached") return;
    const [job] = await db.select().from(jobs).where(eq(jobs.id, r.job.id));
    expect(job.customerId).toBe(carl.id);
    expect(job.lastInboundAt).toEqual(NOW);
    const log = await db.select().from(activities).where(eq(activities.jobId, job.id));
    expect(log.at(-1)?.type).toBe("inbound_message");
    const [group] = getTodayList([job], NOW);
    expect(group.items[0].reason).toBe("They messaged just now");
  });

  it("a message from a customer wakes a snoozed job", async () => {
    const marco = await customerByPhone("+13125550125");
    const [open] = await db.select().from(jobs).where(eq(jobs.customerId, marco.id));
    await snooze(db, open.id, new Date(NOW.getTime() + 5 * 86_400_000), NOW);
    const r = await intake(db, "Text from +13125550125:\nany update on that quote?", "text", { overrides: { phone: "+13125550125" } }, NOW);
    expect(r.outcome).toBe("attached");
    const [job] = await db.select().from(jobs).where(eq(jobs.id, open.id));
    expect(job.snoozedUntil).toBeNull();
    expect(getTodayList([job], NOW)[0].items[0].reason).toBe("They messaged just now");
  });

  it("a new emergency from a customer whose open job is routine gets its own job", async () => {
    // Sunrise Café has a scheduled maintenance visit.
    const r = await intake(db, "Text from +17735550131:\nwalk in freezer is down, food thawing!!", "text", { overrides: { phone: "+17735550131" } }, NOW);
    expect(r.outcome).toBe("created");
    if (r.outcome === "created") expect(r.job.urgency).toBe("emergency");
  });

  it("spam email is logged but never becomes a job", async () => {
    const before = (await db.select().from(jobs)).length;
    const r = await intake(db, "From: hello@rankfast.io\nSubject: SEO\n\nRank on Google page 1, 50% off. Unsubscribe here.", "email", {}, NOW);
    expect(r.outcome).toBe("ignored");
    expect((await db.select().from(jobs)).length).toBe(before);
    expect((await db.select().from(inboundLog)).at(-1)?.outcome).toMatch(/ignored/);
  });

  it("a missed call with no voicemail still becomes a lead to call back", async () => {
    const r = await intake(db, "Missed call from (312) 555-0120. No voicemail.", "call", { overrides: { phone: "+13125550120", problem: "Missed call — no voicemail, call back" } }, NOW);
    expect(r.outcome).toBe("created");
    if (r.outcome === "created") expect(r.job.problem).toBe("Missed call — no voicemail, call back");
  });
});
