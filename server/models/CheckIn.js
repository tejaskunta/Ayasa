const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userInput: {
    type: String,
    required: true
  },
  stressLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    default: 'Moderate'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  // Placeholder for ML model predictions
  mlPredictionData: {
    type: Object,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CheckIn', checkInSchema);
