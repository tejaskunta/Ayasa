"""Deterministic safety layer.

Design rule: safety NEVER depends on the model and NEVER depends on the LLM.
It runs first, on the raw text, and can override anything downstream. This is
why the original project's crisis handling was unreliable — it was mixed into
prompt wording and the LLM call path. Here it is a pure function with tests.

The crisis response is a constant. It does not get "generated". For a safety
path you want the same words every single time, reviewable by a human.
"""

from __future__ import annotations

import re

# Phrases that must always take the crisis path. Matched against lowered,
# whitespace-normalised text. Keep this list human-reviewed and boring.
CRISIS_PHRASES: tuple[str, ...] = (
    "suicide",
    "suicidal",
    "kill myself",
    "killing myself",
    "end my life",
    "end it all",
    "want to die",
    "wanna die",
    "self-harm",
    "self harm",
    "harm myself",
    "hurt myself",
    "cut myself",
    "no reason to live",
    "cannot go on",
    "can't go on",
)

CRISIS_RESPONSE = (
    "I am really glad you told me this, and your safety matters most right now. "
    "If you might hurt yourself, please contact your local emergency number immediately, "
    "or in India call Tele-MANAS on 14416 (or 1-800-891-4416), available 24/7. "
    "If you can, stay with someone you trust and tell them how you are feeling right now."
)

_WHITESPACE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _WHITESPACE.sub(" ", str(text or "").lower()).strip()


def detect_crisis(text: str) -> str | None:
    """Return the matching crisis phrase, or None.

    Returning the matched phrase (not just True) gives us an audit trail: we can
    log *why* the safety path fired without storing the user's whole message.
    """
    normalized = _normalize(text)
    for phrase in CRISIS_PHRASES:
        if phrase in normalized:
            return phrase
    return None