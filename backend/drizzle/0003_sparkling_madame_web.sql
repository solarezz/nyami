ALTER TABLE "users" ADD COLUMN "fasting_protocol" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "eat_start_hour" integer DEFAULT 12 NOT NULL;