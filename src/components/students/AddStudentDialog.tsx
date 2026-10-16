import { useState } from 'react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useStore } from '@/services/store'
import { useToast } from '@/components/ui/toast'
import type { Student, Gender } from '@/types'

export function AddStudentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { classes, parents, dispatch } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState({
    firstName: '', lastName: '', studentCode: '', dob: '', gender: 'Male' as Gender,
    classId: classes[0]?.id ?? '', parentName: '', parentPhone: '', parentEmail: '',
    address: '', admissionDate: new Date().toISOString().slice(0, 10),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim()) e.lastName = 'Last name is required'
    if (!form.studentCode.trim()) e.studentCode = 'Student ID is required'
    if (!form.dob) e.dob = 'Date of birth is required'
    if (!form.classId) e.classId = 'Select a class'
    if (!form.parentName.trim()) e.parentName = 'Parent/Guardian name is required'
    if (!form.parentPhone.trim()) e.parentPhone = 'Parent phone is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const [pf, ...pl] = form.parentName.trim().split(' ')
    let parent = parents.find((p) => `${p.firstName} ${p.lastName}`.toLowerCase() === form.parentName.trim().toLowerCase())
    const parentId = parent?.id ?? `parent-new-${Date.now()}`

    const student: Student = {
      id: `student-new-${Date.now()}`,
      studentCode: form.studentCode,
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      dateOfBirth: form.dob,
      classId: form.classId,
      parentIds: [parentId],
      address: form.address,
      admissionDate: form.admissionDate,
      status: 'Active',
      photoColor: '#2563EB',
    }

    if (!parent) {
      dispatch({
        type: 'ADD_STUDENT',
        student: { ...student },
      })
    } else {
      dispatch({ type: 'ADD_STUDENT', student })
    }

    toast({ title: 'Student added', description: `${form.firstName} ${form.lastName} has been added successfully.`, tone: 'success' })
    onClose()
    setForm({
      firstName: '', lastName: '', studentCode: '', dob: '', gender: 'Male',
      classId: classes[0]?.id ?? '', parentName: '', parentPhone: '', parentEmail: '',
      address: '', admissionDate: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add Student" description="Create a new student record">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <Label>Last name</Label>
            <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Student ID</Label>
            <Input value={form.studentCode} onChange={(e) => update('studentCode', e.target.value)} placeholder="BHA/2026/045" />
            {errors.studentCode && <p className="text-xs text-red-600 mt-1">{errors.studentCode}</p>}
          </div>
          <div>
            <Label>Date of birth</Label>
            <Input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
            {errors.dob && <p className="text-xs text-red-600 mt-1">{errors.dob}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Gender</Label>
            <Select value={form.gender} onChange={(e) => update('gender', e.target.value as Gender)}>
              <option>Male</option>
              <option>Female</option>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select value={form.classId} onChange={(e) => update('classId', e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {errors.classId && <p className="text-xs text-red-600 mt-1">{errors.classId}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Parent / Guardian</Label>
            <Input value={form.parentName} onChange={(e) => update('parentName', e.target.value)} placeholder="Full name" />
            {errors.parentName && <p className="text-xs text-red-600 mt-1">{errors.parentName}</p>}
          </div>
          <div>
            <Label>Parent phone</Label>
            <Input value={form.parentPhone} onChange={(e) => update('parentPhone', e.target.value)} placeholder="+234…" />
            {errors.parentPhone && <p className="text-xs text-red-600 mt-1">{errors.parentPhone}</p>}
          </div>
        </div>
        <div>
          <Label>Parent email</Label>
          <Input type="email" value={form.parentEmail} onChange={(e) => update('parentEmail', e.target.value)} />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div>
          <Label>Admission date</Label>
          <Input type="date" value={form.admissionDate} onChange={(e) => update('admissionDate', e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Student</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
