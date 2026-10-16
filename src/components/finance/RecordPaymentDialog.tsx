import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { useStore } from '@/services/store'
import { useToast } from '@/components/ui/toast'
import type { Payment } from '@/types'
import { formatNaira, todayLocalISO } from '@/lib/utils'

export function RecordPaymentDialog({ open, onClose, presetStudentId }: { open: boolean; onClose: () => void; presetStudentId?: string }) {
  const { students, fees, actions } = useStore()
  const { toast } = useToast()
  const [studentId, setStudentId] = useState(presetStudentId ?? students[0]?.id ?? '')
  useEffect(() => {
    if (open) setStudentId(presetStudentId ?? students[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetStudentId])

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayLocalISO())
  const [method, setMethod] = useState<Payment['method']>('Bank Transfer')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const fee = fees.find((f) => f.studentId === studentId)
  const balance = fee ? fee.amountDue - fee.amountPaid : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fee) { setError('No fee record found for this student this term.'); return }
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    if (!reference.trim()) { setError('Reference is required.'); return }
    setError(''); setBusy(true)
    try {
      await actions.recordPayment({ studentId, feeId: fee.id, amount: amt, date, method, reference, note: note.trim() || undefined })
      toast({ title: 'Payment recorded', description: `${formatNaira(amt)} recorded.`, tone: 'success' })
      onClose()
      setAmount(''); setReference(''); setNote('')
    } catch (err) {
      setError((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record Payment" description="Log a fee payment for a student">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Student</Label>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!!presetStudentId}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </Select>
          {fee && <p className="text-xs text-slate-500 mt-1">Balance due: {formatNaira(balance)}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount (₦)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
          </div>
          <div>
            <Label>Payment date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Payment method</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Cheque</option>
            </Select>
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PYT-123456" />
          </div>
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Record Payment</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
