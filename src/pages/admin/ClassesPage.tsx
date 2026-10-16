import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, ArrowRight, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { classAverage, attendanceRateForClass } from '@/lib/analytics'
import { fmtPct } from '@/lib/utils'
import { canManageSchool } from '@/lib/permissions'
import { useToast } from '@/components/ui/toast'

export default function ClassesPage() {
  const { classes, teachers, results, attendanceRecords, actions } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const canManage = !!user && canManageSchool(user.role)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', level: '', termFee: '', teacherId: '' })
  const [busy, setBusy] = useState(false)

  const teacherName = (id: string | null) => {
    const t = teachers.find((tt) => tt.id === id)
    return t ? `${t.firstName} ${t.lastName}` : 'No class teacher'
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await actions.addClass({ name: form.name, level: form.level, termFee: Number(form.termFee) || 0, classTeacherId: form.teacherId || null })
      toast({ title: 'Class created', description: form.name, tone: 'success' })
      setAddOpen(false); setForm({ name: '', level: '', termFee: '', teacherId: '' })
    } catch (err) { toast({ title: 'Could not create class', description: (err as Error).message, tone: 'error' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{user?.role === 'teacher' ? 'My Classes' : 'Classes'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{classes.length} {classes.length === 1 ? 'class' : 'classes'}</p>
        </div>
        {canManage && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Class</Button>}
      </div>

      {classes.length === 0 ? (
        <EmptyState title="No classes yet" description={canManage ? 'Create your first class to get started.' : 'You have not been assigned to any class yet.'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const avg = classAverage(c.id, results)
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/classes/${c.id}`)}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{c.name}</h3>
                    <span className="text-xs text-slate-400">{c.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                    <Users className="h-3.5 w-3.5" /> {c.studentIds.length} students · {teacherName(c.classTeacherId)}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Avg. Performance</p><p className="font-semibold text-slate-800">{avg > 0 ? `${avg}%` : '—'}</p></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">Attendance</p><p className="font-semibold text-slate-800">{fmtPct(attendanceRateForClass(c.id, attendanceRecords))}</p></div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-teal-700 font-medium mt-3">View details <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Class" description="Create a new class">
        <form onSubmit={handleAdd} className="space-y-4">
          <div><Label>Class name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. JSS 3" required /></div>
          <div><Label>Level</Label><Input value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} placeholder="e.g. Junior Secondary" /></div>
          <div><Label>Term fee (₦)</Label><Input type="number" min={0} value={form.termFee} onChange={(e) => setForm((f) => ({ ...f, termFee: e.target.value }))} placeholder="e.g. 145000" />
            <p className="text-xs text-slate-400 mt-1">Each student in this class is billed this amount per term. You can change it later.</p></div>
          <div><Label>Class teacher</Label>
            <Select value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}>
              <option value="">None yet</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create Class</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
