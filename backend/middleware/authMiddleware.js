const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const getJwtSecret = require('../utils/jwtSecret');

function authenticateToken(req, res, next) {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.trim().match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  const secret = getJwtSecret();
  if (!secret) {
    return res.status(500).json({ message: 'Authentication is not configured.' });
  }

  try {
    const payload = jwt.verify(match[1], secret);
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !mongoose.Types.ObjectId.isValid(payload.sub)
    ) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    req.auth = { managerId: payload.sub };
    return next();
  } catch (error) {
    if (
      error.name === 'TokenExpiredError' ||
      error.name === 'JsonWebTokenError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    console.error('JWT authentication failed:', error.name);
    return res.status(500).json({ message: 'Unable to authenticate request.' });
  }
}

module.exports = authenticateToken;
