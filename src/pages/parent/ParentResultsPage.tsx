import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/states'
import { studentAverage } from '@/lib/analytics'

export default function ParentResultsPage() {
  const { user } = useAuth()
  const { parents, students, results, subjects } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const child = students.find((s) => parent?.studentIds.includes(s.id))
  if (!child) return <EmptyState title="No linked child found" />

  const childResults = results.filter((r) => r.studentId === child.id && r.maxPossible > 0)
  const avg = studentAverage(child.id, results)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Results</h1>
        <p className="text-sm text-slate-500 mt-0.5">{avg > 0 ? `Overall average: ${avg}%` : 'No results recorded yet this term'}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Subject results</CardTitle></CardHeader>
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
