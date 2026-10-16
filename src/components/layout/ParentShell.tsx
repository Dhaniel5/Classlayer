import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import logoIcon from '@/assets/logo-icon.png'
import { parentNav } from '@/lib/permissions'
import { useAuth } from '@/services/auth/AuthContext'
import { useStore } from '@/services/store'
import { Avatar } from '@/components/ui/avatar'
import { initials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { StoreGate } from './StoreGate'

export function ParentShell() {
  const { user, signOut } = useAuth()
  const { notifications, actions } = useStore()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  if (!user) return null
  const unread = notifications.filter((n) => !n.read).length
  const nameInitials = initials(user.name.split(' ')[0] || 'P', user.name.split(' ')[1] || '')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-30 flex items-center h-14 px-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="CLASSLAYER" className="h-7 w-7 rounded-lg object-cover" />
          <span className="font-semibold text-slate-900">CLASSLAYER</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="relative h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto">
                  {notifications.length === 0 && <p className="px-3.5 py-5 text-center text-sm text-slate-400">No notifications yet</p>}
                  {notifications.slice(0, 6).map((n) => (
                    <div key={n.id} onClick={() => actions.markNotificationRead(n.id)} className="px-3.5 py-2.5 border-b border-slate-50 cursor-pointer">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500">{n.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <Avatar initials={nameInitials} color={user.avatarColor} size={32} />
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-20 max-w-2xl w-full mx-auto">
        <StoreGate>
          <Outlet />
        </StoreGate>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex justify-around py-1.5">
        {parentNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] font-medium min-w-[56px]',
                isActive ? 'text-teal-700' : 'text-slate-400'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
