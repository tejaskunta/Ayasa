"""AYASA hybrid stress analysis API with Groq strategy layer.

Primary endpoint: POST /predict
Compatibility endpoint: POST /chat
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Tuple, TypedDict

from chatbot import chatbot_reply
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from llm import DEFAULT_GROQ_MODEL
from pydantic import BaseModel, Field

load_dotenv(dotenv_path=Path(__file__).with_name('.env'))

MODEL_NAME = os.getenv("STRESS_MODEL_NAME", "ganeshtk/silentstress-model")
MODEL_SUBFOLDER = os.getenv("STRESS_MODEL_SUBFOLDER", "Complete_StressModel/bert_stress_model_final_2")

DEFAULT_HF_TOKEN = ""
HF_TOKEN = (os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN") or DEFAULT_HF_TOKEN).strip()
DEFAULT_GROQ_API_KEY = (os.getenv("GROQ_API_KEY") or "").strip()
RUNTIME_SYNC_TOKEN = (os.getenv("RUNTIME_SYNC_TOKEN") or "").strip()
ENABLE_HEAVY_MODELS = (os.getenv("ENABLE_HF_MODELS") or "false").strip().lower() in {"1", "true", "yes", "on"}

# In-memory runtime key registry keyed by user_id.
USER_RUNTIME_KEYS: Dict[str, Dict[str, str]] = {}

EMOTION_LABELS = ["joy", "anger", "sadness", "fear", "love", "surprise"]
STRESS_LABELS = ["Low", "Medium", "High"]
STRESS_LABEL_INDEX_MAP = {0: "Low", 1: "Medium", 2: "High"}

DIRECT_SCORE_TRIGGERS = {
    "stress score",
    "stress value",
    "stress rating",
    "how stressed am i",
    "stress levels",
}

DISTRESS_KEYWORDS = {
    "anxious", "anxiety", "panic",
    "overwhelm",                    # covers overwhelmed + overwhelming
    "hopeless", "hurt",
    "cannot cope", "can't cope",
    "self-harm", "suicide",
    "kill myself", "want to die", "end my life", "harm myself",
    "worthless", "depressed",
    "fear", "angry", "sad",
    "yell", "scream",               # boss yelling, screaming
    "broke up", "breakup",          # relationship loss
    "embarrass",                    # covers embarrassed/embarrassing
    "struggling", "struggle",
    "terrible", "horrible", "awful",
    "crying", "cried",
    "frustrated", "frustrat",
    "heartbroken", "lonely",
    "miserable", "exhausted",
    "feeling down", "feel down",
    "feeling low", "feel low",
    "feeling bad", "feel bad",
    "feeling sad", "feel sad",
}

CALM_KEYWORDS = {
    "calm",
    "fine",
    "okay",
    "relaxed",
    "manageable",
    "stable",
    "normal routine",
}

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

FALLBACK_REPLY = {
    "Low": "You sound fairly steady right now. What would help you protect this calm over the next hour?",
    "Medium": "I hear the pressure in this. What feels like the biggest stress trigger at the moment?",
    "High": "This sounds intense. Let us take one grounding breath together. What feels most overwhelming right now?",
}

# Map of emotionally significant words/phrases → (emotion, intensity)
# Only strong/medium words that clearly signal an emotion state.
EMOTION_WORD_MAP: Dict[str, Tuple[str, str]] = {
    # sadness / loss
    "heavy": ("sadness", "medium"),
    "draining": ("sadness", "medium"),
    "drained": ("sadness", "medium"),
    "loss": ("sadness", "high"),
    "lonely": ("sadness", "high"),
    "heartbroken": ("sadness", "high"),
    "devastating": ("sadness", "high"),
    "grief": ("sadness", "high"),
    "hopeless": ("sadness", "high"),
    "helpless": ("sadness", "high"),
    "empty": ("sadness", "medium"),
    "broken": ("sadness", "high"),
    "crushed": ("sadness", "high"),
    # anxiety / overwhelm
    "overwhelming": ("anxiety", "high"),
    "overwhelmed": ("anxiety", "high"),
    "anxious": ("anxiety", "medium"),
    "worried": ("anxiety", "medium"),
    "spiraling": ("anxiety", "high"),
    "can't cope": ("anxiety", "high"),
    "cannot cope": ("anxiety", "high"),
    # fear
    "terrified": ("fear", "high"),
    "scared": ("fear", "high"),
    "petrified": ("fear", "high"),
    # anger
    "infuriating": ("anger", "high"),
    "frustrating": ("anger", "medium"),
    "frustrated": ("anger", "medium"),
    "furious": ("anger", "high"),
    "rage": ("anger", "high"),
    "resentful": ("anger", "medium"),
    # exhaustion / burnout
    "exhausted": ("exhaustion", "high"),
    "burnt out": ("exhaustion", "high"),
    "worn out": ("exhaustion", "medium"),
    "depleted": ("exhaustion", "high"),
    "struggling": ("exhaustion", "medium"),
}


def extract_emotion_highlights(text: str) -> List[Dict[str, str]]:
    """Find up to 2 high-intensity emotional words in the response text."""
    import re
    found = []
    lowered = text.lower()
    intensity_rank = {"high": 0, "medium": 1}
    for phrase, (emotion, intensity) in EMOTION_WORD_MAP.items():
        pattern = r'\b' + re.escape(phrase) + r'\b'
        match = re.search(pattern, lowered)
        if match:
            start, end = match.span()
            found.append({
                "word": text[start:end],
                "emotion": emotion,
                "intensity": intensity,
            })
    found.sort(key=lambda x: intensity_rank.get(x["intensity"], 99))
    return found[:2]


class ResourceItem(BaseModel):
    title: str
    url: str


class PredictRequest(BaseModel):
    text: str
    user_id: str = "demo_user"
    llm_api_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""


class PredictResponse(BaseModel):
    stressLevel: str
    emotion: str
    confidence: float
    ayasaResponse: str
    resources: List[ResourceItem] = Field(default_factory=list)
    directScoreQuery: bool
    llmUsed: bool = False
    llmError: str | None = None
    geminiUsed: bool = False
    emotionHighlights: List[Dict[str, str]] = Field(default_factory=list)
    geminiError: str | None = None


class ChatRequest(BaseModel):
    message: str
    user_id: str = "demo_user"
    llm_api_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""


class ChatResponse(BaseModel):
    message: str
    emotion: str
    emotion_score: float
    stress: str
    ayasa_response: str


class RuntimeKeySyncRequest(BaseModel):
    user_id: str
    llm_api_key: str = ""
    hf_token: str = ""


class PredictionPayload(TypedDict):
    stressLevel: str
    emotion: str
    confidence: float
    emotionScore: float
    ayasaResponse: str
    resources: List[ResourceItem]
    directScoreQuery: bool
    llmUsed: bool
    llmError: str | None
    emotionHighlights: List[Dict[str, str]]


app = FastAPI(title="AYASA ML Backend", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

emotion_classifier = None

stress_classifier = None

if ENABLE_HEAVY_MODELS:
    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

        print("Loading emotion classifier...")
        emotion_classifier = pipeline(
            "text-classification",
            model="bhadresh-savani/distilbert-base-uncased-emotion",
            top_k=None,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Emotion classifier load failed: {exc}")

    try:
        print(f"Loading stress classifier from Hugging Face: {MODEL_NAME} ({MODEL_SUBFOLDER})")
        model_kwargs = {
            "subfolder": MODEL_SUBFOLDER,
        }
        if HF_TOKEN:
            model_kwargs["token"] = HF_TOKEN
        stress_model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, **model_kwargs)
        stress_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, **model_kwargs)
        stress_classifier = pipeline(
            "text-classification",
            model=stress_model,
            tokenizer=stress_tokenizer,
            top_k=None,
        )
        print("Stress classifier loaded successfully.")
    except Exception as exc:  # noqa: BLE001
        print(f"Stress model failed to load from Hugging Face: {exc}")
        print("Falling back to heuristic stress inference.")
else:
    print("Heavy HF model loading disabled; using heuristic inference only.")


def normalize_distribution(raw_output: object) -> List[Dict[str, float]]:
    if isinstance(raw_output, list) and raw_output and isinstance(raw_output[0], list):
        return raw_output[0]
    if isinstance(raw_output, list):
        return raw_output
    return []


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


def normalize_probs(probs: Dict[str, float]) -> Dict[str, float]:
    total = sum(max(v, 0.0) for v in probs.values())
    if total <= 0:
        uniform = 1.0 / float(len(probs))
        return {k: uniform for k in probs}
    return {k: max(v, 0.0) / total for k, v in probs.items()}


def soften_probs(probs: Dict[str, float], temp: float = 0.78) -> Dict[str, float]:
    adjusted = {k: pow(max(v, 1e-9), temp) for k, v in probs.items()}
    return normalize_probs(adjusted)


def infer_emotions(text: str) -> Tuple[Dict[str, float], str, float]:
    if emotion_classifier is None:
        lowered = text.lower()
        base = {
            "joy": 0.2,
            "anger": 0.15,
            "sadness": 0.2,
            "fear": 0.2,
            "love": 0.15,
            "surprise": 0.1,
        }
        if any(k in lowered for k in DISTRESS_KEYWORDS):
            base.update({"joy": 0.08, "sadness": 0.32, "fear": 0.32, "anger": 0.2})
        if any(k in lowered for k in CALM_KEYWORDS):
            base.update({"joy": 0.42, "love": 0.2, "fear": 0.08, "sadness": 0.1})
        norm = normalize_probs(base)
        dominant = max(norm, key=norm.get)
        return norm, dominant, norm[dominant]

    raw = emotion_classifier(text[:512])
    rows = normalize_distribution(raw)
    probs = {label: 0.0 for label in EMOTION_LABELS}
    for row in rows:
        label = str(row.get("label", "")).strip().lower()
        if label in probs:
            probs[label] = float(row.get("score", 0.0))

    probs = soften_probs(normalize_probs(probs))

    lowered = text.lower()
    if probs.get("joy", 0.0) > 0.72 and any(k in lowered for k in DISTRESS_KEYWORDS):
        probs["joy"] *= 0.45
        probs["sadness"] += 0.22
        probs["fear"] += 0.2
        probs = normalize_probs(probs)

    dominant = max(probs, key=probs.get)
    return probs, dominant, probs[dominant]


def infer_stress_probs(text: str, emotions: Dict[str, float]) -> Dict[str, float]:
    if stress_classifier is not None:
        raw = stress_classifier(text[:512])
        rows = normalize_distribution(raw)
        probs = {"Low": 0.0, "Medium": 0.0, "High": 0.0}
        for row in rows:
            mapped = normalize_stress_label(row.get("label", ""))
            if mapped:
                probs[mapped] = max(probs[mapped], float(row.get("score", 0.0)))
        probs = normalize_probs(probs)
    else:
        neg = emotions.get("anger", 0.0) + emotions.get("sadness", 0.0) + emotions.get("fear", 0.0)
        pos = emotions.get("joy", 0.0) + emotions.get("love", 0.0)
        if neg >= 0.62:
            probs = {"Low": 0.12, "Medium": 0.24, "High": 0.64}
        elif pos >= 0.58:
            probs = {"Low": 0.62, "Medium": 0.26, "High": 0.12}
        else:
            probs = {"Low": 0.22, "Medium": 0.56, "High": 0.22}

    lowered = text.lower()
    distress_hits = sum(1 for key in DISTRESS_KEYWORDS if key in lowered)
    calm_hits = sum(1 for key in CALM_KEYWORDS if key in lowered)

    if distress_hits >= 2:
        probs["High"] += 0.18
        probs["Medium"] += 0.06
        probs["Low"] -= 0.16
    if calm_hits >= 2:
        probs["Low"] += 0.18
        probs["High"] -= 0.14

    return normalize_probs(probs)


def calibrate_stress_prediction(
    text: str, label: str, confidence: float, emotion: str, emotions: Dict[str, float] | None = None
) -> Tuple[str, float]:
    lowered = " ".join(text.lower().split())
    distress_hits = sum(1 for key in DISTRESS_KEYWORDS if key in lowered)
    calm_hits = sum(1 for key in CALM_KEYWORDS if key in lowered)

    # Downgrade clearly-calm High detections
    if label == "High" and distress_hits == 0 and calm_hits >= 1 and emotion in {"joy", "love", "surprise"}:
        return "Low", min(confidence, 0.65)

    # Keyword-based upgrades
    if label == "Low" and distress_hits >= 3:
        return "High", max(confidence, 0.72)
    if label == "Low" and distress_hits >= 2:
        return "Medium", max(confidence, 0.64)

    # Emotion-based upgrade: strong negative emotion overrides a Low reading
    if label == "Low" and emotions:
        neg = emotions.get("anger", 0) + emotions.get("sadness", 0) + emotions.get("fear", 0)
        if neg >= 0.80:
            return "High", max(confidence, 0.70)
        if neg >= 0.55:
            return "Medium", max(confidence, 0.62)

    return label, confidence


def is_direct_score_query(text: str) -> bool:
    lowered = text.lower()
    return any(trigger in lowered for trigger in DIRECT_SCORE_TRIGGERS)


def to_stress_output(stress_label: str, emotions: Dict[str, float]) -> Dict[str, object]:
    return {
        "stress": stress_label.lower(),
        "emotions": emotions,
    }


def run_prediction(text: str, llm_api_key: str) -> PredictionPayload:
    emotions, top_emotion, top_emotion_score = infer_emotions(text)
    stress_probs = infer_stress_probs(text, emotions)

    stress_label = max(stress_probs, key=stress_probs.get)
    confidence = float(stress_probs[stress_label])
    stress_label, confidence = calibrate_stress_prediction(text, stress_label, confidence, top_emotion, emotions)

    # Keep confidence within a usable range without pinning it to a ceiling.
    confidence = max(0.55, min(confidence, 0.995))

    resources = [ResourceItem(**item) for item in RESOURCE_MAP.get(stress_label, RESOURCE_MAP["Medium"])]
    direct_query = is_direct_score_query(text)

    llm_used = False
    llm_error = None

    if direct_query:
        ayasa_response = f"Your current estimated stress level is {stress_label} with {round(confidence * 100)}% confidence."
    else:
        chat_result = chatbot_reply(text, to_stress_output(stress_label, emotions), llm_api_key=llm_api_key)
        ayasa_response = chat_result["text"] or FALLBACK_REPLY[stress_label]
        llm_used = bool(chat_result["llm_used"])
        llm_error = chat_result["llm_error"]
        if chat_result.get("crisis"):
            stress_label = "High"
            top_emotion = "fear"
            confidence = 0.99

    highlights = extract_emotion_highlights(ayasa_response)

    return {
        "stressLevel": stress_label,
        "emotion": top_emotion,
        "confidence": round(confidence, 4),
        "emotionScore": round(float(top_emotion_score) * 100.0, 2),
        "ayasaResponse": ayasa_response,
        "resources": resources,
        "directScoreQuery": direct_query,
        "llmUsed": llm_used,
        "llmError": llm_error,
        "emotionHighlights": highlights,
    }


def resolve_runtime_llm_key(user_id: str, request_keys: List[str]) -> str:
    cleaned_request_keys = [str(key or "").strip() for key in request_keys]
    for key in cleaned_request_keys:
        if key:
            return key

    user_key = str(USER_RUNTIME_KEYS.get(str(user_id).strip(), {}).get("llm_api_key", "")).strip()
    if user_key:
        return user_key

    return DEFAULT_GROQ_API_KEY


@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(request: PredictRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    resolved_llm_key = resolve_runtime_llm_key(
        request.user_id,
        [
            request.llm_api_key,
            request.groq_api_key,
            request.gemini_api_key,
        ],
    )

    payload = run_prediction(text, resolved_llm_key)
    return PredictResponse(
        stressLevel=payload["stressLevel"],
        emotion=payload["emotion"],
        confidence=payload["confidence"],
        ayasaResponse=payload["ayasaResponse"],
        resources=payload["resources"],
        directScoreQuery=payload["directScoreQuery"],
        llmUsed=payload["llmUsed"],
        llmError=payload["llmError"],
        emotionHighlights=payload.get("emotionHighlights", []),
        # Compatibility aliases for existing Node parser
        geminiUsed=payload["llmUsed"],
        geminiError=payload["llmError"],
    )


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    resolved_llm_key = resolve_runtime_llm_key(
        request.user_id,
        [
            request.llm_api_key,
            request.groq_api_key,
            request.gemini_api_key,
        ],
    )

    payload = run_prediction(message, resolved_llm_key)
    stress_map = {
        "Low": "Low Stress",
        "Medium": "Moderate Stress",
        "High": "High Stress",
    }

    return ChatResponse(
        message=message,
        emotion=payload["emotion"],
        emotion_score=float(payload["emotionScore"]),
        stress=stress_map.get(payload["stressLevel"], "Moderate Stress"),
        ayasa_response=payload["ayasaResponse"],
    )


@app.post("/runtime/keys")
async def sync_runtime_keys(request: RuntimeKeySyncRequest, x_sync_token: str | None = Header(default=None)):
    if not RUNTIME_SYNC_TOKEN:
        raise HTTPException(status_code=503, detail="RUNTIME_SYNC_TOKEN not configured.")
    if (x_sync_token or "").strip() != RUNTIME_SYNC_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid runtime sync token.")

    user_id = request.user_id.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required.")

    USER_RUNTIME_KEYS[user_id] = {
                "llm_api_key": request.llm_api_key.strip(),
                "hf_token": request.hf_token.strip(),
    }

    return {
        "ok": True,
        "user_id": user_id,
        "llm_configured": bool(USER_RUNTIME_KEYS[user_id]["llm_api_key"]),
        "hf_configured": bool(USER_RUNTIME_KEYS[user_id]["hf_token"]),
    }


@app.get("/health")
async def health():
    runtime_llm_available = any(
        bool(str((keys or {}).get("llm_api_key", "")).strip())
        for keys in USER_RUNTIME_KEYS.values()
    )
    return {
        "status": "ok",
        "service": "AYASA ML Backend",
        "stress_model_loaded": stress_classifier is not None,
        "emotion_model_loaded": emotion_classifier is not None,
        "hf_token_set": bool(HF_TOKEN),
        "llm_active": bool(DEFAULT_GROQ_API_KEY) or runtime_llm_available,
        "groq_active": bool(DEFAULT_GROQ_API_KEY) or runtime_llm_available,
        "gemini_active": False,
        "runtime_key_sync_enabled": bool(RUNTIME_SYNC_TOKEN),
        "runtime_keys_count": len(USER_RUNTIME_KEYS),
        "model_name": MODEL_NAME,
        "llm_model": DEFAULT_GROQ_MODEL,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
