import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Clock3,
  Pause,
  Play,
  Plus,
  Users,
  X,
} from 'lucide-react';
import AddPersonModal from '../components/AddPersonModal';

function StatusBadge({ status }) {
  const isActive = status === 'Active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

function getWaitingMinutes(token) {
  return token.waitingMinutes ?? 0;
}

function WaitingTime({ token }) {
  const minutes = getWaitingMinutes(token);
  return <>{minutes === 0 ? 'Just now' : `${minutes} min`}</>;
}

function SummaryCard({ label, value, detail, icon: Icon, accent }) {
  return (
    <article className="flex min-h-[112px] items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-2 truncate text-2xl font-semibold leading-none tracking-tight text-slate-900">{value}</p>
        {detail && <p className="mt-1.5 text-[11px] text-slate-500">{detail}</p>}
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
    </article>
  );
}

export default function QueueDetails({
  queue,
  onBack,
  onToggleQueue,
  onAddPerson,
  onMoveToken,
  onCallNext,
  onComplete,
  onCancelToken,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const waitingTokens = queue.tokens.filter((token) => token.status === 'Waiting');
  const completedCount = queue.completedCount;
  const estimatedWait = waitingTokens.length ? `${waitingTokens.length * 5} min` : '—';
  const canCallNext =
    queue.status === 'Active' && queue.servingToken === '—' && waitingTokens.length > 0;
  const canComplete = queue.servingToken !== '—';

  function confirmCancel(token) {
    const confirmed = window.confirm(
      `Cancel token ${token.tokenNumber} for ${token.personName}?`,
    );
    if (confirmed) onCancelToken(token.id);
  }

  function renderTokenActions(token, position) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMoveToken(token.id, -1)}
          disabled={position === 0}
          aria-label={`Move ${token.tokenNumber} up`}
          title="Move up"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp size={15} />
        </button>
        <button
          type="button"
          onClick={() => onMoveToken(token.id, 1)}
          disabled={position === waitingTokens.length - 1}
          aria-label={`Move ${token.tokenNumber} down`}
          title="Move down"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowDown size={15} />
        </button>
        <button
          type="button"
          onClick={() => confirmCancel(token)}
          aria-label={`Cancel ${token.tokenNumber}`}
          title="Cancel token"
          className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Back to My Queues
        </button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
                {queue.name}
              </h2>
              <StatusBadge status={queue.status} />
            </div>
            <p className="mt-1.5 font-mono text-xs text-slate-500">Queue ID: {queue.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleQueue}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {queue.status === 'Active' ? <Pause size={15} /> : <Play size={15} />}
              {queue.status === 'Active' ? 'Pause Queue' : 'Resume Queue'}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-700"
            >
              <Plus size={15} />
              Add Person
            </button>
          </div>
        </div>
      </div>

      <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Queue summary">
        <SummaryCard
          label="People waiting"
          value={waitingTokens.length}
          detail="In the waiting list"
          icon={Users}
          accent="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          label="Currently serving"
          value={queue.servingToken}
          detail="Active token"
          icon={Play}
          accent="bg-violet-50 text-violet-700"
        />
        <SummaryCard
          label="Completed tokens"
          value={completedCount}
          detail="Served today"
          icon={Check}
          accent="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          label="Estimated wait"
          value={estimatedWait}
          detail="For the next person"
          icon={Clock3}
          accent="bg-amber-50 text-amber-700"
        />
      </section>

      <section aria-label="Waiting list">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Waiting List</h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Manage the order and status of people waiting for service.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCallNext}
              disabled={!canCallNext}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title={queue.status !== 'Active' ? 'Resume the queue to call the next person' : undefined}
            >
              <Play size={14} />
              Call Next
            </button>
            <button
              type="button"
              onClick={onComplete}
              disabled={!canComplete}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={14} />
              Complete
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="divide-y divide-slate-100 md:hidden">
            {waitingTokens.map((token, index) => (
              <article key={token.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-blue-700">{token.tokenNumber}</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">{token.personName}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                    Waiting
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">
                    Position <span className="font-semibold text-slate-700">{index + 1}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <WaitingTime token={token} />
                  </div>
                  {renderTokenActions(token, index)}
                </div>
              </article>
            ))}
            {waitingTokens.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No one is waiting right now.</p>
                <p className="mt-1 text-xs text-slate-500">Add a person to generate the next token.</p>
              </div>
            )}
          </div>

          <div className="hidden max-w-full overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th scope="col" className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Position
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Token Number
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Person Name
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Waiting Time
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitingTokens.map((token, index) => (
                  <tr key={token.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-slate-700">{index + 1}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700">{token.tokenNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{token.personName}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Waiting
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600"><WaitingTime token={token} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">{renderTokenActions(token, index)}</div>
                    </td>
                  </tr>
                ))}
                {waitingTokens.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-sm text-slate-500">
                      No one is waiting right now. Add a person to generate the next token.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AddPersonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAddPerson}
      />
    </div>
  );
}
