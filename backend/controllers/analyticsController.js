const mongoose = require('mongoose');
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const {
  createTokenMetricsStages,
  millisecondsToMinutes,
} = require('../utils/tokenMetrics');

function rejectQueryParameters(req, res) {
  if (Object.keys(req.query).length > 0) {
    res.status(400).json({ message: 'This endpoint does not accept query parameters.' });
    return true;
  }
  return false;
}

async function getManagerQueues(managerId) {
  return Queue.find({ manager: managerId })
    .select('_id name queueId status')
    .sort({ createdAt: 1 })
    .lean();
}

function emptyTokenMetrics() {
  return {
    totalTokens: 0,
    waitingCount: 0,
    servingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    averageWaitingTimeMs: null,
    averageServiceDurationMs: null,
  };
}

async function getDashboardAnalytics(req, res) {
  if (rejectQueryParameters(req, res)) return;

  try {
    const queues = await getManagerQueues(req.auth.managerId);
    let tokenMetrics = emptyTokenMetrics();
    if (queues.length > 0) {
      const [metrics] = await Token.aggregate([
        { $match: { queue: { $in: queues.map((queue) => queue._id) } } },
        ...createTokenMetricsStages(null),
      ]);
      if (metrics) tokenMetrics = metrics;
    }

    return res.status(200).json({
      dashboard: {
        totalQueues: queues.length,
        activeQueues: queues.filter((queue) => queue.status === 'active').length,
        pausedQueues: queues.filter((queue) => queue.status === 'paused').length,
        totalPeopleServed: tokenMetrics.completedCount,
        totalWaitingTokens: tokenMetrics.waitingCount,
        currentlyServingTokens: tokenMetrics.servingCount,
        totalCancelledTokens: tokenMetrics.cancelledCount,
        averageWaitingTimeMinutes: millisecondsToMinutes(
          tokenMetrics.averageWaitingTimeMs,
        ),
        averageServiceDurationMinutes: millisecondsToMinutes(
          tokenMetrics.averageServiceDurationMs,
        ),
      },
    });
  } catch (error) {
    console.error(`Dashboard analytics failed: ${error.name}`);
    return res.status(500).json({ message: 'Unable to retrieve dashboard analytics.' });
  }
}

function getUtcDayRange(now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start, end };
}

function getUtcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

async function getQueueTrends(req, res) {
  if (rejectQueryParameters(req, res)) return;

  try {
    const queues = await getManagerQueues(req.auth.managerId);
    const { start, end } = getUtcDayRange();
    const countsByDate = new Map();
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + day);
      countsByDate.set(getUtcDateKey(date), {
        date: getUtcDateKey(date),
        tokensCreated: 0,
        tokensCompleted: 0,
        tokensCancelled: 0,
      });
    }

    if (queues.length > 0) {
      const [activity = {}] = await Token.aggregate([
        { $match: { queue: { $in: queues.map((queue) => queue._id) } } },
        {
          $facet: {
            created: [
              { $match: { createdAt: { $type: 'date', $gte: start, $lt: end } } },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                      timezone: 'UTC',
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
            completed: [
              {
                $match: {
                  status: 'completed',
                  completedAt: { $type: 'date', $gte: start, $lt: end },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$completedAt',
                      timezone: 'UTC',
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
            cancelled: [
              {
                $match: {
                  status: 'cancelled',
                  cancelledAt: { $type: 'date', $gte: start, $lt: end },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$cancelledAt',
                      timezone: 'UTC',
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]);

      for (const [field, eventName] of [
        ['created', 'tokensCreated'],
        ['completed', 'tokensCompleted'],
        ['cancelled', 'tokensCancelled'],
      ]) {
        for (const item of activity[field] ?? []) {
          const date = countsByDate.get(item._id);
          if (date) date[eventName] = item.count;
        }
      }
    }

    return res.status(200).json({ trends: Array.from(countsByDate.values()) });
  } catch (error) {
    console.error(`Queue trend analytics failed: ${error.name}`);
    return res.status(500).json({ message: 'Unable to retrieve queue trends.' });
  }
}

async function getQueuePerformance(req, res) {
  if (rejectQueryParameters(req, res)) return;

  try {
    const queues = await getManagerQueues(req.auth.managerId);
    if (queues.length === 0) {
      return res.status(200).json({ queues: [] });
    }

    const metrics = await Token.aggregate([
      { $match: { queue: { $in: queues.map((queue) => queue._id) } } },
      ...createTokenMetricsStages('$queue'),
    ]);
    const metricsByQueue = new Map(
      metrics.map((item) => [item._id.toString(), item]),
    );

    return res.status(200).json({
      queues: queues.map((queue) => {
        const item = metricsByQueue.get(queue._id.toString()) ?? emptyTokenMetrics();
        return {
          name: queue.name,
          queueId: queue.queueId,
          totalTokens: item.totalTokens,
          waitingCount: item.waitingCount,
          servingCount: item.servingCount,
          completedCount: item.completedCount,
          cancelledCount: item.cancelledCount,
          averageWaitingTimeMinutes: millisecondsToMinutes(
            item.averageWaitingTimeMs,
          ),
          averageServiceDurationMinutes: millisecondsToMinutes(
            item.averageServiceDurationMs,
          ),
        };
      }),
    });
  } catch (error) {
    console.error(`Queue performance analytics failed: ${error.name}`);
    return res.status(500).json({ message: 'Unable to retrieve queue performance.' });
  }
}

async function getRecentActivity(req, res) {
  if (rejectQueryParameters(req, res)) return;

  try {
    const queues = await getManagerQueues(req.auth.managerId);
    if (queues.length === 0) {
      return res.status(200).json({ activities: [] });
    }

    const activities = await Token.aggregate([
      { $match: { queue: { $in: queues.map((queue) => queue._id) } } },
      {
        $facet: {
          added: [
            { $match: { createdAt: { $type: 'date' } } },
            {
              $project: {
                _id: 1,
                queue: 1,
                personName: 1,
                tokenNumber: 1,
                eventType: { $literal: 'person_added' },
                timestamp: '$createdAt',
              },
            },
          ],
          called: [
            { $match: { calledAt: { $type: 'date' } } },
            {
              $project: {
                _id: 1,
                queue: 1,
                personName: 1,
                tokenNumber: 1,
                eventType: { $literal: 'token_called' },
                timestamp: '$calledAt',
              },
            },
          ],
          completed: [
            {
              $match: {
                status: 'completed',
                completedAt: { $type: 'date' },
              },
            },
            {
              $project: {
                _id: 1,
                queue: 1,
                personName: 1,
                tokenNumber: 1,
                eventType: { $literal: 'token_completed' },
                timestamp: '$completedAt',
              },
            },
          ],
          cancelled: [
            {
              $match: {
                status: 'cancelled',
                cancelledAt: { $type: 'date' },
              },
            },
            {
              $project: {
                _id: 1,
                queue: 1,
                personName: 1,
                tokenNumber: 1,
                eventType: { $literal: 'token_cancelled' },
                timestamp: '$cancelledAt',
              },
            },
          ],
        },
      },
      {
        $project: {
          events: {
            $concatArrays: ['$added', '$called', '$completed', '$cancelled'],
          },
        },
      },
      { $unwind: '$events' },
      { $sort: { 'events.timestamp': -1, 'events._id': -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'queues',
          localField: 'events.queue',
          foreignField: '_id',
          as: 'queue',
        },
      },
      { $unwind: '$queue' },
      {
        $project: {
          _id: 0,
          tokenId: '$events._id',
          personName: '$events.personName',
          tokenNumber: '$events.tokenNumber',
          queueName: '$queue.name',
          queueId: '$queue.queueId',
          eventType: '$events.eventType',
          timestamp: '$events.timestamp',
        },
      },
    ]);

    return res.status(200).json({ activities });
  } catch (error) {
    console.error(`Recent activity analytics failed: ${error.name}`);
    return res.status(500).json({ message: 'Unable to retrieve recent activity.' });
  }
}

module.exports = {
  getDashboardAnalytics,
  getQueueTrends,
  getQueuePerformance,
  getRecentActivity,
};
