import { useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '@/services/store'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { initials } from '@/lib/utils'

export default function ParentsPage() {
  const { parents, students } = useStore()
  const [query, setQuery] = useState('')

  const filtered = parents.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(query.toLowerCase()))

  function childNames(ids: string[]) {
    return ids.map((id) => students.find((s) => s.id === id)).filter(Boolean).map((s) => `${s!.firstName} ${s!.lastName}`).join(', ') || '—'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Parents</h1>
        <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {parents.length} parents</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search parents…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No parents found" />
      ) : (
        <Table>
          <THead><TR><TH>Name</TH><TH>Phone</TH><TH>Email</TH><TH>Children</TH></TR></THead>
          <TBody>
            {filtered.map((p) => (
              <TR key={p.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initials(p.firstName, p.lastName)} size={30} />
                    {p.firstName} {p.lastName}
                  </div>
                </TD>
                <TD className="text-slate-500">{p.phone}</TD>
                <TD className="text-slate-500">{p.email}</TD>
                <TD>{childNames(p.studentIds)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
