/**
 * Core Utilities
 * Essential helper functions used throughout the application
 * Consolidated from bridge.js and helpers.js to eliminate duplication
 */

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds (default: 300)
 * @param {boolean} immediate - Whether to trigger immediately (default: false)
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds (default: 300)
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Safely query DOM elements with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {Element|null} Found element or null
 */
function query(selector, context = document) {
    try {
        return context.querySelector(selector);
    } catch (error) {
        console.error(`Invalid selector: ${selector}`, error);
        return null;
    }
}

/**
 * Safely query multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {Array} Array of found elements
 */
function queryAll(selector, context = document) {
    try {
        return Array.from(context.querySelectorAll(selector));
    } catch (error) {
        console.error(`Invalid selector: ${selector}`, error);
        return [];
    }
}

/**
 * Validate input text
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length (default: 10)
 * @param {number} maxLength - Maximum length (default: 5000)
 * @returns {boolean} Validation result
 */
function validateInput(value, minLength = 10, maxLength = 5000) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Advanced input validation with detailed results
 * @param {string} text - Text to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with errors array
 */
function validateInputDetailed(text, options = {}) {
    const {
        minLength = 10,
        maxLength = 5000,
        required = true
    } = options;
    
    const result = {
        isValid: true,
        errors: []
    };
    
    if (required && !text?.trim()) {
        result.isValid = false;
        result.errors.push('入力が必要です');
    }
    
    if (text && text.length < minLength) {
        result.isValid = false;
        result.errors.push(`最低${minLength}文字以上入力してください`);
    }
    
    if (text && text.length > maxLength) {
        result.isValid = false;
        result.errors.push(`${maxLength}文字以下で入力してください`);
    }
    
    return result;
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Advanced HTML sanitization (removes scripts, iframes, etc.)
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtmlAdvanced(html) {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

/**
 * Format text by removing extra whitespace
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
function formatText(text) {
    if (!text) return '';
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

/**
 * Generate a unique ID
 * @param {string} prefix - Prefix for the ID (default: 'id')
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object (handles arrays, dates, and nested objects)
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely execute async operations with error handling
 * @param {Function} asyncFn - Async function to execute
 * @param {Object|Function|null} errorHandler - Optional error handler or callback
 * @param {string} context - Context label for logging
 * @param {...*} callArgs - Arguments forwarded to the async function when executed immediately
 * @returns {Function|Promise} Wrapped async function or immediate execution result
 */
function safeAsync(asyncFn, errorHandler = null, context = '', ...callArgs) {
    if (typeof asyncFn !== 'function') {
        throw new TypeError('safeAsync requires a function');
    }

    const runner = async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            if (errorHandler?.handle) {
                errorHandler.handle(error, context);
            } else if (typeof errorHandler === 'function') {
                errorHandler(error, context);
            } else {
                console.error('Async error:', error);
            }
            throw error;
        }
    };

    const hasErrorHandler = errorHandler !== null && errorHandler !== undefined;
    const hasContext = typeof context === 'string' ? context.trim().length > 0 : context !== '' && context !== undefined;
    const shouldExecuteImmediately = hasErrorHandler || hasContext || callArgs.length > 0;

    if (shouldExecuteImmediately) {
        return runner(...callArgs).catch(error => {
            if (!errorHandler?.handle && typeof errorHandler !== 'function') {
                throw error;
            }
            return undefined;
        });
    }

    return runner;
}

/**
 * Safely execute sync operations with error handling
 * @param {Function} fn - Function to execute
 * @param {Object|Function|null} errorHandler - Optional error handler or callback
 * @param {string} context - Context label for logging
 * @param {...*} callArgs - Arguments forwarded to the function when executed immediately
 * @returns {Function|*} Wrapped function or immediate execution result
 */
function safeSync(fn, errorHandler = null, context = '', ...callArgs) {
    if (typeof fn !== 'function') {
        throw new TypeError('safeSync requires a function');
    }

    const runner = (...args) => {
        try {
            return fn(...args);
        } catch (error) {
            if (errorHandler?.handle) {
                errorHandler.handle(error, context);
            } else if (typeof errorHandler === 'function') {
                errorHandler(error, context);
            } else {
                console.error('Sync error:', error);
            }
            throw error;
        }
    };

    const hasErrorHandler = errorHandler !== null && errorHandler !== undefined;
    const hasContext = typeof context === 'string' ? context.trim().length > 0 : context !== '' && context !== undefined;
    const shouldExecuteImmediately = hasErrorHandler || hasContext || callArgs.length > 0;

    if (shouldExecuteImmediately) {
        try {
            return runner(...callArgs);
        } catch (error) {
            if (!errorHandler?.handle && typeof errorHandler !== 'function') {
                throw error;
            }
            return undefined;
        }
    }

    return runner;
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} Promise that resolves when function succeeds
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i === maxRetries) break;
            
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
    
    throw lastError;
}

/**
 * Create a cancellable promise
 * @param {Function} executor - Promise executor function
 * @returns {Object} Object with promise and cancel function
 */
function createCancellablePromise(executor) {
    let isCancelled = false;
    let cancelCallback = null;
    
    const promise = new Promise((resolve, reject) => {
        cancelCallback = () => {
            isCancelled = true;
            reject(new Error('Promise cancelled'));
        };
        
        const wrappedResolve = (value) => {
            if (!isCancelled) resolve(value);
        };
        
        const wrappedReject = (reason) => {
            if (!isCancelled) reject(reason);
        };
        
        executor(wrappedResolve, wrappedReject);
    });
    
    return {
        promise,
        cancel: cancelCallback,
        isCancelled: () => isCancelled
    };
}

/**
 * Check if an object is empty
 * @param {*} obj - Object to check
 * @returns {boolean} True if object is empty
 */
function isEmpty(obj) {
    if (obj == null) return true;
    if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/**
 * Format timestamp for display
 * @param {Date|string|number} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Invalid timestamp:', timestamp, error);
        return 'Invalid Date';
    }
}

// Make functions available globally for backwards compatibility
if (typeof window !== 'undefined') {
    window.debounce = debounce;
    window.throttle = throttle;
    window.query = query;
    window.queryAll = queryAll;
    window.validateInput = validateInput;
    window.sanitizeHTML = sanitizeHTML;
    window.formatText = formatText;
    window.generateId = generateId;
    window.deepClone = deepClone;
    window.safeAsync = safeAsync;
    window.safeSync = safeSync;
}

console.log('Core utilities loaded');
