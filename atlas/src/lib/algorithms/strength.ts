export const rpePercentage: Record<number, number> = {
  10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91,
  8: 0.89,  7.5: 0.86, 7: 0.83, 6.5: 0.80, 6: 0.77
}

export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps > 12)  return weight
  return weight * (1 + reps / 30)
}

export function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const epleyMax = epley1RM(weight, reps)
  const rpePct = rpePercentage[rpe] ?? rpePercentage[Math.round(rpe * 2) / 2] ?? null
  if (!rpePct) return epleyMax
  return epleyMax / rpePct
}

export interface SessionSetForE1RM {
  weight_kg: number
  reps: number
  rpe: number | null
}

export function sessionE1RM(sets: SessionSetForE1RM[]): number {
  const validSets = sets.filter(s => s.rpe !== null && s.reps > 0)
  if (validSets.length === 0) {
    const best = sets.filter(s => s.reps > 0)
    if (best.length === 0) return 0
    return Math.max(...best.map(s => epley1RM(s.weight_kg, s.reps)))
  }
  return Math.max(...validSets.map(s => rpeAdjusted1RM(s.weight_kg, s.reps, s.rpe!)))
}

export function detectPlateau(e1rmHistory: number[]): 'progressing' | 'plateau' | 'regression' {
  if (e1rmHistory.length < 3) return 'progressing'
  const recent = e1rmHistory.slice(-3)
  const trend = (recent[2] - recent[0]) / recent[0]
  if (trend > 0.01)  return 'progressing'
  if (trend > -0.05) return 'plateau'
  return 'regression'
}