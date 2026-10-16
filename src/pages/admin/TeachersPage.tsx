import { useEffect, useState } from 'react'
import { Plus, Search, Eye, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { AddTeacherDialog, CheckList } from '@/components/teachers/AddTeacherDialog'
import { initials } from '@/lib/utils'
import type { Teacher } from '@/types'

export default function TeachersPage() {
  const { teachers, subjects, classes } = useStore()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const filtered = teachers.filter((t) => `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(query.toLowerCase()))
  const names = (ids: string[], list: { id: string; name: string }[]) =>
    ids.map((id) => list.find((x) => x.id === id)?.name).filter(Boolean).join(', ') || '—'
  const detail = teachers.find((t) => t.id === detailId)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Teachers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {teachers.length} teachers</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Teacher</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search teachers…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={teachers.length === 0 ? 'No teachers yet' : 'No teachers found'} description={teachers.length === 0 ? 'Add your first teacher to get started.' : undefined} />
      ) : (
        <Table>
          <THead><TR><TH>Name</TH><TH>Email</TH><TH>Phone</TH><TH>Subjects</TH><TH>Classes</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR></THead>
          <TBody>
            {filtered.map((t) => (
              <TR key={t.id}>
                <TD><div className="flex items-center gap-2.5"><Avatar initials={initials(t.firstName, t.lastName)} size={30} /><span className="font-medium text-slate-900">{t.firstName} {t.lastName}</span></div></TD>
                <TD className="text-slate-500">{t.email}</TD>
                <TD className="text-slate-500">{t.phone || '—'}</TD>
                <TD>{names(t.subjectIds, subjects)}</TD>
                <TD>{names(t.classIds, classes)}</TD>
                <TD><Badge tone={t.status === 'Active' ? 'success' : 'neutral'}>{t.status}</Badge></TD>
                <TD className="text-right"><button title="View / assign" onClick={() => setDetailId(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-4 w-4" /></button></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <AddTeacherDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {detail && <TeacherDetailDialog teacher={detail} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function TeacherDetailDialog({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const { classes, subjects, actions } = useStore()
  const { toast } = useToast()
  // Classes where they are class teacher are managed on the class itself.
  const classTeacherOf = classes.filter((c) => c.classTeacherId === teacher.id).map((c) => c.id)
  const [classIds, setClassIds] = useState(teacher.classIds.filter((c) => !classTeacherOf.includes(c)))
  const [subjectIds, setSubjectIds] = useState(teacher.subjectIds)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setSubjectIds(teacher.subjectIds) }, [teacher.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true)
    try {
      await actions.setTeacherAssignments(teacher.id, classIds, subjectIds)
      toast({ title: 'Assignments saved', tone: 'success' }); onClose()
    } catch (err) { toast({ title: 'Could not save', description: (err as Error).message, tone: 'error' }) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open onClose={onClose} title={`${teacher.firstName} ${teacher.lastName}`} description={`${teacher.email}${teacher.phone ? ' · ' + teacher.phone : ''}`}>
      <div className="space-y-4 text-sm">
        {classTeacherOf.length > 0 && (
          <div><Label>Class teacher of</Label><p className="text-slate-700">{classTeacherOf.map((id) => classes.find((c) => c.id === id)?.name).join(', ')}</p></div>
        )}
        <div><Label>Assigned classes (they can see these classes' students)</Label>
          <CheckList items={classes.filter((c) => !classTeacherOf.includes(c.id)).map((c) => ({ id: c.id, label: c.name }))} selected={classIds} onChange={setClassIds} empty="No other classes." /></div>
        <div><Label>Subjects taught</Label>
          <CheckList items={subjects.map((s) => ({ id: s.id, label: s.name }))} selected={subjectIds} onChange={setSubjectIds} empty="No subjects yet." /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save assignments</Button>
      </DialogFooter>
    </Dialog>
  )
}
