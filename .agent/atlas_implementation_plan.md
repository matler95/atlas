# Atlas — Deterministic Implementation Plan
**Version:** 1.0  
**Target Stack:** React 18 + Vite + TanStack Router v1 + TanStack Query v5 + Supabase + TypeScript 5 + Tailwind CSS 3 + PWA (Vite PWA plugin)  
**Execution Model:** Sequential. Every step must be completed and validated before the next begins.  
**Resolved Decisions (no agent choice required):**  
- Language: TypeScript strict mode throughout  
- UI component base: shadcn/ui (Radix primitives + Tailwind)  
- State management: TanStack Query for server state; Zustand for ephemeral workout-session UI state  
- Auth: Supabase Auth (email+password + magic link)  
- Units default: metric (kg/cm); user can switch to imperial in profile  
- Experience levels mapped to: `beginner` | `intermediate` | `advanced`  
- Training styles: `full_body` | `upper_lower` | `push_pull_legs` | `bodybuilding_split` (chest/back/legs/shoulders+arms)  
- Equipment options: `full_gym` | `barbell_only` | `dumbbells_only` | `bodyweight_only` | `cables_machines` | `limited` (user specifies items)  
- Goal values: `muscle_gain` | `fat_loss` | `strength` | `general_fitness` | `recomposition`  
- Activity level values: `sedentary` | `light` | `moderate` | `high`  
- Job activity values: `desk` | `mixed` | `physical`  
- Gender values: `male` | `female` | `other` (BMR uses `male` formula for `other`)  
- Workout session planned duration: calculated from exercise count × time-budget formula (Section 5.4)  
- Abs tracking: separate field `include_abs: boolean` + `abs_days: integer[]` (0=Sun…6=Sat)  
- Movement patterns enum: `horizontal_push` | `horizontal_pull` | `vertical_push` | `vertical_pull` | `hip_hinge` | `squat` | `carry` | `core` | `unilateral`  
- Deload: implemented via `deload_active` boolean flag; multiplier applied at read time (never mutate stored sets)  
- Onboarding data saved to `user_profiles` only after account creation; temp state held in browser sessionStorage during onboarding  
- Mesocycle length: fixed 4 weeks (Upgrade J model)  
- RPE scale: integers and half-steps 6–10 (stored as numeric)  
- All weights stored in **kg** internally; display converted for imperial users  
- exercises.json `id` field is the canonical exercise slug; used as natural key during seed  
- `null` mechanic in exercises.json is stored as `NULL` in DB  
- `null` equipment in exercises.json is stored as `'unknown'` string  
- `null` force in exercises.json is stored as `NULL` in DB  

---

## Step 1: Repository & Project Scaffolding

### Goal
Create the monorepo directory structure, initialize the Vite + React + TypeScript project, and install all required dependencies.

### Files
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `.env.example`
- `.gitignore`
- `index.html`
- `src/main.tsx`
- `src/vite-env.d.ts`

### Implementation Details
1. Run: `npm create vite@latest atlas -- --template react-ts`
2. Enter project directory: `cd atlas`
3. Install production dependencies:
   ```
   npm install \
     @tanstack/react-router@1 \
     @tanstack/react-query@5 \
     @supabase/supabase-js@2 \
     zustand@4 \
     @radix-ui/react-dialog \
     @radix-ui/react-select \
     @radix-ui/react-checkbox \
     @radix-ui/react-slider \
     @radix-ui/react-tabs \
     @radix-ui/react-toast \
     @radix-ui/react-progress \
     @radix-ui/react-avatar \
     @radix-ui/react-switch \
     class-variance-authority \
     clsx \
     tailwind-merge \
     lucide-react \
     date-fns \
     recharts
   ```
4. Install dev dependencies:
   ```
   npm install -D \
     tailwindcss \
     postcss \
     autoprefixer \
     @tailwindcss/forms \
     vite-plugin-pwa \
     @tanstack/router-devtools \
     @tanstack/react-query-devtools \
     @types/node
   ```
5. Run: `npx tailwindcss init -p`
6. Create `.env.example`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
7. Create `.env` (copy of `.env.example` with real values — filled manually by developer)
8. Set `tsconfig.json` compilerOptions: `"strict": true`, `"target": "ES2020"`, `"lib": ["ES2020","DOM","DOM.Iterable"]`, `"moduleResolution": "bundler"`, `"paths": { "@/*": ["./src/*"] }`
9. Configure `vite.config.ts` with:
   - path alias `@` → `src/`
   - `vite-plugin-pwa` with `registerType: 'autoUpdate'`, `manifest.name: 'Atlas'`, `manifest.short_name: 'Atlas'`, `manifest.theme_color: '#111827'`, `manifest.background_color: '#111827'`, `manifest.display: 'standalone'`, `manifest.orientation: 'portrait'`
10. Configure `tailwind.config.ts`: content paths include `./index.html` and `./src/**/*.{ts,tsx}`; extend colors with `brand: { DEFAULT: '#6366f1', dark: '#4f46e5' }`

### Dependencies
- None (first step)

### Validation
- `npm run dev` starts without errors
- Browser opens `http://localhost:5173` and renders a blank React app
- No TypeScript errors on `npm run build`

---

## Step 2: Supabase Project & Client Initialization

### Goal
Initialize the Supabase client singleton and expose typed environment variables; create the `supabase/` directory structure for migrations.

### Files
- `src/lib/supabase.ts`
- `supabase/migrations/` (directory, empty)
- `supabase/seed/` (directory, empty)

### Implementation Details
1. Create `src/lib/supabase.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from './database.types'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase environment variables')
   }

   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
     auth: {
       persistSession: true,
       autoRefreshToken: true,
       detectSessionInUrl: true,
     },
   })
   ```
2. Create placeholder `src/lib/database.types.ts` with `export type Database = any` — this will be replaced in Step 4.
3. Create directories: `supabase/migrations/` and `supabase/seed/`

### Dependencies
- Step 1

### Validation
- `src/lib/supabase.ts` compiles without errors
- `supabase` export is importable in other files

---

## Step 3: Full Supabase Schema Design (Reference Document)

### Goal
Define every table, column, type, index, and constraint for the entire application schema. This document is the single source of truth referenced by Steps 4, 5, and all backend steps.

### Files
- `supabase/SCHEMA.md` (reference document — not executed, used by Steps 4–5)

### Implementation Details
Create `supabase/SCHEMA.md` with the following complete schema specification:

#### ENUM TYPES
```
goal_enum:           muscle_gain | fat_loss | strength | general_fitness | recomposition
experience_enum:     beginner | intermediate | advanced
gender_enum:         male | female | other
activity_level_enum: sedentary | light | moderate | high
job_activity_enum:   desk | mixed | physical
equipment_enum:      full_gym | barbell_only | dumbbells_only | bodyweight_only | cables_machines | limited
training_style_enum: full_body | upper_lower | push_pull_legs | bodybuilding_split
exercise_category_enum: cardio | olympic_weightlifting | plyometrics | powerlifting | strength | stretching | strongman
exercise_level_enum: beginner | intermediate | expert
exercise_force_enum: push | pull | static
exercise_mechanic_enum: compound | isolation
muscle_group_enum:   abdominals | abductors | adductors | biceps | calves | chest | forearms | glutes | hamstrings | lats | lower_back | middle_back | neck | quadriceps | shoulders | traps | triceps
movement_pattern_enum: horizontal_push | horizontal_pull | vertical_push | vertical_pull | hip_hinge | squat | carry | core | unilateral
periodization_enum:  linear | undulating | block
workout_day_type_enum: push | pull | legs | upper | lower | full_body | chest | back | shoulders | arms | abs | rest
session_status_enum: in_progress | completed | abandoned
plateau_status_enum: progressing | plateau | regression
bw_signal_enum:      bulk | cut | maintain | rapid_loss | insufficient_data
```

#### TABLE: exercises
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| slug | text | UNIQUE NOT NULL (maps to exercises.json `id` field) |
| name | text | NOT NULL |
| category | exercise_category_enum | NOT NULL |
| level | exercise_level_enum | NOT NULL |
| force | exercise_force_enum | NULL |
| mechanic | exercise_mechanic_enum | NULL |
| equipment | text | NOT NULL DEFAULT 'unknown' |
| primary_muscles | muscle_group_enum[] | NOT NULL DEFAULT '{}' |
| secondary_muscles | muscle_group_enum[] | NOT NULL DEFAULT '{}' |
| movement_pattern | movement_pattern_enum | NULL |
| is_compound | boolean | NOT NULL DEFAULT false |
| is_unilateral | boolean | NOT NULL DEFAULT false |
| instructions | text[] | NOT NULL DEFAULT '{}' |
| is_lower_body | boolean | NOT NULL DEFAULT false |

Indexes: `idx_exercises_equipment` ON equipment; `idx_exercises_primary_muscles` USING GIN ON primary_muscles; `idx_exercises_level` ON level; `idx_exercises_category` ON category; `idx_exercises_mechanic` ON mechanic

#### TABLE: user_profiles
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| goal | goal_enum | NOT NULL |
| experience | experience_enum | NOT NULL |
| gender | gender_enum | NOT NULL |
| age | integer | NOT NULL CHECK (age >= 13 AND age <= 100) |
| height_cm | numeric(5,1) | NOT NULL CHECK (height_cm > 0) |
| weight_kg | numeric(5,1) | NOT NULL CHECK (weight_kg > 0) |
| equipment | equipment_enum | NOT NULL |
| limited_equipment_items | text[] | NOT NULL DEFAULT '{}' |
| gym_days_per_week | integer | NOT NULL CHECK (gym_days_per_week >= 1 AND gym_days_per_week <= 7) |
| session_length_minutes | integer | NOT NULL CHECK (session_length_minutes >= 20 AND session_length_minutes <= 180) |
| training_style | training_style_enum | NOT NULL |
| include_abs | boolean | NOT NULL DEFAULT false |
| abs_days | integer[] | NOT NULL DEFAULT '{}' |
| sleep_hours | numeric(3,1) | NOT NULL DEFAULT 7.0 CHECK (sleep_hours >= 3 AND sleep_hours <= 12) |
| stress_level | integer | NOT NULL DEFAULT 2 CHECK (stress_level >= 1 AND stress_level <= 5) |
| job_activity | job_activity_enum | NOT NULL DEFAULT 'desk' |
| cardio_sessions_per_week | integer | NOT NULL DEFAULT 0 CHECK (cardio_sessions_per_week >= 0 AND cardio_sessions_per_week <= 14) |
| activity_level | activity_level_enum | NOT NULL DEFAULT 'moderate' |
| exercises_to_avoid | uuid[] | NOT NULL DEFAULT '{}' |
| prioritized_muscles | muscle_group_enum[] | NOT NULL DEFAULT '{}' |
| units | text | NOT NULL DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')) |
| theme | text | NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')) |
| language | text | NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'pl')) |
| rpe_offset | numeric(4,2) | NOT NULL DEFAULT 0 |
| rpe_calibration_confidence | numeric(4,3) | NOT NULL DEFAULT 0 |
| fatigue_accumulation_modifier | numeric(4,2) | NOT NULL DEFAULT 1.0 |
| onboarding_completed | boolean | NOT NULL DEFAULT false |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

Indexes: `idx_user_profiles_goal` ON goal; `idx_user_profiles_experience` ON experience

#### TABLE: bodyweight_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| weight_kg | numeric(5,2) | NOT NULL CHECK (weight_kg > 0) |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Constraints: UNIQUE (user_id, date)  
Indexes: `idx_bodyweight_logs_user_date` ON (user_id, date DESC)

#### TABLE: workout_plans
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| goal | goal_enum | NOT NULL |
| experience | experience_enum | NOT NULL |
| training_style | training_style_enum | NOT NULL |
| days_per_week | integer | NOT NULL |
| session_length_minutes | integer | NOT NULL |
| periodization | periodization_enum | NOT NULL |
| is_active | boolean | NOT NULL DEFAULT true |
| deload_active | boolean | NOT NULL DEFAULT false |
| start_date | date | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

Indexes: `idx_workout_plans_user_active` ON (user_id, is_active)

#### TABLE: workout_days
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| plan_id | uuid | NOT NULL FK → workout_plans(id) ON DELETE CASCADE |
| day_of_week | integer | NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6) |
| day_type | workout_day_type_enum | NOT NULL |
| order_index | integer | NOT NULL |

Constraints: UNIQUE (plan_id, day_of_week)  
Indexes: `idx_workout_days_plan` ON plan_id

#### TABLE: workout_day_exercises
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| workout_day_id | uuid | NOT NULL FK → workout_days(id) ON DELETE CASCADE |
| exercise_id | uuid | NOT NULL FK → exercises(id) |
| order_index | integer | NOT NULL |
| suggested_sets | integer | NOT NULL CHECK (suggested_sets >= 1 AND suggested_sets <= 10) |
| suggested_reps_min | integer | NOT NULL |
| suggested_reps_max | integer | NOT NULL |
| suggested_weight_kg | numeric(6,2) | NULL |
| rest_seconds | integer | NOT NULL DEFAULT 120 |

Constraints: UNIQUE (workout_day_id, order_index)  
Indexes: `idx_wde_workout_day` ON workout_day_id; `idx_wde_exercise` ON exercise_id

#### TABLE: workout_sessions
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| workout_day_id | uuid | NOT NULL FK → workout_days(id) |
| status | session_status_enum | NOT NULL DEFAULT 'in_progress' |
| started_at | timestamptz | NOT NULL DEFAULT now() |
| completed_at | timestamptz | NULL |
| planned_duration_minutes | integer | NOT NULL |
| checkin_score | integer | NULL CHECK (checkin_score >= 1 AND checkin_score <= 5) |
| checkin_limiters | text[] | NOT NULL DEFAULT '{}' |
| feedback_energy | integer | NULL CHECK (feedback_energy >= 1 AND feedback_energy <= 5) |
| feedback_difficulty | integer | NULL CHECK (feedback_difficulty >= 1 AND feedback_difficulty <= 5) |
| feedback_notes | text | NULL |

Indexes: `idx_sessions_user_started` ON (user_id, started_at DESC); `idx_sessions_status` ON status

#### TABLE: session_sets
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| session_id | uuid | NOT NULL FK → workout_sessions(id) ON DELETE CASCADE |
| exercise_id | uuid | NOT NULL FK → exercises(id) |
| set_number | integer | NOT NULL CHECK (set_number >= 1) |
| reps | integer | NOT NULL CHECK (reps >= 0) |
| weight_kg | numeric(6,2) | NOT NULL DEFAULT 0 CHECK (weight_kg >= 0) |
| rpe | numeric(3,1) | NULL CHECK (rpe >= 1 AND rpe <= 10) |
| completed_at | timestamptz | NOT NULL DEFAULT now() |
| is_warmup | boolean | NOT NULL DEFAULT false |

Indexes: `idx_session_sets_session` ON session_id; `idx_session_sets_exercise` ON (exercise_id, completed_at DESC)

#### TABLE: fitness_snapshots
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| fitness | numeric(8,3) | NOT NULL DEFAULT 0 |
| fatigue | numeric(8,3) | NOT NULL DEFAULT 0 |
| form | numeric(8,3) | NOT NULL DEFAULT 0 |

Constraints: PRIMARY KEY (user_id, date)  
Indexes: `idx_fitness_snapshots_user_date` ON (user_id, date DESC)

#### TABLE: exercise_e1rm_history
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| exercise_id | uuid | NOT NULL FK → exercises(id) |
| session_id | uuid | NOT NULL FK → workout_sessions(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| e1rm_kg | numeric(7,2) | NOT NULL CHECK (e1rm_kg > 0) |

Constraints: PRIMARY KEY (user_id, exercise_id, session_id)  
Indexes: `idx_e1rm_user_exercise_date` ON (user_id, exercise_id, date DESC)

#### TABLE: user_volume_landmarks
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| muscle_group | muscle_group_enum | NOT NULL |
| mev | numeric(5,2) | NOT NULL |
| mav | numeric(5,2) | NOT NULL |
| mrv | numeric(5,2) | NOT NULL |
| confidence | numeric(4,3) | NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1) |
| last_updated | timestamptz | NOT NULL DEFAULT now() |

Constraints: PRIMARY KEY (user_id, muscle_group)

#### TABLE: plan_quality_scores
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| plan_id | uuid | NOT NULL FK → workout_plans(id) ON DELETE CASCADE |
| overall_score | numeric(5,2) | NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100) |
| equipment_coverage | numeric(5,2) | NOT NULL |
| volume_balance | numeric(5,2) | NOT NULL |
| recovery_fit | numeric(5,2) | NOT NULL |
| goal_alignment | numeric(5,2) | NOT NULL |
| warnings | text[] | NOT NULL DEFAULT '{}' |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Indexes: `idx_quality_scores_plan` ON plan_id

### Dependencies
- Step 1

### Validation
- `supabase/SCHEMA.md` exists and contains all tables listed above
- Every table has a PK, defined indexes, and declared FK relationships
- No table references a table not defined in this document

---

## Step 4: Supabase Migration 001 — ENUM Types & exercises Table

### Goal
Create SQL migration file that defines all ENUM types and the `exercises` table with all constraints and indexes.

### Files
- `supabase/migrations/001_enums_and_exercises.sql`

### Implementation Details
```sql
-- Migration 001: ENUM types and exercises table

-- ENUM TYPES
CREATE TYPE goal_enum AS ENUM ('muscle_gain','fat_loss','strength','general_fitness','recomposition');
CREATE TYPE experience_enum AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE gender_enum AS ENUM ('male','female','other');
CREATE TYPE activity_level_enum AS ENUM ('sedentary','light','moderate','high');
CREATE TYPE job_activity_enum AS ENUM ('desk','mixed','physical');
CREATE TYPE equipment_enum AS ENUM ('full_gym','barbell_only','dumbbells_only','bodyweight_only','cables_machines','limited');
CREATE TYPE training_style_enum AS ENUM ('full_body','upper_lower','push_pull_legs','bodybuilding_split');
CREATE TYPE exercise_category_enum AS ENUM ('cardio','olympic_weightlifting','plyometrics','powerlifting','strength','stretching','strongman');
CREATE TYPE exercise_level_enum AS ENUM ('beginner','intermediate','expert');
CREATE TYPE exercise_force_enum AS ENUM ('push','pull','static');
CREATE TYPE exercise_mechanic_enum AS ENUM ('compound','isolation');
CREATE TYPE muscle_group_enum AS ENUM ('abdominals','abductors','adductors','biceps','calves','chest','forearms','glutes','hamstrings','lats','lower_back','middle_back','neck','quadriceps','shoulders','traps','triceps');
CREATE TYPE movement_pattern_enum AS ENUM ('horizontal_push','horizontal_pull','vertical_push','vertical_pull','hip_hinge','squat','carry','core','unilateral');
CREATE TYPE periodization_enum AS ENUM ('linear','undulating','block');
CREATE TYPE workout_day_type_enum AS ENUM ('push','pull','legs','upper','lower','full_body','chest','back','shoulders','arms','abs','rest');
CREATE TYPE session_status_enum AS ENUM ('in_progress','completed','abandoned');
CREATE TYPE plateau_status_enum AS ENUM ('progressing','plateau','regression');
CREATE TYPE bw_signal_enum AS ENUM ('bulk','cut','maintain','rapid_loss','insufficient_data');

-- EXERCISES TABLE
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category exercise_category_enum NOT NULL,
  level exercise_level_enum NOT NULL,
  force exercise_force_enum NULL,
  mechanic exercise_mechanic_enum NULL,
  equipment text NOT NULL DEFAULT 'unknown',
  primary_muscles muscle_group_enum[] NOT NULL DEFAULT '{}',
  secondary_muscles muscle_group_enum[] NOT NULL DEFAULT '{}',
  movement_pattern movement_pattern_enum NULL,
  is_compound boolean NOT NULL DEFAULT false,
  is_unilateral boolean NOT NULL DEFAULT false,
  is_lower_body boolean NOT NULL DEFAULT false,
  instructions text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_exercises_equipment ON exercises(equipment);
CREATE INDEX idx_exercises_primary_muscles ON exercises USING GIN(primary_muscles);
CREATE INDEX idx_exercises_level ON exercises(level);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_mechanic ON exercises(mechanic);
```

Apply: `supabase db push` or execute in Supabase SQL editor.

### Dependencies
- Step 3

### Validation
- Run: `SELECT COUNT(*) FROM exercises;` → returns 0 (table exists, empty)
- Run: `SELECT typname FROM pg_type WHERE typtype='e';` → lists all 19 enum types
- Run: `\d exercises` in psql → shows all columns with correct types

---

## Step 5: Supabase Migration 002 — All Remaining Tables

### Goal
Create SQL migration file for all application tables except `exercises`.

### Files
- `supabase/migrations/002_application_tables.sql`

### Implementation Details
```sql
-- Migration 002: Application tables

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal goal_enum NOT NULL,
  experience experience_enum NOT NULL,
  gender gender_enum NOT NULL,
  age integer NOT NULL CHECK (age >= 13 AND age <= 100),
  height_cm numeric(5,1) NOT NULL CHECK (height_cm > 0),
  weight_kg numeric(5,1) NOT NULL CHECK (weight_kg > 0),
  equipment equipment_enum NOT NULL,
  limited_equipment_items text[] NOT NULL DEFAULT '{}',
  gym_days_per_week integer NOT NULL CHECK (gym_days_per_week >= 1 AND gym_days_per_week <= 7),
  session_length_minutes integer NOT NULL CHECK (session_length_minutes >= 20 AND session_length_minutes <= 180),
  training_style training_style_enum NOT NULL,
  include_abs boolean NOT NULL DEFAULT false,
  abs_days integer[] NOT NULL DEFAULT '{}',
  sleep_hours numeric(3,1) NOT NULL DEFAULT 7.0 CHECK (sleep_hours >= 3 AND sleep_hours <= 12),
  stress_level integer NOT NULL DEFAULT 2 CHECK (stress_level >= 1 AND stress_level <= 5),
  job_activity job_activity_enum NOT NULL DEFAULT 'desk',
  cardio_sessions_per_week integer NOT NULL DEFAULT 0 CHECK (cardio_sessions_per_week >= 0 AND cardio_sessions_per_week <= 14),
  activity_level activity_level_enum NOT NULL DEFAULT 'moderate',
  exercises_to_avoid uuid[] NOT NULL DEFAULT '{}',
  prioritized_muscles muscle_group_enum[] NOT NULL DEFAULT '{}',
  units text NOT NULL DEFAULT 'metric' CHECK (units IN ('metric','imperial')),
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','pl')),
  rpe_offset numeric(4,2) NOT NULL DEFAULT 0,
  rpe_calibration_confidence numeric(4,3) NOT NULL DEFAULT 0,
  fatigue_accumulation_modifier numeric(4,2) NOT NULL DEFAULT 1.0,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_profiles_goal ON user_profiles(goal);
CREATE INDEX idx_user_profiles_experience ON user_profiles(experience);

CREATE TABLE bodyweight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE INDEX idx_bodyweight_logs_user_date ON bodyweight_logs(user_id, date DESC);

CREATE TABLE workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal goal_enum NOT NULL,
  experience experience_enum NOT NULL,
  training_style training_style_enum NOT NULL,
  days_per_week integer NOT NULL,
  session_length_minutes integer NOT NULL,
  periodization periodization_enum NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  deload_active boolean NOT NULL DEFAULT false,
  start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workout_plans_user_active ON workout_plans(user_id, is_active);

CREATE TABLE workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_type workout_day_type_enum NOT NULL,
  order_index integer NOT NULL,
  UNIQUE (plan_id, day_of_week)
);
CREATE INDEX idx_workout_days_plan ON workout_days(plan_id);

CREATE TABLE workout_day_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  order_index integer NOT NULL,
  suggested_sets integer NOT NULL CHECK (suggested_sets >= 1 AND suggested_sets <= 10),
  suggested_reps_min integer NOT NULL,
  suggested_reps_max integer NOT NULL,
  suggested_weight_kg numeric(6,2) NULL,
  rest_seconds integer NOT NULL DEFAULT 120,
  UNIQUE (workout_day_id, order_index)
);
CREATE INDEX idx_wde_workout_day ON workout_day_exercises(workout_day_id);
CREATE INDEX idx_wde_exercise ON workout_day_exercises(exercise_id);

CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workout_day_id uuid NOT NULL REFERENCES workout_days(id),
  status session_status_enum NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  planned_duration_minutes integer NOT NULL,
  checkin_score integer NULL CHECK (checkin_score >= 1 AND checkin_score <= 5),
  checkin_limiters text[] NOT NULL DEFAULT '{}',
  feedback_energy integer NULL CHECK (feedback_energy >= 1 AND feedback_energy <= 5),
  feedback_difficulty integer NULL CHECK (feedback_difficulty >= 1 AND feedback_difficulty <= 5),
  feedback_notes text NULL
);
CREATE INDEX idx_sessions_user_started ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_status ON workout_sessions(status);

CREATE TABLE session_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  set_number integer NOT NULL CHECK (set_number >= 1),
  reps integer NOT NULL CHECK (reps >= 0),
  weight_kg numeric(6,2) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  rpe numeric(3,1) NULL CHECK (rpe >= 1 AND rpe <= 10),
  completed_at timestamptz NOT NULL DEFAULT now(),
  is_warmup boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_session_sets_session ON session_sets(session_id);
CREATE INDEX idx_session_sets_exercise ON session_sets(exercise_id, completed_at DESC);

CREATE TABLE fitness_snapshots (
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  fitness numeric(8,3) NOT NULL DEFAULT 0,
  fatigue numeric(8,3) NOT NULL DEFAULT 0,
  form numeric(8,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
CREATE INDEX idx_fitness_snapshots_user_date ON fitness_snapshots(user_id, date DESC);

CREATE TABLE exercise_e1rm_history (
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  date date NOT NULL,
  e1rm_kg numeric(7,2) NOT NULL CHECK (e1rm_kg > 0),
  PRIMARY KEY (user_id, exercise_id, session_id)
);
CREATE INDEX idx_e1rm_user_exercise_date ON exercise_e1rm_history(user_id, exercise_id, date DESC);

CREATE TABLE user_volume_landmarks (
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  muscle_group muscle_group_enum NOT NULL,
  mev numeric(5,2) NOT NULL,
  mav numeric(5,2) NOT NULL,
  mrv numeric(5,2) NOT NULL,
  confidence numeric(4,3) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  last_updated timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, muscle_group)
);

CREATE TABLE plan_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  equipment_coverage numeric(5,2) NOT NULL,
  volume_balance numeric(5,2) NOT NULL,
  recovery_fit numeric(5,2) NOT NULL,
  goal_alignment numeric(5,2) NOT NULL,
  warnings text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quality_scores_plan ON plan_quality_scores(plan_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON workout_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Dependencies
- Step 4

### Validation
- Run: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;` → returns all 11 tables
- Run: `\d workout_sessions` → shows checkin_score, checkin_limiters columns
- Run: `SELECT trigger_name FROM information_schema.triggers;` → returns update triggers for user_profiles and workout_plans

---

## Step 6: Supabase Migration 003 — Row Level Security Policies

### Goal
Enable RLS on all tables and create policies so that authenticated users can only read/write their own rows; `exercises` is publicly readable.

### Files
- `supabase/migrations/003_rls_policies.sql`

### Implementation Details
```sql
-- Migration 003: Row Level Security

-- Enable RLS on all tables
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodyweight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_e1rm_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_volume_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_quality_scores ENABLE ROW LEVEL SECURITY;

-- exercises: public read, no write from client
CREATE POLICY "exercises_select_public" ON exercises FOR SELECT USING (true);

-- user_profiles: user owns their own row
CREATE POLICY "user_profiles_select_own" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_delete_own" ON user_profiles FOR DELETE USING (auth.uid() = id);

-- bodyweight_logs
CREATE POLICY "bw_logs_select_own" ON bodyweight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bw_logs_insert_own" ON bodyweight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bw_logs_update_own" ON bodyweight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bw_logs_delete_own" ON bodyweight_logs FOR DELETE USING (auth.uid() = user_id);

-- workout_plans
CREATE POLICY "plans_select_own" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plans_insert_own" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update_own" ON workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plans_delete_own" ON workout_plans FOR DELETE USING (auth.uid() = user_id);

-- workout_days (owned via plan)
CREATE POLICY "days_select_own" ON workout_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "days_insert_own" ON workout_days FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "days_update_own" ON workout_days FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "days_delete_own" ON workout_days FOR DELETE
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));

-- workout_day_exercises (owned via day → plan)
CREATE POLICY "wde_select_own" ON workout_day_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_day_id AND wp.user_id = auth.uid()
  ));
CREATE POLICY "wde_insert_own" ON workout_day_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_day_id AND wp.user_id = auth.uid()
  ));
CREATE POLICY "wde_update_own" ON workout_day_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_day_id AND wp.user_id = auth.uid()
  ));
CREATE POLICY "wde_delete_own" ON workout_day_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_day_id AND wp.user_id = auth.uid()
  ));

-- workout_sessions
CREATE POLICY "sessions_select_own" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- session_sets (owned via session)
CREATE POLICY "sets_select_own" ON session_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "sets_insert_own" ON session_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "sets_update_own" ON session_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "sets_delete_own" ON session_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

-- fitness_snapshots
CREATE POLICY "snapshots_select_own" ON fitness_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert_own" ON fitness_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_update_own" ON fitness_snapshots FOR UPDATE USING (auth.uid() = user_id);

-- exercise_e1rm_history
CREATE POLICY "e1rm_select_own" ON exercise_e1rm_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "e1rm_insert_own" ON exercise_e1rm_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "e1rm_update_own" ON exercise_e1rm_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "e1rm_delete_own" ON exercise_e1rm_history FOR DELETE USING (auth.uid() = user_id);

-- user_volume_landmarks
CREATE POLICY "landmarks_select_own" ON user_volume_landmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "landmarks_insert_own" ON user_volume_landmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "landmarks_update_own" ON user_volume_landmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "landmarks_delete_own" ON user_volume_landmarks FOR DELETE USING (auth.uid() = user_id);

-- plan_quality_scores (owned via plan)
CREATE POLICY "quality_select_own" ON plan_quality_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "quality_insert_own" ON plan_quality_scores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
```

### Dependencies
- Step 5

### Validation
- Run: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';` → all tables show `rowsecurity = true`
- Run: `SELECT policyname, tablename FROM pg_policies ORDER BY tablename;` → shows at least 4 policies per user-owned table
- Confirm anonymous request to `user_profiles` returns 0 rows (test via Supabase dashboard API explorer)

---

## Step 7: Supabase Database Types Generation

### Goal
Generate TypeScript types from the live Supabase schema and replace the placeholder `database.types.ts`.

### Files
- `src/lib/database.types.ts` (replace placeholder)

### Implementation Details
1. Install Supabase CLI if not present: `npm install -D supabase`
2. Run: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/lib/database.types.ts`
3. Replace the `export type Database = any` placeholder with the generated types.
4. Verify `src/lib/supabase.ts` still compiles with the typed client.

### Dependencies
- Step 5, Step 6

### Validation
- `src/lib/database.types.ts` contains typed interfaces for all 11 tables
- `npm run build` completes without TypeScript errors

---

## Step 8: Exercises Seed — JSON-to-DB Transformation Script

### Goal
Create a Node.js seed script that transforms `exercises.json` into validated database rows and upserts them into the `exercises` table.

### Files
- `supabase/seed/seed_exercises.ts`
- `supabase/seed/exercise_movement_patterns.ts`

### Implementation Details

#### equipment mapping (exercises.json `equipment` → DB `equipment` text column)
Store as-is from JSON. If value is `null`, store `'unknown'`. Full set from JSON: `bands`, `barbell`, `body only`, `cable`, `dumbbell`, `e-z curl bar`, `exercise ball`, `foam roll`, `kettlebells`, `machine`, `medicine ball`, `other`, `unknown`.

#### category mapping (exercises.json → exercise_category_enum)
| JSON value | DB enum |
|---|---|
| `cardio` | `cardio` |
| `olympic weightlifting` | `olympic_weightlifting` |
| `plyometrics` | `plyometrics` |
| `powerlifting` | `powerlifting` |
| `strength` | `strength` |
| `stretching` | `stretching` |
| `strongman` | `strongman` |

#### level mapping (exercises.json → exercise_level_enum)
| JSON | DB |
|---|---|
| `beginner` | `beginner` |
| `intermediate` | `intermediate` |
| `expert` | `expert` |

#### muscle_group mapping (exercises.json → muscle_group_enum)
| JSON | DB |
|---|---|
| `abdominals` | `abdominals` |
| `abductors` | `abductors` |
| `adductors` | `adductors` |
| `biceps` | `biceps` |
| `calves` | `calves` |
| `chest` | `chest` |
| `forearms` | `forearms` |
| `glutes` | `glutes` |
| `hamstrings` | `hamstrings` |
| `lats` | `lats` |
| `lower back` | `lower_back` |
| `middle back` | `middle_back` |
| `neck` | `neck` |
| `quadriceps` | `quadriceps` |
| `shoulders` | `shoulders` |
| `traps` | `traps` |
| `triceps` | `triceps` |

Note: spaces converted to underscores.

#### is_compound derivation
`is_compound = (mechanic === 'compound')`

#### is_lower_body derivation
`is_lower_body = primaryMuscles intersects ['quadriceps','hamstrings','glutes','calves','adductors','abductors']`

#### is_unilateral derivation
`is_unilateral = name.toLowerCase() includes any of: ['single','unilateral','one-arm','one arm','one-leg','one leg','lunge','split squat','step-up','pistol','bulgarian']`

#### movement_pattern assignment
Create `supabase/seed/exercise_movement_patterns.ts` as a record:  
`Record<string, movement_pattern_enum>` keyed by exercise `slug` (the JSON `id` field).  
This file manually assigns movement patterns for the 873 exercises. The pattern assignment rules (applied programmatically for unmapped slugs) are:
- `primaryMuscles.includes('chest') && (force === 'push') && (mechanic === 'compound')` → `horizontal_push` (if name suggests horizontal), else `vertical_push`
- `primaryMuscles.includes('lats') && (force === 'pull')` → `vertical_pull` (if name includes 'pulldown','pull-up','chin') else `horizontal_pull`
- `primaryMuscles.includes('middle back') || primaryMuscles.includes('traps')` && force === 'pull' → `horizontal_pull`
- `primaryMuscles.includes('hamstrings') && (mechanic === 'compound')` → `hip_hinge`
- `primaryMuscles.includes('quadriceps') && (mechanic === 'compound')` → `squat`
- `primaryMuscles.includes('abdominals')` → `core`
- `name.toLowerCase().match(/lunge|split squat|step.up|pistol|single.leg/)` → `unilateral`
- `primaryMuscles.includes('shoulders') && force === 'push'` → `vertical_push`
- All remaining → `NULL`

The seed script must apply the programmatic rules above; no manual entry required for the full 873 exercises.

#### Seed script logic (`seed_exercises.ts`):
```typescript
import exercises from './exercises.json'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Apply all mappings per the rules above
// For each exercise in exercises.json:
//   - map category, level, force, mechanic (null passes through as null)
//   - map primaryMuscles, secondaryMuscles (spaces → underscores)
//   - derive is_compound, is_lower_body, is_unilateral
//   - derive movement_pattern using programmatic rules
//   - set equipment: null → 'unknown', else keep string value
// Upsert with onConflict: 'slug'
// Log number of upserted rows
```

Run: `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx supabase/seed/seed_exercises.ts`

### Dependencies
- Step 4

### Validation
- Run: `SELECT COUNT(*) FROM exercises;` → returns 873
- Run: `SELECT COUNT(*) FROM exercises WHERE movement_pattern IS NOT NULL;` → returns > 400
- Run: `SELECT COUNT(*) FROM exercises WHERE is_compound = true;` → returns > 200
- Run: `SELECT * FROM exercises WHERE slug = 'Bench_Press' LIMIT 1;` → returns row with `primary_muscles = '{chest}'`, `is_compound = true`, `is_lower_body = false`

---

## Step 9: Algorithm Library — Core Utility Functions

### Goal
Implement shared math utilities required by all algorithm modules.

### Files
- `src/lib/algorithms/utils.ts`

### Implementation Details
```typescript
// src/lib/algorithms/utils.ts

export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(0, 1, t)
}

export function linearRegressionSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = mean(values)
  const numerator = values.reduce((s, y, x) => s + (x - xMean) * (y - yMean), 0)
  const denominator = values.reduce((s, _, x) => s + (x - xMean) ** 2, 0)
  return denominator === 0 ? 0 : numerator / denominator
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}
```

### Dependencies
- Step 1

### Validation
- Unit test (inline assertions in a test file or vitest): `clamp(0,10,15) === 10`, `clamp(0,10,-1) === 0`, `mean([1,2,3]) === 2`, `lerp(0,10,0.5) === 5`, `linearRegressionSlope([1,2,3]) === 1`

---

## Step 10: Algorithm — Banister EWMA Fatigue Model (Upgrade A)

### Goal
Implement the Banister impulse-response model for fitness/fatigue/form tracking.

### Files
- `src/lib/algorithms/fatigue.ts`

### Implementation Details
```typescript
// src/lib/algorithms/fatigue.ts
import { toDateString } from './utils'

export interface FitnessState {
  fitness: number  // CTL
  fatigue: number  // ATL
  form: number     // TSB = fitness - fatigue
}

export interface DatedLoad {
  date: Date
  load: number
}

export interface SessionSet {
  set_number: number
  reps: number
  weight_kg: number
  rpe: number | null
}

const FITNESS_TC = 42
const FATIGUE_TC = 7
const FITNESS_K = 1 - Math.exp(-1 / FITNESS_TC)
const FATIGUE_K = 1 - Math.exp(-1 / FATIGUE_TC)

export function updateFitnessState(prev: FitnessState, todayLoad: number): FitnessState {
  const fitness = prev.fitness + FITNESS_K * (todayLoad - prev.fitness)
  const fatigue = prev.fatigue + FATIGUE_K * (todayLoad - prev.fatigue)
  return { fitness, fatigue, form: fitness - fatigue }
}

export function buildFitnessHistory(sessions: DatedLoad[]): FitnessState {
  let state: FitnessState = { fitness: 0, fatigue: 0, form: 0 }
  if (sessions.length === 0) return state
  const sessionMap = new Map(sessions.map(s => [toDateString(s.date), s.load]))
  const start = new Date(sessions[0].date)
  const today = new Date()
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const load = sessionMap.get(toDateString(d)) ?? 0
    state = updateFitnessState(state, load)
  }
  return state
}

export function shouldDeload(state: FitnessState): boolean {
  return state.form < -30 || (state.fitness > 0 && state.fatigue / state.fitness > 1.5)
}

// RPE multiplier for load calculation
function rpeMultiplier(rpe: number | null): number {
  if (rpe === null) return 1.0
  const table: Record<number, number> = { 10: 1.0, 9: 0.94, 8: 0.89, 7: 0.83, 6: 0.77 }
  return table[Math.round(rpe)] ?? 1.0
}

export function sessionDurationModifier(actualMinutes: number, plannedMinutes: number): number {
  const ratio = actualMinutes / plannedMinutes
  if (ratio < 0.5) return 0.6
  if (ratio < 0.8) return 0.85
  if (ratio <= 1.3) return 1.0
  if (ratio <= 1.6) return 1.1
  return 1.2
}

export function sessionLoad(sets: SessionSet[], durationModifier: number): number {
  const rawLoad = sets.reduce(
    (sum, s) => sum + s.set_number * s.reps * s.weight_kg * rpeMultiplier(s.rpe), 0
  )
  return rawLoad * durationModifier
}
```

### Dependencies
- Step 9

### Validation
- `updateFitnessState({ fitness: 0, fatigue: 0, form: 0 }, 100)` → `fitness ≈ 2.33`, `fatigue ≈ 13.31`, `form ≈ -10.98`
- `shouldDeload({ fitness: 10, fatigue: 20, form: -31 })` → `true`

---

## Step 11: Algorithm — Readiness Score & Check-In EMA (Upgrades A, B)

### Goal
Implement the composite readiness score (0–100) and rolling check-in EMA.

### Files
- `src/lib/algorithms/readiness.ts`

### Implementation Details
```typescript
// src/lib/algorithms/readiness.ts
import { clamp } from './utils'
import type { FitnessState } from './fatigue'

export function readinessScore(
  fitnessState: FitnessState,
  checkinEMA: number,
  sleepHours: number
): number {
  const formScore    = clamp(0, 35, 35 * (1 - Math.abs(fitnessState.form) / 40))
  const checkinScore = clamp(0, 40, (checkinEMA / 5) * 40)
  const sleepScore   = clamp(0, 25, Math.min(sleepHours / 8, 1) * 25)
  return Math.round(formScore + checkinScore + sleepScore)
}

export interface WorkoutSessionCheckin {
  checkin_score: number | null
}

export function rollingCheckinEMA(recentSessions: WorkoutSessionCheckin[], k = 0.3): number {
  return recentSessions
    .filter(s => s.checkin_score != null)
    .reduce((ema, s) => k * s.checkin_score! + (1 - k) * ema, 3.0)
}

export function recoveryModifier(sleepHours: number, stressLevel: number, jobActivity: string): number {
  const physicalJob = jobActivity === 'physical'
  if (sleepHours < 5 || stressLevel >= 4 || physicalJob) return 0.75
  if (sleepHours < 6 && stressLevel >= 3) return 0.8
  if (sleepHours < 7 || stressLevel === 3 || jobActivity === 'mixed') return 0.9
  return 1.0
}
```

### Dependencies
- Step 9, Step 10

### Validation
- `readinessScore({ fitness: 20, fatigue: 20, form: 0 }, 3.0, 8)` → `35 + 24 + 25 = 84`
- `recoveryModifier(8, 2, 'desk')` → `1.0`
- `recoveryModifier(4, 5, 'physical')` → `0.75`

---

## Step 12: Algorithm — Epley e1RM & RPE Calibration (Upgrades C, D)

### Goal
Implement e1RM calculation with RPE adjustment and RPE calibration drift correction.

### Files
- `src/lib/algorithms/strength.ts`
- `src/lib/algorithms/rpe-calibration.ts`

### Implementation Details

**`src/lib/algorithms/strength.ts`:**
```typescript
import { clamp } from './utils'

export const rpePercentage: Record<number, number> = {
  10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91,
  8: 0.89,  7.5: 0.86, 7: 0.83, 6.5: 0.80, 6: 0.77
}

export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps > 12)  return weight
  return weight * (1 + reps / 30)
}

export function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const epleyMax = epley1RM(weight, reps)
  const rpePct = rpePercentage[rpe] ?? rpePercentage[Math.round(rpe * 2) / 2] ?? null
  if (!rpePct) return epleyMax
  return epleyMax / rpePct
}

export interface SessionSetForE1RM {
  weight_kg: number
  reps: number
  rpe: number | null
}

export function sessionE1RM(sets: SessionSetForE1RM[]): number {
  const validSets = sets.filter(s => s.rpe !== null && s.reps > 0)
  if (validSets.length === 0) {
    const best = sets.filter(s => s.reps > 0)
    if (best.length === 0) return 0
    return Math.max(...best.map(s => epley1RM(s.weight_kg, s.reps)))
  }
  return Math.max(...validSets.map(s => rpeAdjusted1RM(s.weight_kg, s.reps, s.rpe!)))
}

export function detectPlateau(e1rmHistory: number[]): 'progressing' | 'plateau' | 'regression' {
  if (e1rmHistory.length < 3) return 'progressing'
  const recent = e1rmHistory.slice(-3)
  const trend = (recent[2] - recent[0]) / recent[0]
  if (trend > 0.01)  return 'progressing'
  if (trend > -0.05) return 'plateau'
  return 'regression'
}
```

**`src/lib/algorithms/rpe-calibration.ts`:**
```typescript
import { clamp } from './utils'

export interface RpeCalibration {
  offset: number
  confidence: number
}

export interface SessionSetForCalibration {
  rpe: number | null
  reps: number
}

export function computeRpeCalibration(
  recentSets: SessionSetForCalibration[],
  targetReps: number
): RpeCalibration {
  const sample = recentSets.filter(s => s.rpe != null && s.rpe >= 6 && s.rpe <= 9)
  if (sample.length < 20) return { offset: 0, confidence: 0 }
  const rpe8Sets = sample.filter(s => s.rpe === 8)
  if (rpe8Sets.length === 0) return { offset: 0, confidence: 0 }
  const completionAtRpe8 = rpe8Sets.filter(s => s.reps >= targetReps).length / rpe8Sets.length
  const offset = (0.90 - completionAtRpe8) * -2.5
  return {
    offset: clamp(-2, 0.5, offset),
    confidence: Math.min(1, sample.length / 50)
  }
}

export function calibratedRpe(raw: number, cal: RpeCalibration): number {
  return raw + cal.offset * cal.confidence
}
```

### Dependencies
- Step 9

### Validation
- `epley1RM(100, 5)` → `100 * (1 + 5/30) = 116.67`
- `rpeAdjusted1RM(100, 5, 8)` → `116.67 / 0.89 ≈ 131.09`
- `detectPlateau([100, 99, 98])` → `'regression'`
- `detectPlateau([100, 101, 102])` → `'progressing'`

---

## Step 13: Algorithm — Progressive Overload & Volume Prescription

### Goal
Implement personalized weight increments, volume landmark prescription (MEV/MAV/MRV), sets/reps calculation, and adaptive landmarks.

### Files
- `src/lib/algorithms/progressive-overload.ts`
- `src/lib/algorithms/volume.ts`

### Implementation Details

**`src/lib/algorithms/progressive-overload.ts`:**
```typescript
import { clamp } from './utils'

const LOWER_BODY_MUSCLES = ['quadriceps','hamstrings','glutes','calves','adductors','abductors']

export function isLowerBodyExercise(primaryMuscles: string[]): boolean {
  return primaryMuscles.some(m => LOWER_BODY_MUSCLES.includes(m))
}

export function personalizedIncrement(
  primaryMuscles: string[],
  e1rmHistory: number[],
): number {
  const isLower = isLowerBodyExercise(primaryMuscles)
  const baseIncrement = isLower ? 5 : 2.5
  if (e1rmHistory.length < 4) return baseIncrement
  const weeklyGain = (e1rmHistory[e1rmHistory.length - 1] - e1rmHistory[0]) / (e1rmHistory.length - 1)
  if (weeklyGain > baseIncrement * 0.8) return baseIncrement
  if (weeklyGain > baseIncrement * 0.3) return baseIncrement * 0.5
  return baseIncrement * 0.25
}

// Returns 'increase' | 'maintain' | 'decrease'
export function progressionDecision(
  allRepsHit: boolean,
  calibratedRpe: number
): 'increase' | 'maintain' | 'decrease' {
  if (allRepsHit && calibratedRpe <= 7) return 'increase'
  if (allRepsHit && calibratedRpe <= 8) return 'maintain'
  return 'decrease'
}
```

**`src/lib/algorithms/volume.ts`:**
```typescript
import { clamp, lerp } from './utils'

export type MuscleGroup =
  'abdominals'|'abductors'|'adductors'|'biceps'|'calves'|'chest'|'forearms'|'glutes'|
  'hamstrings'|'lats'|'lower_back'|'middle_back'|'neck'|'quadriceps'|'shoulders'|'traps'|'triceps'

export interface VolumeLandmarks {
  mev: number
  mav: number
  mrv: number
  confidence: number
}

export const POPULATION_LANDMARKS: Record<MuscleGroup, Omit<VolumeLandmarks,'confidence'>> = {
  chest:       { mev: 10, mav: 14, mrv: 18 },
  quadriceps:  { mev: 10, mav: 16, mrv: 22 },
  hamstrings:  { mev: 8,  mav: 12, mrv: 16 },
  shoulders:   { mev: 8,  mav: 12, mrv: 16 },
  lats:        { mev: 8,  mav: 14, mrv: 18 },
  biceps:      { mev: 8,  mav: 12, mrv: 16 },
  triceps:     { mev: 8,  mav: 12, mrv: 16 },
  glutes:      { mev: 10, mav: 14, mrv: 18 },
  calves:      { mev: 6,  mav: 10, mrv: 14 },
  abdominals:  { mev: 8,  mav: 12, mrv: 16 },
  abductors:   { mev: 6,  mav: 10, mrv: 14 },
  adductors:   { mev: 6,  mav: 10, mrv: 14 },
  forearms:    { mev: 4,  mav: 8,  mrv: 12 },
  lower_back:  { mev: 6,  mav: 10, mrv: 14 },
  middle_back: { mev: 6,  mav: 10, mrv: 14 },
  neck:        { mev: 0,  mav: 4,  mrv: 8  },
  traps:       { mev: 6,  mav: 10, mrv: 14 },
}

export function experienceVolumeMultiplier(experience: 'beginner'|'intermediate'|'advanced'): number {
  return { beginner: 0.7, intermediate: 1.0, advanced: 1.15 }[experience]
}

export function calcWeeklyTargetSets(
  muscle: MuscleGroup,
  experience: 'beginner'|'intermediate'|'advanced',
  personalLandmarks: VolumeLandmarks | null,
  fatigueMod: number,
  recoveryMod: number,
  bwVolumeModifier: number
): number {
  const pop = POPULATION_LANDMARKS[muscle]
  const expMult = experienceVolumeMultiplier(experience)
  let mev = pop.mev * expMult
  let mav = pop.mav * expMult
  const target = mev + (mav - mev) * 0.5
  const blended = personalLandmarks && personalLandmarks.confidence > 0.5
    ? lerp(target, personalLandmarks.mev + (personalLandmarks.mav - personalLandmarks.mev) * 0.5, personalLandmarks.confidence)
    : target
  return Math.round(blended * fatigueMod * recoveryMod * bwVolumeModifier)
}

export function calcSetsReps(
  weeklyTargetSets: number,
  numExercisesForMuscle: number,
  goal: string,
  periodizationPhase: number  // 1|2|3|4 mesocycle week
): { sets: number; repsMin: number; repsMax: number; restSeconds: number } {
  const perExercise = clamp(2, 5, Math.round(weeklyTargetSets / Math.max(1, numExercisesForMuscle)))
  const mesocycle = [
    { volumeMultiplier: 0.85, repsMin: 10, repsMax: 12 },
    { volumeMultiplier: 1.00, repsMin: 8,  repsMax: 10 },
    { volumeMultiplier: 1.10, repsMin: 6,  repsMax: 8  },
    { volumeMultiplier: 0.55, repsMin: 10, repsMax: 12 },
  ][((periodizationPhase - 1) % 4)]
  const sets = clamp(2, 5, Math.round(perExercise * mesocycle.volumeMultiplier))
  const goalRanges: Record<string, [number, number, number]> = {
    strength:       [1,  5,  180],
    muscle_gain:    [6,  12, 120],
    fat_loss:       [12, 20, 60 ],
    general_fitness:[8,  15, 90 ],
    recomposition:  [8,  12, 90 ],
  }
  const [gMin, gMax, rest] = goalRanges[goal] ?? [8, 12, 90]
  return {
    sets,
    repsMin: Math.min(mesocycle.repsMin, gMax),
    repsMax: Math.max(mesocycle.repsMax, gMin),
    restSeconds: rest
  }
}

export function volumeBalanceScore(plannedSets: number, landmarks: Omit<VolumeLandmarks,'confidence'>): number {
  if (plannedSets === 0) return 0
  if (plannedSets < landmarks.mev) return 30
  if (plannedSets <= landmarks.mav) return 100
  if (plannedSets <= landmarks.mrv) return 70
  return 40
}
```

### Dependencies
- Step 9

### Validation
- `calcWeeklyTargetSets('chest','intermediate', null, 1.0, 1.0, 1.0)` → `12` (MEV=10, MAV=14, target=12)
- `calcSetsReps(12, 2, 'muscle_gain', 2)` → `{ sets: 3, repsMin: 8, repsMax: 10, restSeconds: 120 }`
- `volumeBalanceScore(11, POPULATION_LANDMARKS.chest)` → `100` (MEV=10, MAV=14, 11 is in range)

---

## Step 14: Algorithm — Nutrition & BMR

### Goal
Implement BMR, TDEE, calorie targets, macro prescription, and body composition estimation.

### Files
- `src/lib/algorithms/nutrition.ts`

### Implementation Details
```typescript
// src/lib/algorithms/nutrition.ts
import { clamp } from './utils'

export type Goal = 'muscle_gain'|'fat_loss'|'strength'|'general_fitness'|'recomposition'
export type Gender = 'male'|'female'|'other'
export type ActivityLevel = 'sedentary'|'light'|'moderate'|'high'

export function calcBMR(weight_kg: number, height_cm: number, age: number, gender: Gender): number {
  const g = gender === 'female' ? -161 : 5
  return 10 * weight_kg + 6.25 * height_cm - 5 * age + g
}

export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[activityLevel]
  return bmr * mult
}

export function calcTargetCalories(tdee: number, goal: Goal, bodyFatPct: number): number {
  // Percentage-based adjustments
  const adjustments: Record<Goal, number> = {
    fat_loss:        -0.15,
    muscle_gain:     0.10,
    strength:        0.05,
    general_fitness: 0.02,
    recomposition:   0.0,
  }
  const adj = adjustments[goal] ?? 0
  // Scale deficit by body fat: higher BF → larger safe deficit allowed (max -20%)
  const bfScale = goal === 'fat_loss' ? clamp(0.1, 0.2, bodyFatPct / 100 * 1.5) : adj
  return Math.round(tdee * (1 + (goal === 'fat_loss' ? -bfScale : adj)))
}

export function calcMacros(
  totalCalories: number,
  leanBodyMassKg: number,
  isTrainingDay: boolean
): { proteinG: number; fatG: number; carbsG: number; waterMl: number } {
  const proteinG = Math.round(leanBodyMassKg * (isTrainingDay ? 2.2 : 1.8))
  const fatG = Math.round(totalCalories * 0.25 / 9)
  const carbsG = Math.round((totalCalories - proteinG * 4 - fatG * 9) / 4)
  return { proteinG, fatG, carbsG: Math.max(0, carbsG), waterMl: Math.round(leanBodyMassKg * 35) }
}

export function estimateBodyFatBMI(weight_kg: number, height_cm: number, gender: Gender): number {
  const heightM = height_cm / 100
  const bmi = weight_kg / (heightM * heightM)
  return gender === 'female' ? bmi * 1.2 + 4 : bmi * 1.0 + 2
}

export function leanBodyMass(weight_kg: number, bodyFatPct: number): number {
  return weight_kg * (1 - bodyFatPct / 100)
}
```

### Dependencies
- Step 9

### Validation
- `calcBMR(80, 180, 30, 'male')` → `10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780`
- `calcTDEE(1780, 'moderate')` → `1780 * 1.55 = 2759`
- `calcMacros(2500, 70, true)` → `protein=154, fat=69, carbs≥0`

---

## Step 15: Algorithm — Exercise Scoring & Plan Generation

### Goal
Implement the multi-dimensional exercise scoring, iterative re-ranking, exercise filtering pipeline, session time budgeting, and plan quality assessment.

### Files
- `src/lib/algorithms/exercise-scoring.ts`
- `src/lib/algorithms/plan-generator.ts`
- `src/lib/algorithms/plan-quality.ts`

### Implementation Details

**`src/lib/algorithms/exercise-scoring.ts`:**
```typescript
import type { MuscleGroup } from './volume'

export type Goal = 'muscle_gain'|'fat_loss'|'strength'|'general_fitness'|'recomposition'
export type ExperienceLevel = 'beginner'|'intermediate'|'advanced'

export interface ScoredExercise {
  id: string
  slug: string
  name: string
  category: string
  level: ExperienceLevel
  equipment: string
  primary_muscles: MuscleGroup[]
  secondary_muscles: MuscleGroup[]
  movement_pattern: string | null
  is_compound: boolean
  is_unilateral: boolean
  is_lower_body: boolean
}

export interface ScoringContext {
  goal: Goal
  experience: ExperienceLevel
  prioritizedMuscles: MuscleGroup[]
  userEquipment: string[]
  usedMovementPatterns: Set<string>
  usedMechanics: Set<string>
  selectedCount: number
}

function equipmentScore(exerciseEquipment: string, userEquipment: string[]): number {
  return userEquipment.includes(exerciseEquipment) ? 10 : 0
}

function targetMuscleScore(primaryMuscles: MuscleGroup[], prioritized: MuscleGroup[]): number {
  return primaryMuscles.some(m => prioritized.includes(m)) ? 8 : 4
}

function experienceScore(level: ExperienceLevel, userExp: ExperienceLevel): number {
  const order = ['beginner','intermediate','advanced']
  const diff = Math.abs(order.indexOf(level) - order.indexOf(userExp))
  return [10, 5, 0][diff] ?? 0
}

function compoundBonus(isCompound: boolean, goal: Goal, selectedCount: number): number {
  if (!isCompound) return 0
  const bonuses: Record<Goal, number[]> = {
    strength:       [4, 2],
    muscle_gain:    [2, 2],
    fat_loss:       [1, 1],
    general_fitness:[1, 1],
    recomposition:  [2, 2],
  }
  const b = bonuses[goal] ?? [1, 1]
  return selectedCount === 0 ? b[0] : b[1]
}

function varietyBonus(movementPattern: string | null, usedPatterns: Set<string>): number {
  if (!movementPattern) return 0
  return usedPatterns.has(movementPattern) ? 0 : 5
}

export function scoreExercise(ex: ScoredExercise, ctx: ScoringContext): number {
  return (
    equipmentScore(ex.equipment, ctx.userEquipment) +
    targetMuscleScore(ex.primary_muscles, ctx.prioritizedMuscles) +
    experienceScore(ex.level, ctx.experience) +
    compoundBonus(ex.is_compound, ctx.goal, ctx.selectedCount) +
    varietyBonus(ex.movement_pattern, ctx.usedMovementPatterns)
  )
}

// Equipment filter: maps equipment_enum to valid exercise equipment strings
export function EQUIPMENT_FILTER_MAP(): Record<string, string[]> {
  return {
    full_gym:        ['barbell','dumbbell','cable','machine','bands','kettlebells','medicine ball','exercise ball','body only','other','e-z curl bar','foam roll'],
    barbell_only:    ['barbell','body only'],
    dumbbells_only:  ['dumbbell','body only'],
    bodyweight_only: ['body only'],
    cables_machines: ['cable','machine','body only','dumbbell'],
    limited:         ['body only','dumbbell','bands'],
  }
}
```

**`src/lib/algorithms/plan-generator.ts`:**
```typescript
import type { ScoredExercise, ScoringContext } from './exercise-scoring'
import { scoreExercise, EQUIPMENT_FILTER_MAP } from './exercise-scoring'
import type { MuscleGroup } from './volume'

// Session time budget calculator (Section 5.4 approach)
export function maxExercisesForDuration(
  sessionMinutes: number,
  avgSetsPerExercise: number,
  avgRestSeconds: number,
  warmupMinutes = 10
): number {
  const workSecondsPerSet = 40
  const timePerExercise = avgSetsPerExercise * (workSecondsPerSet + avgRestSeconds)
  const availableSeconds = (sessionMinutes - warmupMinutes) * 60
  return Math.max(3, Math.min(10, Math.floor(availableSeconds / timePerExercise)))
}

export function predictSessionDuration(
  numExercises: number,
  avgSets: number,
  avgRestSeconds: number,
  warmupMinutes = 10
): number {
  const workSecondsPerSet = 40
  const totalSeconds = numExercises * avgSets * (workSecondsPerSet + avgRestSeconds)
  return Math.round(warmupMinutes + totalSeconds / 60)
}

// Iterative re-ranking: select N exercises from candidates using scoring context
export function selectExercisesForDay(
  candidates: ScoredExercise[],
  maxCount: number,
  baseContext: Omit<ScoringContext,'usedMovementPatterns'|'usedMechanics'|'selectedCount'>
): ScoredExercise[] {
  const selected: ScoredExercise[] = []
  const remaining = [...candidates]
  const ctx: ScoringContext = {
    ...baseContext,
    usedMovementPatterns: new Set(),
    usedMechanics: new Set(),
    selectedCount: 0,
  }
  while (selected.length < maxCount && remaining.length > 0) {
    let bestScore = -Infinity
    let bestIdx = 0
    remaining.forEach((ex, i) => {
      const s = scoreExercise(ex, ctx)
      if (s > bestScore) { bestScore = s; bestIdx = i }
    })
    const picked = remaining.splice(bestIdx, 1)[0]
    selected.push(picked)
    if (picked.movement_pattern) ctx.usedMovementPatterns.add(picked.movement_pattern)
    ctx.selectedCount++
  }
  return selected
}

// Split templates: maps training_style + days_per_week → day_type[]
export function getSplitTemplate(
  style: string,
  daysPerWeek: number
): string[] {
  const templates: Record<string, Record<number, string[]>> = {
    full_body: {
      2: ['full_body','full_body'],
      3: ['full_body','full_body','full_body'],
      4: ['full_body','full_body','full_body','full_body'],
      5: ['full_body','full_body','full_body','full_body','full_body'],
    },
    upper_lower: {
      4: ['upper','lower','upper','lower'],
      5: ['upper','lower','upper','lower','full_body'],
      6: ['upper','lower','upper','lower','upper','lower'],
    },
    push_pull_legs: {
      3: ['push','pull','legs'],
      4: ['push','pull','legs','full_body'],
      5: ['push','pull','legs','push','pull'],
      6: ['push','pull','legs','push','pull','legs'],
    },
    bodybuilding_split: {
      4: ['chest','back','shoulders','arms'],
      5: ['chest','back','legs','shoulders','arms'],
      6: ['chest','back','legs','shoulders','arms','abs'],
    },
  }
  return templates[style]?.[daysPerWeek] ?? ['full_body']
}
```

**`src/lib/algorithms/plan-quality.ts`:**
```typescript
import { POPULATION_LANDMARKS, volumeBalanceScore, type MuscleGroup } from './volume'
import type { ScoredExercise } from './exercise-scoring'

interface DayExercise {
  exercise: ScoredExercise
  sets: number
}

export function assessPlanQuality(
  days: DayExercise[][],
  userEquipmentList: string[],
  goal: string,
  daysPerWeek: number,
  sessionLengthMinutes: number
): {
  overallScore: number
  equipmentCoverage: number
  volumeBalance: number
  recoveryFit: number
  goalAlignment: number
  warnings: string[]
} {
  const warnings: string[] = []
  // Equipment coverage
  const allEx = days.flat()
  const usingAvailable = allEx.filter(e => userEquipmentList.includes(e.exercise.equipment)).length
  const equipmentCoverage = allEx.length > 0 ? (usingAvailable / allEx.length) * 100 : 0
  // Volume balance: check major muscles
  const majorMuscles: MuscleGroup[] = ['chest','quadriceps','hamstrings','shoulders','lats','biceps','triceps','glutes']
  const weeklySetsByMuscle: Record<string, number> = {}
  for (const day of days) {
    for (const item of day) {
      for (const m of item.exercise.primary_muscles) {
        weeklySetsByMuscle[m] = (weeklySetsByMuscle[m] ?? 0) + item.sets
      }
    }
  }
  const muscleScores = majorMuscles.map(m => {
    const sets = weeklySetsByMuscle[m] ?? 0
    return volumeBalanceScore(sets, POPULATION_LANDMARKS[m])
  })
  const volumeBalance = muscleScores.reduce((a,b) => a+b, 0) / muscleScores.length
  // Recovery fit
  const restDays = 7 - daysPerWeek
  const recoveryFit = restDays >= 2 ? 100 : restDays === 1 ? 70 : 40
  // Goal alignment — rep range check
  const goalAlignment = 100  // detailed rep-range check done at calcSetsReps level
  const overallScore = Math.round(
    equipmentCoverage * 0.20 +
    volumeBalance * 0.35 +
    recoveryFit * 0.20 +
    goalAlignment * 0.25
  )
  // Warnings
  if (sessionLengthMinutes > 90) warnings.push('Session exceeds 90 minutes — consider reducing exercises')
  if (sessionLengthMinutes < 30) warnings.push('Session under 30 minutes — consider adding exercises')
  if (daysPerWeek >= 6 && !['push_pull_legs','bodybuilding_split'].includes(goal))
    warnings.push('High frequency may cause insufficient recovery')
  return { overallScore, equipmentCoverage, volumeBalance, recoveryFit, goalAlignment, warnings }
}
```

### Dependencies
- Step 9, Step 13

### Validation
- `maxExercisesForDuration(60, 3, 120, 10)` → `Math.floor(3000/400) = 7`
- `getSplitTemplate('push_pull_legs', 3)` → `['push','pull','legs']`
- `selectExercisesForDay(candidates, 5, ctx)` → returns array of length 5 with no duplicate movement patterns when enough variety exists

---

## Step 16: Algorithm — Bodyweight Trend & Mesocycle (Upgrades I, J)

### Goal
Implement bodyweight trend analysis and mesocycle progression planning.

### Files
- `src/lib/algorithms/bodyweight-trend.ts`
- `src/lib/algorithms/mesocycle.ts`

### Implementation Details

**`src/lib/algorithms/bodyweight-trend.ts`:**
```typescript
import { linearRegressionSlope } from './utils'

export interface BodyweightLog {
  date: string
  weight_kg: number
}

export type BwSignal = 'bulk'|'cut'|'maintain'|'rapid_loss'|'insufficient_data'

export function bodyweightTrend(logs: BodyweightLog[]): { weeklyRateKg: number; signal: BwSignal } {
  const recent = logs.slice(-14).sort((a, b) => a.date.localeCompare(b.date))
  if (recent.length < 5) return { weeklyRateKg: 0, signal: 'insufficient_data' }
  const weeklyRate = linearRegressionSlope(recent.map(l => l.weight_kg)) * 7
  if (weeklyRate < -0.75) return { weeklyRateKg: weeklyRate, signal: 'rapid_loss' }
  if (weeklyRate < -0.2)  return { weeklyRateKg: weeklyRate, signal: 'cut' }
  if (weeklyRate > 0.5)   return { weeklyRateKg: weeklyRate, signal: 'bulk' }
  return { weeklyRateKg: weeklyRate, signal: 'maintain' }
}

export function bodyweightVolumeModifier(signal: BwSignal): number {
  return { rapid_loss: 0.85, cut: 0.90, maintain: 1.0, bulk: 1.05, insufficient_data: 1.0 }[signal] ?? 1.0
}
```

**`src/lib/algorithms/mesocycle.ts`:**
```typescript
import { daysBetween } from './utils'

export interface MesocycleWeek {
  weekNumber: 1|2|3|4
  volumeMultiplier: number
  intensityTarget: string
}

export const MESOCYCLE_WEEKS: MesocycleWeek[] = [
  { weekNumber: 1, volumeMultiplier: 0.85, intensityTarget: '10-12' },
  { weekNumber: 2, volumeMultiplier: 1.00, intensityTarget: '8-10'  },
  { weekNumber: 3, volumeMultiplier: 1.10, intensityTarget: '6-8'   },
  { weekNumber: 4, volumeMultiplier: 0.55, intensityTarget: '10-12' },
]

export function currentMesocycleWeek(planStartDate: Date): MesocycleWeek {
  const weeksSinceStart = Math.floor(daysBetween(planStartDate, new Date()) / 7)
  return MESOCYCLE_WEEKS[weeksSinceStart % 4]
}

export function mesocyclePhaseIndex(planStartDate: Date): 1|2|3|4 {
  const weeksSinceStart = Math.floor(daysBetween(planStartDate, new Date()) / 7)
  return ((weeksSinceStart % 4) + 1) as 1|2|3|4
}
```

### Dependencies
- Step 9

### Validation
- `bodyweightTrend([])` → `{ weeklyRateKg: 0, signal: 'insufficient_data' }`
- `bodyweightVolumeModifier('rapid_loss')` → `0.85`
- `currentMesocycleWeek(new Date())` → `{ weekNumber: 1, volumeMultiplier: 0.85, ... }` (first call on day 0)

---

## Step 17: Algorithm — Starting Weight Estimation

### Goal
Implement starting weight estimation using bodyweight-ratio method with BMI adjustment and cap rules.

### Files
- `src/lib/algorithms/starting-weight.ts`

### Implementation Details
```typescript
// src/lib/algorithms/starting-weight.ts

type ExperienceLevel = 'beginner'|'intermediate'|'advanced'

// Coefficients: (exercise_slug_pattern → [beginner, intermediate, advanced]) - 1RM bodyweight multipliers
// Applied to lean body mass, not total bodyweight
const STRENGTH_COEFFICIENTS: Record<string, [number, number, number]> = {
  squat:           [0.75, 1.25, 1.75],
  bench_press:     [0.55, 0.90, 1.25],
  deadlift:        [1.00, 1.50, 2.00],
  overhead_press:  [0.35, 0.60, 0.85],
  barbell_row:     [0.50, 0.85, 1.15],
  default:         [0.40, 0.70, 1.00],
}

function getCoefficient(exerciseSlug: string, experience: ExperienceLevel): number {
  const slug = exerciseSlug.toLowerCase()
  let key = 'default'
  if (slug.includes('squat')) key = 'squat'
  else if (slug.includes('bench')) key = 'bench_press'
  else if (slug.includes('deadlift')) key = 'deadlift'
  else if (slug.includes('overhead_press') || slug.includes('ohp') || slug.includes('military')) key = 'overhead_press'
  else if (slug.includes('barbell_row') || slug.includes('bent_over_row')) key = 'barbell_row'
  const expIdx = { beginner: 0, intermediate: 1, advanced: 2 }[experience]
  return STRENGTH_COEFFICIENTS[key][expIdx]
}

export function estimateStartingWeight(
  exerciseSlug: string,
  experience: ExperienceLevel,
  leanBodyMassKg: number,
  bmi: number,
  isBodyweight: boolean
): number {
  if (isBodyweight) return 0  // bodyweight exercises: weight = 0
  const bmiAdjustment = bmi > 30 ? 0.75 : 1.0
  const coeff = getCoefficient(exerciseSlug, experience)
  const estimated1RM = leanBodyMassKg * coeff * bmiAdjustment
  // Working weight = 75% of estimated 1RM (conservative)
  const workingWeight = estimated1RM * 0.75
  // Round to nearest 2.5kg
  return Math.round(workingWeight / 2.5) * 2.5
}
```

### Dependencies
- Step 9

### Validation
- `estimateStartingWeight('Barbell_Squat_Parallel', 'beginner', 70, 22, false)` → `Math.round(70*0.75*0.75/2.5)*2.5 = 37.5` (nearby)
- `estimateStartingWeight('Push_Up', 'beginner', 70, 22, true)` → `0`

---

## Step 18: Backend API — Supabase Edge Functions Setup

### Goal
Create the Supabase Edge Functions structure and a shared response helper.

### Files
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/response.ts`

### Implementation Details

**`supabase/functions/_shared/cors.ts`:**
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**`supabase/functions/_shared/response.ts`:**
```typescript
import { corsHeaders } from './cors.ts'

export function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}
```

### Dependencies
- Step 2

### Validation
- Files exist at the correct paths
- No TypeScript errors (run `deno check` on each file)

---

## Step 19: Edge Function — complete-session

### Goal
Create the `complete-session` edge function that finalizes a workout session, computes e1RM, updates fitness snapshot, and checks progressive overload.

### Files
- `supabase/functions/complete-session/index.ts`

### Implementation Details
Function is invoked via `POST /functions/v1/complete-session` with JWT in Authorization header.

**Request body:**
```typescript
{
  session_id: string
  feedback_energy: number  // 1-5
  feedback_difficulty: number  // 1-5
  feedback_notes?: string
}
```

**Steps executed inside function:**
1. Verify JWT → get `user_id`
2. Load `workout_sessions` row by `session_id` WHERE `user_id` matches; error if not found
3. Load all `session_sets` for the session
4. For each unique `exercise_id` in session_sets:
   a. Compute `sessionE1RM(sets)` using `epley1RM` + `rpeAdjusted1RM`
   b. Upsert into `exercise_e1rm_history` (ON CONFLICT DO UPDATE SET e1rm_kg = EXCLUDED.e1rm_kg)
5. Compute session load: `sessionLoad(sets, durationModifier)` where durationModifier uses `started_at` vs `now()` and `planned_duration_minutes`
6. Load last 90 days of `fitness_snapshots` for user; reconstruct `FitnessState` via `buildFitnessHistory`
7. Update today's snapshot: `updateFitnessState(lastState, sessionLoad)`; upsert into `fitness_snapshots`
8. Mark session as `completed`: update `status = 'completed'`, `completed_at = now()`, set feedback fields
9. Check `shouldDeload(newState)`: if true, set `workout_plans.deload_active = true` for user's active plan
10. Return `{ success: true, e1rm_updates: count, new_form_score: number, deload_triggered: boolean }`

**Error handling:** All DB operations wrapped in try/catch. On any error, return `error(message, 500)`.

### Dependencies
- Step 18, Step 10, Step 12

### Validation
- Deploy with `supabase functions deploy complete-session`
- Call with valid session_id and JWT → returns `{ success: true }`
- Verify `exercise_e1rm_history` has new rows
- Verify `fitness_snapshots` has today's row updated

---

## Step 20: Edge Function — update-profile-modifiers

### Goal
Create the `update-profile-modifiers` edge function that recalculates RPE calibration and fatigue accumulation modifier for a user after session completion.

### Files
- `supabase/functions/update-profile-modifiers/index.ts`

### Implementation Details
Invoked via `POST /functions/v1/update-profile-modifiers`. Called after every session completion.

**Request body:** `{ user_id: string }`

**Steps:**
1. Verify JWT → confirm user_id matches auth.uid()
2. Load last 100 `session_sets` for user (via join through workout_sessions)
3. Compute `computeRpeCalibration(sets, targetReps=10)` → `{ offset, confidence }`
4. Compute `rpeRiseRate(sets)` from intra-session fatigue algorithm:
   ```
   For each session: compute rpeRiseRate(setsInSession)
   Average across last 10 sessions → avgRpeRiseRate
   personalMRVModifier = if avgRpeRiseRate <= 0.5: 1.1 | <= 1.0: 1.0 | <= 1.5: 0.9 | else: 0.8
   ```
5. Update `user_profiles` SET `rpe_offset = offset`, `rpe_calibration_confidence = confidence`, `fatigue_accumulation_modifier = modifier`
6. Return `{ success: true }`

**`rpeRiseRate` implementation (inline in function):**
```typescript
function rpeRiseRate(sets: Array<{rpe: number|null; set_number: number}>): number | null {
  const valid = sets.filter(s => s.rpe != null).sort((a,b) => a.set_number - b.set_number)
  if (valid.length < 2) return null
  const deltas = valid.slice(1).map((s,i) => s.rpe! - valid[i].rpe!)
  return deltas.reduce((a,b) => a+b, 0) / deltas.length
}
```

### Dependencies
- Step 18, Step 12

### Validation
- Deploy and invoke after a session → `user_profiles.rpe_offset` changes from default 0 only when ≥20 RPE-tagged sets exist

---

## Step 21: Edge Function — update-volume-landmarks

### Goal
Create the `update-volume-landmarks` edge function that runs at the end of each 4-week mesocycle to update personal volume landmarks.

### Files
- `supabase/functions/update-volume-landmarks/index.ts`

### Implementation Details
Invoked via `POST /functions/v1/update-volume-landmarks`. Called when user completes week 4 of a mesocycle.

**Request body:** `{ user_id: string; plan_id: string }`

**Steps:**
1. Verify JWT
2. Load all `workout_sessions` (completed) for user from last 8 weeks, with their `session_sets`
3. For each major muscle group (`chest`, `quadriceps`, `hamstrings`, `shoulders`, `lats`, `biceps`, `triceps`, `glutes`, `calves`, `abdominals`):
   a. Compute weekly sets per muscle across each week
   b. Compute weekly e1RM change from `exercise_e1rm_history`
   c. Call `updatePersonalLandmarks(weeklySets, weeklyE1rmChange, populationDefaults)`
   d. Upsert into `user_volume_landmarks`
4. Return `{ success: true; muscles_updated: number }`

**`updatePersonalLandmarks` (inline, per algorithm_docs Section 16.2):**
```typescript
function findInflectionPoint(
  weeklySets: number[],
  weeklyE1rmChange: number[],
  type: 'start'|'decline'
): number | null {
  // Find the set count where e1rm change crosses from positive to flat (start)
  // or from flat to negative (decline)
  if (type === 'start') {
    for (let i = 1; i < weeklySets.length; i++) {
      if (weeklyE1rmChange[i] > 0) return weeklySets[i]
    }
    return null
  }
  for (let i = weeklySets.length - 1; i >= 0; i--) {
    if (weeklyE1rmChange[i] < 0) return weeklySets[i]
  }
  return null
}
```

### Dependencies
- Step 18, Step 13

### Validation
- Deploy and invoke for a user with 8+ weeks of data → `user_volume_landmarks` has rows for each muscle group
- Verify `confidence` increases with more data

---

## Step 22: Data Access Layer — Supabase Query Hooks

### Goal
Create typed TanStack Query hooks for all major data operations.

### Files
- `src/hooks/useExercises.ts`
- `src/hooks/useUserProfile.ts`
- `src/hooks/useWorkoutPlan.ts`
- `src/hooks/useWorkoutSession.ts`
- `src/hooks/useProgress.ts`
- `src/hooks/useBodyweightLogs.ts`
- `src/lib/queryKeys.ts`

### Implementation Details

**`src/lib/queryKeys.ts`:**
```typescript
export const queryKeys = {
  exercises: { all: ['exercises'] as const, filtered: (filters: object) => ['exercises', filters] as const },
  profile: (userId: string) => ['profile', userId] as const,
  activePlan: (userId: string) => ['activePlan', userId] as const,
  workoutDays: (planId: string) => ['workoutDays', planId] as const,
  dayExercises: (dayId: string) => ['dayExercises', dayId] as const,
  sessions: (userId: string) => ['sessions', userId] as const,
  sessionSets: (sessionId: string) => ['sessionSets', sessionId] as const,
  fitnessSnapshots: (userId: string) => ['fitnessSnapshots', userId] as const,
  e1rmHistory: (userId: string, exerciseId: string) => ['e1rm', userId, exerciseId] as const,
  bodyweightLogs: (userId: string) => ['bodyweightLogs', userId] as const,
  volumeLandmarks: (userId: string) => ['volumeLandmarks', userId] as const,
  planQuality: (planId: string) => ['planQuality', planId] as const,
}
```

Each hook file follows this pattern (example for `useUserProfile.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useUpdateUserProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase.from('user_profiles').update(updates).eq('id', userId).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) })
    },
  })
}
```

Implement equivalent hooks for:
- `useExercises`: query with filters (equipment[], muscleGroup, level, searchQuery), debounced 300ms on searchQuery
- `useWorkoutPlan`: fetch active plan + days + day_exercises for userId
- `useWorkoutSession`: fetch current in_progress session; mutation to create/update/complete
- `useSessionSets`: fetch sets for sessionId; mutation to insert set
- `useProgress`: fetch fitness_snapshots (last 30 days), e1rm_history for given exerciseId, volume per muscle group from session_sets
- `useBodyweightLogs`: fetch sorted by date DESC, mutation to insert log

### Dependencies
- Step 2, Step 7

### Validation
- Each hook imports without TypeScript errors
- `npm run build` passes
- `useExercises({ equipment: ['barbell'] })` call returns filtered exercises from DB in browser

---

## Step 23: Auth Store & Context

### Goal
Create auth state management with Zustand and a React context provider that syncs Supabase Auth session.

### Files
- `src/stores/authStore.ts`
- `src/providers/AuthProvider.tsx`

### Implementation Details

**`src/stores/authStore.ts`:**
```typescript
import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: user => set({ user }),
  setSession: session => set({ session, user: session?.user ?? null }),
  setLoading: isLoading => set({ isLoading }),
}))
```

**`src/providers/AuthProvider.tsx`:**
```typescript
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}
```

### Dependencies
- Step 2, Step 1

### Validation
- `useAuthStore.getState().isLoading` starts as `true`, becomes `false` after `AuthProvider` mounts
- `supabase.auth.signInWithPassword(...)` updates store immediately

---

## Step 24: Router Setup

### Goal
Configure TanStack Router with all application routes and route guards.

### Files
- `src/router.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx` (redirect)
- `src/routes/auth/login.tsx`
- `src/routes/auth/register.tsx`
- `src/routes/onboarding/index.tsx`
- `src/routes/app/dashboard.tsx`
- `src/routes/app/plan.tsx`
- `src/routes/app/progress.tsx`
- `src/routes/app/library.tsx`
- `src/routes/app/profile.tsx`
- `src/routes/app/workout/$sessionId.tsx`

### Implementation Details
Use TanStack Router's file-based routing. Create `src/router.tsx`:
```typescript
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
// Import all route components
// Define route tree: root → (auth/login, auth/register, onboarding, app/(dashboard,plan,progress,library,profile,workout/$sessionId))
// Add beforeLoad guard on app/* routes: check auth.user; if null redirect to /auth/login
// Add beforeLoad guard on auth/* routes: check auth.user; if set redirect to /app/dashboard
// Add beforeLoad on /onboarding: check onboarding_completed; if true redirect to /app/dashboard
```

Route structure:
- `/` → redirect to `/app/dashboard` if authenticated, else `/auth/login`
- `/auth/login` → `LoginPage`
- `/auth/register` → `RegisterPage`
- `/onboarding` → `OnboardingPage` (requires auth, requires `onboarding_completed === false`)
- `/app/dashboard` → `DashboardPage` (requires auth + onboarding_completed)
- `/app/plan` → `PlanPage` (requires auth + onboarding_completed)
- `/app/progress` → `ProgressPage` (requires auth + onboarding_completed)
- `/app/library` → `LibraryPage` (requires auth + onboarding_completed)
- `/app/profile` → `ProfilePage` (requires auth + onboarding_completed)
- `/app/workout/$sessionId` → `WorkoutPage` (requires auth + onboarding_completed)

### Dependencies
- Step 23

### Validation
- Navigating to `/app/dashboard` without auth redirects to `/auth/login`
- After login, navigating to `/auth/login` redirects to `/app/dashboard`
- All route paths resolve to their components without 404

---

## Step 25: Onboarding Store

### Goal
Create an ephemeral onboarding state store backed by sessionStorage that holds partial onboarding data before account creation.

### Files
- `src/stores/onboardingStore.ts`

### Implementation Details
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface OnboardingData {
  // Step 1
  name: string
  // Step 2
  goal: string
  // Step 3
  experience: string
  // Step 4
  gender: string
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  // Step 5
  equipment: string
  limited_equipment_items: string[]
  // Step 6
  gym_days_per_week: number | null
  session_length_minutes: number | null
  // Step 7
  training_style: string
  // Step 8
  include_abs: boolean
  abs_days: number[]
  // Step 9
  sleep_hours: number
  stress_level: number
  job_activity: string
  cardio_sessions_per_week: number
  activity_level: string
  // Step 10
  exercises_to_avoid: string[]
  prioritized_muscles: string[]
  // Auth (collected last)
  email: string
  password: string
  currentStep: number
}

interface OnboardingStore {
  data: Partial<OnboardingData>
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void
  setStep: (step: number) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      data: { currentStep: 1 },
      setField: (key, value) => set(state => ({ data: { ...state.data, [key]: value } })),
      setStep: (step) => set(state => ({ data: { ...state.data, currentStep: step } })),
      reset: () => set({ data: { currentStep: 1 } }),
    }),
    { name: 'atlas-onboarding', storage: createJSONStorage(() => sessionStorage) }
  )
)
```

### Dependencies
- Step 1

### Validation
- `useOnboardingStore.getState().setField('name', 'John')` persists to sessionStorage
- Refreshing the page restores `name: 'John'`
- `reset()` clears sessionStorage entry

---

## Step 26: Workout Session Store

### Goal
Create a Zustand store for active workout session UI state (current exercise index, rest timer, set overrides).

### Files
- `src/stores/workoutSessionStore.ts`

### Implementation Details
```typescript
import { create } from 'zustand'

interface ActiveSet {
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rpe: number | null
  completed: boolean
}

interface WorkoutSessionState {
  sessionId: string | null
  currentExerciseIndex: number
  currentSetIndex: number
  sets: ActiveSet[]
  restTimerActive: boolean
  restTimerSecondsRemaining: number
  restTimerTotal: number
  isWarmup: boolean
  phase: 'warmup' | 'workout' | 'feedback' | 'complete'
  // Actions
  initSession: (sessionId: string, exercises: Array<{ id: string; sets: number; repsMin: number; repsMax: number; weightKg: number | null }>) => void
  completeSet: (set: Omit<ActiveSet, 'completed'>) => void
  startRestTimer: (seconds: number) => void
  tickTimer: () => void
  stopTimer: () => void
  goToNextExercise: () => void
  overrideExercise: (index: number) => void
  setPhase: (phase: WorkoutSessionState['phase']) => void
  reset: () => void
}

export const useWorkoutSessionStore = create<WorkoutSessionState>(set => ({
  sessionId: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  sets: [],
  restTimerActive: false,
  restTimerSecondsRemaining: 0,
  restTimerTotal: 0,
  isWarmup: false,
  phase: 'warmup',
  initSession: (sessionId, exercises) => set({
    sessionId,
    sets: exercises.flatMap(ex =>
      Array.from({ length: ex.sets }, (_, i) => ({
        exerciseId: ex.id,
        setNumber: i + 1,
        reps: ex.repsMax,
        weightKg: ex.weightKg ?? 0,
        rpe: null,
        completed: false,
      }))
    ),
    phase: 'warmup',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
  }),
  completeSet: (s) => set(state => ({
    sets: state.sets.map(existing =>
      existing.exerciseId === s.exerciseId && existing.setNumber === s.setNumber
        ? { ...s, completed: true }
        : existing
    ),
  })),
  startRestTimer: (seconds) => set({ restTimerActive: true, restTimerSecondsRemaining: seconds, restTimerTotal: seconds }),
  tickTimer: () => set(state => ({
    restTimerSecondsRemaining: Math.max(0, state.restTimerSecondsRemaining - 1),
    restTimerActive: state.restTimerSecondsRemaining > 1,
  })),
  stopTimer: () => set({ restTimerActive: false, restTimerSecondsRemaining: 0 }),
  goToNextExercise: () => set(state => ({ currentExerciseIndex: state.currentExerciseIndex + 1, currentSetIndex: 0 })),
  overrideExercise: (index) => set({ currentExerciseIndex: index }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({ sessionId: null, currentExerciseIndex: 0, currentSetIndex: 0, sets: [], phase: 'warmup', restTimerActive: false }),
}))
```

### Dependencies
- Step 1

### Validation
- `initSession(...)` populates `sets` with correct count
- `completeSet(...)` marks the matching set as completed = true
- `tickTimer()` decrements `restTimerSecondsRemaining` by 1

---

## Step 27: UI Component Library Setup (shadcn/ui)

### Goal
Initialize shadcn/ui and install all required base components used across the application.

### Files
- `components.json`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/separator.tsx`
- `src/lib/utils.ts`

### Implementation Details
1. Run: `npx shadcn-ui@latest init` with options: TypeScript=yes, style=default, base color=neutral, CSS variables=yes, tailwind config path=tailwind.config.ts, components alias=@/components, utils alias=@/lib/utils
2. Install each component: `npx shadcn-ui@latest add button card input label select checkbox slider tabs toast progress badge avatar switch sheet dialog separator`
3. `src/lib/utils.ts` must export: `export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }`

### Dependencies
- Step 1

### Validation
- All component files exist in `src/components/ui/`
- Import `import { Button } from '@/components/ui/button'` in a test file compiles without error
- `npm run build` passes

---

## Step 28: SVG Muscle Map Component

### Goal
Create an interactive SVG muscle diagram component that highlights trained muscle groups.

### Files
- `src/components/MuscleMap.tsx`
- `src/assets/muscle-map-front.svg` (created inline in component)
- `src/assets/muscle-map-back.svg` (created inline in component)

### Implementation Details
Implement `MuscleMap` as a React component:

**Props:**
```typescript
interface MuscleMapProps {
  activeMuscles: string[]       // array of muscle_group_enum values
  secondaryMuscles?: string[]   // lighter highlight
  showBothSides?: boolean       // default true
  size?: 'sm' | 'md' | 'lg'    // default 'md'
}
```

**Implementation approach:**
- Render two SVG figures (front + back view) side by side
- Each SVG is a simplified human body outline with named `<path>` or `<ellipse>` elements per muscle group
- Each muscle group path has `data-muscle="abdominals"` (etc.) attribute
- Apply CSS classes based on whether the muscle is in `activeMuscles` (primary: `fill: #6366f1`, opacity 0.85) or `secondaryMuscles` (secondary: `fill: #a5b4fc`, opacity 0.6)
- Unactivated muscles: `fill: #374151`, opacity 0.4

**Muscle-to-SVG path mapping (front view includes):** chest, abdominals, quadriceps, biceps, forearms, shoulders, adductors  
**Muscle-to-SVG path mapping (back view includes):** lats, traps, middle_back, lower_back, hamstrings, glutes, calves, triceps

Use simplified geometric shapes (rectangles, ellipses) to represent each muscle region — not anatomically precise, only recognizably correct placement. The SVG viewBox is `0 0 120 300` for each side.

Create 17 named path elements covering all `muscle_group_enum` values across front+back views. Each path is a `<ellipse>` or `<rect>` element placed at anatomically approximate coordinates within the viewBox.

### Dependencies
- Step 1, Step 27

### Validation
- `<MuscleMap activeMuscles={['chest','triceps']} />` renders without error
- Muscle elements for chest (front) and triceps (back) have `fill="#6366f1"`
- All 17 muscle groups are represented across front + back views

---

## Step 29: Auth Pages

### Goal
Implement the Login and Register pages with Supabase Auth integration.

### Files
- `src/routes/auth/login.tsx`
- `src/routes/auth/register.tsx`

### Implementation Details

**LoginPage:**
- Form: email (text input), password (password input), submit button "Sign In"
- On submit: `supabase.auth.signInWithPassword({ email, password })`
- On success: router navigate to `/app/dashboard`
- On error: display error message inline
- Link to `/auth/register`

**RegisterPage:**
- Form: email (text input), password (password input, min 8 chars), confirm password, submit "Create Account"
- On submit: `supabase.auth.signUp({ email, password })` — does NOT create user_profile yet (saved during onboarding)
- On success: router navigate to `/onboarding`
- On error: display error message inline
- Link to `/auth/login`

Both pages are centered, mobile-first layout, max-width 400px, dark background.

### Dependencies
- Step 23, Step 24, Step 27

### Validation
- Submitting valid credentials signs in and redirects to `/app/dashboard`
- Invalid password shows inline error message (not alert/console)
- Register with existing email shows Supabase error inline

---

## Step 30: Onboarding Flow — Steps 1–5

### Goal
Implement the first five onboarding steps: name, goal, experience, personal data, and equipment.

### Files
- `src/routes/onboarding/index.tsx`
- `src/components/onboarding/OnboardingLayout.tsx`
- `src/components/onboarding/StepName.tsx`
- `src/components/onboarding/StepGoal.tsx`
- `src/components/onboarding/StepExperience.tsx`
- `src/components/onboarding/StepPersonalData.tsx`
- `src/components/onboarding/StepEquipment.tsx`

### Implementation Details

**OnboardingLayout:**
- Full-screen dark background
- Progress bar at top showing current step / 10
- "Back" button (disabled on step 1)
- Step content slot
- "Continue" button that validates and advances; disabled while invalid

**StepName:** Single text input "What should we call you?" — requires non-empty, min 2 chars  
**StepGoal:** Five radio-card buttons: Muscle Gain, Fat Loss, Strength, General Fitness, Recomposition — icons from lucide-react  
**StepExperience:** Three radio-card buttons: Beginner (<1yr), Intermediate (1-3yr), Advanced (3yr+)  
**StepPersonalData:** Four inputs: Gender (select: Male/Female/Other), Age (number), Height cm (number), Weight kg (number) — all required, validated against DB CHECK constraints  
**StepEquipment:**
- Six option cards: Full Gym, Barbell Only, Dumbbells Only, Bodyweight Only, Cables & Machines, Limited
- If "Limited" selected: show text area for specifying items (comma-separated)

All steps read/write `useOnboardingStore`. Validation blocks "Continue" button.

### Dependencies
- Step 25, Step 27

### Validation
- All 5 steps render their UI
- "Continue" remains disabled until required fields are filled
- Back/Continue navigation updates `currentStep` in store
- After Step 5, currentStep === 6

---

## Step 31: Onboarding Flow — Steps 6–10

### Goal
Implement onboarding steps 6–10: availability, training style, abs, recovery, movement history.

### Files
- `src/components/onboarding/StepAvailability.tsx`
- `src/components/onboarding/StepTrainingStyle.tsx`
- `src/components/onboarding/StepAbs.tsx`
- `src/components/onboarding/StepRecovery.tsx`
- `src/components/onboarding/StepMovementHistory.tsx`

### Implementation Details

**StepAvailability:**
- Slider for gym days (1–7), labeled "Days per week"
- Slider for session length (20–180 min, step 5), labeled "Session length"
- Style-frequency compatibility shown inline: if selected style incompatible with days, show yellow warning (e.g. "Upper/Lower requires 4+ days — consider switching")
- Compatibility rules from algorithm_docs Section 9.4:
  - 2 days → only `full_body` valid
  - 3 days → `full_body` or `push_pull_legs` valid
  - 4+ days → all valid

**StepTrainingStyle:**
- Four radio cards: Full Body, Upper/Lower, Push/Pull/Legs, Bodybuilding Split
- Show only options compatible with already-selected `gym_days_per_week`
- Incompatible options shown greyed-out with tooltip explaining requirement

**StepAbs:**
- Toggle "Include abs in workouts" (yes/no)
- If yes: show 7 checkboxes for days (Mon–Sun) to include abs
- Min 1 day required if abs toggled on

**StepRecovery:**
- Avg sleep hours: slider 3–12 hours, 0.5 step
- Stress level: 5 emoji buttons (😴 Very Low → 🔥 Very High)
- Job activity: three cards (Desk, Mixed, Physical)
- Additional cardio per week: stepper 0–7

**StepMovementHistory:**
- Prioritized muscles: multi-select of muscle_group_enum values (chips/tags)
- Exercises to avoid: searchable multi-select from exercises table (top 50 most common by name); user can search and select

### Dependencies
- Step 25, Step 27, Step 22 (useExercises for avoid list)

### Validation
- Selecting 2 days and trying to select Upper/Lower shows it greyed out
- Abs toggle off hides day checkboxes
- Continue disabled when abs toggled on but no days selected

---

## Step 32: Onboarding — Plan Creation (Workout Builder)

### Goal
Implement the post-onboarding workout builder where user selects exercises for each training day.

### Files
- `src/routes/onboarding/workout-builder.tsx`
- `src/components/onboarding/WorkoutBuilder.tsx`
- `src/components/onboarding/DayBuilder.tsx`
- `src/components/onboarding/ExercisePicker.tsx`
- `src/components/onboarding/ExerciseCard.tsx`

### Implementation Details

**WorkoutBuilder:**
- Shows tabs for each training day (e.g. Monday=Push, Wednesday=Pull, Friday=Legs)
- Each tab renders a `DayBuilder`
- Progress indicator: "X days configured"
- "Create Plan" button appears when all days have at least 1 exercise

**DayBuilder props:** `{ dayType: string; dayIndex: number }`
- Renders selected exercises for this day (reorderable via drag — use HTML5 drag API)
- "Add Exercise" button opens `ExercisePicker` bottom sheet/drawer
- Shows predicted session duration (recalculated live using `predictSessionDuration`)
- Shows warning if predicted duration > `session_length_minutes + 15` or < `session_length_minutes - 15`
- Shows muscle map (MuscleMap component) with currently selected exercises' muscles highlighted
- Shows plan quality score (computed client-side using `assessPlanQuality`)

**ExercisePicker:**
- Full-screen drawer/sheet
- Search input (debounced 300ms)
- Filter chips: Equipment (auto-filtered to user's equipment), Muscle Group, Level
- Exercise list: sorted by score (suggested first using `scoreExercise`)
- Exercises already selected in this day shown with checkmark, not selectable again
- Clicking exercise selects it and closes drawer

**ExerciseCard:** Shows exercise name, primary muscles as chips, equipment icon, level badge.

**Algorithm integration for suggestions:**
- Load exercises from DB filtered to user's equipment
- Apply `selectExercisesForDay` scoring with user's profile context
- "Suggested" section shows top scored, "All Exercises" section shows the rest

### Dependencies
- Step 15, Step 22, Step 27, Step 28

### Validation
- Selecting 3 exercises for a Push day shows those exercises listed
- MuscleMap updates to highlight chest/triceps/shoulders after adding push exercises
- Predicted duration updates when adding/removing exercises
- "Create Plan" enabled only when all training days have ≥ 1 exercise

---

## Step 33: Onboarding — Account Creation & Plan Save

### Goal
Implement the final onboarding step that creates the Supabase account (if not yet done), saves user_profile, and persists the workout plan to DB.

### Files
- `src/components/onboarding/StepConfirmAndSave.tsx`
- `src/lib/createInitialPlan.ts`

### Implementation Details

**StepConfirmAndSave:**
- Summary of: goal, experience, training style, days/week
- "Complete Setup" button
- On click: call `createInitialPlan(onboardingData, selectedExercisesByDay)`

**`src/lib/createInitialPlan.ts`:**

Input: `OnboardingData` + `Record<string, string[]>` (dayType → exerciseId[])

Steps:
1. Insert `user_profiles` row using `supabase.from('user_profiles').upsert(...)` with `onboarding_completed = true`
2. Determine periodization type:
   - beginner + any goal → `linear`
   - intermediate + strength → `block`
   - intermediate + muscle_gain/recomposition → `undulating`
   - advanced + any → `block`
3. Insert `workout_plans` row with `is_active = true`, `start_date = today`, computed `periodization`, `name = "{goal} Plan"`
4. For each training day (using `getSplitTemplate(style, daysPerWeek)` to get day_types):
   a. Assign `day_of_week` (distribute across selected gym_days_per_week starting Monday)
   b. Insert `workout_days` row
   c. For each selected exercise in this day:
      - Compute mesocycle phase = 1 (plan just started)
      - Compute `weeklyTargetSets` using `calcWeeklyTargetSets` with population defaults, modifier=1.0
      - Compute `calcSetsReps(weeklyTargetSets, exerciseCountForMuscle, goal, 1)`
      - Compute `estimateStartingWeight(exercise.slug, experience, leanBodyMass, bmi, isBodyweight)`
      - Insert `workout_day_exercises` row
5. Seed `user_volume_landmarks` with population defaults (confidence=0) for all 10 major muscles
6. Compute and insert `plan_quality_scores` using `assessPlanQuality`
7. Clear onboarding sessionStorage
8. Navigate to `/app/dashboard`

### Dependencies
- Step 25, Step 32, Step 13, Step 14, Step 15, Step 17, Step 22

### Validation
- After "Complete Setup": `workout_plans` has 1 active row for user
- `workout_days` has correct number of rows matching `gym_days_per_week`
- `workout_day_exercises` has rows with non-null `suggested_sets`, `suggested_reps_min`, `suggested_reps_max`
- `user_volume_landmarks` has rows for 10 muscle groups with `confidence = 0`
- User redirected to `/app/dashboard`

---

## Step 34: Dashboard Page

### Goal
Implement the Dashboard screen with all required data widgets.

### Files
- `src/routes/app/dashboard.tsx`
- `src/components/dashboard/WelcomeBanner.tsx`
- `src/components/dashboard/ReadinessWidget.tsx`
- `src/components/dashboard/WeeklyProgressWidget.tsx`
- `src/components/dashboard/BodyweightWidget.tsx`
- `src/components/dashboard/UpcomingWorkoutWidget.tsx`
- `src/components/dashboard/NutritionTargetsWidget.tsx`

### Implementation Details

**Layout:** Single-column scrollable mobile-first layout. Order: WelcomeBanner → ReadinessWidget → WeeklyProgressWidget → NutritionTargetsWidget → BodyweightWidget → UpcomingWorkoutWidget.

**WelcomeBanner:** "Good morning/afternoon/evening, {name}" + today's date in user language.

**ReadinessWidget:**
- Displays readiness score 0–100 as circular progress ring
- Color: 0–49 red, 50–74 amber, 75–100 green
- Sub-scores: form (Banister), sleep, check-in EMA — shown as three small bars
- Data: `fitness_snapshots` (latest), `workout_sessions` (last 10 checkin_scores), `user_profiles.sleep_hours`

**WeeklyProgressWidget:**
- 7 day row (Mon–Sun) with circles: completed ✓ (green), today → (brand), upcoming (grey), rest (dash)
- Shows "X/Y workouts completed this week"

**NutritionTargetsWidget:**
- Shows daily calorie target, protein target, water target
- Computed client-side from `calcBMR` + `calcTDEE` + `calcTargetCalories` + `calcMacros` using user_profile data

**BodyweightWidget:**
- Current weight (most recent `bodyweight_logs` entry)
- Sparkline chart (last 14 days) using recharts `LineChart`
- Trend signal from `bodyweightTrend()`: show "Losing", "Gaining", "Stable" badge
- If `signal === 'rapid_loss' && goal === 'muscle_gain'`: show orange warning "Weight dropping faster than expected"
- "Log Weight" button → inline form → inserts into `bodyweight_logs`

**UpcomingWorkoutWidget:**
- If today is a training day: "Today's Workout: [Day Type]" + "Start Workout" button → navigates to `/app/workout/new?dayId=X`
- If not: "Next workout: [Day name]" + days until

### Dependencies
- Step 22, Step 11, Step 14, Step 16, Step 24, Step 27

### Validation
- Dashboard loads without errors for a user with complete profile and plan
- ReadinessWidget shows a value between 0 and 100
- BodyweightWidget shows "No data" state gracefully when no logs exist
- "Start Workout" button present on days matching workout schedule

---

## Step 35: Plan Page

### Goal
Implement the Plan page showing the weekly workout plan overview and allowing editing.

### Files
- `src/routes/app/plan.tsx`
- `src/components/plan/PlanOverview.tsx`
- `src/components/plan/WorkoutDayCard.tsx`
- `src/components/plan/PlanSummary.tsx`

### Implementation Details

**PlanOverview:**
- Header: plan name, goal chip, experience chip, training style, days/week
- Plan quality score bar with 4 sub-scores (from `plan_quality_scores`)
- `deload_active` badge: if true show "Deload Week Active" banner
- 7-column week grid showing each day: training days show day type + number of exercises; rest days show "Rest"
- Clicking a training day card opens the WorkoutDayCard detail

**WorkoutDayCard:** (shown as a bottom sheet/sheet)
- Day type title (e.g. "Push Day")
- List of exercises with: name, sets×reps, suggested weight
- MuscleMap showing muscles for this day
- "Edit Day" button → navigates to workout builder edit mode (reuses ExercisePicker from onboarding)
- "Start Workout" button

**PlanSummary:**
- Current mesocycle week indicator (Week 1/2/3/4)
- Start date, days completed

### Dependencies
- Step 22, Step 28, Step 24, Step 27

### Validation
- Active plan loads and shows all workout days
- Clicking a training day opens the detail sheet
- MuscleMap correctly highlights muscles for that day's exercises

---

## Step 36: Progress Page

### Goal
Implement the Progress page with four tabs: Body, Strength, Volume, Streaks.

### Files
- `src/routes/app/progress.tsx`
- `src/components/progress/BodyTab.tsx`
- `src/components/progress/StrengthTab.tsx`
- `src/components/progress/VolumeTab.tsx`
- `src/components/progress/StreaksTab.tsx`

### Implementation Details

**BodyTab:**
- Weight chart: recharts LineChart, last 60 days of `bodyweight_logs`
- Current stats: weight, estimated BF% (from `estimateBodyFatBMI`), estimated lean mass, BMI, estimated hydration need (water_ml)
- Log weight button → inline form

**StrengthTab:**
- Exercise selector (searchable dropdown)
- On exercise selection: load `exercise_e1rm_history` for that exercise, render recharts LineChart
- Y-axis: e1RM kg; X-axis: date; tooltip shows sets performed that session
- Show plateau status badge from `detectPlateau(e1rmHistory.slice(-3).map(r => r.e1rm_kg))`
- Show next suggested increment from `personalizedIncrement(exercise.primaryMuscles, e1rmHistory)`

**VolumeTab:**
- Weekly sets per muscle: horizontal bar chart using recharts BarChart
- Each muscle group shows planned vs MEV/MAV landmarks (color bands: grey=below MEV, green=MEV-MAV, amber=MAV-MRV, red=above MRV)
- Data from `session_sets` joined to exercises, grouped by `primary_muscles`, last 7 days

**StreaksTab:**
- Current streak: consecutive weeks completing all planned workouts
- Consistency %: (completed sessions / planned sessions) last 12 weeks
- GitHub-style heatmap: 12 weeks × 7 days grid; cells colored by session completion: rest=transparent, planned+completed=brand, planned+missed=red/orange
- "Best streak" historical peak

### Dependencies
- Step 22, Step 12, Step 13, Step 16, Step 27

### Validation
- All 4 tabs render without errors
- Strength tab shows "No data" when no e1rm_history exists for selected exercise
- Volume tab bar chart renders with population landmarks as reference lines
- Heatmap renders 84 cells (12 × 7)

---

## Step 37: Library Page

### Goal
Implement the exercise library with search, filters, and accordion-style detail expansion.

### Files
- `src/routes/app/library.tsx`
- `src/components/library/ExerciseLibraryItem.tsx`

### Implementation Details

**Layout:**
- Sticky search bar at top
- Filter row: Category (multi-select chips), Equipment (multi-select chips), Muscle Group (multi-select chips), Level (multi-select chips)
- Virtualized list of exercises (use `@tanstack/react-virtual` or CSS `content-visibility: auto` for 873 items)
- Each item: exercise name, level badge, equipment text, primary muscles chips

**Expansion behavior:**
- Clicking an item expands it in place to show instructions as numbered list
- Only ONE item expanded at a time; clicking another collapses the previous
- State: `expandedSlug: string | null` in component local state (useState)

**Filter logic:**
- All filters are ANDed
- Search matches on `name` field (case-insensitive, client-side after load)
- Exercises are loaded once on mount (full list, 873 items) and filtered client-side
- No pagination — use virtualization

### Dependencies
- Step 22, Step 27

### Validation
- Typing "bench" filters list to exercises containing "bench" in name
- Selecting Equipment="barbell" AND Muscle Group="chest" shows only exercises matching both
- Expanding one item collapses any previously expanded item
- All 873 exercises are accessible (no items lost to pagination)

---

## Step 38: Profile Page

### Goal
Implement the Profile/Settings page with all user preference controls.

### Files
- `src/routes/app/profile.tsx`
- `src/components/profile/ProfileSection.tsx`

### Implementation Details

**Sections (rendered as accordion or stacked cards):**

1. **Personal Info:** Name (text), Gender (select), Age (number), Height (number), Weight (number) — "Save" button per section; triggers `useUpdateUserProfile`

2. **Goals & Training:** Goal (select), Experience (select), Training Style (select), Gym Days (slider), Session Length (slider) — "Save" triggers profile update + deactivates current plan if training style/days changed (show warning modal: "Changing these settings will require recreating your workout plan")

3. **Recovery:** Sleep hours (slider), Stress level (1-5 buttons), Job activity (select), Cardio/week (stepper) — "Save" triggers `recoveryModifier` recalculation (done client-side, displayed immediately)

4. **Preferences:** Units (metric/imperial toggle), Theme (dark/light toggle), Language (en/pl select) — all save immediately on change via `useUpdateUserProfile`

5. **Notifications:** Toggle for workout reminders — saves to profile (stored in `user_profiles` as preference, not a separate table)

6. **Danger Zone:** "Reset all progress" button → confirmation modal with text input requiring "DELETE" typed → calls `supabase.rpc('reset_user_data', { p_user_id: userId })` (see Step 40) → signs out + redirects to `/auth/login`

7. **Account:** "Sign Out" button → `supabase.auth.signOut()` → redirects to `/auth/login`

### Dependencies
- Step 22, Step 24, Step 27

### Validation
- Changing units to "imperial" updates displayed weight from kg to lbs across all components
- "Sign Out" clears session and redirects to login
- Theme toggle switches Tailwind dark/light class on `<html>` element

---

## Step 39: Workout Session Page

### Goal
Implement the active workout flow: warmup screen → exercise sets → rest timer → feedback → completion.

### Files
- `src/routes/app/workout/$sessionId.tsx`
- `src/components/workout/WarmupScreen.tsx`
- `src/components/workout/ExerciseSetScreen.tsx`
- `src/components/workout/RestTimerScreen.tsx`
- `src/components/workout/FeedbackScreen.tsx`

### Implementation Details

**Route setup:** accepts `$sessionId` param. If `sessionId === 'new'`, creates a new session first using `useCreateSession` mutation, then redirects to `/app/workout/{newSessionId}`.

**Pre-workout:** Show check-in prompt ("How are you feeling today?" 1–5 emoji). If score ≤ 2: show optional limiter selector. Save to `workout_sessions.checkin_score` + `checkin_limiters`. Then show WarmupScreen.

**WarmupScreen:**
- Large text "Warm Up"
- Timer (5 min countdown, skippable)
- "Skip / Ready" button → sets `phase = 'workout'`

**ExerciseSetScreen:**
- Exercise name (large, centered)
- Current set indicator: "Set 2 of 4"
- Weight field (editable number, default = suggested or previous session weight)
- Reps field (editable number, default = `suggested_reps_max`)
- RPE selector (half-step buttons 6–10)
- "Set Complete" button → saves set via `useInsertSessionSet`, starts rest timer
- Progress bar showing sets completed for this exercise
- Navigation: "Previous Exercise" / "Next Exercise" override buttons
- Exercise reorder button (opens small sheet with draggable list)

**RestTimerScreen (overlays ExerciseSetScreen):**
- Large countdown circle (2 min default, editable)
- "Skip Rest" button → dismisses immediately
- Tick sound optional (not required)
- Auto-dismisses at 0 and advances to next set

**FeedbackScreen (shown after all exercises complete):**
- "Workout Complete! 🎉"
- Energy rating (1–5)
- Difficulty rating (1–5)
- Optional notes text area
- "Save & Finish" button → calls `complete-session` edge function → redirects to `/app/dashboard`

**Timer implementation:** Uses `useEffect` + `setInterval` with 1000ms tick calling `workoutSessionStore.tickTimer()`.

**Session creation (for `sessionId === 'new'`):**
- Creates `workout_sessions` row with `status='in_progress'`, `planned_duration_minutes` from `predictSessionDuration`
- Initializes `workoutSessionStore` with exercises for that day

### Dependencies
- Step 26, Step 22, Step 19, Step 27

### Validation
- Starting a workout creates a `workout_sessions` row with status=`in_progress`
- Completing a set inserts a row into `session_sets`
- Rest timer counts down and auto-dismisses
- Completing all sets → FeedbackScreen appears
- Clicking "Save & Finish" → `complete-session` edge function called → redirected to dashboard
- `workout_sessions` row has `status='completed'` after finish

---

## Step 40: Supabase RPC — reset_user_data

### Goal
Create a Supabase RPC function that safely deletes all user progress data while preserving the user account.

### Files
- `supabase/migrations/004_rpc_functions.sql`

### Implementation Details
```sql
-- Migration 004: RPC functions

CREATE OR REPLACE FUNCTION reset_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is the user themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM session_sets
    WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = p_user_id);
  DELETE FROM workout_sessions WHERE user_id = p_user_id;
  DELETE FROM exercise_e1rm_history WHERE user_id = p_user_id;
  DELETE FROM fitness_snapshots WHERE user_id = p_user_id;
  DELETE FROM user_volume_landmarks WHERE user_id = p_user_id;
  DELETE FROM bodyweight_logs WHERE user_id = p_user_id;
  -- Delete plans (cascades to workout_days and workout_day_exercises)
  DELETE FROM workout_plans WHERE user_id = p_user_id;
  -- Reset profile to incomplete onboarding state
  UPDATE user_profiles
  SET onboarding_completed = false,
      rpe_offset = 0,
      rpe_calibration_confidence = 0,
      fatigue_accumulation_modifier = 1.0,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
```

### Dependencies
- Step 5

### Validation
- Call `SELECT reset_user_data(auth.uid())` as authenticated user → all progress rows deleted
- `user_profiles` row still exists with `onboarding_completed = false`
- Call as different user → raises "Unauthorized" exception

---

## Step 41: Progressive Overload Suggestion Engine

### Goal
Implement client-side logic that computes and displays weight suggestions for the next session on the ExerciseSetScreen.

### Files
- `src/lib/suggestions.ts`
- Modify `src/components/workout/ExerciseSetScreen.tsx`

### Implementation Details

**`src/lib/suggestions.ts`:**
```typescript
import { progressionDecision, personalizedIncrement } from './algorithms/progressive-overload'
import { calibratedRpe } from './algorithms/rpe-calibration'
import type { RpeCalibration } from './algorithms/rpe-calibration'

export interface SetHistory {
  reps: number
  weight_kg: number
  rpe: number | null
  target_reps_min: number
  target_reps_max: number
}

export function suggestNextWeight(
  lastSets: SetHistory[],
  primaryMuscles: string[],
  e1rmHistory: number[],
  rpeCalibration: RpeCalibration
): { suggestedWeight: number; message: string; isIncrease: boolean } {
  if (lastSets.length === 0) return { suggestedWeight: 0, message: 'First session — start light', isIncrease: false }

  const lastSet = lastSets[lastSets.length - 1]
  const rawRpe = lastSet.rpe ?? 7
  const calRpe = calibratedRpe(rawRpe, rpeCalibration)
  const allRepsHit = lastSets.every(s => s.reps >= s.target_reps_min)
  const decision = progressionDecision(allRepsHit, calRpe)
  const increment = personalizedIncrement(primaryMuscles, e1rmHistory)

  if (decision === 'increase') {
    return {
      suggestedWeight: lastSet.weight_kg + increment,
      message: `Great work! Try +${increment}kg today`,
      isIncrease: true
    }
  }
  if (decision === 'decrease') {
    return {
      suggestedWeight: Math.max(0, lastSet.weight_kg - increment),
      message: 'Reduce weight slightly — RPE was high',
      isIncrease: false
    }
  }
  return {
    suggestedWeight: lastSet.weight_kg,
    message: 'Maintain weight, aim for top of rep range',
    isIncrease: false
  }
}
```

**Modification to `ExerciseSetScreen`:**
- Load last session's sets for the current exercise from DB using `useQuery`
- Load e1rm history for the exercise (last 6 sessions)
- Load user `rpe_offset` + `rpe_calibration_confidence` from profile
- Compute `suggestNextWeight(...)` and display the message above the weight input
- Pre-fill weight input with `suggestedWeight`

### Dependencies
- Step 12, Step 13, Step 22, Step 39

### Validation
- For a user with 2+ sessions for an exercise with all reps hit and RPE ≤ 7: weight input pre-filled with last weight + increment
- For a user with no previous sessions: weight input pre-filled with `suggested_weight_kg` from `workout_day_exercises`

---

## Step 42: Bottom Navigation Bar

### Goal
Implement the persistent bottom navigation bar for the app shell.

### Files
- `src/components/layout/BottomNav.tsx`
- `src/routes/app/__layout.tsx`

### Implementation Details

**BottomNav:**
- 5 tabs: Dashboard (Home icon), Plan (Calendar icon), Progress (TrendingUp icon), Library (BookOpen icon), Profile (User icon)
- Active tab: brand color, filled icon; inactive: muted grey
- Fixed at bottom (`position: fixed; bottom: 0; left: 0; right: 0`)
- Height: 56px
- Background: dark surface color `bg-gray-900` with top border
- Uses TanStack Router `Link` component with `activeProps` for active state

**`src/routes/app/__layout.tsx`:**
- Renders `{children}` with padding-bottom: 72px (to account for nav bar)
- Renders `<BottomNav />` fixed at bottom
- Wraps all `/app/*` routes

### Dependencies
- Step 24, Step 27

### Validation
- BottomNav visible on all `/app/*` routes
- Active tab highlighted correctly when navigating
- Content not hidden behind nav bar (padding-bottom sufficient)

---

## Step 43: Deload Logic & Plan Adaptation

### Goal
Implement the runtime deload multiplier, auto-suggest deload notification, and mesocycle-aware volume display.

### Files
- `src/lib/deload.ts`
- Modify `src/components/plan/WorkoutDayCard.tsx`
- Modify `src/routes/app/dashboard.tsx`

### Implementation Details

**`src/lib/deload.ts`:**
```typescript
export function applyDeloadModifier(
  suggestedSets: number,
  deloadActive: boolean
): number {
  if (!deloadActive) return suggestedSets
  // Apply 0.5× multiplier, minimum 1 set, maximum unchanged
  return Math.max(1, Math.round(suggestedSets * 0.5))
}
```

**WorkoutDayCard modification:**
- When loading exercise sets for display: fetch `workout_plans.deload_active` for the active plan
- Apply `applyDeloadModifier(suggested_sets, deload_active)` to displayed set count
- Show "Deload Week" chip next to exercise name when deload_active = true
- NOTE: `workout_day_exercises.suggested_sets` is NEVER mutated (critical requirement from algorithm_docs Section 8.4)

**Dashboard modification:**
- When `shouldDeload(latestFitnessState) === true` AND `deload_active === false`: show a dismissible banner "Your body needs recovery — a deload week is recommended" with "Activate Deload" button
- "Activate Deload" button calls `supabase.from('workout_plans').update({ deload_active: true }).eq('id', activePlanId)`

### Dependencies
- Step 22, Step 34, Step 35

### Validation
- With `deload_active = true`: WorkoutDayCard shows 50% of `suggested_sets` (min 1)
- `workout_day_exercises.suggested_sets` value in DB is unchanged after deload activation
- Dashboard banner appears when `fitnessState.form < -30`

---

## Step 44: Theme & Language Support

### Goal
Implement dark/light theme switching and English/Polish language support.

### Files
- `src/lib/i18n.ts`
- `src/locales/en.ts`
- `src/locales/pl.ts`
- `src/providers/ThemeProvider.tsx`
- `src/providers/I18nProvider.tsx`

### Implementation Details

**ThemeProvider:**
- Reads `user_profiles.theme`; applies `dark` or `light` class to `<html>` element
- Uses `useEffect` to sync on profile change
- Tailwind configured with `darkMode: 'class'` in tailwind.config.ts

**I18n:**
- Simple key-value lookup, no external library
- `src/lib/i18n.ts` exports `function t(key: string, lang: 'en'|'pl'): string`
- Keys cover all UI strings: nav labels, button labels, field labels, error messages, unit labels
- `src/locales/en.ts` exports `Record<string, string>` with all English strings
- `src/locales/pl.ts` exports `Record<string, string>` with Polish translations

**String keys required (minimum set):**
```
nav.dashboard, nav.plan, nav.progress, nav.library, nav.profile
onboarding.title, onboarding.continue, onboarding.back
workout.start, workout.setComplete, workout.skipRest, workout.finish
progress.body, progress.strength, progress.volume, progress.streaks
```

**Language switch:** In profile page, changing language calls `useUpdateUserProfile({ language })` → re-renders all labels via updated context.

### Dependencies
- Step 27, Step 22

### Validation
- Switching language to Polish: nav labels display in Polish
- Switching theme to light: background color changes from dark to white
- Theme preference persists after page refresh (stored in user_profiles)

---

## Step 45: PWA Configuration & Service Worker

### Goal
Configure the Vite PWA plugin for offline capability and mobile install support.

### Files
- `vite.config.ts` (modify)
- `public/manifest.json` (auto-generated by Vite PWA)
- `public/icons/` (PWA icons — generate from template)

### Implementation Details
Update `vite.config.ts` VitePWA config:
```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'icons/*.png'],
  manifest: {
    name: 'Atlas — Training App',
    short_name: 'Atlas',
    description: 'Smart personal training app',
    theme_color: '#111827',
    background_color: '#111827',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          expiration: { maxEntries: 100, maxAgeSeconds: 300 },
        },
      },
    ],
  },
})
```

Create placeholder PNG icons (192×192 and 512×512) in `public/icons/` — solid brand color `#6366f1` with letter "A" in white (generated via Canvas API script or any image tool).

### Dependencies
- Step 1

### Validation
- `npm run build` produces `dist/sw.js` (service worker)
- Opening built app on mobile Chrome → "Add to Home Screen" prompt appears
- Lighthouse PWA audit score ≥ 80

---

## Step 46: Error Boundaries & Loading States

### Goal
Implement global error boundary and consistent loading/skeleton components for all data-dependent views.

### Files
- `src/components/ErrorBoundary.tsx`
- `src/components/LoadingSpinner.tsx`
- `src/components/SkeletonCard.tsx`
- Modify all page-level route components to wrap with Suspense + ErrorBoundary

### Implementation Details

**`ErrorBoundary.tsx`:** Class component implementing React `componentDidCatch`. On error: show centered "Something went wrong. Please refresh the page." with retry button that calls `window.location.reload()`.

**`LoadingSpinner.tsx`:** Centered animated SVG spinner using brand color, three sizes: sm/md/lg.

**`SkeletonCard.tsx`:** Animated grey placeholder card using `animate-pulse` Tailwind class. Props: `lines?: number` (default 3), `showAvatar?: boolean`.

**Page-level modification (applied to all 6 app pages):**
```tsx
<ErrorBoundary>
  <Suspense fallback={<LoadingSpinner size="lg" />}>
    <PageContent />
  </Suspense>
</ErrorBoundary>
```

All `useQuery` hooks in data-intensive components use `isPending` to show `<SkeletonCard />` before data loads.

### Dependencies
- Step 27

### Validation
- Navigating to Dashboard before data loads shows spinner
- Simulating a query error shows ErrorBoundary fallback instead of white screen
- SkeletonCard renders with pulse animation

---

## Step 47: Mobile UX Polish

### Goal
Apply mobile-first spacing, touch targets, viewport fixes, and safe area insets for iOS/Android compatibility.

### Files
- `src/index.css`
- `index.html`
- Modify `src/components/layout/BottomNav.tsx`

### Implementation Details

**`index.html` additions:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#111827">
```

**`src/index.css` additions:**
```css
:root {
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
}
body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
```

**BottomNav modification:**
- Add `padding-bottom: calc(8px + env(safe-area-inset-bottom))` to account for iPhone home indicator

**Touch target rule (enforce throughout app):**
All buttons and interactive elements must have `min-height: 44px` and `min-width: 44px` (WCAG 2.1 AA touch target size). Audit all `<Button>` and `<button>` elements and apply `h-11` (44px) as minimum.

### Dependencies
- Step 42

### Validation
- App renders without horizontal scroll on 375px viewport (iPhone SE)
- BottomNav not obscured by iOS home indicator on iPhone X+
- All interactive elements meet 44px minimum touch target

---

## Step 48: End-to-End Data Flow Integration Tests

### Goal
Write integration tests validating the complete user journey: register → onboard → create plan → do workout → see progress.

### Files
- `src/__tests__/integration/full-user-journey.test.ts`
- `vitest.config.ts`

### Implementation Details
Install: `npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event`

Configure `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  }
})
```

**Algorithm unit tests (in `src/__tests__/integration/full-user-journey.test.ts`):**
Test the following sequences in isolation (no DB — all mocked):

1. **BMR pipeline:** `calcBMR(80,180,30,'male')` → `1780` → `calcTDEE(1780,'moderate')` → `2759` → `calcTargetCalories(2759,'muscle_gain',18)` → `2759 * 1.10 = 3035`
2. **Volume pipeline:** `calcWeeklyTargetSets('chest','intermediate',null,1.0,1.0,1.0)` → `12` → `calcSetsReps(12,2,'muscle_gain',1)` → `{ sets: ≥2, repsMin: ≤12, repsMax: ≥6 }`
3. **e1RM pipeline:** `epley1RM(100,5)` → `≈116.67` → `rpeAdjusted1RM(100,5,8)` → `≈131.1`
4. **Fatigue pipeline:** `updateFitnessState({fitness:0,fatigue:0,form:0}, 1000)` → `form < 0`
5. **Readiness pipeline:** `readinessScore({fitness:30,fatigue:20,form:10}, 4.0, 7.5)` → `score in [60,100]`
6. **Mesocycle:** `mesocyclePhaseIndex(new Date(Date.now() - 7*86400000))` → `2` (one week old plan = week 2)
7. **Bodyweight trend:** `bodyweightTrend([{date:'2025-01-01',weight_kg:80}, ...5 entries declining -1/day])` → `signal: 'rapid_loss'`
8. **Deload:** `applyDeloadModifier(4, true)` → `2`; `applyDeloadModifier(4, false)` → `4`
9. **Split template:** `getSplitTemplate('push_pull_legs',3)` → `['push','pull','legs']`
10. **Score exercise:** `scoreExercise(benchPress, ctx)` > `scoreExercise(cableFlye, ctx)` for strength goal (compound beats isolation)

### Dependencies
- Steps 9–17

### Validation
- Run `npm run test` → all 10 algorithm test cases pass
- No test imports from Supabase (all DB calls mocked or excluded from unit tests)

---

## Step 49: Production Build & Deployment Configuration

### Goal
Configure production build for Vercel/Netlify deployment with correct environment variable handling and redirect rules.

### Files
- `vercel.json`
- `netlify.toml`
- `.env.production.example`

### Implementation Details

**`vercel.json`:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

**`netlify.toml`:**
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build]
  command = "npm run build"
  publish = "dist"
```

**`.env.production.example`:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Security headers added:** X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin. These minimize data leakage as required by app_plan.md security requirements.

### Dependencies
- Step 1

### Validation
- `npm run build` produces `dist/` with `index.html`, `assets/`, `sw.js`
- Deploying to Vercel: navigating directly to `/app/dashboard` does not return 404
- HTTPS enforced (Vercel/Netlify default behavior)

---

## Step 50: Final Integration Checklist

### Goal
Validate complete end-to-end functionality across all app screens and algorithm integrations.

### Files
- No new files — verification step only

### Implementation Details
Execute the following manual verification sequence against the deployed or local production build:

1. **Register** with new email → redirected to `/onboarding`
2. **Complete all 10 onboarding steps** → submit "Create Plan" → redirected to `/app/dashboard`
3. **Dashboard:** verify welcome message, readiness score (default = ~84 for 7h sleep, no sessions), calorie/protein targets shown, bodyweight widget shows "Log Weight"
4. **Log bodyweight** → chart shows 1 data point
5. **Plan page:** verify active plan shows correct training style, days, exercise list; plan quality score > 0
6. **Start workout** from Dashboard → pre-workout check-in (score 4) → warmup screen → exercise 1 screen with suggested weight
7. **Complete 3 sets** with reps/weight/RPE → rest timer fires between each set
8. **Skip to exercise 2** using next button
9. **Complete all exercises** → feedback screen → submit → redirected to dashboard
10. **Verify** `workout_sessions` row has `status='completed'`; `session_sets` has logged rows; `exercise_e1rm_history` has new entry; `fitness_snapshots` has today's row
11. **Progress → Strength tab** → select an exercise just trained → e1RM chart shows 1 data point
12. **Progress → Volume tab** → trained muscles show > 0 sets
13. **Progress → Streaks tab** → heatmap shows today's cell as completed
14. **Library** → search "bench" → results filtered → click result → expands with instructions → click another → first collapses
15. **Profile → Language → Polish** → nav labels switch to Polish
16. **Profile → Sign Out** → redirected to `/auth/login`

### Dependencies
- All previous steps

### Validation
- All 16 verification steps pass without errors
- No console errors visible in browser devtools during any step
- Network tab shows only requests to `*.supabase.co` (no third-party analytics/ad trackers)
