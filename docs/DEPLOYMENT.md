# AYASA Deployment Guide

This guide reflects the current low-change deployment plan:

- Client: Vercel
- API server: Cloud Run or Railway container service
- ML backend: Cloud Run container service
- Database: MongoDB Atlas

## 1. Client on Vercel

Deploy the `client/` folder as a Vercel project.

Recommended project settings:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `build`
- Install command: default Vercel install

Environment variables:

- `REACT_APP_API_URL=https://YOUR_API_SERVICE_URL`

Example:

- `REACT_APP_API_URL=https://ayasa-server-xxxxxx.a.run.app`

Notes:

- The React app accepts either a full URL or a bare hostname.
- The SPA rewrite is already in `client/vercel.json`.

## 2. API Server on Cloud Run

Deploy the `server/` folder as a container service using `server/Dockerfile`.

Recommended runtime settings:

- Container port: handled by the Dockerfile and `PORT`
- Memory: 512 MiB minimum, 1 GiB preferred
- CPU: 1 vCPU
- Public access: enabled for the browser client

Environment variables:

- `NODE_ENV=production`
- `MONGODB_URI=mongodb+srv://...`
- `JWT_SECRET=your-long-random-secret`
- `ML_BACKEND_URL=https://YOUR_ML_SERVICE_URL`
- `RUNTIME_SYNC_TOKEN=same-token-used-by-ml-backend`

Example:

- `ML_BACKEND_URL=https://ayasa-ml-backend-xxxxxx.a.run.app`

## 3. ML Backend on Cloud Run

Deploy the `ml-backend/` folder as a container service using `ml-backend/Dockerfile`.

Recommended runtime settings:

- Container port: handled by the Dockerfile and `PORT`
- Memory: 512 MiB minimum for heuristic mode, 1 GiB safer
- CPU: 1 vCPU
- Public access: enabled so the API server can call it

Environment variables:

- `GROQ_API_KEY=your_groq_api_key`
- `GROQ_MODEL=llama-3.1-8b-instant`
- `HF_TOKEN=your_huggingface_token`
- `RUNTIME_SYNC_TOKEN=same-token-used-by-server`
- `ENABLE_HF_MODELS=false`

Notes:

- `ENABLE_HF_MODELS=false` keeps startup lightweight and avoids the old memory issue.
- Only set it to `true` if you intentionally want to load the heavier Hugging Face models.

## 4. MongoDB Atlas

Create or reuse one Atlas cluster and copy its connection string into the API server.

Recommended database settings:

- Database user with only the required privileges
- Network access restricted to your cloud services if possible
- Connection string stored only as a secret

## 5. Required Secret Matching

These values must match across services:

- `RUNTIME_SYNC_TOKEN` on the API server
- `RUNTIME_SYNC_TOKEN` on the ML backend

These values must be kept secret:

- `MONGODB_URI`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `HF_TOKEN`

## 6. Suggested Deployment Order

1. Deploy MongoDB Atlas and confirm the connection string works.
2. Deploy the ML backend and copy its public URL.
3. Deploy the API server with `ML_BACKEND_URL` pointing to the ML backend.
4. Deploy the client with `REACT_APP_API_URL` pointing to the API server.
5. Open the Vercel app and test login, chat, and check-in flows end to end.

## 7. Example Cloud Run Flow

If you deploy with container images, the flow is:

1. Build and push the image from `server/`.
2. Deploy the image as `ayasa-server`.
3. Build and push the image from `ml-backend/`.
4. Deploy the image as `ayasa-ml-backend`.
5. Copy the generated URLs into the client and API env vars.

## 8. Quick Verification Checklist

- Client loads on Vercel
- Login and register work
- API health route responds
- ML backend health route responds
- Chat request reaches the API server
- API server reaches the ML backend
- MongoDB writes succeed
