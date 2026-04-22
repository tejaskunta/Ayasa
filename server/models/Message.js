const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    emotion_label: {
      type: String,
      default: 'unknown',
    },
    stress_label: {
      type: String,
      default: 'Moderate',
    },
  },
  { timestamps: true }
);

messageSchema.index({ session_id: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
