"""Optional reply generation through Groq.

The analysis and crisis path remain fully deterministic. Groq only improves the
wording for non-crisis replies and any failure falls back to the local reply.
"""

from __future__ import annotations

import os

import httpx


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def generate_reply(text: str, analysis: dict[str, object]) -> str | None:
    """Return a concise Groq reply, or None when Groq is unavailable."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or analysis.get("is_safety_override"):
        return None

    # Read at call time so a value set in .env (or changed) is honored even if
    # this module was imported before load_dotenv(). Falls back to the constant.
    model = os.getenv("GROQ_MODEL", GROQ_MODEL)
    strategy = str(analysis.get("strategy", "light_checkin"))
    stress_level = str(analysis.get("stress_level", "Medium"))
    prompt = (
        "Respond to this person's check-in with warmth and specificity. "
        "Use one or two short sentences. Do not diagnose, moralize, mention AI, "
        "or use a list. Ask at most one gentle question. "
        f"The analysis strategy is {strategy}; stress level is {stress_level}.\n\n"
        f"Check-in: {text[:4000]}"
    )
    try:
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "temperature": 0.4,
                "max_tokens": 120,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Ayasa, a calm and empathetic check-in companion.",
                    },
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=6.0,
        )
        response.raise_for_status()
        content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        reply = str(content).strip()
        return reply[:800] or None
    except Exception as exc:  # noqa: BLE001 - LLM failure must never break analysis
        print(f"[llm] reply unavailable ({exc})")
        return None