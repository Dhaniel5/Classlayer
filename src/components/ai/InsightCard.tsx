import { Sparkles, TrendingUp, AlertTriangle, AlertOctagon, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AIInsight } from '@/types'

const levelConfig = {
  positive: { icon: <TrendingUp className="h-4 w-4" />, tone: 'success' as const, bg: 'bg-emerald-50 text-emerald-600' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, tone: 'warning' as const, bg: 'bg-amber-50 text-amber-600' },
  critical: { icon: <AlertOctagon className="h-4 w-4" />, tone: 'danger' as const, bg: 'bg-red-50 text-red-600' },
  neutral: { icon: <Info className="h-4 w-4" />, tone: 'neutral' as const, bg: 'bg-slate-50 text-slate-600' },
}

export function InsightCard({ insight }: { insight: AIInsight }) {
  const cfg = levelConfig[insight.level]
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900">{insight.title}</h3>
              <Badge tone={cfg.tone}>{insight.scope}</Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1.5 leading-snug">{insight.observation}</p>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Suggested action</p>
              <p className="text-xs text-slate-600 mt-1">{insight.suggestedAction}</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{insight.supportingData}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
