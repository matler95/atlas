export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(0, 1, t)
}

export function linearRegressionSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = mean(values)
  const numerator = values.reduce((s, y, x) => s + (x - xMean) * (y - yMean), 0)
  const denominator = values.reduce((s, _, x) => s + (x - xMean) ** 2, 0)
  return denominator === 0 ? 0 : numerator / denominator
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}