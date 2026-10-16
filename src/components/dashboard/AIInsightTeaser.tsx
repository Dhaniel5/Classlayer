import { Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function AIInsightTeaser({ headline }: { headline: string }) {
  const navigate = useNavigate()
  return (
    <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">AI School Insight</p>
            <p className="text-sm text-slate-700 mt-1 leading-snug">{headline}</p>
            <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => navigate('/app/ai-insights')}>
              View AI Insights <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
