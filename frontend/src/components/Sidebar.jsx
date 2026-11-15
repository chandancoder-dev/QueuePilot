import { useState } from 'react';
import { X, Menu, LogOut } from 'lucide-react';
import { navItems } from '../data/navItems';
import { getManagerInitials } from '../utils/manager';

/**
 * Sidebar – desktop persistent, mobile slide-over drawer.
 * Props:
 *  - activeNav  {string}
 *  - onNavChange {function(id: string)}
 */
export default function Sidebar({ activeNav, onNavChange, manager, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = getManagerInitials(manager?.name);

  const renderNavContent = () => (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-950/30">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">QueuePilot</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Queue operations</p>
        </div>
      </div>

      <p className="px-5 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Workspace
      </p>
      <ul className="list-none flex-1 space-y-1 px-3 py-1" role="list">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeNav === id;
          return (
            <li key={id}>
              <button
                onClick={() => { onNavChange(id); setMobileOpen(false); }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-300 ring-1 ring-inset ring-blue-400/20'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                  }`}
              >
                <Icon size={17} strokeWidth={1.8} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg px-1 py-1">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-100">{manager.name}</p>
            <p className="truncate text-[11px] text-slate-500">{manager.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[min(280px,85vw)] flex-col bg-[#111827] transition-transform duration-200 lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Sidebar navigation"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-5 z-10 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
        {renderNavContent()}
      </aside>

      <aside
        className="hidden h-full w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#111827] lg:flex"
        aria-label="Sidebar navigation"
      >
        {renderNavContent()}
      </aside>
    </>
  );
}
