import { useState } from 'react'
import { Plus, Search, Wallet, Users as UsersIcon } from 'lucide-react'
import { useStore } from '@/services/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { RecordPaymentDialog } from '@/components/finance/RecordPaymentDialog'
import { formatNaira } from '@/lib/utils'
import { feeTotals } from '@/lib/analytics'

export default function FeesPage() {
  const { fees, students, classes } = useStore()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [payOpen, setPayOpen] = useState(false)
  const [presetStudentId, setPresetStudentId] = useState<string | undefined>(undefined)

  const { expected, collected, outstanding, unpaidStudents } = feeTotals(fees)

  const rows = fees
    .map((f) => ({ fee: f, student: students.find((s) => s.id === f.studentId)! }))
    .filter((r) => r.student)
    .filter((r) => `${r.student.firstName} ${r.student.lastName}`.toLowerCase().includes(query.toLowerCase()))
    .filter((r) => statusFilter === 'all' || r.fee.status === statusFilter)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Fees</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage student fee status and payments</p>
        </div>
        <Button onClick={() => { setPresetStudentId(undefined); setPayOpen(true) }}><Plus className="h-4 w-4" /> Record Payment</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Expected" value={formatNaira(expected)} icon={<Wallet className="h-4.5 w-4.5" />} />
        <StatBox label="Total Collected" value={formatNaira(collected)} icon={<Wallet className="h-4.5 w-4.5" />} />
        <StatBox label="Outstanding" value={formatNaira(outstanding)} icon={<Wallet className="h-4.5 w-4.5" />} warn />
        <StatBox label="Unpaid Students" value={String(unpaidStudents)} icon={<UsersIcon className="h-4.5 w-4.5" />} warn />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search students…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select className="sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Outstanding">Outstanding</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No fee records found" />
      ) : (
        <Table>
          <THead><TR><TH>Student</TH><TH>Class</TH><TH>Amount Due</TH><TH>Amount Paid</TH><TH>Balance</TH><TH>Status</TH><TH className="text-right">Action</TH></TR></THead>
          <TBody>
            {rows.map(({ fee, student }) => (
              <TR key={fee.id}>
                <TD className="font-medium text-slate-900">{student.firstName} {student.lastName}</TD>
                <TD>{classes.find((c) => c.id === fee.classId)?.name}</TD>
                <TD>{formatNaira(fee.amountDue)}</TD>
                <TD>{formatNaira(fee.amountPaid)}</TD>
                <TD>{formatNaira(fee.amountDue - fee.amountPaid)}</TD>
                <TD><Badge tone={fee.status === 'Paid' ? 'success' : fee.status === 'Partially Paid' ? 'warning' : 'danger'}>{fee.status}</Badge></TD>
                <TD className="text-right">
                  {fee.status !== 'Paid' && (
                    <Button size="sm" variant="outline" onClick={() => { setPresetStudentId(student.id); setPayOpen(true) }}>Record Payment</Button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <RecordPaymentDialog open={payOpen} onClose={() => setPayOpen(false)} presetStudentId={presetStudentId} />
    </div>
  )
}

function StatBox({ label, value, icon, warn }: { label: string; value: string; icon: React.ReactNode; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${warn ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>{icon}</div>
      </CardContent>
    </Card>
  )
}
