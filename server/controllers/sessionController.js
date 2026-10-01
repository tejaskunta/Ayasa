const Session = require('../models/Session');
const Message = require('../models/Message');
const modelClient = require('../utils/modelClient');
const { asyncHandler, httpError } = require('../utils/http');

/** Create a new chat session for the current user. */
const createSession = asyncHandler(async (req, res) => {
  const session = await Session.create({ userId: req.userId });
  res.status(201).json({ session });
});

/** List the current user's sessions, newest first. */
const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.userId }).sort({ updatedAt: -1 });
  res.json({ sessions });
});

/** All messages in a session the user owns. */
const getMessages = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.userId });
  if (!session) throw httpError(404, 'Session not found');
  const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });
  res.json({ session, messages });
});

/**
 * Post a message. Flow:
 *   1. persist the user's message
 *   2. ask the model service (which never throws — it degrades)
 *   3. persist the bot reply + analysis
 *   4. return everything the UI needs in one response
 */
const postMessage = asyncHandler(async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) throw httpError(400, 'Message text is required');
  if (text.length > 4000) throw httpError(400, 'Message is too long');

  const session = await Session.findOne({ _id: req.params.id, userId: req.userId });
  if (!session) throw httpError(404, 'Session not found');

  const userMessage = await Message.create({
    sessionId: session._id,
    sender: 'user',
    text,
  });

  const analysis = await modelClient.analyze(text);

  userMessage.stressLevel = analysis.stress_level;
  userMessage.emotion = analysis.dominant_emotion;
  userMessage.confidence = analysis.confidence;
  userMessage.strategy = analysis.strategy;
  userMessage.wasCrisis = analysis.is_safety_override;
  userMessage.modelMode = analysis.model_mode;
  await userMessage.save();

  const botMessage = await Message.create({
    sessionId: session._id,
    sender: 'bot',
    text: analysis.reply || 'I am here with you. Tell me more whenever you are ready.',
    strategy: analysis.strategy,
    wasCrisis: analysis.is_safety_override,
  });

  // Touch the session so it sorts to the top of the list.
  session.updatedAt = new Date();
  await session.save();

  res.status(201).json({
    userMessage,
    botMessage,
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

module.exports = { createSession, listSessions, getMessages, postMessage };