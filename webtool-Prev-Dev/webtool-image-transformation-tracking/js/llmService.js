/**
 * LLM Service - Handles communication with IO Intelligence API
 */

class LLMService {
    constructor() {
        this.modelCache = null;
        this.modelCacheExpiry = null;
        this.CACHE_DURATION = 3600000; // 1 hour
        this.promptTemplates = {
            artistic: 'Transform this image into an artistic masterpiece with vibrant colors and creative interpretation. ',
            photorealistic: 'Create a photorealistic transformation that enhances details and lighting. ',
            anime: 'Convert this image into anime/manga art style with characteristic features. ',
            cyberpunk: 'Transform into a futuristic cyberpunk aesthetic with neon lights and technological elements. ',
            watercolor: 'Create a soft watercolor painting effect with flowing colors and gentle transitions. ',
            'oil-painting': 'Transform into a classical oil painting style with rich textures and depth. ',
            sketch: 'Convert to a pencil sketch or line art drawing with detailed strokes. ',
            '3d-render': 'Transform into a 3D rendered image with volumetric lighting and depth. ',
            custom: ''
        };
    }

    /**
     * Generate transformation prompt using LLM
     */
    async generatePrompt(imageUrl, style, additionalInstructions, model = 'gpt-4o') {
        try {
            // Check if API key is configured
            if (!config.isConfigured()) {
                throw new Error('APIキーが設定されていません。設定画面からAPIキーを入力してください。');
            }

            const basePrompt = this.promptTemplates[style] || '';
            
            // Create the system prompt
            const systemPrompt = `You are an expert image transformation prompt engineer. Your task is to analyze the provided image and create a detailed, effective prompt for image transformation.

Your response should:
1. Describe the main elements and composition of the source image
2. Provide specific transformation instructions based on the selected style: ${style}
3. Include artistic direction, color palette, mood, and technical details
4. Be clear, specific, and optimized for AI image generation
5. Respond in Japanese

Style context: ${basePrompt}
Additional instructions from user: ${additionalInstructions || 'なし'}`;

            const userPrompt = `この画像を分析して、「${style}」スタイルへの変換プロンプトを生成してください。`;

            // Make API call to understand image first
            const imageAnalysis = await this.analyzeImage(imageUrl, model);
            
            // Generate transformation prompt based on analysis
            const response = await this.callLLM(
                systemPrompt,
                `画像の内容: ${imageAnalysis}\n\n${userPrompt}`,
                model
            );

            return response;
            
        } catch (error) {
            console.error('Failed to generate prompt:', error);
            throw error;
        }
    }

    /**
     * Fetch available models from IO Intelligence API
     */
    async fetchModels() {
        try {
            // Check cache first
            if (this.modelCache && this.modelCacheExpiry && Date.now() < this.modelCacheExpiry) {
                return this.modelCache;
            }
            
            const endpoint = config.get('apiEndpoint').ioIntelligence.models;
            console.log('Fetching models from:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
            
            const data = await response.json();
            this.modelCache = data.data || [];
            this.modelCacheExpiry = Date.now() + this.CACHE_DURATION;
            
            console.log(`Fetched ${this.modelCache.length} models`);
            return this.modelCache;
            
        } catch (error) {
            console.error('Failed to fetch models:', error);
            // Return empty array on error
            return [];
        }
    }
    
    /**
     * Get vision-capable models
     */
    async getVisionModels() {
        const models = await this.fetchModels();
        return models.filter(m => m.supports_images_input === true);
    }
    
    /**
     * Analyze image content using vision model
     */
    async analyzeImage(imageUrl, model = null) {
        // Check if IO Intelligence API is configured
        if (!config.hasIOApi()) {
            throw new Error('IO Intelligence APIキーが設定されていません。設定画面からAPIキーを入力してください。');
        }
        
        // Use vision model if not specified
        if (!model) {
            const visionModels = await this.getVisionModels();
            if (visionModels.length === 0) {
                throw new Error('Vision model not available');
            }
            model = visionModels[0].id; // Use first available vision model
        }
        
        console.log('Analyzing image with model:', model);
        
        const endpoint = config.get('apiEndpoint').ioIntelligence.chat;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: config.getApiHeaders('io'),
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'この画像を詳細に分析してください。構図、色彩、被写体、雰囲気、芸術的スタイルについて説明してください。'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content;
        
        if (!analysis) {
            throw new Error('No analysis returned from API');
        }
        
        console.log('Image analysis completed');
        return analysis;
    }


    /**
     * Call LLM API
     */
    async callLLM(systemPrompt, userPrompt, model = null) {
        // Check if IO Intelligence API is configured
        if (!config.hasIOApi()) {
            throw new Error('IO Intelligence APIキーが設定されていません。設定画面からAPIキーを入力してください。');
        }
        
        // Use configured model if not specified
        if (!model) {
            model = config.get('llmModel') || 'openai/gpt-oss-120b';
        }
        
        console.log('Calling LLM with model:', model);
        
        const endpoint = config.get('apiEndpoint').ioIntelligence.chat;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: config.getApiHeaders('io'),
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('No content returned from API');
        }
        
        console.log('LLM response received');
        return content;
    }


    /**
     * Refine prompt with additional context
     */
    async refinePrompt(basePrompt, context) {
        try {
            const refinedPrompt = `${basePrompt}\n\n追加コンテキスト: ${context}`;
            return refinedPrompt;
        } catch (error) {
            console.error('Failed to refine prompt:', error);
            return basePrompt;
        }
    }

    /**
     * Generate multiple prompt variations
     */
    async generatePromptVariations(basePrompt, count = 3) {
        const variations = [];
        const modifiers = [
            'より詳細に、繊細な表現で',
            'ダイナミックで劇的な構図で',
            'ミニマリスティックでシンプルに',
            '幻想的で夢のような雰囲気で',
            '写実的でリアリスティックに'
        ];
        
        for (let i = 0; i < Math.min(count, modifiers.length); i++) {
            variations.push(`${basePrompt}\n\n${modifiers[i]}`);
        }
        
        return variations;
    }
}

// Initialize LLM service
const llmService = new LLMService();