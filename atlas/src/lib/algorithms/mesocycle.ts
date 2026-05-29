import { daysBetween } from './utils'

export interface MesocycleWeek {
  weekNumber: 1|2|3|4
  volumeMultiplier: number
  intensityTarget: string
}

export const MESOCYCLE_WEEKS: MesocycleWeek[] = [
  { weekNumber: 1, volumeMultiplier: 0.85, intensityTarget: '10-12' },
  { weekNumber: 2, volumeMultiplier: 1.00, intensityTarget: '8-10'  },
  { weekNumber: 3, volumeMultiplier: 1.10, intensityTarget: '6-8'   },
  { weekNumber: 4, volumeMultiplier: 0.55, intensityTarget: '10-12' },
]

export function currentMesocycleWeek(planStartDate: Date): MesocycleWeek {
  const weeksSinceStart = Math.floor(daysBetween(planStartDate, new Date()) / 7)
  return MESOCYCLE_WEEKS[weeksSinceStart % 4]
}

export function mesocyclePhaseIndex(planStartDate: Date): 1|2|3|4 {
  const weeksSinceStart = Math.floor(daysBetween(planStartDate, new Date()) / 7)
  return ((weeksSinceStart % 4) + 1) as 1|2|3|4
}