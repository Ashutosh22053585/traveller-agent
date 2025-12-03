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
        this.setupScrollButton();
        this.setupPerformanceOptimizations();
        this.setup3DTilt();
        this.setupRippleEffect();
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

    setupScrollButton() {
        const scrollBtn = document.getElementById('scrollTopBtn');
        if (!scrollBtn) return;

        let scrollTimeout;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (window.pageYOffset > 300) {
                    scrollBtn.style.display = 'block';
                } else {
                    scrollBtn.style.display = 'none';
                }
            }, 100);
        }, { passive: true });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    setupPerformanceOptimizations() {
        // Preload critical resources
        this.preloadResources();

        // Setup intersection observer for lazy loading
        this.setupIntersectionObserver();

        // Clear API cache periodically
        setInterval(() => {
            this.apiHandler.clearOldCache();
        }, 300000); // 5 minutes
    }

    setup3DTilt() {
        const container = document.querySelector('.form-container');
        const header = document.querySelector('.advanced-header');

        const applyTilt = (element, e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
            const rotateY = ((x - centerX) / centerX) * 5;

            element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        };

        const resetTilt = (element) => {
            element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        };

        if (container) {
            container.addEventListener('mousemove', (e) => applyTilt(container, e));
            container.addEventListener('mouseleave', () => resetTilt(container));
        }

        if (header) {
            header.addEventListener('mousemove', (e) => applyTilt(header, e));
            header.addEventListener('mouseleave', () => resetTilt(header));
        }
    }

    setupRippleEffect() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                const x = e.clientX - e.target.offsetLeft;
                const y = e.clientY - e.target.offsetTop;

                const ripples = document.createElement('span');
                ripples.style.left = x + 'px';
                ripples.style.top = y + 'px';
                ripples.classList.add('ripple');
                this.appendChild(ripples);

                setTimeout(() => {
                    ripples.remove();
                }, 600);
            });
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
            this.hideLoading();
        } finally {
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
        const { text, flights, hotels } = result;

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

        // Add hotels section if available
        if (hotels && hotels.hotels) {
            planHTML += this.generateHotelSection(hotels.hotels);
        }

        // Add main plan content
        planHTML += `<div class="plan-content">${this.formatPlanText(text)}</div>`;

        // Add flights section if available
        if (flights && flights.best_flights) {
            planHTML += this.generateFlightSection(flights.best_flights);
        }

        this.planResult.innerHTML = planHTML;

        // Setup interactive elements
        this.setupPlanInteractions();
    }

    generateHotelSection(hotels) {
        let hotelHTML = `
            <div class="hotel-details">
                <h3><i class="fas fa-bed"></i> Recommended Accommodations</h3>
                <div class="hotel-cards">
        `;

        hotels.forEach(hotel => {
            hotelHTML += `
                <div class="hotel-card">
                    <div class="hotel-header">
                        <div class="hotel-name">${hotel.name}</div>
                        <div class="hotel-brand">${hotel.brand}</div>
                    </div>
                    <div class="hotel-meta">
                        <div class="hotel-price">$${hotel.price}/night</div>
                        <div class="hotel-rating">
                            <i class="fas fa-star"></i> ${hotel.rating}
                        </div>
                    </div>
                    <div class="hotel-address">${hotel.address}</div>
                    <div class="hotel-amenities">
                        ${hotel.amenities.map(amenity => `<span>${amenity}</span>`).join('')}
                    </div>
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

        flights.forEach((flight, index) => {
            flightHTML += `
                <div class="flight-card">
                    <div class="flight-header">
                        <div class="airline">${flight.airline}</div>
                        <div class="flight-price">$${flight.price}</div>
                    </div>
                    <div class="flight-times">
                        <div class="departure">
                            <strong>${flight.departure_time}</strong>
                            <small>${flight.departure_airport}</small>
                        </div>
                        <div class="flight-duration">
                            <i class="fas fa-clock"></i> ${flight.duration}
                        </div>
                        <div class="arrival">
                            <strong>${flight.arrival_time}</strong>
                            <small>${flight.arrival_airport}</small>
                        </div>
                    </div>
                    ${flight.layovers && flight.layovers.length > 0 ?
                    `<div class="layovers">Layovers: ${flight.layovers.join(', ')}</div>` :
                    '<div class="direct-flight"><i class="fas fa-check"></i> Direct Flight</div>'
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

        this.resultsContainer.insertBefore(successMsg, this.planResult);

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