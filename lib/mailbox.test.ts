import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { activities, inboxItems, jobs } from "@/db/schema";
import { testDb } from "@/test/db";
import type { MailMessage } from "./gmail";
import { pendingItems, processEmail } from "./mailbox";
import { seed } from "./seed";

let db: Db;
const NOW = new Date();
let n = 0;
const mail = (o: Partial<MailMessage>): MailMessage => ({ id: `m${++n}`, fromName: null, fromEmail: null, subject: "", receivedAt: NOW, text: "", ...o });

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY; // rules only: deterministic
  db = await testDb();
  await seed(db, NOW);
});

describe("processEmail", () => {
  it("a new enquiry waits in the Inbox with the fields filled in", async () => {
    const m = mail({ fromName: "Laura Diaz", fromEmail: "laura@bluefingrill.com", subject: "Ice machine", text: "Hi, this is Laura from Bluefin Grill. Our ice machine is only making half the ice it should. Can someone come this week? 312-555-0299" });
    expect(await processEmail(db, m, NOW)).toBe("pending");
    const [item] = await pendingItems(db);
    expect(item).toMatchObject({ gmailId: m.id, fromEmail: "laura@bluefingrill.com", status: "pending" });
    expect(item.extracted).toMatchObject({ phone: "+13125550299", equipment: "ice_machine", email: "laura@bluefingrill.com", problem: "Our ice machine is only making half the ice it should" });
  });

  it("an emergency skips review and goes straight onto Today", async () => {
    const before = (await db.select().from(jobs)).length;
    const m = mail({ fromName: "Ken Ito", fromEmail: "ken@sakurahouse.com", subject: "URGENT freezer down", text: "Our walk-in freezer is down and food is thawing! Please call 773-555-0170 asap" });
    expect(await processEmail(db, m, NOW)).toBe("auto");
    expect((await db.select().from(jobs)).length).toBe(before + 1);
  });

  it("a reply from a customer with an open job is attached to it", async () => {
    // Harbor Seafood (rita@harborseafood.co) has an open quote in the seed data.
    const m = mail({ fromName: "Rita Okafor", fromEmail: "rita@harborseafood.co", subject: "Re: your quote", text: "Thanks Denise, looks good. Owner signs off Thursday." });
    expect(await processEmail(db, m, NOW)).toBe("auto");
    const [item] = await db.select().from(inboxItems).where(eq(inboxItems.gmailId, m.id));
    const log = await db.select().from(activities).where(eq(activities.jobId, item.jobId!));
    expect(log.at(-1)?.type).toBe("inbound_message");
  });

  it("newsletters are skipped and their content is not kept", async () => {
    const m = mail({ fromEmail: "hello@rankfast.io", subject: "50% off SEO", text: "Rank on Google page 1 this month. 50% off. Unsubscribe here." });
    expect(await processEmail(db, m, NOW)).toBe("ignored");
    const [item] = await db.select().from(inboxItems).where(eq(inboxItems.gmailId, m.id));
    expect(item).toMatchObject({ status: "ignored", subject: null, body: null, fromEmail: null });
  });

  it("the same email is never processed twice", async () => {
    const m = mail({ fromEmail: "x@y.com", subject: "Cooler", text: "Reach-in cooler is noisy, can you quote a repair? 708-555-0101" });
    expect(await processEmail(db, m, NOW)).toBe("pending");
    expect(await processEmail(db, m, NOW)).toBe("duplicate");
  });
});
