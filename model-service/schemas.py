"""Pydantic request/response models — the wire format of /analyze."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from contract import ModelMode, StressLevel


class AnalyzeRequest(BaseModel):
    # Allow fields like model_name/model_mode that would otherwise clash with
    # Pydantic's "model_" protected namespace.
    model_config = ConfigDict(protected_namespaces=())

    text: str = Field(..., min_length=1, max_length=4000)
    user_id: str = "anonymous"


class EmotionScore(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    label: str
    score: float


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    # --- contract metadata: lets any client know what it is talking to ---
    contract_version: str
    model_mode: ModelMode          # "transformer" or "rules_only"
    model_name: str
    is_safety_override: bool = False

    # --- the actual analysis ---
    stress_level: StressLevel
    confidence: float = Field(ge=0.0, le=1.0)
    dominant_emotion: str
    emotions: list[EmotionScore]

    # --- what the product should DO with the analysis (kept separate from UI) ---
    strategy: Literal[
        "crisis_override",
        "deep_support",
        "calm_validation",
        "empathetic_probe",
        "light_checkin",
    ]
    reply: str
    llm_used: bool = False


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: Literal["ok"]
    model_mode: ModelMode
    model_name: str
    contract_version: str


class VersionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    contract_version: str
    stress_levels: list[str]