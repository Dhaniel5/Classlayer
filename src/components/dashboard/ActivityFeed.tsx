import { UserPlus, CalendarCheck, ClipboardCheck, Wallet, GraduationCap } from 'lucide-react'
import type { RecentActivity } from '@/types'
import { timeAgo } from '@/lib/utils'
import { EmptyState } from '@/components/ui/states'

const iconMap: Record<RecentActivity['type'], React.ReactNode> = {
  student: <UserPlus className="h-3.5 w-3.5" />,
  teacher: <GraduationCap className="h-3.5 w-3.5" />,
  attendance: <CalendarCheck className="h-3.5 w-3.5" />,
  assessment: <ClipboardCheck className="h-3.5 w-3.5" />,
  payment: <Wallet className="h-3.5 w-3.5" />,
}

const colorMap: Record<RecentActivity['type'], string> = {
  student: 'bg-blue-50 text-blue-600',
  teacher: 'bg-violet-50 text-violet-600',
  attendance: 'bg-teal-50 text-teal-600',
  assessment: 'bg-amber-50 text-amber-600',
  payment: 'bg-emerald-50 text-emerald-600',
}

export function ActivityFeed({ items }: { items: RecentActivity[] }) {
  if (items.length === 0) return <EmptyState title="No recent activity yet" />
  return (
    <ul className="space-y-3">
      {items.slice(0, 8).map((a) => (
        <li key={a.id} className="flex items-start gap-3">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${colorMap[a.type]}`}>
            {iconMap[a.type]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700 leading-snug">{a.message}</p>
            <p className="text-xs text-slate-400 mt-0.5">{timeAgo(a.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
