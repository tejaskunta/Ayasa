from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_crisis_phrase_forces_safety_override():
    body = client.post("/analyze", json={"text": "some days I want to die"}).json()
    assert body["is_safety_override"] is True
    assert body["stress_level"] == "High"
    assert body["strategy"] == "crisis_override"
    assert "14416" in body["reply"]  # the helpline must always be present


def test_crisis_overrides_even_positive_framing():
    """Safety runs before the model, so praise words cannot mask a crisis."""
    body = client.post(
        "/analyze", json={"text": "I had a great day but honestly I want to end my life"}
    ).json()
    assert body["is_safety_override"] is True
    assert body["stress_level"] == "High"


def test_normal_text_is_not_flagged():
    body = client.post("/analyze", json={"text": "I am tired but managing"}).json()
    assert body["is_safety_override"] is False
    assert body["strategy"] != "crisis_override"


def test_high_distress_maps_to_deep_support():
    body = client.post(
        "/analyze", json={"text": "I am completely overwhelmed, anxious and cannot cope"}
    ).json()
    assert body["strategy"] in {"deep_support", "crisis_override"}


def test_calm_text_maps_to_light_checkin():
    body = client.post("/analyze", json={"text": "I feel calm and relaxed today"}).json()
    assert body["strategy"] == "light_checkin"