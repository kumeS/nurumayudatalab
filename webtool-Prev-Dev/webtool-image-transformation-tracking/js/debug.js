/**
 * Debug Utility System for Image Transformation Tracker
 * Provides comprehensive debugging capabilities including:
 * - Structured logging with levels
 * - Performance monitoring
 * - State inspection
 * - Event tracking
 * - Error boundaries
 * - Test suite
 */

class DebugSystem {
    constructor() {
        this.LOG_LEVELS = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        };
        
        this.currentLevel = this.LOG_LEVELS.INFO;
        this.logs = [];
        this.maxLogs = 1000;
        this.performanceMarks = new Map();
        this.eventLog = [];
        this.errorLog = [];
        this.isEnabled = false;
        
        this.loadConfig();
        this.setupErrorCapture();
        this.exposeGlobalAPI();
        
        if (this.isEnabled) {
            this.log('DEBUG', 'Debug system initialized');
        }
    }
    
    /**
     * Load debug configuration from localStorage
     */
    loadConfig() {
        try {
            const config = localStorage.getItem('debugConfig');
            if (config) {
                const parsed = JSON.parse(config);
                this.isEnabled = parsed.enabled || false;
                this.currentLevel = this.LOG_LEVELS[parsed.level] ?? this.LOG_LEVELS.INFO;
            }
        } catch (error) {
            console.error('Failed to load debug config:', error);
        }
    }
    
    /**
     * Save debug configuration to localStorage
     */
    saveConfig() {
        try {
            const levelName = Object.keys(this.LOG_LEVELS).find(
                key => this.LOG_LEVELS[key] === this.currentLevel
            );
            localStorage.setItem('debugConfig', JSON.stringify({
                enabled: this.isEnabled,
                level: levelName
            }));
        } catch (error) {
            console.error('Failed to save debug config:', error);
        }
    }
    
    /**
     * Enable debug mode
     */
    enable() {
        this.isEnabled = true;
        this.saveConfig();
        this.log('INFO', '🐛 Debug mode enabled');
    }
    
    /**
     * Disable debug mode
     */
    disable() {
        this.isEnabled = false;
        this.saveConfig();
        console.log('🐛 Debug mode disabled');
    }
    
    /**
     * Set log level
     */
    setLevel(level) {
        if (typeof level === 'string') {
            level = this.LOG_LEVELS[level.toUpperCase()];
        }
        if (level !== undefined) {
            this.currentLevel = level;
            this.saveConfig();
            this.log('INFO', `Log level set to: ${Object.keys(this.LOG_LEVELS).find(k => this.LOG_LEVELS[k] === level)}`);
        }
    }
    
    /**
     * Structured logging
     */
    log(level, message, data = null) {
        if (!this.isEnabled) return;
        
        const levelValue = typeof level === 'string' ? this.LOG_LEVELS[level] : level;
        if (levelValue < this.currentLevel) return;
        
        const entry = {
            timestamp: new Date().toISOString(),
            level: typeof level === 'string' ? level : Object.keys(this.LOG_LEVELS).find(k => this.LOG_LEVELS[k] === level),
            message,
            data
        };
        
        this.logs.push(entry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Console output with color
        const colors = {
            DEBUG: 'color: #6B7280',
            INFO: 'color: #3B82F6',
            WARN: 'color: #F59E0B',
            ERROR: 'color: #EF4444; font-weight: bold'
        };
        
        const style = colors[entry.level] || '';
        console.log(`%c[${entry.level}] ${entry.message}`, style, data || '');
    }
    
    /**
     * Convenience logging methods
     */
    debug(message, data) { this.log('DEBUG', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }
    
    /**
     * Performance monitoring
     */
    startPerformance(label) {
        this.performanceMarks.set(label, performance.now());
        this.debug(`⏱️ Started: ${label}`);
    }
    
    endPerformance(label) {
        const start = this.performanceMarks.get(label);
        if (start) {
            const duration = performance.now() - start;
            this.performanceMarks.delete(label);
            this.info(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            return duration;
        }
        return null;
    }
    
    /**
     * Async operation timing decorator
     */
    async timeAsync(label, asyncFn) {
        this.startPerformance(label);
        try {
            const result = await asyncFn();
            this.endPerformance(label);
            return result;
        } catch (error) {
            this.endPerformance(label);
            this.error(`${label} failed:`, error);
            throw error;
        }
    }
    
    /**
     * Event tracking
     */
    trackEvent(eventName, data = null) {
        const event = {
            timestamp: new Date().toISOString(),
            name: eventName,
            data
        };
        this.eventLog.push(event);
        this.debug(`📊 Event: ${eventName}`, data);
        
        // Keep only recent events
        if (this.eventLog.length > 500) {
            this.eventLog.shift();
        }
    }
    
    /**
     * Error boundary wrapper
     */
    wrap(fn, context = 'Anonymous function') {
        return (...args) => {
            try {
                const result = fn(...args);
                
                // Handle promises
                if (result && typeof result.then === 'function') {
                    return result.catch(error => {
                        this.captureError(error, context);
                        throw error;
                    });
                }
                
                return result;
            } catch (error) {
                this.captureError(error, context);
                throw error;
            }
        };
    }
    
    /**
     * Capture and log errors
     */
    captureError(error, context = 'Unknown') {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message,
            stack: error.stack,
            error
        };
        
        this.errorLog.push(errorEntry);
        this.error(`❌ Error in ${context}:`, error);
        
        // Keep only recent errors
        if (this.errorLog.length > 100) {
            this.errorLog.shift();
        }
    }
    
    /**
     * Setup global error capture
     */
    setupErrorCapture() {
        window.addEventListener('error', (event) => {
            this.captureError(event.error || new Error(event.message), 'Global error handler');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError(event.reason, 'Unhandled promise rejection');
        });
    }
    
    /**
     * State inspection utilities
     */
    getState() {
        return {
            workflowEngine: {
                nodes: window.workflowEngine ? window.workflowEngine.nodes.size : 0,
                edges: window.workflowEngine ? window.workflowEngine.edges.size : 0,
                mode: window.workflowEngine?.mode,
                selectedNodes: window.workflowEngine?.selectedNodes.size || 0,
                selectedEdges: window.workflowEngine?.selectedEdges.size || 0
            },
            canvasController: {
                initialized: !!window.canvasController,
                connectingFrom: window.canvasController?.connectingFrom,
                imageCache: window.canvasController?.imageCache?.size || 0
            },
            config: {
                hasIOKey: !!(window.config?.get('ioApiKey')),
                hasReplicateKey: !!(window.config?.get('replicateApiKey')),
                llmModel: window.config?.get('llmModel'),
                imageModel: window.config?.get('imageModel'),
                autoSave: window.config?.get('autoSave')
            },
            localStorage: {
                used: this.getLocalStorageSize(),
                workflows: this.getWorkflowCount()
            }
        };
    }
    
    getLocalStorageSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return `${(total / 1024).toFixed(2)} KB`;
        } catch (error) {
            return 'Unknown';
        }
    }
    
    getWorkflowCount() {
        try {
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
            return workflows.length;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Clear various caches
     */
    clearCache() {
        if (window.canvasController?.imageCache) {
            window.canvasController.imageCache.clear();
            this.info('🧹 Image cache cleared');
        }
        
        this.logs = [];
        this.eventLog = [];
        this.info('🧹 Debug logs cleared');
    }
    
    /**
     * Export debug logs
     */
    exportLogs() {
        const data = {
            timestamp: new Date().toISOString(),
            state: this.getState(),
            logs: this.logs,
            events: this.eventLog,
            errors: this.errorLog,
            performance: Array.from(this.performanceMarks.entries())
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.info('📥 Debug logs exported');
    }
    
    /**
     * Display debug console
     */
    showConsole() {
        const existingConsole = document.getElementById('debugConsole');
        if (existingConsole) {
            existingConsole.remove();
        }
        
        const console = document.createElement('div');
        console.id = 'debugConsole';
        console.className = 'fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-purple-500 z-[9999] shadow-2xl';
        console.style.height = '300px';
        console.style.overflow = 'auto';
        console.innerHTML = `
            <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <h3 class="text-white font-semibold">🐛 Debug Console</h3>
                <button onclick="document.getElementById('debugConsole').remove()" class="text-white hover:text-red-400">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-4 font-mono text-xs overflow-auto" style="height: 260px;">
                ${this.logs.slice(-50).map(log => {
                    const color = {
                        DEBUG: 'text-gray-400',
                        INFO: 'text-blue-400',
                        WARN: 'text-yellow-400',
                        ERROR: 'text-red-400'
                    }[log.level] || 'text-white';
                    return `<div class="${color} mb-1">[${log.timestamp.split('T')[1].split('.')[0]}] [${log.level}] ${log.message}</div>`;
                }).join('')}
            </div>
        `;
        document.body.appendChild(console);
    }
    
    /**
     * Test suite
     */
    async runTests() {
        this.info('🧪 Running test suite...');
        const results = [];
        
        // Test 1: Config initialization
        results.push(this.test('Config initialization', () => {
            return window.config !== undefined && window.config !== null;
        }));
        
        // Test 2: WorkflowEngine initialization
        results.push(this.test('WorkflowEngine initialization', () => {
            return window.workflowEngine !== undefined && window.workflowEngine !== null;
        }));
        
        // Test 3: Node creation and deletion
        results.push(await this.testAsync('Node creation and deletion', async () => {
            const initialCount = window.workflowEngine.nodes.size;
            const node = window.workflowEngine.createNode({ position: { x: 0, y: 0 } });
            if (!node) return false;
            
            const afterCreate = window.workflowEngine.nodes.size;
            window.workflowEngine.deleteNode(node.id);
            const afterDelete = window.workflowEngine.nodes.size;
            
            return afterCreate === initialCount + 1 && afterDelete === initialCount;
        }));
        
        // Test 4: Edge creation
        results.push(await this.testAsync('Edge creation', async () => {
            const node1 = window.workflowEngine.createNode({ position: { x: 0, y: 0 } });
            const node2 = window.workflowEngine.createNode({ position: { x: 100, y: 100 } });
            
            const edge = window.workflowEngine.createEdge(node1.id, node2.id);
            const success = edge !== null;
            
            // Cleanup
            window.workflowEngine.deleteNode(node1.id);
            window.workflowEngine.deleteNode(node2.id);
            
            return success;
        }));
        
        // Test 5: localStorage operations
        results.push(this.test('localStorage operations', () => {
            try {
                localStorage.setItem('test_key', 'test_value');
                const value = localStorage.getItem('test_key');
                localStorage.removeItem('test_key');
                return value === 'test_value';
            } catch (error) {
                return false;
            }
        }));
        
        // Test 6: Image cache
        results.push(this.test('Image cache initialization', () => {
            return window.canvasController?.imageCache instanceof Map;
        }));
        
        // Test 7: Config methods
        results.push(this.test('Config has required methods', () => {
            return typeof window.config?.get === 'function' &&
                   typeof window.config?.set === 'function';
        }));
        
        // Test 8: Event system
        results.push(this.test('Event system', () => {
            let called = false;
            const callback = () => { called = true; };
            
            window.workflowEngine.on('test_event', callback);
            window.workflowEngine.emit('test_event');
            window.workflowEngine.off('test_event', callback);
            
            return called;
        }));
        
        // Generate report
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        
        this.info(`\n${'='.repeat(60)}`);
        this.info(`🧪 Test Results: ${passed} passed, ${failed} failed`);
        this.info(`${'='.repeat(60)}\n`);
        
        results.forEach(result => {
            const icon = result.passed ? '✅' : '❌';
            const color = result.passed ? 'INFO' : 'ERROR';
            this.log(color, `${icon} ${result.name}${result.error ? ': ' + result.error : ''}`);
        });
        
        this.info(`\n${'='.repeat(60)}\n`);
        
        return { passed, failed, results };
    }
    
    /**
     * Individual test runner
     */
    test(name, testFn) {
        try {
            const result = testFn();
            return { name, passed: result, error: null };
        } catch (error) {
            return { name, passed: false, error: error.message };
        }
    }
    
    /**
     * Async test runner
     */
    async testAsync(name, testFn) {
        try {
            const result = await testFn();
            return { name, passed: result, error: null };
        } catch (error) {
            return { name, passed: false, error: error.message };
        }
    }
    
    /**
     * Expose global API
     */
    exposeGlobalAPI() {
        window.debug = {
            enable: () => this.enable(),
            disable: () => this.disable(),
            setLevel: (level) => this.setLevel(level),
            
            log: (message, data) => this.log('INFO', message, data),
            debug: (message, data) => this.debug(message, data),
            info: (message, data) => this.info(message, data),
            warn: (message, data) => this.warn(message, data),
            error: (message, data) => this.error(message, data),
            
            startPerformance: (label) => this.startPerformance(label),
            endPerformance: (label) => this.endPerformance(label),
            timeAsync: (label, fn) => this.timeAsync(label, fn),
            
            trackEvent: (name, data) => this.trackEvent(name, data),
            
            getState: () => this.getState(),
            clearCache: () => this.clearCache(),
            exportLogs: () => this.exportLogs(),
            showConsole: () => this.showConsole(),
            
            runTests: () => this.runTests(),
            
            // Quick access to current state
            get state() { return debugSystem.getState(); },
            get logs() { return debugSystem.logs; },
            get events() { return debugSystem.eventLog; },
            get errors() { return debugSystem.errorLog; }
        };
    }
}

// Initialize debug system
const debugSystem = new DebugSystem();

// Log initialization
if (debugSystem.isEnabled) {
    console.log('%c🐛 Debug System Ready', 'color: #10B981; font-weight: bold; font-size: 14px');
    console.log('%cType `debug.help` for available commands', 'color: #6B7280');
}

// Add help command
window.debug.help = () => {
    console.log(`
%c🐛 Debug System Commands%c

%cBasic Controls:%c
  debug.enable()          - Enable debug mode
  debug.disable()         - Disable debug mode
  debug.setLevel(level)   - Set log level (DEBUG, INFO, WARN, ERROR)

%cLogging:%c
  debug.log(msg, data)    - Log info message
  debug.debug(msg, data)  - Log debug message
  debug.info(msg, data)   - Log info message
  debug.warn(msg, data)   - Log warning message
  debug.error(msg, data)  - Log error message

%cPerformance:%c
  debug.startPerformance(label)  - Start timing an operation
  debug.endPerformance(label)    - End timing and log duration
  debug.timeAsync(label, fn)     - Time an async function

%cState Inspection:%c
  debug.getState()        - Get current application state
  debug.state             - Quick access to state
  debug.logs              - View all debug logs
  debug.events            - View tracked events
  debug.errors            - View captured errors

%cUtilities:%c
  debug.clearCache()      - Clear image cache and debug logs
  debug.exportLogs()      - Download debug logs as JSON
  debug.showConsole()     - Show debug console overlay
  debug.trackEvent(name, data) - Track a custom event

%cTesting:%c
  debug.runTests()        - Run complete test suite
    `, 
    'color: #10B981; font-weight: bold; font-size: 16px', '',
    'color: #3B82F6; font-weight: bold', '',
    'color: #3B82F6; font-weight: bold', '',
    'color: #3B82F6; font-weight: bold', '',
    'color: #3B82F6; font-weight: bold', '',
    'color: #3B82F6; font-weight: bold', '',
    'color: #3B82F6; font-weight: bold', ''
    );
};
