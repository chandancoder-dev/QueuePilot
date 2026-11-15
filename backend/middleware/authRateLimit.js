const { rateLimit } = require('express-rate-limit');

function createAuthRateLimit(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      return res.status(429).json({
        message: 'Too many authentication attempts. Please try again later.',
      });
    },
  });
}

const loginRateLimit = createAuthRateLimit(15 * 60 * 1000, 10);
const registerRateLimit = createAuthRateLimit(60 * 60 * 1000, 5);

module.exports = {
  loginRateLimit,
  registerRateLimit,
};
