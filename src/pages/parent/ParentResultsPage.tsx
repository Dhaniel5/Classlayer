import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/states'
import { studentAverage } from '@/lib/analytics'
import { generateStudentSummary } from '@/services/ai/aiService'

export default function ParentResultsPage() {
  const { user } = useAuth()
  const { parents, students, results, subjects } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const child = students.find((s) => parent?.studentIds.includes(s.id))
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const childResults = child ? results.filter((r) => r.studentId === child.id && r.maxPossible > 0) : []

  useEffect(() => {
    if (!child) return
    setLoading(true)
    const subjectResults = childResults.map((r) => ({ subjectName: subjects.find((s) => s.id === r.subjectId)?.name ?? '', percentage: r.percentage, grade: r.grade }))
    generateStudentSummary(child, subjectResults).then((s) => { setSummary(s); setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id])

  if (!child) return <EmptyState title="No linked child found" />
  const avg = studentAverage(child.id, results)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Results</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overall average: {avg}%</p>
      </div>

      <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-teal-600" /> AI Summary</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Generating…</div>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Results</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {childResults.length === 0 ? (
            <EmptyState title="No results recorded yet" />
          ) : childResults.map((r) => (
            <div key={r.subjectId}>
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-slate-700">{subjects.find((s) => s.id === r.subjectId)?.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{r.percentage}%</span>
                  <Badge tone={r.grade === 'F' ? 'danger' : r.grade === 'A' ? 'success' : 'info'}>{r.grade}</Badge>
                </div>
              </div>
              <Progress value={r.percentage} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
