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