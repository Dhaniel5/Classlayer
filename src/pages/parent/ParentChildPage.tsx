import { useState } from 'react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { initials, formatDate, fmtPct } from '@/lib/utils'
import { studentAttendanceRate, studentAverage } from '@/lib/analytics'

export default function ParentChildPage() {
  const { user } = useAuth()
  const { parents, students, classes, attendanceRecords, results } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const children = students.filter((s) => parent?.studentIds.includes(s.id))
  const [selectedId, setSelectedId] = useState(children[0]?.id ?? '')
  const child = children.find((c) => c.id === selectedId) ?? children[0]

  if (!child) return <EmptyState title="No linked child found" />
  const cls = classes.find((c) => c.id === child.classId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">My Child</h1>
        {children.length > 1 && (
          <Select className="w-44" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar initials={initials(child.firstName, child.lastName)} color={child.photoColor} size={56} />
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">{child.firstName} {child.lastName}</h2>
              <p className="text-sm text-slate-500">{cls?.name} · {child.studentCode}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Gender" value={child.gender} />
            <InfoRow label="Date of birth" value={formatDate(child.dateOfBirth)} />
            <InfoRow label="Admission date" value={formatDate(child.admissionDate)} />
            <InfoRow label="Address" value={child.address} />
            <InfoRow label="Attendance" value={fmtPct(studentAttendanceRate(child.id, attendanceRecords))} />
            <InfoRow label="Average score" value={studentAverage(child.id, results) > 0 ? `${studentAverage(child.id, results)}%` : '—'} />
          </div>
          <Badge tone={child.status === 'Active' ? 'success' : 'neutral'} className="mt-3">{child.status}</Badge>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-800 font-medium mt-0.5">{value}</p>
    </div>
  )
}
