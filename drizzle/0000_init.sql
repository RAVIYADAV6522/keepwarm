CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"type" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"business_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "inbound_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"raw" text NOT NULL,
	"outcome" text NOT NULL,
	"job_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"problem" text NOT NULL,
	"equipment" text DEFAULT 'other' NOT NULL,
	"urgency" text DEFAULT 'routine' NOT NULL,
	"source" text NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"quote_amount" integer,
	"quote_sent_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"last_contact_at" timestamp with time zone,
	"last_inbound_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"contact_attempts" integer DEFAULT 0 NOT NULL,
	"raw_input" text,
	"auto_added" boolean DEFAULT false NOT NULL,
	"lost_reason" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;