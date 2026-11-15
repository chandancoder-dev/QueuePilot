import api from './api';

const dashboardCountFields = [
  'totalQueues',
  'activeQueues',
  'pausedQueues',
  'totalPeopleServed',
  'totalWaitingTokens',
  'currentlyServingTokens',
  'totalCancelledTokens',
];
const activityTypes = new Set([
  'person_added',
  'token_called',
  'token_completed',
  'token_cancelled',
]);
const activityUiTypes = {
  person_added: 'token_added',
  token_called: 'token_called',
  token_completed: 'token_completed',
  token_cancelled: 'token_cancelled',
};
const activityDescriptions = {
  person_added: (activity) =>
    `${activity.personName} added as token #${activity.tokenNumber} to`,
  token_called: (activity) =>
    `Token #${activity.tokenNumber} for ${activity.personName} called for service at`,
  token_completed: (activity) =>
    `Token #${activity.tokenNumber} for ${activity.personName} completed at`,
  token_cancelled: (activity) =>
    `Token #${activity.tokenNumber} for ${activity.personName} cancelled at`,
};
const performanceCountFields = [
  'totalTokens',
  'waitingCount',
  'servingCount',
  'completedCount',
  'cancelledCount',
];
const durationFields = [
  'averageWaitingTimeMinutes',
  'averageServiceDurationMinutes',
];

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isValidDuration(value) {
  return value === null || (Number.isFinite(value) && value >= 0);
}

function normalizeDashboard(data) {
  const dashboard = data?.dashboard;
  if (
    !dashboard ||
    dashboardCountFields.some((field) => !isNonNegativeInteger(dashboard[field])) ||
    durationFields.some((field) => !isValidDuration(dashboard[field]))
  ) {
    throw new Error('The server returned invalid dashboard analytics.');
  }
  return dashboard;
}

function normalizeTrends(data) {
  if (
    !Array.isArray(data?.trends) ||
    data.trends.length !== 7 ||
    data.trends.some((day) =>
      !day ||
      typeof day.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      ['tokensCreated', 'tokensCompleted', 'tokensCancelled'].some(
        (field) => !isNonNegativeInteger(day[field]),
      ),
    )
  ) {
    throw new Error('The server returned invalid queue trend data.');
  }
  return [...data.trends].sort((left, right) => left.date.localeCompare(right.date));
}

function normalizePerformance(data) {
  if (!Array.isArray(data?.queues)) {
    throw new Error('The server returned invalid queue performance data.');
  }
  return data.queues.map((queue) => {
    if (
      !queue ||
      typeof queue.name !== 'string' ||
      typeof queue.queueId !== 'string' ||
      performanceCountFields.some((field) => !isNonNegativeInteger(queue[field])) ||
      durationFields.some((field) => !isValidDuration(queue[field]))
    ) {
      throw new Error('The server returned invalid queue performance data.');
    }
    return queue;
  });
}

function normalizeActivity(activity) {
  if (
    !activity ||
    typeof activity.tokenId !== 'string' ||
    !activityTypes.has(activity.eventType) ||
    typeof activity.queueName !== 'string' ||
    typeof activity.queueId !== 'string' ||
    typeof activity.personName !== 'string' ||
    !Number.isInteger(activity.tokenNumber) ||
    activity.tokenNumber < 1 ||
    typeof activity.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(activity.timestamp))
  ) {
    throw new Error('The server returned invalid recent activity data.');
  }

  return {
    id: `${activity.tokenId}:${activity.eventType}`,
    type: activityUiTypes[activity.eventType],
    description: activityDescriptions[activity.eventType](activity),
    queue: activity.queueName,
    timestamp: activity.timestamp,
  };
}

function normalizeRecentActivity(data) {
  if (!Array.isArray(data?.activities)) {
    throw new Error('The server returned invalid recent activity data.');
  }
  return data.activities
    .map(normalizeActivity)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 10);
}

export async function fetchDashboardAnalytics(signal) {
  const { data } = await api.get('/api/analytics/dashboard', { signal });
  return normalizeDashboard(data);
}

export async function fetchQueueTrends(signal) {
  const { data } = await api.get('/api/analytics/queue-trends', { signal });
  return normalizeTrends(data);
}

export async function fetchQueuePerformance(signal) {
  const { data } = await api.get('/api/analytics/queue-performance', { signal });
  return normalizePerformance(data);
}

export async function fetchRecentActivity(signal) {
  const { data } = await api.get('/api/analytics/recent-activity', { signal });
  return normalizeRecentActivity(data);
}

export function getAnalyticsErrorMessage(error, fallback) {
  const message = error.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}
