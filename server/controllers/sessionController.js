const Session = require('../models/Session');

exports.createSession = async (req, res) => {
  try {
    const session = await Session.create({ user_id: req.user.userId });
    return res.status(201).json({ session });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user_id: req.user.userId })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
