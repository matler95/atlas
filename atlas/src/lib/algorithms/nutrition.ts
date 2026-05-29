import { clamp } from './utils'

export type Goal = 'muscle_gain'|'fat_loss'|'strength'|'general_fitness'|'recomposition'
export type Gender = 'male'|'female'|'other'
export type ActivityLevel = 'sedentary'|'light'|'moderate'|'high'

export function calcBMR(weight_kg: number, height_cm: number, age: number, gender: Gender): number {
  const g = gender === 'female' ? -161 : 5
  return 10 * weight_kg + 6.25 * height_cm - 5 * age + g
}

export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[activityLevel]
  return bmr * mult
}

export function calcTargetCalories(tdee: number, goal: Goal, bodyFatPct: number): number {
  // Percentage-based adjustments
  const adjustments: Record<Goal, number> = {
    fat_loss:        -0.15,
    muscle_gain:     0.10,
    strength:        0.05,
    general_fitness: 0.02,
    recomposition:   0.0,
  }
  const adj = adjustments[goal] ?? 0
  // Scale deficit by body fat: higher BF → larger safe deficit allowed (max -20%)
  const bfScale = goal === 'fat_loss' ? clamp(0.1, 0.2, bodyFatPct / 100 * 1.5) : adj
  return Math.round(tdee * (1 + (goal === 'fat_loss' ? -bfScale : adj)))
}

export function calcMacros(
  totalCalories: number,
  leanBodyMassKg: number,
  isTrainingDay: boolean
): { proteinG: number; fatG: number; carbsG: number; waterMl: number } {
  const proteinG = Math.round(leanBodyMassKg * (isTrainingDay ? 2.2 : 1.8))
  const fatG = Math.round(totalCalories * 0.25 / 9)
  const carbsG = Math.round((totalCalories - proteinG * 4 - fatG * 9) / 4)
  return { proteinG, fatG, carbsG: Math.max(0, carbsG), waterMl: Math.round(leanBodyMassKg * 35) }
}

export function estimateBodyFatBMI(weight_kg: number, height_cm: number, gender: Gender): number {
  const heightM = height_cm / 100
  const bmi = weight_kg / (heightM * heightM)
  return gender === 'female' ? bmi * 1.2 + 4 : bmi * 1.0 + 2
}

export function leanBodyMass(weight_kg: number, bodyFatPct: number): number {
  return weight_kg * (1 - bodyFatPct / 100)
}