import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/database.types'

type BodyweightLog = Database['public']['Tables']['bodyweight_logs']['Row']

export function useBodyweightLogs(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bodyweightLogs(userId ?? ''),
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('bodyweight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      if (error) throw error
      return data as unknown as BodyweightLog[]
    },
    enabled: !!userId,
  })
}

export function useInsertBodyweightLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: Database['public']['Tables']['bodyweight_logs']['Insert']) => {
      const { data, error } = await supabase
        .from('bodyweight_logs')
        .upsert(log as never, { onConflict: 'user_id,date' })
        .select()
        .single()
      if (error) throw error
      return data as unknown as BodyweightLog
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bodyweightLogs(variables.user_id) })
    },
  })
}