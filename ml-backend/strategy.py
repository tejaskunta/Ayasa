from __future__ import annotations

from typing import Dict

CRISIS_KEYWORDS = {
    "suicide",
    "self-harm",
    "kill myself",
    "end it",
    "end my life",
    "hopeless",
    "i cannot go on",
    "i can't go on",
    "harm myself",
}


def _safe_stress_label(stress: str) -> str:
    label = str(stress or "medium").strip().lower()
    if "high" in label:
        return "high"
    if "low" in label:
        return "low"
    return "medium"


def detect_crisis(user_input: str) -> bool:
    text = " ".join(str(user_input or "").lower().split())
    return any(keyword in text for keyword in CRISIS_KEYWORDS)


def get_dominant_emotion(emotions: Dict[str, float]) -> str:
    if not emotions:
        return "unknown"
    return max(emotions, key=emotions.get)


def get_strategy(stress: str, emotions: Dict[str, float], user_input: str = "") -> str:
    if detect_crisis(user_input):
        return "crisis_override"

    normalized_stress = _safe_stress_label(stress)
    dominant_emotion = get_dominant_emotion(emotions)

    if normalized_stress == "high":
        return "deep_support"
    if normalized_stress == "medium":
        if dominant_emotion == "anger":
            return "calm_validation"
        return "empathetic_probe"
    return "light_checkin"
