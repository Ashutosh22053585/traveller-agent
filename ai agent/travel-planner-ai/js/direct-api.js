// API keys
const GEMINI_API_KEY = "AIzaSyBvxdAvVecjqaJ7BGNYksCTo9A2lsZQ0vg";
const SERP_API_KEY = "f40fd201a146c3fd5f8809255aad6c87ea7f2200345dcd4b8d4ad514bd32dc67";

document.addEventListener('DOMContentLoaded', function() {
    const travelForm = document.getElementById('travel-form');
    const resultsContainer = document.getElementById('results');
    const loadingIndicator = document.getElementById('loading');
    const planResult = document.getElementById('plan-result');
    
    // Set minimum date for date inputs to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').min = today;
    document.getElementById('end-date').min = today;
    
    // Add event listener for form submission
    travelForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show loading indicator
        resultsContainer.style.display = 'block';
        loadingIndicator.style.display = 'flex';
        planResult.innerHTML = '';
        
        // Get form data
        const source = document.getElementById('source').value;
        const destination = document.getElementById('destination').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const budget = document.getElementById('budget').value;
        const interests = document.getElementById('interests').value;
        const travelers = document.getElementById('travelers').value;
        
        // Calculate trip duration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        try {
            // Check if flight details are requested
            const includeFlights = document.getElementById('include-flights').checked;
            
            // Flight data to be included in the plan
            let flightData = null;
            
            // If flight details are requested, fetch them from SerpAPI
            if (includeFlights) {
                try {
                    // Show a message that we're fetching flight data
                    planResult.innerHTML = '<p>Searching for the best flights...</p>';
                    
                    // Format dates for the API
                    const formattedStartDate = startDate.replace(/-/g, '');
                    
                    // Call SerpAPI for flight data
                    const flightResponse = await fetch(`https://serpapi.com/search.json?engine=google_flights&departure_id=${encodeURIComponent(source)}&arrival_id=${encodeURIComponent(destination)}&outbound_date=${formattedStartDate}&currency=USD&hl=en&api_key=${SERP_API_KEY}`);
                    
                    if (flightResponse.ok) {
                        const flightResults = await flightResponse.json();
                        flightData = flightResults;
                        
                        // Update the message
                        planResult.innerHTML = '<p>Found flight options! Now generating your complete travel plan...</p>';
                    }
                } catch (flightError) {
                    console.error('Error fetching flight data:', flightError);
                    // Use mock flight data if the API call fails
                    planResult.innerHTML = '<p>Using sample flight data. Generating your travel plan...</p>';
                    
                    // Mock flight data for testing
                    flightData = {
                        "best_flights": [
                            {
                                "airline": "Delta Airlines",
                                "price": "450",
                                "duration": "5h 30m",
                                "departure_time": "08:15 AM",
                                "arrival_time": "1:45 PM",
                                "departure_airport": source,
                                "arrival_airport": destination,
                                "layovers": []
                            },
                            {
                                "airline": "United Airlines",
                                "price": "385",
                                "duration": "6h 15m",
                                "departure_time": "10:30 AM",
                                "arrival_time": "4:45 PM",
                                "departure_airport": source,
                                "arrival_airport": destination,
                                "layovers": ["Chicago (ORD)"]
                            }
                        ],
                        "other_flights": [
                            {
                                "airline": "American Airlines",
                                "price": "510",
                                "duration": "5h 45m"
                            },
                            {
                                "airline": "JetBlue",
                                "price": "425",
                                "duration": "6h 30m"
                            }
                        ]
                    };
                }
            }
            
            // Create prompt for Gemini
            let prompt = `
            Create a detailed travel plan with the following details:
            - Source: ${source}
            - Destination: ${destination}
            - Travel dates: ${startDate} to ${endDate} (${duration} days)
            - Budget: $${budget} USD
            - Interests: ${interests}
            - Number of travelers: ${travelers}

            Please include:
            1. A brief introduction to ${destination} and why it's a good match for the interests
            2. Suggested accommodations with price ranges
            3. A day-by-day itinerary for the entire ${duration} days
            4. Food recommendations including local specialties and estimated meal costs
            5. Must-see attractions and activities based on the interests
            6. Estimated total cost breakdown
            7. Travel tips specific to ${destination}
            8. Packing suggestions based on the destination and travel dates

            Format the response in a well-structured way with clear headings and sections.
            `;
            
            // Add flight data to the prompt if available
            if (flightData && flightData.best_flights) {
                prompt += `\n\nHere is flight information to include in the transportation section:\n`;
                
                // Add best flights
                if (flightData.best_flights.length > 0) {
                    prompt += `\nBest Flight Options:\n`;
                    flightData.best_flights.forEach((flight, index) => {
                        prompt += `Option ${index + 1}: ${flight.airline} - $${flight.price} - Duration: ${flight.duration} - Departure: ${flight.departure_time}, Arrival: ${flight.arrival_time}\n`;
                        if (flight.layovers && flight.layovers.length > 0) {
                            prompt += `  Layovers: ${flight.layovers.join(', ')}\n`;
                        }
                    });
                }
                
                // Add other flights if available
                if (flightData.other_flights && flightData.other_flights.length > 0) {
                    prompt += `\nAdditional Flight Options:\n`;
                    flightData.other_flights.slice(0, 3).forEach((flight, index) => {
                        prompt += `Option ${index + 1}: ${flight.airline} - $${flight.price} - Duration: ${flight.duration}\n`;
                    });
                }
            }
            
            // Call Gemini API directly
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 4096
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                const generatedText = data.candidates[0].content.parts[0].text;
                
                // Create a more visually appealing travel plan
                displayTravelPlan(generatedText, flightData);
            } else {
                displayError('Failed to generate travel plan. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            displayError('Network error. Please check your connection and try again.');
        } finally {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
        }
    });
    
    // Function to validate form
    function validateForm() {
        let isValid = true;
        
        // Clear previous error messages
        document.querySelectorAll('.error').forEach(el => el.remove());
        document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));
        
        // Validate source
        const source = document.getElementById('source');
        if (!source.value.trim()) {
            showError(source, 'Please enter your starting location');
            isValid = false;
        }
        
        // Validate destination
        const destination = document.getElementById('destination');
        if (!destination.value.trim()) {
            showError(destination, 'Please enter your destination');
            isValid = false;
        }
        
        // Validate dates
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (!startDate.value) {
            showError(startDate, 'Please select a start date');
            isValid = false;
        }
        
        if (!endDate.value) {
            showError(endDate, 'Please select an end date');
            isValid = false;
        }
        
        if (startDate.value && endDate.value && new Date(startDate.value) > new Date(endDate.value)) {
            showError(endDate, 'End date must be after start date');
            isValid = false;
        }
        
        // Validate budget
        const budget = document.getElementById('budget');
        if (!budget.value || budget.value <= 0) {
            showError(budget, 'Please enter a valid budget amount');
            isValid = false;
        }
        
        // Validate interests
        const interests = document.getElementById('interests');
        if (!interests.value.trim()) {
            showError(interests, 'Please enter at least one interest');
            isValid = false;
        }
        
        // Validate travelers
        const travelers = document.getElementById('travelers');
        if (!travelers.value || travelers.value < 1) {
            showError(travelers, 'Please enter at least 1 traveler');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Function to show error message
    function showError(inputElement, message) {
        inputElement.classList.add('error-input');
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.textContent = message;
        inputElement.parentNode.appendChild(errorElement);
    }
    
    // Function to display travel plan
    function displayTravelPlan(planText, flightData) {
        // Convert markdown-like text to HTML
        const formattedText = formatTravelPlan(planText);
        
        // Create a container for the travel plan
        let planHTML = `
            <div class="travel-plan">
                <div class="plan-header">
                    <h2>Your Personalized Travel Plan</h2>
                    <p class="plan-subtitle">Generated by Gemini 1.5-flash</p>
                </div>
                <div class="plan-content">
                    ${formattedText}
                </div>
            </div>
        `;
        
        // Add flight details in a visually appealing way if available
        if (flightData && flightData.best_flights && flightData.best_flights.length > 0) {
            let flightHTML = `
                <div class="flight-details">
                    <h3><i class="fas fa-plane"></i> Flight Options</h3>
                    <div class="flight-cards">
            `;
            
            // Add best flights
            flightData.best_flights.forEach((flight, index) => {
                flightHTML += `
                    <div class="flight-card">
                        <div class="flight-card-header">
                            <span class="airline">${flight.airline}</span>
                            <span class="price">$${flight.price}</span>
                        </div>
                        <div class="flight-card-body">
                            <div class="flight-times">
                                <div class="departure">
                                    <span class="time">${flight.departure_time}</span>
                                    <span class="location">${flight.departure_airport || source}</span>
                                </div>
                                <div class="flight-duration">
                                    <span class="duration-line"></span>
                                    <span class="duration-text">${flight.duration}</span>
                                    <span class="duration-line"></span>
                                </div>
                                <div class="arrival">
                                    <span class="time">${flight.arrival_time}</span>
                                    <span class="location">${flight.arrival_airport || destination}</span>
                                </div>
                            </div>
                `;
                
                if (flight.layovers && flight.layovers.length > 0) {
                    flightHTML += `
                            <div class="layovers">
                                <span class="layover-label">Layovers:</span>
                                <span class="layover-cities">${flight.layovers.join(', ')}</span>
                            </div>
                    `;
                }
                
                flightHTML += `
                        </div>
                    </div>
                `;
            });
            
            flightHTML += `
                    </div>
                </div>
            `;
            
            // Insert flight details at the beginning of the plan content
            planHTML = planHTML.replace('<div class="plan-content">', '<div class="plan-content">' + flightHTML);
        }
        
        planResult.innerHTML = planHTML;
        
        // Add CSS for the enhanced travel plan
        addTravelPlanStyles();
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Function to add styles for the enhanced travel plan
    function addTravelPlanStyles() {
        // Check if styles already exist
        if (!document.getElementById('travel-plan-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'travel-plan-styles';
            styleElement.textContent = `
                .travel-plan {
                    background-color: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                
                .plan-header {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    color: white;
                    padding: 25px;
                    text-align: center;
                }
                
                .plan-header h2 {
                    margin: 0;
                    font-size: 28px;
                    color: white;
                    border-bottom: none;
                }
                
                .plan-subtitle {
                    margin-top: 5px;
                    font-style: italic;
                    opacity: 0.9;
                }
                
                .plan-content {
                    padding: 30px;
                }
                
                .plan-content h2 {
                    color: var(--primary-color);
                    border-bottom: 2px solid var(--light-gray);
                    padding-bottom: 10px;
                    margin-top: 30px;
                    margin-bottom: 20px;
                }
                
                .plan-content h3 {
                    color: var(--secondary-color);
                    margin-top: 25px;
                    margin-bottom: 15px;
                }
                
                .plan-content p {
                    line-height: 1.8;
                    margin-bottom: 15px;
                }
                
                .plan-content ul {
                    margin-bottom: 20px;
                }
                
                .plan-content li {
                    margin-bottom: 10px;
                    line-height: 1.6;
                }
                
                .flight-details {
                    background-color: #f8f9fa;
                    background-image: linear-gradient(135deg, rgba(67, 97, 238, 0.03) 0%, rgba(247, 37, 133, 0.03) 100%);
                    border-radius: 16px;
                    padding: 30px;
                    margin-bottom: 40px;
                    border-left: 5px solid var(--accent-color);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                    position: relative;
                    overflow: hidden;
                }
                
                .flight-details::before {
                    content: '✈️';
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    font-size: 80px;
                    opacity: 0.05;
                    transform: rotate(45deg);
                }
                
                .flight-details h3 {
                    color: var(--primary-color);
                    margin-top: 0;
                    margin-bottom: 25px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.6rem;
                    font-weight: 600;
                }
                
                .flight-details h3 i {
                    color: var(--accent-color);
                }
                
                .flight-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .flight-card {
                    background-color: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
                    transition: all var(--transition-speed);
                    transform: translateY(0);
                }
                
                .flight-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
                }
                
                .flight-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 18px 20px;
                    background: var(--gradient-primary);
                    color: white;
                    position: relative;
                    overflow: hidden;
                }
                
                .flight-card-header::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    background: rgba(255, 255, 255, 0.2);
                    clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%);
                }
                
                .airline {
                    font-weight: bold;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .airline::before {
                    content: '✈️';
                    font-size: 20px;
                }
                
                .price {
                    font-size: 22px;
                    font-weight: 700;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 5px 15px;
                    border-radius: 30px;
                }
                
                .flight-card-body {
                    padding: 25px;
                }
                
                .flight-times {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .departure, .arrival {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                
                .time {
                    font-size: 22px;
                    font-weight: 700;
                    color: var(--text-color);
                    margin-bottom: 5px;
                }
                
                .location {
                    font-size: 15px;
                    color: #666;
                    font-weight: 500;
                }
                
                .flight-duration {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    margin: 0 20px;
                    position: relative;
                }
                
                .duration-line {
                    height: 3px;
                    background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
                    width: 100%;
                    position: relative;
                    border-radius: 3px;
                }
                
                .duration-line:before, .duration-line:after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }
                
                .duration-line:before {
                    left: 0;
                    background-color: var(--primary-color);
                }
                
                .duration-line:after {
                    right: 0;
                    background-color: var(--accent-color);
                }
                
                .duration-text {
                    font-size: 15px;
                    color: #666;
                    margin: 10px 0 0;
                    font-weight: 600;
                    background: rgba(67, 97, 238, 0.1);
                    padding: 5px 15px;
                    border-radius: 20px;
                }
                
                .layovers {
                    background-color: rgba(247, 37, 133, 0.05);
                    padding: 15px;
                    border-radius: 10px;
                    font-size: 15px;
                    margin-top: 15px;
                    border-left: 3px solid var(--accent-color);
                }
                
                .layover-label {
                    font-weight: 600;
                    color: #666;
                    margin-right: 8px;
                    display: inline-block;
                }
                
                .layover-cities {
                    color: var(--accent-color);
                    font-weight: 500;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    // Function to format travel plan text
    function formatTravelPlan(text) {
        // Replace markdown headings with HTML headings
        let formatted = text
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')
            // Convert lists
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
            // Convert paragraphs
            .replace(/\n\n/g, '</p><p>')
            // Handle line breaks
            .replace(/\n/g, '<br>');
        
        // Wrap lists in <ul> tags
        let inList = false;
        const lines = formatted.split('<li>');
        formatted = lines.map((line, i) => {
            if (i === 0) return line;
            
            if (!inList) {
                inList = true;
                return '<ul><li>' + line;
            }
            
            if (!line.includes('</li>')) {
                inList = false;
                return line + '</ul>';
            }
            
            return '<li>' + line;
        }).join('');
        
        // Wrap the entire text in a paragraph
        formatted = '<p>' + formatted + '</p>';
        
        // Clean up any empty paragraphs
        formatted = formatted.replace(/<p><\/p>/g, '');
        
        return formatted;
    }
    
    // Function to display error message
    function displayError(message) {
        planResult.innerHTML = `
            <div class="error" style="padding: 20px; text-align: center;">
                <h3>Error</h3>
                <p>${message}</p>
                <p>Please try again or check your input.</p>
            </div>
        `;
    }
});