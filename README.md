# Ayasa - Mental Health Stress Detection Website

A full-stack AYASA mental health assistant with stress/emotion analysis, hybrid safety guardrails, and conversational support.

## Features

- **Landing + Auth + Chat UX**: unified theme, responsive layout, and collapsible analytics sidebar
- **Hybrid AI backend**: Hugging Face stress/emotion inference + strategy engine + Groq (Llama 3) response layer
- **Safety guardrails**: deterministic crisis override and fallback responses when LLM is unavailable
- **Express APIs**: auth, profile update, check-in, history, insights, and ML health
- **MongoDB groundwork**: optional production-ready connection with local JSON fallback

## Tech Stack

- **Frontend**: React 18, React Router, CSS3
- **Backend**: Express.js, Node.js
- **Database**: MongoDB (configured but optional for demo)
- **Authentication**: JWT
- **ML Backend**: FastAPI, Hugging Face Transformers, Groq LLM

## Project Structure

```
Ayasa/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/         # 6 main pages
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Home.js
│   │   │   ├── CheckIn.js
│   │   │   ├── Results.js
│   │   │   └── History.js
│   │   ├── styles/
│   │   │   └── pages.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                # Express backend
│   ├── controllers/
│   │   ├── authController.js
│   │   └── checkInController.js
│   ├── models/
│   │   ├── User.js
│   │   └── CheckIn.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── checkin.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── README.md
└── .gitignore
```

## Quick Start

### Prerequisites
- Node.js (v14+)
- npm

### Installation

1. **Install server dependencies**:
   ```
   cd server
   npm install
   cd ..
   ```

2. **Install client dependencies**:
   ```
   cd client
   npm install
   cd ..
   ```

3. **Setup environment**:
   ```
   cd server
   cp .env.example .env
   cd ..

   cd ml-backend
   cp .env.example .env
   cd ..
   ```

4. **Install ML backend dependencies**:
   ```
   cd ml-backend
   pip install -r requirements.txt
   cd ..
   ```

### Running the Application

**Option 1: Run in separate terminals**

Terminal 1 - Backend:
```
cd server
npm start
```

Terminal 2 - Frontend:
```
cd client
npm start
```

Terminal 3 - ML backend:
```
cd ml-backend
python main.py
```

The app will open at `http://localhost:3000`
Backend runs on `http://localhost:5000`

### Demo Credentials

- **Email**: user@example.com
- **Password**: ••••••••

You can register a new account or use the demo credentials above.

## Pages Overview

1. **Login Page** - Welcome back, enter credentials
2. **Register Page** - Create new account with full name
3. **Home Page** - Dashboard with user greeting
4. **Check-in Page** - Text input for stress description
5. **Results Page** - Shows predicted stress level and advice
6. **History Page** - View past check-in records

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `PUT /api/auth/profile` - Update display name/profile

### Check-in
- `POST /api/checkin/submit` - Submit check-in
- `GET /api/checkin/history` - Get check-in history
- `GET /api/checkin/insights` - Get trend/pattern insights
- `GET /api/checkin/ml-health` - ML + LLM service status

## MongoDB Connection Guide

### 1. Local MongoDB (quick start)
1. Install MongoDB Community Server.
2. Start MongoDB service so it listens on mongodb://localhost:27017.
3. In server/.env, set:
   ```
   MONGODB_URI=mongodb://localhost:27017/ayasa
   ```
4. Restart the Node server. If Mongo connects, auth/profile/check-ins persist in MongoDB.

### 2. MongoDB Atlas
1. Create an Atlas cluster.
2. Create a DB user (username/password).
3. Add your current IP to Network Access.
4. Copy your SRV connection string, then set in server/.env:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ayasa?retryWrites=true&w=majority
   ```
5. Restart Node server.

### 3. Optional pool and timeout tuning
The server supports these env settings:
- MONGO_MAX_POOL_SIZE
- MONGO_MIN_POOL_SIZE
- MONGO_MAX_IDLE_MS
- MONGO_CONNECT_TIMEOUT_MS
- MONGO_SOCKET_TIMEOUT_MS
- MONGO_SERVER_SELECTION_TIMEOUT_MS

If MONGODB_URI is missing or unreachable, AYASA automatically falls back to local JSON persistence so development still works.

## ML + LLM Configuration

In ml-backend/.env:
```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192
HF_TOKEN=your_huggingface_token_here
```

The ML backend keeps /predict and /chat compatibility and adds deterministic crisis fallback paths for safety.

## Future Enhancements

1. **ML Integration**:
   - Connect PyTorch model for stress detection
   - Integrate Hugging Face for NLP processing
   - Real stress level prediction

2. **Database**:
   - Connect to MongoDB
   - Store user sessions and check-in history
   - Implement proper JWT authentication

3. **Features**:
   - Chatbot conversational interface
   - Real-time stress analytics
   - Resource library with exercises/playlists
   - Email notifications

## Notes

- Frontend stores token/user locally for session continuity.
- Backend persists to MongoDB when available, else JSON fallback remains active.
- High-stress or crisis-like content routes through deterministic safe responses.
- LLM outages degrade gracefully to supportive fallback messages.

## License

MIT
