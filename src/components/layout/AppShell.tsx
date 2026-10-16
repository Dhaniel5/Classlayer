import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '@/services/auth/AuthContext'
import { getNavForRole } from '@/lib/permissions'
import { StoreGate } from './StoreGate'

export function AppShell() {
  const { user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  if (!user) return null
  const navItems = getNavForRole(user.role)

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={navItems} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <StoreGate>
            <Outlet />
          </StoreGate>
        </main>
      </div>
    </div>
  )
}
