import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/database.types'

type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row']
type SessionSet = Database['public']['Tables']['session_sets']['Row']

export function useCurrentSession(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as unknown as WorkoutSession | null
    },
    enabled: !!userId,
  })
}

export function useSessionSets(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessionSets(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('set_number')
      if (error) throw error
      return data as unknown as SessionSet[]
    },
    enabled: !!sessionId,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (session: Database['public']['Tables']['workout_sessions']['Insert']) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert(session as never)
        .select()
        .single()
      if (error) throw error
      return data as unknown as WorkoutSession
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions(variables.user_id) })
    },
  })
}

export function useInsertSessionSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (set: Database['public']['Tables']['session_sets']['Insert']) => {
      const { data, error } = await supabase
        .from('session_sets')
        .insert(set as never)
        .select()
        .single()
      if (error) throw error
      return data as unknown as SessionSet
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessionSets(variables.session_id) })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<WorkoutSession> }) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update(updates as never)
        .eq('id', sessionId)
        .select()
        .single()
      if (error) throw error
      return data as unknown as WorkoutSession
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions(data.user_id) })
    },
  })
}