CREATE TABLE IF NOT EXISTS "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '🍽️' NOT NULL,
	"kcal" integer NOT NULL,
	"protein" integer DEFAULT 0 NOT NULL,
	"carbs" integer DEFAULT 0 NOT NULL,
	"fat" integer DEFAULT 0 NOT NULL,
	"eaten_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"telegram_id" bigint PRIMARY KEY NOT NULL,
	"first_name" text,
	"username" text,
	"sex" text DEFAULT 'male' NOT NULL,
	"age" integer DEFAULT 28 NOT NULL,
	"height_cm" integer DEFAULT 178 NOT NULL,
	"weight_kg" real DEFAULT 82 NOT NULL,
	"activity" text DEFAULT 'medium' NOT NULL,
	"goal" text DEFAULT 'lose' NOT NULL,
	"daily_kcal" integer DEFAULT 1900 NOT NULL,
	"protein" integer DEFAULT 140 NOT NULL,
	"fat" integer DEFAULT 60 NOT NULL,
	"carbs" integer DEFAULT 190 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meals" ADD CONSTRAINT "meals_telegram_id_users_telegram_id_fk" FOREIGN KEY ("telegram_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
