const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const {
  createQueue,
  getQueues,
  getQueue,
  updateQueue,
} = require('../controllers/queueController');
const tokenRoutes = require('./tokenRoutes');
const { getQueueSummary } = require('../controllers/tokenController');

const router = express.Router();

router.use(authenticateToken);
router.post('/', createQueue);
router.get('/', getQueues);
router.get('/:queueId/summary', getQueueSummary);
router.use('/:queueId/tokens', tokenRoutes);
router.get('/:id', getQueue);
router.patch('/:id', updateQueue);

module.exports = router;
