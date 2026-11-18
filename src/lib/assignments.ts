import type { Assignment, AssignmentRecord } from '@/types'

export type OutcomeTone = 'success' | 'danger' | 'neutral'

/** How a student's work on an assignment should be shown (staff and parents). */
export function assignmentOutcome(a: Assignment, r?: AssignmentRecord): { label: string; tone: OutcomeTone } {
  if (!r) return { label: 'Not marked yet', tone: 'neutral' }
  if (r.status === 'not_done') return { label: 'Not done', tone: 'danger' }
  if (a.mode === 'score' && r.score !== null) return { label: `${r.score} / ${a.maxScore}`, tone: 'success' }
  return { label: 'Done', tone: 'success' }
}

export const tomorrowLocalISO = () => new Date(Date.now() + 864e5).toLocaleDateString('en-CA')
