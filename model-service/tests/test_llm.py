from llm import generate_reply


def test_llm_is_optional_without_a_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert generate_reply("I feel okay", {"strategy": "light_checkin"}) is None


def test_llm_never_handles_crisis(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    assert generate_reply(
        "I want to die",
        {"is_safety_override": True, "strategy": "crisis_override"},
    ) is None