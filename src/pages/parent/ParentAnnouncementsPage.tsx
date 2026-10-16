import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { formatDate } from '@/lib/utils'

export default function ParentAnnouncementsPage() {
  const { user } = useAuth()
  const { parents, students, announcements, classes } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const child = students.find((s) => parent?.studentIds.includes(s.id))

  const relevant = announcements.filter((a) =>
    a.audience === 'All Parents' || (a.audience === 'Specific Class' && a.classId === child?.classId)
  )

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Announcements</h1>
      {relevant.length === 0 ? (
        <EmptyState title="No announcements yet" />
      ) : (
        <div className="space-y-3">
          {relevant.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                  {a.classId && <Badge tone="info">{classes.find((c) => c.id === a.classId)?.name}</Badge>}
                </div>
                <p className="text-sm text-slate-600">{a.message}</p>
                <p className="text-xs text-slate-400 mt-2">{formatDate(a.date)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
