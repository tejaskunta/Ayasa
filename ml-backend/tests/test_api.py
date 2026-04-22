"""FastAPI endpoint tests — models are mocked via conftest.py."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)

MOCK_CHATBOT_RESULT = {
    "text": "That sounds heavy. What feels hardest right now?",
    "llm_used": True,
    "llm_error": None,
    "strategy": "empathetic_probe",
    "crisis": False,
}


# ── /health ────────────────────────────────────────────────────────────────
def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "AYASA ML Backend"
    assert "stress_model_loaded" in data
    assert "groq_active" in data


# ── /predict ───────────────────────────────────────────────────────────────
def test_predict_empty_text_returns_400():
    response = client.post("/predict", json={"text": "", "user_id": "tester"})
    assert response.status_code == 400


def test_predict_whitespace_text_returns_400():
    response = client.post("/predict", json={"text": "   ", "user_id": "tester"})
    assert response.status_code == 400


def test_predict_basic_response_shape():
    with patch("main.chatbot_reply", return_value=MOCK_CHATBOT_RESULT):
        response = client.post("/predict", json={"text": "I feel really overwhelmed today", "user_id": "tester"})
    assert response.status_code == 200
    data = response.json()
    assert "stressLevel" in data
    assert data["stressLevel"] in ("Low", "Medium", "High")
    assert "emotion" in data
    assert "confidence" in data
    assert 0 < data["confidence"] <= 1
    assert "ayasaResponse" in data
    assert "resources" in data
    assert isinstance(data["resources"], list)
    assert "directScoreQuery" in data


def test_predict_direct_score_query():
    with patch("main.chatbot_reply", return_value=MOCK_CHATBOT_RESULT):
        response = client.post("/predict", json={"text": "what is my stress score", "user_id": "tester"})
    assert response.status_code == 200
    data = response.json()
    assert data["directScoreQuery"] is True
    assert "estimated stress level" in data["ayasaResponse"].lower()


def test_predict_passes_groq_key_to_chatbot():
    with patch("main.chatbot_reply", return_value=MOCK_CHATBOT_RESULT) as mock_reply:
        client.post("/predict", json={"text": "stressed", "user_id": "u1", "groq_api_key": "gsk_testkey"})
    mock_reply.assert_called_once()
    _, call_kwargs = mock_reply.call_args
    # key is positional arg 2
    assert "gsk_testkey" in mock_reply.call_args[0] or "gsk_testkey" in str(mock_reply.call_args)


def test_predict_crisis_response():
    crisis_result = {**MOCK_CHATBOT_RESULT, "crisis": True, "llm_used": False,
                     "text": "I am really glad you shared this. Your safety matters most."}
    with patch("main.chatbot_reply", return_value=crisis_result):
        response = client.post("/predict", json={"text": "I want to kill myself", "user_id": "u1"})
    assert response.status_code == 200
    data = response.json()
    assert data["ayasaResponse"] == crisis_result["text"]


# ── /chat ──────────────────────────────────────────────────────────────────
def test_chat_empty_message_returns_400():
    response = client.post("/chat", json={"message": "", "user_id": "tester"})
    assert response.status_code == 400


def test_chat_response_shape():
    with patch("main.chatbot_reply", return_value=MOCK_CHATBOT_RESULT):
        response = client.post("/chat", json={"message": "I am tired", "user_id": "tester"})
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "emotion" in data
    assert "stress" in data
    assert "ayasa_response" in data
    assert data["stress"] in ("Low Stress", "Moderate Stress", "High Stress")


# ── /runtime/keys ──────────────────────────────────────────────────────────
def test_runtime_keys_no_sync_token_returns_503():
    with patch.object(main, "RUNTIME_SYNC_TOKEN", ""):
        response = client.post("/runtime/keys", json={"user_id": "u1", "llm_api_key": "key"})
    assert response.status_code == 503


def test_runtime_keys_wrong_token_returns_401():
    with patch.object(main, "RUNTIME_SYNC_TOKEN", "correct_token"):
        response = client.post(
            "/runtime/keys",
            json={"user_id": "u1", "llm_api_key": "key"},
            headers={"x-sync-token": "wrong_token"},
        )
    assert response.status_code == 401


def test_runtime_keys_stores_user_key():
    with patch.object(main, "RUNTIME_SYNC_TOKEN", "my_token"):
        response = client.post(
            "/runtime/keys",
            json={"user_id": "u42", "llm_api_key": "gsk_real_key", "hf_token": ""},
            headers={"x-sync-token": "my_token"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["llm_configured"] is True
    assert data["user_id"] == "u42"
