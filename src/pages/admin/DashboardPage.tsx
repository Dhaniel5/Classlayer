import { GraduationCap, Users, School2, Wallet, Sparkles } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AttendanceChart } from '@/components/dashboard/AttendanceChart'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AIInsightTeaser } from '@/components/dashboard/AIInsightTeaser'
import { formatNaira } from '@/lib/utils'
import { last7DaysAttendance, classPerformanceSeries, feeTotals, classAverage, subjectAverage, subjectDeclines } from '@/lib/analytics'
import { canSeeFinance, canSeeAllStudents } from '@/lib/permissions'
import { EmptyState } from '@/components/ui/states'

export default function DashboardPage() {
  const { user } = useAuth()
  const {
    students, teachers, classes, attendanceRecords, results, fees, recentActivity, school, subjects,
    assessments, assessmentScores,
  } = useStore()
  if (!user) return null

  const isTeacher = user.role === 'teacher'
  const isAccountant = user.role === 'accountant'
  const finance = canSeeFinance(user.role)
  const schoolWide = canSeeAllStudents(user.role)

  const { expected, collected, outstanding, unpaidStudents } = feeTotals(fees)
  const attendanceData = last7DaysAttendance(attendanceRecords)
  const performanceData = isTeacher
    ? subjects.map((s) => ({ name: s.name, average: subjectAverage(s.id, results) })).filter((d) => d.average > 0)
    : classPerformanceSeries(classes, results).filter((d) => d.average > 0)

  // Headline for the AI card comes from real data only.
  const declines = subjectDeclines(classes, subjects, assessments, assessmentScores, school.currentTerm, school.currentSession)
  const headline = declines.length > 0
    ? `${declines[0].className} ${declines[0].subjectName} dropped from ${declines[0].previousPct}% to ${declines[0].latestPct}% between the last two assessments.`
    : classes.some((c) => classAverage(c.id, results) > 0)
      ? 'No significant declines detected between recent assessments. Open AI Insights for class and subject breakdowns.'
      : 'Insights will appear here once attendance and assessment scores have been recorded.'

  const myTeacher = teachers.find((t) => t.id === user.linkedId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{isTeacher ? 'My Dashboard' : 'Dashboard'}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{school.name} · {school.currentSession} · {school.currentTerm}</p>
      </div>

      {isAccountant ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Fees Expected" value={formatNaira(expected)} icon={<Wallet className="h-5 w-5" />} />
          <StatCard label="Collected" value={formatNaira(collected)} icon={<Wallet className="h-5 w-5" />} />
          <StatCard label="Outstanding" value={formatNaira(outstanding)} icon={<Wallet className="h-5 w-5" />} tone="warning" />
          <StatCard label="Unpaid Students" value={String(unpaidStudents)} icon={<Users className="h-5 w-5" />} tone="warning" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={isTeacher ? 'My Students' : 'Students'} value={String(students.length)} icon={<GraduationCap className="h-5 w-5" />} />
          {schoolWide && <StatCard label="Teachers" value={String(teachers.length)} icon={<Users className="h-5 w-5" />} />}
          <StatCard label={isTeacher ? 'My Classes' : 'Active Classes'} value={String(classes.length)} icon={<School2 className="h-5 w-5" />} />
          {finance && <StatCard label="Outstanding Fees" value={formatNaira(outstanding)} icon={<Wallet className="h-5 w-5" />} tone="warning" />}
          {isTeacher && <StatCard label="Subjects I Teach" value={String(myTeacher?.subjectIds.length ?? 0)} icon={<Sparkles className="h-5 w-5" />} />}
        </div>
      )}

      {!isAccountant && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><div><CardTitle>Attendance Overview</CardTitle><CardDescription>Present / Absent / Late on the most recent recorded days</CardDescription></div></CardHeader>
            <CardContent>
              {attendanceData.length === 0 ? <EmptyState title="No attendance recorded yet" description="Mark attendance to see this chart." /> : <AttendanceChart data={attendanceData} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Academic Performance</CardTitle><CardDescription>{isTeacher ? 'Average by subject' : 'Average score by class'}</CardDescription></div></CardHeader>
            <CardContent>
              {performanceData.length === 0 ? <EmptyState title="No scores recorded yet" description="Create an assessment and enter scores to see this chart." /> : <PerformanceChart data={performanceData} />}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent><ActivityFeed items={recentActivity} /></CardContent>
        </Card>
        {!isAccountant && <AIInsightTeaser headline={headline} />}
      </div>
    </div>
  )
}
