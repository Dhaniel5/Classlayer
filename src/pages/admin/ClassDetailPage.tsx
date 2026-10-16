import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/states'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { initials, fmtPct } from '@/lib/utils'
import { useAuth } from '@/services/auth/AuthContext'
import { canManageSchool, canSeeFinance } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { attendanceRateForClass, classAverage, last7DaysAttendance, subjectAverage, subjectDeclines, studentsNeedingAttention } from '@/lib/analytics'
import { AttendanceChart } from '@/components/dashboard/AttendanceChart'
import { generateSchoolInsights } from '@/services/ai/aiService'
import type { AIInsight } from '@/types'
import { InsightCard } from '@/components/ai/InsightCard'

export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { classes, students, teachers, attendanceRecords, results, subjects } = useStore()
  const { user } = useAuth()
  const cls = classes.find((c) => c.id === classId)

  if (!cls) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="Class not found" />
      </div>
    )
  }

  const classStudents = students.filter((s) => s.classId === cls.id)
  const teacher = teachers.find((t) => t.id === cls.classTeacherId)
  const attRate = attendanceRateForClass(cls.id, attendanceRecords)
  const avg = classAverage(cls.id, results)
  const classAttendance = attendanceRecords.filter((r) => r.classId === cls.id)
  const classResults = results.filter((r) => r.classId === cls.id && r.maxPossible > 0)

  const subjectPerf = cls.subjectIds.map((sid) => ({
    name: subjects.find((s) => s.id === sid)?.name ?? '',
    average: subjectAverage(sid, classResults),
  }))

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{cls.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cls.level} · Class teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}</p>
        </div>
        <div className="flex gap-3">
          <MiniStat label="Students" value={String(classStudents.length)} />
          <MiniStat label="Avg. Performance" value={avg > 0 ? `${avg}%` : '—'} />
          <MiniStat label="Attendance" value={fmtPct(attRate)} />
        </div>
      </div>

      {user && canManageSchool(user.role) && <ClassAdminControls classId={cls.id} showFee={canSeeFinance(user.role)} />}

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Table>
            <THead><TR><TH>Student</TH><TH>Student ID</TH><TH>Gender</TH><TH>Status</TH></TR></THead>
            <TBody>
              {classStudents.map((s) => (
                <TR key={s.id} className="cursor-pointer" onClick={() => navigate(`/app/students/${s.id}`)}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={initials(s.firstName, s.lastName)} color={s.photoColor} size={28} />
                      {s.firstName} {s.lastName}
                    </div>
                  </TD>
                  <TD className="text-slate-500">{s.studentCode}</TD>
                  <TD>{s.gender}</TD>
                  <TD><Badge tone="success">{s.status}</Badge></TD>
                </TR>
              ))}
              {classStudents.length === 0 && <TR><TD colSpan={4}><EmptyState title="No students in this class yet" /></TD></TR>}
            </TBody>
          </Table>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Class Attendance</CardTitle></CardHeader>
            <CardContent>
              <AttendanceChart data={last7DaysAttendance(classAttendance)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Table>
            <THead><TR><TH>Subject</TH><TH>Class Average</TH></TR></THead>
            <TBody>
              {subjectPerf.map((sp) => (
                <TR key={sp.name}><TD>{sp.name}</TD><TD>{sp.average}%</TD></TR>
              ))}
            </TBody>
          </Table>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
            <CardContent>
              <PerformanceChart data={subjectPerf.map((s) => ({ name: s.name, average: s.average }))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Attendance (last 7 school days)</CardTitle></CardHeader>
              <CardContent><AttendanceChart data={last7DaysAttendance(classAttendance)} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Performance by Subject</CardTitle></CardHeader>
              <CardContent><PerformanceChart data={subjectPerf} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <ClassAIInsights classId={cls.id} className={cls.name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ClassAIInsights({ classId, className }: { classId: string; className: string }) {
  const { classes, results, attendanceRecords, subjects, assessments, assessmentScores, students, school } = useStore()
  const [insights, setInsights] = useState<AIInsight[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const cls = classes.find((c) => c.id === classId)!
    const classResults = results.filter((r) => r.classId === classId && r.maxPossible > 0)
    const classStudents = students.filter((s) => s.classId === classId)
    generateSchoolInsights({
      attendanceByClass: [{ className, rate: attendanceRateForClass(classId, attendanceRecords) }],
      subjectDeclines: subjectDeclines([cls], subjects, assessments, assessmentScores, school.currentTerm, school.currentSession),
      performanceBySubject: cls.subjectIds.map((sid) => ({
        subjectName: subjects.find((s) => s.id === sid)?.name ?? '',
        average: subjectAverage(sid, classResults),
      })),
      studentsNeedingAttention: studentsNeedingAttention(classStudents, results, attendanceRecords)
        .map((s) => ({ name: s.name, className, reason: s.reason })),
    }).then((res) => { setInsights(res); setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, results, attendanceRecords])

  if (loading || !insights) {
    return <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Analysing class data…</div>
  }
  if (insights.length === 0) {
    return <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No insights yet" description="Insights appear once this class has attendance and assessment scores recorded." />
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
    </div>
  )
}

function ClassAdminControls({ classId, showFee }: { classId: string; showFee: boolean }) {
  const { classes, teachers, actions } = useStore()
  const { toast } = useToast()
  const cls = classes.find((c) => c.id === classId)!
  const [fee, setFee] = useState(String(cls.termFee))
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true)
    try { await fn(); toast({ title: ok, tone: 'success' }) }
    catch (err) { toast({ title: 'Could not save', description: (err as Error).message, tone: 'error' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500 mb-1.5">Class teacher</p>
        <Select value={cls.classTeacherId ?? ''} disabled={busy}
          onChange={(e) => run(() => actions.setClassTeacher(cls.id, e.target.value || null), 'Class teacher updated')}>
          <option value="">None</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
        </Select>
      </div>
      {showFee && (
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Term fee per student (₦)</p>
          <div className="flex gap-2">
            <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
            <Button variant="outline" disabled={busy || Number(fee) === cls.termFee || fee === ''}
              onClick={() => run(() => actions.setClassFee(cls.id, Number(fee)), 'Term fee updated for this term')}>Save</Button>
          </div>
        </div>
      )}
    </div>
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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
