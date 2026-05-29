import { describe, it, expect } from 'vitest'
import { clamp, mean, lerp, linearRegressionSlope } from '../lib/algorithms/utils'
import { updateFitnessState, shouldDeload } from '../lib/algorithms/fatigue'
import { readinessScore, recoveryModifier } from '../lib/algorithms/readiness'
import { epley1RM, rpeAdjusted1RM, detectPlateau } from '../lib/algorithms/strength'
import { calcBMR, calcTDEE, calcTargetCalories, calcMacros } from '../lib/algorithms/nutrition'
import { calcWeeklyTargetSets, calcSetsReps, POPULATION_LANDMARKS } from '../lib/algorithms/volume'
import { bodyweightTrend, bodyweightVolumeModifier } from '../lib/algorithms/bodyweight-trend'
import { mesocyclePhaseIndex } from '../lib/algorithms/mesocycle'
import { applyDeloadModifier } from '../lib/deload'
import { getSplitTemplate } from '../lib/algorithms/plan-generator'
import { scoreExercise, type ScoredExercise, type ScoringContext } from '../lib/algorithms/exercise-scoring'

describe('Step 9: Utils', () => {
  it('clamp', () => {
    expect(clamp(0, 10, 15)).toBe(10)
    expect(clamp(0, 10, -1)).toBe(0)
    expect(clamp(0, 10, 5)).toBe(5)
  })
  it('mean', () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(mean([])).toBe(0)
  })
  it('lerp', () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
  it('linearRegressionSlope', () => {
    expect(linearRegressionSlope([1, 2, 3])).toBe(1)
  })
})

describe('Step 14: BMR pipeline', () => {
  it('calcBMR(80, 180, 30, male) = 1780', () => {
    expect(calcBMR(80, 180, 30, 'male')).toBe(1780)
  })
  it('calcTDEE(1780, moderate) = 2759', () => {
    expect(calcTDEE(1780, 'moderate')).toBe(2759)
  })
  it('calcTargetCalories for muscle_gain', () => {
    const target = calcTargetCalories(2759, 'muscle_gain', 18)
    expect(target).toBe(Math.round(2759 * 1.10))
  })
  it('calcMacros', () => {
    const m = calcMacros(2500, 70, true)
    expect(m.proteinG).toBe(154)
    expect(m.fatG).toBe(69)
    expect(m.carbsG).toBeGreaterThanOrEqual(0)
  })
})

describe('Step 13: Volume pipeline', () => {
  it('calcWeeklyTargetSets(chest, intermediate, null, 1.0, 1.0, 1.0) = 12', () => {
    expect(calcWeeklyTargetSets('chest', 'intermediate', null, 1.0, 1.0, 1.0)).toBe(12)
  })
  it('calcSetsReps', () => {
    const r = calcSetsReps(12, 2, 'muscle_gain', 2)
    expect(r.sets).toBeGreaterThanOrEqual(2)
    expect(r.repsMin).toBeLessThanOrEqual(12)
    expect(r.repsMax).toBeGreaterThanOrEqual(6)
    expect(r.restSeconds).toBe(120)
  })
  it('volumeBalanceScore', () => {
    const score = (() => {
      const sets = 11
      const l = POPULATION_LANDMARKS.chest
      if (sets < l.mev) return 30
      if (sets <= l.mav) return 100
      if (sets <= l.mrv) return 70
      return 40
    })()
    expect(score).toBe(100)
  })
})

describe('Step 12: e1RM pipeline', () => {
  it('epley1RM(100, 5) ≈ 116.67', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1)
  })
  it('rpeAdjusted1RM(100, 5, 8) ≈ 131.1', () => {
    expect(rpeAdjusted1RM(100, 5, 8)).toBeCloseTo(131.1, 0)
  })
  it('detectPlateau([100, 99, 98]) = plateau (-2% > -5% threshold)', () => {
    expect(detectPlateau([100, 99, 98])).toBe('plateau')
  })
  it('detectPlateau([100, 101, 102]) = progressing', () => {
    expect(detectPlateau([100, 101, 102])).toBe('progressing')
  })
})

describe('Step 10: Fatigue model', () => {
  it('updateFitnessState with high load → form < 0', () => {
    const state = updateFitnessState({ fitness: 0, fatigue: 0, form: 0 }, 1000)
    expect(state.form).toBeLessThan(0)
  })
  it('shouldDeload with form < -30', () => {
    expect(shouldDeload({ fitness: 10, fatigue: 20, form: -31 })).toBe(true)
  })
})

describe('Step 11: Readiness', () => {
  it('readinessScore with good state', () => {
    const score = readinessScore({ fitness: 30, fatigue: 20, form: 10 }, 4.0, 7.5)
    expect(score).toBeGreaterThanOrEqual(60)
    expect(score).toBeLessThanOrEqual(100)
  })
  it('recoveryModifier(desk, low stress) = 1.0', () => {
    expect(recoveryModifier(8, 2, 'desk')).toBe(1.0)
  })
  it('recoveryModifier(physical, high stress) = 0.75', () => {
    expect(recoveryModifier(4, 5, 'physical')).toBe(0.75)
  })
})

describe('Step 16: Bodyweight trend', () => {
  it('empty logs = insufficient_data', () => {
    expect(bodyweightTrend([]).signal).toBe('insufficient_data')
  })
  it('declining weights = rapid_loss', () => {
    const logs = Array.from({ length: 7 }, (_, i) => ({
      date: `2025-01-${(i + 1).toString().padStart(2, '0')}`,
      weight_kg: 80 - i,
    }))
    expect(bodyweightTrend(logs).signal).toBe('rapid_loss')
  })
  it('bodyweightVolumeModifier(rapid_loss) = 0.85', () => {
    expect(bodyweightVolumeModifier('rapid_loss')).toBe(0.85)
  })
})

describe('Step 16: Mesocycle', () => {
  it('plan started today = week 1', () => {
    const week = mesocyclePhaseIndex(new Date())
    expect(week).toBe(1)
  })
  it('plan started 7 days ago = week 2', () => {
    const week = mesocyclePhaseIndex(new Date(Date.now() - 7 * 86400000))
    expect(week).toBe(2)
  })
})

describe('Step 43: Deload', () => {
  it('applyDeloadModifier(4, true) = 2', () => {
    expect(applyDeloadModifier(4, true)).toBe(2)
  })
  it('applyDeloadModifier(4, false) = 4', () => {
    expect(applyDeloadModifier(4, false)).toBe(4)
  })
})

describe('Step 15: Split templates', () => {
  it('push_pull_legs 3 days', () => {
    expect(getSplitTemplate('push_pull_legs', 3)).toEqual(['push', 'pull', 'legs'])
  })
  it('unknown style defaults to full_body', () => {
    expect(getSplitTemplate('unknown', 2)).toEqual(['full_body'])
  })
})

describe('Step 15: Exercise scoring', () => {
  it('compound beats isolation for strength', () => {
    const bench: ScoredExercise = {
      id: '1', slug: 'bench', name: 'Bench Press', category: 'strength',
      level: 'intermediate', equipment: 'barbell',
      primary_muscles: ['chest'], secondary_muscles: ['triceps'],
      movement_pattern: 'horizontal_push', is_compound: true,
      is_unilateral: false, is_lower_body: false,
    }
    const flye: ScoredExercise = {
      id: '2', slug: 'flye', name: 'Cable Flye', category: 'strength',
      level: 'intermediate', equipment: 'cable',
      primary_muscles: ['chest'], secondary_muscles: [],
      movement_pattern: 'horizontal_push', is_compound: false,
      is_unilateral: false, is_lower_body: false,
    }
    const ctx: ScoringContext = {
      goal: 'strength', experience: 'intermediate',
      prioritizedMuscles: ['chest'], userEquipment: ['barbell', 'cable'],
      usedMovementPatterns: new Set(), usedMechanics: new Set(), selectedCount: 0,
    }
    expect(scoreExercise(bench, ctx)).toBeGreaterThan(scoreExercise(flye, ctx))
  })
})