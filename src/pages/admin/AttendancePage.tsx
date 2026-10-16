import { useState } from 'react'
import { CheckCircle2, Save, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { initials, fmtPct, todayLocalISO } from '@/lib/utils'
import type { AttendanceRecord, AttendanceStatus } from '@/types'
import { attendanceRateForClass } from '@/lib/analytics'

function rateOf(records: AttendanceRecord[]): number | null {
  let present = 0, total = 0
  records.forEach((r) => r.entries.forEach((e) => { total++; if (e.status !== 'Absent') present++ }))
  return total ? Math.round((present / total) * 100) : null
}

export default function AttendancePage() {
  // `classes` is already limited by the database to the classes this user may mark.
  const { classes, students, attendanceRecords, actions } = useStore()
  const { toast } = useToast()
  const today = todayLocalISO()

  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({})
  const [busy, setBusy] = useState(false)

  const cls = classes.find((c) => c.id === classId)
  const classStudents = students.filter((s) => s.classId === classId && s.status === 'Active')
  const existing = attendanceRecords.find((r) => r.classId === classId && r.date === date)

  // Not memoised on purpose: it must reflect every click on the draft.
  const statusOf = (studentId: string): AttendanceStatus =>
    draft[studentId] ?? existing?.entries.find((e) => e.studentId === studentId)?.status ?? 'Present'

  const markAllPresent = () => setDraft(Object.fromEntries(classStudents.map((s) => [s.id, 'Present' as AttendanceStatus])))

  async function handleSave() {
    if (!classId || classStudents.length === 0) return
    setBusy(true)
    try {
      await actions.saveAttendance(classId, date, classStudents.map((s) => ({ studentId: s.id, status: statusOf(s.id) })))
      toast({ title: 'Attendance saved', description: `${cls?.name} · ${date}`, tone: 'success' })
      setDraft({})
    } catch (err) {
      toast({ title: 'Could not save attendance', description: (err as Error).message, tone: 'error' })
    } finally { setBusy(false) }
  }

  const dates = Array.from(new Set(attendanceRecords.map((r) => r.date))).sort()
  const weekDates = dates.slice(-5)
  const todayRate = rateOf(attendanceRecords.filter((r) => r.date === today))
  const weeklyRate = rateOf(attendanceRecords.filter((r) => weekDates.includes(r.date)))
  const monthPrefix = today.slice(0, 7)
  const monthlyRate = rateOf(attendanceRecords.filter((r) => r.date.startsWith(monthPrefix)))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500 mt-0.5">Mark daily attendance and track trends</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox label="Today" value={fmtPct(todayRate)} />
        <StatBox label="Last 5 school days" value={fmtPct(weeklyRate)} />
        <StatBox label="This month" value={fmtPct(monthlyRate)} />
        <StatBox label="This class (all recorded)" value={classId ? fmtPct(attendanceRateForClass(classId, attendanceRecords)) : '—'} />
      </div>

      <Card>
        <CardHeader><CardTitle>Mark Attendance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {classes.length === 0 ? (
            <EmptyState title="No classes available" description="You haven't been assigned to a class yet. Ask the school admin to assign you." />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select className="sm:w-56" value={classId} onChange={(e) => { setClassId(e.target.value); setDraft({}) }}>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Input type="date" className="sm:w-48" value={date} max={today} onChange={(e) => { setDate(e.target.value || today); setDraft({}) }} />
                <div className="flex-1" />
                <Button variant="outline" onClick={markAllPresent} disabled={classStudents.length === 0}><CheckCircle2 className="h-4 w-4" /> Mark all present</Button>
                <Button onClick={handleSave} disabled={busy || classStudents.length === 0}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Attendance
                </Button>
              </div>

              {classStudents.length === 0 ? (
                <EmptyState title="No active students in this class" />
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {classStudents.map((s) => {
                    const current = statusOf(s.id)
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar initials={initials(s.firstName, s.lastName)} color={s.photoColor} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-slate-400">{s.studentCode}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {(['Present', 'Late', 'Absent'] as AttendanceStatus[]).map((st) => (
                            <button key={st} onClick={() => setDraft((d) => ({ ...d, [s.id]: st }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                current === st
                                  ? st === 'Present' ? 'bg-teal-600 border-teal-600 text-white'
                                  : st === 'Late' ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'bg-red-500 border-red-500 text-white'
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {existing ? (
                <p className="text-xs text-slate-500"><Badge tone="info">Already submitted</Badge> for this date — saving again updates it.</p>
              ) : classStudents.length > 0 && (
                <p className="text-xs text-slate-400">Nothing saved yet for this date. Students default to Present until you save.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </CardContent></Card>
  )
}
