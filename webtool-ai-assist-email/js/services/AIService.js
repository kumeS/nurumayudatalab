/**
 * AI Service
 * Handles communication with IO Intelligence API for AI-powered features
 */
class AIService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.io-intelligence.com/v1'; // Placeholder URL
        this.model = 'gpt-oss-120B';
        this.maxTokens = 8000;
        this.isInitialized = false;
        this.rateLimitCount = 0;
        this.rateLimitWindow = 60000; // 1 minute
        this.maxRequestsPerWindow = 100;
    }

    /**
     * Initialize the AI service
     * @param {Object} config - Configuration object
     */
    async initialize(config = {}) {
        this.apiKey = config.apiKey || process.env.IO_INTELLIGENCE_API_KEY;
        this.baseUrl = config.baseUrl || this.baseUrl;
        this.model = config.model || this.model;
        this.maxTokens = config.maxTokens || this.maxTokens;

        if (!this.apiKey) {
            throw new Error('API key is required for AI features. Please configure your IO Intelligence API key in settings.');
        }

        try {
            // Test the API connection
            await this.testConnection();
            this.isInitialized = true;
            console.log('AI Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI Service:', error);
            // Fall back to mock responses
            this.isInitialized = true;
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        if (!this.apiKey) {
            throw new Error('API key is required for testing connection');
        }

        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Client': 'AIWebEditor'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
            }
            
            return { status: 'connected', message: 'API connection successful' };
        } catch (error) {
            throw new Error(`Failed to connect to AI service: ${error.message}`);
        }
    }

    /**
     * Make API request with error handling and rate limiting
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<Object>} API response
     */
    async makeRequest(endpoint, data) {
        // Check rate limiting
        if (!this.checkRateLimit()) {
            throw new Error('API rate limit exceeded. Please wait and try again.');
        }

        if (!this.apiKey) {
            throw new Error('API key is required for AI features. Please configure your IO Intelligence API key in settings.');
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Client': 'AIWebEditor'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Check rate limiting
     * @returns {boolean} True if request is allowed
     */
    checkRateLimit() {
        const now = Date.now();
        
        // Reset count if window has passed
        if (!this.rateLimitWindowStart || now - this.rateLimitWindowStart > this.rateLimitWindow) {
            this.rateLimitCount = 0;
            this.rateLimitWindowStart = now;
        }

        // Check if under limit
        if (this.rateLimitCount >= this.maxRequestsPerWindow) {
            return false;
        }

        this.rateLimitCount++;
        return true;
    }

    /**
     * Process AI prompt
     * @param {string} prompt - User prompt
     * @param {Object} context - Context data
     * @returns {Promise<Object>} AI response
     */
    async processPrompt(prompt, context = {}) {
        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(context.tone || 'formal')
                },
                {
                    role: 'user',
                    content: this.buildPromptWithContext(prompt, context)
                }
            ],
            max_tokens: this.maxTokens,
            temperature: 0.7,
            top_p: 0.9
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.processAIResponse(response, 'prompt');
    }

    /**
     * Check grammar
     * @param {string} text - Text to check
     * @returns {Promise<Array>} Grammar issues
     */
    async checkGrammar(text) {
        if (!text.trim()) return [];

        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a grammar checker. Analyze the given text and identify grammar, spelling, and style issues. Return your response in JSON format with an array of issues, where each issue has: type, message, range (start and end positions), and suggestion.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 2000,
            temperature: 0.3
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.processGrammarResponse(response, text);
    }

    /**
     * Adjust text tone
     * @param {string} text - Text to adjust
     * @param {string} tone - Target tone (formal, casual, friendly)
     * @returns {Promise<string>} Adjusted text
     */
    async adjustTone(text, tone) {
        if (!text.trim()) return text;

        const toneInstructions = {
            formal: 'Make the text more formal and professional',
            casual: 'Make the text more casual and conversational',
            friendly: 'Make the text more friendly and approachable'
        };

        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a writing assistant. ${toneInstructions[tone] || toneInstructions.formal}. Maintain the original meaning and key information while adjusting the tone. Return only the adjusted text.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: Math.min(this.maxTokens, text.length * 2),
            temperature: 0.7
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.extractTextFromResponse(response);
    }

    /**
     * Generate text completion
     * @param {string} text - Partial text
     * @param {Object} context - Context data
     * @returns {Promise<Array>} Completion suggestions
     */
    async generateCompletion(text, context = {}) {
        if (!text.trim()) return [];

        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: this.getCompletionSystemPrompt(context)
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 200,
            temperature: 0.8,
            n: 3 // Generate multiple suggestions
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.processCompletionResponse(response);
    }

    /**
     * Generate email components (subject, greeting, closing)
     * @param {string} content - Email content
     * @param {string} type - Component type (subject, greeting, closing)
     * @param {Object} context - Additional context
     * @returns {Promise<Array>} Generated components
     */
    async generateEmailComponent(content, type, context = {}) {
        const instructions = {
            subject: 'Generate appropriate email subject lines based on the content',
            greeting: 'Generate appropriate email greetings based on the relationship and context',
            closing: 'Generate appropriate email closings based on the tone and relationship'
        };

        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are an email writing assistant. ${instructions[type]}. Generate 3 variations that are appropriate for the context. Return as a JSON array of strings.`
                },
                {
                    role: 'user',
                    content: this.buildEmailContext(content, type, context)
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.processEmailComponentResponse(response);
    }

    /**
     * Summarize text
     * @param {string} text - Text to summarize
     * @param {number} maxLength - Maximum summary length
     * @returns {Promise<string>} Summary
     */
    async summarizeText(text, maxLength = 100) {
        if (!text.trim()) return '';

        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `Summarize the given text in approximately ${maxLength} words. Keep the key points and main ideas.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: Math.min(maxLength * 2, 300),
            temperature: 0.5
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.extractTextFromResponse(response);
    }

    /**
     * Expand text
     * @param {string} text - Text to expand
     * @param {Object} context - Context for expansion
     * @returns {Promise<string>} Expanded text
     */
    async expandText(text, context = {}) {
        if (!text.trim()) return text;

        const data = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'Expand the given text with more detail while maintaining the original meaning and tone. Add relevant examples, explanations, or context as appropriate.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: Math.min(this.maxTokens, text.length * 3),
            temperature: 0.7
        };

        const response = await this.makeRequest('/chat/completions', data);
        return this.extractTextFromResponse(response);
    }

    /**
     * Get system prompt based on tone
     * @param {string} tone - Writing tone
     * @returns {string} System prompt
     */
    getSystemPrompt(tone) {
        const toneInstructions = {
            formal: 'professional and formal',
            casual: 'casual and conversational',
            friendly: 'friendly and approachable'
        };

        return `You are a helpful AI writing assistant. Your responses should be ${toneInstructions[tone] || 'professional'}. Focus on clarity, correctness, and appropriateness for the context. When making suggestions, provide clear and actionable improvements.`;
    }

    /**
     * Get completion system prompt
     * @param {Object} context - Context data
     * @returns {string} System prompt
     */
    getCompletionSystemPrompt(context) {
        return `You are a text completion assistant. Continue the given text naturally and coherently. Consider the context and maintain consistency in tone and style. Provide multiple completion options if possible.`;
    }

    /**
     * Build prompt with context
     * @param {string} prompt - User prompt
     * @param {Object} context - Context data
     * @returns {string} Enhanced prompt
     */
    buildPromptWithContext(prompt, context) {
        let enhancedPrompt = prompt;

        if (context.content) {
            enhancedPrompt += `\n\nCurrent text:\n${context.content}`;
        }

        if (context.selection) {
            enhancedPrompt += `\n\nSelected text: "${context.selection}"`;
        }

        return enhancedPrompt;
    }

    /**
     * Build email context
     * @param {string} content - Email content
     * @param {string} type - Component type
     * @param {Object} context - Additional context
     * @returns {string} Email context
     */
    buildEmailContext(content, type, context) {
        let contextStr = `Email content: ${content}`;
        
        if (context.recipient) {
            contextStr += `\nRecipient: ${context.recipient}`;
        }
        
        if (context.relationship) {
            contextStr += `\nRelationship: ${context.relationship}`;
        }
        
        if (context.purpose) {
            contextStr += `\nPurpose: ${context.purpose}`;
        }

        return contextStr;
    }

    /**
     * Process AI response
     * @param {Object} response - Raw API response
     * @param {string} type - Response type
     * @returns {Object} Processed response
     */
    processAIResponse(response, type) {
        try {
            const choice = response.choices?.[0];
            const content = choice?.message?.content || '';

            if (type === 'prompt') {
                return {
                    text: content,
                    suggestions: this.extractSuggestions(content),
                    replacement: content.includes('REPLACE:') ? content.split('REPLACE:')[1]?.trim() : null
                };
            }

            return { text: content };
        } catch (error) {
            console.error('Error processing AI response:', error);
            return { text: '', error: 'Failed to process response' };
        }
    }

    /**
     * Process grammar check response
     * @param {Object} response - Raw API response
     * @param {string} originalText - Original text
     * @returns {Array} Grammar issues
     */
    processGrammarResponse(response, originalText) {
        try {
            const content = response.choices?.[0]?.message?.content || '[]';
            const issues = JSON.parse(content);
            
            return Array.isArray(issues) ? issues : [];
        } catch (error) {
            console.error('Error processing grammar response:', error);
            throw new Error('Failed to process grammar check response');
        }
    }

    /**
     * Process completion response
     * @param {Object} response - Raw API response
     * @returns {Array} Completion suggestions
     */
    processCompletionResponse(response) {
        try {
            const completions = [];
            response.choices?.forEach(choice => {
                const text = choice.message?.content?.trim();
                if (text) {
                    completions.push({
                        text,
                        confidence: 0.8 + Math.random() * 0.2
                    });
                }
            });
            
            return completions;
        } catch (error) {
            console.error('Error processing completion response:', error);
            return [];
        }
    }

    /**
     * Process email component response
     * @param {Object} response - Raw API response
     * @returns {Array} Email component suggestions
     */
    processEmailComponentResponse(response) {
        try {
            const content = response.choices?.[0]?.message?.content || '[]';
            const components = JSON.parse(content);
            
            return Array.isArray(components) ? components : [];
        } catch (error) {
            console.error('Error processing email component response:', error);
            return [];
        }
    }

    /**
     * Extract text from response
     * @param {Object} response - API response
     * @returns {string} Extracted text
     */
    extractTextFromResponse(response) {
        return response.choices?.[0]?.message?.content || '';
    }

    /**
     * Extract suggestions from response text
     * @param {string} text - Response text
     * @returns {Array} Suggestions
     */
    extractSuggestions(text) {
        // Simple suggestion extraction - could be enhanced
        const suggestions = [];
        
        if (text.includes('SUGGESTIONS:')) {
            const suggestionText = text.split('SUGGESTIONS:')[1];
            const lines = suggestionText.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                    suggestions.push({
                        text: line.trim().substring(1).trim(),
                        type: 'suggestion',
                        confidence: 0.8
                    });
                }
            });
        }

        return suggestions;
    }



}

export default AIService;
