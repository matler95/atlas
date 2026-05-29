# Atlas — Full Supabase Schema Design
**Reference Document for Steps 4–5 and all backend steps.**

---

## ENUM TYPES

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

---

## TABLE: exercises

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

**Indexes:**
- `idx_exercises_equipment` ON equipment
- `idx_exercises_primary_muscles` USING GIN ON primary_muscles
- `idx_exercises_level` ON level
- `idx_exercises_category` ON category
- `idx_exercises_mechanic` ON mechanic

---

## TABLE: user_profiles

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

**Indexes:**
- `idx_user_profiles_goal` ON goal
- `idx_user_profiles_experience` ON experience

---

## TABLE: bodyweight_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| weight_kg | numeric(5,2) | NOT NULL CHECK (weight_kg > 0) |
| created_at | timestamptz | NOT NULL DEFAULT now() |

**Constraints:** UNIQUE (user_id, date)  
**Indexes:** `idx_bodyweight_logs_user_date` ON (user_id, date DESC)

---

## TABLE: workout_plans

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

**Indexes:** `idx_workout_plans_user_active` ON (user_id, is_active)

---

## TABLE: workout_days

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| plan_id | uuid | NOT NULL FK → workout_plans(id) ON DELETE CASCADE |
| day_of_week | integer | NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6) |
| day_type | workout_day_type_enum | NOT NULL |
| order_index | integer | NOT NULL |

**Constraints:** UNIQUE (plan_id, day_of_week)  
**Indexes:** `idx_workout_days_plan` ON plan_id

---

## TABLE: workout_day_exercises

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

**Constraints:** UNIQUE (workout_day_id, order_index)  
**Indexes:**
- `idx_wde_workout_day` ON workout_day_id
- `idx_wde_exercise` ON exercise_id

---

## TABLE: workout_sessions

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

**Indexes:**
- `idx_sessions_user_started` ON (user_id, started_at DESC)
- `idx_sessions_status` ON status

---

## TABLE: session_sets

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

**Indexes:**
- `idx_session_sets_session` ON session_id
- `idx_session_sets_exercise` ON (exercise_id, completed_at DESC)

---

## TABLE: fitness_snapshots

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| fitness | numeric(8,3) | NOT NULL DEFAULT 0 |
| fatigue | numeric(8,3) | NOT NULL DEFAULT 0 |
| form | numeric(8,3) | NOT NULL DEFAULT 0 |

**Constraints:** PRIMARY KEY (user_id, date)  
**Indexes:** `idx_fitness_snapshots_user_date` ON (user_id, date DESC)

---

## TABLE: exercise_e1rm_history

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| exercise_id | uuid | NOT NULL FK → exercises(id) |
| session_id | uuid | NOT NULL FK → workout_sessions(id) ON DELETE CASCADE |
| date | date | NOT NULL |
| e1rm_kg | numeric(7,2) | NOT NULL CHECK (e1rm_kg > 0) |

**Constraints:** PRIMARY KEY (user_id, exercise_id, session_id)  
**Indexes:** `idx_e1rm_user_exercise_date` ON (user_id, exercise_id, date DESC)

---

## TABLE: user_volume_landmarks

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL FK → user_profiles(id) ON DELETE CASCADE |
| muscle_group | muscle_group_enum | NOT NULL |
| mev | numeric(5,2) | NOT NULL |
| mav | numeric(5,2) | NOT NULL |
| mrv | numeric(5,2) | NOT NULL |
| confidence | numeric(4,3) | NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1) |
| last_updated | timestamptz | NOT NULL DEFAULT now() |

**Constraints:** PRIMARY KEY (user_id, muscle_group)

---

## TABLE: plan_quality_scores

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

**Indexes:** `idx_quality_scores_plan` ON plan_id