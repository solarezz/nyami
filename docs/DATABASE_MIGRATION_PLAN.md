# План миграций БД — «Редизайн + фундамент»

Подход: **expand → backfill → switch → contract**, без потери данных. Прод уже содержит
реальных пользователей — ни одна миграция не должна быть деструктивной без отдельного
подтверждения.

## 1. Таймзона пользователя (IANA)

**Expand**
- `users.timezone text not null default 'Europe/Moscow'` — у всех текущих пользователей
  фактически MSK (захардкожено в коде), дефолт отражает реальность, а не угадывает.

**Backfill**
- Не требуется — дефолт покрывает существующих пользователей корректно.

**Switch**
- Везде, где сейчас берётся `date.toISOString().slice(0,10)` или захардкожен `+03:00`
  (`db/repo.ts: addWorkout`, `addMeal`, `getWeek`, стрик), считать локальную дату через
  `timezone` пользователя (`Intl.DateTimeFormat` с `timeZone`, без сторонних runtime-зависимостей
  тяжелее необходимого — либо `date-fns-tz`, если нужна арифметика недель/DST).
- `local_date`/границы дня передаются из единой функции в `repo.ts`, а не разбросаны по
  вызовам (сейчас `todayKey()`, `dayRange()` уже централизованы — расширить их, чтобы
  принимали timezone).
- В онбординге добавить определение таймзоны из браузера (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
  с возможностью переопределить в профиле.

**Contract**
- Не требуется — хардкод `+03:00` просто удаляется из кода (не БД-объект).

## 2. Версионирование дневных целей

**Expand**
- Новая таблица `daily_targets`: `id uuid pk, telegram_id bigint references users, date text,
  calories int, protein int, fat int, carbs int, created_at timestamp`.
  Уникальный индекс `(telegram_id, date)`.

**Backfill**
- Для каждого существующего пользователя создать по одной записи `daily_targets` на
  `date = сегодня` (и опционально — на даты, где уже есть `meals`/`workouts`, если нужно
  видеть корректную историю задним числом; минимально достаточно — только на дату
  последнего изменения профиля, т.к. более ранней истории целей всё равно нет).

**Switch**
- `updateProfile` при пересчёте нормы пишет новую строку в `daily_targets` на текущую
  дату (а не только обновляет `users`).
- `getDay(userId, date)` берёт цель из `daily_targets` — последнюю запись с `date <= запрошенная`,
  а не текущие `users.dailyKcal/protein/fat/carbs`.
- `users.dailyKcal` и т.п. остаются как «текущая цель» для быстрого доступа (Dashboard,
  онбординг-результат) — не дублирующая сущность, а кэш последнего значения.

**Contract**
- Не требуется на этом этапе.

## 3. Ингредиенты в приёме пищи

**Expand**
- Новая таблица `meal_items`: `id uuid pk, meal_id uuid references meals(id) on delete cascade,
  name text, emoji text, quantity_g real, kcal int, protein int, carbs int, fat int, sort_order int`.
  (Снимки нутриентов хранятся на самой записи — не ссылкой на каталог, т.к. каталога
  продуктов в этом объёме работ нет.)
- `meals` остаётся как «приём пищи» (контейнер): `name`, `emoji`, `mealType`, `eatenAt`,
  плюс агрегированные `kcal/protein/carbs/fat` — пересчитываются из `meal_items` при
  любом изменении (сумма), не хранятся независимо от источника истины.

**Backfill**
- Для каждой существующей строки `meals` создать одну `meal_items` с теми же
  name/kcal/protein/carbs/fat и `quantity_g = 100` (нет данных о массе — ставим
  нейтральное значение, UI это объяснит как «оценка общей порции»).

**Switch**
- `AddFood`/`Result` на фронте позволяют добавить несколько компонентов в один приём
  (список ингредиентов вместо одного плоского объекта).
- `addMeal` в API принимает `items: MealItemInput[]` вместо плоских kcal/БЖУ;
  сервер считает сумму и пишет и `meals`, и `meal_items` в одной транзакции.
- AI-распознавание уже возвращает `extras` (доп. компоненты) — это естественно
  ложится на `meal_items`, просто `extras` перестают быть «довеском», а становятся
  полноценными строками с independent масштабированием.

**Contract**
- Если через время подтвердится, что агрегаты на `meals` не нужны отдельно (всегда
  можно досчитать из `meal_items`) — убрать дублирующие колонки. Не на этом этапе.

## 4. Подходы/повторения для тренировок (без библиотеки упражнений)

**Expand**
- Новая таблица `workout_sets`: `id uuid pk, workout_id uuid references workouts(id) on delete cascade,
  exercise_name text not null, set_number int not null, weight_kg real, repetitions int,
  created_at timestamp`.
  Никакого `exercise_id`/каталога — `exercise_name` просто текст, который вводит пользователь
  (с автоподсказкой по его же истории на фронте, не по глобальному справочнику).
- `workouts` остаётся как есть (name/minutes/kcal) для кардио и AI-оценённых тренировок;
  `workout_sets` — опциональное дополнение для силовых, когда пользователь хочет
  зафиксировать подходы.

**Backfill**
- Не требуется — новая опциональная возможность, старые `workouts` остаются валидными
  без единого `workout_sets`.

**Switch**
- `AddWorkout` получает тип «силовая» с возможностью добавить подходы (упражнение/вес/повторения),
  по аналогии с `meal_items` — список, не одна строка.
- История по `exercise_name` (прошлые веса/повторения для автоподсказки) — простой
  запрос `where exercise_name = ... order by created_at desc limit N`, без отдельной
  агрегирующей таблицы на этом этапе.

**Contract**
- Не требуется.

## 5. Тренировочный модуль (библиотека упражнений, программы, сессии)

Добавлено решением от 2026-11-13 (`PRODUCT_DECISIONS.md`) — раньше было сознательно
отложено. `workouts` (кардио/AI-оценка калорий) остаётся как есть и дальше обслуживает
прогулки/бег/ИИ-оценку — новые таблицы ниже обслуживают силовые тренировки по программе.

**Expand**
- `exercises`: `id uuid pk, name text, description text, muscle_group text` (основная
  категория для списков/фильтров, напр. "спина"), `primary_muscles text[]`,
  `secondary_muscles text[]` (для схемы тела — что подсвечивать ярко/тускло),
  `equipment text`, `equipment_photo_url text`, `technique_video_url text`,
  `difficulty text`, `is_system boolean default true`,
  `created_by_user_id bigint references users nullable` (свои упражнения), `created_at`.
  Фото/видео — внешние URL, не своя файловая система: для MVP библиотеки этого достаточно.
- `exercise_substitutes`: `exercise_id uuid references exercises, substitute_exercise_id
  uuid references exercises`, составной PK `(exercise_id, substitute_exercise_id)`.
  Направленная связь, но при показе «чем заменить» читаем в обе стороны (`OR`).
- `training_programs`: `id uuid pk, user_id bigint references users nullable` (`null` =
  системный шаблон, как в §7.3 исходного ТЗ), `name text, description text,
  is_template boolean, created_at`.
- `training_program_days`: `id uuid pk, program_id uuid references training_programs,
  name text` (напр. "День 2 · Pull"), `weekday int nullable` (1–7, если день программы
  жёстко привязан к дню недели — для пользователей со свободным графиком остаётся null,
  тогда расписание ведёт адаптивный вывод, см. ниже), `sort_order int`.
- `training_program_exercises`: `id uuid pk, program_day_id uuid references
  training_program_days, exercise_id uuid references exercises, sort_order int,
  target_sets int, target_reps_min int, target_reps_max int, rest_seconds int`.
- `training_sessions`: `id uuid pk, telegram_id bigint references users,
  program_id uuid references training_programs nullable,
  program_day_id uuid references training_program_days nullable,
  name text, started_at timestamp, completed_at timestamp nullable,
  status text default 'in_progress', created_at`.
- `exercise_sets`: `id uuid pk, training_session_id uuid references training_sessions,
  exercise_id uuid references exercises, set_number int, weight_kg real nullable,
  repetitions int nullable, completed boolean default false, created_at`.
  Заменяет собой более раннюю идею «свободного текста упражнения без каталога»
  (старый план Этапа 5 в `IMPLEMENTATION_ROADMAP.md`) — теперь упражнение всегда из
  каталога `exercises`, с полноценной историей/подсказками/заменами.

**Backfill**
- Не требуется — модуль полностью новый, старых данных для него нет.
- Библиотека `exercises` наполняется стартовым набором (20–40 базовых упражнений по
  группам мышц) отдельным сид-скриптом, не миграцией данных пользователя.

**Switch**
- `AddWorkout`/новый экран «Тренировки» используют `training_sessions`+`exercise_sets`
  для силовых тренировок по программе; старый `workouts` остаётся для кардио и
  быстрой AI-оценки (как сейчас) — два пути не конфликтуют, используются для разных
  сценариев.
- Экран карточки упражнения показывает `equipment_photo_url`/`technique_video_url`,
  `primary_muscles`/`secondary_muscles` на схеме тела, кнопка «Заменить» — через
  `exercise_substitutes`.
- **Адаптивное расписание** (по требованию пользователя от 2026-11-13): отдельной
  таблицы не заводим — считаем на лету из истории `training_sessions.started_at`
  (день недели + час), тем же приёмом, что уже применён к напоминаниям о приёме пищи
  (`mealThreshold`/`recentMealTimes` в `notifications.ts`): нужно 3+ сессии, чтобы
  доверять личному паттерну, иначе — нейтральный дефолт. Используется для подсветки
  «обычных» дней в ленте недели и для времени напоминания потренироваться
  (утро/вечер — по факту, не по единому дефолту).

**Contract**
- Не требуется на этом этапе.

## Порядок выполнения

1. `timezone` на `users` + переход логики дат — наименее рискованная миграция, ничего
   не ломает визуально, разблокирует корректные границы дня для всего остального.
2. `daily_targets` — чинит реальный баг с историей целей.
3. `meal_items` — самая заметная миграция, трогает основной сценарий (добавление еды);
   делать после того, как таймзона/даты стабильны, чтобы не путать два источника багов.
4. Тренировочный модуль (раздел 5) — независим от 1–3, можно делать параллельно с
   редизайном; `workouts` (кардио/AI-оценка) не трогаем, это отдельный путь.

Каждая миграция — отдельный Drizzle migration-файл, отдельный коммит, проверяется на
копии прод-данных перед обновлением сервера.
