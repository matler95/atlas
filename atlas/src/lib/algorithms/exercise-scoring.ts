import type { MuscleGroup } from './volume'

export type Goal = 'muscle_gain'|'fat_loss'|'strength'|'general_fitness'|'recomposition'
export type ExperienceLevel = 'beginner'|'intermediate'|'advanced'

export interface ScoredExercise {
  id: string
  slug: string
  name: string
  category: string
  level: ExperienceLevel
  equipment: string
  primary_muscles: MuscleGroup[]
  secondary_muscles: MuscleGroup[]
  movement_pattern: string | null
  is_compound: boolean
  is_unilateral: boolean
  is_lower_body: boolean
}

export interface ScoringContext {
  goal: Goal
  experience: ExperienceLevel
  prioritizedMuscles: MuscleGroup[]
  userEquipment: string[]
  usedMovementPatterns: Set<string>
  usedMechanics: Set<string>
  selectedCount: number
}

function equipmentScore(exerciseEquipment: string, userEquipment: string[]): number {
  return userEquipment.includes(exerciseEquipment) ? 10 : 0
}

function targetMuscleScore(primaryMuscles: MuscleGroup[], prioritized: MuscleGroup[]): number {
  return primaryMuscles.some(m => prioritized.includes(m)) ? 8 : 4
}

function experienceScore(level: ExperienceLevel, userExp: ExperienceLevel): number {
  const order = ['beginner','intermediate','advanced']
  const diff = Math.abs(order.indexOf(level) - order.indexOf(userExp))
  return [10, 5, 0][diff] ?? 0
}

function compoundBonus(isCompound: boolean, goal: Goal, selectedCount: number): number {
  if (!isCompound) return 0
  const bonuses: Record<Goal, number[]> = {
    strength:       [4, 2],
    muscle_gain:    [2, 2],
    fat_loss:       [1, 1],
    general_fitness:[1, 1],
    recomposition:  [2, 2],
  }
  const b = bonuses[goal] ?? [1, 1]
  return selectedCount === 0 ? b[0] : b[1]
}

function varietyBonus(movementPattern: string | null, usedPatterns: Set<string>): number {
  if (!movementPattern) return 0
  return usedPatterns.has(movementPattern) ? 0 : 5
}

export function scoreExercise(ex: ScoredExercise, ctx: ScoringContext): number {
  return (
    equipmentScore(ex.equipment, ctx.userEquipment) +
    targetMuscleScore(ex.primary_muscles, ctx.prioritizedMuscles) +
    experienceScore(ex.level, ctx.experience) +
    compoundBonus(ex.is_compound, ctx.goal, ctx.selectedCount) +
    varietyBonus(ex.movement_pattern, ctx.usedMovementPatterns)
  )
}

// Equipment filter: maps equipment_enum to valid exercise equipment strings
export function EQUIPMENT_FILTER_MAP(): Record<string, string[]> {
  return {
    full_gym:        ['barbell','dumbbell','cable','machine','bands','kettlebells','medicine ball','exercise ball','body only','other','e-z curl bar','foam roll'],
    barbell_only:    ['barbell','body only'],
    dumbbells_only:  ['dumbbell','body only'],
    bodyweight_only: ['body only'],
    cables_machines: ['cable','machine','body only','dumbbell'],
    limited:         ['body only','dumbbell','bands'],
  }
}