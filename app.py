from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import requests
from datetime import datetime
import json
from concurrent.futures import ThreadPoolExecutor
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

from backend.auth_middleware import requires_auth, AuthError

# Get API key from environment variables
API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

# SerpApi key for real flight + hotel data
SERP_API_KEY = os.getenv("SERP_API_KEY", "")

# Offline fallback control
ALWAYS_FALLBACK = os.getenv("ALWAYS_FALLBACK", "0") == "1"
INVALID_API = (not API_KEY) or (API_KEY == "YOUR_GEMINI_API_KEY")

# ─── SerpApi Integration ───────────────────────────────────────

def search_flights(source, destination, outbound_date, return_date):
    """Search Google Flights via SerpApi. Returns list of flight dicts or None."""
    if not SERP_API_KEY:
        print("WARN: SERP_API_KEY not set — skipping flight search")
        return None
    try:
        resp = requests.get("https://serpapi.com/search", params={
            "engine": "google_flights",
            "departure_id": source,
            "arrival_id": destination,
            "outbound_date": outbound_date,
            "return_date": return_date,
            "currency": "USD",
            "hl": "en",
            "api_key": SERP_API_KEY
        }, timeout=15)
        data = resp.json()

        flights = []
        # SerpApi returns best_flights and other_flights
        for group in ["best_flights", "other_flights"]:
            for flight in data.get(group, []):
                legs = flight.get("flights", [])
                if not legs:
                    continue
                first_leg = legs[0]
                last_leg = legs[-1]
                flights.append({
                    "airline": first_leg.get("airline", "Unknown"),
                    "airline_logo": first_leg.get("airline_logo", ""),
                    "departure_time": first_leg.get("departure_airport", {}).get("time", ""),
                    "departure_airport": first_leg.get("departure_airport", {}).get("name", source),
                    "arrival_time": last_leg.get("arrival_airport", {}).get("time", ""),
                    "arrival_airport": last_leg.get("arrival_airport", {}).get("name", destination),
                    "duration": flight.get("total_duration", 0),
                    "stops": len(legs) - 1,
                    "price": flight.get("price", 0),
                    "type": flight.get("type", "")
                })
        print(f"SerpApi: Found {len(flights)} flights")
        return flights[:6] if flights else None  # Return top 6

    except Exception as e:
        print(f"SerpApi flights error: {e}")
        return None


def search_hotels(destination, check_in, check_out):
    """Search Google Hotels via SerpApi. Returns list of hotel dicts or None."""
    if not SERP_API_KEY:
        print("WARN: SERP_API_KEY not set — skipping hotel search")
        return None
    try:
        resp = requests.get("https://serpapi.com/search", params={
            "engine": "google_hotels",
            "q": f"{destination} hotels",
            "check_in_date": check_in,
            "check_out_date": check_out,
            "currency": "USD",
            "hl": "en",
            "api_key": SERP_API_KEY
        }, timeout=15)
        data = resp.json()

        hotels = []
        for prop in data.get("properties", []):
            hotels.append({
                "name": prop.get("name", "Unknown Hotel"),
                "description": prop.get("description", ""),
                "price": prop.get("total_rate", {}).get("lowest", prop.get("rate_per_night", {}).get("lowest", "N/A")),
                "price_per_night": prop.get("rate_per_night", {}).get("lowest", "N/A"),
                "rating": prop.get("overall_rating", 0),
                "reviews": prop.get("reviews", 0),
                "stars": prop.get("hotel_class", ""),
                "amenities": prop.get("amenities", [])[:6],
                "thumbnail": prop.get("images", [{}])[0].get("thumbnail", "") if prop.get("images") else "",
                "link": prop.get("link", "")
            })
        print(f"SerpApi: Found {len(hotels)} hotels")
        return hotels[:6] if hotels else None  # Return top 6

    except Exception as e:
        print(f"SerpApi hotels error: {e}")
        return None

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

# Configure the models
# Text model (fallback)
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
    }
)

# Structured JSON model (primary)
structured_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }
)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/login.html')
def login_page():
    return app.send_static_file('login.html')

from flask import send_from_directory

@app.route('/<path:filename>')
def serve_static(filename):
    if filename.endswith(('.html', '.js', '.css', '.png', '.jpg', '.mp4')):
        return send_from_directory('.', filename)
    return "Not Found", 404

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "Server is running",
        "message": "Welcome to the Travel Planner AI API",
        "endpoints": {
            "/api/generate-plan": "POST - Generate a travel plan",
            "/api/user/profile": "GET - Get authenticated user profile"
        }
    })

@app.route('/api/user/profile', methods=['GET'])
@requires_auth
def user_profile():
    from flask import _request_ctx_stack
    user = _request_ctx_stack.top.current_user
    return jsonify({
        "success": True,
        "user": user
    })

@app.route('/api/generate-plan', methods=['POST'])
@requires_auth
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
        
        if end < start:
            return jsonify({
                "success": False,
                "error": "End date cannot be before start date."
            }), 400
            
        duration = (end - start).days

        # If running without credits or API key, return fallback
        if ALWAYS_FALLBACK or INVALID_API:
            fb = build_fallback_plan(source, destination, start_date, end_date, duration, budget, interests, travelers)
            return jsonify({
                "success": True,
                "text": fb,
                "plan": None,
                "flights": None,
                "hotels": None,
                "note": "fallback_offline_mode" if ALWAYS_FALLBACK else "fallback_due_to_missing_api_key"
            }), 200

        # Create structured JSON prompt for Gemini
        prompt = f"""Create a detailed travel plan and return it as JSON with this exact structure:
{{
  "overview": "A 2-3 sentence introduction to {destination} and why it matches the traveler's interests",
  "itinerary": [
    {{
      "day": 1,
      "title": "Day title like 'Arrival & First Impressions'",
      "activities": [
        {{"time": "Morning", "title": "Activity name", "description": "1-2 sentence details", "cost": estimated_cost_usd_number}},
        {{"time": "Afternoon", "title": "...", "description": "...", "cost": 0}},
        {{"time": "Evening", "title": "...", "description": "...", "cost": 0}}
      ]
    }}
  ],
  "budget_breakdown": {{
    "transportation": number,
    "accommodation": number,
    "food": number,
    "activities": number,
    "miscellaneous": number,
    "total": number
  }},
  "food_recommendations": [
    {{"name": "Restaurant or dish name", "cuisine": "Type", "price_range": "$10-20"}}
  ],
  "travel_tips": ["tip1", "tip2", "tip3"],
  "packing_suggestions": ["item1", "item2", "item3"]
}}

Travel details:
- From: {source}
- To: {destination}
- Dates: {start_date} to {end_date} ({duration} days)
- Budget: ${budget} USD
- Interests: {interests}
- Travelers: {travelers}

Generate exactly {duration} days in the itinerary. Each day must have 3 activities (morning, afternoon, evening). Keep total budget_breakdown.total within ${budget}. Include at least 4 food recommendations and 5 travel tips."""

        # Run Gemini + SerpApi in parallel for speed
        include_flights = data.get('includeFlights', True)
        gemini_result = None
        flight_data = None
        hotel_data = None

        with ThreadPoolExecutor(max_workers=3) as executor:
            # Submit Gemini call (try structured first)
            gemini_future = executor.submit(structured_model.generate_content, prompt)

            # Submit SerpApi calls (only if key exists)
            flight_future = None
            hotel_future = None
            if include_flights and SERP_API_KEY:
                flight_future = executor.submit(
                    search_flights, source, destination, start_date, end_date
                )
            if SERP_API_KEY:
                hotel_future = executor.submit(
                    search_hotels, destination, start_date, end_date
                )

            # Collect SerpApi results first so they aren't skipped if Gemini fails
            flight_data = None
            hotel_data = None
            if flight_future:
                try:
                    flight_data = flight_future.result(timeout=20)
                except Exception as e:
                    print(f"Flight search failed: {e}")
            if hotel_future:
                try:
                    hotel_data = hotel_future.result(timeout=20)
                except Exception as e:
                    print(f"Hotel search failed: {e}")

            # Collect Gemini result
            try:
                gemini_result = gemini_future.result(timeout=30)
            except Exception as gemini_error:
                print("Gemini API error:", gemini_error)
                fb = build_fallback_plan(source, destination, start_date, end_date, duration, budget, interests, travelers)
                return jsonify({
                    "success": True,
                    "text": fb,
                    "plan": None,
                    "flights": flight_data,
                    "hotels": hotel_data,
                    "note": "fallback_due_to_error"
                }), 200

        # Try to parse structured JSON from Gemini
        try:
            plan_data = json.loads(gemini_result.text)
            return jsonify({
                "success": True,
                "plan": plan_data,
                "text": gemini_result.text,  # raw JSON string as fallback
                "flights": flight_data,
                "hotels": hotel_data
            })
        except (json.JSONDecodeError, Exception) as parse_err:
            print(f"JSON parse failed, returning raw text: {parse_err}")
            return jsonify({
                "success": True,
                "plan": None,
                "text": gemini_result.text,
                "flights": flight_data,
                "hotels": hotel_data
            })

    except Exception as e:
        print("Server error:", e)
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)