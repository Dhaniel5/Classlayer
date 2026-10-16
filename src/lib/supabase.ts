import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

// "Remember me": when unticked at login the session lives only in this browser tab.
const REMEMBER_KEY = 'cl_remember'
export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
}
const sessionStorageAdapter = {
  getItem: (k: string) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k: string, v: string) => {
    const remember = localStorage.getItem(REMEMBER_KEY) !== 'false'
    ;(remember ? localStorage : sessionStorage).setItem(k, v)
  },
  removeItem: (k: string) => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  },
}

export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'not-configured', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: sessionStorageAdapter,
  },
})

/** Turn a Supabase/Postgres error into a message a school admin can act on. */
export function friendlyError(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return 'Something went wrong.'
  if (err.code === '23505') return 'That record already exists (duplicate student ID, email, name or code).'
  if (err.code === '42501' || /row-level security/i.test(err.message ?? ''))
    return "You don't have permission to do that."
  if (err.code === '23503') return 'This record is still linked to other records, so it cannot be removed.'
  return err.message || 'Something went wrong.'
}
