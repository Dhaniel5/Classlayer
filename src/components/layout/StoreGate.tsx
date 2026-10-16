import { Loader2, AlertTriangle } from 'lucide-react'
import { useStore } from '@/services/store'
import { Button } from '@/components/ui/button'

/** Shows a loader until the school's data has arrived, and a retry screen if it fails. */
export function StoreGate({ children }: { children: React.ReactNode }) {
  const { loading, error, actions } = useStore()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your school's data…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-red-500" />
          <h1 className="mt-3 text-base font-semibold text-slate-900">Couldn't load data</h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Try again</Button>
          <p className="mt-3 text-xs text-slate-400">
            If this keeps happening, check that the database migration has been run.
          </p>
          <button className="hidden" onClick={() => void actions.refresh()} />
        </div>
      </div>
    )
  }
  return <>{children}</>
}
