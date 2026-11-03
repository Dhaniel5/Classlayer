import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { supabase, friendlyError } from '@/lib/supabase'
import logoFull from '@/assets/logo.png'

const MIN_LENGTH = 8

/** Where invitation links and password-reset links land. Also used by signed-in users to change their password. */
export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking')
  const [linkProblem, setLinkProblem] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // An expired/used link comes back as  #error=...&error_description=...
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.get('error')) {
      const expired = params.get('error_code') === 'otp_expired'
      setLinkProblem(expired ? 'This link has expired or was already used.' : (params.get('error_description') ?? 'This link is not valid.').replace(/\+/g, ' '))
      setPhase('invalid')
      return
    }
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => { if (!cancelled && data.session) setPhase('ready') })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setPhase('ready') })
    // If no session appears, the link is missing, expired, or opened in the wrong browser.
    const timer = setTimeout(() => setPhase((p) => (p === 'checking' ? 'invalid' : p)), 4000)
    return () => { cancelled = true; clearTimeout(timer); sub.subscription.unsubscribe() }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) { setError(`Use at least ${MIN_LENGTH} characters.`); return }
    if (password !== confirm) { setError('The two passwords do not match.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) { setError(friendlyError(err)); return }
    setPhase('done')
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><img src={logoFull} alt="CLASSLAYER" className="h-24 w-auto" /></div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-7">
          {phase === 'checking' && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking your link…</div>
          )}

          {phase === 'invalid' && (
            <div className="text-center">
              <LinkIcon className="mx-auto h-7 w-7 text-amber-500" />
              <h1 className="mt-3 text-lg font-semibold text-slate-900">This link can't be used</h1>
              <p className="mt-2 text-sm text-slate-500">{linkProblem || 'It may have expired, already been used, or been opened in a different browser.'}</p>
              <p className="mt-2 text-sm text-slate-500">Go to the login page and click <b>Forgot password?</b> to get a fresh link, or ask the school to resend your invitation.</p>
              <Link to="/login" className="mt-5 inline-block"><Button>Go to login</Button></Link>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <h1 className="text-lg font-semibold text-slate-900">Set your password</h1>
              <p className="text-sm text-slate-500 mt-1 mb-6">Choose a password you'll use to sign in to CLASSLAYER.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pw">New password</Label>
                  <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${MIN_LENGTH} characters`} required />
                </div>
                <div>
                  <Label htmlFor="pw2">Confirm password</Label>
                  <Input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password</Button>
              </form>
            </>
          )}

          {phase === 'done' && (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <h1 className="mt-3 text-lg font-semibold text-slate-900">Password saved</h1>
              <p className="mt-1 text-sm text-slate-500">Taking you to CLASSLAYER…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
