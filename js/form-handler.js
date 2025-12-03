// Form Handler - Optimized for better UX
class TravelFormHandler {
    constructor() {
        this.form = document.getElementById('travel-form');
        this.resultsContainer = document.getElementById('results');
        this.loadingIndicator = document.getElementById('loading');
        this.planResult = document.getElementById('plan-result');
        this.isSubmitting = false;
        
        this.init();
    }
    
    init() {
        this.setupDateConstraints();
        this.setupFormValidation();
        this.setupFormSubmission();
        this.setupScrollButton();
    }
    
    setupDateConstraints() {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        startDateInput.min = today;
        endDateInput.min = today;
        
        // Update end date minimum when start date changes
        startDateInput.addEventListener('change', () => {
            endDateInput.min = startDateInput.value || today;
            if (endDateInput.value && endDateInput.value < startDateInput.value) {
                endDateInput.value = '';
            }
        });
    }
    
    setupFormValidation() {
        // Real-time validation
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
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
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.style.display = 'block';
            } else {
                scrollBtn.style.display = 'none';
            }
        });
        
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Clear previous errors
        this.clearFieldError(field);
        
        switch (field.type) {
            case 'text':
                if (!value) {
                    errorMessage = `${this.getFieldLabel(field)} is required`;
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
                }
                break;
                
            case 'number':
                if (!value || parseFloat(value) <= 0) {
                    errorMessage = `Please enter a valid ${this.getFieldLabel(field).toLowerCase()}`;
                    isValid = false;
                }
                break;
        }
        
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    validateForm() {
        const requiredFields = this.form.querySelectorAll('input[required]');
        let isValid = true;
        
        // Clear all previous errors
        this.clearAllErrors();
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.classList.add('error-input');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.textContent = message;
        
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
    
    getFieldLabel(field) {
        const label = field.parentNode.querySelector('label');
        return label ? label.textContent.replace(/[^a-zA-Z\s]/g, '').trim() : field.name;
    }
    
    async handleFormSubmission() {
        this.isSubmitting = true;
        this.showLoading();
        
        try {
            const formData = this.getFormData();
            const travelPlan = await this.generateTravelPlan(formData);
            this.displayTravelPlan(travelPlan);
            this.showSuccessMessage();
        } catch (error) {
            console.error('Error generating travel plan:', error);
            this.showError('Failed to generate travel plan. Please try again.');
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
        
        // Calculate trip duration
        const start = new Date(data['start-date']);
        const end = new Date(data['end-date']);
        data.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        return data;
    }
    
    async generateTravelPlan(formData) {
        // This would integrate with your existing API calls
        // For now, return a promise that resolves with mock data
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    destination: formData.destination,
                    duration: formData.duration,
                    budget: formData.budget,
                    plan: "Your optimized travel plan will appear here..."
                });
            }, 2000);
        });
    }
    
    showLoading() {
        this.resultsContainer.style.display = 'block';
        this.resultsContainer.classList.add('active');
        this.loadingIndicator.classList.add('active');
        this.planResult.innerHTML = '';
        
        // Disable form during submission
        const submitBtn = this.form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating Plan...';
        
        // Scroll to results
        this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    hideLoading() {
        this.loadingIndicator.classList.remove('active');
        
        // Re-enable form
        const submitBtn = this.form.querySelector('.btn-submit');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Travel Plan';
    }
    
    displayTravelPlan(plan) {
        this.planResult.innerHTML = `
            <h2>Your Travel Plan</h2>
            <div class="plan-content">
                <p><strong>Destination:</strong> ${plan.destination}</p>
                <p><strong>Duration:</strong> ${plan.duration} days</p>
                <p><strong>Budget:</strong> $${plan.budget}</p>
                <div class="plan-details">
                    ${plan.plan}
                </div>
            </div>
        `;
    }
    
    showError(message) {
        this.planResult.innerHTML = `
            <div class="error-message">
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-retry">Try Again</button>
            </div>
        `;
    }
    
    showSuccessMessage() {
        // Optional: Show a brief success message
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Travel plan generated successfully!';
        
        this.resultsContainer.insertBefore(successMsg, this.planResult);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.remove();
            }
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TravelFormHandler();
});