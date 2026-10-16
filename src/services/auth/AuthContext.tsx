import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Role, User } from '@/types'
import { supabase, isSupabaseConfigured, friendlyError } from '@/lib/supabase'

type Status = 'loading' | 'signed_out' | 'no_role' | 'ready'

interface AuthContextValue {
  user: User | null
  status: Status
  sessionEmail: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const palette = ['#2563EB', '#0EA5A0', '#7C3AED', '#DB2777', '#EA580C', '#059669']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(isSupabaseConfigured ? 'loading' : 'signed_out')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  const loadProfile = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null); setSessionEmail(null); setStatus('signed_out'); return
    }
    setSessionEmail(session.user.email ?? null)
    const { data, error } = await supabase.rpc('get_my_profile')
    if (error || !data || !data.role) {
      setUser(null); setStatus('no_role'); return
    }
    setUser({
      id: session.user.id,
      name: data.full_name || session.user.email || 'User',
      email: session.user.email ?? '',
      role: data.role as Role,
      linkedId: data.linked_id ?? undefined,
      avatarColor: palette[session.user.id.charCodeAt(0) % palette.length],
    })
    setStatus('ready')
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Do not call Supabase inside this callback directly (can deadlock) — defer.
      setTimeout(() => { void loadProfile(session) }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : friendlyError(error))
    }
  }
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setStatus('signed_out')
  }
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + '/login',
    })
    if (error) throw new Error(friendlyError(error))
  }

  return (
    <AuthContext.Provider value={{ user, status, sessionEmail, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
