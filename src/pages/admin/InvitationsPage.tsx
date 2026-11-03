import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, AlertTriangle, RefreshCw } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { roleLabels } from '@/lib/permissions'
import { listStaffRoles, type StaffRole } from '@/services/api/userRoles'
import {
  fetchAccessStatus, sendInvites, InviteServiceError, type AccessStatus, type InviteResult,
} from '@/services/api/invitations'
import type { Role } from '@/types'

interface Person { key: string; name: string; email: string; detail?: string }

export default function InvitationsPage() {
  const { teachers, parents, students, classes } = useStore()
  const { user } = useAuth()
  const [staff, setStaff] = useState<StaffRole[]>([])
  const canSeeStaff = user?.role === 'proprietor' || user?.role === 'admin'

  useEffect(() => { if (canSeeStaff) listStaffRoles().then(setStaff).catch(() => setStaff([])) }, [canSeeStaff])

  const teacherPeople: Person[] = teachers.filter((t) => t.status === 'Active').map((t) => ({
    key: t.id, name: `${t.firstName} ${t.lastName}`, email: t.email.toLowerCase(),
    detail: t.classIds.map((id) => classes.find((c) => c.id === id)?.name).filter(Boolean).join(', '),
  }))
  const parentPeople: Person[] = parents.map((p) => ({
    key: p.id, name: `${p.firstName} ${p.lastName}`, email: (p.email ?? '').toLowerCase(),
    detail: p.studentIds.map((id) => students.find((s) => s.id === id)?.firstName).filter(Boolean).join(', '),
  }))
  const staffPeople: Person[] = staff.map((s) => ({
    key: s.email, name: s.full_name || s.email, email: s.email.toLowerCase(), detail: roleLabels[s.role as Role] ?? s.role,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Invitations</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Email people a link to set their password and sign in. Everyone must first be added to the school
          (Teachers, Students, or Settings → Users & Roles).
        </p>
      </div>
      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">Teachers ({teacherPeople.length})</TabsTrigger>
          <TabsTrigger value="parents">Parents ({parentPeople.length})</TabsTrigger>
          {canSeeStaff && <TabsTrigger value="staff">Leadership & staff ({staffPeople.length})</TabsTrigger>}
        </TabsList>
        <TabsContent value="teachers"><InvitePanel people={teacherPeople} noun="teacher" /></TabsContent>
        <TabsContent value="parents"><InvitePanel people={parentPeople} noun="parent" /></TabsContent>
        {canSeeStaff && <TabsContent value="staff"><InvitePanel people={staffPeople} noun="staff member" /></TabsContent>}
      </Tabs>
    </div>
  )
}

function StatusBadge({ s, loaded }: { s: AccessStatus | undefined; loaded: boolean }) {
  if (!loaded) return <span className="text-xs text-slate-300">…</span>
  if (s === 'active') return <Badge tone="success">Active</Badge>
  if (s === 'invited') return <Badge tone="warning">Invited · not accepted yet</Badge>
  return <Badge tone="neutral">Not invited</Badge>
}

function InvitePanel({ people, noun }: { people: Person[]; noun: string }) {
  const { toast } = useToast()
  const [status, setStatus] = useState<Record<string, AccessStatus>>({})
  const [loaded, setLoaded] = useState(false)
  const [serviceError, setServiceError] = useState<InviteServiceError | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<InviteResult[] | null>(null)

  const emails = useMemo(() => people.map((p) => p.email).filter(Boolean), [people])

  const loadStatus = useCallback(async () => {
    if (emails.length === 0) { setLoaded(true); return }
    setLoaded(false)
    try { setStatus(await fetchAccessStatus(emails)); setServiceError(null) }
    catch (err) { setServiceError(err instanceof InviteServiceError ? err : new InviteServiceError((err as Error).message, false)) }
    finally { setLoaded(true) }
  }, [emails])
  useEffect(() => { void loadStatus() }, [loadStatus])

  const invitable = people.filter((p) => p.email && status[p.email] !== 'active')
  const notInvited = invitable.filter((p) => !status[p.email])
  const allSelected = invitable.length > 0 && invitable.every((p) => selected.has(p.email))

  const toggle = (email: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(email) ? n.delete(email) : n.add(email); return n })

  async function send(list: string[]) {
    if (list.length === 0) return
    setSending(true); setResults(null)
    try {
      const r = await sendInvites(list)
      setResults(r)
      const ok = r.filter((x) => x.result === 'invited').length
      toast({ title: ok > 0 ? `${ok} invitation${ok === 1 ? '' : 's'} sent` : 'No invitations were sent', description: ok < r.length ? 'See the details below.' : undefined, tone: ok > 0 ? 'success' : 'error' })
      setSelected(new Set())
      await loadStatus()
    } catch (err) {
      toast({ title: 'Could not send invitations', description: (err as Error).message, tone: 'error' })
    } finally { setSending(false) }
  }

  if (people.length === 0) {
    return <EmptyState title={`No ${noun}s yet`} description={`Add ${noun}s first, then come back here to invite them.`} />
  }

  const problems = results?.filter((r) => r.result !== 'invited') ?? []
  const sentCount = results?.filter((r) => r.result === 'invited').length ?? 0

  return (
    <div className="space-y-4">
      {serviceError && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">{serviceError.setup ? 'The invitation service isn\'t set up yet' : 'Couldn\'t check who has signed in'}</p>
            <p className="mt-0.5">{serviceError.message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button disabled={sending || selected.size === 0 || !!serviceError?.setup} onClick={() => send([...selected])}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send invitation to selected ({selected.size})
        </Button>
        <Button variant="outline" disabled={sending || notInvited.length === 0 || !!serviceError?.setup} onClick={() => send(notInvited.map((p) => p.email))}>
          Invite everyone not yet invited ({notInvited.length})
        </Button>
        <Button variant="ghost" onClick={() => void loadStatus()} disabled={sending}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {results && (
        <Card><CardContent className="pt-5 space-y-2 text-sm">
          <p className="font-medium text-slate-900">{sentCount} of {results.length} invitation{results.length === 1 ? '' : 's'} sent.</p>
          {problems.length > 0 && (
            <ul className="space-y-1 text-slate-600">
              {problems.slice(0, 30).map((r) => <li key={r.email}><span className="font-medium">{r.email}</span> — {r.message ?? r.result}</li>)}
              {problems.length > 30 && <li>…and {problems.length - 30} more.</li>}
            </ul>
          )}
        </CardContent></Card>
      )}

      <Table>
        <THead>
          <TR>
            <TH className="w-10"><input type="checkbox" className="rounded border-slate-300" checked={allSelected} disabled={invitable.length === 0}
              onChange={(e) => setSelected(e.target.checked ? new Set(invitable.map((p) => p.email)) : new Set())} aria-label="Select all" /></TH>
            <TH>Name</TH><TH>Email</TH><TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {people.map((p) => {
            const st = p.email ? status[p.email] : undefined
            const can = !!p.email && st !== 'active'
            return (
              <TR key={p.key}>
                <TD>{can && <input type="checkbox" className="rounded border-slate-300" checked={selected.has(p.email)} onChange={() => toggle(p.email)} aria-label={`Select ${p.name}`} />}</TD>
                <TD><span className="font-medium text-slate-900">{p.name}</span>{p.detail && <span className="block text-xs text-slate-400">{p.detail}</span>}</TD>
                <TD className="text-slate-500">{p.email || <span className="text-amber-600">No email — can't sign in</span>}</TD>
                <TD>{p.email ? <StatusBadge s={st} loaded={loaded && !serviceError} /> : <Badge tone="neutral">—</Badge>}</TD>
              </TR>
            )
          })}
        </TBody>
      </Table>
      <p className="text-xs text-slate-400">
        "Invited · not accepted yet" people can be sent the email again. If someone never receives it, check their spam folder first.
      </p>
    </div>
  )
}
