import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/database.types'

type Exercise = Database['public']['Tables']['exercises']['Row']

interface ExerciseFilters {
  equipment?: string[]
  muscleGroup?: string
  level?: string
  searchQuery?: string
}

export function useExercises(filters?: ExerciseFilters) {
  return useQuery({
    queryKey: queryKeys.exercises.filtered(filters ?? {}),
    queryFn: async () => {
      let query = supabase.from('exercises').select('*')

      if (filters?.equipment && filters.equipment.length > 0) {
        query = query.in('equipment', filters.equipment)
      }
      if (filters?.level) {
        query = query.eq('level', filters.level)
      }
      if (filters?.muscleGroup) {
        query = query.contains('primary_muscles', [filters.muscleGroup])
      }
      if (filters?.searchQuery) {
        query = query.ilike('name', `%${filters.searchQuery}%`)
      }

      query = query.order('name')

      const { data, error } = await query
      if (error) throw error
      return data as unknown as Exercise[]
    },
  })
}