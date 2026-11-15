import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import CreateQueueModal from '../components/CreateQueueModal';
import QueueTable from '../components/QueueTable';

const filters = ['All', 'Active', 'Paused'];

export default function MyQueues({ queues, onCreateQueue, onViewDetails }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);

  const filteredQueues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return queues.filter((queue) => {
      const matchesStatus = statusFilter === 'All' || queue.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        queue.name.toLowerCase().includes(normalizedQuery) ||
        queue.id.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [queues, query, statusFilter]);

  return (
    <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
            My Queues
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">View and manage your service queues.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-700 active:bg-blue-800 sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.2} />
          Create Queue
        </button>
      </div>

      <section aria-label="Queue list">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search queues by name or ID"
              aria-label="Search queues"
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter queues by status">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                aria-pressed={statusFilter === filter}
                className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  statusFilter === filter
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <QueueTable queues={filteredQueues} onViewDetails={onViewDetails} />
      </section>

      <CreateQueueModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={onCreateQueue}
      />
    </div>
  );
}
