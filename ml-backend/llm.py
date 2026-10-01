from __future__ import annotations

import os
from typing import Dict, Optional, Tuple

from groq import Groq

DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip() or "llama-3.1-8b-instant"


_AGREEMENT_WORDS = {
    "sure", "yes", "yeah", "yep", "okay", "ok", "alright",
    "let's", "let us", "sounds good", "i will", "i'll", "go ahead",
    "why not", "definitely", "absolutely",
}


def _build_structured_prompt(user_input: str, stress: str, emotions: Dict[str, float], strategy: str) -> str:
    dominant_emotion = max(emotions, key=emotions.get) if emotions else "unknown"
    normalized_stress = str(stress or "medium").strip().lower()

    lowered = user_input.lower()
    word_count = len(user_input.split())
    is_agreement = (
        any(w in lowered for w in _AGREEMENT_WORDS)
        and word_count <= 12
    )
    is_brief = word_count <= 4

    has_number = any(ch.isdigit() for ch in user_input)
    if is_brief and not has_number:
        extra = "User gave a very short reply. Write ONE empathy sentence only. Do NOT end with a question. Do NOT include a question mark. Full stop after the empathy sentence."
    elif is_brief and has_number:
        extra = "User gave a specific practical answer (a time, number, or quantity). Acknowledge it warmly and positively in one sentence. No question."
    elif is_agreement:
        extra = "User just agreed or said yes to something. Affirm warmly in one sentence and guide them into the next concrete step or action. Ask zero questions."
    elif normalized_stress in {"medium", "high"} and "fine" in lowered:
        extra = "User may be hiding stress. Gently probe deeper."
    else:
        extra = ""

    return f"""
You are AYASA, a calm, empathetic mental health support chatbot having a real conversation.

User message: \"{user_input}\"
Stress level: {normalized_stress}
Dominant emotion: {dominant_emotion}
Strategy: {strategy}
{extra}

Rules:
- Respond directly to what the user just said before anything else
- Keep response to 2-3 sentences maximum
- End most responses with ONE question to keep the conversation going
- Only close with a statement (no question) when the user just completed an exercise, confirmed they feel better, or seems to be wrapping up
- Never ask more than one question per response
- If the user agreed or said yes to something, affirm and guide them into the next step — zero questions
- Do NOT run through a checklist of questions
- Do NOT give generic advice
- Never minimise, dismiss, or label the user's feelings as dramatic, exaggerated, or over the top
- Sound like a supportive friend having a real conversation, not a therapist conducting a session

Example 1 — stressed input:
Input: "I'm fine, just tired"
Output: "You say you're fine, but it sounds like something might be wearing on you. What's been taking the most out of you lately?"

Example 2 — heavy emotion:
Input: "I am feeling really low"
Output: "That sounds heavy, and I am glad you said it. What's been weighing on you most right now?"

Example 3 — user agreeing to something:
Input: "Sure I could do the gratitude ritual"
Output: "Let's do it. Think of three small things that went well today — they can be tiny. What's the first one that comes to mind?"

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

    word_count = len(user_input.split())
    if word_count <= 4:
        system_msg = (
            "You are AYASA, a calm empathetic assistant. "
            "The user gave a very short reply. "
            "Your ENTIRE response must be exactly ONE sentence of warmth or validation. "
            "It MUST end with a period. It MUST NOT contain a question mark. "
            "No exceptions."
        )
    else:
        system_msg = "You are AYASA, a calm, practical, empathetic mental-health support assistant."

    print(f"[Groq] calling model={DEFAULT_GROQ_MODEL} key_len={len(resolved_key)}")
    try:
        client = Groq(api_key=resolved_key)
        chat = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_msg,
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
