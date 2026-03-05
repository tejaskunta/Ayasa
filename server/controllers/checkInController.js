const http = require('http');

// In-memory check-in history (demo — replace with MongoDB for production)
const checkInHistory = [];

// ── Call the Python ML backend ──────────────────────────────────────────────
const callMLBackend = (message, geminiApiKey = '') => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message, gemini_api_key: geminiApiKey });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from ML backend'));
        }
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('ML backend timeout'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ── POST /api/checkin/submit ────────────────────────────────────────────────
exports.submitCheckIn = async (req, res) => {
  try {
    const { userInput, geminiApiKey } = req.body;

    if (!userInput) {
      return res.status(400).json({ error: 'User input is required' });
    }

    let stressLevel, emotion, ayasaResponse, confidence;

    try {
      // ── ML path: DistilBERT + Gemini ──
      const mlResult = await callMLBackend(userInput, geminiApiKey);
      emotion       = mlResult.emotion;
      // Map all 3 stress levels
      if (mlResult.stress === 'High Stress') stressLevel = 'High';
      else if (mlResult.stress === 'Moderate Stress') stressLevel = 'Moderate';
      else stressLevel = 'Low';
      ayasaResponse = mlResult.ayasa_response;
      confidence    = mlResult.emotion_score || 85;
    } catch (mlError) {
      // ── Fallback: ML server not running ──
      console.warn('ML backend unavailable, using fallback:', mlError.message);
      const levels  = ['Low', 'Moderate', 'High'];
      stressLevel   = levels[Math.floor(Math.random() * 3)];
      emotion       = 'unknown';
      ayasaResponse = getAdviceForStressLevel(stressLevel);
      confidence    = Math.floor(75 + Math.random() * 25);
    }

    const checkInData = {
      id: checkInHistory.length + 1,
      userInput,
      stressLevel,
      emotion,
      confidence,
      ayasaResponse,
      timestamp: new Date(),
    };

    checkInHistory.push(checkInData);

    res.json({
      message: 'Check-in submitted successfully',
      result: checkInData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/history ────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    res.json({
      message: 'Check-in history retrieved',
      history: checkInHistory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Fallback rule-based advice ──────────────────────────────────────────────
const getAdviceForStressLevel = (level) => {
  const advice = {
    Low:      "You're doing well! Keep up your wellness routine.",
    Moderate: 'Try some relaxation techniques — breathing exercises or a calming playlist can help.',
    High:     'You seem to be under significant stress. Consider talking to a counsellor or trusted friend.',
  };
  return advice[level] || 'Remember to take care of yourself!';
};
