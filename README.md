link=https://traveller-agent.vercel.app/login.html
# ✈️ VOYA - AI-Powered Travel Planner

![VOYA Header](assets/slide-island.png)

VOYA is a next-generation, cinematic travel planning application that leverages the power of Artificial Intelligence to curate highly personalized travel itineraries. Designed with a stunning "Liquid Glass" dark-mode UI, VOYA seamlessly blends aesthetics with advanced AI capabilities.

## ✨ Features

- **🤖 AI-Generated Itineraries:** Powered by Google Gemini 2.0 Flash, VOYA crafts detailed, day-by-day travel plans customized to your interests, budget, and group size.
- **🛫 Real-Time Flight Data:** Integrates with SerpApi to pull live flight options, prices, and durations from Google Flights.
- **🏨 Live Hotel Recommendations:** Fetches real-world hotel data, complete with pricing, ratings, and amenities using Google Hotels data.
- **🔒 Secure Authentication:** Built with Firebase Admin, featuring seamless email/password and Google Sign-In options.
- **🎨 Cinematic UI/UX:** A highly responsive, liquid-glass aesthetic with smooth animations, ensuring a premium user experience across all devices.
- **🛡️ Robust Fallback System:** Smart error-handling ensures that even if the AI hits rate limits, a curated offline plan (along with real flight/hotel data) is reliably delivered.

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (Custom Liquid Glass framework)
- **Backend:** Python, Flask
- **AI Integration:** Google GenAI SDK (Gemini 2.0 Flash)
- **Data APIs:** SerpApi (Google Flights, Google Hotels)
- **Authentication:** Firebase Admin SDK

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

- Python 3.8+
- Node.js (Optional, for package management if scaling frontend)
- A Firebase Project (for Authentication)
- Google Gemini API Key
- SerpApi Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ashutosh22053585/traveller-agent.git
   cd traveller-agent
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   SERP_API_KEY=your_serpapi_key_here
   ```

4. **Set up Firebase Credentials**
   Download your Firebase service account private key and save it in the root directory as `firebase-service-account.json`. *(Note: This file is git-ignored for security).*

5. **Run the Flask Server**
   ```bash
   python app.py
   ```

6. **Access the Application**
   Open your browser and navigate to:
   ```
   http://127.0.0.1:5001/index.html
   ```
   *(⚠️ **Important:** Do not use VS Code Live Server to view the project, as it runs on a different port and will cause CORS/API connection errors with the backend).*

## 💡 Usage

1. **Log in** or skip to the dashboard using the debug button.
2. Enter your travel details: Source, Destination, Dates, Budget, and Interests.
3. Select whether you want live flight details included.
4. Click **Generate Travel Plan** and watch the AI craft your perfect trip!
5. Export your itinerary by clicking **Copy Plan** or **Print Plan**.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*Powered by Gemini 2.0 Flash | Crafted with ❤️ by Ashutosh*
