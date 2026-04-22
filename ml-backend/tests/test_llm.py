"""Tests for the Groq LLM integration layer."""
import pytest
from unittest.mock import MagicMock, patch
import llm


def _make_groq_response(content: str):
    """Build a minimal Groq response mock."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


# ── generate_response ──────────────────────────────────────────────────────
def test_generate_response_no_key_returns_error():
    with patch.dict("os.environ", {}, clear=True):
        text, err = llm.generate_response("I feel tired", "medium", {"sadness": 0.7}, "deep_support", api_key="")
    assert text is None
    assert err is not None
    assert "GROQ_API_KEY" in err


def test_generate_response_calls_groq_and_returns_content():
    mock_response = _make_groq_response("That sounds really heavy. What feels hardest right now?")
    with patch("llm.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.return_value = mock_response
        text, err = llm.generate_response(
            "I am stressed",
            "high",
            {"fear": 0.8, "sadness": 0.2},
            "deep_support",
            api_key="gsk_test_key",
        )
    assert text == "That sounds really heavy. What feels hardest right now?"
    assert err is None


def test_generate_response_empty_groq_content_returns_error():
    mock_response = _make_groq_response("")
    with patch("llm.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.return_value = mock_response
        text, err = llm.generate_response("I feel fine", "low", {"joy": 0.8}, "light_checkin", api_key="gsk_key")
    assert text is None
    assert "empty" in (err or "").lower()


def test_generate_response_groq_exception_returns_error():
    with patch("llm.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.side_effect = Exception("connection refused")
        text, err = llm.generate_response("text", "medium", {}, "empathetic_probe", api_key="gsk_key")
    assert text is None
    assert "connection refused" in (err or "")


# ── _build_structured_prompt ───────────────────────────────────────────────
def test_prompt_contains_user_input():
    prompt = llm._build_structured_prompt("I feel overwhelmed", "high", {"fear": 0.7}, "deep_support")
    assert "I feel overwhelmed" in prompt


def test_prompt_contains_strategy():
    prompt = llm._build_structured_prompt("test", "medium", {}, "calm_validation")
    assert "calm_validation" in prompt


def test_prompt_hidden_stress_hint_when_fine():
    prompt = llm._build_structured_prompt("I'm fine", "high", {"joy": 0.6}, "empathetic_probe")
    assert "hiding stress" in prompt.lower() or "probe" in prompt.lower()


def test_prompt_no_hint_when_not_fine():
    prompt = llm._build_structured_prompt("I am really struggling", "high", {"sadness": 0.9}, "deep_support")
    assert "hiding stress" not in prompt.lower()
