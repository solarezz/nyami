CREATE TABLE IF NOT EXISTS "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '🍽️' NOT NULL,
	"grams" real NOT NULL,
	"kcal" integer NOT NULL,
	"protein" integer DEFAULT 0 NOT NULL,
	"carbs" integer DEFAULT 0 NOT NULL,
	"fat" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill: у каждого существующего приёма пищи нет данных о массе — ставим 100 г
-- как нейтральную оценку (отражается в UI как общая оценка порции, не точный вес
-- конкретного ингредиента) и переносим текущий агрегат meals.* как единственный item.
INSERT INTO "meal_items" ("meal_id", "name", "emoji", "grams", "kcal", "protein", "carbs", "fat", "sort_order")
SELECT "id", "name", "emoji", 100, "kcal", "protein", "carbs", "fat", 0
FROM "meals";
