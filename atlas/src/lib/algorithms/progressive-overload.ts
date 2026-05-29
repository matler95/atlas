const LOWER_BODY_MUSCLES = ['quadriceps','hamstrings','glutes','calves','adductors','abductors']

export function isLowerBodyExercise(primaryMuscles: string[]): boolean {
  return primaryMuscles.some(m => LOWER_BODY_MUSCLES.includes(m))
}

export function personalizedIncrement(
  primaryMuscles: string[],
  e1rmHistory: number[],
): number {
  const isLower = isLowerBodyExercise(primaryMuscles)
  const baseIncrement = isLower ? 5 : 2.5
  if (e1rmHistory.length < 4) return baseIncrement
  const weeklyGain = (e1rmHistory[e1rmHistory.length - 1] - e1rmHistory[0]) / (e1rmHistory.length - 1)
  if (weeklyGain > baseIncrement * 0.8) return baseIncrement
  if (weeklyGain > baseIncrement * 0.3) return baseIncrement * 0.5
  return baseIncrement * 0.25
}

// Returns 'increase' | 'maintain' | 'decrease'
export function progressionDecision(
  allRepsHit: boolean,
  calibratedRpe: number
): 'increase' | 'maintain' | 'decrease' {
  if (allRepsHit && calibratedRpe <= 7) return 'increase'
  if (allRepsHit && calibratedRpe <= 8) return 'maintain'
  return 'decrease'
}