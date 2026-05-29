export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string
          slug: string
          name: string
          category: Database['public']['Enums']['exercise_category_enum']
          level: Database['public']['Enums']['exercise_level_enum']
          force: Database['public']['Enums']['exercise_force_enum'] | null
          mechanic: Database['public']['Enums']['exercise_mechanic_enum'] | null
          equipment: string
          primary_muscles: Database['public']['Enums']['muscle_group_enum'][]
          secondary_muscles: Database['public']['Enums']['muscle_group_enum'][]
          movement_pattern: Database['public']['Enums']['movement_pattern_enum'] | null
          is_compound: boolean
          is_unilateral: boolean
          is_lower_body: boolean
          instructions: string[]
        }
        Insert: {
          id?: string
          slug: string
          name: string
          category: Database['public']['Enums']['exercise_category_enum']
          level: Database['public']['Enums']['exercise_level_enum']
          force?: Database['public']['Enums']['exercise_force_enum'] | null
          mechanic?: Database['public']['Enums']['exercise_mechanic_enum'] | null
          equipment?: string
          primary_muscles?: Database['public']['Enums']['muscle_group_enum'][]
          secondary_muscles?: Database['public']['Enums']['muscle_group_enum'][]
          movement_pattern?: Database['public']['Enums']['movement_pattern_enum'] | null
          is_compound?: boolean
          is_unilateral?: boolean
          is_lower_body?: boolean
          instructions?: string[]
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          category?: Database['public']['Enums']['exercise_category_enum']
          level?: Database['public']['Enums']['exercise_level_enum']
          force?: Database['public']['Enums']['exercise_force_enum'] | null
          mechanic?: Database['public']['Enums']['exercise_mechanic_enum'] | null
          equipment?: string
          primary_muscles?: Database['public']['Enums']['muscle_group_enum'][]
          secondary_muscles?: Database['public']['Enums']['muscle_group_enum'][]
          movement_pattern?: Database['public']['Enums']['movement_pattern_enum'] | null
          is_compound?: boolean
          is_unilateral?: boolean
          is_lower_body?: boolean
          instructions?: string[]
        }
      }
      user_profiles: {
        Row: {
          id: string
          name: string
          goal: Database['public']['Enums']['goal_enum']
          experience: Database['public']['Enums']['experience_enum']
          gender: Database['public']['Enums']['gender_enum']
          age: number
          height_cm: number
          weight_kg: number
          equipment: Database['public']['Enums']['equipment_enum']
          limited_equipment_items: string[]
          gym_days_per_week: number
          session_length_minutes: number
          training_style: Database['public']['Enums']['training_style_enum']
          include_abs: boolean
          abs_days: number[]
          sleep_hours: number
          stress_level: number
          job_activity: Database['public']['Enums']['job_activity_enum']
          cardio_sessions_per_week: number
          activity_level: Database['public']['Enums']['activity_level_enum']
          exercises_to_avoid: string[]
          prioritized_muscles: Database['public']['Enums']['muscle_group_enum'][]
          units: string
          theme: string
          language: string
          rpe_offset: number
          rpe_calibration_confidence: number
          fatigue_accumulation_modifier: number
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          goal: Database['public']['Enums']['goal_enum']
          experience: Database['public']['Enums']['experience_enum']
          gender: Database['public']['Enums']['gender_enum']
          age: number
          height_cm: number
          weight_kg: number
          equipment: Database['public']['Enums']['equipment_enum']
          limited_equipment_items?: string[]
          gym_days_per_week: number
          session_length_minutes: number
          training_style: Database['public']['Enums']['training_style_enum']
          include_abs?: boolean
          abs_days?: number[]
          sleep_hours?: number
          stress_level?: number
          job_activity?: Database['public']['Enums']['job_activity_enum']
          cardio_sessions_per_week?: number
          activity_level?: Database['public']['Enums']['activity_level_enum']
          exercises_to_avoid?: string[]
          prioritized_muscles?: Database['public']['Enums']['muscle_group_enum'][]
          units?: string
          theme?: string
          language?: string
          rpe_offset?: number
          rpe_calibration_confidence?: number
          fatigue_accumulation_modifier?: number
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          goal?: Database['public']['Enums']['goal_enum']
          experience?: Database['public']['Enums']['experience_enum']
          gender?: Database['public']['Enums']['gender_enum']
          age?: number
          height_cm?: number
          weight_kg?: number
          equipment?: Database['public']['Enums']['equipment_enum']
          limited_equipment_items?: string[]
          gym_days_per_week?: number
          session_length_minutes?: number
          training_style?: Database['public']['Enums']['training_style_enum']
          include_abs?: boolean
          abs_days?: number[]
          sleep_hours?: number
          stress_level?: number
          job_activity?: Database['public']['Enums']['job_activity_enum']
          cardio_sessions_per_week?: number
          activity_level?: Database['public']['Enums']['activity_level_enum']
          exercises_to_avoid?: string[]
          prioritized_muscles?: Database['public']['Enums']['muscle_group_enum'][]
          units?: string
          theme?: string
          language?: string
          rpe_offset?: number
          rpe_calibration_confidence?: number
          fatigue_accumulation_modifier?: number
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bodyweight_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight_kg: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight_kg?: number
          created_at?: string
        }
      }
      workout_plans: {
        Row: {
          id: string
          user_id: string
          name: string
          goal: Database['public']['Enums']['goal_enum']
          experience: Database['public']['Enums']['experience_enum']
          training_style: Database['public']['Enums']['training_style_enum']
          days_per_week: number
          session_length_minutes: number
          periodization: Database['public']['Enums']['periodization_enum']
          is_active: boolean
          deload_active: boolean
          start_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          goal: Database['public']['Enums']['goal_enum']
          experience: Database['public']['Enums']['experience_enum']
          training_style: Database['public']['Enums']['training_style_enum']
          days_per_week: number
          session_length_minutes: number
          periodization: Database['public']['Enums']['periodization_enum']
          is_active?: boolean
          deload_active?: boolean
          start_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          goal?: Database['public']['Enums']['goal_enum']
          experience?: Database['public']['Enums']['experience_enum']
          training_style?: Database['public']['Enums']['training_style_enum']
          days_per_week?: number
          session_length_minutes?: number
          periodization?: Database['public']['Enums']['periodization_enum']
          is_active?: boolean
          deload_active?: boolean
          start_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      workout_days: {
        Row: {
          id: string
          plan_id: string
          day_of_week: number
          day_type: Database['public']['Enums']['workout_day_type_enum']
          order_index: number
        }
        Insert: {
          id?: string
          plan_id: string
          day_of_week: number
          day_type: Database['public']['Enums']['workout_day_type_enum']
          order_index: number
        }
        Update: {
          id?: string
          plan_id?: string
          day_of_week?: number
          day_type?: Database['public']['Enums']['workout_day_type_enum']
          order_index?: number
        }
      }
      workout_day_exercises: {
        Row: {
          id: string
          workout_day_id: string
          exercise_id: string
          order_index: number
          suggested_sets: number
          suggested_reps_min: number
          suggested_reps_max: number
          suggested_weight_kg: number | null
          rest_seconds: number
        }
        Insert: {
          id?: string
          workout_day_id: string
          exercise_id: string
          order_index: number
          suggested_sets: number
          suggested_reps_min: number
          suggested_reps_max: number
          suggested_weight_kg?: number | null
          rest_seconds?: number
        }
        Update: {
          id?: string
          workout_day_id?: string
          exercise_id?: string
          order_index?: number
          suggested_sets?: number
          suggested_reps_min?: number
          suggested_reps_max?: number
          suggested_weight_kg?: number | null
          rest_seconds?: number
        }
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          workout_day_id: string
          status: Database['public']['Enums']['session_status_enum']
          started_at: string
          completed_at: string | null
          planned_duration_minutes: number
          checkin_score: number | null
          checkin_limiters: string[]
          feedback_energy: number | null
          feedback_difficulty: number | null
          feedback_notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workout_day_id: string
          status?: Database['public']['Enums']['session_status_enum']
          started_at?: string
          completed_at?: string | null
          planned_duration_minutes: number
          checkin_score?: number | null
          checkin_limiters?: string[]
          feedback_energy?: number | null
          feedback_difficulty?: number | null
          feedback_notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workout_day_id?: string
          status?: Database['public']['Enums']['session_status_enum']
          started_at?: string
          completed_at?: string | null
          planned_duration_minutes?: number
          checkin_score?: number | null
          checkin_limiters?: string[]
          feedback_energy?: number | null
          feedback_difficulty?: number | null
          feedback_notes?: string | null
        }
      }
      session_sets: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          set_number: number
          reps: number
          weight_kg: number
          rpe: number | null
          completed_at: string
          is_warmup: boolean
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          set_number: number
          reps: number
          weight_kg?: number
          rpe?: number | null
          completed_at?: string
          is_warmup?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string
          set_number?: number
          reps?: number
          weight_kg?: number
          rpe?: number | null
          completed_at?: string
          is_warmup?: boolean
        }
      }
      fitness_snapshots: {
        Row: {
          user_id: string
          date: string
          fitness: number
          fatigue: number
          form: number
        }
        Insert: {
          user_id: string
          date: string
          fitness?: number
          fatigue?: number
          form?: number
        }
        Update: {
          user_id?: string
          date?: string
          fitness?: number
          fatigue?: number
          form?: number
        }
      }
      exercise_e1rm_history: {
        Row: {
          user_id: string
          exercise_id: string
          session_id: string
          date: string
          e1rm_kg: number
        }
        Insert: {
          user_id: string
          exercise_id: string
          session_id: string
          date: string
          e1rm_kg: number
        }
        Update: {
          user_id?: string
          exercise_id?: string
          session_id?: string
          date?: string
          e1rm_kg?: number
        }
      }
      user_volume_landmarks: {
        Row: {
          user_id: string
          muscle_group: Database['public']['Enums']['muscle_group_enum']
          mev: number
          mav: number
          mrv: number
          confidence: number
          last_updated: string
        }
        Insert: {
          user_id: string
          muscle_group: Database['public']['Enums']['muscle_group_enum']
          mev: number
          mav: number
          mrv: number
          confidence?: number
          last_updated?: string
        }
        Update: {
          user_id?: string
          muscle_group?: Database['public']['Enums']['muscle_group_enum']
          mev?: number
          mav?: number
          mrv?: number
          confidence?: number
          last_updated?: string
        }
      }
      plan_quality_scores: {
        Row: {
          id: string
          plan_id: string
          overall_score: number
          equipment_coverage: number
          volume_balance: number
          recovery_fit: number
          goal_alignment: number
          warnings: string[]
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          overall_score: number
          equipment_coverage: number
          volume_balance: number
          recovery_fit: number
          goal_alignment: number
          warnings?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          overall_score?: number
          equipment_coverage?: number
          volume_balance?: number
          recovery_fit?: number
          goal_alignment?: number
          warnings?: string[]
          created_at?: string
        }
      }
    }
    Enums: {
      goal_enum: 'muscle_gain' | 'fat_loss' | 'strength' | 'general_fitness' | 'recomposition'
      experience_enum: 'beginner' | 'intermediate' | 'advanced'
      gender_enum: 'male' | 'female' | 'other'
      activity_level_enum: 'sedentary' | 'light' | 'moderate' | 'high'
      job_activity_enum: 'desk' | 'mixed' | 'physical'
      equipment_enum: 'full_gym' | 'barbell_only' | 'dumbbells_only' | 'bodyweight_only' | 'cables_machines' | 'limited'
      training_style_enum: 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bodybuilding_split'
      exercise_category_enum: 'cardio' | 'olympic_weightlifting' | 'plyometrics' | 'powerlifting' | 'strength' | 'stretching' | 'strongman'
      exercise_level_enum: 'beginner' | 'intermediate' | 'expert'
      exercise_force_enum: 'push' | 'pull' | 'static'
      exercise_mechanic_enum: 'compound' | 'isolation'
      muscle_group_enum: 'abdominals' | 'abductors' | 'adductors' | 'biceps' | 'calves' | 'chest' | 'forearms' | 'glutes' | 'hamstrings' | 'lats' | 'lower_back' | 'middle_back' | 'neck' | 'quadriceps' | 'shoulders' | 'traps' | 'triceps'
      movement_pattern_enum: 'horizontal_push' | 'horizontal_pull' | 'vertical_push' | 'vertical_pull' | 'hip_hinge' | 'squat' | 'carry' | 'core' | 'unilateral'
      periodization_enum: 'linear' | 'undulating' | 'block'
      workout_day_type_enum: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'chest' | 'back' | 'shoulders' | 'arms' | 'abs' | 'rest'
      session_status_enum: 'in_progress' | 'completed' | 'abandoned'
      plateau_status_enum: 'progressing' | 'plateau' | 'regression'
      bw_signal_enum: 'bulk' | 'cut' | 'maintain' | 'rapid_loss' | 'insufficient_data'
    }
  }
}