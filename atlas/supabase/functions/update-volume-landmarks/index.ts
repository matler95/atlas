import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ok, error } from '../_shared/response.ts'

const MAJOR_MUSCLES = [
  'chest', 'quadriceps', 'hamstrings', 'shoulders', 'lats',
  'biceps', 'triceps', 'glutes', 'calves', 'abdominals'
]

const POPULATION_DEFAULTS: Record<string, { mev: number; mav: number; mrv: number }> = {
  chest:       { mev: 10, mav: 14, mrv: 18 },
  quadriceps:  { mev: 10, mav: 16, mrv: 22 },
  hamstrings:  { mev: 8,  mav: 12, mrv: 16 },
  shoulders:   { mev: 8,  mav: 12, mrv: 16 },
  lats:        { mev: 8,  mav: 14, mrv: 18 },
  biceps:      { mev: 8,  mav: 12, mrv: 16 },
  triceps:     { mev: 8,  mav: 12, mrv: 16 },
  glutes:      { mev: 10, mav: 14, mrv: 18 },
  calves:      { mev: 6,  mav: 10, mrv: 14 },
  abdominals:  { mev: 8,  mav: 12, mrv: 16 },
}

function findInflectionPoint(
  weeklySets: number[],
  weeklyE1rmChange: number[],
  type: 'start' | 'decline'
): number | null {
  if (type === 'start') {
    for (let i = 1; i < weeklySets.length; i++) {
      if (weeklyE1rmChange[i] > 0) return weeklySets[i]
    }
    return null
  }
  for (let i = weeklySets.length - 1; i >= 0; i--) {
    if (weeklyE1rmChange[i] < 0) return weeklySets[i]
  }
  return null
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
    const { user_id, plan_id } = body as { user_id: string; plan_id: string }

    if (user.id !== user_id) {
      return error('Unauthorized: user_id mismatch', 403)
    }

    // Load completed sessions from last 8 weeks
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const { data: sessions } = await supabaseClient
      .from('workout_sessions')
      .select('id, started_at')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .gte('started_at', eightWeeksAgo.toISOString())
      .order('started_at', { ascending: true })

    if (!sessions || sessions.length === 0) {
      return ok({ success: true, muscles_updated: 0 })
    }

    const sessionIds = sessions.map(s => s.id)

    // Load all sets for these sessions
    const { data: sets } = await supabaseClient
      .from('session_sets')
      .select('session_id, exercise_id, set_number, reps, weight_kg, rpe')
      .in('session_id', sessionIds)

    if (!sets || sets.length === 0) {
      return ok({ success: true, muscles_updated: 0 })
    }

    // Load exercises to know their primary_muscles
    const exerciseIds = [...new Set(sets.map(s => s.exercise_id))]
    const { data: exercises } = await supabaseClient
      .from('exercises')
      .select('id, primary_muscles')
      .in('id', exerciseIds)

    const exerciseMuscleMap = new Map<string, string[]>()
    for (const ex of exercises ?? []) {
      exerciseMuscleMap.set(ex.id, ex.primary_muscles)
    }

    // Load e1rm history for this user
    const { data: e1rmHistory } = await supabaseClient
      .from('exercise_e1rm_history')
      .select('exercise_id, date, e1rm_kg')
      .eq('user_id', user_id)
      .gte('date', eightWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // For each major muscle, compute weekly sets and e1rm changes
    let musclesUpdated = 0

    for (const muscle of MAJOR_MUSCLES) {
      // Count weekly sets for this muscle
      const weeklySetsByWeek: Map<number, number> = new Map()
      for (const session of sessions) {
        const sessionDate = new Date(session.started_at)
        const weekIdx = Math.floor(
          (sessionDate.getTime() - eightWeeksAgo.getTime()) / (7 * 86400000)
        )
        const sessionSets = sets.filter(s => s.session_id === session.id)
        for (const s of sessionSets) {
          const muscles = exerciseMuscleMap.get(s.exercise_id) ?? []
          if (muscles.includes(muscle)) {
            const current = weeklySetsByWeek.get(weekIdx) ?? 0
            weeklySetsByWeek.set(weekIdx, current + 1)
          }
        }
      }

      // Compute weekly e1rm changes for exercises targeting this muscle
      const weeklyE1rmByWeek: Map<number, number[]> = new Map()
      for (const entry of e1rmHistory ?? []) {
        const muscles = exerciseMuscleMap.get(entry.exercise_id) ?? []
        if (muscles.includes(muscle)) {
          const entryDate = new Date(entry.date)
          const weekIdx = Math.floor(
            (entryDate.getTime() - eightWeeksAgo.getTime()) / (7 * 86400000)
          )
          const current = weeklyE1rmByWeek.get(weekIdx) ?? []
          current.push(Number(entry.e1rm_kg))
          weeklyE1rmByWeek.set(weekIdx, current)
        }
      }

      const sortedWeeks = [...weeklySetsByWeek.keys()].sort((a, b) => a - b)
      const weeklySetsArr = sortedWeeks.map(w => weeklySetsByWeek.get(w) ?? 0)
      const weeklyE1rmArr = sortedWeeks.map(w => {
        const vals = weeklyE1rmByWeek.get(w)
        if (!vals || vals.length === 0) return 0
        return vals.reduce((a, b) => a + b, 0) / vals.length
      })

      if (weeklySetsArr.length < 3) continue

      // Compute personal landmarks
      const startInflection = findInflectionPoint(weeklySetsArr, weeklyE1rmArr, 'start')
      const declineInflection = findInflectionPoint(weeklySetsArr, weeklyE1rmArr, 'decline')

      const pop = POPULATION_DEFAULTS[muscle]
      const mev = startInflection ?? pop.mev
      const mrv = declineInflection ?? pop.mrv
      const mav = Math.round((mev + mrv) / 2)
      const confidence = Math.min(1, weeklySetsArr.length / 8)

      await supabaseClient
        .from('user_volume_landmarks')
        .upsert(
          {
            user_id,
            muscle_group: muscle,
            mev,
            mav,
            mrv,
            confidence,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'user_id,muscle_group' }
        )

      musclesUpdated++
    }

    return ok({ success: true, muscles_updated: musclesUpdated })
  } catch (err) {
    console.error('update-volume-landmarks error:', err)
    return error(err instanceof Error ? err.message : 'Internal server error', 500)
  }
})