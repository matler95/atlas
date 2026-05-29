export function applyDeloadModifier(
  suggestedSets: number,
  deloadActive: boolean
): number {
  if (!deloadActive) return suggestedSets
  // Apply 0.5× multiplier, minimum 1 set, maximum unchanged
  return Math.max(1, Math.round(suggestedSets * 0.5))
}