// Mock check-in storage for demo
const checkInHistory = [];

exports.submitCheckIn = async (req, res) => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      return res.status(400).json({ error: 'User input is required' });
    }

    // Placeholder for PyTorch/Hugging Face API integration
    // const stressLevel = await callMLModel(userInput);
    // For now, return random stress level for demo

    const stressLevels = ['Low', 'Moderate', 'High'];
    const randomStressLevel = stressLevels[Math.floor(Math.random() * 3)];

    const checkInData = {
      id: checkInHistory.length + 1,
      userInput,
      stressLevel: randomStressLevel,
      confidence: Math.floor(75 + Math.random() * 25),
      timestamp: new Date(),
      advice: getAdviceForStressLevel(randomStressLevel)
    };

    checkInHistory.push(checkInData);

    res.json({
      message: 'Check-in submitted successfully',
      result: checkInData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    res.json({
      message: 'Check-in history retrieved',
      history: checkInHistory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAdviceForStressLevel = (level) => {
  const advice = {
    'Low': 'Great! You\'re doing well. Keep up with your wellness routine.',
    'Moderate': 'You might benefit from some relaxation techniques. Try breathing exercises or a calming playlist.',
    'High': 'You seem to be under significant stress. Consider reaching out to a mental health professional.'
  };
  return advice[level] || 'Remember to take care of yourself!';
};

// Placeholder for ML integration
// exports.callMLModel = async (userInput) => {
//   // This is where PyTorch/Hugging Face API would be called
//   // For example:
//   // const response = await fetch('http://localhost:8000/predict', {
//   //   method: 'POST',
//   //   headers: { 'Content-Type': 'application/json' },
//   //   body: JSON.stringify({ text: userInput })
//   // });
//   // const data = await response.json();
//   // return data.stress_level;
// };
