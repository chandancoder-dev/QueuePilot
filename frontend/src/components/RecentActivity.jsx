import { PlusCircle, Bell, CheckCircle2, XCircle } from 'lucide-react';

/** Icon map keyed by activity type */
const activityMeta = {
  token_added: {
    Icon: PlusCircle,
    colour: 'bg-blue-50 text-blue-600',
  },
  token_called: {
    Icon: Bell,
    colour: 'bg-violet-50 text-violet-600',
  },
  token_completed: {
    Icon: CheckCircle2,
    colour: 'bg-emerald-50 text-emerald-600',
  },
  token_cancelled: {
    Icon: XCircle,
    colour: 'bg-red-50 text-red-500',
  },
};

/**
 * RecentActivity – chronological activity feed.
 * Props:
 *  - activities  {Array}
 */
export default function RecentActivity({ activities }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Recent Activity</h2>
          <p className="mt-1 text-xs text-slate-500">The latest updates across your queues.</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Today
        </span>
      </div>

      <ul className="divide-y divide-slate-100 list-none" role="list">
        {activities.map((item) => {
          const meta = activityMeta[item.type] ?? activityMeta.token_added;
          const { Icon, colour } = meta;

          return (
            <li key={item.id} className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-slate-50/70">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colour}`}>
                <Icon size={15} strokeWidth={1.9} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-5 text-slate-700">
                  {item.description}
                  {item.queue && (
                    <span className="font-semibold text-slate-900"> {item.queue}</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">{item.timestamp}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
