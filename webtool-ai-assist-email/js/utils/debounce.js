/**
 * Debounce function utility
 * Delays function execution until after the specified time has passed
 * since the last time it was invoked
 * 
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    
    return function debounced(...args) {
        const context = this;
        
        // Clear the previous timeout
        clearTimeout(timeoutId);
        
        // Set a new timeout
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

/**
 * Throttle function utility
 * Limits function execution to once per specified time interval
 * 
 * @param {Function} func - The function to throttle
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The throttled function
 */
export function throttle(func, delay) {
    let lastExecution = 0;
    let timeoutId;
    
    return function throttled(...args) {
        const context = this;
        const currentTime = Date.now();
        
        if (currentTime - lastExecution > delay) {
            func.apply(context, args);
            lastExecution = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(context, args);
                lastExecution = Date.now();
            }, delay - (currentTime - lastExecution));
        }
    };
}
