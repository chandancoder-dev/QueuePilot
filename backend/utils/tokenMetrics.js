function createTokenMetricsStages(groupBy = '$queue') {
  return [
    {
      $addFields: {
        __analyticsCreatedAt: {
          $convert: { input: '$createdAt', to: 'date', onError: null, onNull: null },
        },
        __analyticsCalledAt: {
          $convert: { input: '$calledAt', to: 'date', onError: null, onNull: null },
        },
        __analyticsCompletedAt: {
          $convert: { input: '$completedAt', to: 'date', onError: null, onNull: null },
        },
      },
    },
    {
      $addFields: {
        __analyticsWaitingTimeMs: {
          $cond: [
            {
              $and: [
                { $ne: ['$__analyticsCreatedAt', null] },
                { $ne: ['$__analyticsCalledAt', null] },
              ],
            },
            {
              $let: {
                vars: {
                  duration: {
                    $subtract: ['$__analyticsCalledAt', '$__analyticsCreatedAt'],
                  },
                },
                in: {
                  $cond: [{ $gte: ['$$duration', 0] }, '$$duration', null],
                },
              },
            },
            null,
          ],
        },
        __analyticsServiceDurationMs: {
          $cond: [
            {
              $and: [
                { $eq: ['$status', 'completed'] },
                { $ne: ['$__analyticsCalledAt', null] },
                { $ne: ['$__analyticsCompletedAt', null] },
              ],
            },
            {
              $let: {
                vars: {
                  duration: {
                    $subtract: ['$__analyticsCompletedAt', '$__analyticsCalledAt'],
                  },
                },
                in: {
                  $cond: [{ $gte: ['$$duration', 0] }, '$$duration', null],
                },
              },
            },
            null,
          ],
        },
      },
    },
    {
      $group: {
        _id: groupBy,
        totalTokens: { $sum: 1 },
        waitingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] },
        },
        servingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'serving'] }, 1, 0] },
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        averageWaitingTimeMs: { $avg: '$__analyticsWaitingTimeMs' },
        averageServiceDurationMs: { $avg: '$__analyticsServiceDurationMs' },
      },
    },
  ];
}

function millisecondsToMinutes(milliseconds) {
  if (
    typeof milliseconds !== 'number' ||
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return null;
  }
  return Math.round((milliseconds / 60000) * 100) / 100;
}

module.exports = {
  createTokenMetricsStages,
  millisecondsToMinutes,
};
