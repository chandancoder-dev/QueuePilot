import api from './api';

const TOKEN_STATUSES = new Set(['waiting', 'serving', 'completed', 'cancelled']);
const SUMMARY_COUNTS = [
  'totalTokens',
  'waitingCount',
  'currentlyServingCount',
  'completedCount',
  'cancelledCount',
];
const SUMMARY_DURATIONS = [
  'averageWaitingTimeMinutes',
  'averageServiceDurationMinutes',
];

function normalizeToken(token) {
  if (
    !token ||
    typeof token.id !== 'string' ||
    !Number.isInteger(token.tokenNumber) ||
    token.tokenNumber < 1 ||
    typeof token.personName !== 'string' ||
    !TOKEN_STATUSES.has(token.status) ||
    !Number.isInteger(token.position) ||
    token.position < 0
  ) {
    throw new Error('The server returned invalid token data.');
  }

  return token;
}

function normalizeTokensResponse(data) {
  if (!Array.isArray(data?.tokens)) {
    throw new Error('The server returned an invalid token list.');
  }
  return data.tokens.map(normalizeToken);
}

function normalizeSummary(data) {
  const summary = data?.summary;
  if (
    !summary ||
    SUMMARY_COUNTS.some(
      (field) => !Number.isInteger(summary[field]) || summary[field] < 0,
    ) ||
    SUMMARY_DURATIONS.some(
      (field) =>
        summary[field] !== null &&
        (!Number.isFinite(summary[field]) || summary[field] < 0),
    )
  ) {
    throw new Error('The server returned invalid queue summary data.');
  }
  return summary;
}

export async function fetchQueueTokens(queueId, signal) {
  const { data } = await api.get(
    `/api/queues/${encodeURIComponent(queueId)}/tokens`,
    { signal },
  );
  return normalizeTokensResponse(data);
}

export async function fetchQueueSummary(queueId, signal) {
  const { data } = await api.get(
    `/api/queues/${encodeURIComponent(queueId)}/summary`,
    { signal },
  );
  return normalizeSummary(data);
}

export async function addPersonToQueue(queueId, person) {
  const { data } = await api.post(
    `/api/queues/${encodeURIComponent(queueId)}/tokens`,
    person,
  );
  return normalizeToken(data?.token);
}

export async function reorderQueueTokens(queueId, tokenIds) {
  const { data } = await api.patch(
    `/api/queues/${encodeURIComponent(queueId)}/tokens/reorder`,
    { tokenIds },
  );
  return normalizeTokensResponse(data);
}

export async function callNextToken(queueId) {
  const { data } = await api.post(
    `/api/queues/${encodeURIComponent(queueId)}/tokens/call-next`,
  );
  return normalizeToken(data?.token);
}

export async function completeQueueToken(queueId, tokenId) {
  const { data } = await api.patch(
    `/api/queues/${encodeURIComponent(queueId)}/tokens/${encodeURIComponent(tokenId)}/complete`,
  );
  return normalizeToken(data?.token);
}

export async function cancelQueueToken(queueId, tokenId) {
  const { data } = await api.patch(
    `/api/queues/${encodeURIComponent(queueId)}/tokens/${encodeURIComponent(tokenId)}/cancel`,
  );
  return normalizeToken(data?.token);
}

export function getTokenErrorMessage(error, fallback) {
  const message = error.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}
