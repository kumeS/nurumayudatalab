/**
 * Configuration Management for Workflow Tracker
 */

class Config {
    constructor() {
        this.storageKey = 'workflowTrackerConfig';
        this.configVersion = 2; // Increment this when apiEndpoint structure changes
        this.defaults = {
            configVersion: 2,
            ioApiKey: '',
            replicateApiKey: '',
            llmModel: 'gpt-o1s-120B',  // OpenAI GPT O1S 120B
            imageModel: 'google/nano-banana', // Image Editing Model: Nano Banana (Replicate)
            aspectRatio: '1:1', // Default aspect ratio
            outputFormat: 'png', // Default output format (png or jpg)
            autoSave: true,
            maxWorkflows: 50,
            defaultImageCount: 3,
            defaultTransformStyle: 'artistic',
            apiEndpoint: {
                // IO Intelligence API
                ioIntelligence: {
                    base: 'https://api.intelligence.io.solutions/api/v1',
                    models: 'https://api.intelligence.io.solutions/api/v1/models',
                    chat: 'https://api.intelligence.io.solutions/api/v1/chat/completions'
                },
                // Replicate API (via Cloudflare Workers proxy to avoid CORS)
                replicate: {
                    base: 'https://replicate-nanobanana.skume-bioinfo.workers.dev',
                    nanoBanana: 'https://replicate-nanobanana.skume-bioinfo.workers.dev/proxy'
                },
                // Legacy endpoints (for compatibility)
                llm: '/api/intelligence/chat',
                image: '/api/image/generation',
                understand: '/api/image/understand'
            }
        };
        this.config = this.load();
    }

    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);

                // Check config version - if outdated, reset to defaults
                if (!parsed.configVersion || parsed.configVersion < this.configVersion) {
                    console.warn(`Config version mismatch (stored: ${parsed.configVersion}, current: ${this.configVersion}). Resetting apiEndpoint to defaults.`);
                    // Keep user settings but reset apiEndpoint
                    const resetConfig = { ...this.defaults };
                    resetConfig.ioApiKey = parsed.ioApiKey || '';
                    resetConfig.replicateApiKey = parsed.replicateApiKey || '';
                    resetConfig.llmModel = parsed.llmModel || this.defaults.llmModel;
                    resetConfig.imageModel = parsed.imageModel || this.defaults.imageModel;
                    resetConfig.aspectRatio = parsed.aspectRatio || this.defaults.aspectRatio;
                    resetConfig.outputFormat = parsed.outputFormat || this.defaults.outputFormat;
                    resetConfig.autoSave = parsed.autoSave !== undefined ? parsed.autoSave : this.defaults.autoSave;
                    // Force save the updated config
                    localStorage.setItem(this.storageKey, JSON.stringify(resetConfig));
                    return resetConfig;
                }

                // Use deep merge to ensure apiEndpoint defaults are not overwritten
                // But for apiEndpoint, always use defaults to ensure latest proxy settings
                const merged = this.deepMerge(this.defaults, parsed);
                // Force apiEndpoint to use defaults (important for proxy updates)
                merged.apiEndpoint = this.defaults.apiEndpoint;
                return merged;
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
            if (window.debug) {
                window.debug.error('Config load failed', error);
            }
        }
        return { ...this.defaults };
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            if (window.debug) {
                window.debug.debug('Config saved successfully');
            }
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            if (window.debug) {
                window.debug.error('Config save failed', error);
            }
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                alert('ストレージ容量が不足しています。不要なデータを削除してください。');
            }
            return false;
        }
    }

    get(key) {
        return this.config[key] !== undefined ? this.config[key] : this.defaults[key];
    }

    set(key, value) {
        this.config[key] = value;
        return this.save();
    }

    setMultiple(updates) {
        Object.assign(this.config, updates);
        return this.save();
    }

    reset() {
        this.config = { ...this.defaults };
        return this.save();
    }

    getApiHeaders(service = 'io') {
        if (service === 'replicate') {
            const replicateKey = this.get('replicateApiKey');
            if (!replicateKey) {
                throw new Error('Replicate API key is not configured');
            }
            return {
                'Content-Type': 'application/json',
                'Authorization': `Token ${replicateKey}`
            };
        } else {
            const ioKey = this.get('ioApiKey');
            if (!ioKey) {
                throw new Error('IO API key is not configured');
            }
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ioKey}`
            };
        }
    }

    isConfigured(service = 'io') {
        if (service === 'replicate') {
            return !!this.get('replicateApiKey');
        }
        return !!this.get('ioApiKey');
    }

    getModelService(model) {
        // Determine which service to use based on model
        if (model.startsWith('replicate/')) {
            return 'replicate';
        }
        return 'io';
    }
    
    /**
     * Check if IO Intelligence API is configured
     */
    hasIOApi() {
        const ioKey = this.get('ioApiKey');
        return ioKey && ioKey.trim().length > 0;
    }
    
    /**
     * Check if Replicate API is configured
     */
    hasReplicateApi() {
        const replicateKey = this.get('replicateApiKey');
        return replicateKey && replicateKey.trim().length > 0;
    }
    
    /**
     * Validate configuration
     */
    validate() {
        const errors = [];
        
        // Check if at least one API key is configured
        if (!this.hasIOApi() && !this.hasReplicateApi()) {
            errors.push('少なくとも1つのAPIキーを設定してください');
        }
        
        // Validate model selections
        if (!this.get('llmModel')) {
            errors.push('LLMモデルが選択されていません');
        }
        
        if (!this.get('imageModel')) {
            errors.push('画像生成モデルが選択されていません');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Get validation status
     */
    getValidationStatus() {
        return this.validate();
    }
}

// Global config instance
const config = new Config();