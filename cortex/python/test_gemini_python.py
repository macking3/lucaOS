import google.generativeai as genai
import os

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

genai.configure(api_key=api_key)

try:
    print(f"Testing Gemini with key: {api_key[:10]}...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, are you accessible?")
    print("SUCCESS: Gemini responded.")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"FAILURE: {e}")
