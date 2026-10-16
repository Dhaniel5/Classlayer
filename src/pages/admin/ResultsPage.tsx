import { fmtPct } from '@/lib/utils'
import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { studentAverage, studentAttendanceRate } from '@/lib/analytics'

export default function ResultsPage() {
  const { students, classes, subjects, results, attendanceRecords, school } = useStore()
  const { toast } = useToast()
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState('')

  const classStudents = students.filter((s) => s.classId === classId)
  const student = students.find((s) => s.id === studentId) ?? classStudents[0]

  const studentResults = student
    ? results.filter((r) => r.studentId === student.id && r.maxPossible > 0).sort((a, b) =>
        (subjects.find((s) => s.id === a.subjectId)?.name ?? '').localeCompare(subjects.find((s) => s.id === b.subjectId)?.name ?? '')
      )
    : []

  // Rank within class by average
  const classRankings = classStudents
    .map((s) => ({ id: s.id, avg: studentAverage(s.id, results) }))
    .sort((a, b) => b.avg - a.avg)
  const rank = student ? classRankings.findIndex((r) => r.id === student.id) + 1 : 0

  const overallAvg = student ? studentAverage(student.id, results) : 0
  const attendance = student ? studentAttendanceRate(student.id, attendanceRecords) : null
  const subjectsPassed = studentResults.filter((r) => r.grade !== 'F').length
  const subjectsNeedingAttention = studentResults.filter((r) => r.grade === 'F' || r.grade === 'E').map((r) => subjects.find((s) => s.id === r.subjectId)?.name)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Results</h1>
        <p className="text-sm text-slate-500 mt-0.5">View report-card style results for any student</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select className="sm:w-48" value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId('') }}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="sm:w-64" value={student?.id ?? ''} onChange={(e) => setStudentId(e.target.value)}>
          {classStudents.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => toast({ title: 'Report generated', description: 'A fresh snapshot of this report card has been generated.', tone: 'success' })}>
          <FileText className="h-4 w-4" /> Generate Report
        </Button>
        <Button onClick={() => window.print()}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      {!student ? (
        <EmptyState title="No students in this class" />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{student.firstName} {student.lastName} — Report Card</CardTitle>
              <p className="text-xs text-slate-500 mt-1">{classes.find((c) => c.id === classId)?.name} · {school.currentTerm} · {school.currentSession}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Mini label="Overall Average" value={`${overallAvg}%`} />
              <Mini label="Attendance" value={fmtPct(attendance)} />
              <Mini label="Class Rank" value={rank > 0 ? `${ordinal(rank)} of ${classStudents.length}` : '—'} />
              <Mini label="Subjects Passed" value={`${subjectsPassed}/${studentResults.length}`} />
            </div>

            <Table>
              <THead><TR><TH>Subject</TH><TH>Score</TH><TH>Grade</TH><TH>Remark</TH></TR></THead>
              <TBody>
                {studentResults.map((r) => (
                  <TR key={r.subjectId}>
                    <TD className="font-medium text-slate-800">{subjects.find((s) => s.id === r.subjectId)?.name}</TD>
                    <TD>{r.totalScore}/{r.maxPossible} ({r.percentage}%)</TD>
                    <TD><Badge tone={r.grade === 'F' ? 'danger' : r.grade === 'A' ? 'success' : 'info'}>{r.grade}</Badge></TD>
                    <TD className="text-slate-500">{r.remark}</TD>
                  </TR>
                ))}
                {studentResults.length === 0 && <TR><TD colSpan={4}><EmptyState title="No results recorded yet for this student" /></TD></TR>}
              </TBody>
            </Table>

            {subjectsNeedingAttention.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs font-medium text-amber-700">Subjects needing attention</p>
                <p className="text-sm text-amber-800 mt-0.5">{subjectsNeedingAttention.join(', ')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
