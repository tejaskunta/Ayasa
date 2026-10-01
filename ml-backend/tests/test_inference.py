"""Unit tests for inference helper functions (no model loading required)."""
import pytest
import main
from strategy import get_strategy, detect_crisis, get_dominant_emotion
from chatbot import chatbot_reply, _pick_variant


# ── normalize_stress_label ─────────────────────────────────────────────────
@pytest.mark.parametrize("raw,expected", [
    ("Low", "Low"),
    ("low", "Low"),
    ("HIGH", "High"),
    ("high stress", "High"),
    ("Medium", "Medium"),
    ("moderate", "Medium"),
    ("LABEL_0", "Low"),
    ("LABEL_1", "Medium"),
    ("LABEL_2", "High"),
    ("0", "Low"),
    ("1", "Medium"),
    ("2", "High"),
    ("unknown_label", None),
])
def test_normalize_stress_label(raw, expected):
    assert main.normalize_stress_label(raw) == expected


# ── normalize_probs ────────────────────────────────────────────────────────
def test_normalize_probs_sums_to_one():
    probs = {"Low": 3.0, "Medium": 1.0, "High": 1.0}
    result = main.normalize_probs(probs)
    assert abs(sum(result.values()) - 1.0) < 1e-6


def test_normalize_probs_zero_total_uniform():
    probs = {"Low": 0.0, "Medium": 0.0, "High": 0.0}
    result = main.normalize_probs(probs)
    for v in result.values():
        assert abs(v - 1/3) < 1e-6


def test_normalize_probs_clips_negatives():
    probs = {"Low": -1.0, "Medium": 2.0, "High": 1.0}
    result = main.normalize_probs(probs)
    assert result["Low"] == 0.0
    assert sum(result.values()) == pytest.approx(1.0)


# ── is_direct_score_query ──────────────────────────────────────────────────
@pytest.mark.parametrize("text,expected", [
    ("what is my stress score", True),
    ("stress levels please", True),
    ("how stressed am i", True),
    ("I feel overwhelmed today", False),
    ("just chatting", False),
])
def test_is_direct_score_query(text, expected):
    assert main.is_direct_score_query(text) == expected


# ── calibrate_stress_prediction ────────────────────────────────────────────
def test_calibrate_downgrades_false_high():
    label, conf = main.calibrate_stress_prediction("I am calm today", "High", 0.95, "joy")
    assert label == "Low"
    assert conf <= 0.65


def test_calibrate_upgrades_distressed_low():
    text = "anxious overwhelmed cannot cope"
    label, conf = main.calibrate_stress_prediction(text, "Low", 0.60, "fear")
    assert label in ("Medium", "High")


def test_calibrate_keeps_valid_high():
    text = "anxious overwhelmed cannot cope hurting"
    label, conf = main.calibrate_stress_prediction(text, "High", 0.90, "fear")
    assert label == "High"


# ── infer_emotions (heuristic, no model) ──────────────────────────────────
def test_infer_emotions_distress_keywords():
    probs, dominant, score = main.infer_emotions("I feel anxious and hopeless")
    assert dominant in ("fear", "sadness", "anger")
    assert score > 0.0


def test_infer_emotions_calm_keywords():
    probs, dominant, score = main.infer_emotions("I feel calm and relaxed today")
    assert dominant in ("joy", "love")


def test_infer_emotions_returns_all_labels():
    probs, _, _ = main.infer_emotions("some text")
    for label in ("joy", "anger", "sadness", "fear", "love", "surprise"):
        assert label in probs


# ── strategy ──────────────────────────────────────────────────────────────
def test_detect_crisis_keywords():
    assert detect_crisis("I want to end my life") is True
    assert detect_crisis("I want to kill myself") is True
    assert detect_crisis("I am stressed about work") is False


def test_get_dominant_emotion_empty():
    assert get_dominant_emotion({}) == "unknown"


def test_get_strategy_crisis():
    assert get_strategy("high", {"fear": 0.9}, "I want to harm myself") == "crisis_override"


def test_get_strategy_high_stress():
    assert get_strategy("high", {"sadness": 0.8}, "Everything is too much") == "deep_support"


def test_get_strategy_medium_anger():
    assert get_strategy("medium", {"anger": 0.7, "sadness": 0.1}, "I am so angry") == "calm_validation"


def test_get_strategy_medium_other():
    assert get_strategy("medium", {"sadness": 0.7}, "I feel down") == "empathetic_probe"


def test_get_strategy_low_stress():
    assert get_strategy("low", {"joy": 0.8}, "I feel fine") == "light_checkin"


# ── chatbot ───────────────────────────────────────────────────────────────
def test_chatbot_reply_crisis():
    result = chatbot_reply("I want to kill myself", {"stress": "high", "emotions": {"fear": 0.9}})
    assert result["crisis"] is True
    assert result["llm_used"] is False
    assert "safety" in result["text"].lower() or "safe" in result["text"].lower()


def test_chatbot_reply_fallback_when_no_key():
    from unittest.mock import patch
    # Force generate_response to return (None, error) to simulate missing key.
    with patch("chatbot.generate_response", return_value=(None, "Missing GROQ_API_KEY")):
        result = chatbot_reply("I feel so sad today", {"stress": "high", "emotions": {"sadness": 0.9}}, llm_api_key="")
    assert isinstance(result["text"], str)
    assert len(result["text"]) > 0
    assert result["llm_used"] is False
    assert result["llm_error"] == "Missing GROQ_API_KEY"


def test_pick_variant_deterministic():
    variants = ["a", "b", "c"]
    r1 = _pick_variant("same input", variants)
    r2 = _pick_variant("same input", variants)
    assert r1 == r2


def test_pick_variant_empty():
    assert _pick_variant("anything", []) == ""
