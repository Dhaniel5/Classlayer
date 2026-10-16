import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/states'
import { initials, formatDate, formatNaira, fmtPct } from '@/lib/utils'
import { studentAttendanceRate, studentAverage } from '@/lib/analytics'
import { generateStudentSummary } from '@/services/ai/aiService'

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { students, classes, parents, attendanceRecords, results, subjects, fees, payments } = useStore()
  const student = students.find((s) => s.id === studentId)

  if (!student) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="Student not found" description="This student may have been removed." />
      </div>
    )
  }

  const cls = classes.find((c) => c.id === student.classId)
  const parent = parents.find((p) => student.parentIds.includes(p.id))
  const attRate = studentAttendanceRate(student.id, attendanceRecords)
  const avg = studentAverage(student.id, results)
  const studentResults = results.filter((r) => r.studentId === student.id && r.maxPossible > 0)
  const studentAttendance = attendanceRecords
    .filter((r) => r.entries.some((e) => e.studentId === student.id))
    .sort((a, b) => b.date.localeCompare(a.date))
  const studentFee = fees.find((f) => f.studentId === student.id)
  const studentPayments = payments.filter((p) => p.studentId === student.id)

  return (
    <div className="space-y-5">
      <BackLink />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar initials={initials(student.firstName, student.lastName)} color={student.photoColor} size={56} />
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-slate-500">{student.studentCode} · {cls?.name} · {student.gender}</p>
        </div>
        <Badge tone={student.status === 'Active' ? 'success' : 'neutral'}>{student.status}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Attendance" value={fmtPct(attRate)} />
        <MiniStat label="Average Score" value={avg > 0 ? `${avg}%` : '—'} />
        <MiniStat label="Class" value={cls?.name ?? '—'} />
        <MiniStat label="Fee Status" value={studentFee?.status ?? '—'} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Date of birth" value={formatDate(student.dateOfBirth)} />
              <InfoRow label="Admission date" value={formatDate(student.admissionDate)} />
              <InfoRow label="Address" value={student.address} />
              <InfoRow label="Parent / Guardian" value={parent ? `${parent.firstName} ${parent.lastName}` : '—'} />
              <InfoRow label="Parent phone" value={parent?.phone ?? '—'} />
              <InfoRow label="Parent email" value={parent?.email ?? '—'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Attendance History</CardTitle></CardHeader>
            <CardContent>
              {studentAttendance.length === 0 ? (
                <EmptyState title="No attendance records yet" />
              ) : (
                <Table>
                  <THead><TR><TH>Date</TH><TH>Status</TH></TR></THead>
                  <TBody>
                    {studentAttendance.slice(0, 15).map((r) => {
                      const entry = r.entries.find((e) => e.studentId === student.id)!
                      return (
                        <TR key={r.id}>
                          <TD>{formatDate(r.date)}</TD>
                          <TD><Badge tone={entry.status === 'Present' ? 'success' : entry.status === 'Late' ? 'warning' : 'danger'}>{entry.status}</Badge></TD>
                        </TR>
                      )
                    })}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Card>
            <CardHeader><CardTitle>Scores by Subject</CardTitle></CardHeader>
            <CardContent>
              {studentResults.length === 0 ? (
                <EmptyState title="No assessments recorded yet" />
              ) : (
                <Table>
                  <THead><TR><TH>Subject</TH><TH>Score</TH><TH>Percentage</TH><TH>Grade</TH></TR></THead>
                  <TBody>
                    {studentResults.map((r) => (
                      <TR key={r.subjectId}>
                        <TD>{subjects.find((s) => s.id === r.subjectId)?.name}</TD>
                        <TD>{r.totalScore}/{r.maxPossible}</TD>
                        <TD>{r.percentage}%</TD>
                        <TD><Badge tone={r.grade === 'F' ? 'danger' : r.grade === 'A' ? 'success' : 'info'}>{r.grade}</Badge></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader><CardTitle>Academic Performance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {studentResults.map((r) => (
                <div key={r.subjectId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{subjects.find((s) => s.id === r.subjectId)?.name}</span>
                    <span className="text-slate-500">{r.percentage}%</span>
                  </div>
                  <Progress value={r.percentage} />
                </div>
              ))}
              {studentResults.length === 0 && <EmptyState title="No results yet" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader><CardTitle>Fee Status</CardTitle></CardHeader>
            <CardContent>
              {studentFee ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <MiniStat label="Amount Due" value={formatNaira(studentFee.amountDue)} />
                    <MiniStat label="Paid" value={formatNaira(studentFee.amountPaid)} />
                    <MiniStat label="Balance" value={formatNaira(studentFee.amountDue - studentFee.amountPaid)} />
                  </div>
                  <Table>
                    <THead><TR><TH>Date</TH><TH>Amount</TH><TH>Method</TH><TH>Reference</TH></TR></THead>
                    <TBody>
                      {studentPayments.map((p) => (
                        <TR key={p.id}>
                          <TD>{formatDate(p.date)}</TD>
                          <TD>{formatNaira(p.amount)}</TD>
                          <TD>{p.method}</TD>
                          <TD className="text-slate-400">{p.reference}</TD>
                        </TR>
                      ))}
                      {studentPayments.length === 0 && (
                        <TR><TD colSpan={4}><EmptyState title="No payments recorded yet" /></TD></TR>
                      )}
                    </TBody>
                  </Table>
                </>
              ) : <EmptyState title="No fee record found" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <EmptyState title="No generated reports yet" description="Generate a report from the Results page to see it here." />
        </TabsContent>

        <TabsContent value="ai">
          <StudentAIInsight studentId={student.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StudentAIInsight({ studentId }: { studentId: string }) {
  const { students, results, subjects } = useStore()
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const student = students.find((s) => s.id === studentId)!
  const subjectResults = results
    .filter((r) => r.studentId === studentId && r.maxPossible > 0)
    .map((r) => ({ subjectName: subjects.find((s) => s.id === r.subjectId)?.name ?? '', percentage: r.percentage, grade: r.grade }))

  useEffect(() => {
    setLoading(true)
    generateStudentSummary(student, subjectResults).then((s) => {
      setSummary(s)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-teal-600" /> AI Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Generating summary…</div>
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        )}
      </CardContent>
    </Card>
  )
}

function BackLink() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}
