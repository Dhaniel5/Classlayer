import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useStore } from '@/services/store'
import { useToast } from '@/components/ui/toast'

export function CheckList({ items, selected, onChange, empty }: {
  items: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void; empty: string
}) {
  if (items.length === 0) return <p className="text-xs text-slate-400">{empty}</p>
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 p-2.5 max-h-36 overflow-y-auto">
      {items.map((i) => (
        <label key={i.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300" checked={selected.includes(i.id)}
            onChange={(e) => onChange(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))} />
          {i.label}
        </label>
      ))}
    </div>
  )
}

export function AddTeacherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { classes, subjects, actions } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [classIds, setClassIds] = useState<string[]>([])
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email — the teacher signs in with it'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    try {
      await actions.addTeacher({ ...form, classIds, subjectIds })
      toast({ title: 'Teacher added', description: `${form.firstName} ${form.lastName} — now create their login (see README, "Adding users").`, tone: 'success' })
      onClose()
      setForm({ firstName: '', lastName: '', email: '', phone: '' }); setClassIds([]); setSubjectIds([])
    } catch (err) {
      toast({ title: 'Could not add teacher', description: (err as Error).message, tone: 'error' })
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add Teacher" description="Create a teacher profile and choose what they teach">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />{errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}</div>
          <div><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />{errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}</div>
        </div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />{errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}</div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        <div><Label>Assigned classes</Label><CheckList items={classes.map((c) => ({ id: c.id, label: c.name }))} selected={classIds} onChange={setClassIds} empty="Create classes first." /></div>
        <div><Label>Subjects taught</Label><CheckList items={subjects.map((s) => ({ id: s.id, label: s.name }))} selected={subjectIds} onChange={setSubjectIds} empty="Create subjects first." /></div>
        <p className="text-xs text-slate-400">A teacher can only see students in the classes assigned here (or classes where they are the class teacher).</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add Teacher</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
