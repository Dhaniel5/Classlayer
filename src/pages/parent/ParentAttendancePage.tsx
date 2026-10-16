import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { formatDate, fmtPct } from '@/lib/utils'
import { studentAttendanceRate } from '@/lib/analytics'

export default function ParentAttendancePage() {
  const { user } = useAuth()
  const { parents, students, attendanceRecords } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const child = students.find((s) => parent?.studentIds.includes(s.id))

  if (!child) return <EmptyState title="No linked child found" />

  const rate = studentAttendanceRate(child.id, attendanceRecords)
  const history = attendanceRecords
    .filter((r) => r.entries.some((e) => e.studentId === child.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Attendance</h1>

      <Card>
        <CardContent className="pt-5 text-center">
          <p className="text-xs text-slate-500">Overall attendance this term</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">{fmtPct(rate)}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {history.map((r) => {
          const entry = r.entries.find((e) => e.studentId === child.id)!
          return (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
              <span className="text-sm text-slate-700">{formatDate(r.date)}</span>
              <Badge tone={entry.status === 'Present' ? 'success' : entry.status === 'Late' ? 'warning' : 'danger'}>{entry.status}</Badge>
            </div>
          )
        })}
        {history.length === 0 && <EmptyState title="No attendance records yet" />}
      </div>
    </div>
  )
}
