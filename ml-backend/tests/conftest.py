"""Patch heavy dependencies before any test imports main."""
import sys
from unittest.mock import MagicMock

# Prevent transformers from trying to download models.
_transformers_mock = MagicMock()
_transformers_mock.pipeline.side_effect = RuntimeError("mocked: no model loading in tests")
sys.modules.setdefault("transformers", _transformers_mock)

# Prevent groq from requiring an actual API key at import time.
sys.modules.setdefault("groq", MagicMock())
