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