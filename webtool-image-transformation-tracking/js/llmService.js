/**
 * LLM Service - Handles communication with IO Intelligence API
 */

class LLMService {
    constructor() {
        this.baseUrl = ''; // Using relative URLs for static site
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
     * Analyze image content using vision model
     */
    async analyzeImage(imageUrl, model = 'gpt-4o') {
        try {
            // For demo purposes, we'll return a simulated analysis
            // In production, this would call the actual vision API
            const mockResponse = await this.simulateImageAnalysis(imageUrl);
            return mockResponse;
            
            /* Production code would be:
            const response = await fetch(`${this.baseUrl}/api/image/understand`, {
                method: 'POST',
                headers: config.getApiHeaders(),
                body: JSON.stringify({
                    image_urls: [imageUrl],
                    instruction: 'Describe this image in detail, including composition, colors, subjects, mood, and artistic style.',
                    model: model
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.content;
            */
            
        } catch (error) {
            console.error('Failed to analyze image:', error);
            throw error;
        }
    }

    /**
     * Simulate image analysis for demo
     */
    async simulateImageAnalysis(imageUrl) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return `画像には自然の風景が映っています。前景に緑豊かな草原があり、中景には穏やかな湖、背景には雄大な山々が連なっています。
全体的に明るく爽やかな雰囲気で、青空と白い雲が印象的です。
色彩は自然な緑と青が主体で、写実的な表現がされています。`;
    }

    /**
     * Call LLM API
     */
    async callLLM(systemPrompt, userPrompt, model = 'gpt-4o') {
        try {
            // For demo purposes, generate a mock response
            const mockResponse = await this.generateMockPrompt(systemPrompt, userPrompt, model);
            return mockResponse;
            
            /* Production code would be:
            const response = await fetch(`${this.baseUrl}/api/intelligence/chat`, {
                method: 'POST',
                headers: config.getApiHeaders(),
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
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
            */
            
        } catch (error) {
            console.error('Failed to call LLM:', error);
            throw error;
        }
    }

    /**
     * Generate mock prompt for demo
     */
    async generateMockPrompt(systemPrompt, userPrompt, model) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const style = userPrompt.match(/「(.+?)」/)?.[1] || 'artistic';
        
        const mockPrompts = {
            artistic: `静寂な自然風景を鮮やかな印象派の傑作へと変換。モネやルノワールを彷彿とさせる筆致で、光と色彩の調和を追求。
草原は黄金色と翡翠色のブラシストロークで表現し、湖面には夕焼けのオレンジとピンクの反射を加える。
山々は紫がかった青で神秘的に描き、空は渦巻くような動きのある雲で劇的に演出。
全体的に暖色系の光を強調し、幻想的で夢のような雰囲気を創出。油彩画の質感とテクスチャを再現。`,
            
            photorealistic: `超高解像度の写実的な風景写真へ変換。8K品質、HDR処理済み。
ゴールデンアワーの暖かい光線が草原を照らし、一本一本の草が鮮明に描写される。
湖面は鏡のような反射で山々と空を完璧に映し出す。水の透明度と波紋のディテールを強調。
山肌の岩石の質感、雪の輝き、大気遠近法による霞みを精密に表現。
空には積雲の立体感と、太陽光による雲の縁の輝きを追加。写真コンテスト受賞作品のクオリティ。`,
            
            anime: `スタジオジブリ風のファンタジーアニメ背景画へ変換。
鮮やかで暖かみのある色彩パレット、柔らかい輪郭線と水彩画のような塗り。
草原には風になびく草花と蝶々を追加、湖には神秘的な青緑色のグラデーション。
山々は雲に包まれた幻想的な姿で、頂上には虹色のオーラ。
空には大きな入道雲と、飛行する鳥のシルエット。
全体的に牧歌的で平和な雰囲気、子供の頃の夏休みを思い出させるノスタルジックな表現。`,
            
            cyberpunk: `ネオン輝くサイバーパンク世界へ変換。2088年の地球、テクノロジーと自然が融合した風景。
草原は人工芝とホログラフィック植物の混在、青紫のネオン光が走る。
湖は液体データの海、デジタルな波紋とバイナリコードの反射。
山々は巨大な都市構造物に置き換え、無数の窓から漏れる光、空中を行き交うフライングカー。
空は暗く、巨大な広告ホログラムと人工月が浮かぶ。全体的に青、紫、ピンクのネオンカラー。
雨に濡れた質感、反射、グリッチエフェクトを追加。`,
            
            watercolor: `優しい水彩画スタイルへ変換。透明感のある色彩と、水の流れる偶然性を活かした表現。
草原は黄緑と青緑の濃淡で、にじみとぼかしを効かせて描写。
湖は群青と空色のグラデーション、紙の白を活かした光の反射。
山々は薄紫と灰青色で、ウェットオンウェットの技法で霞んだ遠景を表現。
空は淡いピンクとオレンジの夕焼け、雲は筆をさっと走らせたような軽やかさ。
全体的に余白を活かし、日本の水彩画のような繊細さと静謐さを演出。`,
            
            'oil-painting': `重厚な油絵の名作へ変換。レンブラントやフェルメールの技法を参考に。
厚塗りのインパストで草原のテクスチャを表現、ナイフで削ったような力強い筆致。
湖面は薄塗りのグレーズで透明感と深みを演出、光の反射は白のハイライトで強調。
山々は青みがかった灰色で重厚に、空気遠近法で奥行きを表現。
空は劇的な明暗対比、厚い雲と光の筋が交差するバロック的な構図。
全体的に古典的な色調、ヴィンテージな質感、時間の経過を感じさせる作品。`,
            
            custom: `ユーザーの指定に従って画像を変換。独創的で個性的な表現を追求。
提供された追加指示を最優先に、画像の本質を保ちながら新しい解釈を加える。
色彩、構図、スタイル、雰囲気のすべてにおいて、期待を超える結果を目指す。`
        };
        
        return mockPrompts[style] || mockPrompts.custom;
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