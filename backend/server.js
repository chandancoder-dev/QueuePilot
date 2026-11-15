const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { corsMiddleware, rejectUnlistedOrigins } = require('./config/cors');
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const queueRoutes = require('./routes/queueRoutes');

const app = express();

app.use(rejectUnlistedOrigins);
app.use(corsMiddleware);
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/queues', queueRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to QueuePilot API',
  });
});

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    server: 'running',
    database: databaseConnected ? 'connected' : 'disconnected',
  });
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON request body.' });
  }
  return next(error);
});

const port = process.env.PORT || 5000;

function redactMongoCredentials(message) {
  return message.replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb://[redacted]@');
}

async function startServer() {
  try {
    await connectDB();
    const server = app.listen(port, () => {
      console.log(`QueuePilot API is running on port ${port}`);
    });
    server.on('error', (error) => {
      console.error(`QueuePilot API failed to listen: ${redactMongoCredentials(error.message)}`);
      process.exitCode = 1;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`QueuePilot API failed to start: ${redactMongoCredentials(message)}`);
    process.exitCode = 1;
  }
}

startServer();
