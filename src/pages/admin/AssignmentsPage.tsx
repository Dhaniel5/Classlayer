import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowRight, NotebookPen } from 'lucide-react'
import { useStore } from '@/services/store'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { CreateAssignmentDialog } from '@/components/assignments/CreateAssignmentDialog'
import { formatDate, todayLocalISO } from '@/lib/utils'

export default function AssignmentsPage() {
  // `assignments` and `classes` are already limited by the database to what this user may see.
  const { assignments, assignmentRecords, classes, subjects, students } = useStore()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const today = todayLocalISO()

  const rows = [...assignments]
    .filter((a) => (classFilter === 'all' || a.classId === classFilter) && (subjectFilter === 'all' || a.subjectId === subjectFilter))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? '—'
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Homework done in notebooks — post the task, then record who did it.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Post Assignment</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select className="sm:w-48" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="sm:w-56" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="all">All Subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<NotebookPen className="h-5 w-5" />} title="No assignments yet"
          description="Post your first assignment. Parents see it straight away."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Post Assignment</Button>} />
      ) : (
        <Table>
          <THead><TR><TH>Task</TH><TH>Class</TH><TH>Subject</TH><TH>Due</TH><TH>Recorded as</TH><TH>Marked</TH><TH className="text-right">Action</TH></TR></THead>
          <TBody>
            {rows.map((a) => {
              const total = students.filter((s) => s.classId === a.classId && s.status === 'Active').length
              const marked = assignmentRecords.filter((r) => r.assignmentId === a.id).length
              return (
                <TR key={a.id}>
                  <TD className="font-medium text-slate-900">{a.title}</TD>
                  <TD>{className(a.classId)}</TD>
                  <TD>{subjectName(a.subjectId)}</TD>
                  <TD>{formatDate(a.dueDate)} {a.dueDate < today && <Badge tone="neutral" className="ml-1">Past due</Badge>}</TD>
                  <TD><Badge tone="info">{a.mode === 'score' ? `Score /${a.maxScore}` : 'Done / not done'}</Badge></TD>
                  <TD><Badge tone={marked === total && total > 0 ? 'success' : marked > 0 ? 'warning' : 'neutral'}>{marked}/{total}</Badge></TD>
                  <TD className="text-right"><Button variant="outline" size="sm" onClick={() => navigate(`/app/assignments/${a.id}`)}>Open <ArrowRight className="h-3.5 w-3.5" /></Button></TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
      <CreateAssignmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
