import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { useStore } from '@/services/store'
import { useToast } from '@/components/ui/toast'
import { tomorrowLocalISO } from '@/lib/assignments'
import type { AssignmentMode } from '@/types'

export function CreateAssignmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { classes, subjects, actions } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    classId: classes[0]?.id ?? '', subjectId: subjects[0]?.id ?? '', title: '', description: '',
    dueDate: tomorrowLocalISO(), mode: 'done' as AssignmentMode, maxScore: 10,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.classId || !form.subjectId) { setError('Choose a class and a subject.'); return }
    if (!form.title.trim()) { setError('Give the assignment a title.'); return }
    if (!form.dueDate) { setError('Choose a due date.'); return }
    if (form.mode === 'score' && !(form.maxScore > 0)) { setError('The maximum score must be more than 0.'); return }
    setError(''); setBusy(true)
    try {
      const id = await actions.createAssignment({
        classId: form.classId, subjectId: form.subjectId, title: form.title, description: form.description,
        dueDate: form.dueDate, mode: form.mode, maxScore: form.mode === 'score' ? Number(form.maxScore) : null,
      })
      toast({ title: 'Assignment posted', description: 'Parents can now see it.', tone: 'success' })
      onClose()
      setForm((f) => ({ ...f, title: '', description: '' }))
      navigate(`/app/assignments/${id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Post Assignment" description="Students do the work in their notebooks. You record the result afterwards.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Class</Label>
            <Select value={form.classId} onChange={(e) => set('classId', e.target.value)}>
              {classes.length === 0 && <option value="">No classes available</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select></div>
          <div><Label>Subject</Label>
            <Select value={form.subjectId} onChange={(e) => set('subjectId', e.target.value)}>
              {subjects.length === 0 && <option value="">No subjects yet</option>}
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select></div>
        </div>
        <div><Label>Task</Label><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Exercise 4 on page 32" /></div>
        <div><Label>Instructions (optional)</Label><Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Anything parents or students should know" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></div>
          <div><Label>How will you record it?</Label>
            <Select value={form.mode} onChange={(e) => set('mode', e.target.value as AssignmentMode)}>
              <option value="done">Done / not done</option>
              <option value="score">Score</option>
            </Select></div>
        </div>
        {form.mode === 'score' && (
          <div className="max-w-[10rem]"><Label>Maximum score</Label>
            <Input type="number" min={1} value={form.maxScore} onChange={(e) => set('maxScore', Number(e.target.value))} /></div>
        )}
        <p className="text-xs text-slate-400">Assignments are homework tracking. They are separate from term results and report cards.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || classes.length === 0}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Post Assignment</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
