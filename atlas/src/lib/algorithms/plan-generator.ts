import type { ScoredExercise, ScoringContext } from './exercise-scoring'
import { scoreExercise } from './exercise-scoring'

// Session time budget calculator (Section 5.4 approach)
export function maxExercisesForDuration(
  sessionMinutes: number,
  avgSetsPerExercise: number,
  avgRestSeconds: number,
  warmupMinutes = 10
): number {
  const workSecondsPerSet = 40
  const timePerExercise = avgSetsPerExercise * (workSecondsPerSet + avgRestSeconds)
  const availableSeconds = (sessionMinutes - warmupMinutes) * 60
  return Math.max(3, Math.min(10, Math.floor(availableSeconds / timePerExercise)))
}

export function predictSessionDuration(
  numExercises: number,
  avgSets: number,
  avgRestSeconds: number,
  warmupMinutes = 10
): number {
  const workSecondsPerSet = 40
  const totalSeconds = numExercises * avgSets * (workSecondsPerSet + avgRestSeconds)
  return Math.round(warmupMinutes + totalSeconds / 60)
}

// Iterative re-ranking: select N exercises from candidates using scoring context
export function selectExercisesForDay(
  candidates: ScoredExercise[],
  maxCount: number,
  baseContext: Omit<ScoringContext,'usedMovementPatterns'|'usedMechanics'|'selectedCount'>
): ScoredExercise[] {
  const selected: ScoredExercise[] = []
  const remaining = [...candidates]
  const ctx: ScoringContext = {
    ...baseContext,
    usedMovementPatterns: new Set(),
    usedMechanics: new Set(),
    selectedCount: 0,
  }
  while (selected.length < maxCount && remaining.length > 0) {
    let bestScore = -Infinity
    let bestIdx = 0
    remaining.forEach((ex, i) => {
      const s = scoreExercise(ex, ctx)
      if (s > bestScore) { bestScore = s; bestIdx = i }
    })
    const picked = remaining.splice(bestIdx, 1)[0]
    selected.push(picked)
    if (picked.movement_pattern) ctx.usedMovementPatterns.add(picked.movement_pattern)
    ctx.selectedCount++
  }
  return selected
}

// Split templates: maps training_style + days_per_week → day_type[]
export function getSplitTemplate(
  style: string,
  daysPerWeek: number
): string[] {
  const templates: Record<string, Record<number, string[]>> = {
    full_body: {
      2: ['full_body','full_body'],
      3: ['full_body','full_body','full_body'],
      4: ['full_body','full_body','full_body','full_body'],
      5: ['full_body','full_body','full_body','full_body','full_body'],
    },
    upper_lower: {
      4: ['upper','lower','upper','lower'],
      5: ['upper','lower','upper','lower','full_body'],
      6: ['upper','lower','upper','lower','upper','lower'],
    },
    push_pull_legs: {
      3: ['push','pull','legs'],
      4: ['push','pull','legs','full_body'],
      5: ['push','pull','legs','push','pull'],
      6: ['push','pull','legs','push','pull','legs'],
    },
    bodybuilding_split: {
      4: ['chest','back','shoulders','arms'],
      5: ['chest','back','legs','shoulders','arms'],
      6: ['chest','back','legs','shoulders','arms','abs'],
    },
  }
  return templates[style]?.[daysPerWeek] ?? ['full_body']
}