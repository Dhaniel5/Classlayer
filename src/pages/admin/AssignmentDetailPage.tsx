import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, CheckCheck, Trash2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { formatDate, initials } from '@/lib/utils'
import type { AssignmentStatus } from '@/types'

interface Mark { status: AssignmentStatus; score: number | null }

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { assignments, assignmentRecords, classes, subjects, students, actions } = useStore()
  const { toast } = useToast()
  const [draft, setDraft] = useState<Record<string, Mark>>({})
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const a = assignments.find((x) => x.id === assignmentId)
  const back = (
    <button onClick={() => navigate('/app/assignments')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" /> Back to Assignments
    </button>
  )
  if (!a) return <div className="space-y-4">{back}<EmptyState title="Assignment not found" description="It may have been removed." /></div>

  const classStudents = students.filter((s) => s.classId === a.classId && s.status === 'Active')
  const existing = (studentId: string): Mark | undefined => {
    const r = assignmentRecords.find((x) => x.assignmentId === a.id && x.studentId === studentId)
    return r ? { status: r.status, score: r.score } : undefined
  }
  const markOf = (studentId: string) => draft[studentId] ?? existing(studentId)
  const setMark = (studentId: string, m: Mark) => setDraft((d) => ({ ...d, [studentId]: m }))
  const isScore = a.mode === 'score'

  function onScore(studentId: string, raw: string) {
    if (raw === '') { setDraft((d) => { const n = { ...d }; delete n[studentId]; return n }); return }
    const v = Math.max(0, Math.min(a!.maxScore ?? 0, Number(raw)))
    setMark(studentId, { status: 'done', score: v })
  }

  const changed = Object.keys(draft)

  async function save() {
    if (changed.length === 0) { toast({ title: 'Nothing to save yet', description: 'Mark at least one student first.', tone: 'error' }); return }
    setBusy(true)
    try {
      await actions.saveAssignmentRecords(a!.id, changed.map((studentId) => ({ studentId, ...draft[studentId] })))
      toast({ title: 'Saved', description: `${changed.length} student${changed.length === 1 ? '' : 's'} updated. Parents can see this.`, tone: 'success' })
      setDraft({})
    } catch (err) {
      toast({ title: 'Could not save', description: (err as Error).message, tone: 'error' })
    } finally { setBusy(false) }
  }

  const markedCount = classStudents.filter((s) => markOf(s.id)).length

  return (
    <div className="space-y-5">
      {back}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{a.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {classes.find((c) => c.id === a.classId)?.name} · {subjects.find((s) => s.id === a.subjectId)?.name} · Due {formatDate(a.dueDate)} ·{' '}
            {isScore ? `Scored out of ${a.maxScore}` : 'Done / not done'}
          </p>
          {a.description && <p className="text-sm text-slate-600 mt-2 max-w-2xl whitespace-pre-line">{a.description}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save{changed.length ? ` (${changed.length})` : ''}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Record results</CardTitle><CardDescription>{markedCount} of {classStudents.length} students marked</CardDescription></div>
          {!isScore && (
            <Button variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, ...Object.fromEntries(classStudents.filter((s) => !markOf(s.id)).map((s) => [s.id, { status: 'done', score: null } as Mark])) }))}>
              <CheckCheck className="h-4 w-4" /> Mark unmarked as done
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {classStudents.length === 0 ? <EmptyState title="No active students in this class" /> : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {classStudents.map((s) => {
                const m = markOf(s.id)
                const unsaved = !!draft[s.id]
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar initials={initials(s.firstName, s.lastName)} color={s.photoColor} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.firstName} {s.lastName}</p>
                      {unsaved && <p className="text-xs text-amber-600">Unsaved</p>}
                    </div>
                    {isScore && (
                      <Input type="number" min={0} max={a.maxScore ?? undefined} className="w-24"
                        value={m?.status === 'done' && m.score !== null ? m.score : ''} placeholder={`/${a.maxScore}`}
                        onChange={(e) => onScore(s.id, e.target.value)} aria-label={`Score for ${s.firstName} ${s.lastName}`} />
                    )}
                    <div className="flex gap-1.5">
                      {!isScore && (
                        <button onClick={() => setMark(s.id, { status: 'done', score: null })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${m?.status === 'done' ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Done</button>
                      )}
                      <button onClick={() => setMark(s.id, { status: 'not_done', score: null })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${m?.status === 'not_done' ? 'bg-red-500 border-red-500 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Not done</button>
                    </div>
                    {!m && <Badge tone="neutral">Pending</Badge>}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)}
        title="Delete this assignment?" description="Its recorded results are deleted too, and parents will no longer see it."
        confirmLabel="Delete"
        onConfirm={async () => {
          try { await actions.deleteAssignment(a.id); toast({ title: 'Assignment deleted', tone: 'success' }); navigate('/app/assignments') }
          catch (err) { toast({ title: 'Could not delete', description: (err as Error).message, tone: 'error' }) }
        }} />
    </div>
  )
}
