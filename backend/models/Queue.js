const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    queueId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^QP-\d+$/, 'Queue ID must use the format QP-101.'],
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
    },
    nextTokenNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    collection: 'queues',
  },
);

module.exports = mongoose.model('Queue', queueSchema);
