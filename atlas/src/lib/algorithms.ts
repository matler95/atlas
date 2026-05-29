// Placeholder algorithms. Replace with real implementations.
// See algorithm_doc.md.

export type Goal = "build_muscle" | "lose_fat" | "get_stronger" | "general_fitness" | "endurance";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "full_gym" | "limited" | "bodyweight";
export type Split = "full_body" | "upper_lower" | "push_pull_legs" | "bro_split";

export interface UserProfile {
  name: string;
  goal: Goal;
  experience: Experience;
  gender: "male" | "female" | "other";
  age: number;
  height: number; // cm
  weight: number; // kg
  equipment: Equipment;
  equipmentDetails?: string;
  daysPerWeek: number;
  sessionLength: number; // minutes
  split: Split;
  abs: "all" | "some" | "none";
  sleep: number;
  stress: 1 | 2 | 3 | 4 | 5;
  jobActivity: "sedentary" | "moderate" | "active";
  cardioSessions: number;
  history?: string;
}

// Predict session length from number of exercises.
// 3 working sets per exercise, 2 min rest, ~45s/set, + 10 min warmup/stretch.
export function predictSessionLength(numExercises: number, setsPerExercise = 3): number {
  const warmup = 10;
  const perSet = 0.75 + 2; // 45s execution + 2 min rest
  return Math.round(warmup + numExercises * setsPerExercise * perSet);
}

// Calculate sets / reps based on goal + experience.
export function calcSetsReps(goal: Goal, experience: Experience) {
  const base = {
    build_muscle: { sets: 4, reps: "8–12" },
    get_stronger: { sets: 5, reps: "3–6" },
    lose_fat: { sets: 3, reps: "12–15" },
    endurance: { sets: 3, reps: "15–20" },
    general_fitness: { sets: 3, reps: "10–12" },
  }[goal];
  if (experience === "beginner") return { ...base, sets: Math.max(2, base.sets - 1) };
  if (experience === "advanced") return { ...base, sets: base.sets + 1 };
  return base;
}

// Suggest next weight (progressive overload). Placeholder.
export function suggestNextWeight(lastWeight: number, completedAllReps: boolean): number {
  if (!completedAllReps) return lastWeight;
  // +2.5kg upper body / +5kg lower body - naive 2.5% bump here.
  return Math.round((lastWeight + Math.max(2.5, lastWeight * 0.025)) * 2) / 2;
}

// Workout quality 0–100 based on muscle coverage. Placeholder.
export function workoutQuality(muscleCoverage: string[]): number {
  const target = 5;
  return Math.min(100, Math.round((muscleCoverage.length / target) * 100));
}

// Compute per-muscle intensity (0..1+) for a given workout from its exercises.
// Each exercise contributes 1.0 to primary muscles and 0.5 to secondary.
// Result is normalized vs. a per-split target (e.g. ~2 exercises per primary group).
import { EXERCISES, type PlannedWorkout } from "@/lib/mock-data";
import { muscleLabelsToKeys, type MuscleKey } from "@/components/MuscleMap";

export function computeWorkoutIntensities(workout: PlannedWorkout): Partial<Record<MuscleKey, number>> {
  const tally: Partial<Record<MuscleKey, number>> = {};
  for (const id of workout.exerciseIds) {
    const ex = EXERCISES.find((e) => e.id === id);
    if (!ex) continue;
    for (const k of muscleLabelsToKeys(ex.primaryMuscles)) tally[k] = (tally[k] ?? 0) + 1;
    for (const k of muscleLabelsToKeys(ex.secondaryMuscles)) tally[k] = (tally[k] ?? 0) + 0.5;
  }
  // Normalize: 2 "primary hits" = full intensity.
  const out: Partial<Record<MuscleKey, number>> = {};
  for (const [k, v] of Object.entries(tally)) out[k as MuscleKey] = Math.min(1.2, (v as number) / 2);
  return out;
}

// Quality score 0–100 for a workout based on coverage of its expected muscle targets.
export function computeWorkoutQuality(workout: PlannedWorkout): number {
  const targetsBySplit: Record<PlannedWorkout["type"], MuscleKey[]> = {
    Push: ["chest", "front_delts", "side_delts", "triceps"],
    Pull: ["lats", "mid_back", "biceps", "rear_delts"],
    Legs: ["quads", "hamstrings", "glutes", "calves"],
    Upper: ["chest", "lats", "front_delts", "biceps", "triceps"],
    Lower: ["quads", "hamstrings", "glutes", "calves"],
    "Full Body": ["chest", "lats", "quads", "hamstrings", "front_delts"],
  };
  const intensities = computeWorkoutIntensities(workout);
  const targets = targetsBySplit[workout.type];
  const hit = targets.filter((k) => (intensities[k] ?? 0) >= 0.5).length;
  return Math.round((hit / targets.length) * 100);
}

// Readiness score 0–100. Placeholder.
export function readinessScore(sleep: number, stress: number, recentVolume: number): number {
  const s = Math.min(1, sleep / 8) * 50;
  const st = (6 - stress) * 8;
  const v = Math.max(0, 30 - recentVolume / 100);
  return Math.round(Math.min(100, s + st + v));
}