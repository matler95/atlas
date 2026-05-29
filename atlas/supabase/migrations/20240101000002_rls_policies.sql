-- Migration 003: Row Level Security

-- Enable RLS on all tables (IF NOT EXISTS not supported for ALTER TABLE ENABLE, but re-running is safe)
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

-- Drop and recreate policies idempotently
DO $$ BEGIN DROP POLICY IF EXISTS "exercises_select_public" ON exercises; END $$;
CREATE POLICY "exercises_select_public" ON exercises FOR SELECT USING (true);

DO $$ BEGIN DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "user_profiles_delete_own" ON user_profiles; END $$;
CREATE POLICY "user_profiles_select_own" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_delete_own" ON user_profiles FOR DELETE USING (auth.uid() = id);

DO $$ BEGIN DROP POLICY IF EXISTS "bw_logs_select_own" ON bodyweight_logs; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "bw_logs_insert_own" ON bodyweight_logs; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "bw_logs_update_own" ON bodyweight_logs; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "bw_logs_delete_own" ON bodyweight_logs; END $$;
CREATE POLICY "bw_logs_select_own" ON bodyweight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bw_logs_insert_own" ON bodyweight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bw_logs_update_own" ON bodyweight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bw_logs_delete_own" ON bodyweight_logs FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "plans_select_own" ON workout_plans; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "plans_insert_own" ON workout_plans; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "plans_update_own" ON workout_plans; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "plans_delete_own" ON workout_plans; END $$;
CREATE POLICY "plans_select_own" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plans_insert_own" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update_own" ON workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plans_delete_own" ON workout_plans FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "days_select_own" ON workout_days; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "days_insert_own" ON workout_days; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "days_update_own" ON workout_days; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "days_delete_own" ON workout_days; END $$;
CREATE POLICY "days_select_own" ON workout_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "days_insert_own" ON workout_days FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "days_update_own" ON workout_days FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "days_delete_own" ON workout_days FOR DELETE
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "wde_select_own" ON workout_day_exercises; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "wde_insert_own" ON workout_day_exercises; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "wde_update_own" ON workout_day_exercises; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "wde_delete_own" ON workout_day_exercises; END $$;
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

DO $$ BEGIN DROP POLICY IF EXISTS "sessions_select_own" ON workout_sessions; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "sessions_insert_own" ON workout_sessions; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "sessions_update_own" ON workout_sessions; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "sessions_delete_own" ON workout_sessions; END $$;
CREATE POLICY "sessions_select_own" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "sets_select_own" ON session_sets; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "sets_insert_own" ON session_sets; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "sets_update_own" ON session_sets; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "sets_delete_own" ON session_sets; END $$;
CREATE POLICY "sets_select_own" ON session_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "sets_insert_own" ON session_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "sets_update_own" ON session_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "sets_delete_own" ON session_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "snapshots_select_own" ON fitness_snapshots; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "snapshots_insert_own" ON fitness_snapshots; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "snapshots_update_own" ON fitness_snapshots; END $$;
CREATE POLICY "snapshots_select_own" ON fitness_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert_own" ON fitness_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_update_own" ON fitness_snapshots FOR UPDATE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "e1rm_select_own" ON exercise_e1rm_history; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "e1rm_insert_own" ON exercise_e1rm_history; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "e1rm_update_own" ON exercise_e1rm_history; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "e1rm_delete_own" ON exercise_e1rm_history; END $$;
CREATE POLICY "e1rm_select_own" ON exercise_e1rm_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "e1rm_insert_own" ON exercise_e1rm_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "e1rm_update_own" ON exercise_e1rm_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "e1rm_delete_own" ON exercise_e1rm_history FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "landmarks_select_own" ON user_volume_landmarks; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "landmarks_insert_own" ON user_volume_landmarks; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "landmarks_update_own" ON user_volume_landmarks; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "landmarks_delete_own" ON user_volume_landmarks; END $$;
CREATE POLICY "landmarks_select_own" ON user_volume_landmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "landmarks_insert_own" ON user_volume_landmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "landmarks_update_own" ON user_volume_landmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "landmarks_delete_own" ON user_volume_landmarks FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "quality_select_own" ON plan_quality_scores; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "quality_insert_own" ON plan_quality_scores; END $$;
CREATE POLICY "quality_select_own" ON plan_quality_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));
CREATE POLICY "quality_insert_own" ON plan_quality_scores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid()));