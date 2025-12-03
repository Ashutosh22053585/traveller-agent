class APIHandler {
    constructor() {
        // API keys should only be used server-side for security
        // Frontend should not contain API keys
        this.GEMINI_API_KEY = null; // Not used in frontend
        this.SERP_API_KEY = null; // Not used in frontend

        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
    }

    // Cross-browser timeout signal
    timeoutSignal(ms) {
        try {
            if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
                return AbortSignal.timeout(ms);
            }
        } catch (e) { }
        const controller = new AbortController();
        setTimeout(() => {
            try { controller.abort(); } catch (e) { }
        }, ms);
        return controller.signal;
    }

    // Rate limiting and caching
    async makeRequest(url, options, cacheKey = null) {
        // Check cache first
        if (cacheKey && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                signal: this.timeoutSignal(30000) // 30 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Cache successful responses
            if (cacheKey) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async generateTravelPlan(formData) {
        const prompt = this.buildPrompt(formData);
        const cacheKey = `travel_plan_${this.hashString(JSON.stringify(formData))}`;

        try {
            // Get flight and hotel data in parallel
            const [flightData, hotelData] = await Promise.allSettled([
                formData['include-flights'] ? this.getFlightData(formData) : null,
                this.getHotelData(formData)
            ]);

            // Prepare additional data for prompt enhancement
            const additionalData = {
                flights: flightData.status === 'fulfilled' ? flightData.value : null,
                hotels: hotelData.status === 'fulfilled' ? hotelData.value : null
            };

            // Call local backend (uses server-side API key)
            const backendPayload = {
                source: formData.source,
                destination: formData.destination,
                startDate: formData['start-date'],
                endDate: formData['end-date'],
                budget: formData.budget,
                interests: formData.interests,
                travelers: formData.travelers
            };
            console.log('DEBUG: backendPayload:', backendPayload);
            const backendResp = await fetch('http://localhost:5000/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backendPayload),
                signal: this.timeoutSignal(60000)
            });

            if (!backendResp.ok) {
                const errorData = await backendResp.json().catch(() => ({}));
                throw new Error(`Backend error: ${backendResp.status} - ${errorData.error || 'Unknown error'}`);
            }

            const backendData = await backendResp.json();
            if (!backendData.success || !backendData.plan) {
                throw new Error('Backend returned invalid response');
            }

            const travelPlan = backendData.plan;

            return {
                text: travelPlan,
                flights: additionalData.flights,
                hotels: additionalData.hotels
            };

        } catch (error) {
            console.error('Error generating travel plan:', error);
            throw error;
        }
    }

    async callGeminiAPI(prompt, cacheKey = null) {
        // Check cache first
        if (cacheKey && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                console.log('Returning cached travel plan');
                return cached.data;
            }
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.GEMINI_API_KEY}`;

            const payload = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: this.timeoutSignal(60000)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API error:', errorData);
                throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }

            const travelPlan = data.candidates[0].content.parts[0].text;

            // Cache successful response
            if (cacheKey) {
                this.cache.set(cacheKey, {
                    data: travelPlan,
                    timestamp: Date.now()
                });
            }

            return travelPlan;

        } catch (error) {
            console.error('Gemini API call failed:', error);
            throw new Error(`Failed to generate travel plan: ${error.message}`);
        }
    }

    async getFlightData(formData) {
        try {
            const formattedDate = formData['start-date'].replace(/-/g, '');
            const cacheKey = `flights_${formData.source}_${formData.destination}_${formattedDate}`;

            const response = await this.makeRequest(
                `https://serpapi.com/search.json?engine=google_flights&departure_id=${encodeURIComponent(formData.source)}&arrival_id=${encodeURIComponent(formData.destination)}&outbound_date=${formattedDate}&currency=USD&hl=en&api_key=${this.SERP_API_KEY}`,
                {},
                cacheKey
            );

            return response;
        } catch (error) {
            console.warn('Flight data unavailable, using mock data:', error);
            return this.getMockFlightData(formData);
        }
    }

    async getHotelData(formData) {
        // Mock hotel data - replace with actual hotel API
        return {
            hotels: [
                {
                    name: `OYO Premium ${formData.destination}`,
                    brand: "OYO",
                    price: Math.floor(Math.random() * 50) + 30,
                    currency: "USD",
                    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
                    address: `Central ${formData.destination}`,
                    amenities: ["Free WiFi", "Breakfast", "AC", "24/7 Reception"]
                },
                {
                    name: `Grand Hotel ${formData.destination}`,
                    brand: "Independent",
                    price: Math.floor(Math.random() * 80) + 60,
                    currency: "USD",
                    rating: (Math.random() * 1 + 4).toFixed(1),
                    address: `Downtown ${formData.destination}`,
                    amenities: ["Pool", "Gym", "Restaurant", "Spa"]
                },
                {
                    name: `Budget Inn ${formData.destination}`,
                    brand: "Budget",
                    price: Math.floor(Math.random() * 30) + 20,
                    currency: "USD",
                    rating: (Math.random() * 0.8 + 3.2).toFixed(1),
                    address: `Near ${formData.destination} Station`,
                    amenities: ["Free WiFi", "Parking", "Pet Friendly"]
                }
            ]
        };
    }

    getMockFlightData(formData) {
        const basePrice = Math.floor(Math.random() * 300) + 200;
        return {
            best_flights: [
                {
                    airline: "Delta Airlines",
                    price: basePrice.toString(),
                    duration: "5h 30m",
                    departure_time: "08:15 AM",
                    arrival_time: "1:45 PM",
                    departure_airport: formData.source,
                    arrival_airport: formData.destination,
                    layovers: []
                },
                {
                    airline: "United Airlines",
                    price: (basePrice - 50).toString(),
                    duration: "6h 15m",
                    departure_time: "10:30 AM",
                    arrival_time: "4:45 PM",
                    departure_airport: formData.source,
                    arrival_airport: formData.destination,
                    layovers: ["Chicago (ORD)"]
                }
            ]
        };
    }

    buildPrompt(formData) {
        return `
Create a comprehensive travel plan with the following details:
- Source: ${formData.source}
- Destination: ${formData.destination}
- Travel dates: ${formData['start-date']} to ${formData['end-date']} (${formData.duration} days)
- Budget: $${formData.budget} USD
- Interests: ${formData.interests}
- Number of travelers: ${formData.travelers}

Please provide:
1. Destination overview and why it matches the traveler's interests
2. Detailed day-by-day itinerary for ${formData.duration} days
3. Accommodation recommendations with price ranges
4. Local cuisine and dining recommendations
5. Must-see attractions based on interests
6. Transportation options within the destination
7. Budget breakdown and cost estimates
8. Travel tips and local customs
9. Packing recommendations
10. Emergency contacts and important information

Format the response with clear headings and organize information in a user-friendly way.
        `.trim();
    }

    enhancePrompt(basePrompt, additionalData) {
        let enhancedPrompt = basePrompt;

        if (additionalData.hotels && additionalData.hotels.hotels) {
            enhancedPrompt += `\n\nRecommended Hotels:\n`;
            additionalData.hotels.hotels.forEach((hotel, index) => {
                enhancedPrompt += `${index + 1}. ${hotel.name} (${hotel.brand}) - $${hotel.price}/night - Rating: ${hotel.rating}/5\n   Address: ${hotel.address}\n   Amenities: ${hotel.amenities.join(", ")}\n\n`;
            });
        }

        if (additionalData.flights && additionalData.flights.best_flights) {
            enhancedPrompt += `\n\nFlight Options:\n`;
            additionalData.flights.best_flights.forEach((flight, index) => {
                enhancedPrompt += `${index + 1}. ${flight.airline} - $${flight.price} - ${flight.duration}\n   Departure: ${flight.departure_time}, Arrival: ${flight.arrival_time}\n`;
                if (flight.layovers && flight.layovers.length > 0) {
                    enhancedPrompt += `   Layovers: ${flight.layovers.join(', ')}\n`;
                }
                enhancedPrompt += '\n';
            });
        }

        return enhancedPrompt;
    }

    // Simple hash function for caching
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Clear cache periodically
    clearOldCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > 600000) { // 10 minutes
                this.cache.delete(key);
            }
        }
    }
}

// Export for use in other modules
window.APIHandler = APIHandler;