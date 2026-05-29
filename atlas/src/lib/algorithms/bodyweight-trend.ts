import { linearRegressionSlope } from './utils'

export interface BodyweightLog {
  date: string
  weight_kg: number
}

export type BwSignal = 'bulk'|'cut'|'maintain'|'rapid_loss'|'insufficient_data'

export function bodyweightTrend(logs: BodyweightLog[]): { weeklyRateKg: number; signal: BwSignal } {
  const recent = logs.slice(-14).sort((a, b) => a.date.localeCompare(b.date))
  if (recent.length < 5) return { weeklyRateKg: 0, signal: 'insufficient_data' }
  const weeklyRate = linearRegressionSlope(recent.map(l => l.weight_kg)) * 7
  if (weeklyRate < -0.75) return { weeklyRateKg: weeklyRate, signal: 'rapid_loss' }
  if (weeklyRate < -0.2)  return { weeklyRateKg: weeklyRate, signal: 'cut' }
  if (weeklyRate > 0.5)   return { weeklyRateKg: weeklyRate, signal: 'bulk' }
  return { weeklyRateKg: weeklyRate, signal: 'maintain' }
}

export function bodyweightVolumeModifier(signal: BwSignal): number {
  return { rapid_loss: 0.85, cut: 0.90, maintain: 1.0, bulk: 1.05, insufficient_data: 1.0 }[signal] ?? 1.0
}