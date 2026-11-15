const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Queue',
      required: true,
    },
    tokenNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    personName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'cancelled'],
      default: 'waiting',
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    calledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'tokens',
  },
);

tokenSchema.index({ queue: 1, status: 1, position: 1 });
tokenSchema.index({ queue: 1, tokenNumber: 1 }, { unique: true });

module.exports = mongoose.model('Token', tokenSchema);
