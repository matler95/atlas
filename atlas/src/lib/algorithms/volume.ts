import { clamp, lerp } from './utils'

export type MuscleGroup =
  'abdominals'|'abductors'|'adductors'|'biceps'|'calves'|'chest'|'forearms'|'glutes'|
  'hamstrings'|'lats'|'lower_back'|'middle_back'|'neck'|'quadriceps'|'shoulders'|'traps'|'triceps'

export interface VolumeLandmarks {
  mev: number
  mav: number
  mrv: number
  confidence: number
}

export const POPULATION_LANDMARKS: Record<MuscleGroup, Omit<VolumeLandmarks,'confidence'>> = {
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
  abductors:   { mev: 6,  mav: 10, mrv: 14 },
  adductors:   { mev: 6,  mav: 10, mrv: 14 },
  forearms:    { mev: 4,  mav: 8,  mrv: 12 },
  lower_back:  { mev: 6,  mav: 10, mrv: 14 },
  middle_back: { mev: 6,  mav: 10, mrv: 14 },
  neck:        { mev: 0,  mav: 4,  mrv: 8  },
  traps:       { mev: 6,  mav: 10, mrv: 14 },
}

export function experienceVolumeMultiplier(experience: 'beginner'|'intermediate'|'advanced'): number {
  return { beginner: 0.7, intermediate: 1.0, advanced: 1.15 }[experience]
}

export function calcWeeklyTargetSets(
  muscle: MuscleGroup,
  experience: 'beginner'|'intermediate'|'advanced',
  personalLandmarks: VolumeLandmarks | null,
  fatigueMod: number,
  recoveryMod: number,
  bwVolumeModifier: number
): number {
  const pop = POPULATION_LANDMARKS[muscle]
  const expMult = experienceVolumeMultiplier(experience)
  const mev = pop.mev * expMult
  const mav = pop.mav * expMult
  const target = mev + (mav - mev) * 0.5
  const blended = personalLandmarks && personalLandmarks.confidence > 0.5
    ? lerp(target, personalLandmarks.mev + (personalLandmarks.mav - personalLandmarks.mev) * 0.5, personalLandmarks.confidence)
    : target
  return Math.round(blended * fatigueMod * recoveryMod * bwVolumeModifier)
}

export function calcSetsReps(
  weeklyTargetSets: number,
  numExercisesForMuscle: number,
  goal: string,
  periodizationPhase: number  // 1|2|3|4 mesocycle week
): { sets: number; repsMin: number; repsMax: number; restSeconds: number } {
  const perExercise = clamp(2, 5, Math.round(weeklyTargetSets / Math.max(1, numExercisesForMuscle)))
  const mesocycle = [
    { volumeMultiplier: 0.85, repsMin: 10, repsMax: 12 },
    { volumeMultiplier: 1.00, repsMin: 8,  repsMax: 10 },
    { volumeMultiplier: 1.10, repsMin: 6,  repsMax: 8  },
    { volumeMultiplier: 0.55, repsMin: 10, repsMax: 12 },
  ][((periodizationPhase - 1) % 4)]
  const sets = clamp(2, 5, Math.round(perExercise * mesocycle.volumeMultiplier))
  const goalRanges: Record<string, [number, number, number]> = {
    strength:       [1,  5,  180],
    muscle_gain:    [6,  12, 120],
    fat_loss:       [12, 20, 60 ],
    general_fitness:[8,  15, 90 ],
    recomposition:  [8,  12, 90 ],
  }
  const [gMin, gMax, rest] = goalRanges[goal] ?? [8, 12, 90]
  return {
    sets,
    repsMin: Math.min(mesocycle.repsMin, gMax),
    repsMax: Math.max(mesocycle.repsMax, gMin),
    restSeconds: rest
  }
}

export function volumeBalanceScore(plannedSets: number, landmarks: Omit<VolumeLandmarks,'confidence'>): number {
  if (plannedSets === 0) return 0
  if (plannedSets < landmarks.mev) return 30
  if (plannedSets <= landmarks.mav) return 100
  if (plannedSets <= landmarks.mrv) return 70
  return 40
}