"""AYASA hybrid stress analysis API.

Primary endpoint: POST /predict
Compatibility endpoint: POST /chat
"""

from __future__ import annotations

import math
import os
import time
import hashlib
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


def env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return default


STRESS_MODEL_DIR = resolve_existing_path(
    [
        BASE_DIR / "Complete_StressModel" / "bert_stress_model_final_2",
        BASE_DIR / "complete_stressmodel" / "bert_stress_model_final_2",
        BASE_DIR / "stress_model",
        BASE_DIR / "stress_analysis" / "bert_stress_model",
    ]
)

FEATURE_SCALER_PATH = resolve_existing_path(
    [
        BASE_DIR / "Complete_StressModel" / "feature_scaler_final_2.pkl",
        BASE_DIR / "complete_stressmodel" / "feature_scaler_final_2.pkl",
        BASE_DIR / "feature_scaler.pkl",
        BASE_DIR / "stress_analysis" / "feature_scaler.pkl",
    ]
)

META_MODEL_PATH = resolve_existing_path(
    [
        BASE_DIR / "Complete_StressModel" / "meta_model_final_2.pkl",
        BASE_DIR / "complete_stressmodel" / "meta_model_final_2.pkl",
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

GREETING_SHORT_INPUTS = {
    "hi",
    "hello",
    "hey",
    "how are you",
    "how are u",
    "how r u",
    "yo",
    "sup",
}

CALM_SIGNAL_PHRASES = [
    "feel calm",
    "calm and relaxed",
    "relaxed today",
    "peaceful",
    "manageable",
    "calm and balanced",
    "balanced today",
    "no major trigger",
    "normal routine",
    "routine stress",
    "normal routine stress",
    "routine tasks",
    "no physical symptoms",
    "breathing feels normal",
    "i feel okay",
    "i feel fine",
]

DISTRESS_SIGNAL_KEYWORDS = {
    "stressed",
    "anxious",
    "anxiety",
    "panic",
    "worried",
    "overwhelmed",
    "angry",
    "sad",
    "depressed",
    "hopeless",
    "hurt",
    "pain",
    "headache",
    "tension",
    "sleepless",
    "suicide",
    "self-harm",
    "can't cope",
}

GENERIC_STRESS_TERMS = {
    "stress",
    "stressed",
}

MILD_STRESS_CONTEXT_PHRASES = {
    "normal routine stress",
    "routine stress",
    "manageable stress",
    "minor stress",
    "little stress",
}

NEGATIVE_EMOTIONS = {"fear", "anger", "sadness"}

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


def build_response_bank(
    openers: List[str],
    reflections: List[str],
    actions: List[str],
    closings: List[str],
) -> List[str]:
    bank: List[str] = []
    for opener in openers:
        for reflection in reflections:
            for action in actions:
                for closing in closings:
                    bank.append(f"{opener} {reflection} {action} {closing}")
    return bank


def pick_bank_response(options: List[str], selection_key: str, default_text: str) -> str:
    if not options:
        return default_text
    digest = hashlib.sha256(selection_key.encode("utf-8")).hexdigest()
    index = int(digest[:12], 16) % len(options)
    return options[index]


LOW_RESPONSE_BANK = build_response_bank(
    [
        "You are showing steady emotional awareness.",
        "You sound centered and reflective right now.",
        "Your update suggests strong day-to-day balance.",
        "I can hear calm regulation in your message.",
    ],
    [
        "That is a healthy baseline to build from.",
        "Small signs of calm are important wins.",
        "You are managing pressure in a grounded way.",
        "This pattern supports long-term resilience.",
    ],
    [
        "Keep a light routine: hydrate, stretch, and take one mindful pause this hour.",
        "Preserve momentum with one intentional break before your next task.",
        "Maintain this state with 2 minutes of slow breathing and a short walk.",
        "Use this calm window to finish one meaningful small task.",
    ],
    [
        "I am here if you want another quick check-in later.",
        "Share again anytime and we can track how this changes.",
        "If your stress shifts, we can recalibrate together in seconds.",
        "You are doing well; keep this rhythm going.",
    ],
)

MEDIUM_RESPONSE_BANK = build_response_bank(
    [
        "You seem to be carrying moderate pressure right now.",
        "I can sense some load building in your day.",
        "Your message points to manageable but real stress.",
        "There is strain here, but you still have good control.",
    ],
    [
        "That is common when demands stack up.",
        "This often improves with a short reset and clearer priorities.",
        "You are not stuck; this is a workable state.",
        "A little structure can lower this quickly.",
    ],
    [
        "Try a 3-step reset: breathe slowly for 90 seconds, drink water, then pick your next smallest task.",
        "Pause for 2 minutes, relax your shoulders, and define just one next action.",
        "Use a 10-minute focus block, then reassess how your body feels.",
        "Name your top trigger, then reduce it by one practical step right now.",
    ],
    [
        "If you want, we can run another check after that step.",
        "I can help you build a quick plan for the next hour.",
        "Keep sharing and we will adjust support as your state changes.",
        "You are doing the right thing by checking in early.",
    ],
)

HIGH_RESPONSE_BANK = build_response_bank(
    [
        "Your message suggests elevated stress right now.",
        "This sounds like a high-pressure moment.",
        "I can hear intense strain in what you shared.",
        "You appear to be in a high-stress state.",
    ],
    [
        "Please slow the pace and prioritize immediate regulation.",
        "Safety and stabilization come first here.",
        "You deserve support; do not carry this alone.",
        "A calm-down sequence can help your nervous system settle.",
    ],
    [
        "Do this now: sit down, place both feet on the floor, and take 6 slow breaths with long exhales.",
        "Reduce input for five minutes, unclench jaw/shoulders, and focus on one grounding sensation.",
        "Reach out to someone you trust and send a short check-in message while you regulate your breathing.",
        "If symptoms stay intense, pause tasks and seek immediate support from a trusted person or professional resource.",
    ],
    [
        "I can stay with you step-by-step for the next few minutes.",
        "When ready, tell me what feels most intense right now and we will narrow it down.",
        "You are not alone in this moment.",
        "We can take this one small step at a time.",
    ],
)

GREETING_RESPONSE_BANK = build_response_bank(
    [
        "Hey, I am here with you.",
        "Hi, good to hear from you.",
        "Hello, we can check in gently.",
        "Glad you reached out.",
    ],
    [
        "We can keep this simple and calm.",
        "A short update is enough to start.",
        "No pressure to explain everything at once.",
        "Take your time and share what feels most relevant.",
    ],
    [
        "Tell me your current feeling in one line.",
        "Share your top trigger and one body signal.",
        "Give me a quick 0-10 stress rating plus one reason.",
        "Start with how your body feels right now.",
    ],
    [
        "I will help from there.",
        "We will take it one step at a time.",
        "I can suggest a fast reset after your update.",
        "I am listening.",
    ],
)

HELP_RESPONSE_BANK = build_response_bank(
    [
        "I am with you.",
        "You did the right thing by asking for support.",
        "We can stabilize this together.",
        "Let us make this manageable.",
    ],
    [
        "We will focus on what helps right now.",
        "Start with your breathing and posture.",
        "Small immediate actions matter most.",
        "You do not need a perfect plan to begin.",
    ],
    [
        "Take 5 slow breaths, drink water, and name one thing you can postpone.",
        "Do a quick body reset: shoulders down, jaw relaxed, eyes soften for 30 seconds.",
        "Set a 5-minute timer and complete only one tiny task.",
        "Message one trusted person with a brief update so you are supported.",
    ],
    [
        "Then come back and we will reassess.",
        "I can guide the next step once you do that.",
        "You are not alone here.",
        "We can keep this practical and steady.",
    ],
)

EXERCISE_RESPONSE_BANK = build_response_bank(
    [
        "Try this short regulation routine.",
        "Here is a practical reset exercise.",
        "Let us run a quick nervous-system reset.",
        "Use this 2-minute grounding flow.",
    ],
    [
        "Step 1: box breathing (4 in, 4 hold, 4 out, 4 hold) for 6 rounds.",
        "Step 1: inhale through the nose for 4 and exhale for 6, repeating slowly.",
        "Step 1: unclench shoulders and do three deep diaphragmatic breaths.",
        "Step 1: place feet flat, straighten posture, and take slow controlled breaths.",
    ],
    [
        "Step 2: 5-4-3-2-1 grounding with your senses.",
        "Step 2: stretch neck and shoulders for 60 seconds.",
        "Step 2: drink water and relax your jaw for 30 seconds.",
        "Step 2: identify one next task and break it into a 5-minute action.",
    ],
    [
        "Step 3: tell me how your body feels after this.",
        "Step 3: send me a quick 0-10 stress update.",
        "Step 3: we will adjust based on your response.",
        "Step 3: we can repeat with a gentler pace if needed.",
    ],
)

RECALIBRATE_RESPONSE_BANK = build_response_bank(
    [
        "Thanks for clarifying.",
        "That is helpful context.",
        "Good correction, let us refine this.",
        "I hear you; let us recalibrate.",
    ],
    [
        "We can quickly improve the next estimate.",
        "A few targeted details will help accuracy.",
        "More precise context gives better support.",
        "Let us tune this to your current state.",
    ],
    [
        "Share a 0-10 stress score, top trigger, and one physical signal.",
        "Tell me what changed in the last hour and how your body is reacting.",
        "Give one thought pattern and one body sensation right now.",
        "List what feels hardest plus one thing that feels manageable.",
    ],
    [
        "I will update guidance from that.",
        "Then we can run a cleaner check-in.",
        "That will help us respond more accurately.",
        "We will adapt support immediately.",
    ],
)

RECHECK_RESPONSE_BANK = build_response_bank(
    [
        "Absolutely, we can run another check-in.",
        "Yes, let us do a fresh stress check.",
        "Of course, we can reassess now.",
        "Ready when you are for another pass.",
    ],
    [
        "Keep it short and specific.",
        "Three details are enough for a useful update.",
        "A concise snapshot works best.",
        "We will use this to refine support.",
    ],
    [
        "Share how you feel now, your top trigger, and any body symptoms.",
        "Give current mood, main stressor, and physical cues.",
        "Tell me emotional state, pressure source, and body response.",
        "Send one line each for feeling, trigger, and physical sensation.",
    ],
    [
        "I will analyze it right away.",
        "Then we can compare against your last check.",
        "I will tailor the next step from that.",
        "We will move from there.",
    ],
)

PREGENERATED_RESPONSE_BANKS = {
    "Low": LOW_RESPONSE_BANK,
    "Medium": MEDIUM_RESPONSE_BANK,
    "High": HIGH_RESPONSE_BANK,
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

GEMINI_PREFERRED_MODEL = os.getenv("GEMINI_MODEL", GEMINI_MODEL_CANDIDATES[0]).strip() or GEMINI_MODEL_CANDIDATES[0]
GEMINI_MAX_MODEL_ATTEMPTS = max(1, min(env_int("GEMINI_MAX_MODEL_ATTEMPTS", 3), len(GEMINI_MODEL_CANDIDATES)))
GEMINI_FAILURE_COOLDOWN_SECONDS = max(30, env_int("GEMINI_FAILURE_COOLDOWN_SECONDS", 180))
GEMINI_RESPONSE_CACHE_TTL_SECONDS = max(30, env_int("GEMINI_RESPONSE_CACHE_TTL_SECONDS", 900))
GEMINI_RESPONSE_CACHE_MAX_ENTRIES = max(50, env_int("GEMINI_RESPONSE_CACHE_MAX_ENTRIES", 200))

gemini_failure_backoff_until: Dict[str, float] = {}
gemini_response_cache: Dict[str, Tuple[float, str]] = {}
gemini_last_working_model_by_key: Dict[str, str] = {}


def get_key_fingerprint(api_key: str) -> str:
    if not api_key:
        return "no-key"
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:12]


def build_gemini_cache_key(message: str, emotion: str, stress: str) -> str:
    normalized_message = " ".join(message.lower().split())
    return f"{normalized_message}|{emotion}|{stress}"


def is_quota_or_rate_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return (
        "quota" in lowered
        or "429" in lowered
        or "rate" in lowered
        or "resource exhausted" in lowered
        or "resource has been exhausted" in lowered
        or "too many requests" in lowered
    )


def is_invalid_api_key_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return (
        "api_key_invalid" in lowered
        or "api key not valid" in lowered
        or "invalid api key" in lowered
        or "permission denied" in lowered and "api key" in lowered
    )


def is_model_availability_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return (
        "model" in lowered and "not found" in lowered
        or "is not supported" in lowered
        or "unsupported model" in lowered
    )


def trim_gemini_cache() -> None:
    if len(gemini_response_cache) <= GEMINI_RESPONSE_CACHE_MAX_ENTRIES:
        return

    overflow = len(gemini_response_cache) - GEMINI_RESPONSE_CACHE_MAX_ENTRIES
    for key in list(gemini_response_cache.keys())[:overflow]:
        gemini_response_cache.pop(key, None)


def candidate_models_for_key(key_fingerprint: str) -> List[str]:
    remembered = gemini_last_working_model_by_key.get(key_fingerprint)
    ordered: List[str] = []

    if remembered:
        ordered.append(remembered)
    if GEMINI_PREFERRED_MODEL not in ordered:
        ordered.append(GEMINI_PREFERRED_MODEL)

    for model_name in GEMINI_MODEL_CANDIDATES:
        if model_name not in ordered:
            ordered.append(model_name)

    return ordered


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
        return pick_bank_response(
            GREETING_RESPONSE_BANK,
            f"greeting|{normalized}|{stress}",
            "Hey, I am here with you. Share how your day feels in one line and I will help.",
        )

    # Very short messages are often check-ins, so keep the tone neutral and inviting.
    if len(normalized) <= 15 and stress == "High":
        return pick_bank_response(
            HELP_RESPONSE_BANK,
            f"short-high|{normalized}|{stress}",
            "Thanks for checking in. Take 4 slow breaths, then share what feels hardest right now.",
        )

    if "exercise" in lowered or "exercises" in lowered:
        return pick_bank_response(
            EXERCISE_RESPONSE_BANK,
            f"exercise|{normalized}|{stress}",
            "Try box breathing for 2 minutes and then share how your body feels.",
        )

    if "help me" in lowered or "help" == lowered.strip():
        return pick_bank_response(
            HELP_RESPONSE_BANK,
            f"help|{normalized}|{stress}",
            "I am here with you. Start with slow breathing and one small next step.",
        )

    if "not" in lowered and "stress" in lowered:
        return pick_bank_response(
            RECALIBRATE_RESPONSE_BANK,
            f"recalibrate|{normalized}|{stress}",
            "Thanks for clarifying. Share your 0-10 stress score, top trigger, and one body signal.",
        )

    if "another stress check" in lowered or "another stress checkup" in lowered:
        return pick_bank_response(
            RECHECK_RESPONSE_BANK,
            f"recheck|{normalized}|{stress}",
            "Absolutely. Share feeling, trigger, and physical symptom for a fresh check.",
        )

    stress_bank = PREGENERATED_RESPONSE_BANKS.get(stress, PREGENERATED_RESPONSE_BANKS["Medium"])
    return pick_bank_response(
        stress_bank,
        f"general|{normalized}|{stress}",
        FALLBACK_RESPONSES.get(stress, "Take a slow breath and do one manageable step next."),
    )


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


def calibrate_non_distress_prediction(
    text: str,
    stress_level: str,
    confidence: float,
    emotion: str,
) -> Tuple[str, float]:
    if stress_level != "High":
        return stress_level, confidence

    normalized = " ".join(text.lower().split())
    if not normalized:
        return stress_level, confidence

    strong_distress_hits = sum(1 for word in DISTRESS_SIGNAL_KEYWORDS if word in normalized)
    if strong_distress_hits > 0:
        return stress_level, confidence

    mild_stress_context = any(phrase in normalized for phrase in MILD_STRESS_CONTEXT_PHRASES)
    generic_stress_hits = sum(1 for word in GENERIC_STRESS_TERMS if word in normalized)
    calm_hits = sum(1 for phrase in CALM_SIGNAL_PHRASES if phrase in normalized)
    is_short_greeting = normalized in GREETING_SHORT_INPUTS
    positive_emotion = emotion in {"joy", "love", "surprise"}

    # Generic mentions like "routine stress" should not force High when the text is otherwise calm.
    if generic_stress_hits > 0 and not mild_stress_context and calm_hits < 2:
        return stress_level, confidence

    if (calm_hits >= 2 or is_short_greeting or (mild_stress_context and calm_hits >= 1)) and positive_emotion:
        # Keep confidence believable after override instead of returning hard 100.
        return "Low", min(confidence, 0.65)

    return stress_level, confidence


def calibrate_distress_prediction(
    text: str,
    stress_level: str,
    confidence: float,
    emotion: str,
) -> Tuple[str, float]:
    normalized = " ".join(text.lower().split())
    if not normalized:
        return stress_level, confidence

    distress_hits = sum(1 for word in DISTRESS_SIGNAL_KEYWORDS if word in normalized)
    has_cant_cope_pattern = "cannot cope" in normalized or "can't cope" in normalized
    has_panic_pattern = "panic" in normalized or "panicking" in normalized
    has_sleep_pattern = "cannot sleep" in normalized or "can't sleep" in normalized or "sleepless" in normalized

    severe_signal = distress_hits >= 3 or has_cant_cope_pattern or (has_panic_pattern and has_sleep_pattern)
    moderate_signal = distress_hits >= 2 or (has_panic_pattern and distress_hits >= 1)
    negative_emotion = emotion in NEGATIVE_EMOTIONS

    if stress_level == "Low" and severe_signal and negative_emotion:
        return "High", max(confidence, 0.7)

    if stress_level == "Low" and moderate_signal:
        return "Medium", max(confidence, 0.6)

    if stress_level == "Medium" and severe_signal and negative_emotion:
        return "High", max(confidence, 0.7)

    return stress_level, confidence


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

    now = time.time()
    key_fingerprint = get_key_fingerprint(api_key)
    cooldown_until = gemini_failure_backoff_until.get(key_fingerprint)
    if cooldown_until and now < cooldown_until:
        wait_seconds = int(cooldown_until - now)
        return {
            "text": contextual_fallback_response(message, stress),
            "used": False,
            "error": f"Gemini temporarily paused after recent quota/rate errors. Retry in {wait_seconds}s.",
        }

    cache_key = build_gemini_cache_key(message, emotion, stress)
    cached = gemini_response_cache.get(cache_key)
    if cached:
        expires_at, cached_text = cached
        if now < expires_at:
            return {
                "text": cached_text,
                "used": True,
                "error": None,
            }
        gemini_response_cache.pop(cache_key, None)

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

    ordered_candidates = candidate_models_for_key(key_fingerprint)

    for model_name in ordered_candidates[:GEMINI_MAX_MODEL_ATTEMPTS]:
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
                gemini_response_cache[cache_key] = (now + GEMINI_RESPONSE_CACHE_TTL_SECONDS, text)
                trim_gemini_cache()
                gemini_last_working_model_by_key[key_fingerprint] = model_name
                return {
                    "text": text,
                    "used": True,
                    "error": None,
                }
            last_error = f"{model_name}: Empty response"
        except Exception as exc:
            last_error = f"{model_name}: {exc}"
            print(f"Gemini generation error -> {last_error}")
            if is_invalid_api_key_error(last_error):
                break
            if is_quota_or_rate_error(last_error):
                gemini_failure_backoff_until[key_fingerprint] = now + GEMINI_FAILURE_COOLDOWN_SECONDS
                break
            if is_model_availability_error(last_error):
                continue

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
    if not direct_query:
        stress_level, confidence = calibrate_non_distress_prediction(text, stress_level, confidence, emotion)
        stress_level, confidence = calibrate_distress_prediction(text, stress_level, confidence, emotion)

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
