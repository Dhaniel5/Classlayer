import { useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { formatDate, todayLocalISO } from '@/lib/utils'
import { assignmentOutcome } from '@/lib/assignments'
import type { Assignment } from '@/types'

export default function ParentAssignmentsPage() {
  const { user } = useAuth()
  const { parents, students, assignments, assignmentRecords, subjects } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const children = students.filter((s) => parent?.studentIds.includes(s.id))
  const [selected, setSelected] = useState(children[0]?.id ?? '')
  const child = children.find((c) => c.id === selected) ?? children[0]
  if (!child) return <EmptyState title="No linked child found" />

  const today = todayLocalISO()
  const mine = assignments.filter((a) => a.classId === child.classId)
  const upcoming = mine.filter((a) => a.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const past = mine.filter((a) => a.dueDate < today).sort((a, b) => b.dueDate.localeCompare(a.dueDate))

  const card = (a: Assignment) => {
    const outcome = assignmentOutcome(a, assignmentRecords.find((r) => r.assignmentId === a.id && r.studentId === child.id))
    return (
      <Card key={a.id}>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{a.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{subjects.find((s) => s.id === a.subjectId)?.name} · Due {formatDate(a.dueDate)}</p>
            </div>
            <Badge tone={outcome.tone}>{outcome.label}</Badge>
          </div>
          {a.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{a.description}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Assignments</h1>
        {children.length > 1 && (
          <Select className="w-44" value={child.id} onChange={(e) => setSelected(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </Select>
        )}
      </div>
      {mine.length === 0 ? (
        <EmptyState icon={<NotebookPen className="h-5 w-5" />} title="No assignments yet" description={`${child.firstName}'s teachers haven't posted any assignments this term.`} />
      ) : (
        <>
          {upcoming.length > 0 && <div className="space-y-3"><h2 className="text-sm font-semibold text-slate-700">Coming up</h2>{upcoming.map(card)}</div>}
          {past.length > 0 && <div className="space-y-3"><h2 className="text-sm font-semibold text-slate-700">Earlier</h2>{past.map(card)}</div>}
        </>
      )}
    </div>
  )
}
