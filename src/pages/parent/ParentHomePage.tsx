import { useNavigate } from 'react-router-dom'
import { GraduationCap, Wallet, CalendarCheck, Award, ArrowRight } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/states'
import { initials, formatNaira, fmtPct } from '@/lib/utils'
import { studentAttendanceRate, studentAverage } from '@/lib/analytics'

export default function ParentHomePage() {
  const { user } = useAuth()
  const { parents, students, classes, attendanceRecords, results, fees, announcements } = useStore()
  const navigate = useNavigate()

  const parent = parents.find((p) => p.id === user?.linkedId)
  const children = students.filter((s) => parent?.studentIds.includes(s.id))

  if (!parent || children.length === 0) {
    return <EmptyState title="No linked child found" description="Contact the school office if this seems wrong." />
  }

  const child = children[0]
  const cls = classes.find((c) => c.id === child.classId)
  const attRate = studentAttendanceRate(child.id, attendanceRecords)
  const avg = studentAverage(child.id, results)
  const fee = fees.find((f) => f.studentId === child.id)
  const latestResult = [...results].filter((r) => r.studentId === child.id && r.maxPossible > 0).sort((a, b) => b.percentage - a.percentage)[0]
  const recentAnnouncements = announcements.slice(0, 2)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {user?.name.replace(/^(Mr\.|Mrs\.|Mr\. & Mrs\.)\s*/, '')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Here's how {child.firstName} is doing</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <Avatar initials={initials(child.firstName, child.lastName)} color={child.photoColor} size={48} />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">{child.firstName} {child.lastName}</h2>
              <p className="text-sm text-slate-500">{cls?.name} · {child.studentCode}</p>
            </div>
            <Badge tone={child.status === 'Active' ? 'success' : 'neutral'}>{child.status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <MiniStat icon={<CalendarCheck className="h-4 w-4" />} label="Attendance" value={fmtPct(attRate)} />
            <MiniStat icon={<Award className="h-4 w-4" />} label="Average Score" value={avg > 0 ? `${avg}%` : '—'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Academic Progress</h3>
            <Button variant="link" size="sm" onClick={() => navigate('/parent/results')}>View all <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          {latestResult ? (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Strongest subject this term</span>
                <span className="font-medium text-slate-800">{latestResult.percentage}%</span>
              </div>
              <Progress value={latestResult.percentage} />
            </div>
          ) : <p className="text-sm text-slate-400">No results recorded yet this term.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer" onClick={() => navigate('/parent/fees')}>
          <CardContent className="pt-5">
            <Wallet className="h-5 w-5 text-teal-600 mb-2" />
            <p className="text-xs text-slate-500">Outstanding Fees</p>
            <p className="text-lg font-semibold text-slate-900">{fee ? formatNaira(fee.amountDue - fee.amountPaid) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => navigate('/parent/child')}>
          <CardContent className="pt-5">
            <GraduationCap className="h-5 w-5 text-teal-600 mb-2" />
            <p className="text-xs text-slate-500">Full Profile</p>
            <p className="text-lg font-semibold text-slate-900">View</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Announcements</h3>
            <Button variant="link" size="sm" onClick={() => navigate('/parent/announcements')}>View all <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="space-y-3">
            {recentAnnouncements.map((a) => (
              <div key={a.id}>
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 flex items-center gap-2.5">
      <span className="text-teal-600">{icon}</span>
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}
