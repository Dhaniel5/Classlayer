import { useState } from 'react'
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StudentFormDialog } from '@/components/students/StudentFormDialog'
import { initials, fmtPct } from '@/lib/utils'
import { studentAttendanceRate } from '@/lib/analytics'
import { canManageSchool } from '@/lib/permissions'
import { useToast } from '@/components/ui/toast'
import type { Student } from '@/types'

export default function StudentsPage() {
  // NOTE: `students` is already limited by the database to what this user may see
  // (a teacher receives only the students in their assigned classes).
  const { students, classes, parents, attendanceRecords, actions } = useStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const canManage = !!user && canManageSchool(user.role)
  const isTeacher = user?.role === 'teacher'

  const filtered = students.filter((s) => {
    const matchesQuery = `${s.firstName} ${s.lastName} ${s.studentCode}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (classFilter === 'all' || s.classId === classFilter)
  })

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? '—'
  const parentName = (ids: string[]) => {
    const p = parents.find((pp) => pp.id === ids[0])
    return p ? `${p.firstName} ${p.lastName}` : '—'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{isTeacher ? 'My Students' : 'Students'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {students.length} students{isTeacher ? ' in your assigned classes' : ''}</p>
        </div>
        {canManage && <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}><Plus className="h-4 w-4" /> Add Student</Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search students…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select className="sm:w-48" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={students.length === 0 ? 'No students yet' : 'No students found'}
          description={students.length === 0
            ? (canManage ? 'Add your first student to get started.' : 'No students are assigned to you yet. Ask the school admin to assign you to a class.')
            : 'Try adjusting your search or filters.'}
        />
      ) : (
        <Table>
          <THead>
            <TR><TH>Student</TH><TH>Student ID</TH><TH>Class</TH><TH>Gender</TH><TH>Parent</TH><TH>Attendance</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR>
          </THead>
          <TBody>
            {filtered.map((s) => (
              <TR key={s.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initials(s.firstName, s.lastName)} color={s.photoColor} size={30} />
                    <span className="font-medium text-slate-900">{s.firstName} {s.lastName}</span>
                  </div>
                </TD>
                <TD className="text-slate-500">{s.studentCode}</TD>
                <TD>{className(s.classId)}</TD>
                <TD>{s.gender}</TD>
                <TD>{parentName(s.parentIds)}</TD>
                <TD>{fmtPct(studentAttendanceRate(s.id, attendanceRecords))}</TD>
                <TD><Badge tone={s.status === 'Active' ? 'success' : 'neutral'}>{s.status}</Badge></TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <button title="View" onClick={() => navigate(`/app/students/${s.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-4 w-4" /></button>
                    {canManage && (
                      <>
                        <button title="Edit" onClick={() => { setEditing(s); setFormOpen(true) }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                        <button title="Delete" onClick={() => setDeleteTarget(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <StudentFormDialog open={formOpen} onClose={() => setFormOpen(false)} student={editing} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try { await actions.deleteStudent(deleteTarget); toast({ title: 'Student removed', tone: 'success' }) }
          catch (err) { toast({ title: 'Could not remove student', description: (err as Error).message, tone: 'error' }) }
        }}
        title="Remove student?"
        description="This permanently removes the student and their attendance and scores. Students with payment records can't be deleted — mark them Inactive instead."
        confirmLabel="Remove"
      />
    </div>
  )
}
