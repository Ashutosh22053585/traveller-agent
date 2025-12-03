// Performance Monitoring for Travel Planner AI
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            firstInputDelay: 0,
            apiResponseTimes: [],
            formSubmissionTime: 0
        };
        
        this.init();
    }
    
    init() {
        this.measurePageLoad();
        this.measureWebVitals();
        this.setupPerformanceObserver();
        this.monitorAPIPerformance();
        this.setupErrorTracking();
    }
    
    measurePageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            this.metrics.pageLoad = navigation.loadEventEnd - navigation.loadEventStart;
            
            console.log(`Page Load Time: ${this.metrics.pageLoad}ms`);
            this.reportMetric('page_load_time', this.metrics.pageLoad);
        });
    }
    
    measureWebVitals() {
        // First Contentful Paint
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    this.metrics.firstContentfulPaint = entry.startTime;
                    console.log(`First Contentful Paint: ${entry.startTime}ms`);
                    this.reportMetric('first_contentful_paint', entry.startTime);
                }
            }
        }).observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics.largestContentfulPaint = lastEntry.startTime;
            console.log(`Largest Contentful Paint: ${lastEntry.startTime}ms`);
            this.reportMetric('largest_contentful_paint', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.metrics.cumulativeLayoutShift = clsValue;
            console.log(`Cumulative Layout Shift: ${clsValue}`);
            this.reportMetric('cumulative_layout_shift', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
        
        // First Input Delay
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
                console.log(`First Input Delay: ${this.metrics.firstInputDelay}ms`);
                this.reportMetric('first_input_delay', this.metrics.firstInputDelay);
            }
        }).observe({ entryTypes: ['first-input'] });
    }
    
    setupPerformanceObserver() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.duration > 50) {
                        console.warn(`Long task detected: ${entry.duration}ms`);
                        this.reportMetric('long_task', entry.duration);
                    }
                }
            }).observe({ entryTypes: ['longtask'] });
        }
    }
    
    monitorAPIPerformance() {
        // Intercept fetch requests to monitor API performance
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.metrics.apiResponseTimes.push({
                    url: args[0],
                    duration,
                    status: response.status,
                    timestamp: Date.now()
                });
                
                console.log(`API Request: ${args[0]} - ${duration}ms - Status: ${response.status}`);
                this.reportMetric('api_response_time', duration);
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                console.error(`API Request Failed: ${args[0]} - ${duration}ms`, error);
                this.reportMetric('api_error', { url: args[0], duration, error: error.message });
                
                throw error;
            }
        };
    }
    
    setupErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('JavaScript Error:', event.error);
            this.reportMetric('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason);
            this.reportMetric('promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            });
        });
    }
    
    measureFormSubmission(startTime) {
        const endTime = performance.now();
        this.metrics.formSubmissionTime = endTime - startTime;
        console.log(`Form Submission Time: ${this.metrics.formSubmissionTime}ms`);
        this.reportMetric('form_submission_time', this.metrics.formSubmissionTime);
    }
    
    reportMetric(name, value) {
        // In production, send to analytics service
        if (typeof gtag !== 'undefined') {
            gtag('event', 'performance_metric', {
                metric_name: name,
                metric_value: typeof value === 'object' ? JSON.stringify(value) : value,
                timestamp: Date.now()
            });
        }
        
        // Store in localStorage for debugging
        const perfData = JSON.parse(localStorage.getItem('travel_planner_perf') || '[]');
        perfData.push({
            name,
            value,
            timestamp: Date.now(),
            url: window.location.href
        });
        
        // Keep only last 100 entries
        if (perfData.length > 100) {
            perfData.splice(0, perfData.length - 100);
        }
        
        localStorage.setItem('travel_planner_perf', JSON.stringify(perfData));
    }
    
    getPerformanceReport() {
        return {
            ...this.metrics,
            userAgent: navigator.userAgent,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            timing: performance.timing,
            timestamp: Date.now()
        };
    }
    
    logPerformanceReport() {
        console.table(this.getPerformanceReport());
    }
    
    // Method to be called when form submission starts
    startFormSubmissionTimer() {
        this.formSubmissionStartTime = performance.now();
    }
    
    // Method to be called when form submission ends
    endFormSubmissionTimer() {
        if (this.formSubmissionStartTime) {
            this.measureFormSubmission(this.formSubmissionStartTime);
            this.formSubmissionStartTime = null;
        }
    }
    
    // Check if performance is degraded
    isPerformanceDegraded() {
        const report = this.getPerformanceReport();
        
        return {
            slowPageLoad: report.pageLoad > 3000,
            slowFCP: report.firstContentfulPaint > 2500,
            slowLCP: report.largestContentfulPaint > 4000,
            highCLS: report.cumulativeLayoutShift > 0.25,
            slowFID: report.firstInputDelay > 300,
            slowAPI: report.apiResponseTimes.some(api => api.duration > 5000)
        };
    }
    
    // Provide performance recommendations
    getPerformanceRecommendations() {
        const degraded = this.isPerformanceDegraded();
        const recommendations = [];
        
        if (degraded.slowPageLoad) {
            recommendations.push('Consider optimizing resource loading and reducing bundle size');
        }
        
        if (degraded.slowFCP) {
            recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
        }
        
        if (degraded.slowLCP) {
            recommendations.push('Optimize largest contentful element loading');
        }
        
        if (degraded.highCLS) {
            recommendations.push('Stabilize layout by reserving space for dynamic content');
        }
        
        if (degraded.slowFID) {
            recommendations.push('Reduce JavaScript execution time and optimize event handlers');
        }
        
        if (degraded.slowAPI) {
            recommendations.push('Optimize API calls and implement better caching strategies');
        }
        
        return recommendations;
    }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Make it globally available for debugging
window.performanceMonitor = performanceMonitor;

// Log performance report after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        performanceMonitor.logPerformanceReport();
        
        const recommendations = performanceMonitor.getPerformanceRecommendations();
        if (recommendations.length > 0) {
            console.group('Performance Recommendations:');
            recommendations.forEach(rec => console.log(`• ${rec}`));
            console.groupEnd();
        }
    }, 5000);
});