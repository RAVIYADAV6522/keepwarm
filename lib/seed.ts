import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { activities, customers, jobs, type ActivityType, type Equipment, type Source, type Stage, type Urgency } from "@/db/schema";
import { config } from "./config";
import { zonedTime } from "./time";

// Demo data, all times relative to "now" so the Today screen always looks like a real Monday morning.
// Used by `npm run seed`, the /demo "Reset" button, and the first run on an empty database.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

type SeedCustomer = { name: string; business: string; phone: string; email?: string; address: string };
type SeedJob = {
  problem: string;
  equipment: Equipment;
  urgency?: Urgency;
  source: Source;
  stage: Stage;
  createdAgo: number;
  quote?: number; // dollars
  quoteSentAgo?: number;
  lastContactAgo?: number;
  attempts?: number;
  scheduledFor?: Date;
  closedAgo?: number;
  lostReason?: string;
  autoAdded?: boolean;
  raw?: string;
  log?: { type: ActivityType; note?: string; ago: number }[];
};

function nextWeekday(now: Date, weekday: number, hour: number): Date {
  // weekday: 0 = Sunday ... 4 = Thursday, in the business timezone
  const local = new Date(now.toLocaleString("en-US", { timeZone: config.BUSINESS_TZ }));
  let add = (weekday - local.getDay() + 7) % 7;
  if (add === 0) add = 7;
  const target = new Date(local.getTime() + add * DAY);
  return zonedTime(target.getFullYear(), target.getMonth() + 1, target.getDate(), hour, 0, config.BUSINESS_TZ);
}

function data(now: Date): { customer: SeedCustomer; jobs: SeedJob[] }[] {
  return [
    {
      customer: { name: "Tony Russo", business: "Tony's Diner", phone: "+13125550142", address: "212 W 4th St" },
      jobs: [
        {
          problem: "Walk-in freezer down, product at risk",
          equipment: "walk_in_freezer",
          urgency: "emergency",
          source: "call",
          stage: "new",
          createdAgo: 40 * MIN,
          raw: "Tony from the diner called. Walk-in freezer quit overnight, it's at 28 and climbing. About $3k of meat in there. Needs someone today. 312-555-0142",
        },
        { problem: "Ice machine cleaning", equipment: "ice_machine", source: "call", stage: "done", createdAgo: 20 * DAY, closedAgo: 19 * DAY, quote: 340 },
        { problem: "Walk-in cooler door gasket", equipment: "walk_in_cooler", source: "text", stage: "done", createdAgo: 75 * DAY, closedAgo: 74 * DAY, quote: 260 },
        { problem: "Reach-in compressor relay", equipment: "reach_in", source: "call", stage: "done", createdAgo: 160 * DAY, closedAgo: 158 * DAY, quote: 510 },
      ],
    },
    {
      customer: { name: "Maya Chen", business: "Green Leaf Bistro", phone: "+17735550118", email: "maya@greenleafbistro.com", address: "1450 N Damen Ave" },
      jobs: [
        {
          problem: "Wants a service visit for their walk-in cooler",
          equipment: "walk_in_cooler",
          source: "web_form",
          stage: "new",
          createdAgo: 2 * HOUR,
          autoAdded: true,
          raw: "New website contact form submission\n\nName: Maya Chen\nBusiness: Green Leaf Bistro\nPhone: (773) 555-0118\nEmail: maya@greenleafbistro.com\nMessage: Hi, our walk-in cooler has been icing up on the back wall. Not urgent yet but we'd like someone to look at it this week.",
        },
      ],
    },
    {
      customer: { name: "Carl Dimas", business: "FreshMart Grocery", phone: "+13125550177", address: "3021 S Halsted St" },
      jobs: [
        {
          problem: "Reach-in cooler making a loud noise",
          equipment: "reach_in",
          urgency: "soon",
          source: "text",
          stage: "waiting_on_yes",
          createdAgo: 5 * DAY,
          quote: 1250,
          quoteSentAgo: 3 * DAY,
          lastContactAgo: 3 * DAY,
          raw: "hey denise its carl at freshmart. the reach in by the deli is making a grinding noise, still cold tho. can someone take a look",
          log: [{ type: "called", note: "Talked to Carl, sending a tech to diagnose", ago: 5 * DAY - HOUR }],
        },
      ],
    },
    {
      customer: { name: "Rita Okafor", business: "Harbor Seafood Co", phone: "+13125550190", email: "rita@harborseafood.co", address: "Pier 45, 600 E Grand Ave" },
      jobs: [
        {
          problem: "Compressor replacement on main walk-in",
          equipment: "walk_in_cooler",
          urgency: "soon",
          source: "email",
          stage: "waiting_on_yes",
          createdAgo: 6 * DAY,
          quote: 3400,
          quoteSentAgo: 2 * DAY + 2 * HOUR,
          lastContactAgo: 2 * DAY + 2 * HOUR,
          raw: "Hi Denise,\n\nYour tech said the compressor on our main walk-in is on its way out. Can you send me a price to replace it? We'd want it done before the weekend rush.\n\nRita Okafor\nHarbor Seafood Co",
        },
      ],
    },
    {
      customer: { name: "Dev Patel", business: "Bay Cold Storage", phone: "+17085550163", address: "88 Wharf Rd, Cicero" },
      jobs: [
        {
          problem: "Ice machine not making ice",
          equipment: "ice_machine",
          urgency: "soon",
          source: "web_form",
          stage: "said_yes",
          createdAgo: 3 * DAY,
          quote: 680,
          quoteSentAgo: 2 * DAY,
          lastContactAgo: 20 * HOUR,
          autoAdded: true,
          raw: "Website form: Dev Patel, Bay Cold Storage, (708) 555-0163. Our ice machine stopped making ice yesterday. Water is getting to it.",
          log: [{ type: "note", note: "Dev said go ahead by text", ago: 20 * HOUR }],
        },
      ],
    },
    {
      customer: { name: "Marco Ferraro", business: "Luigi's Pizzeria", phone: "+13125550125", address: "77 W Taylor St" },
      jobs: [
        {
          problem: "Walk-in cooler running warm",
          equipment: "walk_in_cooler",
          urgency: "soon",
          source: "text",
          stage: "waiting_on_quote",
          createdAgo: 26 * HOUR,
          lastContactAgo: 25 * HOUR,
          raw: "Denise its Marco from Luigis. walk in is sitting at 44, usually 37. can u send someone + price",
          log: [{ type: "called", note: "Got details, he wants a price before booking", ago: 25 * HOUR }],
        },
      ],
    },
    {
      customer: { name: "Sam Haddad", business: "Corner Deli", phone: "+17735550109", address: "501 W Grand Ave" },
      jobs: [
        {
          problem: "Freezer door gasket torn",
          equipment: "reach_in",
          source: "notebook",
          stage: "new",
          createdAgo: 8 * DAY,
          lastContactAgo: 4 * DAY,
          attempts: 3,
          raw: "Sam (Corner Deli) stopped by — gasket on reach-in freezer door torn, wants a price.",
          log: [
            { type: "voicemail", ago: 7 * DAY },
            { type: "texted", note: "Asked for a photo of the gasket", ago: 6 * DAY },
            { type: "voicemail", ago: 4 * DAY },
          ],
        },
      ],
    },
    {
      customer: { name: "Ana Lopez", business: "Sunrise Café", phone: "+17735550131", address: "19 E Park St" },
      jobs: [
        {
          problem: "Quarterly maintenance, all units",
          equipment: "other",
          source: "call",
          stage: "scheduled",
          createdAgo: 12 * DAY,
          quote: 340,
          lastContactAgo: 2 * DAY,
          scheduledFor: nextWeekday(now, 4, 9),
          raw: "Ana called for the regular quarterly maintenance.",
        },
      ],
    },
    {
      customer: { name: "Jim Boyd", business: "Metro Warehouse", phone: "+17085550150", email: "jboyd@metrowarehouse.com", address: "2200 Industrial Pkwy" },
      jobs: [
        { problem: "Evaporator fan motor replaced", equipment: "walk_in_freezer", source: "email", stage: "done", createdAgo: 20 * DAY, closedAgo: 4 * DAY, quote: 2100 },
      ],
    },
    // Older history so the Numbers screen has something to show.
    ...(
      [
        ["Lena Ortiz", "Pier 9 Oyster Bar", "+13125550186", "Ice machine descale and clean", "ice_machine", "text", "done", 9, 6, 680],
        ["Greg Lin", "Valley Market", "+17085550144", "New rack system for walk-in", "walk_in_cooler", "web_form", "lost", 15, 10, 4200, "Went with a cheaper bid"],
        ["Kim Tran", "Northside Brewing", "+17735550171", "Walk-in cooler thermostat replaced", "walk_in_cooler", "call", "done", 12, 11, 420],
        ["Paul Novak", "Oak Street Grill", "+13125550133", "Reach-in freezer not holding temp", "reach_in", "text", "done", 18, 16, 560],
        ["Henry Liu", "Golden Wok", "+13125550158", "Ice machine leaking", "ice_machine", "email", "done", 22, 20, 390],
        ["Sara Kim", "Lakeview Market", "+17735550122", "Walk-in freezer door won't seal", "walk_in_freezer", "web_form", "done", 26, 24, 310],
        ["Beth Moreno", "Riverside Catering", "+17085550117", "Compressor quote for walk-in freezer", "walk_in_freezer", "call", "lost", 28, 21, 5800, "Replaced the whole unit with another company"],
        ["Gina Marino", "Bella Napoli", "+13125550164", "Walk-in cooler fan noise", "walk_in_cooler", "notebook", "done", 31, 30, 275],
        ["Tom Fisher", "Park Ave Deli", "+17735550147", "Reach-in cooler warm", "reach_in", "text", "done", 35, 33, 480],
        ["Rosa Diaz", "City Bakery", "+13125550193", "Ice machine replacement quote", "ice_machine", "web_form", "lost", 38, 30, 1900, "No reply after 3 tries"],
        ["Ray Costa", "Fulton Meats", "+13125550111", "Walk-in freezer evaporator coil", "walk_in_freezer", "email", "done", 40, 36, 1650],
        ["Nina Brooks", "Westside Pantry", "+17735550199", "Reach-in door hinge", "reach_in", "call", "done", 3, 1, 180],
      ] as const
    ).map(([name, business, phone, problem, equipment, source, stage, created, closed, quote, lostReason]) => ({
      customer: { name, business, phone, address: "" },
      jobs: [
        {
          problem,
          equipment: equipment as Equipment,
          source: source as Source,
          stage: stage as Stage,
          createdAgo: created * DAY,
          closedAgo: closed * DAY,
          quote,
          lostReason: lostReason as string | undefined,
        },
      ],
    })),
  ];
}

export async function seed(db: Db, now = new Date()) {
  await db.execute(sql`TRUNCATE activities, jobs, customers, inbound_log RESTART IDENTITY CASCADE`);
  const at = (ago: number | undefined) => (ago === undefined ? null : new Date(now.getTime() - ago));

  for (const { customer, jobs: list } of data(now)) {
    const [c] = await db
      .insert(customers)
      .values({
        name: customer.name,
        businessName: customer.business,
        phone: customer.phone,
        email: customer.email ?? null,
        address: customer.address || null,
        createdAt: at(Math.max(...list.map((j) => j.createdAgo)))!,
      })
      .returning();

    for (const j of list) {
      const createdAt = at(j.createdAgo)!;
      const closedAt = at(j.closedAgo);
      const [job] = await db
        .insert(jobs)
        .values({
          customerId: c.id,
          problem: j.problem,
          equipment: j.equipment,
          urgency: j.urgency ?? "routine",
          source: j.source,
          stage: j.stage,
          quoteAmount: j.quote ? j.quote * 100 : null,
          quoteSentAt: at(j.quoteSentAgo) ?? (j.quote && j.stage !== "new" ? createdAt : null),
          scheduledFor: j.scheduledFor ?? null,
          lastContactAt: at(j.lastContactAgo) ?? closedAt,
          contactAttempts: j.attempts ?? 0,
          rawInput: j.raw ?? null,
          autoAdded: j.autoAdded ?? false,
          lostReason: j.lostReason ?? null,
          closedAt,
          createdAt,
          updatedAt: closedAt ?? at(j.lastContactAgo) ?? createdAt,
        })
        .returning();

      const log: { type: ActivityType; note: string | null; createdAt: Date }[] = [
        { type: "created", note: `Added from ${j.source.replace("_", " ")}`, createdAt },
        ...(j.log ?? []).map((l) => ({ type: l.type, note: l.note ?? null, createdAt: at(l.ago)! })),
      ];
      if (j.quoteSentAgo !== undefined) {
        log.push({ type: "quote_sent", note: `Quote sent · $${j.quote!.toLocaleString("en-US")}`, createdAt: at(j.quoteSentAgo)! });
      }
      if (j.stage === "said_yes") log.push({ type: "stage_change", note: "Moved to Said yes", createdAt: at(j.lastContactAgo)! });
      if (j.stage === "scheduled") log.push({ type: "stage_change", note: "Moved to Scheduled", createdAt: at(j.lastContactAgo)! });
      if (closedAt) {
        log.push({ type: "stage_change", note: j.stage === "done" ? "Moved to Done" : `Marked lost${j.lostReason ? ` · ${j.lostReason}` : ""}`, createdAt: closedAt });
      }
      log.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      await db.insert(activities).values(log.map((l) => ({ ...l, jobId: job.id })));
    }
  }
}
