/**
 * 🤖 Universal Method Inspector
 * 汎用的なJavaScriptクラスメソッド検出・分析ツール
 */

class UniversalMethodInspector {
    constructor() {
        this.discoveredMethods = new Map();
        this.testCategories = new Map();
        this.lastScanTime = 0;
        this.scanInterval = 5000;
        this.targetObjects = new Set();
        this.jsFiles = new Set();
        this.excludePrivate = true;
        this.autoScanEnabled = true;
        this.scanTimer = null;
        this.filters = {
            category: '',
            status: '',
            search: ''
        };
        
        this.categoryMappings = {
            'Manager': 'management',
            'Handler': 'event-handling',
            'Executor': 'execution',
            'Renderer': 'rendering',
            'Controller': 'control',
            'Service': 'service',
            'Utility': 'utility',
            'Helper': 'helper',
            'Engine': 'engine',
            'Processor': 'processing'
        };
        
        console.log('UniversalMethodInspector instance created');
    }

    applyConfiguration(config) {
        this.scanInterval = (config.scanInterval || 5) * 1000;
        this.excludePrivate = config.excludePrivate !== 'false';
        this.autoScanEnabled = config.autoScan !== 'false';
        
        this.autoDetectJSFiles();
        this.autoDetectGlobalObjects();
        
        this.showToast('Configuration applied successfully', 'success');
        this.updateStatus();
        
        if (this.autoScanEnabled) {
            this.startAutoScan();
        } else {
            this.stopAutoScan();
        }
    }

    autoDetectJSFiles() {
        const scriptTags = document.querySelectorAll('script[src]');
        this.jsFiles.clear();
        
        scriptTags.forEach(script => {
            const src = script.src;
            if (src && src.endsWith('.js') && !src.includes('node_modules')) {
                const fileName = src.split('/').pop();
                this.jsFiles.add(fileName);
            }
        });
        
        console.log(`🔍 検出されたJSファイル:`, Array.from(this.jsFiles));
    }

    autoDetectGlobalObjects() {
        this.targetObjects.clear();
        
        const commonPatterns = [
            'workflowEditor', 'editor', 'manager', 'controller', 'handler', 
            'service', 'processor', 'engine', 'app', 'main', 'system',
            'uiManager', 'connectionManager', 'nodeManager', 'eventHandler',
            'workflowExecutor', 'debugMonitor', 'inspector'
        ];
        
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name) {
                    const className = obj.constructor.name;
                    
                    if (!this.isBuiltInObject(className) && this.hasCustomMethods(obj)) {
                        this.targetObjects.add(key);
                    }
                }
                
                if (commonPatterns.some(pattern => 
                    key.toLowerCase().includes(pattern.toLowerCase()) ||
                    pattern.toLowerCase().includes(key.toLowerCase())
                )) {
                    if (obj && typeof obj === 'object') {
                        this.targetObjects.add(key);
                    }
                }
            } catch (e) {
                // アクセスできないプロパティをスキップ
            }
        }
        
        console.log(`🔍 検出されたグローバルオブジェクト:`, Array.from(this.targetObjects));
    }

    isBuiltInObject(className) {
        const builtInTypes = [
            'Object', 'Array', 'String', 'Number', 'Boolean', 'Function',
            'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
            'HTMLElement', 'HTMLDocument', 'Window', 'XMLHttpRequest',
            'Event', 'MouseEvent', 'KeyboardEvent', 'Node', 'Element'
        ];
        return builtInTypes.includes(className);
    }

    hasCustomMethods(obj) {
        try {
            const proto = Object.getPrototypeOf(obj);
            if (!proto) return false;
            
            const methods = Object.getOwnPropertyNames(proto)
                .filter(name => typeof obj[name] === 'function' && name !== 'constructor');
            
            return methods.length > 0;
        } catch (e) {
            return false;
        }
    }

    discoverMethods(obj, className, category = 'general') {
        if (!obj || typeof obj !== 'object') return [];
        
        const methods = [];
        const proto = Object.getPrototypeOf(obj);
        
        const instanceMethods = Object.getOwnPropertyNames(proto)
            .filter(name => {
                try {
                    return typeof obj[name] === 'function' && 
                           name !== 'constructor' &&
                           (!this.excludePrivate || !name.startsWith('_'));
                } catch (e) {
                    return false;
                }
            });

        const directMethods = Object.getOwnPropertyNames(obj)
            .filter(name => {
                try {
                    return typeof obj[name] === 'function' &&
                           (!this.excludePrivate || !name.startsWith('_'));
                } catch (e) {
                    return false;
                }
            });

        const allMethods = [...new Set([...instanceMethods, ...directMethods])];
        
        allMethods.forEach(methodName => {
            const methodInfo = {
                name: methodName,
                className: className,
                category: this.determineCategory(className, methodName, category),
                fullPath: `${className}.${methodName}`,
                discovered: Date.now(),
                accessibility: this.determineAccessibility(methodName)
            };
            methods.push(methodInfo);
        });

        return methods;
    }

    determineCategory(className, methodName, defaultCategory) {
        for (const [pattern, category] of Object.entries(this.categoryMappings)) {
            if (className.includes(pattern)) {
                return category;
            }
        }
        
        if (methodName.startsWith('render') || methodName.startsWith('draw')) return 'rendering';
        if (methodName.startsWith('handle') || methodName.startsWith('on')) return 'event-handling';
        if (methodName.startsWith('execute') || methodName.startsWith('run')) return 'execution';
        if (methodName.startsWith('get') || methodName.startsWith('set')) return 'data-access';
        if (methodName.startsWith('init') || methodName.startsWith('setup')) return 'initialization';
        if (methodName.startsWith('save') || methodName.startsWith('load')) return 'persistence';
        if (methodName.startsWith('create') || methodName.startsWith('generate')) return 'creation';
        if (methodName.startsWith('update') || methodName.startsWith('modify')) return 'modification';
        if (methodName.startsWith('delete') || methodName.startsWith('remove')) return 'deletion';
        
        return defaultCategory;
    }

    determineAccessibility(methodName) {
        if (methodName.startsWith('__')) return 'internal';
        if (methodName.startsWith('_')) return 'private';
        return 'public';
    }

    scanForMethods() {
        const currentTime = Date.now();
        if (currentTime - this.lastScanTime < 1000) {
            return;
        }

        this.lastScanTime = currentTime;
        const newMethods = [];

        try {
            if (this.targetObjects.size === 0) {
                this.autoDetectGlobalObjects();
            }

            let foundObjects = 0;
            
            this.targetObjects.forEach(objectName => {
                const targetObj = window[objectName];
                if (targetObj) {
                    foundObjects++;
                    console.log(`🔍 スキャン中: ${objectName}`);
                    
                    const mainMethods = this.discoverMethods(targetObj, objectName, 'core');
                    newMethods.push(...mainMethods);
                }
            });

            if (foundObjects === 0) {
                this.showToast('No target objects found. Scanning window object...', 'warning');
                this.scanWindowObject(newMethods);
            }

            const previousMethodCount = this.discoveredMethods.size;
            newMethods.forEach(method => {
                if (!this.discoveredMethods.has(method.fullPath)) {
                    this.discoveredMethods.set(method.fullPath, method);
                }
            });

            if (this.discoveredMethods.size > previousMethodCount) {
                this.updateTestCategories();
                this.generateDisplay();
                this.showToast(`${this.discoveredMethods.size - previousMethodCount} new methods detected`, 'success');
            }

            this.updateStatistics();

        } catch (error) {
            console.warn('スキャンエラー:', error);
            this.showToast('Scan error: ' + error.message, 'error');
        }
    }

    scanWindowObject(methodsArray) {
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && typeof obj === 'object' && obj.constructor && 
                    !this.isBuiltInObject(obj.constructor.name) && 
                    this.hasCustomMethods(obj)) {
                    
                    const methods = this.discoverMethods(obj, key, 'discovered');
                    methodsArray.push(...methods);
                }
            } catch (e) {
                // スキップ
            }
        }
    }

    updateTestCategories() {
        this.testCategories.clear();
        
        this.discoveredMethods.forEach(method => {
            if (!this.testCategories.has(method.category)) {
                this.testCategories.set(method.category, []);
            }
            this.testCategories.get(method.category).push(method);
        });

        this.updateCategoryFilter();
    }

    updateCategoryFilter() {
        const filterSelect = document.getElementById('filterCategory');
        if (!filterSelect) return;
        
        filterSelect.innerHTML = '<option value="">All Categories</option>';
        
        Array.from(this.testCategories.keys()).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.getCategoryDisplayName(category);
            filterSelect.appendChild(option);
        });
    }

    generateDisplay() {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        if (this.discoveredMethods.size === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        let html = '';
        const filteredCategories = this.getFilteredCategories();
        
        filteredCategories.forEach((methods, category) => {
            const filteredMethods = this.applyMethodFilters(methods);
            if (filteredMethods.length === 0) return;

            html += `
                <div class="category-section">
                    <div class="category-header">
                        <div class="category-title">
                            ${this.getCategoryIcon(category)} ${this.getCategoryDisplayName(category)}
                        </div>
                        <div class="category-count">${filteredMethods.length}</div>
                    </div>
                    <div class="method-grid">
            `;
            
            filteredMethods.forEach(method => {
                const testStatus = this.testMethod(method);
                html += `
                    <div class="method-item ${testStatus.status}" onclick="inspector.showMethodDetails('${method.fullPath}')">
                        <div class="method-header">
                            <div class="method-name">${method.name}</div>
                            <div class="method-status">${testStatus.icon}</div>
                        </div>
                        <div class="method-details">
                            <div class="method-class">${method.className}</div>
                            <div class="method-category">${method.accessibility}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || this.getNoResultsHTML();
    }

    getFilteredCategories() {
        if (!this.filters.category) {
            return this.testCategories;
        }
        
        const filtered = new Map();
        if (this.testCategories.has(this.filters.category)) {
            filtered.set(this.filters.category, this.testCategories.get(this.filters.category));
        }
        return filtered;
    }

    applyMethodFilters(methods) {
        return methods.filter(method => {
            if (this.filters.status) {
                const testStatus = this.testMethod(method);
                if (testStatus.status !== this.filters.status) return false;
            }
            
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                return method.name.toLowerCase().includes(searchTerm) ||
                       method.className.toLowerCase().includes(searchTerm);
            }
            
            return true;
        });
    }

    testMethod(method) {
        try {
            const parts = method.fullPath.split('.');
            const objectName = parts[0];
            let obj = window[objectName];
            
            if (!obj) {
                return { status: 'error', icon: '✗', message: 'Parent object not found' };
            }
            
            // 残りのパスをたどる
            for (let i = 1; i < parts.length - 1; i++) {
                if (obj[parts[i]]) {
                    obj = obj[parts[i]];
                } else {
                    return { status: 'error', icon: '✗', message: 'Object path not found' };
                }
            }
            
            const methodName = parts[parts.length - 1];
            const methodExists = obj && typeof obj[methodName] === 'function';
            
            return {
                status: methodExists ? 'success' : 'error',
                icon: methodExists ? '✓' : '✗',
                message: methodExists ? 'Available' : 'Missing'
            };
        } catch (error) {
            return {
                status: 'warning',
                icon: '⚠',
                message: 'Error checking: ' + error.message
            };
        }
    }

    getCategoryDisplayName(category) {
        const displayNames = {
            'core': 'Core System',
            'management': 'Management',
            'event-handling': 'Event Handling',
            'execution': 'Execution',
            'rendering': 'Rendering',
            'data-access': 'Data Access',
            'initialization': 'Initialization',
            'persistence': 'Data Persistence',
            'creation': 'Object Creation',
            'modification': 'Modification',
            'deletion': 'Deletion',
            'component': 'Components',
            'general': 'General Methods',
            'discovered': 'Discovered Objects'
        };
        return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    getCategoryIcon(category) {
        const icons = {
            'core': '🏗️',
            'management': '📋',
            'event-handling': '⚡',
            'execution': '🚀',
            'rendering': '🎨',
            'data-access': '📊',
            'initialization': '🔧',
            'persistence': '💾',
            'creation': '🏭',
            'modification': '✏️',
            'deletion': '🗑️',
            'component': '🧩',
            'general': '📦',
            'discovered': '🔍'
        };
        return icons[category] || '📁';
    }

    updateStatistics() {
        const total = this.discoveredMethods.size;
        let available = 0;
        let private = 0;

        this.discoveredMethods.forEach(method => {
            const testStatus = this.testMethod(method);
            if (testStatus.status === 'success') available++;
            if (method.accessibility === 'private') private++;
        });

        const elements = {
            totalMethods: document.getElementById('totalMethods'),
            availableMethods: document.getElementById('availableMethods'),
            privateMethods: document.getElementById('privateMethods'),
            categoriesCount: document.getElementById('categoriesCount'),
            lastScanTime: document.getElementById('lastScanTime')
        };

        if (elements.totalMethods) elements.totalMethods.textContent = total;
        if (elements.availableMethods) elements.availableMethods.textContent = available;
        if (elements.privateMethods) elements.privateMethods.textContent = private;
        if (elements.categoriesCount) elements.categoriesCount.textContent = this.testCategories.size;
        if (elements.lastScanTime) elements.lastScanTime.textContent = new Date().toLocaleTimeString();
        
        // 検出された情報も更新
        if (typeof updateDetectedInfo === 'function') {
            updateDetectedInfo();
        }
    }

    updateStatus() {
        const statusElement = document.getElementById('scanStatus');
        if (!statusElement) return;
        
        if (this.autoScanEnabled && this.scanTimer) {
            statusElement.textContent = '🔄';
        } else {
            statusElement.textContent = '⏸️';
        }
    }

    startAutoScan() {
        this.stopAutoScan();
        
        if (this.autoScanEnabled) {
            this.scanTimer = setInterval(() => {
                this.scanForMethods();
            }, this.scanInterval);
            
            setTimeout(() => {
                this.scanForMethods();
            }, 1000);
        }
        
        this.updateStatus();
    }

    stopAutoScan() {
        if (this.scanTimer) {
            clearInterval(this.scanTimer);
            this.scanTimer = null;
        }
        this.updateStatus();
    }

    applyFilters() {
        const elements = {
            filterCategory: document.getElementById('filterCategory'),
            filterStatus: document.getElementById('filterStatus'),
            searchMethod: document.getElementById('searchMethod')
        };
        
        this.filters.category = elements.filterCategory?.value || '';
        this.filters.status = elements.filterStatus?.value || '';
        this.filters.search = elements.searchMethod?.value || '';
        
        this.generateDisplay();
        this.showToast('Filters applied', 'info');
    }

    clearData() {
        this.discoveredMethods.clear();
        this.testCategories.clear();
        this.generateDisplay();
        this.updateStatistics();
        this.showToast('Data cleared', 'warning');
    }

    showMethodDetails(fullPath) {
        const method = this.discoveredMethods.get(fullPath);
        if (!method) return;

        const testStatus = this.testMethod(method);
        const details = `
Method: ${method.name}
Class: ${method.className}
Category: ${this.getCategoryDisplayName(method.category)}
Accessibility: ${method.accessibility}
Status: ${testStatus.message}
Full Path: ${method.fullPath}
Discovered: ${new Date(method.discovered).toLocaleString()}
        `.trim();

        alert(details);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>No Methods Detected</h3>
                <p>Configure your target object and start scanning to detect methods.</p>
                <button class="btn btn-primary" onclick="manualScan()" style="margin-top: 15px;">
                    🔍 Start Manual Scan
                </button>
            </div>
        `;
    }

    getNoResultsHTML() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🚫</div>
                <h3>No Results Found</h3>
                <p>Try adjusting your filters or search criteria.</p>
                <button class="btn btn-primary" onclick="clearFilters()" style="margin-top: 15px;">
                    🔄 Clear Filters
                </button>
            </div>
        `;
    }

    exportJSON() {
        const data = {
            timestamp: new Date().toISOString(),
            totalMethods: this.discoveredMethods.size,
            categories: Array.from(this.testCategories.keys()),
            methods: Array.from(this.discoveredMethods.values()).map(method => ({
                ...method,
                testResult: this.testMethod(method)
            }))
        };

        this.downloadFile(
            JSON.stringify(data, null, 2),
            `method-inspection-${Date.now()}.json`,
            'application/json'
        );
    }

    exportCSV() {
        let csv = 'Name,Class,Category,Accessibility,Status,Full Path\n';
        
        this.discoveredMethods.forEach(method => {
            const testStatus = this.testMethod(method);
            csv += `"${method.name}","${method.className}","${method.category}","${method.accessibility}","${testStatus.message}","${method.fullPath}"\n`;
        });

        this.downloadFile(csv, `method-inspection-${Date.now()}.csv`, 'text/csv');
    }

    exportMarkdown() {
        let markdown = '# Method Inspection Report\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n`;
        markdown += `Total Methods: ${this.discoveredMethods.size}\n\n`;

        this.testCategories.forEach((methods, category) => {
            markdown += `## ${this.getCategoryDisplayName(category)}\n\n`;
            markdown += '| Method | Class | Accessibility | Status |\n';
            markdown += '|--------|-------|---------------|--------|\n';
            
            methods.forEach(method => {
                const testStatus = this.testMethod(method);
                markdown += `| ${method.name} | ${method.className} | ${method.accessibility} | ${testStatus.message} |\n`;
            });
            
            markdown += '\n';
        });

        this.downloadFile(markdown, `method-inspection-${Date.now()}.md`, 'text/markdown');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`File exported: ${filename}`, 'success');
    }
}

// グローバルインスタンス
window.inspector = new UniversalMethodInspector();
console.log('UniversalMethodInspector instance created globally and attached to window');

// UI関数
function applyConfiguration() {
    const config = {
        scanInterval: document.getElementById('scanInterval')?.value || '5',
        excludePrivate: document.getElementById('excludePrivate')?.value || 'true',
        autoScan: document.getElementById('autoScan')?.value || 'true'
    };
    if (window.inspector) {
        window.inspector.applyConfiguration(config);
        if (typeof updateDetectedInfo === 'function') {
            updateDetectedInfo();
        }
    }
}

function manualScan() {
    if (window.inspector) {
        window.inspector.scanForMethods();
        window.inspector.showToast('Manual scan completed', 'info');
    }
}

function clearData() {
    if (confirm('Are you sure you want to clear all detected data?')) {
        if (window.inspector) {
            window.inspector.clearData();
        }
    }
}

function exportData() {
    if (window.inspector) {
        window.inspector.exportJSON();
    }
}

function applyFilters() {
    if (window.inspector) {
        window.inspector.applyFilters();
    }
}

function clearFilters() {
    const elements = {
        filterCategory: document.getElementById('filterCategory'),
        filterStatus: document.getElementById('filterStatus'),
        searchMethod: document.getElementById('searchMethod')
    };
    
    if (elements.filterCategory) elements.filterCategory.value = '';
    if (elements.filterStatus) elements.filterStatus.value = '';
    if (elements.searchMethod) elements.searchMethod.value = '';
    
    if (window.inspector) {
        window.inspector.applyFilters();
    }
}

function refreshDisplay() {
    if (window.inspector) {
        window.inspector.generateDisplay();
        window.inspector.showToast('Display refreshed', 'info');
    }
}

function exportJSON() {
    if (window.inspector) {
        window.inspector.exportJSON();
    }
}

function exportCSV() {
    if (window.inspector) {
        window.inspector.exportCSV();
    }
}

function exportMarkdown() {
    if (window.inspector) {
        window.inspector.exportMarkdown();
    }
}

function generateReport() {
    if (window.inspector) {
        window.inspector.exportJSON();
    }
}

// インスタンス初期化の完了を通知
console.log('🤖 Universal Method Inspector loaded and ready');

// HTMLファイルからの初期化を待つため、DOMContentLoadedは削除
// HTMLファイル側で適切に初期化される