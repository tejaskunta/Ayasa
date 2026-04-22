const axios = require('axios');
const Message = require('../models/Message');
const Session = require('../models/Session');
const Analytics = require('../models/Analytics');
const User = require('../models/User');

const ML_BASE_URL = process.env.ML_BACKEND_URL || 'http://localhost:8000';

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

    const userMessage = await Message.create({
      session_id,
      sender: 'user',
      text,
      emotion_label: 'pending',
      stress_label: 'pending',
    });

    const userDoc = await User.findById(req.user.userId).select('+llm_api_key').lean();
    const llmApiKey = String(userDoc?.llm_api_key || '').trim();

    let emotionLabel = 'unknown';
    let stressLabel = 'Moderate';
    let emotionConfidence = 0;
    let botReply = 'I am here with you. Can you share one more detail so I can better support you?';

    try {
      const mlResponse = await axios.post(
        `${ML_BASE_URL}/predict`,
        {
          text,
          user_id: String(req.user.userId),
          llm_api_key: llmApiKey,
        },
        { timeout: 20000 }
      );
      const payload = mlResponse.data || {};
      emotionLabel = String(payload.emotion || 'unknown');
      stressLabel = String(payload.stressLevel || 'Moderate');
      emotionConfidence = Number(payload.confidence || 0);
      botReply = String(payload.ayasaResponse || botReply);
    } catch {
      // Graceful fallback for ML/LLM outages.
    }

    await Message.findByIdAndUpdate(userMessage._id, {
      emotion_label: emotionLabel,
      stress_label: stressLabel,
    });

    const processingTime = Date.now() - startedAt;
    await Analytics.create({
      message_id: userMessage._id,
      emotion_confidence: emotionConfidence,
      processing_time_ms: processingTime,
    });

    const botMessage = await Message.create({
      session_id,
      sender: 'bot',
      text: botReply,
      emotion_label: emotionLabel,
      stress_label: stressLabel,
    });

    await Analytics.create({
      message_id: botMessage._id,
      emotion_confidence: emotionConfidence,
      processing_time_ms: processingTime,
    });

    return res.status(201).json({
      user_message: {
        id: String(userMessage._id),
        session_id: String(userMessage.session_id),
        sender: 'user',
        text,
        emotion_label: emotionLabel,
        stress_label: stressLabel,
      },
      bot_message: {
        id: String(botMessage._id),
        session_id: String(botMessage.session_id),
        sender: 'bot',
        text: botReply,
        emotion_label: emotionLabel,
        stress_label: stressLabel,
      },
      analytics: {
        emotion_confidence: emotionConfidence,
        processing_time_ms: processingTime,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getMessagesBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ _id: sessionId, user_id: req.user.userId }).lean();
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await Message.find({ session_id: sessionId })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
