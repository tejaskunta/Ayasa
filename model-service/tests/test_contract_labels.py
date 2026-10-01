from contract import normalize_stress_label


def test_normalize_handles_every_real_world_label():
    # Whatever the model or an old client sends, it resolves to our vocabulary.
    assert normalize_stress_label("Low") == "Low"
    assert normalize_stress_label("low") == "Low"
    assert normalize_stress_label("LABEL_0") == "Low"
    assert normalize_stress_label("LABEL_1") == "Medium"
    assert normalize_stress_label("LABEL_2") == "High"
    assert normalize_stress_label("0") == "Low"
    assert normalize_stress_label("2") == "High"


def test_moderate_becomes_medium_not_a_crash():
    """This is the exact collision that broke the original database writes."""
    assert normalize_stress_label("Moderate") == "Medium"
    assert normalize_stress_label("moderate") == "Medium"


def test_unrecognised_label_returns_none():
    assert normalize_stress_label("banana") is None
    assert normalize_stress_label(None) is None