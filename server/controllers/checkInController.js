const mongoose = require('mongoose');
const CheckIn = require('../models/CheckIn');
const modelClient = require('../utils/modelClient');
const { asyncHandler, httpError } = require('../utils/http');

/** Create a check-in: analyze text and store a typed entry. */
const createCheckIn = asyncHandler(async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) throw httpError(400, 'Check-in text is required');
  if (text.length > 4000) throw httpError(400, 'Check-in is too long');

  const analysis = await modelClient.analyze(text);

  const checkIn = await CheckIn.create({
    userId: req.userId,
    text,
    stressLevel: analysis.stress_level,
    emotion: analysis.dominant_emotion,
    confidence: analysis.confidence,
    strategy: analysis.strategy,
    reply: analysis.reply,
    wasCrisis: analysis.is_safety_override,
    modelMode: analysis.model_mode,
  });

  res.status(201).json({
    checkIn,
    analysis: {
      stressLevel: analysis.stress_level,
      emotion: analysis.dominant_emotion,
      confidence: analysis.confidence,
      strategy: analysis.strategy,
      wasCrisis: analysis.is_safety_override,
      modelMode: analysis.model_mode,
    },
  });
});

/** List check-ins, newest first. */
const listCheckIns = asyncHandler(async (req, res) => {
  const checkIns = await CheckIn.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
  res.json({ checkIns });
});

/**
 * Simple insights: counts per stress level and the current streak of days
 * with a check-in. Aggregation happens in the DB, not in JS, so it stays fast.
 */
const getInsights = asyncHandler(async (req, res) => {
  // IMPORTANT: req.userId is a string (it came from the JWT). Mongoose casts it
  // automatically for find()/countDocuments(), but NOT for aggregate() — the
  // pipeline compares raw BSON. So the $match below needs a real ObjectId,
  // otherwise it silently matches nothing and you get total>0 with all-zero
  // counts. This is a very easy bug to ship.
  const userId = new mongoose.Types.ObjectId(req.userId);

  const byLevel = await CheckIn.aggregate([
    { $match: { userId } },
    { $group: { _id: '$stressLevel', count: { $sum: 1 } } },
  ]);

  const total = await CheckIn.countDocuments({ userId });
  const recent = await CheckIn.find({ userId }).sort({ createdAt: -1 }).limit(7);

  const counts = { Low: 0, Medium: 0, High: 0 };
  for (const row of byLevel) {
    if (row._id in counts) counts[row._id] = row.count;
  }

  res.json({
    total,
    counts,
    last: recent.map((c) => ({
      stressLevel: c.stressLevel,
      emotion: c.emotion,
      createdAt: c.createdAt,
    })),
  });
});

module.exports = { createCheckIn, listCheckIns, getInsights };