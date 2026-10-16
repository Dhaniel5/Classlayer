import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useStore } from '@/services/store'
import { useToast } from '@/components/ui/toast'
import type { AssessmentType } from '@/types'
import { todayLocalISO } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export function CreateAssessmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { classes, subjects, actions } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    classId: classes[0]?.id ?? '',
    subjectId: subjects[0]?.id ?? '',
    name: '',
    type: 'Test' as AssessmentType,
    maxScore: 20,
    date: todayLocalISO(),
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Assessment name is required'); return }
    if (!form.classId || !form.subjectId) { setError('Choose a class and a subject'); return }
    if (!(form.maxScore > 0)) { setError('Maximum score must be greater than 0'); return }
    setError(''); setBusy(true)
    try {
      const id = await actions.createAssessment({ ...form, maxScore: Number(form.maxScore) })
      toast({ title: 'Assessment created', description: 'You can now enter student scores.', tone: 'success' })
      onClose()
      navigate(`/app/assessments/${id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Assessment" description="Set up a new assessment for a class and subject">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <Select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}>
              {classes.length === 0 && <option value="">No classes available</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>Assessment name</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Second Test" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssessmentType }))}>
              <option>Test</option>
              <option>Assignment</option>
              <option>Mid-term</option>
              <option>Examination</option>
            </Select>
          </div>
          <div>
            <Label>Max score</Label>
            <Input type="number" min={1} value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create & Enter Scores</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
