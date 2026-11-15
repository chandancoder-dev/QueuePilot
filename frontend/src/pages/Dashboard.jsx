import { useState } from 'react';
import {
  LayoutGrid,
  Users,
  UserCheck,
  Clock,
  Plus,
} from 'lucide-react';

import StatCard from '../components/StatCard';
import QueueTable from '../components/QueueTable';
import RecentActivity from '../components/RecentActivity';
import CreateQueueModal from '../components/CreateQueueModal';

import { stats, recentActivity } from '../data/mockData';

const statMeta = [
  { icon: LayoutGrid, accent: 'bg-blue-50 text-blue-700' },
  { icon: Users,      accent: 'bg-violet-50 text-violet-700' },
  { icon: UserCheck,  accent: 'bg-emerald-50 text-emerald-700' },
  { icon: Clock,      accent: 'bg-amber-50 text-amber-700' },
];

export default function Dashboard({ queues, statistics, onCreateQueue, onViewDetails }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
            Good afternoon, Manager
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Here's what's happening with your queues today.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-700 active:bg-blue-800 sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.2} />
          Create Queue
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <section
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Overview statistics"
      >
        {stats.map((stat, i) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={statistics[stat.id]}
            unit={stat.unit}
            icon={statMeta[i].icon}
            accent={statMeta[i].accent}
          />
        ))}
      </section>

      <section className="mb-6" aria-label="Active queues">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Active Queues</h2>
            <p className="mt-1 text-[13px] text-slate-500">Monitor service activity and waiting customers.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {queues.length} queues
          </span>
        </div>
        <QueueTable queues={queues} onViewDetails={onViewDetails} />
      </section>

      <section aria-label="Recent activity">
        <RecentActivity activities={recentActivity} />
      </section>

      <CreateQueueModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={onCreateQueue}
      />
    </div>
  );
}
