CREATE TABLE IF NOT EXISTS "meal_reminders" (
	"telegram_id" bigint NOT NULL,
	"date" text NOT NULL,
	"meal_type" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meal_reminders_telegram_id_date_meal_type_pk" PRIMARY KEY("telegram_id","date","meal_type")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meal_reminders" ADD CONSTRAINT "meal_reminders_telegram_id_users_telegram_id_fk" FOREIGN KEY ("telegram_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
