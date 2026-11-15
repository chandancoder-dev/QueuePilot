import { lazy, Suspense, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import MyQueues from './pages/MyQueues';
import QueueDetails from './pages/QueueDetails';
import Toast from './components/Toast';
import { initialQueueLengthHistory, initialQueues } from './data/mockData';

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
  const [activeNav, setActiveNav] = useState('overview');
  const [queues, setQueues] = useState(initialQueues);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [queueLengthHistory, setQueueLengthHistory] = useState(initialQueueLengthHistory);
  const [servedEvents, setServedEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const selectedQueue = queues.find((queue) => queue.id === selectedQueueId);
  const activePage = selectedQueue
    ? { title: selectedQueue.name }
    : pages[activeNav] ?? pages.overview;
  const queuesWithCounts = queues.map((queue) => ({
    ...queue,
    waiting: queue.tokens.filter((token) => token.status === 'Waiting').length,
  }));
  const waitingTokens = queues.flatMap((queue) =>
    queue.tokens.filter((token) => token.status === 'Waiting'),
  );
  const statistics = {
    'total-queues': queues.length,
    'people-waiting': waitingTokens.length,
    'currently-serving': queues.filter(
      (queue) => queue.status === 'Active' && queue.servingToken !== '—',
    ).length,
    'avg-wait-time': waitingTokens.length
      ? Math.round(
          waitingTokens.reduce((total, token) => total + token.waitingMinutes, 0) /
            waitingTokens.length,
        )
      : 0,
  };

  function showToast(message) {
    setToast({ message });
  }

  function recordQueueLength(waiting) {
    const timestamp = new Date().toISOString();
    setQueueLengthHistory((history) => [
      ...history,
      { timestamp, waiting },
    ]);
  }

  function handleCreateQueue(name) {
    setQueues((currentQueues) => {
      const lastQueueNumber = currentQueues.reduce((largest, queue) => {
        const match = queue.id.match(/^QP-(\d+)$/);
        return match ? Math.max(largest, Number(match[1])) : largest;
      }, 100);
      const number = lastQueueNumber + 1;
      const id = `QP-${number}`;
      const newQueue = {
        id,
        name,
        tokenPrefix: `Q${number - 100}`,
        nextTokenNumber: 1,
        tokens: [],
        servingToken: '—',
        completedCount: 0,
        status: 'Active',
      };
      return [newQueue, ...currentQueues];
    });
    showToast(`Queue "${name}" created successfully.`);
  }

  function updateQueue(queueId, update) {
    setQueues((currentQueues) =>
      currentQueues.map((queue) => (queue.id === queueId ? update(queue) : queue)),
    );
  }

  function handleAddPerson(queueId, name, phone) {
    const queue = queues.find((item) => item.id === queueId);
    if (!queue) return;
    const tokenNumber = `${queue.tokenPrefix}-${queue.nextTokenNumber}`;
    const timestamp = new Date().toISOString();
    updateQueue(queueId, (queue) => {
      return {
        ...queue,
        nextTokenNumber: queue.nextTokenNumber + 1,
        tokens: [
          ...queue.tokens,
          {
            id: `${queue.id}-${queue.nextTokenNumber}`,
            tokenNumber,
            personName: name,
            phone,
            status: 'Waiting',
            waitingMinutes: 0,
            createdAt: timestamp,
          },
        ],
      };
    });
    recordQueueLength(waitingTokens.length + 1);
    showToast(`Token ${tokenNumber} added to the queue.`);
  }

  function handleMoveToken(queueId, tokenId, direction) {
    updateQueue(queueId, (queue) => {
      const waitingIndexes = queue.tokens.reduce((indexes, token, index) => {
        if (token.status === 'Waiting') indexes.push(index);
        return indexes;
      }, []);
      const waitingPosition = waitingIndexes.findIndex(
        (index) => queue.tokens[index].id === tokenId,
      );
      const targetPosition = waitingPosition + direction;
      if (waitingPosition < 0 || targetPosition < 0 || targetPosition >= waitingIndexes.length) {
        return queue;
      }
      const tokens = [...queue.tokens];
      const currentIndex = waitingIndexes[waitingPosition];
      const targetIndex = waitingIndexes[targetPosition];
      [tokens[currentIndex], tokens[targetIndex]] = [tokens[targetIndex], tokens[currentIndex]];
      return { ...queue, tokens };
    });
  }

  function handleCallNext(queueId) {
    const queue = queues.find((item) => item.id === queueId);
    if (!queue || queue.status !== 'Active' || queue.servingToken !== '—') return;
    const nextToken = queue.tokens.find((token) => token.status === 'Waiting');
    if (!nextToken) return;
    updateQueue(queueId, (currentQueue) => ({
      ...currentQueue,
      servingToken: nextToken.tokenNumber,
      tokens: currentQueue.tokens.map((token) =>
        token.id === nextToken.id ? { ...token, status: 'Serving' } : token,
      ),
    }));
    recordQueueLength(waitingTokens.length - 1);
    showToast(`Token ${nextToken.tokenNumber} called for service.`);
  }

  function handleComplete(queueId) {
    const queue = queues.find((item) => item.id === queueId);
    if (!queue || queue.servingToken === '—') return;
    const completedToken = queue.servingToken;
    const timestamp = new Date().toISOString();
    updateQueue(queueId, (currentQueue) => ({
      ...currentQueue,
      servingToken: '—',
      completedCount: currentQueue.completedCount + 1,
      tokens: currentQueue.tokens.map((token) =>
        token.tokenNumber === completedToken
          ? { ...token, status: 'Completed', completedAt: timestamp }
          : token,
      ),
    }));
    setServedEvents((events) => [
      ...events,
      {
        timestamp,
        queueId,
        queueName: queue.name,
        tokenNumber: completedToken,
      },
    ]);
    showToast(`Token ${completedToken} marked as completed.`);
  }

  function handleCancelToken(queueId, tokenId) {
    const queue = queues.find((item) => item.id === queueId);
    const token = queue?.tokens.find((item) => item.id === tokenId);
    if (!token || token.status !== 'Waiting') return;
    const timestamp = new Date().toISOString();
    updateQueue(queueId, (queue) => ({
      ...queue,
      tokens: queue.tokens.map((token) =>
        token.id === tokenId && token.status === 'Waiting'
          ? { ...token, status: 'Cancelled', cancelledAt: timestamp }
          : token,
      ),
    }));
    recordQueueLength(waitingTokens.length - 1);
    showToast('Token cancelled.');
  }

  function handleToggleQueue(queueId) {
    updateQueue(queueId, (queue) => ({
      ...queue,
      status: queue.status === 'Active' ? 'Paused' : 'Active',
    }));
    const queue = queues.find((item) => item.id === queueId);
    showToast(`Queue ${queue?.status === 'Active' ? 'paused' : 'resumed'}.`);
  }

  function handleBackToQueues() {
    setSelectedQueueId(null);
    setActiveNav('queues');
  }

  function handleNavigate(navItem) {
    setSelectedQueueId(null);
    setActiveNav(navItem);
  }

  function handleViewDetails(queueId) {
    setSelectedQueueId(queueId);
    setActiveNav('queues');
  }

  return (
    <div className="flex h-dvh min-h-[520px] w-full overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar activeNav={activeNav} onNavChange={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={activePage.title} />

        <main className="min-h-0 flex-1 overflow-y-auto">
          {selectedQueue ? (
            <QueueDetails
              queue={selectedQueue}
              onBack={handleBackToQueues}
              onToggleQueue={() => handleToggleQueue(selectedQueue.id)}
              onAddPerson={(name, phone) => handleAddPerson(selectedQueue.id, name, phone)}
              onMoveToken={(tokenId, direction) =>
                handleMoveToken(selectedQueue.id, tokenId, direction)
              }
              onCallNext={() => handleCallNext(selectedQueue.id)}
              onComplete={() => handleComplete(selectedQueue.id)}
              onCancelToken={(tokenId) => handleCancelToken(selectedQueue.id, tokenId)}
            />
          ) : activeNav === 'overview' ? (
            <Dashboard
              queues={queuesWithCounts}
              statistics={statistics}
              onCreateQueue={handleCreateQueue}
              onViewDetails={handleViewDetails}
            />
          ) : activeNav === 'queues' ? (
            <MyQueues
              queues={queuesWithCounts}
              onCreateQueue={handleCreateQueue}
              onViewDetails={handleViewDetails}
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
                queues={queues}
                queueLengthHistory={queueLengthHistory}
                servedEvents={servedEvents}
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
