from fastapi.testclient import TestClient

from contract import CONTRACT_VERSION, STRESS_LEVELS
from main import app

client = TestClient(app)


def test_health_reports_mode():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["model_mode"] in {"transformer", "rules_only"}
    assert body["contract_version"] == CONTRACT_VERSION


def test_version_lists_the_single_vocabulary():
    res = client.get("/version")
    assert res.status_code == 200
    assert set(res.json()["stress_levels"]) == {"Low", "Medium", "High"}


def test_analyze_returns_full_typed_contract():
    res = client.post("/analyze", json={"text": "I am stressed about my exam tomorrow"})
    assert res.status_code == 200
    body = res.json()
    # Every field a client depends on must be present.
    for field in (
        "contract_version",
        "model_mode",
        "stress_level",
        "confidence",
        "dominant_emotion",
        "emotions",
        "strategy",
        "reply",
        "is_safety_override",
    ):
        assert field in body, f"missing {field}"


def test_stress_level_is_never_moderate():
    """The original bug: model said 'Medium', DB enum wanted 'Moderate'."""
    for text in (
        "I feel a bit anxious",
        "Everything is fine today",
        "I am overwhelmed and cannot cope",
    ):
        body = client.post("/analyze", json={"text": text}).json()
        assert body["stress_level"] in STRESS_LEVELS
        assert body["stress_level"] != "Moderate"


def test_confidence_is_a_probability():
    body = client.post("/analyze", json={"text": "I am doing okay"}).json()
    assert 0.0 <= body["confidence"] <= 1.0


def test_emotions_are_sorted_desc():
    body = client.post("/analyze", json={"text": "I feel really sad and lonely"}).json()
    scores = [e["score"] for e in body["emotions"]]
    assert scores == sorted(scores, reverse=True)


def test_empty_text_is_rejected_cleanly():
    res = client.post("/analyze", json={"text": ""})
    # Validation error, not a 500.
    assert res.status_code == 422