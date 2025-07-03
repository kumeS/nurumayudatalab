/**
 * Performance Optimization Module for Nurumayu Smile 3D Project
 * Implements code splitting, lazy loading, and critical resource prioritization
 */

// Performance monitoring
const performanceMetrics = {
    startTime: performance.now(),
    loadTimes: {},
    resourceSizes: {},
    errors: []
};

// Lazy loading controller
class LazyLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        this.observers = new Map();
        this.intersectionObserver = null;
        
        this.initializeIntersectionObserver();
    }
    
    // Initialize intersection observer for viewport-based loading
    initializeIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const moduleId = element.getAttribute('data-lazy-module');
                        if (moduleId) {
                            this.loadModule(moduleId);
                            this.intersectionObserver.unobserve(element);
                        }
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });
        }
    }
    
    // Load module dynamically
    async loadModule(moduleId, options = {}) {
        if (this.loadedModules.has(moduleId)) {
            return Promise.resolve();
        }
        
        if (this.loadingPromises.has(moduleId)) {
            return this.loadingPromises.get(moduleId);
        }
        
        const startTime = performance.now();
        console.log(`Loading module: ${moduleId}`);
        
        let loadPromise;
        
        switch (moduleId) {
            case 'rdkit':
                loadPromise = this.loadRDKit();
                break;
            case '3dmol':
                loadPromise = this.load3DMol();
                break;
            case 'fragmentation':
                loadPromise = this.loadFragmentation();
                break;
            case 'database':
                loadPromise = this.loadDatabase();
                break;
            case 'export':
                loadPromise = this.loadExport();
                break;
            default:
                loadPromise = this.loadGenericModule(moduleId, options);
        }
        
        this.loadingPromises.set(moduleId, loadPromise);
        
        try {
            await loadPromise;
            this.loadedModules.add(moduleId);
            const loadTime = performance.now() - startTime;
            performanceMetrics.loadTimes[moduleId] = loadTime;
            console.log(`Module ${moduleId} loaded in ${loadTime.toFixed(2)}ms`);
            
            // Trigger module loaded event
            window.dispatchEvent(new CustomEvent('moduleLoaded', {
                detail: { moduleId, loadTime }
            }));
            
        } catch (error) {
            console.error(`Failed to load module ${moduleId}:`, error);
            performanceMetrics.errors.push({
                module: moduleId,
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        } finally {
            this.loadingPromises.delete(moduleId);
        }
    }
    
    // Load RDKit.js on demand
    async loadRDKit() {
        if (window.RDKit) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
            script.onload = () => {
                if (typeof initRDKitModule !== 'undefined') {
                    initRDKitModule().then((RDKit) => {
                        window.RDKit = RDKit;
                        resolve();
                    }).catch(reject);
                } else {
                    reject(new Error('RDKit initialization function not available'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load RDKit script'));
            document.head.appendChild(script);
        });
    }
    
    // Load 3Dmol.js on demand
    async load3DMol() {
        if (window.$3Dmol) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://3dmol.org/build/3Dmol-min.js';
            script.onload = () => {
                if (window.$3Dmol) {
                    resolve();
                } else {
                    reject(new Error('3Dmol.js not available after loading'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load 3Dmol.js'));
            document.head.appendChild(script);
        });
    }
    
    // Load fragmentation analysis module
    async loadFragmentation() {
        // Fragmentation module is already loaded, just ensure it's initialized
        if (typeof predictFragmentation === 'function') {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            // Simulated loading for fragmentation initialization
            setTimeout(() => {
                if (typeof predictFragmentation === 'function') {
                    resolve();
                } else {
                    reject(new Error('Fragmentation module not available'));
                }
            }, 100);
        });
    }
    
    // Load database search module
    async loadDatabase() {
        return Promise.resolve(); // Database functionality is already available
    }
    
    // Load export functionality
    async loadExport() {
        return Promise.resolve(); // Export functionality is already available
    }
    
    // Generic module loader
    async loadGenericModule(moduleId, options) {
        const { src, globalName } = options;
        
        if (src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    if (globalName && !window[globalName]) {
                        reject(new Error(`Global ${globalName} not available after loading`));
                    } else {
                        resolve();
                    }
                };
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
            });
        }
        
        return Promise.resolve();
    }
    
    // Observe element for lazy loading
    observeElement(element, moduleId) {
        if (this.intersectionObserver) {
            element.setAttribute('data-lazy-module', moduleId);
            this.intersectionObserver.observe(element);
        }
    }
    
    // Preload critical modules
    async preloadCritical() {
        const criticalModules = ['3dmol']; // Only preload essential 3D viewer
        
        const preloadPromises = criticalModules.map(moduleId => {
            return this.loadModule(moduleId).catch(error => {
                console.warn(`Failed to preload critical module ${moduleId}:`, error);
            });
        });
        
        await Promise.allSettled(preloadPromises);
    }
}

// Resource optimizer
class ResourceOptimizer {
    constructor() {
        this.compressionSupported = this.checkCompressionSupport();
        this.webpSupported = this.checkWebPSupport();
        this.criticalCSS = new Set();
    }
    
    // Check if compression is supported
    checkCompressionSupport() {
        return 'CompressionStream' in window && 'DecompressionStream' in window;
    }
    
    // Check WebP support
    checkWebPSupport() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    // Compress data for storage
    async compressData(data) {
        if (!this.compressionSupported) {
            return JSON.stringify(data);
        }
        
        try {
            const jsonString = JSON.stringify(data);
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(new TextEncoder().encode(jsonString));
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }
            
            return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
        } catch (error) {
            console.warn('Compression failed, using fallback:', error);
            return JSON.stringify(data);
        }
    }
    
    // Decompress data from storage
    async decompressData(compressedData) {
        if (typeof compressedData === 'string') {
            return JSON.parse(compressedData);
        }
        
        if (!this.compressionSupported) {
            return null;
        }
        
        try {
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(compressedData);
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }
            
            const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
            const jsonString = new TextDecoder().decode(decompressed);
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Decompression failed:', error);
            return null;
        }
    }
    
    // Extract and inline critical CSS
    extractCriticalCSS() {
        const criticalSelectors = [
            '.header', '.main-content', '.input-section', '.primary-btn',
            '.results-section', '.loading-state', '.error-state'
        ];
        
        const styleSheets = Array.from(document.styleSheets);
        let criticalCSS = '';
        
        styleSheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                rules.forEach(rule => {
                    if (rule.type === CSSRule.STYLE_RULE) {
                        const selector = rule.selectorText;
                        if (criticalSelectors.some(critical => selector.includes(critical))) {
                            criticalCSS += rule.cssText + '\n';
                        }
                    }
                });
            } catch (error) {
                // Cross-origin stylesheet, skip
                console.warn('Could not access stylesheet rules:', error);
            }
        });
        
        if (criticalCSS) {
            const style = document.createElement('style');
            style.id = 'critical-css';
            style.textContent = criticalCSS;
            document.head.insertBefore(style, document.head.firstChild);
        }
    }
    
    // Optimize images for current device
    optimizeImage(imgSrc, options = {}) {
        const { maxWidth = 800, maxHeight = 600, quality = 0.8 } = options;
        
        // If WebP is supported and not already WebP
        if (this.webpSupported && !imgSrc.includes('.webp')) {
            // Try to get WebP version if available
            const webpSrc = imgSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            return webpSrc;
        }
        
        return imgSrc;
    }
    
    // Monitor resource usage
    monitorResourceUsage() {
        if ('performance' in window && 'memory' in performance) {
            const memory = performance.memory;
            return {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2)
            };
        }
        return null;
    }
}

// Session optimization
class SessionOptimizer {
    constructor() {
        this.maxSessionSize = 5 * 1024 * 1024; // 5MB limit
    }
    
    // Get current session storage usage
    getSessionStorageUsage() {
        let total = 0;
        for (let key in sessionStorage) {
            if (sessionStorage.hasOwnProperty(key)) {
                total += sessionStorage[key].length + key.length;
            }
        }
        return total;
    }
    
    // Clean up old session data
    cleanupSessionStorage() {
        const keys = Object.keys(sessionStorage);
        const currentTime = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        keys.forEach(key => {
            try {
                const data = JSON.parse(sessionStorage[key]);
                if (data.timestamp && (currentTime - data.timestamp) > maxAge) {
                    sessionStorage.removeItem(key);
                    console.log(`Removed expired session data: ${key}`);
                }
            } catch (error) {
                // Not JSON data, check if it's a legacy key
                if (key.startsWith('smile3d_') && Math.random() < 0.1) {
                    // Randomly clean up some legacy keys
                    sessionStorage.removeItem(key);
                }
            }
        });
    }
}

// Initialize performance optimization
function initializePerformanceOptimization() {
    console.log('Initializing performance optimization...');
    
    // Create global instances
    window.lazyLoader = new LazyLoader();
    window.resourceOptimizer = new ResourceOptimizer();
    window.sessionOptimizer = new SessionOptimizer();
    
    // Extract critical CSS early
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.resourceOptimizer.extractCriticalCSS(), 100);
        });
    } else {
        window.resourceOptimizer.extractCriticalCSS();
    }
    
    // Preload critical modules
    window.lazyLoader.preloadCritical();
    
    // Set up lazy loading observers
    setupLazyLoadingObservers();
    
    // Clean up session storage
    window.sessionOptimizer.cleanupSessionStorage();
    
    // Monitor performance
    monitorPerformance();
    
    console.log('Performance optimization initialized');
}

// Set up lazy loading observers for UI elements
function setupLazyLoadingObservers() {
    // Observe 3D viewer for lazy loading
    const viewer3D = document.getElementById('viewer-3d');
    if (viewer3D) {
        window.lazyLoader.observeElement(viewer3D, '3dmol');
    }
    
    // Observe fragmentation section
    const fragmentationSection = document.getElementById('fragmentation');
    if (fragmentationSection) {
        window.lazyLoader.observeElement(fragmentationSection, 'fragmentation');
    }
}

// Monitor performance metrics
function monitorPerformance() {
    // Log performance metrics every 30 seconds
    setInterval(() => {
        const sessionUsage = window.sessionOptimizer.getSessionStorageUsage();
        
        console.log('Performance Metrics:', {
            sessionStorageUsage: `${(sessionUsage / 1024).toFixed(2)} KB`,
            loadedModules: Array.from(window.lazyLoader.loadedModules),
            errors: performanceMetrics.errors.length
        });
    }, 30000);
    
    // Report performance when page is about to unload
    window.addEventListener('beforeunload', () => {
        const totalTime = performance.now() - performanceMetrics.startTime;
        console.log('Final Performance Report:', {
            totalTime: `${totalTime.toFixed(2)}ms`,
            loadTimes: performanceMetrics.loadTimes,
            errors: performanceMetrics.errors
        });
    });
}

// Export for module loading
window.initializePerformanceOptimization = initializePerformanceOptimization;

// Auto-initialize if document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePerformanceOptimization);
} else {
    initializePerformanceOptimization();
} 