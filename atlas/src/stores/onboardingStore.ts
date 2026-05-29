import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface OnboardingData {
  // Step 1
  name: string
  // Step 2
  goal: string
  // Step 3
  experience: string
  // Step 4
  gender: string
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  // Step 5
  equipment: string
  limited_equipment_items: string[]
  // Step 6
  gym_days_per_week: number | null
  session_length_minutes: number | null
  // Step 7
  training_style: string
  // Step 8
  include_abs: boolean
  abs_days: number[]
  // Step 9
  sleep_hours: number
  stress_level: number
  job_activity: string
  cardio_sessions_per_week: number
  activity_level: string
  // Step 10
  exercises_to_avoid: string[]
  prioritized_muscles: string[]
  // Auth (collected last)
  email: string
  password: string
  currentStep: number
}

interface OnboardingStore {
  data: Partial<OnboardingData>
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void
  setStep: (step: number) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      data: { currentStep: 1 },
      setField: (key, value) => set(state => ({ data: { ...state.data, [key]: value } })),
      setStep: (step) => set(state => ({ data: { ...state.data, currentStep: step } })),
      reset: () => set({ data: { currentStep: 1 } }),
    }),
    { name: 'atlas-onboarding', storage: createJSONStorage(() => sessionStorage) }
  )
)