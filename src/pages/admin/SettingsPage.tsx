import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input, Label, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { defaultGradeBands } from '@/lib/grading'
import { roleLabels } from '@/lib/permissions'
import { addStaffRole, listStaffRoles, removeStaffRole, type StaffRole } from '@/services/api/userRoles'
import type { Role, School } from '@/types'

export default function SettingsPage() {
  const { school, actions } = useStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: school.name, address: school.address, phone: school.phone, email: school.email,
    currentSession: school.currentSession, currentTerm: school.currentTerm as School['currentTerm'],
  })
  const [busy, setBusy] = useState(false)
  const canManageUsers = user?.role === 'proprietor' || user?.role === 'admin'

  async function save(label: string) {
    setBusy(true)
    try { await actions.updateSchool(form); toast({ title: 'Settings saved', description: label, tone: 'success' }) }
    catch (err) { toast({ title: 'Could not save', description: (err as Error).message, tone: 'error' }) }
    finally { setBusy(false) }
  }
  const saveBtn = (label: string) => (
    <Button onClick={() => save(label)} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Changes</Button>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure CLASSLAYER for your school</p>
      </div>
      <Tabs defaultValue="school">
        <TabsList>
          <TabsTrigger value="school">School Profile</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <Card>
            <CardHeader><CardTitle>School Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div><Label>School name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <p className="text-xs text-slate-400">School logo upload isn't available yet; the CLASSLAYER logo is used throughout.</p>
              {saveBtn('School profile')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardHeader><div><CardTitle>Academic Settings</CardTitle><CardDescription>Changing the term opens a fresh fee record for every active student</CardDescription></div></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div><Label>Academic session</Label><Input value={form.currentSession} onChange={(e) => setForm((f) => ({ ...f, currentSession: e.target.value }))} placeholder="2026/2027" /></div>
                <div><Label>Current term</Label>
                  <Select value={form.currentTerm} onChange={(e) => setForm((f) => ({ ...f, currentTerm: e.target.value as School['currentTerm'] }))}>
                    <option>First Term</option><option>Second Term</option><option>Third Term</option>
                  </Select></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Grading scale</p>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-w-md">
                  {defaultGradeBands.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                      <Badge tone="neutral">{b.label}</Badge><span className="text-sm text-slate-600">{b.min}–{b.max}%</span><span className="text-sm text-slate-500">{b.remark}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">Read-only for now. The scale lives in <code>src/lib/grading.ts</code> and is not tied to any country's system.</p>
              </div>
              {saveBtn('Academic settings')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          {canManageUsers ? <UsersAndRoles myEmail={user!.email} proprietor={user!.role === 'proprietor'} /> : (
            <Card><CardContent className="pt-5 text-sm text-slate-500">Only the Proprietor or School Admin can manage staff access.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader><CardTitle>AI</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">Insights, student summaries and report comments are generated by built-in rules that read only your school's recorded data.</p>
              <Badge tone="neutral">Rule-based · no external AI provider connected</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UsersAndRoles({ myEmail, proprietor }: { myEmail: string; proprietor: boolean }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<StaffRole[] | null>(null)
  const [form, setForm] = useState({ email: '', name: '', role: 'accountant' })
  const [busy, setBusy] = useState(false)
  const assignable: Role[] = proprietor ? ['head_of_school', 'head_of_academics', 'admin', 'accountant', 'proprietor'] : ['head_of_academics', 'accountant']

  const load = () => listStaffRoles().then(setRows).catch((e: Error) => toast({ title: 'Could not load staff', description: e.message, tone: 'error' }))
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast({ title: 'Enter a valid email', tone: 'error' }); return }
    setBusy(true)
    try {
      await addStaffRole(form.email, form.name, form.role)
      toast({ title: 'Access granted', description: `${form.email} can now sign in as ${roleLabels[form.role as Role]} once their login exists.`, tone: 'success' })
      setForm({ email: '', name: '', role: form.role }); await load()
    } catch (err) { toast({ title: 'Could not add', description: (err as Error).message, tone: 'error' }) }
    finally { setBusy(false) }
  }
  async function remove(email: string) {
    try { await removeStaffRole(email); toast({ title: 'Access removed', tone: 'success' }); await load() }
    catch (err) { toast({ title: 'Could not remove', description: (err as Error).message, tone: 'error' }) }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><div><CardTitle>Staff access</CardTitle><CardDescription>Teachers and parents get access automatically from their email on the Teachers / student records. Add leadership and accounts staff here.</CardDescription></div></CardHeader>
        <CardContent className="space-y-4">
          {rows === null ? <p className="text-sm text-slate-400">Loading…</p> : (
            <Table>
              <THead><TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH className="text-right"> </TH></TR></THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.email}>
                    <TD>{r.full_name || '—'}</TD><TD className="text-slate-500">{r.email}</TD>
                    <TD><Badge tone="info">{roleLabels[r.role as Role] ?? r.role}</Badge></TD>
                    <TD className="text-right">
                      {r.email !== myEmail && <button title="Remove access" onClick={() => remove(r.email)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></div>
            <div><Label>Role</Label>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {assignable.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </Select></div>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Grant access</Button>
          </form>
          <p className="text-xs text-slate-400">After granting access, create their login in Supabase (Authentication → Users → Add user). Email must be confirmed to sign in.</p>
        </CardContent>
      </Card>
    </div>
  )
}
