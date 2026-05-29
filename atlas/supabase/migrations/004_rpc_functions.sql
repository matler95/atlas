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