import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ok, error } from '../_shared/response.ts'

// ── Inline algorithm: Epley e1RM ──
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps > 12) return weight
  return weight * (1 + reps / 30)
}

const RPE_PERCENTAGE: Record<number, number> = {
  10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91,
  8: 0.89, 7.5: 0.86, 7: 0.83, 6.5: 0.80, 6: 0.77,
}

function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const epleyMax = epley1RM(weight, reps)
  const rpePct = RPE_PERCENTAGE[rpe] ?? RPE_PERCENTAGE[Math.round(rpe * 2) / 2] ?? null
  if (!rpePct) return epleyMax
  return epleyMax / rpePct
}

function sessionE1RM(sets: Array<{ weight_kg: number; reps: number; rpe: number | null }>): number {
  const validSets = sets.filter(s => s.rpe !== null && s.reps > 0)
  if (validSets.length === 0) {
    const best = sets.filter(s => s.reps > 0)
    if (best.length === 0) return 0
    return Math.max(...best.map(s => epley1RM(s.weight_kg, s.reps)))
  }
  return Math.max(...validSets.map(s => rpeAdjusted1RM(s.weight_kg, s.reps, s.rpe!)))
}

// ── Inline algorithm: Fatigue model ──
interface FitnessState { fitness: number; fatigue: number; form: number }
const FITNESS_K = 1 - Math.exp(-1 / 42)
const FATIGUE_K = 1 - Math.exp(-1 / 7)

function updateFitnessState(prev: FitnessState, todayLoad: number): FitnessState {
  const fitness = prev.fitness + FITNESS_K * (todayLoad - prev.fitness)
  const fatigue = prev.fatigue + FATIGUE_K * (todayLoad - prev.fatigue)
  return { fitness, fatigue, form: fitness - fatigue }
}

function rpeMultiplier(rpe: number | null): number {
  if (rpe === null) return 1.0
  const table: Record<number, number> = { 10: 1.0, 9: 0.94, 8: 0.89, 7: 0.83, 6: 0.77 }
  return table[Math.round(rpe)] ?? 1.0
}

function sessionDurationModifier(actualMinutes: number, plannedMinutes: number): number {
  const ratio = actualMinutes / plannedMinutes
  if (ratio < 0.5) return 0.6
  if (ratio < 0.8) return 0.85
  if (ratio <= 1.3) return 1.0
  if (ratio <= 1.6) return 1.1
  return 1.2
}

function sessionLoad(sets: Array<{ set_number: number; reps: number; weight_kg: number; rpe: number | null }>, durationModifier: number): number {
  const rawLoad = sets.reduce(
    (sum, s) => sum + s.set_number * s.reps * s.weight_kg * rpeMultiplier(s.rpe), 0
  )
  return rawLoad * durationModifier
}

function shouldDeload(state: FitnessState): boolean {
  return state.form < -30 || (state.fitness > 0 && state.fatigue / state.fitness > 1.5)
}

// ── Main handler ──
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return error('Unauthorized', 401)
    }

    const body = await req.json()
    const { session_id, feedback_energy, feedback_difficulty, feedback_notes } = body as {
      session_id: string
      feedback_energy: number
      feedback_difficulty: number
      feedback_notes?: string
    }

    // Load session
    const { data: session, error: sessionError } = await supabaseClient
      .from('workout_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return error('Session not found', 404)
    }

    // Load session sets
    const { data: sets, error: setsError } = await supabaseClient
      .from('session_sets')
      .select('*')
      .eq('session_id', session_id)

    if (setsError) {
      return error('Failed to load sets', 500)
    }

    // Compute e1RM for each unique exercise
    const exerciseGroups = new Map<string, typeof sets>()
    for (const s of sets ?? []) {
      const group = exerciseGroups.get(s.exercise_id) ?? []
      group.push(s)
      exerciseGroups.set(s.exercise_id, group)
    }

    let e1rmUpdates = 0
    for (const [exerciseId, exerciseSets] of exerciseGroups) {
      const e1rm = sessionE1RM(exerciseSets)
      if (e1rm > 0) {
        const { error: upsertError } = await supabaseClient
          .from('exercise_e1rm_history')
          .upsert(
            {
              user_id: user.id,
              exercise_id: exerciseId,
              session_id: session_id,
              date: new Date().toISOString().split('T')[0],
              e1rm_kg: e1rm,
            },
            { onConflict: 'user_id,exercise_id,session_id' }
          )
        if (!upsertError) e1rmUpdates++
      }
    }

    // Compute session load
    const now = new Date()
    const startedAt = new Date(session.started_at)
    const actualMinutes = (now.getTime() - startedAt.getTime()) / 60000
    const durationMod = sessionDurationModifier(actualMinutes, session.planned_duration_minutes)
    const load = sessionLoad(sets ?? [], durationMod)

    // Load last fitness snapshot
    const { data: snapshots } = await supabaseClient
      .from('fitness_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)

    const lastState: FitnessState = snapshots?.[0]
      ? { fitness: Number(snapshots[0].fitness), fatigue: Number(snapshots[0].fatigue), form: Number(snapshots[0].form) }
      : { fitness: 0, fatigue: 0, form: 0 }

    const newState = updateFitnessState(lastState, load)

    // Upsert today's snapshot
    const today = now.toISOString().split('T')[0]
    await supabaseClient
      .from('fitness_snapshots')
      .upsert(
        {
          user_id: user.id,
          date: today,
          fitness: newState.fitness,
          fatigue: newState.fatigue,
          form: newState.form,
        },
        { onConflict: 'user_id,date' }
      )

    // Mark session complete
    await supabaseClient
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: now.toISOString(),
        feedback_energy,
        feedback_difficulty,
        feedback_notes: feedback_notes ?? null,
      })
      .eq('id', session_id)

    // Check deload
    let deloadTriggered = false
    if (shouldDeload(newState)) {
      // Find user's active plan
      const { data: activePlan } = await supabaseClient
        .from('workout_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (activePlan) {
        await supabaseClient
          .from('workout_plans')
          .update({ deload_active: true })
          .eq('id', activePlan.id)
        deloadTriggered = true
      }
    }

    return ok({
      success: true,
      e1rm_updates: e1rmUpdates,
      new_form_score: Math.round(newState.form * 1000) / 1000,
      deload_triggered: deloadTriggered,
    })
  } catch (err) {
    console.error('complete-session error:', err)
    return error(err instanceof Error ? err.message : 'Internal server error', 500)
  }
})