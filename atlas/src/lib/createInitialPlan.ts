import { supabase } from './supabase'
import { estimateBodyFatBMI, leanBodyMass } from './algorithms/nutrition'
import { calcWeeklyTargetSets, calcSetsReps } from './algorithms/volume'
import { estimateStartingWeight } from './algorithms/starting-weight'
import { getSplitTemplate } from './algorithms/plan-generator'
import { assessPlanQuality } from './algorithms/plan-quality'
import { POPULATION_LANDMARKS } from './algorithms/volume'
import type { OnboardingData } from '@/stores/onboardingStore'
import type { ScoredExercise } from './algorithms/exercise-scoring'

export async function createInitialPlan(
  data: Partial<OnboardingData>,
  selectedExercisesByDay: Record<string, string[]>
) {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 1. Insert user_profile
  const { error: profileError } = await db.from('user_profiles').upsert({
    id: userId,
    name: data.name ?? '',
    goal: data.goal as never,
    experience: data.experience as never,
    gender: data.gender as never,
    age: data.age ?? 0,
    height_cm: data.height_cm ?? 0,
    weight_kg: data.weight_kg ?? 0,
    equipment: data.equipment as never,
    limited_equipment_items: data.limited_equipment_items ?? [],
    gym_days_per_week: data.gym_days_per_week ?? 3,
    session_length_minutes: data.session_length_minutes ?? 60,
    training_style: data.training_style as never,
    include_abs: data.include_abs ?? false,
    abs_days: data.abs_days ?? [],
    sleep_hours: data.sleep_hours ?? 7,
    stress_level: data.stress_level ?? 2,
    job_activity: data.job_activity as never,
    cardio_sessions_per_week: data.cardio_sessions_per_week ?? 0,
    activity_level: data.activity_level as never,
    prioritized_muscles: (data.prioritized_muscles ?? []) as never,
    onboarding_completed: true,
  })
  if (profileError) throw profileError

  // 2. Determine periodization
  const exp = data.experience ?? 'beginner'
  const goal = data.goal ?? 'muscle_gain'
  let periodization: 'linear' | 'undulating' | 'block' = 'linear'
  if (exp === 'beginner') periodization = 'linear'
  else if (exp === 'intermediate' && goal === 'strength') periodization = 'block'
  else if (exp === 'intermediate') periodization = 'undulating'
  else periodization = 'block'

  // 3. Insert workout_plan
  const { data: plan, error: planError } = await db
    .from('workout_plans')
    .insert({
      user_id: userId,
      name: `${goal.replace(/_/g, ' ')} Plan`,
      goal: goal as never,
      experience: exp as never,
      training_style: data.training_style as never,
      days_per_week: data.gym_days_per_week ?? 3,
      session_length_minutes: data.session_length_minutes ?? 60,
      periodization,
      is_active: true,
      start_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()
  if (planError) throw planError

  // 4. Create workout_days and exercises
  const style = data.training_style ?? 'full_body'
  const days = data.gym_days_per_week ?? 3
  const dayTypes = getSplitTemplate(style, days)

  // Assign days of week (Mon=1, Wed=3, Fri=5, etc.)
  const gymDaysMap = [1, 3, 5, 0, 2, 4, 6] // Mon, Wed, Fri, Sun, Tue, Thu, Sat

  const bmi = (data.weight_kg ?? 0) / ((data.height_cm ?? 180) / 100) ** 2
  const bfPct = estimateBodyFatBMI(data.weight_kg ?? 0, data.height_cm ?? 180, data.gender as never)
  const lbm = leanBodyMass(data.weight_kg ?? 0, bfPct)

  const allDayExercises: Array<{ exercise: ScoredExercise; sets: number }>[] = []

  for (let i = 0; i < dayTypes.length; i++) {
    const dayType = dayTypes[i]
    const dayOfWeek = gymDaysMap[i % 7]

    const { data: workoutDay, error: dayError } = await db
      .from('workout_days')
      .insert({
        plan_id: plan.id,
        day_of_week: dayOfWeek,
        day_type: dayType as never,
        order_index: i,
      })
      .select()
      .single()
    if (dayError) throw dayError

    const exerciseIds = selectedExercisesByDay[dayType] ?? selectedExercisesByDay[String(i)] ?? []

    // Load exercises for volume calculation
    const { data: exercisesData } = await db
      .from('exercises')
      .select('*')
      .in('id', exerciseIds.length > 0 ? exerciseIds : ['none'])

    const dayExercises: Array<{ exercise: ScoredExercise; sets: number }> = []

    for (let j = 0; j < (exercisesData ?? []).length; j++) {
      const ex = (exercisesData ?? [])[j] as unknown as ScoredExercise
      const primaryMuscle = ex.primary_muscles[0] as never

      const weeklySets = primaryMuscle && POPULATION_LANDMARKS[primaryMuscle as keyof typeof POPULATION_LANDMARKS]
        ? calcWeeklyTargetSets(primaryMuscle as never, exp as never, null, 1.0, 1.0, 1.0)
        : 10

      const { sets, repsMin, repsMax, restSeconds } = calcSetsReps(
        weeklySets, 2, goal as string, 1
      )

      const isBodyweight = ex.equipment === 'body only'
      const suggestedWeight = estimateStartingWeight(
        ex.slug, exp as never, lbm, bmi, isBodyweight
      )

      await db.from('workout_day_exercises').insert({
        workout_day_id: workoutDay.id,
        exercise_id: ex.id,
        order_index: j,
        suggested_sets: sets,
        suggested_reps_min: repsMin,
        suggested_reps_max: repsMax,
        suggested_weight_kg: isBodyweight ? null : suggestedWeight,
        rest_seconds: restSeconds,
      })

      dayExercises.push({ exercise: ex, sets })
    }

    allDayExercises.push(dayExercises)
  }

  // 5. Seed volume landmarks
  const majorMuscles = ['chest', 'quadriceps', 'hamstrings', 'shoulders', 'lats', 'biceps', 'triceps', 'glutes', 'calves', 'abdominals']
  for (const muscle of majorMuscles) {
    const pop = POPULATION_LANDMARKS[muscle as keyof typeof POPULATION_LANDMARKS]
    if (pop) {
      await db.from('user_volume_landmarks').upsert({
        user_id: userId,
        muscle_group: muscle as never,
        mev: pop.mev,
        mav: pop.mav,
        mrv: pop.mrv,
        confidence: 0,
      }, { onConflict: 'user_id,muscle_group' })
    }
  }

  // 6. Compute plan quality
  const quality = assessPlanQuality(
    allDayExercises,
    [data.equipment ?? 'full_gym'],
    goal as string,
    days,
    data.session_length_minutes ?? 60
  )
  await db.from('plan_quality_scores').insert({
    plan_id: plan.id,
    overall_score: quality.overallScore,
    equipment_coverage: quality.equipmentCoverage,
    volume_balance: quality.volumeBalance,
    recovery_fit: quality.recoveryFit,
    goal_alignment: quality.goalAlignment,
    warnings: quality.warnings,
  })

  return plan
}