// Local mock data for the UI. Keep this module as the source for sample queues
// until the app is connected to an API.

export const stats = [
  { id: 'total-queues',      label: 'Total Queues',      value: '4',     unit: null },
  { id: 'people-waiting',    label: 'People Waiting',    value: '18',    unit: null },
  { id: 'currently-serving', label: 'Currently Serving', value: '3',     unit: null },
  { id: 'avg-wait-time',     label: 'Average Wait Time', value: '12',    unit: 'min' },
];

const samplePeople = [
  'Avery Johnson',
  'Jordan Lee',
  'Morgan Patel',
  'Taylor Kim',
  'Casey Rivera',
  'Riley Chen',
  'Jamie Brooks',
  'Alex Morgan',
];

function createWaitingTokens(prefix, firstNumber, count, offset) {
  return Array.from({ length: count }, (_, index) => {
    const waitingMinutes = 4 + ((index * 7 + offset) % 25);
    return {
      id: `${prefix}-${firstNumber + index}`,
      tokenNumber: `${prefix}-${firstNumber + index}`,
      personName: samplePeople[(index + offset) % samplePeople.length],
      phone: '',
      status: 'Waiting',
      waitingMinutes,
      createdAt: new Date(Date.now() - waitingMinutes * 60_000).toISOString(),
    };
  });
}

function createServingToken(prefix, number, personName) {
  return {
    id: `${prefix}-${number}`,
    tokenNumber: `${prefix}-${number}`,
    personName,
    phone: '',
    status: 'Serving',
    createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  };
}

export const initialQueues = [
  {
    id: 'QP-101',
    name: 'General Consultation',
    tokenPrefix: 'A',
    nextTokenNumber: 113,
    tokens: [createServingToken('A', 104, 'Sam Wilson'), ...createWaitingTokens('A', 105, 8, 0)],
    servingToken: 'A-104',
    completedCount: 12,
    status: 'Active',
  },
  {
    id: 'QP-102',
    name: 'Customer Support',
    tokenPrefix: 'B',
    nextTokenNumber: 209,
    tokens: [createServingToken('B', 203, 'Drew Parker'), ...createWaitingTokens('B', 204, 5, 1)],
    servingToken: 'B-203',
    completedCount: 8,
    status: 'Active',
  },
  {
    id: 'QP-103',
    name: 'Billing Desk',
    tokenPrefix: 'C',
    nextTokenNumber: 112,
    tokens: [createServingToken('C', 108, 'Robin Davis'), ...createWaitingTokens('C', 109, 3, 2)],
    servingToken: 'C-108',
    completedCount: 5,
    status: 'Active',
  },
  {
    id: 'QP-104',
    name: 'Document Verification',
    tokenPrefix: 'D',
    nextTokenNumber: 304,
    tokens: [createServingToken('D', 301, 'Skyler Reed'), ...createWaitingTokens('D', 302, 2, 3)],
    servingToken: 'D-301',
    completedCount: 2,
    status: 'Paused',
  },
];

export const initialQueueLengthHistory = [
  {
    timestamp: new Date().toISOString(),
    waiting: initialQueues.reduce(
      (total, queue) => total + queue.tokens.filter((token) => token.status === 'Waiting').length,
      0,
    ),
  },
];

export const recentActivity = [
  {
    id: 'act-1',
    type: 'token_added',
    description: 'New token added to',
    queue: 'General Consultation',
    timestamp: '2 min ago',
  },
  {
    id: 'act-2',
    type: 'token_called',
    description: 'Token A-103 called for service',
    queue: 'General Consultation',
    timestamp: '5 min ago',
  },
  {
    id: 'act-3',
    type: 'token_completed',
    description: 'Token B-201 marked completed',
    queue: 'Customer Support',
    timestamp: '11 min ago',
  },
  {
    id: 'act-4',
    type: 'token_cancelled',
    description: 'Token C-107 cancelled',
    queue: 'Billing Desk',
    timestamp: '18 min ago',
  },
];
