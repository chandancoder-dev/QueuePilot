import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import MyQueues from './pages/MyQueues';
import QueueDetails from './pages/QueueDetails';
import Login from './pages/Login';
import Toast from './components/Toast';
import api, {
  authUnauthorizedEvent,
  clearStoredToken,
  getStoredToken,
  storeToken,
} from './services/api';
import {
  createQueue,
  fetchQueue,
  fetchQueues,
  getQueueErrorMessage,
  updateQueue as updateQueueRequest,
} from './services/queues';

const Analytics = lazy(() => import('./pages/Analytics'));

const pages = {
  overview: {
    title: 'Overview',
  },
  queues: {
    title: 'My Queues',
  },
  analytics: {
    title: 'Analytics',
    description: 'Track queue performance and service trends.',
  },
  settings: {
    title: 'Settings',
    description: 'Manage workspace preferences and queue configuration.',
  },
};

export default function App() {
  const [authStatus, setAuthStatus] = useState(() =>
    getStoredToken() ? 'loading' : 'unauthenticated',
  );
  const [manager, setManager] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [activeNav, setActiveNav] = useState('overview');
  const [queues, setQueues] = useState([]);
  const [queueLoadStatus, setQueueLoadStatus] = useState(() =>
    getStoredToken() ? 'loading' : 'idle',
  );
  const [queueLoadError, setQueueLoadError] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [selectedQueueDetails, setSelectedQueueDetails] = useState(null);
  const [queueDetailsStatus, setQueueDetailsStatus] = useState('idle');
  const [queueDetailsError, setQueueDetailsError] = useState('');
  const [queueActionError, setQueueActionError] = useState('');
  const [queueUpdating, setQueueUpdating] = useState(false);
  const queueDetailsRequestId = useRef(0);
  const queueListRequestId = useRef(0);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const handleQueueSummaryChange = useCallback((queueId, summary) => {
    const updatedCounts = {
      waitingCount: summary.waitingCount,
      servingCount: summary.currentlyServingCount,
      completedCount: summary.completedCount,
      cancelledCount: summary.cancelledCount,
    };
    setQueues((currentQueues) =>
      currentQueues.map((queue) =>
        queue.id === queueId ? { ...queue, ...updatedCounts } : queue,
      ),
    );
    setSelectedQueueDetails((currentQueue) =>
      currentQueue?.id === queueId
        ? { ...currentQueue, ...updatedCounts }
        : currentQueue,
    );
    setAnalyticsRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    function handleUnauthorized() {
      setManager(null);
      setAuthStatus('unauthenticated');
      setAuthNotice('Your session has expired. Please sign in again.');
      setQueues([]);
      setQueueLoadStatus('idle');
      setSelectedQueueId(null);
      setSelectedQueueDetails(null);
      setQueueDetailsStatus('idle');
      setQueueDetailsError('');
      setQueueActionError('');
      queueDetailsRequestId.current += 1;
      queueListRequestId.current += 1;
    }

    window.addEventListener(authUnauthorizedEvent, handleUnauthorized);

    if (!getStoredToken()) {
      return () => {
        isMounted = false;
        window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
      };
    }

    api.get('/api/auth/me')
      .then(({ data }) => {
        if (!isMounted) return;
        if (!data?.manager) {
          throw new Error('The server returned an invalid manager session.');
        }
        setManager(data.manager);
        setAuthNotice('');
        setAuthStatus('authenticated');
      })
      .catch((error) => {
        if (!isMounted) return;
        setManager(null);
        setAuthStatus('unauthenticated');
        setAuthNotice(
          error.response?.status === 401
            ? 'Your session has expired. Please sign in again.'
            : 'We could not verify your session. Sign in to continue.',
        );
      });

    return () => {
      isMounted = false;
      window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined;

    const controller = new AbortController();
    const requestId = queueListRequestId.current + 1;
    queueListRequestId.current = requestId;
    fetchQueues(controller.signal)
      .then((loadedQueues) => {
        if (controller.signal.aborted || queueListRequestId.current !== requestId) return;
        setQueues(loadedQueues);
        setQueueLoadStatus('loaded');
        setQueueLoadError('');
      })
      .catch((error) => {
        if (controller.signal.aborted || queueListRequestId.current !== requestId) return;
        setQueueLoadStatus('error');
        setQueueLoadError(
          getQueueErrorMessage(error, 'Unable to load your queues. Please try again.'),
        );
      });

    return () => {
      controller.abort();
      if (queueListRequestId.current === requestId) {
        queueListRequestId.current += 1;
      }
    };
  }, [authStatus]);

  async function handleLogin(credentials) {
    const { data } = await api.post('/api/auth/login', credentials);
    if (typeof data?.token !== 'string' || !data.manager) {
      throw new Error('The server returned an invalid login response.');
    }
    storeToken(data.token);
    setManager(data.manager);
    setAuthNotice('');
    setQueues([]);
    setQueueLoadStatus('loading');
    setQueueLoadError('');
    queueListRequestId.current += 1;
    setAuthStatus('authenticated');
  }

  function handleLogout() {
    clearStoredToken();
    setManager(null);
    setAuthNotice('');
    setQueues([]);
    setQueueLoadStatus('idle');
    setQueueLoadError('');
    setSelectedQueueId(null);
    setSelectedQueueDetails(null);
    setQueueDetailsStatus('idle');
    queueDetailsRequestId.current += 1;
    queueListRequestId.current += 1;
    setActiveNav('overview');
    setAuthStatus('unauthenticated');
  }

  if (authStatus === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
        <div className="flex items-center gap-2.5" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
          Verifying your session…
        </div>
      </main>
    );
  }

  if (authStatus !== 'authenticated' || !manager) {
    return <Login onLogin={handleLogin} notice={authNotice} />;
  }

  const activePage = selectedQueueId && selectedQueueDetails
    ? { title: selectedQueueDetails.name }
    : pages[activeNav] ?? pages.overview;
  const queuesWithCounts = queues.map((queue) => ({
    ...queue,
    waiting: queue.waitingCount,
    servingToken: queue.servingCount > 0 ? 'In service' : '—',
  }));

  function showToast(message) {
    setToast({ message });
  }

  async function refreshQueueList() {
    const requestId = queueListRequestId.current + 1;
    queueListRequestId.current = requestId;
    try {
      const loadedQueues = await fetchQueues();
      if (queueListRequestId.current !== requestId) return true;
      setQueues(loadedQueues);
      setQueueLoadStatus('loaded');
      setQueueLoadError('');
      return true;
    } catch (error) {
      if (queueListRequestId.current !== requestId) return true;
      setQueueLoadStatus('error');
      setQueueLoadError(
        getQueueErrorMessage(error, 'Unable to refresh your queues. Please try again.'),
      );
      return false;
    }
  }

  function handleRetryQueueLoad() {
    setQueueLoadStatus('loading');
    setQueueLoadError('');
    refreshQueueList();
  }

  async function handleCreateQueue(name) {
    const createdQueue = await createQueue(name);
    setQueues((currentQueues) => [
      createdQueue,
      ...currentQueues.filter((queue) => queue.id !== createdQueue.id),
    ]);
    setQueueLoadStatus('loaded');
    setQueueLoadError('');
    setAnalyticsRefreshKey((current) => current + 1);
    showToast(`Queue "${createdQueue.name}" created successfully.`);
    refreshQueueList().then((refreshed) => {
      if (!refreshed) {
        showToast(`Queue "${createdQueue.name}" was created, but the list could not be refreshed.`);
      }
    });
  }

  async function handleUpdateQueue(queueId, updates, successMessage) {
    setQueueActionError('');
    setQueueUpdating(true);
    try {
      const updatedQueue = await updateQueueRequest(queueId, updates);
      setQueues((currentQueues) =>
        currentQueues.map((queue) => (queue.id === queueId ? updatedQueue : queue)),
      );
      setSelectedQueueDetails(updatedQueue);
      setQueueDetailsStatus('loaded');
      setAnalyticsRefreshKey((current) => current + 1);
      showToast(successMessage);
      refreshQueueList().then((refreshed) => {
        if (!refreshed) {
          showToast(`${successMessage} The queue list could not be refreshed.`);
        }
      });
      return true;
    } catch (error) {
      setQueueActionError(
        getQueueErrorMessage(error, 'Unable to update this queue. Please try again.'),
      );
      return false;
    } finally {
      setQueueUpdating(false);
    }
  }

  function handleRenameQueue(name) {
    return handleUpdateQueue(
      selectedQueueId,
      { name },
      'Queue name updated successfully.',
    );
  }

  function handleToggleQueue() {
    if (!selectedQueueDetails) return Promise.resolve(false);
    const status = selectedQueueDetails.status === 'Active' ? 'paused' : 'active';
    const message = status === 'paused' ? 'Queue paused.' : 'Queue resumed.';
    return handleUpdateQueue(selectedQueueId, { status }, message);
  }

  function handleBackToQueues() {
    queueDetailsRequestId.current += 1;
    setSelectedQueueId(null);
    setSelectedQueueDetails(null);
    setQueueDetailsStatus('idle');
    setQueueDetailsError('');
    setQueueActionError('');
    setActiveNav('queues');
  }

  function handleNavigate(navItem) {
    queueDetailsRequestId.current += 1;
    setSelectedQueueId(null);
    setSelectedQueueDetails(null);
    setQueueDetailsStatus('idle');
    setQueueDetailsError('');
    setQueueActionError('');
    setActiveNav(navItem);
  }

  async function handleViewDetails(queueId) {
    const requestId = queueDetailsRequestId.current + 1;
    queueDetailsRequestId.current = requestId;
    setSelectedQueueId(queueId);
    setSelectedQueueDetails(null);
    setQueueDetailsStatus('loading');
    setQueueDetailsError('');
    setQueueActionError('');
    setActiveNav('queues');

    try {
      const queue = await fetchQueue(queueId);
      if (queueDetailsRequestId.current !== requestId) return;
      setSelectedQueueDetails(queue);
      setQueues((currentQueues) =>
        currentQueues.map((currentQueue) =>
          currentQueue.id === queue.id ? queue : currentQueue,
        ),
      );
      setQueueDetailsStatus('loaded');
    } catch (error) {
      if (queueDetailsRequestId.current !== requestId) return;
      setQueueDetailsError(
        getQueueErrorMessage(error, 'Unable to load queue details. Please try again.'),
      );
      setQueueDetailsStatus('error');
    }
  }

  return (
    <div className="flex h-dvh min-h-[520px] w-full overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar
        activeNav={activeNav}
        onNavChange={handleNavigate}
        manager={manager}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={activePage.title} manager={manager} />

        <main className="min-h-0 flex-1 overflow-y-auto">
          {selectedQueueId ? (
            queueDetailsStatus === 'loading' ? (
              <div className="flex min-h-full items-center justify-center bg-[#F8FAFC] text-sm text-slate-500" role="status">
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
                Loading queue details…
              </div>
            ) : queueDetailsStatus === 'error' ? (
              <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
                <section className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">Queue details unavailable</h2>
                  <p className="mt-2 text-sm text-red-700" role="alert">{queueDetailsError}</p>
                  <div className="mt-5 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(selectedQueueId)}
                      className="min-h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToQueues}
                      className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back to My Queues
                    </button>
                  </div>
                </section>
              </div>
            ) : selectedQueueDetails ? (
            <QueueDetails
              key={selectedQueueId}
              queue={selectedQueueDetails}
              onBack={handleBackToQueues}
              onRenameQueue={handleRenameQueue}
              onToggleQueue={handleToggleQueue}
              onQueueSummaryChange={handleQueueSummaryChange}
              onNotify={showToast}
              isUpdating={queueUpdating}
              actionError={queueActionError}
            />
            ) : null
          ) : activeNav === 'overview' ? (
            <Dashboard
              queues={queuesWithCounts}
              manager={manager}
              analyticsRefreshKey={analyticsRefreshKey}
              onCreateQueue={handleCreateQueue}
              onViewDetails={handleViewDetails}
              queueLoadStatus={queueLoadStatus}
              queueLoadError={queueLoadError}
              onRetryQueues={handleRetryQueueLoad}
            />
          ) : activeNav === 'queues' ? (
            <MyQueues
              queues={queuesWithCounts}
              onCreateQueue={handleCreateQueue}
              onViewDetails={handleViewDetails}
              queueLoadStatus={queueLoadStatus}
              queueLoadError={queueLoadError}
              onRetryQueues={handleRetryQueueLoad}
            />
          ) : activeNav === 'analytics' ? (
            <Suspense
              fallback={
                <div className="min-h-full bg-[#F8FAFC] px-5 py-6 text-sm text-slate-500 sm:px-7 sm:py-7">
                  Loading analytics…
                </div>
              }
            >
              <Analytics
                analyticsRefreshKey={analyticsRefreshKey}
              />
            </Suspense>
          ) : (
            <div className="min-h-full bg-[#F8FAFC] px-5 py-6 sm:px-7 sm:py-7">
              <div className="mb-6">
                <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
                  {activePage.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">{activePage.description}</p>
              </div>
              <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                This section is coming soon.
              </section>
            </div>
          )}
        </main>
      </div>
      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  );
}
