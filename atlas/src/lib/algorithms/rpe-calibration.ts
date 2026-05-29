import { clamp } from './utils'

export interface RpeCalibration {
  offset: number
  confidence: number
}

export interface SessionSetForCalibration {
  rpe: number | null
  reps: number
}

export function computeRpeCalibration(
  recentSets: SessionSetForCalibration[],
  targetReps: number
): RpeCalibration {
  const sample = recentSets.filter(s => s.rpe != null && s.rpe >= 6 && s.rpe <= 9)
  if (sample.length < 20) return { offset: 0, confidence: 0 }
  const rpe8Sets = sample.filter(s => s.rpe === 8)
  if (rpe8Sets.length === 0) return { offset: 0, confidence: 0 }
  const completionAtRpe8 = rpe8Sets.filter(s => s.reps >= targetReps).length / rpe8Sets.length
  const offset = (0.90 - completionAtRpe8) * -2.5
  return {
    offset: clamp(-2, 0.5, offset),
    confidence: Math.min(1, sample.length / 50)
  }
}

export function calibratedRpe(raw: number, cal: RpeCalibration): number {
  return raw + cal.offset * cal.confidence
}