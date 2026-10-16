import type { Assessment, AssessmentScore, Result, School, Student } from '@/types'
import { gradeFor, percentageOf } from '@/lib/grading'

/**
 * Results are DERIVED from assessment scores (never stored), so they can never
 * disagree with the scores. Only the school's current term + session are included.
 */
export function buildResults(
  students: Student[],
  assessments: Assessment[],
  scores: AssessmentScore[],
  school: Pick<School, 'currentTerm' | 'currentSession'>
): Result[] {
  const current = assessments.filter((a) => a.term === school.currentTerm && a.session === school.currentSession)
  const byClassSubject = new Map<string, Assessment[]>()
  current.forEach((a) => {
    const k = `${a.classId}|${a.subjectId}`
    byClassSubject.set(k, [...(byClassSubject.get(k) ?? []), a])
  })
  const scoreKey = new Map<string, number>()
  scores.forEach((s) => scoreKey.set(`${s.assessmentId}|${s.studentId}`, s.score))

  const out: Result[] = []
  students.forEach((st) => {
    byClassSubject.forEach((list, key) => {
      const [classId, subjectId] = key.split('|')
      if (classId !== st.classId) return
      let total = 0, max = 0
      list.forEach((a) => {
        const sc = scoreKey.get(`${a.id}|${st.id}`)
        if (sc !== undefined) { total += sc; max += a.maxScore }
      })
      if (max === 0) return
      const pct = percentageOf(total, max)
      const band = gradeFor(pct)
      out.push({
        studentId: st.id, classId, subjectId,
        term: school.currentTerm, session: school.currentSession,
        totalScore: total, maxPossible: max, percentage: pct,
        grade: band.label, remark: band.remark,
      })
    })
  })
  return out
}
