import api from './api';

const queueCountFields = [
  'waitingCount',
  'servingCount',
  'completedCount',
  'cancelledCount',
];

export function normalizeQueue(queue) {
  if (
    !queue ||
    typeof queue.id !== 'string' ||
    typeof queue.name !== 'string' ||
    typeof queue.queueId !== 'string' ||
    !['active', 'paused'].includes(queue.status) ||
    !Number.isInteger(queue.nextTokenNumber) ||
    queueCountFields.some(
      (field) => !Number.isInteger(queue[field]) || queue[field] < 0,
    )
  ) {
    throw new Error('The server returned invalid queue data.');
  }

  return {
    id: queue.id,
    queueId: queue.queueId,
    name: queue.name,
    status: queue.status === 'active' ? 'Active' : 'Paused',
    nextTokenNumber: queue.nextTokenNumber,
    waitingCount: queue.waitingCount,
    servingCount: queue.servingCount,
    completedCount: queue.completedCount,
    cancelledCount: queue.cancelledCount,
    tokens: [],
  };
}

export async function fetchQueues(signal) {
  const { data } = await api.get('/api/queues', { signal });
  if (!Array.isArray(data?.queues)) {
    throw new Error('The server returned an invalid queue list.');
  }
  return data.queues.map(normalizeQueue);
}

export async function fetchQueue(queueId) {
  const { data } = await api.get(`/api/queues/${encodeURIComponent(queueId)}`);
  return normalizeQueue(data?.queue);
}

export async function createQueue(name) {
  const { data } = await api.post('/api/queues', { name });
  return normalizeQueue(data?.queue);
}

export async function updateQueue(queueId, updates) {
  const { data } = await api.patch(
    `/api/queues/${encodeURIComponent(queueId)}`,
    updates,
  );
  return normalizeQueue(data?.queue);
}

export function getQueueErrorMessage(error, fallback) {
  const message = error.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}
