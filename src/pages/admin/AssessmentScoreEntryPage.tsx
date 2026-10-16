import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { initials } from '@/lib/utils'
import { percentageOf, gradeFor } from '@/lib/grading'

export default function AssessmentScoreEntryPage() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const { assessments, classes, subjects, students, assessmentScores, actions } = useStore()
  const { toast } = useToast()

  const assessment = assessments.find((a) => a.id === assessmentId)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  if (!assessment) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="Assessment not found" />
      </div>
    )
  }

  const cls = classes.find((c) => c.id === assessment.classId)
  const subject = subjects.find((s) => s.id === assessment.subjectId)
  const classStudents = students.filter((s) => s.classId === assessment.classId && s.status === 'Active')

  function existingScore(studentId: string) {
    return assessmentScores.find((s) => s.assessmentId === assessment!.id && s.studentId === studentId)?.score
  }

  function effectiveScore(studentId: string): number | undefined {
    return draft[studentId] ?? existingScore(studentId)
  }

  function updateScore(studentId: string, value: string) {
    const num = value === '' ? undefined : Math.max(0, Math.min(assessment!.maxScore, Number(value)))
    setDraft((d) => {
      const next = { ...d }
      if (num === undefined) delete next[studentId]
      else next[studentId] = num
      return next
    })
  }

  async function handleSave() {
    const scores = classStudents
      .map((s) => ({ studentId: s.id, score: effectiveScore(s.id) }))
      .filter((s): s is { studentId: string; score: number } => s.score !== undefined)
    if (scores.length === 0) {
      toast({ title: 'No scores entered', description: 'Enter at least one score before saving.', tone: 'error' })
      return
    }
    setBusy(true)
    try {
      await actions.submitScores(assessment!.id, scores)
      toast({ title: 'Scores saved', description: `${scores.length} score(s) recorded. Results and class performance are updated.`, tone: 'success' })
      setDraft({})
    } catch (err) {
      toast({ title: 'Could not save scores', description: (err as Error).message, tone: 'error' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{assessment.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cls?.name} · {subject?.name} · Max score {assessment.maxScore}</p>
        </div>
        <Button onClick={handleSave} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Scores</Button>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Enter Student Scores</CardTitle>
            <CardDescription>Percentage and grade are calculated automatically as you type</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {classStudents.length === 0 ? (
            <EmptyState title="No students in this class" />
          ) : (
            <Table>
              <THead>
                <TR><TH>Student</TH><TH>Score</TH><TH>Percentage</TH><TH>Grade</TH></TR>
              </THead>
              <TBody>
                {classStudents.map((s) => {
                  const score = effectiveScore(s.id)
                  const pct = score !== undefined ? percentageOf(score, assessment.maxScore) : null
                  const band = pct !== null ? gradeFor(pct) : null
                  return (
                    <TR key={s.id}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={initials(s.firstName, s.lastName)} color={s.photoColor} size={28} />
                          {s.firstName} {s.lastName}
                        </div>
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={0}
                          max={assessment.maxScore}
                          className="w-24"
                          value={score ?? ''}
                          onChange={(e) => updateScore(s.id, e.target.value)}
                          placeholder={`/${assessment.maxScore}`}
                        />
                      </TD>
                      <TD>{pct !== null ? `${pct}%` : '—'}</TD>
                      <TD>{band ? <Badge tone={band.label === 'F' ? 'danger' : band.label === 'A' ? 'success' : 'info'}>{band.label}</Badge> : '—'}</TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BackLink() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/app/assessments')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" /> Back to Assessments
    </button>
  )
}
