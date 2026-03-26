# Ayasa - Complete Setup Guide

This guide will help you run the complete Ayasa mental health chatbot with ML integration.

## System Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │─────▶│   Express   │─────▶│   Python    │
│  Frontend   │      │   Backend   │      │  ML Backend │
│  :3000      │      │   :5000     │      │   :8000     │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Prerequisites

- **Node.js** (v14+)
- **Python** (3.8+)
- **npm**
- **pip**

---

## Step 1: Setup Python ML Backend

### 1.1 Navigate to ML backend

```bash
cd ml-backend
```

### 1.2 Create virtual environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 1.3 Install Python dependencies

```bash
pip install -r requirements.txt
```

**Note**: This downloads ~2GB of PyTorch + Transformers. First run will also download the pretrained model (~250MB).

### 1.4 Start ML Backend

```bash
python main.py
```

✅ ML Backend running at: **http://localhost:8000**

---

## Step 2: Setup Express Backend

### 2.1 Open a NEW terminal

Navigate to server directory:

```bash
cd server
```

### 2.2 Install dependencies

```bash
npm install
```

### 2.3 Start Express server

```bash
npm start
```

✅ Express Backend running at: **http://localhost:5000**

---

## Step 3: Setup React Frontend

### 3.1 Open a NEW terminal

Navigate to client directory:

```bash
cd client
```

### 3.2 Install dependencies

```bash
npm install
```

### 3.3 Start React app

```bash
npm start
```

✅ React Frontend running at: **http://localhost:3000**

Browser should open automatically!

---

## Testing the Full System

### 1. Open browser: http://localhost:3000

### 2. Click "Login" or use demo navigation buttons

### 3. Go to "Check-in" or click "Start Stress Check"

### 4. Chat with Ayasa:

The bot will ask 3 questions:
- How are you feeling right now?
- What's been triggering your stress lately?
- Are you experiencing any physical symptoms?

### 5. View Results

After answering all questions, you'll see:
- **Emotion** (detected by ML)
- **Stress Level** (high/low)
- **AI Response** (supportive message)
- **Confidence Score**

---

## Ports Summary

| Service | Port | URL |
|---------|------|-----|
| React Frontend | 3000 | http://localhost:3000 |
| Express Backend | 5000 | http://localhost:5000 |
| Python ML Backend | 8000 | http://localhost:8000 |

---

## API Testing

### Test ML Backend directly:

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"message": "I feel overwhelmed with work"}'
```

Expected response:
```json
{
  "emotion": "fear",
  "stress": "high",
  "response": "It sounds like things feel overwhelming...",
  "confidence": 0.89
}
```

### Test Express Backend:

```bash
curl -X POST "http://localhost:5000/api/checkin/submit" \
  -H "Content-Type: application/json" \
  -d '{"userInput": "I am stressed about exams"}'
```

---

## Troubleshooting

### ML Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'transformers'`

**Solution**: Make sure virtual environment is activated and dependencies installed:
```bash
cd ml-backend
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**Problem**: Model download taking too long

**Solution**: First-time download is ~250MB. Be patient. Subsequent runs use cached model.

---

### Express Backend Issues

**Problem**: `Cannot find module 'node-fetch'`

**Solution**: Install server dependencies:
```bash
cd server
npm install
```

---

### React Issues

**Problem**: Port 3000 already in use

**Solution**: Kill the process or use different port:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or let React use different port when prompted
```

---

## Development Workflow

### Running all 3 servers:

**Terminal 1** (ML Backend):
```bash
cd ml-backend
venv\Scripts\activate
python main.py
```

**Terminal 2** (Express):
```bash
cd server
npm start
```

**Terminal 3** (React):
```bash
cd client
npm start
```

---

## Environment Variables

### server/.env

```env
PORT=5000
ML_API_URL=http://localhost:8000/analyze
MONGODB_URI=mongodb://localhost:27017/ayasa
JWT_SECRET=demo_secret_key_12345
```

---

## Next Steps

- ✅ Emotion classification working
- ✅ Stress detection working
- ✅ Chat interface complete
- ✅ Full integration

### Future Enhancements:

- [ ] Connect MongoDB for persistent storage
- [ ] Train custom stress model (Dreaddit dataset)
- [ ] Add Gemini API for dynamic responses
- [ ] Conversation memory
- [ ] History persistence

---

## Quick Start (All-in-One)

**Windows PowerShell** (3 terminals side-by-side):

```powershell
# Terminal 1
cd ml-backend ; venv\Scripts\activate ; python main.py

# Terminal 2
cd server ; npm start

# Terminal 3
cd client ; npm start
```

---

## Support

For issues, check:
- Python ML Backend logs
- Express server console
- React browser console (F12)

Enjoy testing Ayasa! 🧠💚
