// CLASSLAYER — invite-users (Supabase Edge Function)
//
// Sends sign-in invitations by email and reports who has already accepted.
// It runs on the server because inviting needs the service-role key, which must
// never be shipped to the browser.
//
// Safety rules enforced HERE (not just in the screens):
//  * the caller must be signed in and be a Proprietor, Head of School or School Admin;
//  * only emails that already exist on a teacher, parent or staff record can be invited
//    (nobody can invite an arbitrary address);
//  * who may invite whom mirrors the database rules for granting roles;
//  * the link in the email always goes to the SITE_URL secret, never a caller-supplied URL.
//
// Required secret (Edge Functions -> Secrets): SITE_URL, e.g. https://classlayer.netlify.app
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '')

const INVITER_ROLES = ['proprietor', 'head_of_school', 'admin']
const MAX_INVITES_PER_CALL = 50
const MAX_STATUS_EMAILS = 2000

export type Target = { kind: 'teacher' | 'parent' | 'staff'; role?: string }

/** May `callerRole` send an invitation to this kind of person? Mirrors the roles_insert database policy. */
export function mayInvite(callerRole: string, target: Target): boolean {
  if (!INVITER_ROLES.includes(callerRole)) return false
  if (target.kind !== 'staff') return true
  if (callerRole === 'proprietor') return true
  if (callerRole === 'admin') return target.role === 'head_of_academics' || target.role === 'accountant'
  return false // head of school can invite teachers and parents, not staff
}

export function cleanEmails(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  for (const v of input) {
    if (typeof v !== 'string') continue
    const e = v.trim().toLowerCase()
    if (/^\S+@\S+\.\S+$/.test(e)) seen.add(e)
  }
  return [...seen]
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = [SITE_URL, 'http://localhost:5173'].filter(Boolean)
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (SITE_URL || 'null'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function reply(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

type InviteResult = {
  email: string
  result: 'invited' | 'already_registered' | 'not_registered' | 'not_allowed' | 'rate_limited' | 'error'
  message?: string
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return reply(req, { error: 'Method not allowed' }, 405)
  if (!SITE_URL) {
    return reply(req, { error: 'The SITE_URL secret is not set on this function. Add it under Edge Functions → Secrets.' }, 500)
  }

  // 1. Who is calling? Ask the database, using the caller's own token.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: profile, error: profileError } = await caller.rpc('get_my_profile')
  if (profileError || !profile?.role) return reply(req, { error: 'You must be signed in with a school role.' }, 401)
  const callerRole = String(profile.role)
  if (!INVITER_ROLES.includes(callerRole)) {
    return reply(req, { error: 'Only the Proprietor, Head of School or School Admin can send invitations.' }, 403)
  }

  let body: { action?: string; emails?: unknown }
  try { body = await req.json() } catch { return reply(req, { error: 'Invalid request.' }, 400) }
  const emails = cleanEmails(body.emails)
  if (emails.length === 0) return reply(req, { error: 'No valid email addresses were provided.' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  // 2. Who has already got a login?
  if (body.action === 'status') {
    if (emails.length > MAX_STATUS_EMAILS) return reply(req, { error: 'Too many emails in one request.' }, 400)
    const wanted = new Set(emails)
    const status: Record<string, 'invited' | 'active'> = {}
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return reply(req, { error: 'Could not read accounts: ' + error.message }, 500)
      for (const u of data.users) {
        const email = (u.email ?? '').toLowerCase()
        if (wanted.has(email)) status[email] = u.email_confirmed_at ? 'active' : 'invited'
      }
      if (data.users.length < 1000) break
    }
    return reply(req, { status })
  }

  // 3. Send invitations.
  if (emails.length > MAX_INVITES_PER_CALL) {
    return reply(req, { error: `Send at most ${MAX_INVITES_PER_CALL} invitations at a time.` }, 400)
  }

  const targets = new Map<string, Target>()
  const [staffRes, teacherRes, parentRes] = await Promise.all([
    admin.from('user_roles').select('email, role').in('email', emails),
    admin.from('teachers').select('email').eq('status', 'Active').in('email', emails),
    admin.from('parents').select('email').in('email', emails),
  ])
  if (staffRes.error || teacherRes.error || parentRes.error) {
    return reply(req, { error: 'Could not check the school records.' }, 500)
  }
  // Same precedence as the database's app_role(): staff role > teacher > parent
  for (const r of parentRes.data ?? []) targets.set(r.email, { kind: 'parent' })
  for (const r of teacherRes.data ?? []) targets.set(r.email, { kind: 'teacher' })
  for (const r of staffRes.data ?? []) targets.set(r.email, { kind: 'staff', role: r.role })

  const results: InviteResult[] = []
  let rateLimited = false
  for (const email of emails) {
    const target = targets.get(email)
    if (!target) {
      results.push({ email, result: 'not_registered', message: 'This email is not on any teacher, parent or staff record.' })
      continue
    }
    if (!mayInvite(callerRole, target)) {
      results.push({ email, result: 'not_allowed', message: 'You are not allowed to invite this role.' })
      continue
    }
    if (rateLimited) {
      results.push({ email, result: 'rate_limited', message: 'Not sent — the email sending limit was reached. Try again later.' })
      continue
    }
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/set-password` })
    if (!error) {
      results.push({ email, result: 'invited' })
      continue
    }
    const code = (error as { code?: string }).code ?? ''
    const status = (error as { status?: number }).status ?? 0
    if (code === 'email_exists' || /already.*(registered|exists)/i.test(error.message)) {
      results.push({ email, result: 'already_registered', message: 'Already has an active login.' })
    } else if (code === 'over_email_send_rate_limit' || status === 429 || /rate limit/i.test(error.message)) {
      rateLimited = true
      results.push({ email, result: 'rate_limited', message: 'Email sending limit reached. Set up custom SMTP in Supabase, or try again later.' })
    } else {
      results.push({ email, result: 'error', message: error.message })
    }
  }
  return reply(req, { results })
}

Deno.serve(handler)
