import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InsightCard } from '@/components/ai/InsightCard'
import { ReportCommentGenerator } from '@/components/ai/ReportCommentGenerator'
import { EmptyState } from '@/components/ui/states'
import { generateSchoolInsights } from '@/services/ai/aiService'
import { attendanceRateForClass, subjectAverage, studentsNeedingAttention, subjectDeclines } from '@/lib/analytics'
import type { AIInsight } from '@/types'

export default function AIInsightsPage() {
  const { classes, subjects, results, attendanceRecords, students, assessments, assessmentScores, school } = useStore()
  const { user } = useAuth()
  const [insights, setInsights] = useState<AIInsight[] | null>(null)

  useEffect(() => {
    setInsights(null)
    generateSchoolInsights({
      attendanceByClass: classes.map((c) => ({ className: c.name, rate: attendanceRateForClass(c.id, attendanceRecords) })),
      subjectDeclines: subjectDeclines(classes, subjects, assessments, assessmentScores, school.currentTerm, school.currentSession),
      performanceBySubject: subjects.map((s) => ({ subjectName: s.name, average: subjectAverage(s.id, results) })),
      studentsNeedingAttention: studentsNeedingAttention(students, results, attendanceRecords).map((s) => ({
        name: s.name, className: classes.find((c) => c.id === s.classId)?.name ?? '', reason: s.reason,
      })),
    }).then(setInsights)
  }, [classes, subjects, results, attendanceRecords, students, assessments, assessmentScores, school.currentTerm, school.currentSession])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Insights</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Observations computed from your school's recorded data{user?.role === 'teacher' ? ' (your classes only)' : ''}.
        </p>
      </div>
      <Tabs defaultValue="school">
        <TabsList>
          <TabsTrigger value="school">Insights</TabsTrigger>
          <TabsTrigger value="comments">Report Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="school">
          {!insights ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-16"><Loader2 className="h-4 w-4 animate-spin" /> Analysing data…</div>
          ) : insights.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Nothing to flag yet" description="Insights appear once attendance and assessment scores have been recorded." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{insights.map((i) => <InsightCard key={i.id} insight={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="comments"><ReportCommentGenerator /></TabsContent>
      </Tabs>
    </div>
  )
}
