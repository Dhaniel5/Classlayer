import type { GradeBand } from '@/types'

// Configurable grading structure — NOT hardcoded to one country's system.
// Change this array (or load it from Settings later) to alter grading school-wide.
export const defaultGradeBands: GradeBand[] = [
  { id: 'gb-a', label: 'A', min: 90, max: 100, remark: 'Excellent' },
  { id: 'gb-b', label: 'B', min: 80, max: 89, remark: 'Very Good' },
  { id: 'gb-c', label: 'C', min: 70, max: 79, remark: 'Good' },
  { id: 'gb-d', label: 'D', min: 60, max: 69, remark: 'Fair' },
  { id: 'gb-e', label: 'E', min: 50, max: 59, remark: 'Pass' },
  { id: 'gb-f', label: 'F', min: 0, max: 49, remark: 'Fail' },
]

export function gradeFor(percentage: number, bands: GradeBand[] = defaultGradeBands): GradeBand {
  const band = bands.find((b) => percentage >= b.min && percentage <= b.max)
  return band ?? bands[bands.length - 1]
}

export function percentageOf(score: number, max: number) {
  if (max <= 0) return 0
  return Math.round((score / max) * 1000) / 10
}
