// Main application initialization and global event handlers
class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.setupModalHandlers();
        this.setupKeyboardShortcuts();
    }

    setupGlobalEventListeners() {
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.closeAllModals();
        });

        // Performance optimization: Lazy load images
        this.setupLazyLoading();
    }

    setupModalHandlers() {
        // Image modal close handler
        const closeImageModal = document.getElementById('closeImageModal');
        const imageModal = document.getElementById('imageModal');
        
        closeImageModal.addEventListener('click', () => {
            window.gallery.closeImageModal();
        });

        // Close on outside click
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                window.gallery.closeImageModal();
            }
        });

        // Share button handler
        const shareBtn = imageModal.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => {
            this.shareImage();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when no modal is open or input is focused
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'u':
                case 'U':
                    if (!this.isModalOpen()) {
                        document.getElementById('uploadBtn').click();
                        e.preventDefault();
                    }
                    break;
                case '/':
                    if (!this.isModalOpen()) {
                        document.getElementById('searchInput').focus();
                        e.preventDefault();
                    }
                    break;
            }
        });
    }

    setupLazyLoading() {
        // Intersection Observer for lazy loading images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            // Observe all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
        document.body.style.overflow = '';
    }

    isModalOpen() {
        return document.querySelector('.modal.active') !== null;
    }

    shareImage() {
        const modalTitle = document.getElementById('modalTitle').textContent;
        const modalImage = document.getElementById('modalImage');
        
        if (navigator.share) {
            // Use native Web Share API if available
            navigator.share({
                title: modalTitle,
                text: `Check out this amazing artwork: ${modalTitle}`,
                url: window.location.href
            }).catch(err => {
                console.log('Error sharing:', err);
                this.fallbackShare(modalTitle);
            });
        } else {
            this.fallbackShare(modalTitle);
        }
    }

    fallbackShare(title) {
        // Fallback sharing options
        const shareUrl = window.location.href;
        const shareText = `Check out this amazing artwork: ${title}`;
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(`${shareText} - ${shareUrl}`)
                .then(() => {
                    this.showNotification('Link copied to clipboard!', 'success');
                })
                .catch(() => {
                    this.showShareDialog(shareText, shareUrl);
                });
        } else {
            this.showShareDialog(shareText, shareUrl);
        }
    }

    showShareDialog(text, url) {
        // Create a simple share dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-lg);
            z-index: 3000;
            max-width: 400px;
            width: 90%;
        `;

        dialog.innerHTML = `
            <h3 style="margin-bottom: var(--spacing-md); color: var(--text-primary);">Share this artwork</h3>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
                <button class="btn btn-primary" onclick="window.open('https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}', '_blank')">
                    Twitter
                </button>
                <button class="btn btn-primary" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}', '_blank')">
                    Facebook
                </button>
            </div>
            <button class="btn btn-secondary" onclick="this.parentElement.remove()">Close</button>
        `;

        document.body.appendChild(dialog);

        // Remove dialog after 10 seconds
        setTimeout(() => {
            if (dialog.parentElement) {
                dialog.remove();
            }
        }, 10000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    logStatistics() {
        // Log some basic usage statistics
        const images = window.gallery.images;
        const totalLikes = images.reduce((sum, img) => sum + img.likes, 0);
        const totalComments = images.reduce((sum, img) => sum + img.comments.length, 0);
        const totalViews = images.reduce((sum, img) => sum + img.views, 0);

        console.log('ArtVault Statistics:', {
            totalImages: images.length,
            totalLikes,
            totalComments,
            totalViews,
            averageLikes: Math.round(totalLikes / images.length) || 0,
            averageComments: Math.round(totalComments / images.length) || 0,
            averageViews: Math.round(totalViews / images.length) || 0
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    
    // Log statistics after everything is loaded
    setTimeout(() => {
        window.app.logStatistics();
    }, 1000);
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    // In production, you might want to send this to an error tracking service
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page loaded in ${loadTime}ms`);
    });
}