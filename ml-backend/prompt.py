from __future__ import annotations

from typing import Dict


def _dominant_emotion(emotions: Dict[str, float]) -> str:
    if not emotions:
        return "unknown"
    return max(emotions, key=emotions.get)


def build_prompt(user_input: str, stress: str, emotions: Dict[str, float], strategy: str) -> str:
    dominant = _dominant_emotion(emotions)
    normalized_stress = str(stress or "medium").lower()

    if normalized_stress in {"medium", "high"} and "fine" in user_input.lower():
        hidden_stress_hint = "User may be hiding stress. Gently probe deeper."
    else:
        hidden_stress_hint = ""

    return f"""
You are AYASA, a mental health support chatbot.

User message: "{user_input}"
Stress level: {normalized_stress}
Dominant emotion: {dominant}
Strategy: {strategy}
{hidden_stress_hint}

Rules:
- Be human and emotionally warm, not robotic.
- Keep it 2-4 lines.
- Always include:
1. Acknowledge the feeling
2. Reflect meaning in simple language
3. Ask one grounded follow-up question
- Do not give generic advice.
- Do not mention model scores.

Respond now:
""".strip()
