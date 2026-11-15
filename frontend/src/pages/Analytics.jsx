import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Ban, Clock3, UserCheck, Users } from 'lucide-react';
import StatCard from '../components/StatCard';

const rangeOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'all', label: 'All recorded data' },
];

const chartTooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  fontSize: '12px',
};

const statMeta = [
  { icon: UserCheck, accent: 'bg-emerald-50 text-emerald-700' },
  { icon: Clock3, accent: 'bg-amber-50 text-amber-700' },
  { icon: Users, accent: 'bg-blue-50 text-blue-700' },
  { icon: Ban, accent: 'bg-rose-50 text-rose-700' },
];

function getLocalDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeStart(latestTimestamp, range) {
  if (range === 'all') return null;
  const start = new Date(latestTimestamp);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (Number(range) - 1));
  return start;
}

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

export default function Analytics({ queues, queueLengthHistory, servedEvents }) {
  const [dateRange, setDateRange] = useState('7');
  const waitingTokens = queues.flatMap((queue) =>
    queue.tokens.filter((token) => token.status === 'Waiting'),
  );
  const completedTotal = queues.reduce((total, queue) => total + queue.completedCount, 0);
  const cancelledTotal = queues.reduce(
    (total, queue) =>
      total + queue.tokens.filter((token) => token.status === 'Cancelled').length,
    0,
  );
  const averageWait = waitingTokens.length
    ? Math.round(
        waitingTokens.reduce((total, token) => total + (token.waitingMinutes ?? 0), 0) /
          waitingTokens.length,
      )
    : null;

  const latestTimestamp =
    queueLengthHistory[queueLengthHistory.length - 1]?.timestamp ?? new Date().toISOString();
  const rangeStart = getRangeStart(latestTimestamp, dateRange);

  const queueTrendData = useMemo(
    () =>
      queueLengthHistory
        .filter((item) => !rangeStart || new Date(item.timestamp) >= rangeStart)
        .map((item) => {
          const date = new Date(item.timestamp);
          const label =
            dateRange === '7'
              ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
              : date.toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
          return { label, waiting: item.waiting };
        }),
    [dateRange, queueLengthHistory, rangeStart],
  );

  const dailyServedData = useMemo(() => {
    const dailyTotals = new Map();
    servedEvents
      .filter((event) => !rangeStart || new Date(event.timestamp) >= rangeStart)
      .forEach((event) => {
        const dateKey = getLocalDateKey(event.timestamp);
        dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + 1);
      });
    return Array.from(dailyTotals, ([dateKey, served]) => ({
      dateKey,
      label: new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      served,
    })).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [rangeStart, servedEvents]);

  const queuePerformance = queues.map((queue) => ({
    name: queue.name,
    served: queue.completedCount,
    waiting: queue.tokens.filter((token) => token.status === 'Waiting').length,
  }));
  const summaryStats = [
    { id: 'people-served', label: 'People Served', value: completedTotal, unit: null },
    {
      id: 'average-wait',
      label: 'Average Wait Time',
      value: averageWait ?? '—',
      unit: averageWait === null ? null : 'min',
    },
    { id: 'current-waiting', label: 'Currently Waiting', value: waitingTokens.length, unit: null },
    { id: 'cancelled-tokens', label: 'Cancelled Tokens', value: cancelledTotal, unit: null },
  ];

  return (
    <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
            Analytics
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Queue activity and service performance from your current mock data.
          </p>
        </div>
        <label className="flex items-center gap-2 self-start text-xs font-medium text-slate-600 sm:self-auto">
          Chart date range
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <section
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Analytics summary"
      >
        {summaryStats.map((stat, index) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            unit={stat.unit}
            icon={statMeta[index].icon}
            accent={statMeta[index].accent}
          />
        ))}
      </section>

      <p className="mb-4 text-[11px] leading-5 text-slate-500">
        The date range applies to the activity charts. Summary and queue comparison use current
        counts and aggregate completed totals.
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Queue Length Trend"
          description="Total people waiting at each recorded queue change."
        >
          {queueTrendData.length ? (
            <div className="h-[280px] w-full" role="img" aria-label="Line chart of total people waiting over time">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={queueTrendData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`${value} people`, 'Waiting']}
                  />
                  <Line
                    type="monotone"
                    dataKey="waiting"
                    name="People waiting"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart>No queue-length snapshots are available for this date range.</EmptyChart>
          )}
          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            New points are recorded when people are added, called, or cancelled. History is session-only.
          </p>
        </ChartCard>

        <ChartCard
          title="Daily Served Tokens"
          description="Completed tokens recorded by day in this app session."
        >
          {dailyServedData.length ? (
            <div className="h-[280px] w-full" role="img" aria-label="Bar chart of completed tokens by day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyServedData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
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
                    formatter={(value) => [value, 'Tokens served']}
                  />
                  <Bar dataKey="served" name="Tokens served" fill="#16a34a" radius={[5, 5, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart>
              No completions have been recorded in this date range during the current session.
              Complete a serving token to start this chart.
            </EmptyChart>
          )}
          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            Existing completed totals do not include dates in the sample data.
          </p>
        </ChartCard>

        <ChartCard
          title="Queue-wise Performance"
          description="Aggregate completed tokens compared with the current waiting count."
          className="xl:col-span-2"
        >
          {queuePerformance.length ? (
            <div
              className="w-full"
              style={{ height: Math.max(280, queuePerformance.length * 64) }}
              role="img"
              aria-label="Bar chart comparing completed and waiting tokens by queue"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={queuePerformance}
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
                  <Bar dataKey="served" name="Completed (all time)" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="waiting" name="Waiting now" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart>Create a queue to see its performance here.</EmptyChart>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
