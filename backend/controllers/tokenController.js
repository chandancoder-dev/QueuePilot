const crypto = require('crypto');
const mongoose = require('mongoose');
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const {
  createTokenMetricsStages,
  millisecondsToMinutes,
} = require('../utils/tokenMetrics');

const TOKEN_FIELDS =
  'tokenNumber personName phone status position createdAt updatedAt calledAt completedAt cancelledAt';
const LOCK_LEASE_MS = 60 * 1000;
const LOCK_RENEW_INTERVAL_MS = 15 * 1000;
const LOCK_WAIT_MS = 5000;

function isRequestObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toTokenResponse(token) {
  return {
    id: token._id.toString(),
    tokenNumber: token.tokenNumber,
    personName: token.personName,
    phone: token.phone,
    status: token.status,
    position: token.position,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
    calledAt: token.calledAt,
    completedAt: token.completedAt,
    cancelledAt: token.cancelledAt,
  };
}

async function acquireQueueLock(queueId) {
  const collection = mongoose.connection.db.collection('queue_token_locks');
  const lockId = crypto.randomUUID();
  const now = new Date();

  try {
    await collection.findOneAndUpdate(
      {
        _id: queueId,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          lockId,
          expiresAt: new Date(now.getTime() + LOCK_LEASE_MS),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }

  const ownedLock = await collection.findOne({ _id: queueId, lockId });
  if (!ownedLock) return null;

  const lock = {
    queueId,
    lockId,
    lostError: null,
    timer: null,
    async assertHeld() {
      if (this.lostError) throw this.lostError;
      const currentLock = await collection.findOne({ _id: queueId, lockId });
      if (!currentLock) throw new Error('Queue operation lock was lost.');
    },
    async release() {
      if (this.timer) clearInterval(this.timer);
      try {
        await collection.deleteOne({ _id: queueId, lockId });
      } catch (error) {
        console.error(`Queue lock release failed: ${error.name}`);
      }
    },
  };

  lock.timer = setInterval(async () => {
    if (lock.lostError) return;
    try {
      const result = await collection.updateOne(
        { _id: queueId, lockId },
        { $set: { expiresAt: new Date(Date.now() + LOCK_LEASE_MS) } },
      );
      if (result.matchedCount !== 1) {
        lock.lostError = new Error('Queue operation lock was lost.');
      }
    } catch (error) {
      lock.lostError = error;
    }
  }, LOCK_RENEW_INTERVAL_MS);
  if (typeof lock.timer.unref === 'function') lock.timer.unref();

  return lock;
}

async function acquireQueueLockWithWait(queueId) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const lock = await acquireQueueLock(queueId);
    if (lock) return lock;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

async function withOwnedQueueLock(req, res, context, action) {
  const { queueId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(queueId)) {
    return res.status(400).json({ message: 'Invalid queue ID.' });
  }

  let lock;
  try {
    const queue = await Queue.findOne({
      _id: queueId,
      manager: req.auth.managerId,
    }).select('_id status').lean();
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found.' });
    }

    lock = await acquireQueueLockWithWait(queue._id.toString());
    if (!lock) {
      return res.status(409).json({ message: 'This queue is being updated. Please retry shortly.' });
    }

    return await action(queue, lock);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid token data.' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A conflicting token operation occurred. Please retry.' });
    }
    console.error(`${context}: ${error.name}`);
    return res.status(500).json({ message: 'Unable to process token request.' });
  } finally {
    if (lock) await lock.release();
  }
}

function validatePerson(body) {
  if (
    !isRequestObject(body) ||
    Object.keys(body).some((key) => key !== 'personName' && key !== 'phone') ||
    typeof body.personName !== 'string' ||
    !body.personName.trim() ||
    body.personName.trim().length > 100
  ) {
    return { error: 'A person name of 1 to 100 characters is required.' };
  }

  let phone;
  if (body.phone !== undefined && body.phone !== null) {
    if (typeof body.phone !== 'string') {
      return { error: 'Phone number must be a string.' };
    }
    phone = body.phone.trim();
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (
        phone.length > 20 ||
        !/^[+0-9\s().-]+$/.test(phone) ||
        digits.length < 7 ||
        digits.length > 15
      ) {
        return { error: 'Phone number must contain 7 to 15 digits.' };
      }
    } else {
      phone = undefined;
    }
  }

  return { personName: body.personName.trim(), phone };
}

async function addPerson(req, res) {
  const person = validatePerson(req.body);
  if (person.error) {
    return res.status(400).json({ message: person.error });
  }

  return withOwnedQueueLock(req, res, 'Token creation failed', async (queue, lock) => {
    if (queue.status !== 'active') {
      return res.status(409).json({ message: 'Cannot add people to a paused queue.' });
    }

    await lock.assertHeld();
    const updatedQueue = await Queue.findOneAndUpdate(
      {
        _id: queue._id,
        manager: req.auth.managerId,
        status: 'active',
      },
      { $inc: { nextTokenNumber: 1 } },
      { new: true },
    ).select('nextTokenNumber').lean();
    if (!updatedQueue) {
      return res.status(409).json({ message: 'Cannot add people to a paused queue.' });
    }

    const tokenNumber = updatedQueue.nextTokenNumber - 1;
    try {
      const lastWaitingToken = await Token.findOne({
        queue: queue._id,
        status: 'waiting',
      }).sort({ position: -1, createdAt: -1 }).select('position').lean();
      const position = lastWaitingToken ? lastWaitingToken.position + 1 : 0;
      const tokenData = {
        queue: queue._id,
        tokenNumber,
        personName: person.personName,
        status: 'waiting',
        position,
      };
      if (person.phone) tokenData.phone = person.phone;
      const token = await Token.create(tokenData);
      return res.status(201).json({ token: toTokenResponse(token) });
    } catch (error) {
      try {
        await Queue.updateOne(
          {
            _id: queue._id,
            manager: req.auth.managerId,
            nextTokenNumber: tokenNumber + 1,
          },
          { $inc: { nextTokenNumber: -1 } },
        );
      } catch (rollbackError) {
        console.error(`Token counter rollback failed: ${rollbackError.name}`);
      }
      throw error;
    }
  });
}

async function getQueueTokens(req, res) {
  return withOwnedQueueLock(req, res, 'Token list failed', async (queue) => {
    const tokens = await Token.find({ queue: queue._id })
      .select(TOKEN_FIELDS)
      .lean();
    const statusOrder = { serving: 0, waiting: 1, completed: 2, cancelled: 3 };
    tokens.sort((left, right) => {
      const statusDifference = statusOrder[left.status] - statusOrder[right.status];
      if (statusDifference !== 0) return statusDifference;
      if (left.status === 'waiting') return left.position - right.position;
      return right.tokenNumber - left.tokenNumber;
    });
    return res.status(200).json({ tokens: tokens.map(toTokenResponse) });
  });
}

async function reorderWaitingTokens(req, res) {
  const body = req.body;
  if (
    !isRequestObject(body) ||
    Object.keys(body).length !== 1 ||
    !Array.isArray(body.tokenIds) ||
    body.tokenIds.some((id) => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))
  ) {
    return res.status(400).json({ message: 'Provide tokenIds as an ordered array of token IDs.' });
  }
  if (new Set(body.tokenIds).size !== body.tokenIds.length) {
    return res.status(400).json({ message: 'Duplicate token IDs are not allowed.' });
  }

  return withOwnedQueueLock(req, res, 'Token reorder failed', async (queue, lock) => {
    const requestedIds = body.tokenIds.map((id) => new mongoose.Types.ObjectId(id));
    const requestedTokens = requestedIds.length
      ? await Token.find({ _id: { $in: requestedIds }, queue: queue._id })
        .select('_id status position')
        .lean()
      : [];
    if (requestedTokens.length !== requestedIds.length) {
      return res.status(400).json({ message: 'Every token ID must belong to this queue.' });
    }
    if (requestedTokens.some((token) => token.status !== 'waiting')) {
      return res.status(409).json({ message: 'Only waiting tokens can be reordered.' });
    }

    const waitingTokens = await Token.find({ queue: queue._id, status: 'waiting' })
      .select('_id position')
      .lean();
    if (waitingTokens.length !== requestedIds.length) {
      return res.status(400).json({ message: 'The order must include every waiting token.' });
    }

    const waitingIds = new Set(waitingTokens.map((token) => token._id.toString()));
    if (requestedIds.some((id) => !waitingIds.has(id.toString()))) {
      return res.status(400).json({ message: 'The order must include every waiting token.' });
    }

    const previousPositions = new Map(
      waitingTokens.map((token) => [token._id.toString(), token.position]),
    );
    const operations = requestedIds.map((id, position) => ({
      updateOne: {
        filter: { _id: id, queue: queue._id, status: 'waiting' },
        update: { $set: { position } },
      },
    }));

    if (operations.length > 0) {
      await lock.assertHeld();
      try {
        const result = await Token.bulkWrite(operations, { ordered: true });
        if (result.matchedCount !== requestedIds.length) {
          throw new Error('Not all waiting tokens were reordered.');
        }
      } catch (error) {
        try {
          await Token.bulkWrite(
            Array.from(previousPositions, ([id, position]) => ({
              updateOne: {
                filter: { _id: id, queue: queue._id },
                update: { $set: { position } },
              },
            })),
            { ordered: true },
          );
        } catch (rollbackError) {
          console.error(`Token reorder rollback failed: ${rollbackError.name}`);
        }
        throw error;
      }
    }

    const tokens = await Token.find({ queue: queue._id })
      .select(TOKEN_FIELDS)
      .lean();
    const waitingOrder = new Map(requestedIds.map((id, index) => [id.toString(), index]));
    const statusOrder = { serving: 0, waiting: 1, completed: 2, cancelled: 3 };
    tokens.sort((left, right) => {
      const statusDifference = statusOrder[left.status] - statusOrder[right.status];
      if (statusDifference !== 0) return statusDifference;
      if (left.status === 'waiting') {
        return waitingOrder.get(left._id.toString()) - waitingOrder.get(right._id.toString());
      }
      return right.tokenNumber - left.tokenNumber;
    });
    return res.status(200).json({ tokens: tokens.map(toTokenResponse) });
  });
}

async function callNext(req, res) {
  return withOwnedQueueLock(req, res, 'Call next failed', async (queue, lock) => {
    const servingToken = await Token.findOne({ queue: queue._id, status: 'serving' })
      .select('_id')
      .lean();
    if (servingToken) {
      return res.status(409).json({ message: 'A token is already being served.' });
    }

    const nextToken = await Token.findOne({ queue: queue._id, status: 'waiting' })
      .sort({ position: 1, createdAt: 1 })
      .select('_id')
      .lean();
    if (!nextToken) {
      return res.status(409).json({ message: 'No waiting tokens are available.' });
    }

    await lock.assertHeld();
    const token = await Token.findOneAndUpdate(
      { _id: nextToken._id, queue: queue._id, status: 'waiting' },
      { $set: { status: 'serving', calledAt: new Date() } },
      { new: true },
    ).select(TOKEN_FIELDS);
    if (!token) {
      return res.status(409).json({ message: 'The next token changed. Please retry.' });
    }

    let remainingWaitingTokens;
    try {
      remainingWaitingTokens = await Token.find({
        queue: queue._id,
        status: 'waiting',
      }).sort({ position: 1, createdAt: 1 }).select('_id position').lean();
      if (remainingWaitingTokens.length > 0) {
        const result = await Token.bulkWrite(
          remainingWaitingTokens.map((waitingToken, position) => ({
            updateOne: {
              filter: {
                _id: waitingToken._id,
                queue: queue._id,
                status: 'waiting',
              },
              update: { $set: { position } },
            },
          })),
          { ordered: true },
        );
        if (result.matchedCount !== remainingWaitingTokens.length) {
          throw new Error('Not all waiting token positions were updated.');
        }
      }
    } catch (error) {
      try {
        if (remainingWaitingTokens && remainingWaitingTokens.length > 0) {
          await Token.bulkWrite(
            remainingWaitingTokens.map((waitingToken) => ({
              updateOne: {
                filter: { _id: waitingToken._id, queue: queue._id },
                update: { $set: { position: waitingToken.position } },
              },
            })),
            { ordered: true },
          );
        }
        await Token.updateOne(
          { _id: token._id, queue: queue._id, status: 'serving' },
          { $set: { status: 'waiting' }, $unset: { calledAt: 1 } },
        );
      } catch (rollbackError) {
        console.error(`Call-next rollback failed: ${rollbackError.name}`);
      }
      throw error;
    }

    return res.status(200).json({
      message: 'Next token is now serving.',
      token: toTokenResponse(token),
    });
  });
}

async function completeToken(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.tokenId)) {
    return res.status(400).json({ message: 'Invalid token ID.' });
  }

  return withOwnedQueueLock(req, res, 'Token completion failed', async (queue, lock) => {
    const existing = await Token.findOne({
      _id: req.params.tokenId,
      queue: queue._id,
    }).select('status').lean();
    if (!existing) {
      return res.status(404).json({ message: 'Token not found in this queue.' });
    }
    if (existing.status !== 'serving') {
      return res.status(409).json({ message: 'Only a serving token can be completed.' });
    }

    await lock.assertHeld();
    const token = await Token.findOneAndUpdate(
      { _id: req.params.tokenId, queue: queue._id, status: 'serving' },
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true },
    ).select(TOKEN_FIELDS);
    if (!token) {
      return res.status(409).json({ message: 'The token state changed. Please retry.' });
    }
    return res.status(200).json({ token: toTokenResponse(token) });
  });
}

async function cancelToken(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.tokenId)) {
    return res.status(400).json({ message: 'Invalid token ID.' });
  }

  return withOwnedQueueLock(req, res, 'Token cancellation failed', async (queue, lock) => {
    const existing = await Token.findOne({
      _id: req.params.tokenId,
      queue: queue._id,
    }).select('status position').lean();
    if (!existing) {
      return res.status(404).json({ message: 'Token not found in this queue.' });
    }
    if (!['waiting', 'serving'].includes(existing.status)) {
      return res.status(409).json({ message: 'Only waiting or serving tokens can be cancelled.' });
    }

    const waitingTokens = existing.status === 'waiting'
      ? await Token.find({ queue: queue._id, status: 'waiting' })
        .sort({ position: 1, createdAt: 1 })
        .select('_id position')
        .lean()
      : [];
    await lock.assertHeld();
    const token = await Token.findOneAndUpdate(
      {
        _id: req.params.tokenId,
        queue: queue._id,
        status: existing.status,
      },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { new: true },
    ).select(TOKEN_FIELDS);
    if (!token) {
      return res.status(409).json({ message: 'The token state changed. Please retry.' });
    }

    if (existing.status === 'waiting') {
      const previousPositions = new Map(
        waitingTokens
          .filter((waitingToken) => !waitingToken._id.equals(token._id))
          .map((waitingToken) => [
            waitingToken._id.toString(),
            waitingToken.position,
          ]),
      );
      try {
        const remainingWaitingTokens = waitingTokens.filter(
          (waitingToken) => !waitingToken._id.equals(token._id),
        );
        const operations = remainingWaitingTokens.map((waitingToken, position) => ({
          updateOne: {
            filter: {
              _id: waitingToken._id,
              queue: queue._id,
              status: 'waiting',
            },
            update: { $set: { position } },
          },
        }));
        if (operations.length > 0) {
          const result = await Token.bulkWrite(operations, { ordered: true });
          if (result.matchedCount !== remainingWaitingTokens.length) {
            throw new Error('Not all waiting token positions were updated.');
          }
        }
      } catch (error) {
        try {
          if (previousPositions.size > 0) {
            await Token.bulkWrite(
              Array.from(previousPositions, ([id, position]) => ({
                updateOne: {
                  filter: { _id: id, queue: queue._id },
                  update: { $set: { position } },
                },
              })),
              { ordered: true },
            );
          }
          await Token.updateOne(
            { _id: token._id, queue: queue._id, status: 'cancelled' },
            { $set: { status: 'waiting' }, $unset: { cancelledAt: 1 } },
          );
        } catch (rollbackError) {
          console.error(`Token cancellation rollback failed: ${rollbackError.name}`);
        }
        throw error;
      }
    }

    return res.status(200).json({ token: toTokenResponse(token) });
  });
}

async function getQueueSummary(req, res) {
  return withOwnedQueueLock(req, res, 'Queue summary failed', async (queue) => {
    const [metrics] = await Token.aggregate([
      { $match: { queue: queue._id } },
      ...createTokenMetricsStages(null),
    ]);
    const summary = {
      totalTokens: metrics?.totalTokens ?? 0,
      waitingCount: metrics?.waitingCount ?? 0,
      currentlyServingCount: metrics?.servingCount ?? 0,
      completedCount: metrics?.completedCount ?? 0,
      cancelledCount: metrics?.cancelledCount ?? 0,
      averageWaitingTimeMinutes: millisecondsToMinutes(
        metrics?.averageWaitingTimeMs,
      ),
      averageServiceDurationMinutes: millisecondsToMinutes(
        metrics?.averageServiceDurationMs,
      ),
    };
    return res.status(200).json({ summary });
  });
}

module.exports = {
  addPerson,
  getQueueTokens,
  reorderWaitingTokens,
  callNext,
  completeToken,
  cancelToken,
  getQueueSummary,
};
