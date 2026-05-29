// Movement pattern assignment rules for exercises
// Manual overrides can be added here; programmatic rules applied for unmapped slugs

export type MovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'hip_hinge'
  | 'squat'
  | 'carry'
  | 'core'
  | 'unilateral'

// Manual overrides: slug → movement pattern
// Add specific exercise slugs here to override programmatic rules
export const MANUAL_MOVEMENT_PATTERNS: Record<string, MovementPattern> = {
  // Example overrides (uncomment/add as needed):
  // 'Bench_Press': 'horizontal_push',
  // 'Barbell_Squat_Parallel': 'squat',
  // 'Deadlift': 'hip_hinge',
}

// Lower body muscles used for is_lower_body derivation
export const LOWER_BODY_MUSCLES = [
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'
]

// Unilateral name patterns for is_unilateral derivation
export const UNILATERAL_PATTERNS = [
  'single', 'unilateral', 'one-arm', 'one arm', 'one-leg', 'one leg',
  'lunge', 'split squat', 'step-up', 'pistol', 'bulgarian'
]

/**
 * Programmatic movement pattern derivation
 * Applied when no manual override exists for a slug
 */
export function deriveMovementPattern(
  slug: string,
  name: string,
  primaryMuscles: string[],
  force: string | null,
  mechanic: string | null
): MovementPattern | null {
  // Check manual overrides first
  if (MANUAL_MOVEMENT_PATTERNS[slug]) {
    return MANUAL_MOVEMENT_PATTERNS[slug]
  }

  const nameLower = name.toLowerCase()

  // Unilateral check by name
  if (UNILATERAL_PATTERNS.some(p => nameLower.includes(p))) {
    return 'unilateral'
  }

  // Core (abdominals)
  if (primaryMuscles.includes('abdominals')) {
    return 'core'
  }

  // Chest + push + compound
  if (primaryMuscles.includes('chest') && force === 'push' && mechanic === 'compound') {
    if (nameLower.includes('incline') || nameLower.includes('decline') ||
        nameLower.includes('bench') || nameLower.includes('fly') ||
        nameLower.includes('push-up') || nameLower.includes('pushup') ||
        nameLower.includes('dip')) {
      // Horizontal push for bench/fly/push-up, vertical for overhead
      if (nameLower.includes('overhead') || nameLower.includes('military') ||
          nameLower.includes('shoulder press')) {
        return 'vertical_push'
      }
      return 'horizontal_push'
    }
    return 'horizontal_push'
  }

  // Lats + pull
  if (primaryMuscles.includes('lats') && force === 'pull') {
    if (nameLower.includes('pulldown') || nameLower.includes('pull-up') ||
        nameLower.includes('pullup') || nameLower.includes('chin')) {
      return 'vertical_pull'
    }
    return 'horizontal_pull'
  }

  // Middle back / traps + pull
  if ((primaryMuscles.includes('middle back') || primaryMuscles.includes('traps')) && force === 'pull') {
    return 'horizontal_pull'
  }

  // Hamstrings + compound
  if (primaryMuscles.includes('hamstrings') && mechanic === 'compound') {
    return 'hip_hinge'
  }

  // Quadriceps + compound
  if (primaryMuscles.includes('quadriceps') && mechanic === 'compound') {
    return 'squat'
  }

  // Shoulders + push
  if (primaryMuscles.includes('shoulders') && force === 'push') {
    return 'vertical_push'
  }

  // Shoulders + pull
  if (primaryMuscles.includes('shoulders') && force === 'pull') {
    return 'horizontal_pull'
  }

  // Chest + push (non-compound)
  if (primaryMuscles.includes('chest') && force === 'push') {
    return 'horizontal_push'
  }

  // Biceps / triceps isolation
  if (primaryMuscles.includes('biceps') && mechanic === 'isolation') {
    return 'horizontal_pull'
  }
  if (primaryMuscles.includes('triceps') && mechanic === 'isolation') {
    return 'horizontal_push'
  }

  return null
}