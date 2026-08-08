CREATE TABLE IF NOT EXISTS "days" (
	"telegram_id" bigint NOT NULL,
	"date" text NOT NULL,
	"water" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "days_telegram_id_date_pk" PRIMARY KEY("telegram_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"weight_kg" real NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "days" ADD CONSTRAINT "days_telegram_id_users_telegram_id_fk" FOREIGN KEY ("telegram_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "weights" ADD CONSTRAINT "weights_telegram_id_users_telegram_id_fk" FOREIGN KEY ("telegram_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
