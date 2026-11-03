// Tests the invite-users Edge Function against a FAKE Supabase server.
// The fake mirrors how I understand the Supabase REST/Auth APIs, so this verifies the function's own
// logic (who may invite whom, redirect safety, rate-limit handling) — not Supabase itself.
//   DENO_BIN=deno node supabase/tests/invite_function_test.mjs
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const fnPath = path.join(here, '../functions/invite-users/index.ts')
const SITE = 'https://school.example.com'

// ---------- fake Supabase ----------
const profiles = {
  'tok-owner': { role: 'proprietor' }, 'tok-hos': { role: 'head_of_school' }, 'tok-admin': { role: 'admin' },
  'tok-acad': { role: 'head_of_academics' }, 'tok-teacher': { role: 'teacher' },
}
const userRoles = [{ email: 'acct@x.com', role: 'accountant' }, { email: 'hos2@x.com', role: 'head_of_school' }, { email: 'acad2@x.com', role: 'head_of_academics' }]
const teachers = ['t1@x.com']                      // active teachers only
const parents = ['p1@x.com', 'p2@x.com', 'limit@x.com', 'p3@x.com']
const authUsers = [{ email: 'p2@x.com', email_confirmed_at: '2026-01-01' }, { email: 't1@x.com', email_confirmed_at: null }]
const invitesSent = []

const inList = (url, col) => {
  const v = url.searchParams.get(col) ?? ''
  const m = v.match(/^in\.\((.*)\)$/)
  return m ? m[1].split(',').map((s) => s.replace(/^"|"$/g, '')) : []
}
const fake = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    const send = (code, obj, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(obj)) }
    if (url.pathname === '/rest/v1/rpc/get_my_profile') {
      const tok = (req.headers.authorization ?? '').replace('Bearer ', '')
      return send(200, profiles[tok] ?? { role: null })
    }
    if (url.pathname === '/rest/v1/user_roles') { const e = inList(url, 'email'); return send(200, userRoles.filter((r) => e.includes(r.email))) }
    if (url.pathname === '/rest/v1/teachers') { const e = inList(url, 'email'); return send(200, teachers.filter((t) => e.includes(t)).map((email) => ({ email }))) }
    if (url.pathname === '/rest/v1/parents') { const e = inList(url, 'email'); return send(200, parents.filter((p) => e.includes(p)).map((email) => ({ email }))) }
    if (url.pathname === '/auth/v1/invite') {
      const { email } = JSON.parse(raw)
      invitesSent.push({ email, redirect: url.searchParams.get('redirect_to') })
      if (email === 'p2@x.com') return send(422, { code: 'email_exists', msg: 'A user with this email address has already been registered' })
      if (email === 'limit@x.com') return send(429, { code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' })
      return send(200, { id: 'u-' + email, email })
    }
    if (url.pathname === '/auth/v1/admin/users') return send(200, { users: authUsers }, { 'x-total-count': String(authUsers.length) })
    send(404, { error: 'unhandled ' + url.pathname })
  })
})

// ---------- run function + tests ----------
let passed = 0, failed = 0
const check = (name, ok, extra = '') => { ok ? passed++ : failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`) }

await new Promise((r) => fake.listen(54399, r))
const deno = spawn(process.env.DENO_BIN ?? 'deno', ['run', '-A', fnPath], {
  env: { ...process.env, SUPABASE_URL: 'http://127.0.0.1:54399', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', SITE_URL: SITE },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let up = false
deno.stderr.on('data', (d) => { if (String(d).includes('Listening')) up = true })
for (let i = 0; i < 100 && !up; i++) await new Promise((r) => setTimeout(r, 100))

const call = async (token, body, method = 'POST', origin) => {
  const r = await fetch('http://127.0.0.1:8000/', {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(origin ? { Origin: origin } : {}) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json; try { json = JSON.parse(text) } catch { json = text }
  return { status: r.status, json, headers: r.headers }
}
const resultOf = (r, email) => r.json.results?.find((x) => x.email === email)?.result

try {
  let r = await call(null, { emails: ['p1@x.com'] })
  check('no token -> 401', r.status === 401, JSON.stringify(r))
  r = await call('tok-teacher', { emails: ['p1@x.com'] })
  check('teacher cannot invite -> 403', r.status === 403, JSON.stringify(r))
  r = await call('tok-acad', { emails: ['p1@x.com'] })
  check('head of academics cannot invite -> 403', r.status === 403, JSON.stringify(r))
  r = await call('tok-teacher', { action: 'status', emails: ['p1@x.com'] })
  check('teacher cannot read account status -> 403', r.status === 403, JSON.stringify(r))

  invitesSent.length = 0
  r = await call('tok-owner', { emails: ['T1@X.com', 't1@x.com', 'p1@x.com', 'acct@x.com', 'nobody@x.com'], redirectTo: 'https://evil.example' })
  check('proprietor: teacher invited (and email de-duplicated/lower-cased)', resultOf(r, 't1@x.com') === 'invited' && r.json.results.filter((x) => x.email === 't1@x.com').length === 1, JSON.stringify(r.json))
  check('proprietor: parent invited', resultOf(r, 'p1@x.com') === 'invited')
  check('proprietor: staff invited', resultOf(r, 'acct@x.com') === 'invited')
  check('unknown email is NOT invited', resultOf(r, 'nobody@x.com') === 'not_registered' && !invitesSent.some((i) => i.email === 'nobody@x.com'))
  check('invite link always uses SITE_URL, ignoring caller redirectTo', invitesSent.length > 0 && invitesSent.every((i) => i.redirect === SITE + '/set-password'), JSON.stringify(invitesSent))

  r = await call('tok-hos', { emails: ['t1@x.com', 'p1@x.com', 'acct@x.com', 'hos2@x.com'] })
  check('head of school: may invite teacher + parent', resultOf(r, 't1@x.com') === 'invited' && resultOf(r, 'p1@x.com') === 'invited', JSON.stringify(r.json))
  check('head of school: may NOT invite staff', resultOf(r, 'acct@x.com') === 'not_allowed' && resultOf(r, 'hos2@x.com') === 'not_allowed')

  invitesSent.length = 0
  r = await call('tok-admin', { emails: ['acct@x.com', 'acad2@x.com', 'hos2@x.com', 'p1@x.com'] })
  check('admin: may invite accountant + head of academics', resultOf(r, 'acct@x.com') === 'invited' && resultOf(r, 'acad2@x.com') === 'invited', JSON.stringify(r.json))
  check('admin: may NOT invite head of school', resultOf(r, 'hos2@x.com') === 'not_allowed' && !invitesSent.some((i) => i.email === 'hos2@x.com'))

  r = await call('tok-owner', { emails: ['p2@x.com'] })
  check('already-registered user reported, not an error', resultOf(r, 'p2@x.com') === 'already_registered', JSON.stringify(r.json))

  invitesSent.length = 0
  r = await call('tok-owner', { emails: ['p1@x.com', 'limit@x.com', 'p3@x.com'] })
  check('rate limit: stops sending and reports the rest', resultOf(r, 'p1@x.com') === 'invited' && resultOf(r, 'limit@x.com') === 'rate_limited' && resultOf(r, 'p3@x.com') === 'rate_limited' && !invitesSent.some((i) => i.email === 'p3@x.com'), JSON.stringify(r.json))

  r = await call('tok-hos', { action: 'status', emails: ['p2@x.com', 't1@x.com', 'p1@x.com'] })
  check('status: confirmed=active, unconfirmed=invited, no account=absent', r.json.status?.['p2@x.com'] === 'active' && r.json.status?.['t1@x.com'] === 'invited' && !('p1@x.com' in (r.json.status ?? {})), JSON.stringify(r.json))

  r = await call('tok-owner', { emails: Array.from({ length: 51 }, (_, i) => `u${i}@x.com`) })
  check('more than 50 invites in one call -> 400', r.status === 400, JSON.stringify(r))
  r = await call('tok-owner', { emails: ['not-an-email'] })
  check('no valid emails -> 400', r.status === 400)

  r = await call(null, null, 'OPTIONS', SITE)
  check('CORS preflight allows the site origin', r.headers.get('access-control-allow-origin') === SITE, String(r.headers.get('access-control-allow-origin')))
  r = await call(null, null, 'OPTIONS', 'https://evil.example')
  check('CORS does not echo an unknown origin', r.headers.get('access-control-allow-origin') === SITE)
  r = await call('tok-owner', null, 'GET')
  check('GET -> 405', r.status === 405)
} finally {
  deno.kill(); fake.close()
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
