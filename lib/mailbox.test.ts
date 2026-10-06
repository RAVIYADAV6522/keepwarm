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

  it("automated notices are skipped, but a website form sent from a no-reply address is kept", async () => {
    const notice = mail({ fromEmail: "sc-noreply@google.com", subject: "Your site's performance", text: "Check your top pages on Google Search. See which queries trigger your site: https://c.gle/AAuDWvn4BebAHFa6QmH" });
    expect(await processEmail(db, notice, NOW)).toBe("ignored");
    const form = mail({ fromEmail: "noreply@deniserefrigeration.com", subject: "New contact form submission", text: "Name: Ana Ruiz\nPhone: (312) 555-0288\nMessage: Our reach-in cooler is leaking water, can you take a look?" });
    expect(await processEmail(db, form, NOW)).toBe("pending");
  });

  it("newsletters, calendar invites and everyday mail are skipped, even with alarming words", async () => {
    const newsletter = mail({ fromEmail: "news@superintelligence.ai", subject: "China is now just 3% behind", text: "The US lead is down to 3%. Urgent read. Plus: who builds the next freezer of compute?", bulk: true });
    const invite = mail({ fromEmail: "pat@school.edu", subject: "Invitation: Assignment review @ Tue 4:30pm", text: "Join the review. Calendar invitation.", calendar: true });
    const chat = mail({ fromEmail: "friend@gmail.com", subject: "Lunch?", text: "Server is down again lol, lunch at 1?" });
    for (const m of [newsletter, invite, chat]) expect(await processEmail(db, m, NOW)).toBe("ignored");
  });

  it("the same email is never processed twice", async () => {
    const m = mail({ fromEmail: "x@y.com", subject: "Cooler", text: "Reach-in cooler is noisy, can you quote a repair? 708-555-0101" });
    expect(await processEmail(db, m, NOW)).toBe("pending");
    expect(await processEmail(db, m, NOW)).toBe("duplicate");
  });
});
