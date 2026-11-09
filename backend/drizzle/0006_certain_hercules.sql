CREATE TABLE IF NOT EXISTS "daily_targets" (
	"telegram_id" bigint NOT NULL,
	"date" text NOT NULL,
	"calories" integer NOT NULL,
	"protein" integer NOT NULL,
	"fat" integer NOT NULL,
	"carbs" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_targets_telegram_id_date_pk" PRIMARY KEY("telegram_id","date")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'Europe/Moscow' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_targets" ADD CONSTRAINT "daily_targets_telegram_id_users_telegram_id_fk" FOREIGN KEY ("telegram_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill: у уже прошедших онбординг пользователей появляется снимок цели на
-- "сегодня" (по их только что проставленной timezone, дефолт Europe/Moscow), собранный
-- из их текущих users.daily_kcal/protein/fat/carbs. Без этого getDay() для сегодняшней
-- даты упал бы на фолбэк (тоже users.*), так что backfill — не критичен для корректности,
-- но делает daily_targets сразу согласованным с реальностью, а не пустым до первого
-- редактирования профиля.
INSERT INTO "daily_targets" ("telegram_id", "date", "calories", "protein", "fat", "carbs")
SELECT
  "telegram_id",
  to_char((now() AT TIME ZONE "timezone"), 'YYYY-MM-DD'),
  "daily_kcal", "protein", "fat", "carbs"
FROM "users"
WHERE "onboarded" = true
ON CONFLICT ("telegram_id", "date") DO NOTHING;
