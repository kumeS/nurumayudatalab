/**
 * AI Service - IO Intelligence API Integration
 * Handles communication with IO Intelligence API
 */

class AIService {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.currentProvider = 'io_intelligence';
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimits = {
            io_intelligence: { requests: 0, resetTime: 0, limit: 100 }
        };
    }

    /**
     * Set the preferred AI provider
     * @param {string} provider - 'io_intelligence'
     */
    setProvider(provider) {
        if (provider === 'io_intelligence') {
            this.currentProvider = provider;
        } else {
            throw new Error(`Unsupported provider: ${provider}. Only io_intelligence is supported.`);
        }
    }

    /**
     * Get available API keys
     * @returns {Object} Available API keys
     */
    getAvailableProviders() {
        const available = {};

        if (this.storageManager.hasApiKey('io_intelligence')) {
            available.io_intelligence = 'IO Intelligence';
        }

        return available;
    }

    /**
     * Check if current provider is available
     * @returns {boolean} Provider availability
     */
    isProviderAvailable(provider = this.currentProvider) {
        return provider === 'io_intelligence' && this.storageManager.hasApiKey('io_intelligence');
    }

    /**
     * Improve prompt using AI (Stage 1)
     * @param {string} originalPrompt - Original user prompt
     * @param {string} provider - AI provider to use
     * @returns {Promise<string>} Improved prompt
     */
    async improvePrompt(originalPrompt, provider = this.currentProvider) {
        if (!this.isProviderAvailable(provider)) {
            throw new Error(`Provider ${provider} is not configured`);
        }

        const systemPrompt = `あなたはプロンプトエンジニアリングの専門家です。
以下のユーザーの指示文を分析し、より明確で具体的なプロンプトに改良してください。

改良のポイント：
1. 曖昧な表現を具体的にする
2. 必要な情報や制約条件を明記する
3. 出力形式や期待する結果を明確にする
4. 思考過程を促すキーワードを追加する

元の意図を保ちながら、AIがより良い回答を生成できるような指示文に改良してください。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `改良してください：\n${originalPrompt}` }
        ];

        try {
            const response = await this.sendRequest(messages, provider, {
                temperature: 0.3,
                maxTokens: 500
            });

            return response.content;
        } catch (error) {
            console.error('Prompt improvement failed:', error);
            throw new Error(`プロンプト改良に失敗しました: ${error.message}`);
        }
    }

    /**
     * Execute prompt with specific thinking pattern
     * @param {string} prompt - Prompt to execute
     * @param {string} thinkingPattern - Thinking pattern prompt
     * @param {string} patternName - Name of the thinking pattern
     * @param {string} provider - AI provider to use
     * @returns {Promise<Object>} Execution result
     */
    async executeWithPattern(prompt, thinkingPattern, patternName, provider = this.currentProvider) {
        if (!this.isProviderAvailable(provider)) {
            throw new Error(`Provider ${provider} is not configured`);
        }

        const fullPrompt = `${thinkingPattern}\n\n以下の指示に対して上記の思考方法で回答してください：\n${prompt}`;

        const messages = [
            { role: 'user', content: fullPrompt }
        ];

        try {
            const startTime = Date.now();
            const response = await this.sendRequest(messages, provider, {
                temperature: 0.7,
                maxTokens: 1000
            });

            const endTime = Date.now();

            return {
                content: response.content,
                patternName: patternName,
                provider: provider,
                executionTime: endTime - startTime,
                timestamp: new Date().toISOString(),
                tokenUsage: response.tokenUsage || null
            };
        } catch (error) {
            console.error(`Pattern execution failed for ${patternName}:`, error);
            throw new Error(`${patternName}の実行に失敗しました: ${error.message}`);
        }
    }

    /**
     * Send request to AI provider
     * @param {Array} messages - Messages array
     * @param {string} provider - AI provider
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response
     */
    async sendRequest(messages, provider, options = {}) {
        await this.checkRateLimit(provider);
        
        const apiKey = this.storageManager.getApiKey(provider);
        
        if (!apiKey) {
            throw new Error(`API key for ${provider} not found. Please set up your API key in settings or ensure environment variables are configured.`);
        }

        switch (provider) {
            case 'io_intelligence':
                return await this.callIOIntelligence(messages, apiKey, options);
            default:
                throw new Error(`Unsupported provider: ${provider}. Only io_intelligence is supported.`);
        }
    }

    /**
     * Call IO Intelligence API
     * @param {Array} messages - Messages array
     * @param {string} apiKey - API key
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response
     */
    async callIOIntelligence(messages, apiKey, options) {
        // Resolve endpoint from ENV_CONFIG with safe fallback
        const endpoint = (typeof window !== 'undefined' && window.ENV_CONFIG && window.ENV_CONFIG.API_ENDPOINTS && window.ENV_CONFIG.API_ENDPOINTS.IO_INTELLIGENCE)
            ? window.ENV_CONFIG.API_ENDPOINTS.IO_INTELLIGENCE
            : 'https://api.intelligence.io.solutions/api/v1/chat/completions';

        let response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: options.model || (typeof window !== 'undefined' && window.ENV_CONFIG?.DEFAULT_SETTINGS?.DEFAULT_MODEL) || 'openai/gpt-oss-120b',
                    messages: messages,
                    reasoning_content: (typeof window !== 'undefined' && window.ENV_CONFIG?.DEFAULT_SETTINGS?.REASONING_CONTENT) ?? false,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 1000
                })
            });
        } catch (networkError) {
            console.error('IOnet API Network/CORS Error:', {
                message: networkError?.message,
                endpoint
            });
            // Typical in browsers when CORS blocks or offline
            throw new Error(`APIに接続できませんでした（ネットワークまたはCORSの可能性）。ローカルで開発中の場合はプロキシを起動してください: \`node api-proxy-server.js\`（ポート3001）。またはHTTPサーバー経由で実行し、ネットワーク/CORS設定をご確認ください。詳細: ${networkError?.message || 'Unknown error'}`);
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: { message: errorText || `HTTP ${response.status}` } };
            }
            
            console.error('IOnet API Error:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData,
                endpoint,
                apiKeyPrefix: apiKey.substring(0, 10) + '...'
            });
            
            const errorMessage = errorData.error?.message || `IOnet API error: ${response.status} ${response.statusText}`;

            // Add more specific error messages for common issues
            if (response.status === 401) {
                throw new Error('APIキーが無効です。設定を確認してください。');
            } else if (response.status === 429) {
                throw new Error('API使用量の上限に達しました。しばらく待ってから再試行してください。');
            } else if (response.status === 500) {
                throw new Error('サーバーエラーが発生しました。しばらく待ってから再試行してください。');
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        this.updateRateLimit('io_intelligence');

        return {
            content: data.choices?.[0]?.message?.content || '',
            tokenUsage: data.usage
        };
    }




    /**
     * Check rate limit before making request
     * @param {string} provider - AI provider
     */
    async checkRateLimit(provider) {
        const limit = this.rateLimits[provider];
        const now = Date.now();

        // Reset counter if time window has passed (1 minute)
        if (now > limit.resetTime) {
            limit.requests = 0;
            limit.resetTime = now + 60000; // 1 minute from now
        }

        // Check if we've hit the rate limit
        if (limit.requests >= limit.limit) {
            const waitTime = limit.resetTime - now;
            throw new Error(`Rate limit exceeded for ${provider}. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
        }
    }

    /**
     * Update rate limit counter
     * @param {string} provider - AI provider
     */
    updateRateLimit(provider) {
        this.rateLimits[provider].requests++;
    }

    /**
     * Execute multiple patterns concurrently with queue management
     * @param {string} prompt - Prompt to execute
     * @param {Array} patterns - Array of pattern objects
     * @param {Function} progressCallback - Progress update callback
     * @returns {Promise<Array>} Array of results
     */
    async executeMultiplePatterns(prompt, patterns, progressCallback) {
        const availableProviders = Object.keys(this.getAvailableProviders());
        
        if (availableProviders.length === 0) {
            throw new Error('No AI providers are configured. Please set up API keys in settings.');
        }

        const results = [];
        const errors = [];

        // Process patterns with controlled concurrency to avoid rate limits
        const configuredMax = (typeof window !== 'undefined' && window.ENV_CONFIG?.DEFAULT_SETTINGS?.MAX_CONCURRENCY) || 3;
        const maxConcurrency = Math.min(Number(configuredMax) || 3, patterns.length);
        const chunks = this.chunkArray(patterns, maxConcurrency);

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            const chunkPromises = chunk.map(async (pattern, index) => {
                const provider = availableProviders[index % availableProviders.length];
                
                try {
                    progressCallback(pattern.name, 'running');
                    
                    const result = await this.executeWithPattern(
                        prompt,
                        pattern.prompt,
                        pattern.name,
                        provider
                    );
                    
                    progressCallback(pattern.name, 'completed');
                    return { patternId: pattern.id, success: true, data: result };
                    
                } catch (error) {
                    progressCallback(pattern.name, 'error');
                    return { 
                        patternId: pattern.id, 
                        success: false, 
                        error: error.message,
                        patternName: pattern.name 
                    };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            
            chunkResults.forEach(result => {
                if (result.success) {
                    results.push(result);
                } else {
                    errors.push(result);
                }
            });

            // Add delay between chunks to respect rate limits
            if (chunkIndex < chunks.length - 1) {
                await this.delay(1000);
            }
        }

        return { results, errors };
    }

    /**
     * Summarize multiple results into a single coherent analysis
     * @param {Array} results - Array of pattern results
     * @param {string} originalPrompt - Original prompt
     * @returns {Promise<string>} Summary result
     */
    async summarizeResults(results, originalPrompt) {
        if (results.length === 0) {
            throw new Error('No results to summarize');
        }

        const availableProviders = Object.keys(this.getAvailableProviders());
        if (availableProviders.length === 0) {
            throw new Error('No AI providers configured for summarization');
        }

        const resultsText = results.map(result => 
            `【${result.data.patternName}】\n${result.data.content}\n`
        ).join('\n---\n\n');

        const summaryPrompt = `以下は「${originalPrompt}」という指示に対して、複数の思考パターンで分析した結果です。

${resultsText}

これらの分析結果を統合して、以下の構成で包括的な回答を作成してください：

## 🎯 統合分析結果

### 主要な共通点
- 各思考パターンで共通して指摘されている重要なポイント

### 多角的視点からの洞察
- 異なる思考パターンから得られた独自の視点や発見

### 実行可能な提案
- 分析結果を基にした具体的なアクションプラン

### 注意すべきリスクと対策
- 各分析で指摘されたリスクとその対策

### 次のステップ
- 今後検討すべき事項や追加調査が必要な領域

論理的で実用的な統合分析を提供してください。`;

        try {
            const provider = availableProviders[0]; // Use first available provider
            const messages = [
                { role: 'user', content: summaryPrompt }
            ];

            const response = await this.sendRequest(messages, provider, {
                temperature: 0.5,
                maxTokens: 1500
            });

            return response.content;
        } catch (error) {
            console.error('Summarization failed:', error);
            throw new Error(`結果の統合に失敗しました: ${error.message}`);
        }
    }

    /**
     * Utility function to chunk array
     * @param {Array} array - Array to chunk
     * @param {number} chunkSize - Size of each chunk
     * @returns {Array} Chunked array
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get cost estimation for request
     * @param {string} provider - AI provider
     * @param {number} inputTokens - Estimated input tokens
     * @param {number} outputTokens - Estimated output tokens
     * @returns {number} Estimated cost in USD
     */
    estimateCost(provider, inputTokens, outputTokens) {
        // IO Intelligence pricing (estimated)
        const pricing = {
            io_intelligence: {
                input: 0.001 / 1000,   // Estimated per 1k tokens
                output: 0.001 / 1000
            }
        };

        const rates = pricing[provider];
        if (!rates) return 0;

        return (inputTokens * rates.input) + (outputTokens * rates.output);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
} else {
    window.AIService = AIService;
}
