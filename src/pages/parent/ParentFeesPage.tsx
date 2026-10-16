import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { formatNaira, formatDate } from '@/lib/utils'

export default function ParentFeesPage() {
  const { user } = useAuth()
  const { parents, students, fees, payments } = useStore()
  const parent = parents.find((p) => p.id === user?.linkedId)
  const child = students.find((s) => parent?.studentIds.includes(s.id))

  if (!child) return <EmptyState title="No linked child found" />

  const fee = fees.find((f) => f.studentId === child.id)
  const childPayments = payments.filter((p) => p.studentId === child.id).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Fees</h1>

      {fee ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Total Fees" value={formatNaira(fee.amountDue)} />
            <MiniStat label="Paid" value={formatNaira(fee.amountPaid)} />
            <MiniStat label="Balance" value={formatNaira(fee.amountDue - fee.amountPaid)} />
          </div>
          <div className="flex justify-center">
            <Badge tone={fee.status === 'Paid' ? 'success' : fee.status === 'Partially Paid' ? 'warning' : 'danger'}>{fee.status}</Badge>
          </div>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment History</h3>
              <div className="space-y-2">
                {childPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                    <div>
                      <p className="text-sm text-slate-800">{formatNaira(p.amount)}</p>
                      <p className="text-xs text-slate-400">{formatDate(p.date)} · {p.method}</p>
                    </div>
                    <span className="text-xs text-slate-400">{p.reference}</span>
                  </div>
                ))}
                {childPayments.length === 0 && <p className="text-sm text-slate-400">No payments recorded yet.</p>}
              </div>
            </CardContent>
          </Card>
        </>
      ) : <EmptyState title="No fee record found" />}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}
