import { useState } from 'react'
import { Sparkles, Copy, RefreshCw, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label, Select, Input } from '@/components/ui/input'
import { generateReportComment } from '@/services/ai/aiService'
import { useToast } from '@/components/ui/toast'

export function ReportCommentGenerator() {
  const { students } = useStore()
  const { toast } = useToast()
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [performanceLevel, setPerformanceLevel] = useState<'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'>('Good')
  const [strengths, setStrengths] = useState('')
  const [improvement, setImprovement] = useState('')
  const [comment, setComment] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const student = students.find((s) => s.id === studentId)

  async function handleGenerate() {
    if (!student) return
    setLoading(true)
    const result = await generateReportComment({
      studentFirstName: student.firstName,
      performanceLevel,
      strengths,
      areasForImprovement: improvement,
    })
    setComment(result)
    setLoading(false)
  }

  function handleCopy() {
    if (!comment) return
    navigator.clipboard?.writeText(comment)
    toast({ title: 'Copied to clipboard', tone: 'success' })
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-teal-600" /> Report Comment Generator</CardTitle>
          <CardDescription>Generate a professional report comment from a few inputs</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Student</Label>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </Select>
          </div>
          <div>
            <Label>Performance level</Label>
            <Select value={performanceLevel} onChange={(e) => setPerformanceLevel(e.target.value as typeof performanceLevel)}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Needs Improvement</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Strengths</Label>
            <Input value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="e.g. English and Computer Studies" />
          </div>
          <div>
            <Label>Areas needing improvement</Label>
            <Input value={improvement} onChange={(e) => setImprovement(e.target.value)} placeholder="e.g. Mathematics" />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </Button>

        {comment && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{comment}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
              <Button size="sm" variant="outline" onClick={handleCopy}><Copy className="h-3.5 w-3.5" /> Copy</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
