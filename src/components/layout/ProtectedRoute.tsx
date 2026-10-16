import { Navigate } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/services/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { canAccess, type Feature } from '@/lib/permissions'
import type { Role } from '@/types'

export function ProtectedRoute({ children, allow }: { children: React.ReactNode; allow?: Role[] }) {
  const { user, status, sessionEmail, signOut } = useAuth()
  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
  }
  if (status === 'no_role') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">No access yet</h1>
          <p className="mt-2 text-sm text-slate-500">
            You're signed in as <b>{sessionEmail}</b>, but this email hasn't been given a role at the school.
            Ask the school administrator to add your email, then sign in again. (Your email must also be confirmed.)
          </p>
          <Button className="mt-5" variant="outline" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={user.role === 'parent' ? '/parent/home' : '/app/dashboard'} replace />
  }
  return <>{children}</>
}

/** Blocks a staff page the signed-in role isn't allowed to open (also enforced by the database). */
export function RequireFeature({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user || !canAccess(user.role, feature)) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}
