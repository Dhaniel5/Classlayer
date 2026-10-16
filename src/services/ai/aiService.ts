import type { Student, AIInsight } from '@/types'
import type { SubjectDecline } from '@/lib/analytics'

// -----------------------------------------------------------------------
// Rule-based "AI" service. It is NOT a language model: it applies fixed rules
// and templates to the data passed in, and never invents student data.
// To use a real LLM later, keep these function signatures and call a server-side
// function (never put an LLM API key in the browser).
// -----------------------------------------------------------------------

export interface SubjectTrend {
  subjectName: string
  scores: number[] // chronological percentages
  trend: 'improving' | 'declining' | 'stable'
}

export function computeTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
  if (scores.length < 2) return 'stable'
  const diff = scores[scores.length - 1] - scores[0]
  if (diff >= 5) return 'improving'
  if (diff <= -5) return 'declining'
  return 'stable'
}

export async function generateStudentSummary(
  student: Student,
  subjectResults: { subjectName: string; percentage: number; grade: string }[]
): Promise<string> {
  if (subjectResults.length === 0) {
    return `No assessment data is available yet for ${student.firstName} this term.`
  }
  const sorted = [...subjectResults].sort((a, b) => b.percentage - a.percentage)
  const strongest = sorted.slice(0, 2)
  const weakest = sorted.slice(-2).reverse()
  const avg = Math.round(subjectResults.reduce((s, r) => s + r.percentage, 0) / subjectResults.length)

  const strongText = strongest.map((s) => s.subjectName).join(' and ')
  const weakText = weakest.map((s) => s.subjectName).join(' and ')

  let performanceLine = ''
  if (avg >= 80) performanceLine = `${student.firstName} has maintained strong overall performance this term, averaging ${avg}%.`
  else if (avg >= 60) performanceLine = `${student.firstName} is performing at a solid, consistent level this term, averaging ${avg}%.`
  else performanceLine = `${student.firstName}'s overall average of ${avg}% this term suggests additional support would help.`

  return `${performanceLine} Strongest results are in ${strongText}, while ${weakText} ${weakest.length > 1 ? 'show' : 'shows'} the most room for improvement. Continued focus on practice in these areas, alongside the strengths already shown, should support steady progress.`
}

export async function generateReportComment(params: {
  studentFirstName: string
  performanceLevel: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'
  strengths: string
  areasForImprovement: string
}): Promise<string> {
  const { studentFirstName, performanceLevel, strengths, areasForImprovement } = params

  const openers: Record<string, string> = {
    Excellent: `${studentFirstName} has had an excellent term, consistently demonstrating focus, maturity and strong academic ability.`,
    Good: `${studentFirstName} demonstrates consistent effort and good participation in class.`,
    Fair: `${studentFirstName} has shown a fair level of engagement this term, with clear potential for growth.`,
    'Needs Improvement': `${studentFirstName} will benefit from closer support and more consistent engagement this term.`,
  }

  const strengthsLine = strengths
    ? `${studentFirstName} has performed particularly well in ${strengths}.`
    : ''
  const improvementLine = areasForImprovement
    ? `Additional support and practice in ${areasForImprovement} would help build further confidence and mastery.`
    : ''

  return [openers[performanceLevel], strengthsLine, improvementLine].filter(Boolean).join(' ')
}

export async function generateSchoolInsights(context: {
  attendanceByClass: { className: string; rate: number | null }[]
  subjectDeclines: SubjectDecline[]
  performanceBySubject: { subjectName: string; average: number }[]
  studentsNeedingAttention: { name: string; className: string; reason: string }[]
}): Promise<AIInsight[]> {
  const insights: AIInsight[] = []
  let counter = 1

  // Attendance insight
  const lowestAttendance = [...context.attendanceByClass]
    .filter((c) => c.rate !== null)
    .sort((a, b) => (a.rate as number) - (b.rate as number))[0]
  if (lowestAttendance && lowestAttendance.rate !== null && lowestAttendance.rate < 90) {
    insights.push({
      id: `insight-${counter++}`,
      scope: 'school',
      title: `${lowestAttendance.className} attendance needs attention`,
      observation: `${lowestAttendance.className} has the lowest recorded attendance rate at ${lowestAttendance.rate}%.`,
      supportingData: `Based on all attendance recorded so far for ${lowestAttendance.className}.`,
      suggestedAction: `Consider a check-in with the class teacher and affected families to identify recurring causes.`,
      level: (lowestAttendance.rate as number) < 80 ? 'critical' : 'warning',
      generatedAt: new Date().toISOString(),
    })
  }

  // Performance decline insight — real comparison of the two most recent scored assessments
  context.subjectDeclines.forEach((d) => {
    insights.push({
      id: `insight-${counter++}`,
      scope: 'class',
      title: `${d.className} ${d.subjectName} performance declined`,
      observation: `${d.className} ${d.subjectName} class average dropped from ${d.previousPct}% (${d.previousName}) to ${d.latestPct}% (${d.latestName}).`,
      supportingData: `Class average across students with recorded scores in the two most recent ${d.subjectName} assessments.`,
      suggestedAction: `Review the topics in ${d.latestName} and consider a revision session before the next assessment.`,
      level: 'warning',
      generatedAt: new Date().toISOString(),
    })
  })

  // Strongest subject
  const bestSubject = [...context.performanceBySubject]
    .filter((x) => x.average > 0)
    .sort((a, b) => b.average - a.average)[0]
  if (bestSubject) {
    insights.push({
      id: `insight-${counter++}`,
      scope: 'school',
      title: `${bestSubject.subjectName} is the school's strongest subject`,
      observation: `${bestSubject.subjectName} has the highest average performance school-wide at ${bestSubject.average}%.`,
      supportingData: `Based on aggregated results across all classes this term.`,
      suggestedAction: `Consider sharing teaching approaches from this subject's teachers with other departments.`,
      level: 'positive',
      generatedAt: new Date().toISOString(),
    })
  }

  // Students needing attention
  context.studentsNeedingAttention.slice(0, 3).forEach((s) => {
    insights.push({
      id: `insight-${counter++}`,
      scope: 'student',
      title: `${s.name} may need additional support`,
      observation: `${s.name} (${s.className}) — ${s.reason}`,
      supportingData: `Flagged from recent attendance and assessment records.`,
      suggestedAction: `Recommend a short check-in between the class teacher and parent.`,
      level: 'critical',
      generatedAt: new Date().toISOString(),
    })
  })

  return insights
}
