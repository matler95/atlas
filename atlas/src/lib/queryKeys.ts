export const queryKeys = {
  exercises: { all: ['exercises'] as const, filtered: (filters: object) => ['exercises', filters] as const },
  profile: (userId: string) => ['profile', userId] as const,
  activePlan: (userId: string) => ['activePlan', userId] as const,
  workoutDays: (planId: string) => ['workoutDays', planId] as const,
  dayExercises: (dayId: string) => ['dayExercises', dayId] as const,
  sessions: (userId: string) => ['sessions', userId] as const,
  sessionSets: (sessionId: string) => ['sessionSets', sessionId] as const,
  fitnessSnapshots: (userId: string) => ['fitnessSnapshots', userId] as const,
  e1rmHistory: (userId: string, exerciseId: string) => ['e1rm', userId, exerciseId] as const,
  bodyweightLogs: (userId: string) => ['bodyweightLogs', userId] as const,
  volumeLandmarks: (userId: string) => ['volumeLandmarks', userId] as const,
  planQuality: (planId: string) => ['planQuality', planId] as const,
}