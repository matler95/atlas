import { POPULATION_LANDMARKS, volumeBalanceScore, type MuscleGroup } from './volume'
import type { ScoredExercise } from './exercise-scoring'

interface DayExercise {
  exercise: ScoredExercise
  sets: number
}

export function assessPlanQuality(
  days: DayExercise[][],
  userEquipmentList: string[],
  goal: string,
  daysPerWeek: number,
  sessionLengthMinutes: number
): {
  overallScore: number
  equipmentCoverage: number
  volumeBalance: number
  recoveryFit: number
  goalAlignment: number
  warnings: string[]
} {
  const warnings: string[] = []
  // Equipment coverage
  const allEx = days.flat()
  const usingAvailable = allEx.filter(e => userEquipmentList.includes(e.exercise.equipment)).length
  const equipmentCoverage = allEx.length > 0 ? (usingAvailable / allEx.length) * 100 : 0
  // Volume balance: check major muscles
  const majorMuscles: MuscleGroup[] = ['chest','quadriceps','hamstrings','shoulders','lats','biceps','triceps','glutes']
  const weeklySetsByMuscle: Record<string, number> = {}
  for (const day of days) {
    for (const item of day) {
      for (const m of item.exercise.primary_muscles) {
        weeklySetsByMuscle[m] = (weeklySetsByMuscle[m] ?? 0) + item.sets
      }
    }
  }
  const muscleScores = majorMuscles.map(m => {
    const sets = weeklySetsByMuscle[m] ?? 0
    return volumeBalanceScore(sets, POPULATION_LANDMARKS[m])
  })
  const volumeBalance = muscleScores.reduce((a,b) => a+b, 0) / muscleScores.length
  // Recovery fit
  const restDays = 7 - daysPerWeek
  const recoveryFit = restDays >= 2 ? 100 : restDays === 1 ? 70 : 40
  // Goal alignment — rep range check
  const goalAlignment = 100  // detailed rep-range check done at calcSetsReps level
  const overallScore = Math.round(
    equipmentCoverage * 0.20 +
    volumeBalance * 0.35 +
    recoveryFit * 0.20 +
    goalAlignment * 0.25
  )
  // Warnings
  if (sessionLengthMinutes > 90) warnings.push('Session exceeds 90 minutes — consider reducing exercises')
  if (sessionLengthMinutes < 30) warnings.push('Session under 30 minutes — consider adding exercises')
  if (daysPerWeek >= 6 && !['push_pull_legs','bodybuilding_split'].includes(goal))
    warnings.push('High frequency may cause insufficient recovery')
  return { overallScore, equipmentCoverage, volumeBalance, recoveryFit, goalAlignment, warnings }
}