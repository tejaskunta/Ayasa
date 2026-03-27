"""AYASA hybrid stress analysis API.

Primary endpoint: POST /predict
Compatibility endpoint: POST /chat
"""

from __future__ import annotations

import math
import os
from importlib import import_module
from pathlib import Path
from typing import Any, Dict, List, TypedDict, Tuple, cast

import joblib
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline

genai = cast(Any, import_module("google.generativeai"))

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent


def resolve_existing_path(candidates: List[Path]) -> Path | None:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


STRESS_MODEL_DIR = resolve_existing_path(
    [
        BASE_DIR / "stress_model",
        BASE_DIR / "stress_analysis" / "bert_stress_model",
    ]
)

FEATURE_SCALER_PATH = resolve_existing_path(
    [
        BASE_DIR / "feature_scaler.pkl",
        BASE_DIR / "stress_analysis" / "feature_scaler.pkl",
    ]
)

META_MODEL_PATH = resolve_existing_path(
    [
        BASE_DIR / "meta_model.pkl",
        BASE_DIR / "meta_model(3).pkl",
        BASE_DIR / "stress_analysis" / "meta_model.pkl",
        BASE_DIR / "stress_analysis" / "meta_model(3).pkl",
    ]
)

EMOTION_LABELS = ["joy", "anger", "sadness", "fear", "love", "surprise"]
STRESS_LEVELS = ["Low", "Medium", "High"]
STRESS_LABEL_INDEX_MAP = {0: "Low", 1: "Medium", 2: "High"}

DIRECT_SCORE_TRIGGERS = [
    "stress score",
    "give me stress score",
    "stress value",
    "stress rating",
    "how stressed am i",
    "stress levels",
]

RESOURCE_MAP = {
    "Low": [
        {
            "title": "Box Breathing Exercise",
            "url": "https://themindclan.com/exercises/box-breathing-exercise-online/",
        },
        {
            "title": "Pomodoro Focus Timer",
            "url": "https://pomofocus.io/",
        },
    ],
    "Medium": [
        {
            "title": "Guided Meditation",
            "url": "https://www.youtube.com/watch?v=inpok4MKVLM",
        },
        {
            "title": "Stress Management Tips",
            "url": "https://www.mind.org.uk/information-support/types-of-mental-health-problems/stress/",
        },
    ],
    "High": [
        {
            "title": "KIRAN Mental Health Helpline",
            "url": "https://telemanas.mohfw.gov.in/home",
        },
        {
            "title": "AASRA 24/7 Helpline",
            "url": "http://www.aasra.info/helpline.html",
        },
    ],
}

FALLBACK_RESPONSES = {
    "Low": "You are doing a good job staying grounded. Keep taking small restorative breaks.",
    "Medium": "You may be carrying moderate stress right now. A short breathing routine and one small next step can help.",
    "High": "Your stress appears elevated. Please slow down, reach out to someone you trust, and consider professional support.",
}

app = FastAPI(title="AYASA ML Backend", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading emotion classifier...")
emotion_classifier = pipeline(
    "text-classification",
    model="bhadresh-savani/distilbert-base-uncased-emotion",
    top_k=None,
)

stress_classifier = None
if STRESS_MODEL_DIR:
    try:
        print(f"Loading stress classifier from: {STRESS_MODEL_DIR}")
        stress_classifier = pipeline(
            "text-classification",
            model=str(STRESS_MODEL_DIR),
            tokenizer=str(STRESS_MODEL_DIR),
            top_k=None,
        )
    except Exception as exc:
        print(f"Stress model failed to load: {exc}")
else:
    print("Stress model directory not found. Falling back to heuristic stress inference.")

feature_scaler = None
if FEATURE_SCALER_PATH:
    try:
        feature_scaler = joblib.load(FEATURE_SCALER_PATH)
        print(f"Loaded feature scaler: {FEATURE_SCALER_PATH}")
    except Exception as exc:
        print(f"Feature scaler load failed: {exc}")

meta_model = None
if META_MODEL_PATH:
    try:
        meta_model = joblib.load(META_MODEL_PATH)
        print(f"Loaded meta model: {META_MODEL_PATH}")
    except Exception as exc:
        print(f"Meta model load failed: {exc}")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# In-memory conversation context, kept to last 3 turns per user.
chat_memory: Dict[str, List[Dict[str, str]]] = {}


class FeatureMetadata(TypedDict):
    emotion_probs: Dict[str, float]
    top_emotion: str
    top_emotion_prob: float
    stress_probs: Dict[str, float]


class PredictionResult(TypedDict):
    label: str
    confidence: float
    emotion: str
    emotion_score: float


class PredictionPayload(TypedDict):
    stressLevel: str
    emotion: str
    confidence: float
    emotionScore: float
    ayasaResponse: str
    resources: List["ResourceItem"]
    directScoreQuery: bool
    geminiUsed: bool
    geminiError: str | None


class ResourceItem(BaseModel):
    title: str
    url: str


class PredictRequest(BaseModel):
    text: str
    user_id: str = "demo_user"
    gemini_api_key: str = ""


class PredictResponse(BaseModel):
    stressLevel: str
    emotion: str
    confidence: float
    ayasaResponse: str
    resources: List[ResourceItem] = Field(default_factory=list)
    directScoreQuery: bool
    geminiUsed: bool = False
    geminiError: str | None = None


class ChatRequest(BaseModel):
    message: str
    gemini_api_key: str = ""
    user_id: str = "demo_user"


class ChatResponse(BaseModel):
    message: str
    emotion: str
    emotion_score: float
    stress: str
    ayasa_response: str


class GeminiResult(TypedDict):
    text: str
    used: bool
    error: str | None


GEMINI_MODEL_CANDIDATES = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]


def contextual_fallback_response(message: str, stress: str) -> str:
    lowered = message.lower()
    normalized = " ".join(lowered.split())

    greeting_phrases = {
        "hi",
        "hello",
        "hey",
        "hii",
        "heyy",
        "how are you",
        "how are u",
        "how r u",
        "sup",
        "yo",
    }

    if normalized in greeting_phrases:
        return (
            "Hey, I am here with you. If you want, share how your day feels in one line "
            "and I will suggest one small step to help."
        )

    # Very short messages are often check-ins, so keep the tone neutral and inviting.
    if len(normalized) <= 15 and stress == "High":
        return (
            "Thanks for checking in. Want a quick reset? Try 4 slow breaths, then tell me "
            "what feels hardest right now in one sentence."
        )

    if "exercise" in lowered or "exercises" in lowered:
        return (
            "Try this now: 1) Box breathing for 2 minutes (inhale 4, hold 4, exhale 4, hold 4). "
            "2) Shoulder release for 60 seconds (lift shoulders up, hold 3 seconds, release). "
            "3) 5-4-3-2-1 grounding (name 5 things you see, 4 feel, 3 hear, 2 smell, 1 taste)."
        )

    if "help me" in lowered or "help" == lowered.strip():
        return (
            "I am here with you. Let's do one quick reset together: place both feet on the floor, "
            "take 5 slow breaths, then drink a glass of water. After that, tell me one small task you can do in 5 minutes."
        )

    if "not" in lowered and "stress" in lowered:
        return (
            "Thanks for clarifying. Let's recalibrate: on a 0-10 scale, what feels most accurate right now? "
            "Then share the main trigger and one body signal so I can refine the next suggestion."
        )

    if "another stress check" in lowered or "another stress checkup" in lowered:
        return (
            "Absolutely. Start a new check-in by sharing three quick points: "
            "1) how you feel now, 2) top trigger, 3) any physical symptom."
        )

    return FALLBACK_RESPONSES.get(stress, "Take a slow breath and do one manageable step next.")


def extract_gemini_text(response: object) -> str:
    direct_text = str(getattr(response, "text", "") or "").strip()
    if direct_text:
        return direct_text

    candidates = getattr(response, "candidates", None)
    if not candidates:
        return ""

    try:
        first = candidates[0]
        content = getattr(first, "content", None)
        parts = getattr(content, "parts", None) if content is not None else None
        if parts:
            fragments: List[str] = []
            for part in parts:
                text_value = str(getattr(part, "text", "") or "").strip()
                if text_value:
                    fragments.append(text_value)
            return " ".join(fragments).strip()
    except Exception:
        return ""

    return ""


def normalize_stress_label(raw_label: object) -> str | None:
    label = str(raw_label).strip().lower()
    if "low" in label:
        return "Low"
    if "medium" in label or "moderate" in label:
        return "Medium"
    if "high" in label:
        return "High"

    if label.startswith("label_"):
        suffix = label.split("_", maxsplit=1)[-1]
        if suffix.isdigit():
            return STRESS_LABEL_INDEX_MAP.get(int(suffix))
    if label.isdigit():
        return STRESS_LABEL_INDEX_MAP.get(int(label))
    return None


def normalize_distribution(raw_output: object) -> List[Dict[str, float]]:
    if isinstance(raw_output, list) and raw_output and isinstance(raw_output[0], list):
        return raw_output[0]
    if isinstance(raw_output, list):
        return raw_output
    return []


def safe_entropy(values: List[float]) -> float:
    total = float(sum(values))
    if total <= 0:
        return 0.0
    normalized = [max(v / total, 1e-12) for v in values]
    return float(-sum(v * math.log(v) for v in normalized))


def get_emotion_distribution(text: str) -> Tuple[Dict[str, float], str, float]:
    raw = emotion_classifier(text[:512])
    rows = normalize_distribution(raw)
    probs = {label: 0.0 for label in EMOTION_LABELS}

    for row in rows:
        label = str(row.get("label", "")).lower().strip()
        if label in probs:
            probs[label] = float(row.get("score", 0.0))

    top_emotion = max(probs, key=lambda label: probs[label])
    return probs, top_emotion, probs[top_emotion]


def get_stress_distribution(text: str, emotion_probs: Dict[str, float]) -> Dict[str, float]:
    if stress_classifier is None:
        high_signal = emotion_probs.get("anger", 0.0) + emotion_probs.get("sadness", 0.0) + emotion_probs.get("fear", 0.0)
        low_signal = emotion_probs.get("joy", 0.0) + emotion_probs.get("love", 0.0)
        if high_signal >= 0.6:
            return {"Low": 0.1, "Medium": 0.2, "High": 0.7}
        if low_signal >= 0.6:
            return {"Low": 0.7, "Medium": 0.2, "High": 0.1}
        return {"Low": 0.2, "Medium": 0.6, "High": 0.2}

    raw = stress_classifier(text[:512])
    rows = normalize_distribution(raw)
    probs = {"Low": 0.0, "Medium": 0.0, "High": 0.0}

    for row in rows:
        mapped = normalize_stress_label(row.get("label", ""))
        if mapped:
            probs[mapped] = max(probs[mapped], float(row.get("score", 0.0)))

    total = float(sum(probs.values()))
    if total <= 0:
        return {"Low": 0.2, "Medium": 0.6, "High": 0.2}
    return {k: v / total for k, v in probs.items()}


def build_feature_vector(text: str) -> Tuple[np.ndarray, FeatureMetadata]:
    emotion_probs, top_emotion, top_emotion_prob = get_emotion_distribution(text)
    stress_probs = get_stress_distribution(text, emotion_probs)

    low = stress_probs["Low"]
    medium = stress_probs["Medium"]
    high = stress_probs["High"]

    sorted_stress = sorted([low, medium, high], reverse=True)
    max_prob = sorted_stress[0]
    confidence_gap = sorted_stress[0] - sorted_stress[1]

    neg_emotion = emotion_probs["anger"] + emotion_probs["sadness"] + emotion_probs["fear"]
    emotion_entropy = safe_entropy(list(emotion_probs.values()))

    features = np.array(
        [
            low,
            medium,
            high,
            max_prob,
            confidence_gap,
            emotion_probs["joy"],
            emotion_probs["anger"],
            emotion_probs["sadness"],
            emotion_probs["fear"],
            emotion_probs["love"],
            emotion_probs["surprise"],
            neg_emotion,
            emotion_entropy,
        ],
        dtype=np.float32,
    ).reshape(1, -1)

    def fit_feature_count(matrix: np.ndarray, expected_count: int) -> np.ndarray:
        current_count = int(matrix.shape[1])
        if current_count == expected_count:
            return matrix
        if current_count > expected_count:
            return matrix[:, :expected_count]
        pad_count = expected_count - current_count
        padding = np.zeros((matrix.shape[0], pad_count), dtype=matrix.dtype)
        return np.concatenate([matrix, padding], axis=1)

    scaled = features
    if feature_scaler is not None:
        expected = int(getattr(feature_scaler, "n_features_in_", features.shape[1]))
        prepared = fit_feature_count(features, expected)
        try:
            scaled = feature_scaler.transform(prepared)
        except Exception as exc:
            print(f"Feature scaler transform failed, using unscaled features: {exc}")
            scaled = prepared

    metadata: FeatureMetadata = {
        "emotion_probs": emotion_probs,
        "top_emotion": top_emotion,
        "top_emotion_prob": float(top_emotion_prob),
        "stress_probs": stress_probs,
    }
    return scaled, metadata


def predict(text: str) -> PredictionResult:
    scaled_features, metadata = build_feature_vector(text)
    stress_probs: Dict[str, float] = metadata["stress_probs"]

    predicted_probs = {"Low": 0.0, "Medium": 0.0, "High": 0.0}

    if meta_model is not None and hasattr(meta_model, "predict_proba"):
        try:
            expected = int(getattr(meta_model, "n_features_in_", scaled_features.shape[1]))
            if scaled_features.shape[1] != expected:
                if scaled_features.shape[1] > expected:
                    model_input = scaled_features[:, :expected]
                else:
                    pad_count = expected - int(scaled_features.shape[1])
                    padding = np.zeros((scaled_features.shape[0], pad_count), dtype=scaled_features.dtype)
                    model_input = np.concatenate([scaled_features, padding], axis=1)
            else:
                model_input = scaled_features

            proba = meta_model.predict_proba(model_input)[0]
            classes = getattr(meta_model, "classes_", [0, 1, 2])
            for idx, cls in enumerate(classes):
                mapped = normalize_stress_label(cls)
                if mapped and idx < len(proba):
                    predicted_probs[mapped] = float(proba[idx])
        except Exception as exc:
            print(f"Meta model predict_proba failed, using stress model probabilities: {exc}")

    if sum(predicted_probs.values()) <= 0:
        predicted_probs = stress_probs

    label = max(predicted_probs, key=lambda stress: predicted_probs[stress])
    confidence = float(predicted_probs[label])

    return {
        "label": label,
        "confidence": confidence,
        "emotion": metadata["top_emotion"],
        "emotion_score": round(float(metadata["top_emotion_prob"]) * 100, 2),
    }


def is_direct_score_query(text: str) -> bool:
    lowered = text.lower()
    return any(trigger in lowered for trigger in DIRECT_SCORE_TRIGGERS)


def update_memory(user_id: str, user_text: str, ayasa_response: str, stress: str, emotion: str) -> None:
    turns = chat_memory.get(user_id, [])
    turns.append(
        {
            "user": user_text,
            "assistant": ayasa_response,
            "stress": stress,
            "emotion": emotion,
        }
    )
    chat_memory[user_id] = turns[-3:]


def get_memory_context(user_id: str) -> str:
    turns = chat_memory.get(user_id, [])
    if not turns:
        return "No previous conversation context."

    lines = []
    for idx, turn in enumerate(turns, start=1):
        lines.append(
            f"{idx}. User: {turn['user']} | Emotion: {turn['emotion']} | Stress: {turn['stress']} | AYASA: {turn['assistant']}"
        )
    return "\n".join(lines)


def generate_ai_response(
    message: str,
    emotion: str,
    stress: str,
    user_id: str,
    request_api_key: str = "",
) -> GeminiResult:
    api_key = (request_api_key or "").strip() or GEMINI_API_KEY
    if not api_key:
        return {
            "text": contextual_fallback_response(message, stress),
            "used": False,
            "error": "Missing Gemini API key",
        }

    prompt = f"""You are AYASA, a warm and supportive mental-health assistant.

Conversation memory (last 3 turns):
{get_memory_context(user_id)}

Latest user message:
{message}

Detected emotion: {emotion}
Predicted stress level: {stress}

Respond in 2-4 supportive sentences.
Use clear, practical coping advice.
Avoid clinical wording.
"""

    last_error: str | None = None
    genai.configure(api_key=api_key)

    for model_name in GEMINI_MODEL_CANDIDATES:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=180,
                    temperature=0.6,
                ),
            )
            text = extract_gemini_text(response)
            if text:
                return {
                    "text": text,
                    "used": True,
                    "error": None,
                }
            last_error = f"{model_name}: Empty response"
        except Exception as exc:
            last_error = f"{model_name}: {exc}"
            print(f"Gemini generation error -> {last_error}")

    return {
        "text": contextual_fallback_response(message, stress),
        "used": False,
        "error": last_error or "Gemini request failed",
    }


def run_prediction(text: str, user_id: str, gemini_api_key: str) -> PredictionPayload:
    result = predict(text)
    stress_level = str(result["label"])
    emotion = str(result["emotion"])
    confidence = float(result["confidence"])
    direct_query = is_direct_score_query(text)
    resources = [ResourceItem(**item) for item in RESOURCE_MAP.get(stress_level, RESOURCE_MAP["Medium"])]

    gemini_used = False
    gemini_error: str | None = None

    if direct_query:
        ayasa_response = (
            f"Your current estimated stress level is {stress_level} "
            f"with {round(confidence * 100)}% confidence."
        )
    else:
        gemini_result = generate_ai_response(text, emotion, stress_level, user_id, gemini_api_key)
        ayasa_response = gemini_result["text"]
        gemini_used = bool(gemini_result["used"])
        gemini_error = gemini_result["error"]

    update_memory(user_id, text, ayasa_response, stress_level, emotion)

    return {
        "stressLevel": stress_level,
        "emotion": emotion,
        "confidence": round(confidence, 4),
        "emotionScore": float(result["emotion_score"]),
        "ayasaResponse": ayasa_response,
        "resources": resources,
        "directScoreQuery": direct_query,
        "geminiUsed": gemini_used,
        "geminiError": gemini_error,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(request: PredictRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    payload = run_prediction(text, request.user_id or "demo_user", request.gemini_api_key)
    return PredictResponse(
        stressLevel=str(payload["stressLevel"]),
        emotion=str(payload["emotion"]),
        confidence=float(payload["confidence"]),
        ayasaResponse=str(payload["ayasaResponse"]),
        resources=payload["resources"],
        directScoreQuery=bool(payload["directScoreQuery"]),
        geminiUsed=bool(payload["geminiUsed"]),
        geminiError=payload["geminiError"],
    )


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    payload = run_prediction(message, request.user_id or "demo_user", request.gemini_api_key)
    stress_map = {
        "Low": "Low Stress",
        "Medium": "Moderate Stress",
        "High": "High Stress",
    }

    return ChatResponse(
        message=message,
        emotion=str(payload["emotion"]),
        emotion_score=float(payload["emotionScore"]),
        stress=stress_map.get(str(payload["stressLevel"]), "Moderate Stress"),
        ayasa_response=str(payload["ayasaResponse"]),
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AYASA ML Backend",
        "stress_model_loaded": stress_classifier is not None,
        "emotion_model_loaded": emotion_classifier is not None,
        "meta_model_loaded": meta_model is not None,
        "feature_scaler_loaded": feature_scaler is not None,
        "gemini_active": bool(GEMINI_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
