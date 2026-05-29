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