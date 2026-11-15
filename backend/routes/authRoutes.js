const express = require('express');
const {
  getCurrentManager,
  login,
  register,
} = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');
const { loginRateLimit, registerRateLimit } = require('../middleware/authRateLimit');

const router = express.Router();

router.post('/register', registerRateLimit, register);
router.post('/login', loginRateLimit, login);
router.get('/me', authenticateToken, getCurrentManager);

module.exports = router;
