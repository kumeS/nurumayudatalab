/**
 * Configuration Management for Workflow Tracker
 */

class Config {
    constructor() {
        this.storageKey = 'workflowTrackerConfig';
        this.defaults = {
            ioApiKey: '',
            replicateApiKey: '',
            llmModel: 'gpt-o1s-120B',  // OpenAI GPT O1S 120B
            imageModel: 'fal-ai/nano-banana', // Image Editing Model: Nano Banana
            autoSave: true,
            maxWorkflows: 50,
            defaultImageCount: 3,
            defaultTransformStyle: 'artistic',
            apiEndpoint: {
                llm: '/api/intelligence/chat',
                image: '/api/image/generation',
                understand: '/api/image/understand',
                replicate: 'https://api.replicate.com/v1/predictions'
            }
        };
        this.config = this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.defaults, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
        return { ...this.defaults };
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
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
}

// Global config instance
const config = new Config();