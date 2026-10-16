import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/services/auth/AuthContext'
import { setRememberMe } from '@/lib/supabase'
import logoFull from '@/assets/logo.png'

export default function LoginPage() {
  const { user, status, signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (status === 'ready' && user) {
    return <Navigate to={user.role === 'parent' ? '/parent/home' : '/app/dashboard'} replace />
  }
  if (status === 'no_role') return <Navigate to="/app/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      setRememberMe(remember)
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleForgot() {
    setError(''); setInfo('')
    if (!email.trim()) { setError('Enter your email above first, then click "Forgot password?".'); return }
    try {
      await resetPassword(email)
      setInfo('If that email has an account, a password reset link is on its way.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src={logoFull} alt="CLASSLAYER — Smarter Schools. Brighter Futures." className="h-28 w-auto" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-7">
          <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Sign in to your school's CLASSLAYER workspace.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@school.edu.ng" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300" />
                Remember me
              </label>
              <button type="button" onClick={handleForgot} className="text-teal-700 hover:underline">Forgot password?</button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-emerald-700">{info}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Log in
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">
          Accounts are created by your school. Contact the school office if you can't sign in.
        </p>
      </div>
    </div>
  )
}
