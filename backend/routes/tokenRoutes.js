const express = require('express');
const {
  addPerson,
  getQueueTokens,
  reorderWaitingTokens,
  callNext,
  completeToken,
  cancelToken,
} = require('../controllers/tokenController');

const router = express.Router({ mergeParams: true });

router.post('/', addPerson);
router.get('/', getQueueTokens);
router.patch('/reorder', reorderWaitingTokens);
router.post('/call-next', callNext);
router.patch('/:tokenId/complete', completeToken);
router.patch('/:tokenId/cancel', cancelToken);

module.exports = router;
