from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from datetime import datetime
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get API key from environment variables
API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

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

@app.route('/', methods=['GET'])
def index():
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
        
        # Extract travel details from request
        source = data.get('source')
        destination = data.get('destination')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        budget = data.get('budget')
        interests = data.get('interests')
        travelers = data.get('travelers')
        
        # Calculate trip duration
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        duration = (end - start).days
        
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
        response = model.generate_content(prompt)
        
        # Return the generated travel plan
        return jsonify({
            "success": True,
            "plan": response.text
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)