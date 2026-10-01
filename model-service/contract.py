"""The contract between the model service and everything else.

This file is the SINGLE SOURCE OF TRUTH for the vocabulary shared across
services. The original Ayasa project had two vocabularies colliding:

    ML service emitted stress levels:  "Low" / "Medium" / "High"
    Mongo CheckIn schema allowed:      "Low" / "Moderate" / "High"

So a perfectly valid "Medium" prediction was rejected by the database enum.
Here we define the vocabulary once and import it everywhere. If you ever change
a label, you change it here and the type checker tells you every place that
needs updating.

Bump CONTRACT_VERSION whenever the response shape changes. Clients can pin to a
version, and `/version` lets you confirm what a running service speaks.
"""

from __future__ import annotations

from typing import Literal, get_args

# Bump this when the /analyze response shape changes in a breaking way.
CONTRACT_VERSION = "1.1.0"

# The ONE stress vocabulary. Never "Moderate". Exactly these three.
StressLevel = Literal["Low", "Medium", "High"]
STRESS_LEVELS: tuple[str, ...] = get_args(StressLevel)

# Emotion vocabulary emitted by the classifier.
EMOTION_LABELS: tuple[str, ...] = (
    "joy",
    "anger",
    "sadness",
    "fear",
    "love",
    "surprise",
)

# How the model service is running.
ModelMode = Literal["transformer", "rules_only"]


def normalize_stress_label(raw: object) -> StressLevel | None:
    """Map any junk label (label_0, 'moderate', 'HIGH') onto our vocabulary.

    Keeping this tolerant is what makes the boundary robust: whatever the model
    or an older client sends, it resolves to exactly one of our three levels,
    or None if it is truly unrecognisable.
    """
    label = str(raw or "").strip().lower()
    if "low" in label:
        return "Low"
    if "moderate" in label or "medium" in label:
        return "Medium"
    if "high" in label:
        return "High"
    if label.startswith("label_"):
        suffix = label.split("_", maxsplit=1)[-1]
        if suffix.isdigit():
            return {0: "Low", 1: "Medium", 2: "High"}.get(int(suffix))
    if label.isdigit():
        return {0: "Low", 1: "Medium", 2: "High"}.get(int(label))
    return None