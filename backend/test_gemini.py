import os
import requests
from app.db.database import SessionLocal
from app.engine.ai_engine import AIEngine

def test_gemini_integration():
    print("=" * 60)
    print("[TEST] VERIFYING GOOGLE GEMINI / GEMMA API INTEGRATION")
    print("=" * 60)

    db = SessionLocal()

    key = os.getenv("GEMINI_API_KEY", "")
    print(f"\n--- Testing Live API Key: {key[:8]}... ---")
    prompt = "Categorize this transaction: AWS Cloud Server Hosting - $1,250. Respond with category name only."
    res = AIEngine.call_gemini(prompt, api_key=key)
    print(f"LLM Response: {res}")
    assert res is not None, "Failed to get response from Gemini/Gemma API"
    print("[PASS] Live AI API Call Successful!")

    db.close()
    print("=" * 60)
    print("[SUCCESS] GEMINI / GEMMA API INTEGRATION WORKING 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_gemini_integration()
