import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Ban,
  CheckCircle,
  Clock3,
  Timer,
  UserCheck,
  Users,
} from 'lucide-react';
import RecentActivity from '../components/RecentActivity';
import StatCard from '../components/StatCard';
import {
  fetchDashboardAnalytics,
  fetchQueuePerformance,
  fetchQueueTrends,
  fetchRecentActivity,
  getAnalyticsErrorMessage,
} from '../services/analytics';

const chartTooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  fontSize: '12px',
};

function ChartCard({ title, description, children, className = '' }) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ children }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-xs leading-5 text-slate-500">
      {children}
    </div>
  );
}

function formatDay(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDuration(value) {
  return value === null ? 'Unavailable' : `${value.toFixed(1)} min`;
}

function useChartWidth() {
  const [container, setContainer] = useState(null);
  const containerRef = useCallback((element) => {
    setContainer(element);
  }, []);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!container) return undefined;

    function updateWidth() {
      const nextWidth = Math.round(container.getBoundingClientRect().width);
      setWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    }

    updateWidth();
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateWidth);
    observer?.observe(container);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [container]);

  return [containerRef, width];
}

export default function Analytics({ analyticsRefreshKey }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [trendChartRef, trendChartWidth] = useChartWidth();
  const [servedChartRef, servedChartWidth] = useChartWidth();
  const [performanceChartRef, performanceChartWidth] = useChartWidth();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchDashboardAnalytics(controller.signal),
      fetchQueueTrends(controller.signal),
      fetchQueuePerformance(controller.signal),
      fetchRecentActivity(controller.signal),
    ])
      .then(([dashboard, trends, queues, activities]) => {
        if (controller.signal.aborted) return;
        setData({ dashboard, trends, queues, activities });
        setStatus('loaded');
        setError('');
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setData(null);
        setStatus('error');
        setError(
          getAnalyticsErrorMessage(requestError, 'Unable to load analytics. Please try again.'),
        );
      });

    return () => controller.abort();
  }, [analyticsRefreshKey, retryKey]);

  function retryAnalytics() {
    setData(null);
    setStatus('loading');
    setError('');
    setRetryKey((current) => current + 1);
  }

  const summaryStats = data ? [
    {
      label: 'People Served',
      value: data.dashboard.totalPeopleServed,
      icon: UserCheck,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Average Waiting Time',
      value: data.dashboard.averageWaitingTimeMinutes === null
        ? '—'
        : data.dashboard.averageWaitingTimeMinutes.toFixed(1),
      unit: data.dashboard.averageWaitingTimeMinutes === null ? null : 'min',
      detail: data.dashboard.averageWaitingTimeMinutes === null ? 'Unavailable' : undefined,
      icon: Clock3,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Currently Waiting',
      value: data.dashboard.totalWaitingTokens,
      icon: Users,
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Currently Serving',
      value: data.dashboard.currentlyServingTokens,
      icon: Timer,
      accent: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Cancelled Tokens',
      value: data.dashboard.totalCancelledTokens,
      icon: Ban,
      accent: 'bg-rose-50 text-rose-700',
    },
    {
      label: 'Average Service Duration',
      value: data.dashboard.averageServiceDurationMinutes === null
        ? '—'
        : data.dashboard.averageServiceDurationMinutes.toFixed(1),
      unit: data.dashboard.averageServiceDurationMinutes === null ? null : 'min',
      detail: data.dashboard.averageServiceDurationMinutes === null ? 'Unavailable' : undefined,
      icon: CheckCircle,
      accent: 'bg-indigo-50 text-indigo-700',
    },
  ] : [];

  const queueTrendData = data?.trends.map((day) => ({
    ...day,
    label: formatDay(day.date),
  })) ?? [];
  const performanceData = data?.queues ?? [];
  const hasTrendActivity = queueTrendData.some(
    (day) => day.tokensCreated || day.tokensCompleted || day.tokensCancelled,
  );

  return (
    <div
      className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7"
    >
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
          Analytics
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
          Live queue activity and service performance for your workspace.
        </p>
      </div>

      {status === 'loading' ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
          Loading analytics…
        </div>
      ) : status === 'error' ? (
        <section className="rounded-xl border border-red-200 bg-white px-5 py-8 text-center shadow-sm">
          <p className="text-sm text-red-700" role="alert">{error}</p>
          <button
            type="button"
            onClick={retryAnalytics}
            className="mt-4 min-h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <section
            className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Analytics summary"
          >
            {summaryStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <p className="mb-4 text-[11px] leading-5 text-slate-500">
            Activity charts show the seven most recent UTC days. Queue performance and summary cards
            show current and all-time backend metrics.
          </p>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Queue Activity Trends"
              description="Daily token creation, completion, and cancellation for the last seven days."
            >
              {queueTrendData.length ? (
                <>
                  <div
                    ref={trendChartRef}
                    className="h-[280px] w-full min-w-0"
                    role="img"
                    aria-label="Line chart of daily token activity for the last seven days"
                  >
                    {trendChartWidth > 0 && (
                      <LineChart
                        width={trendChartWidth}
                        height={280}
                        data={queueTrendData}
                        margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
                      >
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          minTickGap={18}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value, name) => [value, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line
                          type="monotone"
                          dataKey="tokensCreated"
                          name="Tokens created"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="tokensCompleted"
                          name="Tokens completed"
                          stroke="#16a34a"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="tokensCancelled"
                          name="Tokens cancelled"
                          stroke="#e11d48"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#e11d48', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    )}
                  </div>
                  {!hasTrendActivity && (
                    <p className="mt-2 text-center text-[11px] text-slate-500">
                      No token activity was recorded in these seven days.
                    </p>
                  )}
                </>
              ) : (
                <EmptyChart>No seven-day trend data is available.</EmptyChart>
              )}
            </ChartCard>

            <ChartCard
              title="Daily Served Tokens"
              description="Tokens completed on each of the last seven days."
            >
              {queueTrendData.length ? (
                <>
                  <div
                    ref={servedChartRef}
                    className="h-[280px] w-full min-w-0"
                    role="img"
                    aria-label="Bar chart of completed tokens by day over the last seven days"
                  >
                    {servedChartWidth > 0 && (
                      <BarChart
                        width={servedChartWidth}
                        height={280}
                        data={queueTrendData}
                        margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
                      >
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value) => [value, 'Tokens completed']}
                        />
                        <Bar
                          dataKey="tokensCompleted"
                          name="Tokens completed"
                          fill="#16a34a"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={48}
                        />
                      </BarChart>
                    )}
                  </div>
                  {!queueTrendData.some((day) => day.tokensCompleted > 0) && (
                    <p className="mt-2 text-center text-[11px] text-slate-500">
                      No tokens were completed in these seven days.
                    </p>
                  )}
                </>
              ) : (
                <EmptyChart>No seven-day completion data is available.</EmptyChart>
              )}
            </ChartCard>

            <ChartCard
              title="Queue-wise Performance"
              description="Completed tokens compared with the current waiting count."
              className="xl:col-span-2"
            >
              {performanceData.length ? (
                <div
                  ref={performanceChartRef}
                  className="w-full min-w-0"
                  style={{ height: Math.max(280, performanceData.length * 64) }}
                  role="img"
                  aria-label="Bar chart comparing completed and waiting tokens by queue"
                >
                  {performanceChartWidth > 0 && (
                    <BarChart
                      width={performanceChartWidth}
                      height={Math.max(280, performanceData.length * 64)}
                      data={performanceData}
                      layout="vertical"
                      margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                      barCategoryGap="28%"
                    >
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fill: '#475569', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="completedCount" name="Completed" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="waitingCount" name="Waiting now" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  )}
                </div>
              ) : (
                <EmptyChart>Create a queue to see its performance here.</EmptyChart>
              )}
            </ChartCard>

            <ChartCard
              title="Queue Performance Details"
              description="Current token counts and average durations for each queue."
              className="xl:col-span-2"
            >
              {performanceData.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left">
                    <thead className="border-b border-slate-200 bg-slate-50/80">
                      <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Queue</th>
                        <th className="px-3 py-3">Queue ID</th>
                        <th className="px-3 py-3">Total</th>
                        <th className="px-3 py-3">Waiting</th>
                        <th className="px-3 py-3">Serving</th>
                        <th className="px-3 py-3">Completed</th>
                        <th className="px-3 py-3">Cancelled</th>
                        <th className="px-3 py-3">Avg. Wait</th>
                        <th className="px-3 py-3">Avg. Service</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {performanceData.map((queue) => (
                        <tr key={queue.queueId}>
                          <td className="px-3 py-3 font-medium text-slate-900">{queue.name}</td>
                          <td className="px-3 py-3 font-mono text-slate-500">{queue.queueId}</td>
                          <td className="px-3 py-3">{queue.totalTokens}</td>
                          <td className="px-3 py-3">{queue.waitingCount}</td>
                          <td className="px-3 py-3">{queue.servingCount}</td>
                          <td className="px-3 py-3">{queue.completedCount}</td>
                          <td className="px-3 py-3">{queue.cancelledCount}</td>
                          <td className="px-3 py-3">{formatDuration(queue.averageWaitingTimeMinutes)}</td>
                          <td className="px-3 py-3">{formatDuration(queue.averageServiceDurationMinutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-slate-500">No queue performance data yet. Create a queue to get started.</p>
              )}
            </ChartCard>

            <div className="xl:col-span-2">
              <RecentActivity activities={data.activities} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
