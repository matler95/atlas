import { create } from 'zustand'

interface ActiveSet {
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rpe: number | null
  completed: boolean
}

interface WorkoutSessionState {
  sessionId: string | null
  currentExerciseIndex: number
  currentSetIndex: number
  sets: ActiveSet[]
  restTimerActive: boolean
  restTimerSecondsRemaining: number
  restTimerTotal: number
  isWarmup: boolean
  phase: 'warmup' | 'workout' | 'feedback' | 'complete'
  // Actions
  initSession: (sessionId: string, exercises: Array<{ id: string; sets: number; repsMin: number; repsMax: number; weightKg: number | null }>) => void
  completeSet: (set: Omit<ActiveSet, 'completed'>) => void
  startRestTimer: (seconds: number) => void
  tickTimer: () => void
  stopTimer: () => void
  goToNextExercise: () => void
  overrideExercise: (index: number) => void
  setPhase: (phase: WorkoutSessionState['phase']) => void
  reset: () => void
}

export const useWorkoutSessionStore = create<WorkoutSessionState>(set => ({
  sessionId: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  sets: [],
  restTimerActive: false,
  restTimerSecondsRemaining: 0,
  restTimerTotal: 0,
  isWarmup: false,
  phase: 'warmup',
  initSession: (sessionId, exercises) => set({
    sessionId,
    sets: exercises.flatMap(ex =>
      Array.from({ length: ex.sets }, (_, i) => ({
        exerciseId: ex.id,
        setNumber: i + 1,
        reps: ex.repsMax,
        weightKg: ex.weightKg ?? 0,
        rpe: null,
        completed: false,
      }))
    ),
    phase: 'warmup',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
  }),
  completeSet: (s) => set(state => ({
    sets: state.sets.map(existing =>
      existing.exerciseId === s.exerciseId && existing.setNumber === s.setNumber
        ? { ...s, completed: true }
        : existing
    ),
  })),
  startRestTimer: (seconds) => set({ restTimerActive: true, restTimerSecondsRemaining: seconds, restTimerTotal: seconds }),
  tickTimer: () => set(state => ({
    restTimerSecondsRemaining: Math.max(0, state.restTimerSecondsRemaining - 1),
    restTimerActive: state.restTimerSecondsRemaining > 1,
  })),
  stopTimer: () => set({ restTimerActive: false, restTimerSecondsRemaining: 0 }),
  goToNextExercise: () => set(state => ({ currentExerciseIndex: state.currentExerciseIndex + 1, currentSetIndex: 0 })),
  overrideExercise: (index) => set({ currentExerciseIndex: index }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({ sessionId: null, currentExerciseIndex: 0, currentSetIndex: 0, sets: [], phase: 'warmup', restTimerActive: false }),
}))