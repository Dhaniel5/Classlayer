import { useState } from 'react'
import { Menu, Search, Bell, ChevronDown, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/services/auth/AuthContext'
import { useStore } from '@/services/store'
import { initials, timeAgo } from '@/lib/utils'
import { roleLabels } from '@/lib/permissions'
import { useNavigate } from 'react-router-dom'
import { GlobalSearch } from './GlobalSearch'

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, signOut } = useAuth()
  const { notifications, actions } = useStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length

  if (!user) return null
  const [first, ...rest] = user.name.split(' ')
  const nameInitials = initials(first || 'U', rest.join(' ') || '')

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur px-4 sm:px-6">
      <button onClick={onOpenMobileNav} className="lg:hidden text-slate-500 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100">
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 h-9 text-sm text-slate-400 w-full max-w-xs hover:bg-slate-100"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search students, teachers, classes…</span>
        <span className="sm:hidden">Search…</span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <Bell className="h-4.5 w-4.5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
                  Notifications
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">You're all caught up</p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => actions.markNotificationRead(n.id)}
                      className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-2.5"
                    >
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />}
                      <div className={n.read ? 'pl-3.5' : ''}>
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.description}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.date)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100">
            <Avatar initials={nameInitials} color={user.avatarColor} size={32} />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{roleLabels[user.role]}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <button
                  onClick={async () => {
                    await signOut()
                    navigate('/login')
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
