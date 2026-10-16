import { useMemo, useState } from 'react'
import { Search, X, GraduationCap, Users, School2, UserRound } from 'lucide-react'
import { useStore } from '@/services/store'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/services/auth/AuthContext'
import { canSeeAllStudents } from '@/lib/permissions'

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const { students, teachers, classes, parents } = useStore()
  const navigate = useNavigate()
  const { user } = useAuth()
  const manager = !!user && canSeeAllStudents(user.role)

  const q = query.trim().toLowerCase()

  const matchedStudents = useMemo(
    () => (q ? students.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)).slice(0, 5) : []),
    [q, students]
  )
  const matchedTeachers = useMemo(
    () => (q && manager ? teachers.filter((t) => `${t.firstName} ${t.lastName}`.toLowerCase().includes(q)).slice(0, 5) : []),
    [q, teachers]
  )
  const matchedClasses = useMemo(
    () => (q ? classes.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5) : []),
    [q, classes]
  )
  const matchedParents = useMemo(
    () => (q && manager ? parents.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)).slice(0, 5) : []),
    [q, parents]
  )

  const nothing = q && !matchedStudents.length && !matchedTeachers.length && !matchedClasses.length && !matchedParents.length

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-4 pt-20" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-100">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, teachers, classes, parents…"
            className="flex-1 outline-none text-sm placeholder:text-slate-400"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {!q && <p className="px-3 py-6 text-center text-sm text-slate-400">Start typing to search</p>}
          {nothing && <p className="px-3 py-6 text-center text-sm text-slate-400">No results for "{query}"</p>}

          {matchedStudents.length > 0 && (
            <SearchGroup label="Students" icon={<GraduationCap className="h-3.5 w-3.5" />}>
              {matchedStudents.map((s) => (
                <SearchResult
                  key={s.id}
                  title={`${s.firstName} ${s.lastName}`}
                  subtitle={s.studentCode}
                  onClick={() => { navigate(`/app/students/${s.id}`); onClose() }}
                />
              ))}
            </SearchGroup>
          )}
          {matchedTeachers.length > 0 && (
            <SearchGroup label="Teachers" icon={<Users className="h-3.5 w-3.5" />}>
              {matchedTeachers.map((t) => (
                <SearchResult
                  key={t.id}
                  title={`${t.firstName} ${t.lastName}`}
                  subtitle={t.email}
                  onClick={() => { navigate(`/app/teachers`); onClose() }}
                />
              ))}
            </SearchGroup>
          )}
          {matchedClasses.length > 0 && (
            <SearchGroup label="Classes" icon={<School2 className="h-3.5 w-3.5" />}>
              {matchedClasses.map((c) => (
                <SearchResult
                  key={c.id}
                  title={c.name}
                  subtitle={`${c.studentIds.length} students`}
                  onClick={() => { navigate(`/app/classes/${c.id}`); onClose() }}
                />
              ))}
            </SearchGroup>
          )}
          {matchedParents.length > 0 && (
            <SearchGroup label="Parents" icon={<UserRound className="h-3.5 w-3.5" />}>
              {matchedParents.map((p) => (
                <SearchResult
                  key={p.id}
                  title={`${p.firstName} ${p.lastName}`}
                  subtitle={p.phone}
                  onClick={() => { navigate(`/app/parents`); onClose() }}
                />
              ))}
            </SearchGroup>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
        {icon} {label}
      </div>
      {children}
    </div>
  )
}

function SearchResult({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-800">{title}</span>
      <span className="text-xs text-slate-400">{subtitle}</span>
    </button>
  )
}
