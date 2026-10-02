"""Ayasa model service on Modal — serverless CPU, scales to zero.

Why Modal instead of the Render free tier: the real transformer needs
torch (~300 MB resident) plus the BERT checkpoints (~700 MB), which OOMs
a 512 MB instance. Modal gives 2 GB CPU containers, caches the Hugging
Face weights in a Volume so cold starts never re-download, and scales to
zero when nobody is checking in. Hobby usage fits inside the free
monthly credits.

One-time setup (from model-service/, using the venv python):
    .venv\\Scripts\\python.exe -m modal token new   # opens a browser login

Optional, to keep the Groq reply layer (enter the key when prompted):
    .venv\\Scripts\\python.exe -m modal secret create ayasa-groq GROQ_API_KEY=*** GROQ_MODEL=qwen/qwen3.8-27b

Deploy:
    .venv\\Scripts\\python.exe -m modal deploy modal_app.py

The printed URL (https://<user>--ayasa-model-service-web.modal.run) becomes
the Express server's MODEL_SERVICE_URL.
"""

from __future__ import annotations

import modal

HF_CACHE = "/root/.cache/huggingface"

# Ship only the service source. .venv/.env/__pycache__/tests stay out of
# the image build context.
IMAGE_IGNORE = [
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    "tests",
    ".env",
    ".env.example",
    "modal_app.py",
    "Dockerfile",
    "requirements-ml.txt",
    "requirements.txt",
    "pytest.ini",
]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi==0.115.0",
        "uvicorn[standard]==0.30.6",
        "pydantic==2.9.2",
        "python-dotenv==1.0.1",
        "httpx==0.27.2",
        # The ML stack — this is the whole reason to run on Modal.
        "transformers==4.40.2",
        "torch==2.2.0",
        "numpy<2",
    )
    .env({"ENABLE_HF_MODELS": "true"})
    .add_local_dir(".", remote_path="/root/ayasa", ignore=IMAGE_IGNORE)
)

app = modal.App("ayasa-model-service")


@app.function(
    image=image,
    cpu=1.0,
    memory=2048,
    timeout=120,
    # Stay warm 10 min after the last check-in so a chat session never
    # eats a cold start between messages.
    scaledown_window=600,
    volumes={HF_CACHE: modal.Volume.from_name("ayasa-hf-cache", create_if_missing=True)},
    secrets=[modal.Secret.from_name("ayasa-groq")],
)
@modal.concurrent(max_inputs=8)
@modal.asgi_app()
def web():
    # Import inside the container: main.py builds the Analyzer, which starts
    # loading the BERT weights in a background thread. Until loading finishes
    # the service answers in rules_only mode — a designed degrade, not an error.
    import sys

    sys.path.insert(0, "/root/ayasa")
    from main import app as fastapi_app  # noqa: E402

    return fastapi_app
