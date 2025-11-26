/**
 * UI Utility Functions
 * Common UI operations like notifications, loading states, etc.
 */

/**
 * Show toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
export function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    // Add close button
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" type="button" aria-label="通知を閉じる">
                <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `;

    // Add event listeners
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => hideToast(toast));

    // Add to container
    container.appendChild(toast);

    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-hide after duration
    setTimeout(() => {
        hideToast(toast);
    }, duration);

    return toast;
}

/**
 * Hide toast notification
 * @param {HTMLElement} toast - The toast element to hide
 */
export function hideToast(toast) {
    if (!toast || !toast.parentNode) return;

    toast.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Show loading overlay
 * @param {string} message - Loading message (optional)
 */
export function showLoading(message = 'AI が処理中...') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;

    const loadingText = overlay.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = message;
    }

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;

    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Show modal dialog
 * @param {string} modalId - ID of the modal element
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    // Focus first focusable element
    const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }

    // Trap focus within modal
    trapFocus(modal);
}

/**
 * Hide modal dialog
 * @param {string} modalId - ID of the modal element
 */
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    
    // Remove focus trap
    removeFocusTrap(modal);
}

/**
 * Trap focus within an element
 * @param {HTMLElement} element - The element to trap focus within
 */
export function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    };

    element.addEventListener('keydown', handleTabKey);
    element._focusTrapHandler = handleTabKey;
}

/**
 * Remove focus trap from an element
 * @param {HTMLElement} element - The element to remove focus trap from
 */
export function removeFocusTrap(element) {
    if (element._focusTrapHandler) {
        element.removeEventListener('keydown', element._focusTrapHandler);
        delete element._focusTrapHandler;
    }
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} unsafe - Unsafe string
 * @returns {string} Escaped string
 */
export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Object of attributes
 * @param {string|HTMLElement} content - Content to insert
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Set content
    if (typeof content === 'string') {
        element.textContent = content;
    } else if (content instanceof HTMLElement) {
        element.appendChild(content);
    } else if (Array.isArray(content)) {
        content.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }
    
    return element;
}

/**
 * Get cursor position in contenteditable element
 * @param {HTMLElement} element - The contenteditable element
 * @returns {Object} Object with start and end positions
 */
export function getCursorPosition(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return { start: 0, end: 0 };
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    
    const start = preCaretRange.toString().length;
    const end = start + range.toString().length;
    
    return { start, end };
}

/**
 * Set cursor position in contenteditable element
 * @param {HTMLElement} element - The contenteditable element
 * @param {number} position - The position to set cursor at
 */
export function setCursorPosition(element, position) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    let currentPosition = 0;
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        const nextPosition = currentPosition + node.textContent.length;
        if (position <= nextPosition) {
            range.setStart(node, position - currentPosition);
            range.setEnd(node, position - currentPosition);
            break;
        }
        currentPosition = nextPosition;
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Animate element with CSS classes
 * @param {HTMLElement} element - Element to animate
 * @param {string} animationClass - CSS class for animation
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when animation completes
 */
export function animateElement(element, animationClass, duration = 300) {
    return new Promise((resolve) => {
        element.classList.add(animationClass);
        
        const handleAnimationEnd = () => {
            element.classList.remove(animationClass);
            element.removeEventListener('animationend', handleAnimationEnd);
            resolve();
        };
        
        element.addEventListener('animationend', handleAnimationEnd);
        
        // Fallback timeout
        setTimeout(() => {
            if (element.classList.contains(animationClass)) {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            }
        }, duration);
    });
}
