"""Tests for the rules_only brain.

These lock in the grading behaviour so the fallback cannot regress into
over-triaging everyone as High. Tone and calibration are product requirements
here, not nice-to-haves.
"""

from model import _rules_emotions, _rules_stress
from schemas import AnalyzeRequest
from model import Analyzer


def _stress(text: str) -> str:
    emotions, _, _ = _rules_emotions(text)
    label, _ = _rules_stress(text, emotions)
    return label


def test_plain_calm_day_is_low():
    assert _stress("Calm day, slept well and studied.") == "Low"


def test_mild_hedged_worry_is_not_high():
    """The exact sentence that used to be mis-triaged as High."""
    label = _stress("I have been feeling a bit overwhelmed with exams lately but I am managing.")
    assert label == "Medium", f"expected Medium for a hedged, self-managed worry, got {label}"


def test_severe_multi_cue_distress_is_high():
    assert _stress("I feel hopeless and worthless, I cannot cope and I am exhausted.") == "High"


def test_single_strong_cue_is_high():
    assert _stress("I feel completely hopeless.") == "High"


def test_hedge_softens_a_single_strong_cue():
    assert _stress("I feel a little hopeless today.") == "Medium"


def test_analyzer_never_crashes_on_any_input():
    analyzer = Analyzer()
    for text in ["", "hello", "😀", "I want to die", "fine"]:
        if not text.strip():
            continue
        res = analyzer.analyze(AnalyzeRequest(text=text, user_id="t"))
        assert res.stress_level in {"Low", "Medium", "High"}
        assert 0.0 <= res.confidence <= 1.0