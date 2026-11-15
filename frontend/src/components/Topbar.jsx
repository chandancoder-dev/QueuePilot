import { Bell } from 'lucide-react';
import { getManagerInitials } from '../utils/manager';

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Topbar – page title, current date, notification bell, manager avatar.
 * Props:
 *  - title  {string}
 */
export default function Topbar({ title, manager }) {
  const initials = getManagerInitials(manager?.name);

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white py-3.5 pl-16 pr-5 sm:pr-7 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 text-[11px] text-slate-500">{getFormattedDate()}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white"
            aria-hidden="true"
          />
        </button>

        <div className="hidden min-w-0 text-right sm:block">
          <p className="max-w-36 truncate text-xs font-medium text-slate-800">{manager.name}</p>
          <p className="max-w-36 truncate text-[10px] text-slate-500">{manager.email}</p>
        </div>
        <div
          className="flex h-9 w-9 cursor-default select-none items-center justify-center rounded-full bg-blue-700 text-[11px] font-semibold text-white ring-2 ring-blue-50"
          aria-label={`${manager.name} account`}
          title={`${manager.name} (${manager.email})`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
