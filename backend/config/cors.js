const cors = require('cors');

const localDevelopmentOrigin = 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

function parseOriginList(values) {
  const origins = new Set();
  for (const value of values) {
    for (const configuredOrigin of (value || '').split(',')) {
      const trimmedOrigin = configuredOrigin.trim();
      if (!trimmedOrigin) continue;

      let parsedOrigin;
      try {
        parsedOrigin = new URL(trimmedOrigin);
      } catch {
        throw new Error('Invalid frontend origin configuration. Use comma-separated HTTP(S) origins.');
      }

      if (
        !['http:', 'https:'].includes(parsedOrigin.protocol) ||
        parsedOrigin.username ||
        parsedOrigin.password ||
        parsedOrigin.pathname !== '/' ||
        parsedOrigin.search ||
        parsedOrigin.hash
      ) {
        throw new Error('Invalid frontend origin configuration. Use comma-separated HTTP(S) origins without paths.');
      }
      origins.add(parsedOrigin.origin);
    }
  }
  return origins;
}

const allowedOrigins = parseOriginList([
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
]);

if (!isProduction) {
  allowedOrigins.add(localDevelopmentOrigin);
} else if (allowedOrigins.size === 0) {
  throw new Error('Configure FRONTEND_URL or CORS_ORIGINS before starting in production.');
}

function rejectUnlistedOrigins(req, res, next) {
  const origin = req.get('Origin');
  if (!origin || allowedOrigins.has(origin)) {
    return next();
  }
  return res.status(403).json({ message: 'Origin is not allowed.' });
}

const corsMiddleware = cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  optionsSuccessStatus: 204,
});

module.exports = {
  corsMiddleware,
  rejectUnlistedOrigins,
};
