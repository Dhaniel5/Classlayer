import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useStore } from '@/services/store'
import { useToast } from '@/components/ui/toast'
import { todayLocalISO } from '@/lib/utils'
import type { Gender, Student } from '@/types'

const blank = (classId: string) => ({
  firstName: '', lastName: '', studentCode: '', dob: '', gender: 'Male' as Gender, classId,
  parentName: '', parentPhone: '', parentEmail: '', address: '', admissionDate: todayLocalISO(),
  status: 'Active' as 'Active' | 'Inactive',
})

/** Add a student (no `student` prop) or edit an existing one. */
export function StudentFormDialog({ open, onClose, student }: { open: boolean; onClose: () => void; student?: Student }) {
  const { classes, parents, actions } = useStore()
  const { toast } = useToast()
  const editing = !!student
  const [form, setForm] = useState(blank(classes[0]?.id ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (student) {
      const p = parents.find((x) => student.parentIds.includes(x.id))
      setForm({
        firstName: student.firstName, lastName: student.lastName, studentCode: student.studentCode,
        dob: student.dateOfBirth, gender: student.gender, classId: student.classId,
        parentName: p ? `${p.firstName} ${p.lastName}` : '', parentPhone: p?.phone ?? '', parentEmail: p?.email ?? '',
        address: student.address, admissionDate: student.admissionDate, status: student.status,
      })
    } else setForm(blank(classes[0]?.id ?? ''))
  }, [open, student, classes, parents])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim()) e.lastName = 'Last name is required'
    if (!form.studentCode.trim()) e.studentCode = 'Student ID is required'
    if (!form.dob) e.dob = 'Date of birth is required'
    if (!form.classId) e.classId = 'Select a class'
    if (!editing) {
      if (!form.parentName.trim()) e.parentName = 'Parent/Guardian name is required'
      if (!form.parentPhone.trim() && !form.parentEmail.trim()) e.parentPhone = 'Enter a phone number or email'
      if (form.parentEmail && !/^\S+@\S+\.\S+$/.test(form.parentEmail)) e.parentEmail = 'Enter a valid email'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setBusy(true)
    try {
      const base = {
        firstName: form.firstName, lastName: form.lastName, studentCode: form.studentCode,
        dateOfBirth: form.dob, gender: form.gender, classId: form.classId, address: form.address,
        admissionDate: form.admissionDate,
      }
      if (student) await actions.updateStudent(student.id, { ...base, status: form.status })
      else await actions.addStudent({ ...base, parentName: form.parentName, parentPhone: form.parentPhone, parentEmail: form.parentEmail })
      toast({ title: editing ? 'Student updated' : 'Student added', description: `${form.firstName} ${form.lastName}`, tone: 'success' })
      onClose()
    } catch (err) {
      toast({ title: 'Could not save student', description: (err as Error).message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const err = (k: string) => errors[k] && <p className="text-xs text-red-600 mt-1">{errors[k]}</p>

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Edit Student' : 'Add Student'} description={editing ? 'Update this student record' : 'Create a new student record'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First name</Label><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />{err('firstName')}</div>
          <div><Label>Last name</Label><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />{err('lastName')}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Student ID</Label><Input value={form.studentCode} onChange={(e) => set('studentCode', e.target.value)} placeholder="e.g. BHA/2026/045" />{err('studentCode')}</div>
          <div><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />{err('dob')}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Gender</Label>
            <Select value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)}><option>Male</option><option>Female</option></Select></div>
          <div><Label>Class</Label>
            <Select value={form.classId} onChange={(e) => set('classId', e.target.value)}>
              {classes.length === 0 && <option value="">No classes yet</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>{err('classId')}</div>
        </div>
        {!editing && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Parent / Guardian</Label><Input value={form.parentName} onChange={(e) => set('parentName', e.target.value)} placeholder="Full name" />{err('parentName')}</div>
              <div><Label>Parent phone</Label><Input value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} placeholder="+234…" />{err('parentPhone')}</div>
            </div>
            <div>
              <Label>Parent email</Label>
              <Input type="email" value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">The parent signs in to the parent portal with this email.</p>
              {err('parentEmail')}
            </div>
          </>
        )}
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Admission date</Label><Input type="date" value={form.admissionDate} onChange={(e) => set('admissionDate', e.target.value)} /></div>
          {editing && (
            <div><Label>Status</Label>
              <Select value={form.status} onChange={(e) => set('status', e.target.value as 'Active' | 'Inactive')}><option>Active</option><option>Inactive</option></Select></div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || classes.length === 0}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save Changes' : 'Add Student'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
