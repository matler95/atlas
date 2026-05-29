import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/database.types'

type FitnessSnapshot = Database['public']['Tables']['fitness_snapshots']['Row']
type ExerciseE1RM = Database['public']['Tables']['exercise_e1rm_history']['Row']

export function useFitnessSnapshots(userId: string | undefined, days = 30) {
  return useQuery({
    queryKey: queryKeys.fitnessSnapshots(userId ?? ''),
    queryFn: async () => {
      if (!userId) return []
      const since = new Date()
      since.setDate(since.getDate() - days)
      const { data, error } = await supabase
        .from('fitness_snapshots')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })
      if (error) throw error
      return data as unknown as FitnessSnapshot[]
    },
    enabled: !!userId,
  })
}

export function useE1RMHistory(userId: string | undefined, exerciseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.e1rmHistory(userId ?? '', exerciseId ?? ''),
    queryFn: async () => {
      if (!userId || !exerciseId) return []
      const { data, error } = await supabase
        .from('exercise_e1rm_history')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: true })
      if (error) throw error
      return data as unknown as ExerciseE1RM[]
    },
    enabled: !!userId && !!exerciseId,
  })
}