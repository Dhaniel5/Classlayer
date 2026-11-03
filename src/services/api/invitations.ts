import { supabase } from '@/lib/supabase'

export type InviteResultCode =
  | 'invited' | 'already_registered' | 'not_registered' | 'not_allowed' | 'rate_limited' | 'error'
export interface InviteResult { email: string; result: InviteResultCode; message?: string }
export type AccessStatus = 'invited' | 'active'

/** `setup` is true when the Edge Function isn't deployed / reachable yet. */
export class InviteServiceError extends Error {
  setup: boolean
  constructor(message: string, setup: boolean) { super(message); this.setup = setup }
}

async function call<T>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('invite-users', { body: body as Record<string, unknown> })
  if (error) {
    const ctx = (error as { context?: Response }).context
    let message = 'The invitation service could not be reached.'
    let setup = true // no HTTP response at all = not deployed / network
    if (ctx && typeof ctx.json === 'function') {
      setup = ctx.status === 404
      try {
        const j = await ctx.json()
        message = j?.error ?? j?.message ?? message
      } catch { /* keep default */ }
    }
    throw new InviteServiceError(setup ? 'The invitation service is not set up yet (see the README, "Invitations").' : message, setup)
  }
  return data as T
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

/** Which of these emails already have a login? Absent from the map = never invited. */
export async function fetchAccessStatus(emails: string[]): Promise<Record<string, AccessStatus>> {
  const out: Record<string, AccessStatus> = {}
  for (const part of chunk(emails, 1000)) {
    const r = await call<{ status: Record<string, AccessStatus> }>({ action: 'status', emails: part })
    Object.assign(out, r.status)
  }
  return out
}

/** Sends invitations in batches of 40, stopping early if the email limit is hit. */
export async function sendInvites(emails: string[]): Promise<InviteResult[]> {
  const results: InviteResult[] = []
  let limited = false
  for (const part of chunk(emails, 40)) {
    if (limited) {
      part.forEach((email) => results.push({ email, result: 'rate_limited', message: 'Not sent — email limit reached. Try again later.' }))
      continue
    }
    const r = await call<{ results: InviteResult[] }>({ emails: part })
    results.push(...r.results)
    if (r.results.some((x) => x.result === 'rate_limited')) limited = true
  }
  return results
}
