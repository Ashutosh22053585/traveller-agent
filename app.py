from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from datetime import datetime
import json
from dotenv import load_dotenv, find_dotenv
from pathlib import Path

# Load environment variables from .env file (works regardless of current working directory)
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv(find_dotenv())

app = Flask(__name__, static_url_path='', static_folder='.')
CORS(app)  # Enable CORS for all routes

# Get API key from environment variables
API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

# Offline fallback control
ALWAYS_FALLBACK = os.getenv("ALWAYS_FALLBACK", "0") == "1"
INVALID_API = (not API_KEY) or (API_KEY == "YOUR_GEMINI_API_KEY")

def build_fallback_plan(source, destination, start_date, end_date, duration, budget, interests, travelers):
    try:
        per = int(int(budget) // max(1, int(travelers)))
    except Exception:
        per = budget
    days = max(1, duration)
    plan = f"""
Travel Plan: {destination}

Overview
- A curated sample itinerary for your trip from {source} to {destination}.
- Dates: {start_date} to {end_date} ({days} days)
- Budget: ${budget} USD
- Interests: {interests}
- Travelers: {travelers}

Day-by-Day Itinerary
"""
    for i in range(1, days + 1):
        plan += f"\nDay {i}\n- Morning: Explore a top attraction in {destination} aligned with your interests ({interests}).\n- Afternoon: Local cuisine tasting and scenic walk.\n- Evening: Relaxing activity or cultural experience.\n"
    plan += f"""

Transportation
- Consider flights/train/bus from {source} to {destination}. Compare prices and travel time.

Accommodations
- Mid-range hotels and guesthouses near central {destination}. Target ${per} per night per room, adjust as needed.

Food Recommendations
- Try local specialties and popular street food spots.

Attractions
- Mix of landmarks, museums, parks, and hidden gems based on interests: {interests}.

Budget Estimate
- Transportation, lodging, food, activities: keep within ${budget} for the group.

Tips
- Book key tickets in advance, carry essentials, and check local guidelines.

(Note: This is a sample plan shown because the AI service is unavailable right now.)
"""
    return plan

# Configure the model
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 4096,
    }
)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "Server is running",
        "message": "Welcome to the Travel Planner AI API",
        "endpoints": {
            "/api/generate-plan": "POST - Generate a travel plan"
        }
    })

@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    try:
        data = request.json
        print(f"DEBUG: Received data: {data}")
        # Extract travel details from request
        source = data.get('source')
        destination = data.get('destination')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        budget = data.get('budget')
        interests = data.get('interests')
        travelers = data.get('travelers')

        # Validate required fields
        if not all([source, destination, start_date, end_date, budget, interests, travelers]):
            return jsonify({
                "success": False,
                "error": "Missing required fields. Please fill out all form fields."
            }), 400

        # Calculate trip duration
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        duration = (end - start).days

        # If running without credits or API key, return fallback
        if ALWAYS_FALLBACK or INVALID_API:
            fb = build_fallback_plan(source, destination, start_date, end_date, duration, budget, interests, travelers)
            return jsonify({
                "success": True,
                "plan": fb,
                "note": "fallback_offline_mode" if ALWAYS_FALLBACK else "fallback_due_to_missing_api_key"
            }), 200

        # Create prompt for Gemini
        prompt = f"""
        Create a detailed travel plan with the following details:
        - Source: {source}
        - Destination: {destination}
        - Travel dates: {start_date} to {end_date} ({duration} days)
        - Budget: ${budget} USD
        - Interests: {interests}
        - Number of travelers: {travelers}

        Please include:
        1. A brief introduction to {destination} and why it's a good match for the interests
        2. Recommended transportation options from {source} to {destination} with estimated costs
        3. Suggested accommodations with price ranges
        4. A day-by-day itinerary for the entire {duration} days
        5. Food recommendations including local specialties and estimated meal costs
        6. Must-see attractions and activities based on the interests
        7. Estimated total cost breakdown
        8. Travel tips specific to {destination}
        9. Packing suggestions based on the destination and travel dates

        Format the response in a well-structured way with clear headings and sections.
        """

        # Generate response from Gemini
        try:
            response = model.generate_content(prompt)
        except Exception as gemini_error:
            print("Gemini API error:", gemini_error)
            fb = build_fallback_plan(source, destination, start_date, end_date, duration, budget, interests, travelers)
            return jsonify({
                "success": True,
                "plan": fb,
                "note": "fallback_due_to_error"
            }), 200

        # Return the generated travel plan
        return jsonify({
            "success": True,
            "text": response.text,
            "flights": None, # Placeholder for SerpApi
            "hotels": None   # Placeholder for SerpApi
        })

    except Exception as e:
        print("Server error:", e)
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)