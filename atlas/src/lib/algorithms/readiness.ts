import { clamp } from './utils'
import type { FitnessState } from './fatigue'

export function readinessScore(
  fitnessState: FitnessState,
  checkinEMA: number,
  sleepHours: number
): number {
  const formScore    = clamp(0, 35, 35 * (1 - Math.abs(fitnessState.form) / 40))
  const checkinScore = clamp(0, 40, (checkinEMA / 5) * 40)
  const sleepScore   = clamp(0, 25, Math.min(sleepHours / 8, 1) * 25)
  return Math.round(formScore + checkinScore + sleepScore)
}

export interface WorkoutSessionCheckin {
  checkin_score: number | null
}

export function rollingCheckinEMA(recentSessions: WorkoutSessionCheckin[], k = 0.3): number {
  return recentSessions
    .filter(s => s.checkin_score != null)
    .reduce((ema, s) => k * s.checkin_score! + (1 - k) * ema, 3.0)
}

export function recoveryModifier(sleepHours: number, stressLevel: number, jobActivity: string): number {
  const physicalJob = jobActivity === 'physical'
  if (sleepHours < 5 || stressLevel >= 4 || physicalJob) return 0.75
  if (sleepHours < 6 && stressLevel >= 3) return 0.8
  if (sleepHours < 7 || stressLevel === 3 || jobActivity === 'mixed') return 0.9
  return 1.0
}