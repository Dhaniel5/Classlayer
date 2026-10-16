import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  sublabel,
}: {
  label: string
  value: string
  icon: ReactNode
  tone?: 'default' | 'warning'
  sublabel?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
            tone === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
