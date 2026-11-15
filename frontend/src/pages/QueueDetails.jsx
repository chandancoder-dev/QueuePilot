import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock3,
  Pause,
  Pencil,
  Play,
  Save,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import AddPersonModal from '../components/AddPersonModal';
import {
  addPersonToQueue,
  callNextToken,
  cancelQueueToken,
  completeQueueToken,
  fetchQueueSummary,
  fetchQueueTokens,
  getTokenErrorMessage,
  reorderQueueTokens,
} from '../services/tokens';

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

function TokenStatus({ status }) {
  const styles = {
    waiting: 'border-blue-200 bg-blue-50 text-blue-700',
    serving: 'border-violet-200 bg-violet-50 text-violet-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDuration(minutes) {
  return Number.isFinite(minutes) && minutes >= 0
    ? `${minutes.toFixed(1)} min`
    : '—';
}

function formatWaitingTime(token) {
  if (!token.createdAt) return '—';
  const start = new Date(token.createdAt).getTime();
  const endTime = token.calledAt || token.cancelledAt;
  const end = endTime
    ? new Date(endTime).getTime()
    : token.status === 'waiting' || token.status === 'serving'
      ? Date.now()
      : Number.NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const elapsedMinutes = Math.floor((end - start) / 60_000);
  return elapsedMinutes < 1 ? '<1 min' : `${elapsedMinutes} min`;
}

function loadQueueTokenData(queueId, signal) {
  return Promise.all([
    fetchQueueTokens(queueId, signal),
    fetchQueueSummary(queueId, signal),
  ]);
}

export default function QueueDetails({
  queue,
  onBack,
  onRenameQueue,
  onToggleQueue,
  onQueueSummaryChange,
  onNotify,
  isUpdating,
  actionError,
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(queue.name);
  const [renameError, setRenameError] = useState('');
  const [tokens, setTokens] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dataStatus, setDataStatus] = useState('loading');
  const [dataError, setDataError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [tokenActionError, setTokenActionError] = useState('');
  const dataRequestId = useRef(0);

  const reloadData = useCallback(async (signal) => {
    const requestId = dataRequestId.current + 1;
    dataRequestId.current = requestId;
    setIsRefreshing(true);
    setDataError('');
    try {
      const [loadedTokens, loadedSummary] = await loadQueueTokenData(queue.id, signal);
      if (signal?.aborted || dataRequestId.current !== requestId) return false;
      setTokens(loadedTokens);
      setSummary(loadedSummary);
      setDataStatus('loaded');
      onQueueSummaryChange(queue.id, loadedSummary);
      return true;
    } catch (error) {
      if (signal?.aborted || dataRequestId.current !== requestId) return false;
      const message = getTokenErrorMessage(
        error,
        'Unable to load token information. Please try again.',
      );
      setDataError(message);
      setDataStatus((current) => current === 'loaded' ? current : 'error');
      return false;
    } finally {
      if (!signal?.aborted && dataRequestId.current === requestId) {
        setIsRefreshing(false);
      }
    }
  }, [onQueueSummaryChange, queue.id]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = dataRequestId.current + 1;
    dataRequestId.current = requestId;
    loadQueueTokenData(queue.id, controller.signal)
      .then(([loadedTokens, loadedSummary]) => {
        if (controller.signal.aborted || dataRequestId.current !== requestId) return;
        setTokens(loadedTokens);
        setSummary(loadedSummary);
        setDataStatus('loaded');
        onQueueSummaryChange(queue.id, loadedSummary);
      })
      .catch((error) => {
        if (controller.signal.aborted || dataRequestId.current !== requestId) return;
        setDataError(
          getTokenErrorMessage(
            error,
            'Unable to load token information. Please try again.',
          ),
        );
        setDataStatus('error');
      });
    return () => {
      controller.abort();
      dataRequestId.current += 1;
    };
  }, [onQueueSummaryChange, queue.id]);

  const waitingTokens = tokens
    .filter((token) => token.status === 'waiting')
    .sort((left, right) => left.position - right.position);
  const servingToken = tokens.find((token) => token.status === 'serving');

  async function refreshAfterMutation() {
    const refreshed = await reloadData();
    if (!refreshed) {
      setTokenActionError('The action succeeded, but the latest queue data could not be loaded. Please retry.');
    }
  }

  async function handleAddPerson(personName, phone) {
    setTokenActionError('');
    try {
      const token = await addPersonToQueue(queue.id, {
        personName,
        ...(phone ? { phone } : {}),
      });
      onNotify(`Token #${token.tokenNumber} generated for ${token.personName}.`);
      await refreshAfterMutation();
      return token;
    } catch (error) {
      throw new Error(
        getTokenErrorMessage(error, 'Unable to add this person. Please try again.'),
        { cause: error },
      );
    }
  }

  async function runTokenAction(action, successMessage) {
    if (pendingAction) return false;
    setPendingAction('token');
    setTokenActionError('');
    try {
      const result = await action();
      onNotify(
        typeof successMessage === 'function'
          ? successMessage(result)
          : successMessage,
      );
      await refreshAfterMutation();
      return true;
    } catch (error) {
      setTokenActionError(
        getTokenErrorMessage(error, 'Unable to update this token. Please try again.'),
      );
      return false;
    } finally {
      setPendingAction('');
    }
  }

  function handleCallNext() {
    return runTokenAction(
      () => callNextToken(queue.id),
      (token) => `Now serving ${token.personName} — token #${token.tokenNumber}.`,
    );
  }

  function handleMoveToken(tokenId, direction) {
    const currentIndex = waitingTokens.findIndex((token) => token.id === tokenId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= waitingTokens.length) return;

    const orderedTokens = [...waitingTokens];
    [orderedTokens[currentIndex], orderedTokens[nextIndex]] = [
      orderedTokens[nextIndex],
      orderedTokens[currentIndex],
    ];
    runTokenAction(
      () => reorderQueueTokens(queue.id, orderedTokens.map((token) => token.id)),
      'Waiting order updated.',
    );
  }

  function handleCompleteToken(token) {
    runTokenAction(
      () => completeQueueToken(queue.id, token.id),
      `Token #${token.tokenNumber} marked completed.`,
    );
  }

  function handleCancelToken(token) {
    if (!window.confirm(`Cancel token #${token.tokenNumber} for ${token.personName}?`)) return;
    runTokenAction(
      () => cancelQueueToken(queue.id, token.id),
      `Token #${token.tokenNumber} cancelled.`,
    );
  }

  function beginRename() {
    setNameDraft(queue.name);
    setRenameError('');
    setIsRenaming(true);
  }

  async function submitRename(event) {
    event.preventDefault();
    const name = nameDraft.trim();
    if (!name) {
      setRenameError('Queue name is required.');
      return;
    }

    const succeeded = await onRenameQueue(name);
    if (succeeded) {
      setRenameError('');
      setIsRenaming(false);
    }
  }

  const summaryCards = [
    { label: 'Total tokens', value: summary?.totalTokens ?? '—', detail: 'All statuses', icon: Users, accent: 'bg-blue-50 text-blue-700' },
    { label: 'People waiting', value: summary?.waitingCount ?? '—', detail: 'Waiting list', icon: Clock3, accent: 'bg-amber-50 text-amber-700' },
    { label: 'Currently serving', value: summary?.currentlyServingCount ?? '—', detail: 'In service', icon: Play, accent: 'bg-violet-50 text-violet-700' },
    { label: 'Completed', value: summary?.completedCount ?? '—', detail: 'All-time total', icon: Check, accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Cancelled', value: summary?.cancelledCount ?? '—', detail: 'All-time total', icon: X, accent: 'bg-slate-100 text-slate-600' },
    { label: 'Average waiting', value: formatDuration(summary?.averageWaitingTimeMinutes), detail: summary?.averageWaitingTimeMinutes == null ? 'Unavailable' : 'Created to called', icon: Clock3, accent: 'bg-cyan-50 text-cyan-700' },
    { label: 'Average service', value: formatDuration(summary?.averageServiceDurationMinutes), detail: summary?.averageServiceDurationMinutes == null ? 'Unavailable' : 'Called to completed', icon: CheckCircle, accent: 'bg-indigo-50 text-indigo-700' },
  ];

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
            {isRenaming ? (
              <form onSubmit={submitRename} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => {
                    setNameDraft(event.target.value);
                    setRenameError('');
                  }}
                  aria-label="Queue name"
                  aria-invalid={Boolean(renameError)}
                  aria-describedby={renameError ? 'queue-rename-error' : undefined}
                  autoFocus
                  disabled={isUpdating}
                  className="h-10 min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={14} />
                  {isUpdating ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  disabled={isUpdating}
                  aria-label="Cancel renaming"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  <X size={15} />
                </button>
                {renameError && (
                  <p id="queue-rename-error" className="w-full text-xs text-red-600" role="alert">
                    {renameError}
                  </p>
                )}
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
                  {queue.name}
                </h2>
                <button
                  type="button"
                  onClick={beginRename}
                  disabled={isUpdating}
                  aria-label={`Rename ${queue.name}`}
                  title="Rename queue"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 disabled:opacity-50"
                >
                  <Pencil size={14} />
                </button>
                <StatusBadge status={queue.status} />
              </div>
            )}
            <p className="mt-1.5 font-mono text-xs text-slate-500">Queue ID: {queue.queueId}</p>
          </div>
          <button
            type="button"
            onClick={onToggleQueue}
            disabled={isUpdating}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {queue.status === 'Active' ? <Pause size={15} /> : <Play size={15} />}
            {isUpdating
              ? 'Saving…'
              : queue.status === 'Active'
                ? 'Pause Queue'
                : 'Resume Queue'}
          </button>
        </div>
        {actionError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
            {actionError}
          </p>
        )}
      </div>

      <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Queue summary">
        {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </section>

      <section aria-label="Token management">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Token Management</h3>
            <p className="mt-1 text-[13px] text-slate-500">Manage the waiting list and track each token's service status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reloadData()}
              disabled={isRefreshing || Boolean(pendingAction)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setIsAddPersonOpen(true)}
              disabled={queue.status !== 'Active' || Boolean(pendingAction)}
              title={queue.status !== 'Active' ? 'Resume the queue before adding people.' : undefined}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={15} />
              Add Person
            </button>
            <button
              type="button"
              onClick={handleCallNext}
              disabled={!waitingTokens.length || Boolean(servingToken) || Boolean(pendingAction)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play size={15} />
              Call Next
            </button>
          </div>
        </div>
        {queue.status !== 'Active' && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            This queue is paused. Resume it before adding people.
          </p>
        )}
        {tokenActionError && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
            {tokenActionError}
          </p>
        )}
        {dataError && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
            <p className="text-sm text-red-700" role="alert">{dataError}</p>
            <button
              type="button"
              onClick={() => reloadData()}
              disabled={isRefreshing}
              className="text-xs font-semibold text-red-800 underline underline-offset-2 disabled:opacity-60"
            >
              Try again
            </button>
          </div>
        )}
        {servingToken && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Currently serving</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                Token #{servingToken.tokenNumber} · {servingToken.personName}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCompleteToken(servingToken)}
                disabled={Boolean(pendingAction)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={14} />
                Complete
              </button>
              <button
                type="button"
                onClick={() => handleCancelToken(servingToken)}
                disabled={Boolean(pendingAction)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {dataStatus === 'loading' ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-slate-500" role="status">
              <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
              Loading tokens…
            </div>
          ) : dataStatus === 'error' ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Token data is unavailable. Use the retry option above.
            </div>
          ) : tokens.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No tokens in this queue yet.</p>
              <p className="mt-1 text-xs text-slate-500">Add a person to generate the first token.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Waiting time</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tokens.map((token) => {
                    const waitingIndex = waitingTokens.findIndex((waiting) => waiting.id === token.id);
                    return (
                      <tr key={token.id} className="text-sm text-slate-700">
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {token.status === 'waiting' ? waitingIndex + 1 : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">#{token.tokenNumber}</td>
                        <td className="px-4 py-3">
                          <span className="block font-medium text-slate-900">{token.personName}</span>
                          {token.phone && <span className="mt-0.5 block text-xs text-slate-500">{token.phone}</span>}
                        </td>
                        <td className="px-4 py-3"><TokenStatus status={token.status} /></td>
                        <td className="px-4 py-3 text-xs text-slate-600">{formatWaitingTime(token)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {token.status === 'waiting' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMoveToken(token.id, -1)}
                                  disabled={waitingIndex === 0 || Boolean(pendingAction)}
                                  aria-label={`Move token ${token.tokenNumber} up`}
                                  title="Move up"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <ArrowUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveToken(token.id, 1)}
                                  disabled={waitingIndex === waitingTokens.length - 1 || Boolean(pendingAction)}
                                  aria-label={`Move token ${token.tokenNumber} down`}
                                  title="Move down"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <ArrowDown size={15} />
                                </button>
                              </>
                            )}
                            {token.status === 'waiting' && (
                              <button
                                type="button"
                                onClick={() => handleCancelToken(token)}
                                disabled={Boolean(pendingAction)}
                                aria-label={`Cancel token ${token.tokenNumber}`}
                                title="Cancel token"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onAdd={handleAddPerson}
      />
    </div>
  );
}
