const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  userId: {
    type: String,
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
  emotion: {
    type: String,
    default: 'unknown'
  },
  ayasaResponse: {
    type: String,
    default: ''
  },
  resources: {
    type: [Object],
    default: []
  },
  directScoreQuery: {
    type: Boolean,
    default: false
  },
  geminiUsed: {
    type: Boolean,
    default: false
  },
  geminiError: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
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
