import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Users,
  UserCheck,
  Clock,
  Plus,
  CheckCircle,
  Ban,
  Pause,
  Timer,
} from 'lucide-react';

import StatCard from '../components/StatCard';
import QueueTable from '../components/QueueTable';
import CreateQueueModal from '../components/CreateQueueModal';
import RecentActivity from '../components/RecentActivity';
import {
  fetchDashboardAnalytics,
  fetchRecentActivity,
  getAnalyticsErrorMessage,
} from '../services/analytics';

const statDefinitions = [
  { field: 'totalQueues', label: 'Total Queues', icon: LayoutGrid, accent: 'bg-blue-50 text-blue-700' },
  { field: 'activeQueues', label: 'Active Queues', icon: UserCheck, accent: 'bg-emerald-50 text-emerald-700' },
  { field: 'pausedQueues', label: 'Paused Queues', icon: Pause, accent: 'bg-amber-50 text-amber-700' },
  { field: 'totalWaitingTokens', label: 'People Waiting', icon: Users, accent: 'bg-violet-50 text-violet-700' },
  { field: 'currentlyServingTokens', label: 'Currently Serving', icon: Clock, accent: 'bg-cyan-50 text-cyan-700' },
  { field: 'totalPeopleServed', label: 'Completed Tokens', icon: CheckCircle, accent: 'bg-emerald-50 text-emerald-700' },
  { field: 'totalCancelledTokens', label: 'Cancelled Tokens', icon: Ban, accent: 'bg-rose-50 text-rose-700' },
  { field: 'averageWaitingTimeMinutes', label: 'Average Waiting Time', duration: true, icon: Clock, accent: 'bg-blue-50 text-blue-700' },
  { field: 'averageServiceDurationMinutes', label: 'Average Service Duration', duration: true, icon: Timer, accent: 'bg-indigo-50 text-indigo-700' },
];

export default function Dashboard({
  queues,
  onCreateQueue,
  onViewDetails,
  queueLoadStatus,
  queueLoadError,
  onRetryQueues,
  analyticsRefreshKey,
  manager,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardStatus, setDashboardStatus] = useState('loading');
  const [dashboardError, setDashboardError] = useState('');
  const [activities, setActivities] = useState([]);
  const [activityStatus, setActivityStatus] = useState('loading');
  const [activityError, setActivityError] = useState('');
  const [analyticsRetryKey, setAnalyticsRetryKey] = useState(0);
  const greetingName = manager?.name?.trim().split(/\s+/)[0] || 'there';

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardAnalytics(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setDashboardData(data);
        setDashboardStatus('loaded');
        setDashboardError('');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setDashboardData(null);
        setDashboardStatus('error');
        setDashboardError(
          getAnalyticsErrorMessage(error, 'Unable to load dashboard analytics.'),
        );
      });

    fetchRecentActivity(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setActivities(data);
        setActivityStatus('loaded');
        setActivityError('');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setActivities([]);
        setActivityStatus('error');
        setActivityError(
          getAnalyticsErrorMessage(error, 'Unable to load recent activity.'),
        );
      });

    return () => controller.abort();
  }, [analyticsRefreshKey, analyticsRetryKey]);

  function retryAnalytics() {
    setDashboardData(null);
    setDashboardStatus('loading');
    setDashboardError('');
    setActivities([]);
    setActivityStatus('loading');
    setActivityError('');
    setAnalyticsRetryKey((current) => current + 1);
  }

  function getStatProps(stat) {
    const value = dashboardData[stat.field];
    if (!stat.duration) {
      return { value, unit: null };
    }
    return value === null
      ? { value: '—', unit: null, detail: 'Unavailable' }
      : { value: value.toFixed(1), unit: 'min' };
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
            Good afternoon, {greetingName}
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
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        aria-label="Overview statistics"
      >
        {dashboardStatus === 'loading' ? (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500" role="status">
            Loading dashboard analytics…
          </div>
        ) : dashboardStatus === 'error' ? (
          <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm text-red-700" role="alert">{dashboardError}</p>
            <button type="button" onClick={retryAnalytics} className="text-xs font-semibold text-red-800 underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : (
          statDefinitions.map((stat) => (
            <StatCard
              key={stat.field}
              label={stat.label}
              {...getStatProps(stat)}
              icon={stat.icon}
              accent={stat.accent}
            />
          ))
        )}
      </section>

      <section className="mb-6" aria-label="Queues">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Queues</h2>
            <p className="mt-1 text-[13px] text-slate-500">Monitor service activity and waiting customers.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {queueLoadStatus === 'loading' ? 'Loading queues…' : `${queues.length} queues`}
          </span>
        </div>
        <QueueTable
          queues={queues}
          onViewDetails={onViewDetails}
          isLoading={queueLoadStatus === 'loading'}
          error={queueLoadStatus === 'error' ? queueLoadError : ''}
          onRetry={onRetryQueues}
        />
      </section>

      <section aria-label="Recent activity">
        <RecentActivity
          activities={activities}
          isLoading={activityStatus === 'loading'}
          error={activityStatus === 'error' ? activityError : ''}
          onRetry={retryAnalytics}
        />
      </section>

      <CreateQueueModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={onCreateQueue}
      />
    </div>
  );
}
