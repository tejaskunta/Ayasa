const mongoose = require('mongoose');

const { STRESS_LEVELS } = require('../contract');

const messageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    sender: { type: String, enum: ['user', 'bot'], required: true },
    text: { type: String, required: true, trim: true },

    // Analysis attached to the user's message. Vocabulary comes from
    // contract.js, so it is always Low/Medium/High — never "Moderate"
    // (which is what the original defaulted to here and broke reads).
    stressLevel: { type: String, enum: [...STRESS_LEVELS, null], default: null },
    emotion: { type: String, default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    strategy: { type: String, default: null },
    wasCrisis: { type: Boolean, default: false },
    modelMode: { type: String, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);