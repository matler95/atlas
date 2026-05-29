import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data as unknown as UserProfile
    },
    enabled: !!userId,
  })
}

export function useUpdateUserProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates as never)
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data as unknown as UserProfile
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) })
    },
  })
}