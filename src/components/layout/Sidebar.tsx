import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/permissions'
import logoIcon from '@/assets/logo-icon.png'

export function Sidebar({ items, mobileOpen, onCloseMobile }: { items: NavItem[]; mobileOpen: boolean; onCloseMobile: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          'fixed z-50 inset-y-0 left-0 w-64 border-r border-slate-200 bg-white flex flex-col transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-100">
          <img src={logoIcon} alt="CLASSLAYER" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">CLASSLAYER</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
          CLASSLAYER v1.0
        </div>
      </aside>
    </>
  )
}
