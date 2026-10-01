"""The analyzer: turns text into a typed AnalyzeResponse.

Two modes, one output contract:

  transformer  -> the real Hugging Face model (ganeshtk/silentstress-model)
  rules_only   -> deterministic keyword/rule fallback, ALWAYS available

The critical design decision: rules_only is not an error state. It is a
first-class mode. That means a fresh clone, a machine without enough RAM, or a
down Hugging Face all produce a working product instead of a 500.
"""

from __future__ import annotations

import os
import threading

from contract import (
    CONTRACT_VERSION,
    EMOTION_LABELS,
    STRESS_LEVELS,
    normalize_stress_label,
)
from schemas import AnalyzeRequest, AnalyzeResponse, EmotionScore
from safety import CRISIS_RESPONSE, detect_crisis
from llm import generate_reply

MODEL_NAME = os.getenv("STRESS_MODEL_NAME", "ganeshtk/silentstress-model")
MODEL_SUBFOLDER = os.getenv(
    "STRESS_MODEL_SUBFOLDER", "Complete_StressModel/bert_stress_model_final_2"
)

# --- keyword tables (the rules_only brain) -----------------------------------

# Distress cues are split by severity. A severe word ("hopeless") is strong on
# its own; a moderate word ("overwhelmed") is situational pressure and should not
# by itself shout the loudest alarm.
SEVERE_CUES: tuple[str, ...] = (
    "hopeless", "worthless", "cannot cope", "can't cope", "depressed",
    "miserable", "devastated", "desperate", "trapped", "panic", "terrified",
    "heartbroken", "numb", "falling apart", "can't go on", "cannot go on",
)

MODERATE_CUES: tuple[str, ...] = (
    "anxious", "anxiety", "overwhelm", "lonely", "exhausted", "burnt out",
    "burned out", "struggling", "frustrated", "furious", "scared", "crying",
    "stressed", "stress", "worried", "worry", "pressure", "tired", "burden",
    "heavy", "rough", "hard time",
)

# Kept so callers/tests can enumerate the negative emotion slots.
NEGATIVE_EMOTIONS: tuple[str, ...] = ("anger", "sadness", "fear")

CALM_CUES: tuple[str, ...] = (
    "calm", "fine", "okay", "relaxed", "manageable", "stable", "good",
    "great", "grateful", "happy", "hopeful", "content",
)

# Hedges soften a word: "a bit overwhelmed" is not "overwhelmed".
HEDGE_CUES: tuple[str, ...] = (
    "a bit", "a little", "slightly", "somewhat", "kind of", "sort of",
    "occasionally", "sometimes", "once in a while", "mildly",
)

# Recovery clauses: the person names a difficulty AND says they are handling it.
# English sentence order carries real meaning here, so we should not ignore it.
RECOVERY_CUES: tuple[str, ...] = (
    "i am managing", "i'm managing", "i am okay", "i'm okay", "i am ok",
    "i'm ok", "i will be okay", "i'll be okay", "feeling better",
    "i am coping", "i'm coping", "coping", "getting through", "handling it",
    "but i manage", "i can manage", "doing better", "much better",
)


def _count_cues(text: str, cues: tuple[str, ...]) -> int:
    lowered = text.lower()
    return sum(1 for cue in cues if cue in lowered)


def _softening(text: str) -> tuple[int, int, int]:
    """How much this text pulls *away* from distress: (hedge, recovery, calm)."""
    lowered = text.lower()
    return (
        _count_cues(lowered, HEDGE_CUES),
        _count_cues(lowered, RECOVERY_CUES),
        _count_cues(lowered, CALM_CUES),
    )


def _softening_factor(text: str) -> float:
    """A 0.35..1.0 multiplier that damps distress cues.

    Softening multiplies rather than subtracts, and it is floored at 0.35. That
    floor matters: "a bit overwhelmed ... but I am managing" should read as mild
    strain, not as "you are completely fine". A cautious product never fully
    erases a concern the person actually named.
    """
    hedge, recovery, calm = _softening(text)
    factor = 1.0
    if hedge:
        factor *= 0.7
    if recovery:
        factor *= 0.7
    if calm:
        factor *= 0.6
    return max(0.35, factor)


def _rules_emotions(text: str) -> tuple[dict[str, float], str, float]:
    """Deterministic emotion estimate when the transformer is unavailable.

    Intensity is graded rather than a cliff. One distress word is a hint, not a
    diagnosis; hedges ("a bit") and recovery clauses ("but I am managing") pull
    the negativity back down. This keeps the fallback from shouting "High" at
    someone who is only mildly stressed, which is exactly the kind of false
    alarm that makes a mental-health product feel unsafe to trust.
    """
    lowered = text.lower()
    severe = _count_cues(lowered, SEVERE_CUES)
    moderate = _count_cues(lowered, MODERATE_CUES)

    base = {label: 0.12 for label in EMOTION_LABELS}
    base["joy"], base["love"] = 0.18, 0.14

    raw = min(1.0, 0.6 * severe + 0.4 * moderate)
    intensity = raw * _softening_factor(text)

    if severe or moderate:
        base["sadness"] += 0.34 * intensity
        base["fear"] += 0.30 * intensity
        base["anger"] += 0.18 * intensity
        base["joy"] = max(0.02, base["joy"] * (1.0 - intensity))

    if not severe and not moderate and _count_cues(lowered, CALM_CUES):
        base["joy"] += 0.30
        base["love"] += 0.10
        base["fear"] *= 0.4
        base["sadness"] *= 0.4

    total = sum(base.values())
    probs = {k: v / total for k, v in base.items()}
    dominant = max(probs, key=probs.get)
    return probs, dominant, probs[dominant]


def _rules_stress(text: str, emotions: dict[str, float]) -> tuple[str, float]:
    """Deterministic stress estimate when the transformer is unavailable.

    Builds a pressure score from weighted cues, damps it by whatever softens the
    text, then widens the Low/Medium/High bands so a mild, self-managed worry
    lands at Medium instead of being dismissed as Low or alarming as High.
    """
    lowered = text.lower()
    severe = _count_cues(lowered, SEVERE_CUES)
    moderate = _count_cues(lowered, MODERATE_CUES)

    negative = sum(emotions.get(e, 0.0) for e in NEGATIVE_EMOTIONS)

    raw = 1.0 * severe + 0.6 * moderate
    pressure = raw * _softening_factor(text)
    pressure += 0.10 * max(0.0, negative - 0.4)
    pressure = max(0.0, min(1.6, pressure))

    if pressure >= 0.75:
        high = min(0.85, 0.60 + 0.25 * (pressure - 0.75))
        medium = (1.0 - high) * 0.60
        low = (1.0 - high) * 0.40
    elif pressure >= 0.28:
        medium = min(0.72, 0.46 + 0.60 * (pressure - 0.28))
        high = (1.0 - medium) * 0.42
        low = (1.0 - medium) * 0.58
    else:
        low = min(0.85, 0.70 + 0.60 * (0.28 - pressure))
        medium = (1.0 - low) * 0.58
        high = (1.0 - low) * 0.42

    probs = {"Low": low, "Medium": medium, "High": high}
    total = sum(probs.values())
    probs = {k: v / total for k, v in probs.items()}
    label = max(probs, key=probs.get)
    return label, probs[label]


def _strategy_for(stress: str, dominant_emotion: str, crisis: bool) -> str:
    """Map analysis -> product behavior. Pure function, easy to test."""
    if crisis:
        return "crisis_override"
    if stress == "High":
        return "deep_support"
    if stress == "Medium":
        return "calm_validation" if dominant_emotion == "anger" else "empathetic_probe"
    return "light_checkin"


# Deterministic replies per strategy. Used when there is no LLM configured.
# One sentence, warm, never a checklist — same tone rules the original prompt
# tried to enforce, but here it cannot drift.
FALLBACK_REPLIES: dict[str, str] = {
    "deep_support": "That sounds like a lot to carry, and I am here with you. What feels heaviest right now?",
    "calm_validation": "I can hear the frustration in this, and it makes sense. What triggered it most today?",
    "empathetic_probe": "Thank you for sharing that honestly. You do not have to carry it alone. What has been building up the most?",
    "light_checkin": "You are checking in with good self-awareness. What would make the next hour feel a little lighter?",
}


class Analyzer:
    """Holds the optional model and produces AnalyzeResponse objects."""

    def __init__(self) -> None:
        self.mode = "rules_only"
        self._stress_pipeline = None
        self._emotion_pipeline = None
        self._loading = False
        self._load_if_enabled_in_background()

    def _load_if_enabled_in_background(self) -> None:
        enabled = os.getenv("ENABLE_HF_MODELS", "false").strip().lower() in {
            "1", "true", "yes", "on",
        }
        if not enabled:
            print("[analyzer] ENABLE_HF_MODELS is false -> rules_only mode")
            return
        self._loading = True
        threading.Thread(target=self._load_if_enabled, daemon=True, name="hf-model-loader").start()

    def _load_if_enabled(self) -> None:
        enabled = os.getenv("ENABLE_HF_MODELS", "false").strip().lower() in {
            "1", "true", "yes", "on",
        }
        if not enabled:
            print("[analyzer] ENABLE_HF_MODELS is false -> rules_only mode")
            return
        try:
            from transformers import (  # imported lazily so the base install stays light
                AutoModelForSequenceClassification,
                AutoTokenizer,
                pipeline,
            )

            token = os.getenv("HF_TOKEN") or None
            print(f"[analyzer] loading stress model {MODEL_NAME}/{MODEL_SUBFOLDER}")
            kwargs: dict[str, object] = {"subfolder": MODEL_SUBFOLDER}
            if token:
                kwargs["token"] = token
            stress_model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, **kwargs)
            stress_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, **kwargs)
            self._stress_pipeline = pipeline(
                "text-classification",
                model=stress_model,
                tokenizer=stress_tokenizer,
                top_k=None,
            )
            self._emotion_pipeline = pipeline(
                "text-classification",
                model="bhadresh-savani/distilbert-base-uncased-emotion",
                top_k=None,
            )
            self.mode = "transformer"
            print("[analyzer] transformer mode ready")
        except Exception as exc:  # noqa: BLE001 - any failure must degrade, not crash
            print(f"[analyzer] model load failed ({exc}); continuing in rules_only mode")
            self.mode = "rules_only"
        finally:
            self._loading = False

    # -- transformer helpers --------------------------------------------------

    def _transformer_emotions(self, text: str) -> tuple[dict[str, float], str, float] | None:
        if self._emotion_pipeline is None:
            return None
        raw = self._emotion_pipeline(text[:512])
        rows = raw[0] if raw and isinstance(raw[0], list) else raw
        probs = {label: 0.0 for label in EMOTION_LABELS}
        for row in rows or []:
            label = str(row.get("label", "")).strip().lower()
            if label in probs:
                probs[label] = float(row.get("score", 0.0))
        total = sum(probs.values()) or 1.0
        probs = {k: v / total for k, v in probs.items()}
        dominant = max(probs, key=probs.get)
        return probs, dominant, probs[dominant]

    def _transformer_stress(self, text: str) -> tuple[str, float] | None:
        if self._stress_pipeline is None:
            return None
        raw = self._stress_pipeline(text[:512])
        rows = raw[0] if raw and isinstance(raw[0], list) else raw
        probs = {level: 0.0 for level in STRESS_LEVELS}
        for row in rows or []:
            mapped = normalize_stress_label(row.get("label", ""))
            if mapped:
                probs[mapped] = max(probs[mapped], float(row.get("score", 0.0)))
        total = sum(probs.values()) or 1.0
        probs = {k: v / total for k, v in probs.items()}
        label = max(probs, key=probs.get)
        return label, probs[label]

    # -- the single public entry point ---------------------------------------

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        text = request.text.strip()

        # 1. Safety first, on raw text. This can override everything below.
        crisis_phrase = detect_crisis(text)

        # 2. Emotion (transformer if available, else rules).
        emotion_result = self._transformer_emotions(text) or _rules_emotions(text)
        emotions, dominant_emotion, _ = emotion_result

        # 3. Stress (transformer if available, else rules).
        stress_result = self._transformer_stress(text) or _rules_stress(text, emotions)
        stress_label, confidence = stress_result

        # 4. Safety override wins over the model.
        if crisis_phrase:
            stress_label, dominant_emotion, confidence = "High", "fear", 0.99

        strategy = _strategy_for(stress_label, dominant_emotion, bool(crisis_phrase))
        llm_used = False
        reply = CRISIS_RESPONSE if crisis_phrase else FALLBACK_REPLIES[strategy]
        if not crisis_phrase:
            generated = generate_reply(text, {
                "is_safety_override": False,
                "strategy": strategy,
                "stress_level": stress_label,
            })
            if generated:
                reply = generated
                llm_used = True

        return AnalyzeResponse(
            contract_version=CONTRACT_VERSION,
            model_mode=self.mode,
            model_name=MODEL_NAME,
            is_safety_override=bool(crisis_phrase),
            stress_level=stress_label,
            confidence=round(float(confidence), 4),
            dominant_emotion=dominant_emotion,
            emotions=[
                EmotionScore(label=k, score=round(float(v), 4))
                for k, v in sorted(emotions.items(), key=lambda kv: kv[1], reverse=True)
            ],
            strategy=strategy,
            reply=reply,
            llm_used=llm_used,
        )