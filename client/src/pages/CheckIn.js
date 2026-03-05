import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function CheckIn() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi there! I\'m here to help you understand your stress level. Let\'s chat for a moment.'
    },
    {
      id: 2,
      type: 'bot',
      text: 'How are you feeling right now?'
    }
  ]);
  const [input, setInput] = useState('');
  const [conversationPhase, setConversationPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    feeling: '',
    trigger: '',
    physical: ''
  });
  const navigate = useNavigate();

  const questions = [
    'How are you feeling right now?',
    'What\'s been triggering your stress lately?',
    'Are you experiencing any physical symptoms (headache, tension, etc)?',
  ];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input
    };

    setMessages([...messages, userMessage]);

    // Store response
    if (conversationPhase === 0) {
      setUserData({ ...userData, feeling: input });
    } else if (conversationPhase === 1) {
      setUserData({ ...userData, trigger: input });
    } else if (conversationPhase === 2) {
      setUserData({ ...userData, physical: input });
    }

    // Add bot response
    let botResponse = '';
    let nextPhase = conversationPhase + 1;

    if (conversationPhase === 0) {
      botResponse = 'I understand. ' + questions[1];
    } else if (conversationPhase === 1) {
      botResponse = 'Thank you for sharing. ' + questions[2];
    } else if (conversationPhase === 2) {
      botResponse = 'Got it! Let me analyze your responses with AYASA...';
      nextPhase = conversationPhase;

      // Combine all 3 answers into one natural message for the ML backend
      const combinedMessage =
        `${userData.feeling}. ${userData.trigger}. ${input}`;

      // Kick off the API call after the state updates render
      setTimeout(async () => {
        setLoading(true);
        try {
          const response = await fetch('http://localhost:5000/api/checkin/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            userInput: combinedMessage,
            geminiApiKey: localStorage.getItem('geminiApiKey') || '',
          }),
          });
          const data = await response.json();
          const result = data.result || {};

          const fullUserData = {
            feeling: userData.feeling,
            trigger: userData.trigger,
            physical: input,
            timestamp: new Date().toLocaleString(),
            stressLevel: result.stressLevel || 'Moderate',
            emotion:    result.emotion    || 'unknown',
            confidence: result.confidence || 80,
            ayasaResponse: result.ayasaResponse || '',
          };
          localStorage.setItem('lastCheckIn', JSON.stringify(fullUserData));
        } catch (err) {
          // Network error — store minimal fallback so Results page still loads
          const levels = ['Low', 'Moderate', 'High'];
          localStorage.setItem('lastCheckIn', JSON.stringify({
            feeling: userData.feeling,
            trigger: userData.trigger,
            physical: input,
            timestamp: new Date().toLocaleString(),
            stressLevel: levels[Math.floor(Math.random() * 3)],
            emotion: 'unknown',
            confidence: 80,
            ayasaResponse: 'I was unable to reach the analysis server. Please try again when the ML backend is running.',
          }));
        } finally {
          setLoading(false);
          navigate('/results');
        }
      }, 400);
    }

    if (nextPhase <= conversationPhase) {
      nextPhase = conversationPhase;
    }

    setMessages(prev => [...prev, {
      id: prev.length + 2,
      type: 'bot',
      text: botResponse
    }]);

    setConversationPhase(nextPhase);
    setInput('');
  };

  return (
    <div className="checkin-container">
      <header className="navbar">
        <h2>Ayasa</h2>
        <Link to="/home" className="btn-exit">Exit</Link>
      </header>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.type}`}>
              <div className="message-content">
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              className="chat-input"
              disabled={conversationPhase > 2 || loading}
            />
            <button type="submit" className="send-btn" disabled={conversationPhase > 2 || loading}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

