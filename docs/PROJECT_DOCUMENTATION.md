# AYASA — Project Documentation

> Mental Health Stress Detection & Support Platform
> Version 3.0 · April 2026

---

## 1. Coding Considerations

### 1.1 Pseudo Code — Core Chat Flow

```
USER sends message via React chat interface
  │
  ▼
React (Home.js)
  POST /api/checkin/submit  { userInput, userId, llmApiKey }
  │
  ▼
Node.js Server (checkInController.js)
  1. Validate userInput is non-empty
  2. Build SHA-256 dedup key (userId + input + key fingerprint)
  3. Check recentCheckIns map (15-second dedup window)
     → If duplicate found: return cached result immediately
  4. callMLBackend(userInput, userId, llmApiKey)
     │
     ▼
  Python FastAPI (main.py)
    A. infer_emotions(text)           → DistilBERT pipeline  → (probs, dominant, score)
    B. infer_stress_probs(text, emo)  → Stress BERT pipeline → {Low, Medium, High}
    C. calibrate_stress_prediction()  → Keyword override calibration
    D. is_direct_score_query()        → Returns numeric score if asked
    E. chatbot_reply()                → strategy.get_strategy() → "deep_support" / etc.
       └─ generate_response()         → Groq llama-3.1-8b-instant API call
          └─ If Groq fails: pick from FALLBACK_VARIANTS bank
    Return: stressLevel, emotion, confidence, ayasaResponse, resources
  │
  ▼
  5. normalizeStressLevel()   → "High" / "Moderate" / "Low"
  6. normalizeConfidence()    → 0–100 integer
  7. Persist to MongoDB (or in-memory if no DB)
  8. Return JSON result to React
  │
  ▼
React renders: stress badge, emotion, AYASA response, resource links
```

### 1.2 Exceptions Considered During Implementation

| Exception | Where It Occurs | Handling Strategy |
|-----------|----------------|-------------------|
| Groq API key missing | `llm.py:generate_response()` | Returns `(None, "Missing GROQ_API_KEY")` immediately; fallback response picked from `FALLBACK_VARIANTS` |
| Groq model decommissioned | `llm.py` | Model updated to `llama-3.1-8b-instant`; fallback bank prevents hard failure |
| ML backend unreachable (HTTP timeout/500) | `mlClient.js:callMLBackend()` | Random stress level + `getAdvice()` text + `getFallbackResources()`; warns to console |
| `/predict` endpoint not found (404) | `mlClient.js` | Falls back to legacy `/chat` endpoint automatically |
| MongoDB connection failure | `config/db.js` | Falls back to in-memory array; all CRUD routes still work |
| Crisis keywords in user input | `strategy.py:detect_crisis()` | Bypasses LLM entirely; returns `CRISIS_MESSAGE` with emergency helpline numbers |
| Duplicate submit within 15 seconds | `checkInController.js` | SHA-256 fingerprint dedup map; returns cached result + `deduplicated: true` |
| DistilBERT emotion model fails to load | `main.py` | `emotion_classifier = None`; heuristic keyword-based fallback activates |
| Stress BERT model fails to load | `main.py` | `stress_classifier = None`; emotion-weighted heuristic fallback activates |
| JWT token expired or invalid | `authMiddleware.js` | Returns HTTP 401; React redirects to login |
| User input is whitespace only | `main.py:/predict` | HTTP 400 with clear error message |
| `user_input` mutation bug (chatbot.py) | Fixed in v3.0 | Removed 3-line block that replaced real input with canned text before LLM call |

### 1.3 Tech Stack Used

#### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI component framework |
| React Router DOM | 6.8 | Client-side routing (SPA) |
| Axios | 1.3 | HTTP client for API calls |
| OGL (WebGL) | 1.0.11 | Animated 3D Orb visual component |
| CSS3 | — | Aurora-themed custom styling |
| localStorage | Native | JWT + message history persistence |
| React Testing Library | Bundled | UI component testing |

#### Backend (Node.js)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | 4.18 | HTTP server + routing |
| Mongoose | 7.0 | MongoDB ODM with schema validation |
| bcryptjs | 2.4 | Password hashing (10-round salt) |
| jsonwebtoken | 9.0 | Stateless auth (7-day expiry) |
| Axios | 1.7 | HTTP calls to Python ML backend |
| Jest | 29.7 | Unit + integration test runner |
| Supertest | 6.3 | HTTP endpoint integration tests |

#### ML Backend (Python)
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | Latest | Async REST API framework |
| Uvicorn | Latest | ASGI server |
| Transformers (HuggingFace) | Latest | DistilBERT emotion + BERT stress classifiers |
| Groq SDK | Latest | LLM API client (`llama-3.1-8b-instant`) |
| PyTorch | Latest | Model inference runtime |
| Pydantic | v2 | Request/response schema validation |
| pytest | 9.0 | Python unit and API testing |

#### Infrastructure
| Technology | Purpose |
|-----------|---------|
| MongoDB Atlas | Cloud database (free tier) |
| Render | Deployment (3 services: Python, Node, React static) |
| render.yaml | Infrastructure-as-code blueprint |

### 1.4 Logic and Problem Understanding

**The problem:** Mental health support is expensive, stigmatised, and often unavailable in real time. Students and young adults frequently lack an immediate, non-judgmental outlet to express stress.

**AYASA's approach:** A three-layer AI pipeline:

1. **Classification layer** — Two fine-tuned BERT models classify emotion (6 labels) and stress level (Low / Medium / High) from free-text input. Confidence is temperature-softened and keyword-calibrated to reduce overconfident predictions.

2. **Strategy layer** — A deterministic rule engine (`strategy.py`) maps (stress × emotion) to one of four response strategies: `deep_support`, `calm_validation`, `empathetic_probe`, `light_checkin`, plus a `crisis_override` triggered by 9 crisis keywords.

3. **Generation layer** — The selected strategy is injected into a structured prompt sent to Groq's `llama-3.1-8b-instant` LLM. The prompt instructs the model to: acknowledge feelings, reflect meaning, and ask up to 3 grounded follow-up questions. If the LLM fails, a deterministic fallback variant is returned.

**Key insight:** Crisis detection is 100% deterministic (keyword matching), never delegated to the LLM. This ensures safety-critical responses are reliable and auditable.

### 1.5 Efficiency of the Coding Approach

| Concern | Implementation |
|---------|---------------|
| **Deduplication** | Server-side SHA-256 fingerprint map (15s window) prevents double-billing Groq API on network retries |
| **Model loading** | Models loaded once at startup; subsequent requests reuse in-memory pipelines (no cold-start per request) |
| **Fallback chain** | Every critical path has 3 layers: primary AI → deterministic fallback → in-memory persistence. Zero hard crashes. |
| **DB connection pooling** | MongoDB configured with `maxPoolSize=20`, `minPoolSize=2`, and `serverSelectionTimeoutMS=5000` |
| **Token caching** | JWT decoded middleware-side with a single `jwt.verify()` call; user data fetched lazily (only when needed) |
| **Prompt length** | Capped at 512 tokens for BERT, 220 max_tokens for Groq — keeps inference fast and cost low |
| **DRY** | `mlClient.js` centralises all ML HTTP logic; Python `strategy.py`, `llm.py`, `chatbot.py` each have a single responsibility |
| **Confidence calibration** | Clamped to [0.55, 0.995] + keyword overrides prevent misleadingly extreme confidence scores |

### 1.6 Possible Alternative Approaches Considered

| Decision | Alternative Considered | Why Current Approach Was Chosen |
|----------|----------------------|--------------------------------|
| Groq `llama-3.1-8b-instant` | GPT-4o, Gemini Flash | Groq is free-tier friendly and fastest inference; no vendor lock-in required |
| BERT stress classifier | Rule-based scoring, simple bag-of-words | BERT captures nuanced context (e.g., "I can cope" vs. "I cannot cope") |
| Keyword crisis detection | LLM-based crisis detection | Deterministic is safer — LLM can hallucinate or miss edge cases |
| MongoDB + JSON fallback | SQLite, Supabase, Firebase | Mongoose gives schema validation + Atlas free tier works for demo scale |
| JWT stateless auth | Session cookies, Passport.js | Simpler, works across domains, no server-side session store needed |
| 3 separate Render services | Monorepo with Next.js SSR | Clean separation of concerns; Python + Node cannot be merged anyway |
| `react-scripts` (CRA) | Vite, Next.js | Lower setup cost; RTL + Jest bundled; no ejection needed for test suite |
| In-memory fallback (no DB) | Require DB, fail hard | Allows demo without MongoDB; useful for graders/evaluators |

---

## 2. User Roles & Access Permissions

### 2.1 Role Definitions

| Role | Description |
|------|-------------|
| **Guest** | Unauthenticated visitor; can view the landing page only |
| **Authenticated User** | Registered and logged-in person; full access to chat and personal data |
| **Demo User** | Uses the app without setting a personal Groq key; responses fall back to the deterministic bank |
| **Power User** | Authenticated user who has added their own Groq API key in Profile settings; gets live LLM responses |

### 2.2 Access Levels Per Role

| Feature / Endpoint | Guest | Auth User | Power User |
|-------------------|-------|-----------|------------|
| View landing page | ✅ | ✅ | ✅ |
| Register / Login | ✅ | — | — |
| POST `/api/auth/register` | ✅ | — | — |
| POST `/api/auth/login` | ✅ | — | — |
| GET `/api/checkin/ml-health` | ✅ | ✅ | ✅ |
| GET `/api/auth/me` | ❌ | ✅ | ✅ |
| PUT `/api/auth/profile` | ❌ | ✅ | ✅ |
| PUT `/api/auth/keys` | ❌ | ✅ | ✅ |
| GET `/api/auth/keys-status` | ❌ | ✅ | ✅ |
| POST `/api/checkin/submit` | ❌ | ✅ (fallback LLM) | ✅ (live Groq) |
| GET `/api/checkin/history` | ❌ | ✅ (own data only) | ✅ (own data only) |
| GET `/api/checkin/insights` | ❌ | ✅ | ✅ |
| POST `/api/sessions` | ❌ | ✅ | ✅ |
| GET `/api/sessions` | ❌ | ✅ (own sessions) | ✅ (own sessions) |
| POST `/api/messages` | ❌ | ✅ | ✅ |
| GET `/api/messages/:sessionId` | ❌ | ✅ (own sessions) | ✅ (own sessions) |

### 2.3 Permission to Feature Map

| Permission | Feature / Module |
|-----------|-----------------|
| Public access | Landing page, Register, Login, ML Health status |
| `JWT required` | All check-in, session, and message endpoints |
| `own-data-only` | History, Insights, Sessions, Messages — filtered by `req.user.userId` at DB query level |
| `select: false` (DB) | `password_hash`, `llm_api_key`, `hf_token` never returned unless explicitly selected |
| No admin role | By design — single-tenant personal wellness tool; no cross-user visibility |

---

## 3. Test Cases for System Validation

### 3.1 UI Testing

#### Authentication Tests

| TC-UI-001 | Login — Empty Fields |
|-----------|----------------------|
| Input | Submit login form with no email/password |
| Expected | Form validation triggers; no API call made |
| Status | ✅ Pass |

| TC-UI-002 | Login — Invalid Credentials |
|-----------|---------------------------|
| Input | `bad@example.com` + `wrongpass` |
| Expected | Error message "Invalid email or password" displayed |
| Status | ✅ Pass |

| TC-UI-003 | Login — Valid Credentials |
|-----------|--------------------------|
| Input | Registered email + correct password |
| Expected | JWT stored to `localStorage`; redirect to `/home` |
| Status | ✅ Pass |

| TC-UI-004 | Register — Duplicate Email |
|-----------|---------------------------|
| Input | Email already in database |
| Expected | "Email already registered" error displayed |
| Status | ✅ Pass |

| TC-UI-005 | Register — Success |
|-----------|------------------|
| Input | New email + matching passwords |
| Expected | JWT stored; redirect to Home dashboard |
| Status | ✅ Pass |

| TC-UI-006 | Landing Page Navigation |
|-----------|------------------------|
| Input | Unauthenticated user visits `/` |
| Expected | AYASA branding visible; links to /register and /login present |
| Status | ✅ Pass |

#### Chat Interface Tests

| TC-UI-007 | Send Chat Message |
|-----------|------------------|
| Input | User types "I feel overwhelmed" and submits |
| Expected | User bubble appears; bot response appears within 5s; stress badge shown |
| Status | ✅ Pass (manual) |

| TC-UI-008 | "I'm fine, just tired" Groq Response |
|-----------|--------------------------------------|
| Input | `POST /predict` with `text = "Im fine, just tired"` |
| Expected | `llmUsed: true`; response acknowledges tiredness and probes gently |
| Status | ✅ Pass — Groq responds: *"You say you're fine, but you mention being tired…"* |

| TC-UI-009 | Crisis Input Detection |
|-----------|----------------------|
| Input | Text containing "I want to kill myself" |
| Expected | Deterministic CRISIS_MESSAGE returned; Tele-MANAS helpline shown; `llmUsed: false` |
| Status | ✅ Pass |

| TC-UI-010 | Direct Score Query |
|-----------|------------------|
| Input | "What is my stress score" |
| Expected | Response: "Your current estimated stress level is X with Y% confidence" |
| Status | ✅ Pass |

#### Analytics / History Tests

| TC-UI-011 | Insights — Empty State |
|-----------|----------------------|
| Input | User with no check-ins requests insights |
| Expected | Friendly placeholder text; no error |
| Status | ✅ Pass |

| TC-UI-012 | 7-Day Trend |
|-----------|------------|
| Input | User with ≥2 check-ins in last 7 days |
| Expected | Trend text includes stress label and direction |
| Status | ✅ Pass |

### 3.2 Regression Testing

Re-run after every significant code change using the automated suites below.

#### Python Regression Suite

```bash
cd ml-backend && python -m pytest tests/ -v
```

Key regression checkpoints:
- `test_normalize_stress_label` — 13 parametrised cases; catches any label-mapping breakage
- `test_calibrate_downgrades_false_high` — catches regression of the stress calibration logic
- `test_chatbot_reply_crisis` — crisis bypass must never be broken
- `test_generate_response_calls_groq_and_returns_content` — Groq model name change catches decommission

#### Node Regression Suite

```bash
cd server && npm test
```

Key regression checkpoints:
- `auth.test.js` — 10 tests covering all auth paths including JWT decode
- `checkin.test.js` — 13 tests covering dedup, ML fallback, insights generation
- `ML backend unavailable` test — ensures graceful degradation is never broken

#### React Regression Suite

```bash
cd client && npm test -- --watchAll=false
```

Key regression checkpoints:
- Login/Register form rendering + submission + localStorage writes
- Landing page link presence
- Error message display on API failure

### 3.3 Test Results

#### Latest Run — April 2026

| Suite | Tool | Tests Run | Passed | Failed | Rework |
|-------|------|-----------|--------|--------|--------|
| Python unit + API | pytest | 58 | 58 | 0 | — |
| Node unit + integration | Jest + Supertest | 23 | 23 | 0 | — |
| React UI | React Testing Library | 9 | 9 | 0 | — |
| **Total** | | **90** | **90** | **0** | — |

#### Rework Log

| Issue | Root Cause | Fix Applied |
|-------|-----------|------------|
| `test_chatbot_reply_fallback_when_no_key` failing | Mocked `groq` module returned truthy MagicMock, bypassing the "no key" guard | Patched `chatbot.generate_response` directly to return `(None, error)` |
| Auth tests returning 500 instead of 409/401 | Mongoose query chain (`.findOne().lean()`) not mocked correctly; `mockResolvedValue` doesn't chain | Changed to `mockReturnValue({ lean: jest.fn().mockResolvedValue(...) })` |
| Groq `llmError: model_decommissioned` | `llama3-8b-8192` retired by Groq | Updated to `llama-3.1-8b-instant` in `llm.py`, `.env`, `.env.example`, `render.yaml` |

---

## 4. Deployment

### 4.1 Cloud Platform: Render

AYASA is deployed as three separate Render services defined in `render.yaml` (Infrastructure-as-Code).

#### Service Architecture

```
Internet
   │
   ▼
[ayasa-client]          React Static Site (Render CDN)
   │  REACT_APP_API_URL
   ▼
[ayasa-server]          Node.js Web Service (port 5000)
   │  ML_BACKEND_URL (auto-wired by Render fromService)
   ▼
[ayasa-ml-backend]      Python/FastAPI Web Service (port 8000)
   │
   ▼
[MongoDB Atlas]         Free tier cluster (external)
[Groq API]              llama-3.1-8b-instant (external)
```

#### Deployment Steps

```bash
# 1. Ensure render.yaml is at repo root (already done)
# 2. Push to GitHub
git push origin main

# 3. In Render Dashboard:
#    New → Blueprint → Connect GitHub repo → Select render.yaml
#
# 4. Set secret environment variables per service:
#    ayasa-ml-backend:  GROQ_API_KEY, HF_TOKEN, RUNTIME_SYNC_TOKEN
#    ayasa-server:      JWT_SECRET, MONGODB_URI, RUNTIME_SYNC_TOKEN
#    (ML_BACKEND_URL auto-injected from ayasa-ml-backend service URL)
#    (REACT_APP_API_URL auto-injected from ayasa-server service URL)

# 5. Render auto-builds and deploys all three services
```

#### Live URLs (after deployment)

| Service | URL Pattern |
|---------|------------|
| React Frontend | `https://ayasa-client.onrender.com` |
| Node API | `https://ayasa-server.onrender.com` |
| ML Backend | `https://ayasa-ml-backend.onrender.com` |
| ML Health Check | `https://ayasa-ml-backend.onrender.com/health` |

> **Note:** Render free-tier services spin down after 15 minutes of inactivity. First request after sleep takes ~30–60 seconds (cold start). Upgrade to Starter ($7/mo) to keep always-on.

#### Local Development URLs (currently running)

| Service | URL |
|---------|-----|
| React Frontend | http://localhost:3000 |
| Node API | http://localhost:5000 |
| ML Backend | http://localhost:8000 |
| ML Health | http://localhost:8000/health |

### 4.2 Challenges Faced and Resolutions

| Challenge | Impact | Resolution |
|-----------|--------|-----------|
| **Groq model `llama3-8b-8192` decommissioned** | All LLM responses returning error 400; `llmUsed: false` | Updated `DEFAULT_GROQ_MODEL` in `llm.py` to `llama-3.1-8b-instant`; updated `.env`, `.env.example`, `render.yaml` |
| **`prompt.py` dead code** | Confusion about which prompt-building function was active | Confirmed via `grep` that `prompt.py` was never imported; deleted the file |
| **`chatbot.py` user_input mutation bug** | LLM was receiving a canned response as if it were the user's message | Removed 3-line block that replaced `user_input` with example text before the `generate_response()` call |
| **Mongoose query chain not mockable with `mockResolvedValue`** | Auth tests returning 500 from uncaught TypeError | Changed all Mongoose chain mocks to `mockReturnValue({ lean/select: jest.fn().mockResolvedValue(...) })` |
| **Port 8000 held by old uvicorn process on Windows** | New ML backend couldn't start after model change | Used `Stop-Process -Id <PID> -Force` in PowerShell to release port |
| **PyTorch + Transformers cold start time** | ~8–12 second startup delay on first deploy | Models load once at startup (not per-request); Render health check path `/health` gives warmup time |
| **HF Token not set warning** | Model download rate-limited without token | Added `HF_TOKEN` to `render.yaml` as a secret; in-memory model caching avoids repeated downloads |
| **CORS policy for 3-service architecture** | React cannot call Node or Python directly in production | Node CORS middleware uses `allow_origins: ["*"]` (suitable for demo); production should whitelist Render domains |
