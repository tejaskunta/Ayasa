const mongoose = require('mongoose');

const { STRESS_LEVELS } = require('../contract');

/**
 * A check-in is a standalone wellness entry (not part of a chat session).
 *
 * The original enum was ['Low','Moderate','High'] while the ML service emitted
 * "Medium" — so valid predictions were rejected by MongoDB. Fixed by importing
 * the single vocabulary.
 */
const checkInSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true },
    stressLevel: { type: String, enum: [...STRESS_LEVELS, null], default: null },
    emotion: { type: String, default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    strategy: { type: String, default: null },
    reply: { type: String, default: '' },
    wasCrisis: { type: Boolean, default: false },
    modelMode: { type: String, default: null },
  },
  { timestamps: true }
);

checkInSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);