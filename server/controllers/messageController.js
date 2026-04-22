const Message = require('../models/Message');
const Session = require('../models/Session');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const { callMLBackend } = require('../utils/mlClient');

exports.createMessage = async (req, res) => {
  try {
    const { session_id, text } = req.body;
    if (!session_id || !text) {
      return res.status(400).json({ error: 'session_id and text are required' });
    }

    const session = await Session.findOne({ _id: session_id, user_id: req.user.userId }).lean();
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const startedAt = Date.now();
    const userMessage = await Message.create({ session_id, sender: 'user', text, emotion_label: 'pending', stress_label: 'pending' });

    const userDoc = await User.findById(req.user.userId).select('+llm_api_key').lean();
    const llmApiKey = String(userDoc?.llm_api_key || '').trim();

    let emotionLabel = 'unknown';
    let stressLabel = 'Moderate';
    let emotionConfidence = 0;
    let botReply = 'I am here with you. Can you share one more detail so I can better support you?';

    try {
      const ml = await callMLBackend(text, String(req.user.userId), llmApiKey);
      emotionLabel = String(ml.emotion || 'unknown');
      stressLabel = String(ml.stressLevel || 'Moderate');
      emotionConfidence = Number(ml.confidence || 0);
      botReply = String(ml.ayasaResponse || botReply);
    } catch {
      // Graceful fallback for ML/LLM outages.
    }

    await Message.findByIdAndUpdate(userMessage._id, { emotion_label: emotionLabel, stress_label: stressLabel });

    const processingTime = Date.now() - startedAt;
    await Analytics.create({ message_id: userMessage._id, emotion_confidence: emotionConfidence, processing_time_ms: processingTime });

    const botMessage = await Message.create({ session_id, sender: 'bot', text: botReply, emotion_label: emotionLabel, stress_label: stressLabel });
    await Analytics.create({ message_id: botMessage._id, emotion_confidence: emotionConfidence, processing_time_ms: processingTime });

    return res.status(201).json({
      user_message: { id: String(userMessage._id), session_id: String(userMessage.session_id), sender: 'user', text, emotion_label: emotionLabel, stress_label: stressLabel },
      bot_message: { id: String(botMessage._id), session_id: String(botMessage.session_id), sender: 'bot', text: botReply, emotion_label: emotionLabel, stress_label: stressLabel },
      analytics: { emotion_confidence: emotionConfidence, processing_time_ms: processingTime },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Save a user+bot message pair without calling the ML backend.
// Used by the React client after it already has the bot response from /api/checkin/submit.
exports.saveMessagePair = async (req, res) => {
  try {
    const { session_id, user_text, bot_text, emotion_label, stress_label } = req.body;
    if (!session_id || !user_text) {
      return res.status(400).json({ error: 'session_id and user_text are required' });
    }

    const session = await Session.findOne({ _id: session_id, user_id: req.user.userId }).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const safeEmotion = String(emotion_label || 'unknown');
    const safeStress = String(stress_label || 'Moderate');

    const userMsg = await Message.create({ session_id, sender: 'user', text: user_text, emotion_label: safeEmotion, stress_label: safeStress });
    const botMsg = await Message.create({ session_id, sender: 'bot', text: bot_text || '', emotion_label: safeEmotion, stress_label: safeStress });

    return res.status(201).json({ user_message: { id: String(userMsg._id), sender: 'user', text: user_text }, bot_message: { id: String(botMsg._id), sender: 'bot', text: bot_text } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getMessagesBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, user_id: req.user.userId }).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const messages = await Message.find({ session_id: sessionId }).sort({ createdAt: 1 }).lean();
    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
