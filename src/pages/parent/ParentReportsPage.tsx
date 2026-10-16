import { Download } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'

export default function ParentReportsPage() {
  const { user } = useAuth()
  const { parents, students, school } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const child = students.find((s) => parent?.studentIds.includes(s.id))

  if (!child) return <EmptyState title="No linked child found" />

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Reports</h1>

      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">{school.currentTerm} Report Card</p>
            <p className="text-xs text-slate-500 mt-0.5">{school.currentSession} · {child.firstName} {child.lastName}</p>
          </div>
          <Badge tone="success">Ready</Badge>
        </CardContent>
      </Card>

      <Button onClick={() => window.print()} className="w-full"><Download className="h-4 w-4" /> Download Report Card</Button>
    </div>
  )
}
