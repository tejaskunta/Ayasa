"""FastAPI entry point for the model service.

Endpoints:
  GET  /health   - liveness + which mode the service is in
  GET  /version  - contract version + the stress vocabulary it speaks
  POST /analyze  - the one endpoint everything else uses

Note there is exactly ONE analysis endpoint. The original project had both
/predict and a legacy /chat, and the client had to fall back between them.
That dual-contract was a source of subtle bugs. One endpoint, one schema.
"""

from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contract import CONTRACT_VERSION, STRESS_LEVELS
from model import MODEL_NAME, Analyzer
from schemas import AnalyzeRequest, AnalyzeResponse, HealthResponse, VersionResponse

load_dotenv()

app = FastAPI(title="Ayasa Model Service", version=CONTRACT_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # this service is internal; the Express API is the public edge
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = Analyzer()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_mode=analyzer.mode,
        model_name=MODEL_NAME,
        contract_version=CONTRACT_VERSION,
    )


@app.get("/version", response_model=VersionResponse)
def version() -> VersionResponse:
    return VersionResponse(contract_version=CONTRACT_VERSION, stress_levels=list(STRESS_LEVELS))


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze text and return a typed, self-describing result.

    FastAPI validates the request; the response_model guarantees the shape. If
    anything unexpected happens inside, Pydantic raises before the client ever
    sees a malformed payload.
    """
    return analyzer.analyze(request)