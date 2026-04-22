from __future__ import annotations

import hashlib
from typing import Dict, TypedDict

from llm import generate_response
from strategy import get_strategy


class ChatbotResult(TypedDict):
    text: str
    llm_used: bool
    llm_error: str | None
    strategy: str
    crisis: bool


CRISIS_MESSAGE = (
    "I am really glad you shared this. Your safety matters most right now. "
    "If you might harm yourself, contact local emergency services immediately or call Tele-MANAS (India) at 14416 / 1-800-891-4416. "
    "If possible, stay with someone you trust and tell them how you feel right now."
)

SAFE_RESPONSE_BANK = {
    "deep_support": (
        "That sounds very heavy, and I am here with you. "
        "Let us slow this down for one minute with gentle breathing. "
        "What feels most intense in your body right now?"
    ),
    "calm_validation": (
        "I can hear the frustration in this, and it makes sense. "
        "When pressure builds, anger can feel sharp and immediate. "
        "What is the exact trigger that set this off today?"
    ),
    "empathetic_probe": (
        "Thank you for being honest about how this feels. "
        "You are carrying stress, but there is still room to regain control. "
        "Which part feels hardest at this moment?"
    ),
    "light_checkin": (
        "You are checking in thoughtfully, which is a strong step. "
        "Your current stress signal looks manageable. "
        "What would make the next hour feel lighter for you?"
    ),
}


def _pick_variant(user_input: str, variants: list[str]) -> str:
    if not variants:
        return ""
    digest = hashlib.sha256(str(user_input).encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(variants)
    return variants[index]


FALLBACK_VARIANTS = {
    "deep_support": [
        "That sounds intense, and I am here with you. Let us take one slow breath together. What feels heaviest right now?",
        "You are carrying a lot in this moment. We can slow it down together. What part feels hardest to hold?",
    ],
    "calm_validation": [
        "I can sense frustration in this, and it makes sense. What triggered it most strongly today?",
        "There is a lot of pressure under this feeling. What was the turning point that made it spike?",
    ],
    "empathetic_probe": [
        "Thank you for sharing this honestly. It sounds draining, and you do not have to carry it alone. What has been building up the most?",
        "I hear that this has been heavy for you. Let us unpack it one step at a time. What is the biggest pressure point right now?",
    ],
    "light_checkin": [
        "You are checking in with good self-awareness. What would make the next hour feel a little lighter?",
        "Thanks for sharing where you are right now. What is one thing that would help you feel steadier today?",
    ],
}


def chatbot_reply(user_input: str, stress_output: Dict[str, object], llm_api_key: str = "") -> ChatbotResult:
    stress = str(stress_output.get("stress", "medium"))
    emotions = stress_output.get("emotions", {})
    safe_emotions = emotions if isinstance(emotions, dict) else {}

    strategy = get_strategy(stress, safe_emotions, user_input)
    if strategy == "crisis_override":
        return {
            "text": CRISIS_MESSAGE,
            "llm_used": False,
            "llm_error": None,
            "strategy": strategy,
            "crisis": True,
        }

    lowered = str(user_input or "").lower()
    if "fine" in lowered and "tired" in lowered:
        user_input = "You say you're fine, but it sounds like you might be a bit drained. Has something been building up lately?"

    generated, llm_error = generate_response(
        user_input,
        stress,
        safe_emotions,
        strategy,
        api_key=llm_api_key,
    )
    if generated:
        return {
            "text": generated,
            "llm_used": True,
            "llm_error": None,
            "strategy": strategy,
            "crisis": False,
        }

    fallback_strategy = strategy if strategy in FALLBACK_VARIANTS else "empathetic_probe"
    fallback_text = _pick_variant(user_input, FALLBACK_VARIANTS[fallback_strategy]) or SAFE_RESPONSE_BANK.get(
        fallback_strategy,
        SAFE_RESPONSE_BANK["empathetic_probe"],
    )

    return {
        "text": fallback_text,
        "llm_used": False,
        "llm_error": llm_error,
        "strategy": strategy,
        "crisis": False,
    }
