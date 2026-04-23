# AYASA - Mental Wellness Assistant

AYASA is a full-stack mental wellness platform with a conversational chat experience, stress/emotion analysis, deterministic safety guardrails, and deployable microservices.

## Current Features

- Conversational chat interface with a modern orb-driven composer and responsive layout
- Auth flow with register, login, profile updates, and runtime key management
- Stress + emotion analysis pipeline (Hugging Face classifiers + calibration logic)
- Strategy-based response generation via Groq LLM with safe deterministic fallbacks
- Crisis keyword override path for immediate safety-first responses
- Session/message persistence endpoints for multi-turn chat history
- Check-in history and derived local/server insights (7-day, 30-day, patterns)
- Render Blueprint deployment for ML backend, API server, and static client

## Architecture

- `client` (React): UI, auth state, chat UX, local caches, API integration
- `server` (Express): auth, check-ins, sessions, messages, insights, ML orchestration
- `ml-backend` (FastAPI): emotion + stress inference, strategy mapping, LLM interaction

## Tech Stack

- Frontend: React 18, React Router, OGL, CSS
- API Server: Node.js, Express, JWT, Mongoose
- ML Service: FastAPI, Transformers, Torch, Groq SDK
- Database: MongoDB (with graceful fallback behavior when unavailable)
- Deployment: Render Blueprint (`render.yaml`)

## Repository Layout

```text
Ayasa/
├── client/
├── server/
├── ml-backend/
├── docs/
├── render.yaml
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- npm

### 1) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
cd ../ml-backend && pip install -r requirements.txt
```

### 2) Configure environment files

Create these files from examples:

- `server/.env` from `server/.env.example`
- `ml-backend/.env` from `ml-backend/.env.example`

Minimum keys to set:

- `server/.env`: `JWT_SECRET`, `MONGODB_URI`, `ML_BACKEND_URL`, `RUNTIME_SYNC_TOKEN`
- `ml-backend/.env`: `GROQ_API_KEY`, `GROQ_MODEL`, `HF_TOKEN`, `RUNTIME_SYNC_TOKEN`

### 3) Run services (3 terminals)

Terminal A:

```bash
cd server
npm start
```

Terminal B:

```bash
cd client
npm start
```

Terminal C:

```bash
cd ml-backend
python main.py
```

App URLs:

- Client: `http://localhost:3000`
- API server: `http://localhost:5000`
- ML backend: `http://localhost:8000`

## API Surface (Server)

### Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `GET /me`
- `PUT /profile`
- `PUT /keys`
- `GET /keys-status`

### Check-in (`/api/checkin`)

- `POST /submit`
- `GET /history`
- `GET /insights`
- `GET /ml-health`

### Sessions (`/api/sessions`)

- `POST /`
- `GET /`

### Messages (`/api/messages`)

- `POST /`
- `POST /save`
- `GET /:sessionId`

### Health

- `GET /health` (API server)
- `GET /health` (ML backend)

## Testing

Run client tests:

```bash
cd client
npm test -- --watchAll=false
```

Run server tests:

```bash
cd server
npm test
```

Run ML backend tests:

```bash
cd ml-backend
python -m pytest tests/ -v --tb=short
```

## Render Deployment (Blueprint)

This repo includes `render.yaml` with three services:

1. `ayasa-ml-backend` (Python web service)
2. `ayasa-server` (Node web service)
3. `ayasa-client` (static site)

Deploy steps:

1. Push to GitHub `main`
2. In Render, create from Blueprint using repository root `render.yaml`
3. Set secret env vars in Render dashboard:
   - `GROQ_API_KEY`
   - `HF_TOKEN`
   - `JWT_SECRET`
   - `MONGODB_URI`
   - `RUNTIME_SYNC_TOKEN`

Note: static services in Render Blueprint should not define `region`; this repo is already configured correctly.

## Security Notes

- Do not commit `.env` files or API keys
- Rotate exposed keys immediately if shared accidentally
- Keep runtime secrets only in local env files and deployment secret managers

## License

MIT
