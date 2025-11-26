/**
 * LocalStorage management utility
 * Handles persistent storage for form data, settings, and history
 */

class StorageManager {
    constructor() {
        this.keys = {
            FORM_DATA: 'aiPromptTool_formData',
            SETTINGS: 'aiPromptTool_settings',
            HISTORY: 'aiPromptTool_history',
            API_KEYS: 'aiPromptTool_apiKeys'
        };
    }

    /**
     * Save form data to localStorage
     * @param {Object} data - Form data object
     */
    saveFormData(data) {
        try {
            localStorage.setItem(this.keys.FORM_DATA, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save form data:', error);
        }
    }

    /**
     * Load form data from localStorage
     * @returns {Object} Form data object or default values
     */
    loadFormData() {
        try {
            const data = localStorage.getItem(this.keys.FORM_DATA);
            return data ? JSON.parse(data) : this.getDefaultFormData();
        } catch (error) {
            console.error('Failed to load form data:', error);
            return this.getDefaultFormData();
        }
    }

    /**
     * Clear form data from localStorage
     */
    clearFormData() {
        try {
            localStorage.removeItem(this.keys.FORM_DATA);
        } catch (error) {
            console.error('Failed to clear form data:', error);
        }
    }

    /**
     * Get default form data structure
     * @returns {Object} Default form data
     */
    getDefaultFormData() {
        return {
            promptText: '',
            enableImprovement: true,
            selectedPatterns: {
                // Basic patterns - some selected by default
                horizontal: true,
                chainOfThought: true,
                opposite: false,
                fermi: false,
                fiveWhy: false,
                assumptionCheck: false,
                
                // Expert patterns - some selected by default
                sales: false,
                accounting: false,
                recruitment: false,
                strategic: true,
                snsMarketing: false
            }
        };
    }

    /**
     * Save settings to localStorage
     * @param {Object} settings - Settings object
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.keys.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Load settings from localStorage
     * @returns {Object} Settings object or defaults
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem(this.keys.SETTINGS);
            return settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     * @returns {Object} Default settings
     */
    getDefaultSettings() {
        return {
            autoImprove: true,
            defaultPatterns: ['horizontal', 'chainOfThought', 'strategic'],
            preferredProvider: 'io_intelligence'
        };
    }

    /**
     * Save API keys with basic encryption (base64)
     * Note: This is basic obfuscation, not real security
     * @param {Object} apiKeys - API keys object
     */
    saveApiKeys(apiKeys) {
        try {
            const encrypted = {};
            Object.keys(apiKeys).forEach(key => {
                if (apiKeys[key]) {
                    encrypted[key] = btoa(apiKeys[key]);
                }
            });
            localStorage.setItem(this.keys.API_KEYS, JSON.stringify(encrypted));
        } catch (error) {
            console.error('Failed to save API keys:', error);
        }
    }

    /**
     * Load API keys with decryption and Environment secrets fallback
     * @returns {Object} Decrypted API keys
     */
    loadApiKeys() {
        try {
            // First, try to load from localStorage
            const localKeys = this.loadLocalApiKeys();
            
            // Then, get keys from Environment secrets (fallback)
            const envKeys = this.loadEnvironmentApiKeys();
            
            // Merge with local keys taking priority
            return { ...envKeys, ...localKeys };
        } catch (error) {
            console.error('Failed to load API keys:', error);
            return {};
        }
    }

    /**
     * Load API keys from localStorage only
     * @returns {Object} Decrypted local API keys
     */
    loadLocalApiKeys() {
        try {
            const encrypted = localStorage.getItem(this.keys.API_KEYS);
            if (!encrypted) return {};
            
            const parsed = JSON.parse(encrypted);
            const decrypted = {};
            Object.keys(parsed).forEach(key => {
                try {
                    decrypted[key] = atob(parsed[key]);
                } catch (e) {
                    console.warn(`Failed to decrypt API key for ${key}`);
                }
            });
            return decrypted;
        } catch (error) {
            console.error('Failed to load local API keys:', error);
            return {};
        }
    }

    /**
     * Load API keys from Environment secrets
     * @returns {Object} Environment API keys
     */
    loadEnvironmentApiKeys() {
        const envKeys = {};
        
        try {
            // Method 1: Try to get from build-time environment variables
            if (typeof process !== 'undefined' && process.env && process.env.IO_API_KEY) {
                envKeys.io_intelligence = process.env.IO_API_KEY;
                console.log('✓ API key loaded from build environment');
            }
            
            // Method 2: Try to get from window object (if injected by server)
            else if (typeof window !== 'undefined' && window.ENV && window.ENV.IO_API_KEY) {
                envKeys.io_intelligence = window.ENV.IO_API_KEY;
                console.log('✓ API key loaded from window environment');
            }
            
            // Method 3: Try to get from ENV_CONFIG default settings (frontend-only fallback)
            else if (typeof window !== 'undefined' && window.ENV_CONFIG && window.ENV_CONFIG.DEFAULT_SETTINGS && window.ENV_CONFIG.DEFAULT_SETTINGS.DEFAULT_API_KEY) {
                envKeys.io_intelligence = window.ENV_CONFIG.DEFAULT_SETTINGS.DEFAULT_API_KEY;
                console.log('✓ API key loaded from ENV_CONFIG default settings (frontend fallback)');
            }
            
            // Method 4: Try to fetch from server API (placeholder for future implementation)
            else {
                // This will be implemented later with server-side API
                this.loadApiKeysFromServer().then(serverKeys => {
                    if (serverKeys.io_intelligence) {
                        console.log('✓ API key loaded from server');
                        // Store temporarily in memory (not localStorage for security)
                        this.tempApiKeys = serverKeys;
                    }
                }).catch(error => {
                    console.log('ℹ No server API keys available:', error.message);
                });
            }
        } catch (error) {
            console.log('ℹ No environment API keys available:', error.message);
        }
        
        return envKeys;
    }

    /**
     * Load API keys from server API (future implementation)
     * @returns {Promise<Object>} Server API keys
     */
    async loadApiKeysFromServer() {
        // Placeholder for future server-side implementation
        // This would call an endpoint like: /api/config/keys
        
        try {
            // Example implementation (to be completed later):
            // const response = await fetch('/api/config/keys', {
            //     method: 'GET',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     }
            // });
            // 
            // if (!response.ok) {
            //     throw new Error(`HTTP ${response.status}`);
            // }
            // 
            // const data = await response.json();
            // return data.apiKeys || {};
            
            // For now, return empty object
            return {};
        } catch (error) {
            console.log('Server API keys not available:', error.message);
            return {};
        }
    }

    /**
     * Check if API key is available from any source
     * @param {string} provider - Provider name (e.g., 'io_intelligence')
     * @returns {boolean} Whether API key is available
     */
    hasApiKey(provider) {
        const allKeys = this.loadApiKeys();
        return !!(allKeys[provider] || (this.tempApiKeys && this.tempApiKeys[provider]));
    }

    /**
     * Get API key with all fallback sources
     * @param {string} provider - Provider name
     * @returns {string|null} API key if available
     */
    getApiKey(provider) {
        const allKeys = this.loadApiKeys();
        return allKeys[provider] || 
               (this.tempApiKeys && this.tempApiKeys[provider]) || 
               null;
    }

    /**
     * Save execution result to history
     * @param {Object} result - Execution result object
     */
    saveToHistory(result) {
        try {
            const history = this.loadHistory();
            const newEntry = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                ...result
            };
            
            history.unshift(newEntry);
            
            // Keep only last 50 entries
            if (history.length > 50) {
                history.splice(50);
            }
            
            localStorage.setItem(this.keys.HISTORY, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }

    /**
     * Load execution history
     * @returns {Array} Array of execution results
     */
    loadHistory() {
        try {
            const history = localStorage.getItem(this.keys.HISTORY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    /**
     * Clear execution history
     */
    clearHistory() {
        try {
            localStorage.removeItem(this.keys.HISTORY);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    }

    /**
     * Generate unique ID for entries
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get storage usage info
     * @returns {Object} Storage usage information
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            const sizes = {};
            
            Object.values(this.keys).forEach(key => {
                const item = localStorage.getItem(key);
                const size = item ? item.length : 0;
                sizes[key] = size;
                totalSize += size;
            });
            
            return {
                total: totalSize,
                details: sizes,
                available: this.getAvailableStorage()
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { total: 0, details: {}, available: 0 };
        }
    }

    /**
     * Get available localStorage space (approximate)
     * @returns {number} Available space in bytes
     */
    getAvailableStorage() {
        try {
            const testKey = 'test_storage_size';
            let size = 0;
            let testData = 'a';
            
            // Try to find the limit
            while (size < 10 * 1024 * 1024) { // 10MB max test
                try {
                    localStorage.setItem(testKey, testData);
                    size += testData.length;
                    testData += testData; // Double the size
                } catch (e) {
                    break;
                }
            }
            
            localStorage.removeItem(testKey);
            return size;
        } catch (error) {
            return 0;
        }
    }
}

// Create singleton instance
const storageManager = new StorageManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else {
    window.StorageManager = StorageManager;
    window.storageManager = storageManager;
}