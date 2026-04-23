from __future__ import annotations

import os
from typing import Dict, Optional, Tuple

from groq import Groq

DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip() or "llama-3.1-8b-instant"


def _build_structured_prompt(user_input: str, stress: str, emotions: Dict[str, float], strategy: str) -> str:
    dominant_emotion = max(emotions, key=emotions.get) if emotions else "unknown"
    normalized_stress = str(stress or "medium").strip().lower()

    if normalized_stress in {"medium", "high"} and "fine" in user_input.lower():
        extra = "User may be hiding stress. Gently probe deeper."
    else:
        extra = ""

    return f"""
You are a calm, human-like mental health support chatbot.

User message: \"{user_input}\"
Stress level: {normalized_stress}
Dominant emotion: {dominant_emotion}
Strategy: {strategy}
{extra}

Rules:
- Keep response 2-4 lines
- Sound natural, not robotic
- Always:
  1. Acknowledge feeling
  2. Reflect meaning
    3. Ask up to three concise questions when helpful (how do you feel, what is causing stress, any body pain)
- After questions, gently invite the user to try an exercise if appropriate
- Do NOT give generic advice
- Do NOT sound like a therapist

Example style:
Input: "I'm fine, just tired"
Output style: "You say you're fine, but it sounds like you might be a bit drained. Has something been building up lately?"

Example style 2:
Input: "I am feeling low"
Output style: "That sounds heavy, and I am glad you said it out loud. What has been weighing on you most, and are you feeling it in your body too?"

Respond:
""".strip()


def generate_response(
    user_input: str,
    stress: str,
    emotions: Dict[str, float],
    strategy: str,
    api_key: str = "",
) -> Tuple[Optional[str], Optional[str]]:
    prompt = _build_structured_prompt(user_input, stress, emotions, strategy)
    resolved_key = (api_key or "").strip() or os.getenv("GROQ_API_KEY", "").strip()
    if not resolved_key:
        print("[Groq] ERROR: no API key resolved — check GROQ_API_KEY env var")
        return None, "Missing GROQ_API_KEY"

    print(f"[Groq] calling model={DEFAULT_GROQ_MODEL} key_len={len(resolved_key)}")
    try:
        client = Groq(api_key=resolved_key)
        chat = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are AYASA, a calm, practical, empathetic mental-health support assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.7,
            max_tokens=220,
        )
        content = (chat.choices[0].message.content or "").strip()
        if not content:
            return None, "Groq returned empty response"
        return content, None
    except Exception as exc:  # noqa: BLE001
        print(f"[Groq] EXCEPTION: {type(exc).__name__}: {exc}")
        return None, str(exc)
