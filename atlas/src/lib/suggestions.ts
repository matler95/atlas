import { progressionDecision, personalizedIncrement } from './algorithms/progressive-overload'
import { calibratedRpe } from './algorithms/rpe-calibration'
import type { RpeCalibration } from './algorithms/rpe-calibration'

export interface SetHistory {
  reps: number
  weight_kg: number
  rpe: number | null
  target_reps_min: number
  target_reps_max: number
}

export function suggestNextWeight(
  lastSets: SetHistory[],
  primaryMuscles: string[],
  e1rmHistory: number[],
  rpeCalibration: RpeCalibration
): { suggestedWeight: number; message: string; isIncrease: boolean } {
  if (lastSets.length === 0) return { suggestedWeight: 0, message: 'First session — start light', isIncrease: false }

  const lastSet = lastSets[lastSets.length - 1]
  const rawRpe = lastSet.rpe ?? 7
  const calRpe = calibratedRpe(rawRpe, rpeCalibration)
  const allRepsHit = lastSets.every(s => s.reps >= s.target_reps_min)
  const decision = progressionDecision(allRepsHit, calRpe)
  const increment = personalizedIncrement(primaryMuscles, e1rmHistory)

  if (decision === 'increase') {
    return {
      suggestedWeight: lastSet.weight_kg + increment,
      message: `Great work! Try +${increment}kg today`,
      isIncrease: true
    }
  }
  if (decision === 'decrease') {
    return {
      suggestedWeight: Math.max(0, lastSet.weight_kg - increment),
      message: 'Reduce weight slightly — RPE was high',
      isIncrease: false
    }
  }
  return {
    suggestedWeight: lastSet.weight_kg,
    message: 'Maintain weight, aim for top of rep range',
    isIncrease: false
  }
}