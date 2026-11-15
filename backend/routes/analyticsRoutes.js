const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const {
  getDashboardAnalytics,
  getQueueTrends,
  getQueuePerformance,
  getRecentActivity,
} = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticateToken);
router.get('/dashboard', getDashboardAnalytics);
router.get('/queue-trends', getQueueTrends);
router.get('/queue-performance', getQueuePerformance);
router.get('/recent-activity', getRecentActivity);

module.exports = router;
