# Builder stage: install dependencies
FROM python:3.11-slim as builder

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1

COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage: lean image with only what's needed
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

# Copy only installed packages from builder (not build tools)
COPY --from=builder /root/.local /root/.local

# Copy only essential app files (exclude tests, .git, __pycache__, etc via .dockerignore)
COPY main.py llm.py strategy.py chatbot.py ./

EXPOSE 8080

CMD ["/bin/sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]