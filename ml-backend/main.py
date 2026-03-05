"""
AYASA ML Backend
────────────────
Three AI components:
  1. DistilBERT  → emotion classification (6 classes)
  2. Keyword NLP → binary stress detection
  3. Gemini LLM  → natural supportive response generation

Run with:  uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import google.genai as genai
from dotenv import load_dotenv

# Load GEMINI_API_KEY from .env file
load_dotenv()

app = FastAPI(title="AYASA ML Backend", version="1.0.0")

# Allow calls from React (port 3000) and Express (port 5000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. Load Emotion Classifier (DistilBERT) ──────────────────────────────────
# Model predicts: sadness, joy, love, anger, fear, surprise
print("⏳ Loading emotion model — first run downloads ~250 MB, be patient...")
emotion_classifier = pipeline(
    "text-classification",
    model="bhadresh-savani/distilbert-base-uncased-emotion",
)
print("✅ Emotion model ready.")

# ── 2. Gemini API setup ───────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    print("✅ Gemini API connected.")
else:
    gemini_client = None
    print("⚠️  GEMINI_API_KEY not set — responses will use built-in fallback text.")

# ── 3. Stress keyword list ────────────────────────────────────────────────────
STRESS_KEYWORDS = [
    "overwhelmed", "stress", "stressed", "stressing", "anxious", "anxiety",
    "panic", "pressure", "deadline", "tired", "burnout", "exhausted",
    "can't sleep", "cant sleep", "worried", "worry", "depressed", "depression",
    "hopeless", "frustrated", "scared", "fear", "helpless", "tense",
]

# ── Request / Response Schemas ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    gemini_api_key: str = ""  # optional per-request key supplied by the user

class ChatResponse(BaseModel):
    message: str
    emotion: str
    emotion_score: float
    stress: str
    ayasa_response: str

# ── Helper: Emotion Detection ─────────────────────────────────────────────────
def detect_emotion(text: str) -> tuple:
    """Run DistilBERT emotion classifier and return (label, confidence)."""
    result = emotion_classifier(text[:512])[0]  # cap at 512 tokens
    return result["label"], round(result["score"] * 100, 1)

# ── Helper: Stress Detection ──────────────────────────────────────────────────
# Negative emotions from DistilBERT that indicate stress
HIGH_STRESS_EMOTIONS = {"anger", "fear", "sadness"}
LOW_STRESS_EMOTIONS  = {"joy", "love"}

def detect_stress(text: str, emotion: str, emotion_score: float) -> str:
    """
    Three-level stress detection that combines keyword matching WITH emotion.
    Returns 'High Stress', 'Moderate Stress', or 'Low Stress'.
    """
    text_lower = text.lower()

    # Negation patterns — ignore keyword if preceded by a negation word
    negations = ["no ", "not ", "don't ", "dont ", "never ", "without ", "zero ", "any "]
    keyword_hit = False
    for kw in STRESS_KEYWORDS:
        pos = text_lower.find(kw)
        if pos == -1:
            continue
        # Check if keyword is preceded by a negation
        prefix = text_lower[max(0, pos - 10):pos]
        if any(neg in prefix for neg in negations):
            continue  # negated — skip this keyword
        keyword_hit = True
        break

    # ── High: keyword present AND negative emotion
    if keyword_hit and emotion in HIGH_STRESS_EMOTIONS:
        return "High Stress"
    # ── Moderate: keyword present but positive emotion, or negative emotion without keyword
    if keyword_hit:
        return "Moderate Stress"
    if emotion in HIGH_STRESS_EMOTIONS:
        return "Moderate Stress"
    # ── Low: positive emotion, no stress keywords
    return "Low Stress"

# ── Helper: Gemini Response Generation ───────────────────────────────────────
def generate_ai_response(message: str, emotion: str, stress: str, request_api_key: str = "") -> str:
    """
    Build a structured prompt for Gemini and return its response.
    Priority: per-request key > server .env key > built-in fallback replies.
    """
    # Resolve which client to use (per-request key > server .env key)
    client = None
    if request_api_key.strip():
        try:
            client = genai.Client(api_key=request_api_key.strip())
        except Exception:
            pass  # invalid key — fall through to server key or fallback
    if client is None:
        client = gemini_client  # may also be None if no server key set

    # Fallback when no API key is available at all
    if client is None:
        fallback = {
            ("joy",      "Low Stress"):       "That's great to hear! Keep doing what makes you happy — your positive energy is something to be proud of.",
            ("joy",      "Moderate Stress"):   "Glad you're in good spirits! If things feel a bit heavy sometimes, a short walk or talking to a friend can help.",
            ("joy",      "High Stress"):       "It's good that you can still find moments of happiness. Don't forget to also address the stress — small breaks go a long way.",
            ("love",     "Low Stress"):        "Feeling connected and loved is wonderful. Hold onto that warmth and let it fuel your day!",
            ("love",     "Moderate Stress"):    "Those positive connections are a real strength. Lean on the people you care about when things feel heavy.",
            ("love",     "High Stress"):        "Having love in your life is powerful. Let the people around you support you through the tough times too.",
            ("sadness",  "Low Stress"):        "It's okay to feel a bit down sometimes. Try journalling or listening to your favourite music — small comforts help.",
            ("sadness",  "Moderate Stress"):   "I can tell things weigh on you. Consider talking to someone you trust; you don't have to carry this alone.",
            ("sadness",  "High Stress"):       "You seem to be going through a difficult time. Please reach out to a counsellor or a close friend — support makes a real difference.",
            ("anger",    "Low Stress"):        "A little frustration is normal. Try stepping away briefly and taking a few slow breaths before reacting.",
            ("anger",    "Moderate Stress"):   "Sounds like some things have been building up. Physical activity or writing down what bothers you can help release that tension.",
            ("anger",    "High Stress"):       "Feeling this level of frustration is hard. Please consider talking to someone who can help — you deserve to feel calmer.",
            ("fear",     "Low Stress"):        "A bit of worry is natural. Break the problem into small steps — one at a time, you've got this!",
            ("fear",     "Moderate Stress"):   "I understand you're anxious. Try a 5-minute breathing exercise and tackle one small thing at a time.",
            ("fear",     "High Stress"):       "Fear can be overwhelming, but you don't have to face it alone. Talking to a professional can give you real tools to cope.",
            ("surprise", "Low Stress"):        "Unexpected news can be exciting! Give yourself a moment to process before jumping in.",
            ("surprise", "Moderate Stress"):   "Things may feel uncertain right now. Take a pause — clarity often comes after a short break.",
            ("surprise", "High Stress"):       "A sudden change can be a lot. Ground yourself with something familiar and talk it through with someone you trust.",
        }
        advice = fallback.get((emotion, stress), "Remember that it is okay to ask for help. You are not alone.")
        return advice

    prompt = f"""You are AYASA, a warm and supportive AI mental-health chatbot for students.

User Message:
"{message}"

Detected Emotion: {emotion}
Stress Level: {stress}

Respond in a supportive and calm tone.
Give one or two pieces of practical advice or encouragement.
Keep the response between 2 and 4 sentences.
Do NOT sound clinical or robotic.
Do NOT repeat the emotion or stress label back to the user word-for-word."""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    return response.text.strip()

# ── POST /chat ─────────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chatbot endpoint.

    Flow:
      1. Validate input
      2. Emotion classification  (DistilBERT)
      3. Stress detection        (keyword NLP)
      4. Response generation     (Gemini LLM)
      5. Return combined JSON
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    emotion, emotion_score = detect_emotion(request.message)
    stress                 = detect_stress(request.message, emotion, emotion_score)
    ayasa_response         = generate_ai_response(request.message, emotion, stress, request.gemini_api_key)

    return ChatResponse(
        message        = request.message,
        emotion        = emotion,
        emotion_score  = emotion_score,
        stress         = stress,
        ayasa_response = ayasa_response,
    )

# ── GET /health ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status":        "ok",
        "service":       "AYASA ML Backend",
        "gemini_active": gemini_client is not None,
    }

# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
