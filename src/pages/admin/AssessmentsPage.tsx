import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { CreateAssessmentDialog } from '@/components/assessments/CreateAssessmentDialog'
import { formatDate } from '@/lib/utils'

export default function AssessmentsPage() {
  const { assessments, classes, subjects, assessmentScores } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [classFilter, setClassFilter] = useState('all')

  const isTeacher = user?.role === 'teacher'
  const filtered = [...assessments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((a) => classFilter === 'all' || a.classId === classFilter)

  function className(id: string) { return classes.find((c) => c.id === id)?.name ?? '—' }
  function subjectName(id: string) { return subjects.find((s) => s.id === id)?.name ?? '—' }
  function scoresEntered(assessmentId: string) {
    return assessmentScores.filter((s) => s.assessmentId === assessmentId).length
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Assessments</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} assessments this term</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Assessment</Button>
      </div>

      <Select className="sm:w-56" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
        <option value="all">All Classes</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>

      {filtered.length === 0 ? (
        <EmptyState title="No assessments yet" description="Create your first assessment to begin entering scores." action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Assessment</Button>} />
      ) : (
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Class</TH><TH>Subject</TH><TH>Type</TH><TH>Max Score</TH><TH>Date</TH><TH>Scores</TH><TH className="text-right">Action</TH></TR>
          </THead>
          <TBody>
            {filtered.map((a) => {
              const cls = classes.find((c) => c.id === a.classId)
              const entered = scoresEntered(a.id)
              const total = cls?.studentIds.length ?? 0
              return (
                <TR key={a.id}>
                  <TD className="font-medium text-slate-900">{a.name}</TD>
                  <TD>{className(a.classId)}</TD>
                  <TD>{subjectName(a.subjectId)}</TD>
                  <TD><Badge tone="info">{a.type}</Badge></TD>
                  <TD>{a.maxScore}</TD>
                  <TD>{formatDate(a.date)}</TD>
                  <TD>
                    <Badge tone={entered === total && total > 0 ? 'success' : entered > 0 ? 'warning' : 'neutral'}>
                      {entered}/{total}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/app/assessments/${a.id}`)}>
                      {isTeacher ? 'Enter Scores' : 'View'} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}

      <CreateAssessmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
