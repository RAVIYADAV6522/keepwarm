CREATE TABLE "gmail_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"refresh_token" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_id" text NOT NULL,
	"from_name" text,
	"from_email" text,
	"subject" text,
	"body" text,
	"extracted" jsonb,
	"status" text NOT NULL,
	"job_id" integer,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_items_gmail_id_unique" UNIQUE("gmail_id")
);
