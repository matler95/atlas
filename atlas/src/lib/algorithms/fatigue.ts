import { toDateString } from './utils'

export interface FitnessState {
  fitness: number  // CTL
  fatigue: number  // ATL
  form: number     // TSB = fitness - fatigue
}

export interface DatedLoad {
  date: Date
  load: number
}

export interface SessionSet {
  set_number: number
  reps: number
  weight_kg: number
  rpe: number | null
}

const FITNESS_TC = 42
const FATIGUE_TC = 7
const FITNESS_K = 1 - Math.exp(-1 / FITNESS_TC)
const FATIGUE_K = 1 - Math.exp(-1 / FATIGUE_TC)

export function updateFitnessState(prev: FitnessState, todayLoad: number): FitnessState {
  const fitness = prev.fitness + FITNESS_K * (todayLoad - prev.fitness)
  const fatigue = prev.fatigue + FATIGUE_K * (todayLoad - prev.fatigue)
  return { fitness, fatigue, form: fitness - fatigue }
}

export function buildFitnessHistory(sessions: DatedLoad[]): FitnessState {
  let state: FitnessState = { fitness: 0, fatigue: 0, form: 0 }
  if (sessions.length === 0) return state
  const sessionMap = new Map(sessions.map(s => [toDateString(s.date), s.load]))
  const start = new Date(sessions[0].date)
  const today = new Date()
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const load = sessionMap.get(toDateString(d)) ?? 0
    state = updateFitnessState(state, load)
  }
  return state
}

export function shouldDeload(state: FitnessState): boolean {
  return state.form < -30 || (state.fitness > 0 && state.fatigue / state.fitness > 1.5)
}

// RPE multiplier for load calculation
function rpeMultiplier(rpe: number | null): number {
  if (rpe === null) return 1.0
  const table: Record<number, number> = { 10: 1.0, 9: 0.94, 8: 0.89, 7: 0.83, 6: 0.77 }
  return table[Math.round(rpe)] ?? 1.0
}

export function sessionDurationModifier(actualMinutes: number, plannedMinutes: number): number {
  const ratio = actualMinutes / plannedMinutes
  if (ratio < 0.5) return 0.6
  if (ratio < 0.8) return 0.85
  if (ratio <= 1.3) return 1.0
  if (ratio <= 1.6) return 1.1
  return 1.2
}

export function sessionLoad(sets: SessionSet[], durationModifier: number): number {
  const rawLoad = sets.reduce(
    (sum, s) => sum + s.set_number * s.reps * s.weight_kg * rpeMultiplier(s.rpe), 0
  )
  return rawLoad * durationModifier
}