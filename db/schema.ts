import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { ACTIVITY_TYPES, EQUIPMENT, SOURCES, STAGES, URGENCY } from "../lib/constants";

export * from "../lib/constants";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name"),
  businessName: text("business_name"),
  phone: text("phone").unique(), // E.164; null when we only have an email
  email: text("email"),
  address: text("address"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  problem: text("problem").notNull(),
  equipment: text("equipment", { enum: EQUIPMENT }).notNull().default("other"),
  urgency: text("urgency", { enum: URGENCY }).notNull().default("routine"),
  source: text("source", { enum: SOURCES }).notNull(),
  stage: text("stage", { enum: STAGES }).notNull().default("new"),
  quoteAmount: integer("quote_amount"), // cents
  quoteSentAt: ts("quote_sent_at"),
  scheduledFor: ts("scheduled_for"),
  lastContactAt: ts("last_contact_at"),
  // When the customer last reached out to us (inbound text/email on an open job).
  lastInboundAt: ts("last_inbound_at"),
  nextFollowUpAt: ts("next_follow_up_at"),
  // "Remind me Monday": hidden from Today until then.
  snoozedUntil: ts("snoozed_until"),
  contactAttempts: integer("contact_attempts").notNull().default(0),
  rawInput: text("raw_input"),
  autoAdded: boolean("auto_added").notNull().default(false),
  lostReason: text("lost_reason"),
  closedAt: ts("closed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// Inbound messages that were not job requests (spam, invoices, newsletters).
// Logged so nothing disappears silently, but they never become jobs.
export const inboundLog = pgTable("inbound_log", {
  id: serial("id").primaryKey(),
  source: text("source", { enum: SOURCES }).notNull(),
  raw: text("raw").notNull(),
  outcome: text("outcome").notNull(),
  jobId: integer("job_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// Read-only links to the Numbers page ("send it to my husband"). Only one is active at a time.
export const shareLinks = pgTable("share_links", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").notNull().defaultNow(),
  revokedAt: ts("revoked_at"),
});

export type Customer = typeof customers.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Activity = typeof activities.$inferSelect;
