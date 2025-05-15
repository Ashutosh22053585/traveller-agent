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
        const formData = {
            source: document.getElementById('source').value,
            destination: document.getElementById('destination').value,
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value,
            budget: document.getElementById('budget').value,
            interests: document.getElementById('interests').value,
            travelers: document.getElementById('travelers').value
        };
        
        try {
            // Send request to backend API
            const response = await fetch('http://localhost:5000/api/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Format and display the travel plan
                displayTravelPlan(data.plan);
            } else {
                // Display error message
                displayError(data.error || 'Failed to generate travel plan. Please try again.');
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
    function displayTravelPlan(planText) {
        // Convert markdown-like text to HTML
        const formattedText = formatTravelPlan(planText);
        planResult.innerHTML = formattedText;
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
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