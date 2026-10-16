import { useState } from 'react'
import { FileBarChart, Download, Eye } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { classAverage, attendanceRateForClass, feeTotals } from '@/lib/analytics'
import { formatNaira, fmtPct } from '@/lib/utils'
import { useAuth } from '@/services/auth/AuthContext'
import { canSeeFinance } from '@/lib/permissions'

const reportTypes = [
  'Student Report',
  'Class Performance Report',
  'Attendance Report',
  'Fee Report',
  'Academic Performance Report',
] as const

export default function ReportsPage() {
  const { classes, students, school } = useStore()
  const { user } = useAuth()
  const finance = !!user && canSeeFinance(user.role)
  const academic = user?.role !== 'accountant'
  const available = reportTypes.filter((r) => (r === 'Fee Report' ? finance : academic))
  const { toast } = useToast()
  const [reportType, setReportType] = useState<(typeof reportTypes)[number]>(() => (user?.role === 'accountant' ? 'Fee Report' : 'Class Performance Report'))
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState('')
  const [generated, setGenerated] = useState(false)

  const classStudents = students.filter((s) => s.classId === classId)

  function handleGenerate() {
    setGenerated(true)
    toast({ title: 'Report generated', description: `${reportType} is ready below.`, tone: 'success' })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate and export school reports</p>
      </div>

      <Card>
        <CardContent className="pt-5 flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select className="sm:w-56" value={reportType} onChange={(e) => { setReportType(e.target.value as typeof reportType); setGenerated(false) }}>
            {available.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select value={school.currentSession} disabled className="sm:w-40">
            <option>{school.currentSession}</option>
          </Select>
          <Select value={school.currentTerm} disabled className="sm:w-36">
            <option>{school.currentTerm}</option>
          </Select>
          {(reportType === 'Class Performance Report' || reportType === 'Attendance Report' || reportType === 'Student Report') && (
            <Select className="sm:w-48" value={classId} onChange={(e) => { setClassId(e.target.value); setGenerated(false) }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          {reportType === 'Student Report' && (
            <Select className="sm:w-56" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select student…</option>
              {classStudents.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </Select>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={handleGenerate}><Eye className="h-4 w-4" /> Generate</Button>
          <Button onClick={() => window.print()}><Download className="h-4 w-4" /> Download</Button>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart className="h-4 w-4 text-teal-600" /> {reportType}</CardTitle></CardHeader>
          <CardContent>
            {reportType === 'Class Performance Report' && <ClassPerformanceReport classId={classId} />}
            {reportType === 'Attendance Report' && <AttendanceReport classId={classId} />}
            {reportType === 'Fee Report' && <FeeReport />}
            {reportType === 'Academic Performance Report' && <AcademicReport />}
            {reportType === 'Student Report' && (
              studentId ? <StudentSummary studentId={studentId} /> : <p className="text-sm text-slate-500">Select a student above.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ClassPerformanceReport({ classId }: { classId: string }) {
  const { classes, results } = useStore()
  const cls = classes.find((c) => c.id === classId)!
  return (
    <Table>
      <THead><TR><TH>Class</TH><TH>Students</TH><TH>Average Performance</TH></TR></THead>
      <TBody>
        <TR><TD>{cls.name}</TD><TD>{cls.studentIds.length}</TD><TD>{classAverage(classId, results)}%</TD></TR>
      </TBody>
    </Table>
  )
}

function AttendanceReport({ classId }: { classId: string }) {
  const { classes, attendanceRecords } = useStore()
  const cls = classes.find((c) => c.id === classId)!
  return (
    <Table>
      <THead><TR><TH>Class</TH><TH>Attendance Rate</TH></TR></THead>
      <TBody><TR><TD>{cls.name}</TD><TD>{fmtPct(attendanceRateForClass(classId, attendanceRecords))}</TD></TR></TBody>
    </Table>
  )
}

function FeeReport() {
  const { fees } = useStore()
  const { expected, collected, outstanding } = feeTotals(fees)
  return (
    <Table>
      <THead><TR><TH>Expected</TH><TH>Collected</TH><TH>Outstanding</TH></TR></THead>
      <TBody><TR><TD>{formatNaira(expected)}</TD><TD>{formatNaira(collected)}</TD><TD>{formatNaira(outstanding)}</TD></TR></TBody>
    </Table>
  )
}

function AcademicReport() {
  const { classes, results } = useStore()
  return (
    <Table>
      <THead><TR><TH>Class</TH><TH>Average Performance</TH></TR></THead>
      <TBody>
        {classes.map((c) => <TR key={c.id}><TD>{c.name}</TD><TD>{classAverage(c.id, results)}%</TD></TR>)}
      </TBody>
    </Table>
  )
}

function StudentSummary({ studentId }: { studentId: string }) {
  const { students, results, subjects } = useStore()
  const student = students.find((s) => s.id === studentId)!
  const studentResults = results.filter((r) => r.studentId === studentId && r.maxPossible > 0)
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{student.firstName} {student.lastName} — {studentResults.length} subjects recorded</p>
      <Table>
        <THead><TR><TH>Subject</TH><TH>Score</TH><TH>Grade</TH></TR></THead>
        <TBody>
          {studentResults.map((r) => (
            <TR key={r.subjectId}><TD>{subjects.find((s) => s.id === r.subjectId)?.name}</TD><TD>{r.percentage}%</TD><TD>{r.grade}</TD></TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}
