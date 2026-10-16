import { DatabaseZap } from 'lucide-react'

export default function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <DatabaseZap className="h-8 w-8 text-teal-600" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Connect CLASSLAYER to your database</h1>
        <p className="mt-2 text-sm text-slate-600">
          This app needs a Supabase project. Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1">.env</code>, fill in your project URL and anon key, then restart
          the dev server. Full steps are in the README.
        </p>
      </div>
    </div>
  )
}
