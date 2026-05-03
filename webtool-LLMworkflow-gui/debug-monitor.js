// Debug Monitor System
// Visual debugging system without console.log usage
// Provides real-time monitoring of workflow editor operations

class DebugMonitor {
    constructor() {
        // Production environment detection
        this.isProduction = window.location.protocol === 'https:' && 
                           window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
        
        // Debug mode can be controlled via URL parameter or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');
        const storedDebugMode = localStorage.getItem('workflow_debug_enabled');
        
        // Enable debug mode if:
        // 1. Not in production, OR
        // 2. Explicitly enabled via URL parameter (?debug=true), OR
        // 3. Enabled in localStorage
        this.isEnabled = !this.isProduction || 
                        debugParam === 'true' || 
                        storedDebugMode === 'true';
        
        // Allow forcing debug mode off with ?debug=false
        if (debugParam === 'false') {
            this.isEnabled = false;
        }
        
        this.logs = [];
        this.maxLogs = 100;
        this.categories = {
            INIT: { emoji: '🚀', color: '#4CAF50', name: 'Initialization' },
            EVENT: { emoji: '🎪', color: '#2196F3', name: 'Events' },
            NODE: { emoji: '⚡', color: '#FF9800', name: 'Nodes' },
            CONNECTION: { emoji: '🔗', color: '#9C27B0', name: 'Connections' },
            UI: { emoji: '🎨', color: '#607D8B', name: 'UI Updates' },
            ERROR: { emoji: '❌', color: '#F44336', name: 'Errors' },
            SUCCESS: { emoji: '✅', color: '#4CAF50', name: 'Success' },
            WARNING: { emoji: '⚠️', color: '#FF5722', name: 'Warnings' }
        };
        
        // Only initialize UI if debug mode is enabled
        if (this.isEnabled) {
            this.createDebugUI();
            this.startPerformanceMonitoring();
            this.logInit('Debug Monitor initialized', { 
                isProduction: this.isProduction,
                debugMode: this.isEnabled 
            });
        }
    }
    
    createDebugUI() {
        if (!this.isEnabled) return;
        
        // Create debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-monitor';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 500px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            border-radius: 8px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            overflow: hidden;
            border: 2px solid #333;
            backdrop-filter: blur(10px);
            display: none;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #444;
        `;
        header.innerHTML = `
            <span style="font-weight: bold;">🔍 Debug Monitor</span>
            <div>
                <button id="debug-clear" style="background: #f44336; color: white; border: none; padding: 2px 6px; border-radius: 3px; margin-right: 5px; cursor: pointer;">Clear</button>
                <button id="debug-toggle" style="background: #2196f3; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">Hide</button>
            </div>
        `;
        
        // Status bar
        const statusBar = document.createElement('div');
        statusBar.id = 'debug-status';
        statusBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            font-size: 11px;
        `;
        
        // Log container
        const logContainer = document.createElement('div');
        logContainer.id = 'debug-logs';
        logContainer.style.cssText = `
            max-height: 350px;
            overflow-y: auto;
            padding: 5px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        `;
        
        debugPanel.appendChild(header);
        debugPanel.appendChild(statusBar);
        debugPanel.appendChild(logContainer);
        document.body.appendChild(debugPanel);
        
        // Event listeners
        document.getElementById('debug-clear').addEventListener('click', () => this.clearLogs());
        document.getElementById('debug-toggle').addEventListener('click', () => this.toggleVisibility());
        
        // Create toggle button
        this.createToggleButton();
        
        this.updateStatus();
    }
    
    createToggleButton() {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'debug-monitor-toggle';
        toggleBtn.innerHTML = '🔍';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 420px;
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 2px solid #333;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10001;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        toggleBtn.addEventListener('click', () => this.toggleVisibility());
        document.body.appendChild(toggleBtn);
    }
    
    log(category, message, data = null) {
        if (!this.isEnabled) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            category,
            message,
            data: data ? JSON.stringify(data, null, 2) : null,
            id: Date.now() + Math.random()
        };
        
        this.logs.unshift(logEntry);
        
        // Limit log count
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        this.renderLogs();
        this.updateStatus();
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem('workflow_debug_logs', JSON.stringify(this.logs.slice(0, 50)));
        } catch (e) {
            // Ignore localStorage errors
        }
    }
    
    renderLogs() {
        const container = document.getElementById('debug-logs');
        if (!container) return;
        
        container.innerHTML = this.logs.map(log => {
            const categoryInfo = this.categories[log.category] || this.categories.EVENT;
            return `
                <div style="margin-bottom: 8px; padding: 4px; border-left: 3px solid ${categoryInfo.color}; background: rgba(255, 255, 255, 0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${categoryInfo.color};">${categoryInfo.emoji} ${categoryInfo.name}</span>
                        <span style="color: #888; font-size: 10px;">${log.timestamp}</span>
                    </div>
                    <div style="margin-top: 2px; color: #eee;">${log.message}</div>
                    ${log.data ? `<details style="margin-top: 4px; color: #ccc;"><summary style="cursor: pointer; color: #888;">Data</summary><pre style="margin: 4px 0; padding: 4px; background: rgba(0,0,0,0.3); border-radius: 2px; font-size: 10px; overflow-x: auto;">${log.data}</pre></details>` : ''}
                </div>
            `;
        }).join('');
        
        // Auto-scroll to top for newest logs
        container.scrollTop = 0;
    }
    
    updateStatus() {
        const statusBar = document.getElementById('debug-status');
        if (!statusBar) return;
        
        const stats = this.logs.reduce((acc, log) => {
            acc[log.category] = (acc[log.category] || 0) + 1;
            return acc;
        }, {});
        
        const memoryUsage = this.getMemoryUsage();
        
        statusBar.innerHTML = `
            <div>Logs: ${this.logs.length}/${this.maxLogs}</div>
            <div>Memory: ${memoryUsage}</div>
            <div>Errors: ${stats.ERROR || 0}</div>
        `;
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            return `${used}MB`;
        }
        return 'N/A';
    }
    
    clearLogs() {
        this.logs = [];
        this.renderLogs();
        this.updateStatus();
        localStorage.removeItem('workflow_debug_logs');
    }
    
    toggleVisibility() {
        const panel = document.getElementById('debug-monitor');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            
            const toggleBtn = document.getElementById('debug-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = isVisible ? 'Show' : 'Hide';
            }
        }
    }
    
    showMonitor() {
        const panel = document.getElementById('debug-monitor');
        if (panel) {
            panel.style.display = 'block';
        }
    }
    
    startPerformanceMonitoring() {
        if (!this.isEnabled) return;
        
        // Monitor page performance
        setInterval(() => {
            const nodeCount = document.querySelectorAll('.workflow-node').length;
            const connectionCount = document.querySelectorAll('#connections-svg path').length - 1; // -1 for grid
            
            // Only log if counts changed
            if (this.lastNodeCount !== nodeCount || this.lastConnectionCount !== connectionCount) {
                this.log('UI', `Rendered ${nodeCount} nodes, ${connectionCount} connections`);
                this.lastNodeCount = nodeCount;
                this.lastConnectionCount = connectionCount;
            }
        }, 1000);
    }
    
    // Convenience methods for different log categories
    logInit(message, data) { this.log('INIT', message, data); }
    logEvent(message, data) { this.log('EVENT', message, data); }
    logNode(message, data) { this.log('NODE', message, data); }
    logConnection(message, data) { this.log('CONNECTION', message, data); }
    logUI(message, data) { this.log('UI', message, data); }
    logError(message, data) { this.log('ERROR', message, data); }
    logSuccess(message, data) { this.log('SUCCESS', message, data); }
    logWarning(message, data) { this.log('WARNING', message, data); }
    
    // Method to disable for production
    disable() {
        this.isEnabled = false;
        const panel = document.getElementById('debug-monitor');
        const toggleBtn = document.getElementById('debug-monitor-toggle');
        if (panel) panel.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'none';
    }
    
    // Export logs for analysis
    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `workflow-debug-${new Date().toISOString().slice(0, 19)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    // Enable debug mode programmatically
    enableDebugMode() {
        if (!this.isEnabled) {
            this.isEnabled = true;
            localStorage.setItem('workflow_debug_enabled', 'true');
            this.createDebugUI();
            this.startPerformanceMonitoring();
            this.logSuccess('Debug mode enabled programmatically');
        }
    }
    
    // Disable debug mode programmatically  
    disableDebugMode() {
        if (this.isEnabled) {
            this.isEnabled = false;
            localStorage.setItem('workflow_debug_enabled', 'false');
            this.disable();
            // Don't log after disabling - would be inconsistent
        }
    }
    
    // Get current debug statistics
    getDebugStats() {
        const stats = this.logs.reduce((acc, log) => {
            acc[log.category] = (acc[log.category] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalLogs: this.logs.length,
            isEnabled: this.isEnabled,
            isProduction: this.isProduction,
            categoryStats: stats,
            memoryUsage: this.getMemoryUsage(),
            uptime: Date.now() - this.startTime
        };
    }
    
    // Search logs by category or message
    searchLogs(query, category = null) {
        return this.logs.filter(log => {
            const matchesCategory = !category || log.category === category;
            const matchesQuery = !query || 
                log.message.toLowerCase().includes(query.toLowerCase()) ||
                (log.data && JSON.stringify(log.data).toLowerCase().includes(query.toLowerCase()));
            return matchesCategory && matchesQuery;
        });
    }
}

// Global debug monitor instance
window.debugMonitor = new DebugMonitor(); 