import { ExternalLink } from 'lucide-react';

/** Status badge */
function StatusBadge({ status }) {
  const isActive = status === 'Active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold
        ${isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

/**
 * QueueTable – responsive table of active queues.
 * Props:
 *  - queues  {Array}
 */
export default function QueueTable({ queues, onViewDetails }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="divide-y divide-slate-100 md:hidden">
        {queues.map((queue) => (
          <article key={queue.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900">{queue.name}</h3>
                <p className="mt-1 font-mono text-[11px] text-slate-500">{queue.id}</p>
              </div>
              <StatusBadge status={queue.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Waiting</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{queue.waiting} <span className="text-xs font-normal text-slate-500">people</span></p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Serving token</p>
                <p className="mt-1 font-mono text-xs font-medium text-slate-800">{queue.servingToken}</p>
              </div>
            </div>
            <button
              onClick={() => onViewDetails(queue.id)}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              aria-label={`View details for ${queue.name}`}
            >
              View Details
              <ExternalLink size={12} strokeWidth={2} />
            </button>
          </article>
        ))}
        {queues.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No queues yet. Create your first queue above.
          </div>
        )}
      </div>

      <div className="hidden max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[800px] text-sm" aria-label="Active queues">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th scope="col" className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Queue Name
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Queue ID
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Waiting
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Serving Token
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Status
              </th>
              <th scope="col" className="px-5 py-3.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {queues.map((queue) => (
              <tr
                key={queue.id}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                  {queue.name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500">
                  {queue.id}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    {queue.waiting}
                    <span className="text-xs font-normal text-slate-500">people</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                    {queue.servingToken}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge status={queue.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button
                    onClick={() => onViewDetails(queue.id)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                    aria-label={`View details for ${queue.name}`}
                  >
                    View Details
                    <ExternalLink size={11} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          {queues.length === 0 && (
            <tr>
              <td colSpan="6" className="py-12 text-center text-sm text-slate-500">
                No queues yet. Create your first queue above.
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
