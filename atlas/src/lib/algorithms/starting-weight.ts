type ExperienceLevel = 'beginner'|'intermediate'|'advanced'

// Coefficients: (exercise_slug_pattern → [beginner, intermediate, advanced]) - 1RM bodyweight multipliers
// Applied to lean body mass, not total bodyweight
const STRENGTH_COEFFICIENTS: Record<string, [number, number, number]> = {
  squat:           [0.75, 1.25, 1.75],
  bench_press:     [0.55, 0.90, 1.25],
  deadlift:        [1.00, 1.50, 2.00],
  overhead_press:  [0.35, 0.60, 0.85],
  barbell_row:     [0.50, 0.85, 1.15],
  default:         [0.40, 0.70, 1.00],
}

function getCoefficient(exerciseSlug: string, experience: ExperienceLevel): number {
  const slug = exerciseSlug.toLowerCase()
  let key = 'default'
  if (slug.includes('squat')) key = 'squat'
  else if (slug.includes('bench')) key = 'bench_press'
  else if (slug.includes('deadlift')) key = 'deadlift'
  else if (slug.includes('overhead_press') || slug.includes('ohp') || slug.includes('military')) key = 'overhead_press'
  else if (slug.includes('barbell_row') || slug.includes('bent_over_row')) key = 'barbell_row'
  const expIdx = { beginner: 0, intermediate: 1, advanced: 2 }[experience]
  return STRENGTH_COEFFICIENTS[key][expIdx]
}

export function estimateStartingWeight(
  exerciseSlug: string,
  experience: ExperienceLevel,
  leanBodyMassKg: number,
  bmi: number,
  isBodyweight: boolean
): number {
  if (isBodyweight) return 0  // bodyweight exercises: weight = 0
  const bmiAdjustment = bmi > 30 ? 0.75 : 1.0
  const coeff = getCoefficient(exerciseSlug, experience)
  const estimated1RM = leanBodyMassKg * coeff * bmiAdjustment
  // Working weight = 75% of estimated 1RM (conservative)
  const workingWeight = estimated1RM * 0.75
  // Round to nearest 2.5kg
  return Math.round(workingWeight / 2.5) * 2.5
}