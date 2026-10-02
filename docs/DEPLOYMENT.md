# Ayasa Deployment Guide

Ayasa is deployed as three independent services:

| Service | Platform | Repo path | Public URL |
| --- | --- | --- | --- |
| Client (React SPA) | Vercel | `client/` | https://ayasa-client.vercel.app |
| API server (Express) | Vercel (serverless) | `server/` | https://ayasa-server.vercel.app |
| Model service (FastAPI) | Modal | `model-service/` | https://ganeshtejaskunta--ayasa-model-service-web.modal.run |

Database: MongoDB Atlas.

## 1. MongoDB Atlas

1. Create a cluster (free tier is enough) and a database user.
2. Copy the connection string.
3. In **Network Access**, allow your hosting provider's IPs. Vercel's outbound
   addresses change per deployment, so the simplest options are Vercel's
   official Atlas integration or an open CIDR (`0.0.0.0/0`) while the
   credentials themselves stay secret.

## 2. Model service on Modal

The model service needs a persistent container with the transformer stack,
which exceeds serverless limits — so it runs on Modal, defined in
`model-service/modal_app.py`.

```bash
cd model-service
python -m venv .venv
.venv/bin/pip install -r requirements.txt   # includes modal
modal deploy modal_app.py
```

Set the app's secrets (`GROQ_API_KEY`, `HF_TOKEN` if needed) in the Modal
dashboard. The web endpoint is created automatically by the `@modal.asgi_app()`
function; note its URL for the server's `MODEL_SERVICE_URL`.

Health check: `GET {MODEL_SERVICE_URL}/health`.

## 3. API server on Vercel

1. Import this repository as a Vercel project with root directory `server`.
2. Framework preset: **Other**. Build command: none. Output directory: none.
   The serverless entrypoint is `server/api/index.js` (already configured in
   `server/vercel.json`).
3. Set `Max Duration` to 30s (chat requests call the model service).

Environment variables (production):

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | long random string |
| `MODEL_SERVICE_URL` | the Modal endpoint URL from step 2 |
| `MODEL_TIMEOUT_MS` | `8000` |
| `CLIENT_ORIGIN` | `https://ayasa-client.vercel.app` |
| `GROQ_API_KEY` | optional — reply wording layer only |

> `CLIENT_ORIGIN` must contain no trailing whitespace or newline characters:
> a stray `\r` in a CORS header value makes Node throw `ERR_INVALID_CHAR` on
> every response. The code trims it defensively, but clean env values are the
> real fix.

Health check: `GET https://ayasa-server.vercel.app/api/health` should return
`{ "status": "ok", ... }` with the model service reported as reachable.

## 4. Client on Vercel

1. Import this repository as a second Vercel project with root directory
   `client`.
2. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
3. Environment variable: `VITE_API_URL=https://ayasa-server.vercel.app`.

`VITE_API_URL` is inlined at build time, so it must be set **before** the
deployment builds. The SPA fallback rewrite is configured in
`client/vercel.json`.

## 5. Verification checklist

- [ ] `GET {server}/api/health` returns ok with `model.reachable: true`
- [ ] Register a new account on the live client (catches DB/allowlist issues)
- [ ] Log in, send a chat message, see a reply with stress/emotion pills
- [ ] Post a check-in and confirm it appears on the Insights page
- [ ] Send crisis text and confirm the fixed helpline response

## 6. Local development

Use `docker compose up --build` for the full stack, or the three-terminal
flow in the repository README. Local runs do not need Modal — the FastAPI
service starts in `rules_only` mode with zero ML dependencies.
