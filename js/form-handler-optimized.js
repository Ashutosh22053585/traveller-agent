// Optimized Form Handler with API Integration
class OptimizedTravelFormHandler {
    constructor() {
        this.form = document.getElementById('travel-form');
        this.resultsContainer = document.getElementById('results');
        this.loadingIndicator = document.getElementById('loading');
        this.planResult = document.getElementById('plan-result');
        this.isSubmitting = false;
        this.apiHandler = new APIHandler();

        this.init();
    }

    init() {
        this.setupDateConstraints();
        this.setupFormValidation();
        this.setupFormSubmission();
        this.setupPerformanceOptimizations();
    }

    setupDateConstraints() {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');

        if (startDateInput) startDateInput.min = today;
        if (endDateInput) endDateInput.min = today;

        // Debounced date validation
        let dateTimeout;
        if (startDateInput) {
            startDateInput.addEventListener('change', () => {
                clearTimeout(dateTimeout);
                dateTimeout = setTimeout(() => {
                    if (endDateInput) {
                        endDateInput.min = startDateInput.value || today;
                        if (endDateInput.value && endDateInput.value < startDateInput.value) {
                            endDateInput.value = '';
                            this.showFieldError(endDateInput, 'Please select an end date after the start date');
                        }
                    }
                }, 300);
            });
        }
    }

    setupFormValidation() {
        // Debounced real-time validation
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            let validationTimeout;

            input.addEventListener('blur', () => this.validateField(input));

            input.addEventListener('input', () => {
                this.clearFieldError(input);
                clearTimeout(validationTimeout);
                validationTimeout = setTimeout(() => {
                    if (input.value.trim()) {
                        this.validateField(input);
                    }
                }, 500);
            });
        });
    }

    setupFormSubmission() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (this.isSubmitting) return;

            if (this.validateForm()) {
                await this.handleFormSubmission();
            }
        });
    }


    preloadResources() {
        // Preload font awesome icons that might be used
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, { threshold: 0.1 });

            // Observe form and results containers
            if (this.form) observer.observe(this.form);
            if (this.resultsContainer) observer.observe(this.resultsContainer);
        }
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        console.log(`DEBUG: validateField id=${field.id} value='${value}'`);

        this.clearFieldError(field);

        switch (field.type) {
            case 'text':
                if (!value) {
                    errorMessage = `${this.getFieldLabel(field)} is required`;
                    isValid = false;
                } else if (field.id === 'interests' && value.length < 3) {
                    errorMessage = 'Please provide more detailed interests';
                    isValid = false;
                }
                break;

            case 'date':
                if (!value) {
                    errorMessage = `${this.getFieldLabel(field)} is required`;
                    isValid = false;
                } else if (field.id === 'end-date') {
                    const startDate = document.getElementById('start-date').value;
                    if (startDate && new Date(value) <= new Date(startDate)) {
                        errorMessage = 'End date must be after start date';
                        isValid = false;
                    }
                } else if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (value < todayStr) {
                        errorMessage = 'Date cannot be in the past';
                        isValid = false;
                    }
                }
                break;

            case 'number':
                const numValue = parseFloat(value);
                if (!value || numValue <= 0) {
                    errorMessage = `Please enter a valid ${this.getFieldLabel(field).toLowerCase()}`;
                    isValid = false;
                } else if (field.id === 'budget' && numValue < 100) {
                    errorMessage = 'Budget should be at least $100 for a meaningful trip';
                    isValid = false;
                } else if (field.id === 'travelers' && numValue > 20) {
                    errorMessage = 'Please contact us directly for groups larger than 20';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    getFieldLabel(field) {
        // Try to find the label associated with the input
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.innerText.replace(/<[^>]*>/g, '').trim(); // Remove icons/HTML
        }
        return field.name || 'Field';
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('input[required]');
        let isValid = true;
        let firstErrorField = null;

        this.clearAllErrors();

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
                if (!firstErrorField) {
                    firstErrorField = field;
                }
            }
        });

        // Focus on first error field
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return isValid;
    }

    showFieldError(field, message) {
        field.classList.add('error-input');

        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');

        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.classList.remove('error-input');
        const errorElement = field.parentNode.querySelector('.error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    clearAllErrors() {
        const errorElements = this.form.querySelectorAll('.error');
        const errorInputs = this.form.querySelectorAll('.error-input');

        errorElements.forEach(el => el.remove());
        errorInputs.forEach(el => el.classList.remove('error-input'));
    }

    async handleFormSubmission() {
        this.isSubmitting = true;

        try {
            const formData = this.getFormData();
            this.showLoading();

            const result = await this.apiHandler.generateTravelPlan(formData);
            this.displayTravelPlan(result, formData);
            this.showSuccessMessage();

            // Analytics tracking (if needed)
            this.trackFormSubmission(formData);

        } catch (error) {
            console.error('Error generating travel plan:', error);
            this.showError((error && error.message) ? error.message : 'Failed to generate travel plan. Please try again.');
        } finally {
            this.hideLoading();
            this.isSubmitting = false;
        }
    }

    getFormData() {
        const formData = new FormData(this.form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Add checkbox value
        const flightCheckbox = document.getElementById('include-flights');
        data['include-flights'] = flightCheckbox ? flightCheckbox.checked : false;

        // Calculate trip duration
        const start = new Date(data['start-date']);
        const end = new Date(data['end-date']);
        data.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        console.log('DEBUG: getFormData result:', data);
        return data;
    }

    showLoading() {
        this.resultsContainer.style.display = 'block';
        this.resultsContainer.classList.add('active');
        this.loadingIndicator.classList.add('active');
        this.planResult.innerHTML = '';

        // Disable form during submission
        const submitBtn = this.form.querySelector('.btn-submit');
        const formInputs = this.form.querySelectorAll('input, select, textarea');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Plan...';
        }

        formInputs.forEach(input => input.disabled = true);

        // Smooth scroll to results
        setTimeout(() => {
            this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    hideLoading() {
        this.loadingIndicator.classList.remove('active');

        // Re-enable form
        const submitBtn = this.form.querySelector('.btn-submit');
        const formInputs = this.form.querySelectorAll('input, select, textarea');

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Travel Plan';
        }

        formInputs.forEach(input => input.disabled = false);
    }

    displayTravelPlan(result, formData) {
        const { text, plan, flights, hotels } = result;

        let planHTML = `
            <div class="plan-header">
                <h2><i class="fas fa-map-marked-alt"></i> Your Personalized Travel Plan</h2>
                <div class="plan-summary">
                    <div class="summary-item">
                        <i class="fas fa-map-pin"></i>
                        <span><strong>${formData.destination}</strong></span>
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formData.duration} days</span>
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>$${formData.budget} budget</span>
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-users"></i>
                        <span>${formData.travelers} traveler${formData.travelers > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
        `;

        // Add flights section if available
        if (flights && Array.isArray(flights) && flights.length > 0) {
            planHTML += this.generateFlightSection(flights);
        }

        // Add hotels section if available
        if (hotels && Array.isArray(hotels) && hotels.length > 0) {
            planHTML += this.generateHotelSection(hotels);
        }

        // Render structured plan (JSON) or fallback to raw text
        if (plan && typeof plan === 'object' && plan.itinerary) {
            planHTML += this.renderStructuredPlan(plan);
        } else if (text) {
            planHTML += `<div class="plan-content">${this.formatPlanText(text)}</div>`;
        }

        this.planResult.innerHTML = planHTML;

        // Setup interactive elements
        this.setupPlanInteractions();
    }

    // ─── Structured Plan Renderers ─────────────────────────
    renderStructuredPlan(plan) {
        let html = '';

        // Overview
        if (plan.overview) {
            html += `<div class="plan-overview"><p>${plan.overview}</p></div>`;
        }

        // Day-by-day itinerary cards
        if (plan.itinerary && plan.itinerary.length > 0) {
            html += `<div class="itinerary-section">
                <h3><i class="fas fa-route"></i> Day-by-Day Itinerary</h3>
                <div class="day-cards">`;

            plan.itinerary.forEach(day => {
                html += `
                    <div class="day-card">
                        <div class="day-card-header">
                            <span class="day-number">Day ${day.day}</span>
                            <span class="day-title">${day.title || ''}</span>
                        </div>
                        <div class="day-activities">`;

                (day.activities || []).forEach(act => {
                    const timeIcon = act.time === 'Morning' ? 'fa-sun' :
                                     act.time === 'Afternoon' ? 'fa-cloud-sun' : 'fa-moon';
                    html += `
                        <div class="activity-item">
                            <div class="activity-time">
                                <i class="fas ${timeIcon}"></i> ${act.time}
                            </div>
                            <div class="activity-body">
                                <div class="activity-title">${act.title}</div>
                                <div class="activity-desc">${act.description || ''}</div>
                                ${act.cost > 0 ? `<span class="activity-cost">~$${act.cost}</span>` : ''}
                            </div>
                        </div>`;
                });

                html += `</div></div>`;
            });

            html += `</div></div>`;
        }

        // Budget breakdown
        if (plan.budget_breakdown) {
            const b = plan.budget_breakdown;
            html += `
                <div class="budget-section">
                    <h3><i class="fas fa-wallet"></i> Budget Breakdown</h3>
                    <div class="budget-grid">
                        ${this.budgetRow('Transportation', b.transportation, b.total)}
                        ${this.budgetRow('Accommodation', b.accommodation, b.total)}
                        ${this.budgetRow('Food', b.food, b.total)}
                        ${this.budgetRow('Activities', b.activities, b.total)}
                        ${this.budgetRow('Miscellaneous', b.miscellaneous, b.total)}
                    </div>
                    <div class="budget-total">
                        <span>Estimated Total</span>
                        <strong>$${b.total || 0}</strong>
                    </div>
                </div>`;
        }

        // Food recommendations
        if (plan.food_recommendations && plan.food_recommendations.length > 0) {
            html += `<div class="food-section">
                <h3><i class="fas fa-utensils"></i> Where to Eat</h3>
                <div class="food-grid">`;
            plan.food_recommendations.forEach(f => {
                html += `<div class="food-card">
                    <div class="food-name">${f.name}</div>
                    <div class="food-meta"><span>${f.cuisine || ''}</span><span>${f.price_range || ''}</span></div>
                </div>`;
            });
            html += `</div></div>`;
        }

        // Travel tips
        if (plan.travel_tips && plan.travel_tips.length > 0) {
            html += `<div class="tips-section">
                <h3><i class="fas fa-lightbulb"></i> Travel Tips</h3>
                <ul class="tips-list">${plan.travel_tips.map(t => `<li>${t}</li>`).join('')}</ul>
            </div>`;
        }

        // Packing suggestions
        if (plan.packing_suggestions && plan.packing_suggestions.length > 0) {
            html += `<div class="packing-section">
                <h3><i class="fas fa-suitcase"></i> Packing List</h3>
                <div class="packing-tags">${plan.packing_suggestions.map(p => `<span class="packing-tag">${p}</span>`).join('')}</div>
            </div>`;
        }

        return html;
    }

    budgetRow(label, amount, total) {
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return `<div class="budget-row">
            <span class="budget-label">${label}</span>
            <div class="budget-bar-wrap"><div class="budget-bar" style="width:${pct}%"></div></div>
            <span class="budget-amount">$${amount || 0}</span>
        </div>`;
    }

    generateHotelSection(hotels) {
        let hotelHTML = `
            <div class="hotel-details">
                <h3><i class="fas fa-bed"></i> Recommended Accommodations</h3>
                <div class="hotel-cards">
        `;

        hotels.forEach(hotel => {
            const rating = hotel.rating || 0;
            const stars = hotel.stars || '';
            const priceDisplay = hotel.price_per_night || hotel.price || 'N/A';
            const amenities = hotel.amenities || [];
            const thumbnail = hotel.thumbnail || '';

            hotelHTML += `
                <div class="hotel-card">
                    ${thumbnail ? `<div class="hotel-thumb"><img src="${thumbnail}" alt="${hotel.name}" loading="lazy"></div>` : ''}
                    <div class="hotel-header">
                        <div class="hotel-name">${hotel.name}</div>
                        <div class="hotel-brand">${stars}</div>
                    </div>
                    <div class="hotel-meta">
                        <div class="hotel-price">${priceDisplay}/night</div>
                        <div class="hotel-rating">
                            <i class="fas fa-star"></i> ${rating}
                            ${hotel.reviews ? `<span class="hotel-reviews">(${hotel.reviews})</span>` : ''}
                        </div>
                    </div>
                    ${hotel.description ? `<div class="hotel-address">${hotel.description}</div>` : ''}
                    ${amenities.length > 0 ? `
                        <div class="hotel-amenities">
                            ${amenities.map(a => `<span>${a}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        hotelHTML += `</div></div>`;
        return hotelHTML;
    }

    generateFlightSection(flights) {
        let flightHTML = `
            <div class="flight-details">
                <h3><i class="fas fa-plane"></i> Flight Options</h3>
                <div class="flight-cards">
        `;

        flights.forEach((flight) => {
            // Duration comes as total minutes from SerpApi
            const durationMins = flight.duration || 0;
            const hours = Math.floor(durationMins / 60);
            const mins = durationMins % 60;
            const durationStr = durationMins > 0 ? `${hours}h ${mins}m` : '';
            const stops = flight.stops || 0;
            const price = flight.price || 0;

            flightHTML += `
                <div class="flight-card">
                    <div class="flight-header">
                        <div class="airline">
                            ${flight.airline_logo ? `<img src="${flight.airline_logo}" alt="" width="20" height="20" style="vertical-align:middle;margin-right:6px;border-radius:4px;">` : ''}
                            ${flight.airline}
                        </div>
                        <div class="flight-price">$${price}</div>
                    </div>
                    <div class="flight-times">
                        <div class="departure">
                            <strong>${flight.departure_time || ''}</strong>
                            <small>${flight.departure_airport || ''}</small>
                        </div>
                        <div class="flight-duration">
                            ${durationStr}
                            <div style="width:60px;height:1px;background:rgba(255,255,255,0.2);margin:4px auto;"></div>
                            <small>${stops === 0 ? 'Direct' : stops + ' stop' + (stops > 1 ? 's' : '')}</small>
                        </div>
                        <div class="arrival">
                            <strong>${flight.arrival_time || ''}</strong>
                            <small>${flight.arrival_airport || ''}</small>
                        </div>
                    </div>
                    ${stops === 0 ?
                        '<div class="direct-flight"><i class="fas fa-check"></i> Direct Flight</div>' :
                        `<div class="layovers">${stops} stop${stops > 1 ? 's' : ''}</div>`
                    }
                </div>
            `;
        });

        flightHTML += `</div></div>`;
        return flightHTML;
    }

    formatPlanText(text) {
        // Basic markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    setupPlanInteractions() {
        // Add copy to clipboard functionality
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-plan-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Plan';
        copyBtn.onclick = () => this.copyPlanToClipboard();

        const planHeader = this.planResult.querySelector('.plan-header');
        if (planHeader) {
            planHeader.appendChild(copyBtn);
        }

        // Add print functionality
        const printBtn = document.createElement('button');
        printBtn.className = 'print-plan-btn';
        printBtn.innerHTML = '<i class="fas fa-print"></i> Print Plan';
        printBtn.onclick = () => window.print();

        if (planHeader) {
            planHeader.appendChild(printBtn);
        }
    }

    async copyPlanToClipboard() {
        try {
            const planText = this.planResult.innerText;
            await navigator.clipboard.writeText(planText);
            this.showToast('Travel plan copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        this.planResult.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button onclick="location.reload()" class="btn-retry">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn-dismiss">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                </div>
            </div>
        `;
    }

    showSuccessMessage() {
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            Travel plan generated successfully! 
            <small>Scroll down to view your personalized itinerary.</small>
        `;

        if (this.planResult && this.planResult.parentNode) {
            this.planResult.parentNode.insertBefore(successMsg, this.planResult);
        } else {
            this.resultsContainer.appendChild(successMsg);
        }

        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.remove();
            }
        }, 5000);
    }

    trackFormSubmission(formData) {
        // Analytics tracking (implement as needed)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'travel_plan_generated', {
                destination: formData.destination,
                duration: formData.duration,
                budget_range: this.getBudgetRange(formData.budget),
                travelers: formData.travelers
            });
        }
    }

    setupPerformanceOptimizations() {
        // Lazy-load results section only when it scrolls into view
        if ('IntersectionObserver' in window && this.resultsContainer) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.contentVisibility = 'auto';
                    }
                });
            }, { rootMargin: '200px' });
            observer.observe(this.resultsContainer);
        }
    }

    getBudgetRange(budget) {
        if (budget < 500) return 'low';
        if (budget < 1500) return 'medium';
        if (budget < 3000) return 'high';
        return 'luxury';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptimizedTravelFormHandler();
});