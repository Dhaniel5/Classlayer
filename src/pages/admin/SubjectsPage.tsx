import { useState } from 'react'
import { Plus, BookOpen, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'

export default function SubjectsPage() {
  const { subjects, teachers, actions } = useStore()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setBusy(true)
    try {
      await actions.addSubject({ name, code })
      toast({ title: 'Subject created', description: name, tone: 'success' })
      setAddOpen(false); setName(''); setCode('')
    } catch (err) { toast({ title: 'Could not create subject', description: (err as Error).message, tone: 'error' }) }
    finally { setBusy(false) }
  }

  const teacherNames = (ids: string[]) =>
    ids.map((id) => teachers.find((t) => t.id === id)).filter(Boolean).map((t) => `${t!.firstName} ${t!.lastName}`).join(', ') || 'No teacher assigned'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Subjects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{subjects.length} subjects offered in every class. Assign teachers from the Teachers page.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Subject</Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState title="No subjects yet" description="Add the subjects your school teaches." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen className="h-4.5 w-4.5" /></div>
                  <div><h3 className="font-semibold text-slate-900">{s.name}</h3><p className="text-xs text-slate-400">{s.code}</p></div>
                </div>
                <p className="text-xs text-slate-500">{teacherNames(s.teacherIds)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Subject" description="Create a new subject">
        <form onSubmit={handleAdd} className="space-y-4">
          <div><Label>Subject name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. French" required /></div>
          <div><Label>Subject code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FRN" required /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create Subject</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
