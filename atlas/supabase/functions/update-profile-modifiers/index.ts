import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ok, error } from '../_shared/response.ts'

function rpeRiseRate(sets: Array<{ rpe: number | null; set_number: number }>): number | null {
  const valid = sets.filter(s => s.rpe != null).sort((a, b) => a.set_number - b.set_number)
  if (valid.length < 2) return null
  const deltas = valid.slice(1).map((s, i) => s.rpe! - valid[i].rpe!)
  return deltas.reduce((a, b) => a + b, 0) / deltas.length
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return error('Unauthorized', 401)
    }

    const body = await req.json()
    const { user_id } = body as { user_id: string }

    if (user.id !== user_id) {
      return error('Unauthorized: user_id mismatch', 403)
    }

    // Load last 100 session_sets for user (via join through workout_sessions)
    const { data: sets } = await supabaseClient
      .from('session_sets')
      .select('rpe, reps, set_number, workout_sessions!inner(user_id)')
      .eq('workout_sessions.user_id', user_id)
      .order('completed_at', { ascending: false })
      .limit(100)

    const typedSets = (sets ?? []).map(s => ({
      rpe: s.rpe as number | null,
      reps: s.reps as number,
      set_number: s.set_number as number,
    }))

    // Compute RPE calibration
    const sample = typedSets.filter(s => s.rpe != null && s.rpe >= 6 && s.rpe <= 9)
    let offset = 0
    let confidence = 0

    if (sample.length >= 20) {
      const targetReps = 10
      const rpe8Sets = sample.filter(s => s.rpe === 8)
      if (rpe8Sets.length > 0) {
        const completionAtRpe8 = rpe8Sets.filter(s => s.reps >= targetReps).length / rpe8Sets.length
        const rawOffset = (0.90 - completionAtRpe8) * -2.5
        offset = Math.max(-2, Math.min(0.5, rawOffset))
        confidence = Math.min(1, sample.length / 50)
      }
    }

    // Compute fatigue accumulation modifier via rpeRiseRate
    const { data: sessions } = await supabaseClient
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10)

    let fatigueModifier = 1.0
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id)
      const { data: sessionSets } = await supabaseClient
        .from('session_sets')
        .select('rpe, set_number, session_id')
        .in('session_id', sessionIds)

      if (sessionSets) {
        // Group by session
        const bySession = new Map<string, typeof sessionSets>()
        for (const s of sessionSets) {
          const group = bySession.get(s.session_id) ?? []
          group.push(s)
          bySession.set(s.session_id, group)
        }

        const rates: number[] = []
        for (const [, sessionSetsGroup] of bySession) {
          const rate = rpeRiseRate(sessionSetsGroup)
          if (rate !== null) rates.push(rate)
        }

        if (rates.length > 0) {
          const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
          if (avgRate <= 0.5) fatigueModifier = 1.1
          else if (avgRate <= 1.0) fatigueModifier = 1.0
          else if (avgRate <= 1.5) fatigueModifier = 0.9
          else fatigueModifier = 0.8
        }
      }
    }

    // Update user_profiles
    await supabaseClient
      .from('user_profiles')
      .update({
        rpe_offset: offset,
        rpe_calibration_confidence: confidence,
        fatigue_accumulation_modifier: fatigueModifier,
      })
      .eq('id', user_id)

    return ok({ success: true })
  } catch (err) {
    console.error('update-profile-modifiers error:', err)
    return error(err instanceof Error ? err.message : 'Internal server error', 500)
  }
})