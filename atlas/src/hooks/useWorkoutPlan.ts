import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/database.types'

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row']
type WorkoutDay = Database['public']['Tables']['workout_days']['Row']
type WorkoutDayExercise = Database['public']['Tables']['workout_day_exercises']['Row']

export function useActiveWorkoutPlan(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activePlan(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null
      const { data: plan, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return plan as unknown as WorkoutPlan
    },
    enabled: !!userId,
  })
}

export function useWorkoutDays(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workoutDays(planId ?? ''),
    queryFn: async () => {
      if (!planId) return []
      const { data, error } = await supabase
        .from('workout_days')
        .select('*')
        .eq('plan_id', planId)
        .order('order_index')
      if (error) throw error
      return data as unknown as WorkoutDay[]
    },
    enabled: !!planId,
  })
}

export function useDayExercises(dayId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dayExercises(dayId ?? ''),
    queryFn: async () => {
      if (!dayId) return []
      const { data, error } = await supabase
        .from('workout_day_exercises')
        .select('*, exercises(*)')
        .eq('workout_day_id', dayId)
        .order('order_index')
      if (error) throw error
      return data as unknown as (WorkoutDayExercise & { exercises: Database['public']['Tables']['exercises']['Row'] })[]
    },
    enabled: !!dayId,
  })
}