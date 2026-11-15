const mongoose = require('mongoose');
const Queue = require('../models/Queue');
const Token = require('../models/Token');

const queueFields = 'name queueId status nextTokenNumber createdAt updatedAt';

function isRequestObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toQueueResponse(queue, counts = {}) {
  return {
    id: queue._id.toString(),
    name: queue.name,
    queueId: queue.queueId,
    status: queue.status,
    nextTokenNumber: queue.nextTokenNumber,
    createdAt: queue.createdAt,
    updatedAt: queue.updatedAt,
    waitingCount: counts.waitingCount ?? 0,
    servingCount: counts.servingCount ?? 0,
    completedCount: counts.completedCount ?? 0,
    cancelledCount: counts.cancelledCount ?? 0,
  };
}

async function getTokenCounts(queueIds) {
  if (queueIds.length === 0) return new Map();

  const counts = await Token.aggregate([
    { $match: { queue: { $in: queueIds } } },
    {
      $group: {
        _id: '$queue',
        waitingCount: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
        servingCount: { $sum: { $cond: [{ $eq: ['$status', 'serving'] }, 1, 0] } },
        completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
  ]);
  return new Map(counts.map((count) => [count._id.toString(), count]));
}

async function findNextQueueNumber() {
  const queueIds = await Queue.distinct('queueId');
  const highestNumber = queueIds.reduce((highest, queueId) => {
    const match = /^QP-(\d+)$/.exec(queueId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 100);
  return highestNumber + 1;
}

async function createWithUniqueQueueId(name, managerId) {
  const firstNumber = await findNextQueueNumber();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Queue.create({
        name,
        queueId: `QP-${firstNumber + attempt}`,
        manager: managerId,
        status: 'active',
        nextTokenNumber: 1,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  return null;
}

function handleControllerError(context, error, res) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid queue data.' });
  }
  console.error(`${context}: ${error.name}`);
  return res.status(500).json({ message: 'Unable to process queue request.' });
}

async function createQueue(req, res) {
  const body = req.body;
  if (
    !isRequestObject(body) ||
    Object.keys(body).some((key) => key !== 'name') ||
    typeof body.name !== 'string' ||
    !body.name.trim()
  ) {
    return res.status(400).json({ message: 'A queue name is required.' });
  }

  try {
    const queue = await createWithUniqueQueueId(body.name.trim(), req.auth.managerId);
    if (!queue) {
      return res.status(409).json({ message: 'Unable to allocate a unique queue ID. Please try again.' });
    }
    return res.status(201).json({ queue: toQueueResponse(queue) });
  } catch (error) {
    return handleControllerError('Queue creation failed', error, res);
  }
}

async function getQueues(req, res) {
  try {
    const queues = await Queue.find({ manager: req.auth.managerId })
      .select(queueFields)
      .sort({ createdAt: -1 })
      .lean();
    const counts = await getTokenCounts(queues.map((queue) => queue._id));
    return res.status(200).json({
      queues: queues.map((queue) =>
        toQueueResponse(queue, counts.get(queue._id.toString())),
      ),
    });
  } catch (error) {
    return handleControllerError('Queue list failed', error, res);
  }
}

async function getQueue(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid queue ID.' });
  }

  try {
    const queue = await Queue.findOne({
      _id: req.params.id,
      manager: req.auth.managerId,
    }).select(queueFields).lean();
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found.' });
    }

    const counts = await getTokenCounts([queue._id]);
    return res.status(200).json({
      queue: toQueueResponse(queue, counts.get(queue._id.toString())),
    });
  } catch (error) {
    return handleControllerError('Queue lookup failed', error, res);
  }
}

async function updateQueue(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid queue ID.' });
  }

  const body = req.body;
  const allowedFields = new Set(['name', 'status']);
  if (
    !isRequestObject(body) ||
    Object.keys(body).length === 0 ||
    Object.keys(body).some((key) => !allowedFields.has(key))
  ) {
    return res.status(400).json({ message: 'Provide a queue name or status to update.' });
  }

  const updates = {};
  if (Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({ message: 'Queue name must be a non-empty string.' });
    }
    updates.name = body.name.trim();
  }
  if (Object.hasOwn(body, 'status')) {
    if (!['active', 'paused'].includes(body.status)) {
      return res.status(400).json({ message: 'Status must be active or paused.' });
    }
    updates.status = body.status;
  }

  try {
    const queue = await Queue.findOneAndUpdate(
      { _id: req.params.id, manager: req.auth.managerId },
      { $set: updates },
      { new: true, runValidators: true },
    ).select(queueFields).lean();
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found.' });
    }

    const counts = await getTokenCounts([queue._id]);
    return res.status(200).json({
      queue: toQueueResponse(queue, counts.get(queue._id.toString())),
    });
  } catch (error) {
    return handleControllerError('Queue update failed', error, res);
  }
}

module.exports = {
  createQueue,
  getQueues,
  getQueue,
  updateQueue,
};
