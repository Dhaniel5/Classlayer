import type { Role, User } from '@/types'

// Structured so a real auth provider (email/password, SSO, JWT sessions)
// can be dropped in later without changing calling code's shape.

const demoUsers: Record<Role, User> = {
  admin: { id: 'user-admin', name: 'Daniel Okafor', email: 'admin@brighthorizon.edu.ng', role: 'admin', avatarColor: '#2563EB' },
  headmaster: { id: 'user-headmaster', name: 'Mrs. Adaobi Nwankwo', email: 'headmaster@brighthorizon.edu.ng', role: 'headmaster', avatarColor: '#7C3AED' },
  teacher: { id: 'user-teacher', name: 'Mr. Emeka Obi', email: 'teacher@brighthorizon.edu.ng', role: 'teacher', avatarColor: '#059669', linkedId: 'teacher-0001' },
  accountant: { id: 'user-accountant', name: 'Mrs. Funmilayo Bello', email: 'accounts@brighthorizon.edu.ng', role: 'accountant', avatarColor: '#EA580C' },
  parent: { id: 'user-parent', name: 'Mr. & Mrs. Yusuf', email: 'parent@brighthorizon.edu.ng', role: 'parent', avatarColor: '#DB2777', linkedId: 'parent-0001' },
}

const SESSION_KEY = 'classlayer_session'

export async function loginWithCredentials(email: string, _password: string): Promise<User> {
  await simulateLatency()
  const match = Object.values(demoUsers).find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!match) {
    throw new Error('No account found for that email in this demo. Try one of the demo role logins below.')
  }
  persistSession(match)
  return match
}

export async function loginWithDemoRole(role: Role): Promise<User> {
  await simulateLatency()
  const user = demoUsers[role]
  persistSession(user)
  return user
}

export function getSession(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

function persistSession(user: User) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, 350))
}
