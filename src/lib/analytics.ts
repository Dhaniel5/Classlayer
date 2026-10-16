import type {
  Class, Student, AttendanceRecord, Result, Fee, Subject, Assessment, AssessmentScore,
} from '@/types'

export function attendanceRateForClass(classId: string, records: AttendanceRecord[]): number | null {
  const classRecords = records.filter((r) => r.classId === classId)
  if (classRecords.length === 0) return null
  let present = 0
  let total = 0
  classRecords.forEach((r) => {
    r.entries.forEach((e) => {
      total++
      if (e.status !== 'Absent') present++
    })
  })
  return total === 0 ? null : Math.round((present / total) * 100)
}

export function last7DaysAttendance(records: AttendanceRecord[]) {
  const dates = Array.from(new Set(records.map((r) => r.date))).sort().slice(-7)
  return dates.map((date) => {
    const dayRecords = records.filter((r) => r.date === date)
    let present = 0, absent = 0, late = 0
    dayRecords.forEach((r) => {
      r.entries.forEach((e) => {
        if (e.status === 'Present') present++
        else if (e.status === 'Absent') absent++
        else late++
      })
    })
    const d = new Date(date)
    return {
      day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      Present: present,
      Absent: absent,
      Late: late,
    }
  })
}

export function classAverage(classId: string, results: Result[]): number {
  const rel = results.filter((r) => r.classId === classId && r.maxPossible > 0)
  if (rel.length === 0) return 0
  return Math.round(rel.reduce((s, r) => s + r.percentage, 0) / rel.length)
}

export function classPerformanceSeries(classes: Class[], results: Result[]) {
  return classes.map((c) => ({ name: c.name, average: classAverage(c.id, results) }))
}

export function subjectAverage(subjectId: string, results: Result[]): number {
  const rel = results.filter((r) => r.subjectId === subjectId && r.maxPossible > 0)
  if (rel.length === 0) return 0
  return Math.round(rel.reduce((s, r) => s + r.percentage, 0) / rel.length)
}

export function subjectPerformanceSeries(subjects: Subject[], results: Result[]) {
  return subjects.map((s) => ({ subjectName: s.name, average: subjectAverage(s.id, results) }))
}

export function studentAverage(studentId: string, results: Result[]): number {
  const rel = results.filter((r) => r.studentId === studentId && r.maxPossible > 0)
  if (rel.length === 0) return 0
  return Math.round(rel.reduce((s, r) => s + r.percentage, 0) / rel.length)
}

export function studentAttendanceRate(studentId: string, records: AttendanceRecord[]): number | null {
  let present = 0, total = 0
  records.forEach((r) => {
    const entry = r.entries.find((e) => e.studentId === studentId)
    if (entry) {
      total++
      if (entry.status !== 'Absent') present++
    }
  })
  return total === 0 ? null : Math.round((present / total) * 100)
}

export function feeTotals(fees: Fee[]) {
  const expected = fees.reduce((s, f) => s + f.amountDue, 0)
  const collected = fees.reduce((s, f) => s + f.amountPaid, 0)
  const outstanding = expected - collected
  const unpaidStudents = fees.filter((f) => f.status !== 'Paid').length
  return { expected, collected, outstanding, unpaidStudents }
}

export function studentsNeedingAttention(
  students: Student[],
  results: Result[],
  records: AttendanceRecord[]
): { id: string; name: string; classId: string; reason: string }[] {
  const flagged: { id: string; name: string; classId: string; reason: string }[] = []
  students.forEach((s) => {
    const avg = studentAverage(s.id, results)
    const attRate = studentAttendanceRate(s.id, records)
    if (avg > 0 && avg < 50) {
      flagged.push({ id: s.id, name: `${s.firstName} ${s.lastName}`, classId: s.classId, reason: `average performance of ${avg}% this term` })
    } else if (attRate !== null && attRate < 80) {
      flagged.push({ id: s.id, name: `${s.firstName} ${s.lastName}`, classId: s.classId, reason: `attendance rate of ${attRate}% this term` })
    }
  })
  return flagged
}

export interface SubjectDecline {
  className: string
  subjectName: string
  previousPct: number
  latestPct: number
  previousName: string
  latestName: string
}

/**
 * Real round-over-round comparison: for each class + subject with at least two
 * scored assessments this term, compare the class average of the two most recent.
 * Returns only genuine drops of 5+ percentage points.
 */
export function subjectDeclines(
  classes: Class[],
  subjects: Subject[],
  assessments: Assessment[],
  scores: AssessmentScore[],
  term: string,
  session: string
): SubjectDecline[] {
  const out: SubjectDecline[] = []
  const classAvg = (a: Assessment): number | null => {
    const sc = scores.filter((x) => x.assessmentId === a.id)
    if (sc.length === 0) return null
    return Math.round((sc.reduce((s, x) => s + (x.score / a.maxScore) * 100, 0) / sc.length) * 10) / 10
  }
  classes.forEach((c) => {
    subjects.forEach((s) => {
      const scored = assessments
        .filter((a) => a.classId === c.id && a.subjectId === s.id && a.term === term && a.session === session)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((a) => ({ a, avg: classAvg(a) }))
        .filter((x): x is { a: Assessment; avg: number } => x.avg !== null)
      if (scored.length < 2) return
      const prev = scored[scored.length - 2]
      const last = scored[scored.length - 1]
      if (last.avg <= prev.avg - 5) {
        out.push({
          className: c.name, subjectName: s.name,
          previousPct: prev.avg, latestPct: last.avg,
          previousName: prev.a.name, latestName: last.a.name,
        })
      }
    })
  })
  return out
}
