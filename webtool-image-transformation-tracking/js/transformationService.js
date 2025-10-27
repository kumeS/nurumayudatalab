/**
 * Transformation Service - Handles image transformation operations
 */

class TransformationService {
    constructor() {
        this.isTransforming = false;
        this.currentTransformationId = null;
    }

    /**
     * Transform image with given prompt
     */
    async transformImage(sourceImage, prompt, count = 3, model = 'flux-pro/ultra') {
        if (this.isTransforming) {
            throw new Error('変換処理が既に実行中です');
        }
        
        if (!sourceImage) {
            throw new Error('Source image is required');
        }
        
        if (!prompt || prompt.trim() === '') {
            throw new Error('Prompt is required');
        }

        this.isTransforming = true;
        this.currentTransformationId = `transform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Background execution - no progress popup
            // this.showProgress(0, '変換を開始しています...');

            // Transform using appropriate API based on model
            let results;
            if (model === 'google/nano-banana' || model.includes('nano-banana')) {
                const images = Array.isArray(sourceImage) ? sourceImage : [sourceImage];
                results = await this.transformWithNanoBanana(images, prompt, { count });
            } else {
                throw new Error(`未対応のモデル: ${model}。現在対応しているのは google/nano-banana のみです。`);
            }

            // Background execution - no progress popup
            // this.showProgress(100, '変換完了！');

            // Hide progress after a moment
            // setTimeout(() => this.hideProgress(), 1000);

            return results;

        } catch (error) {
            console.error('Transformation failed:', error);
            this.hideProgress();
            
            // Show user-friendly error message
            const errorMessage = error.message || 'Unknown error occurred during transformation';
            alert(`変換に失敗しました: ${errorMessage}`);
            
            throw error;
        } finally {
            this.isTransforming = false;
            this.currentTransformationId = null;
        }
    }

    /**
     * Transform with Replicate API (Nano Banana model)
     */
    async transformWithNanoBanana(sourceImages, prompt, options = {}) {
        console.log('Nano Banana transformation started');
        console.log('Source images:', sourceImages.length);
        console.log('Prompt:', prompt);

        // Note: No API key validation needed - Cloudflare Workers handles authentication

        // Ensure sourceImages is an array
        const images = Array.isArray(sourceImages) ? sourceImages : [sourceImages];
        
        // Get settings
        const aspectRatio = options.aspectRatio || config.get('aspectRatio') || 'match_input_image';
        const outputFormat = options.outputFormat || config.get('outputFormat') || 'png';
        const imageCount = options.count || 1;
        const nodeId = options.nodeId || null; // Node ID for IndexedDB storage

        console.log('Settings:', { aspectRatio, outputFormat, imageCount, nodeId });

        try {
            // Background execution - no progress popup
            // this.showProgress(10, '画像を準備中...');

            // Prepare image inputs (keep base64 as-is for Replicate API)
            const imageInputs = [];
            for (const img of images) {
                if (img.startsWith('data:')) {
                    // Base64 data URL - keep as is
                    imageInputs.push(img);
                } else if (img.startsWith('http://') || img.startsWith('https://')) {
                    // External URL - keep as is
                    imageInputs.push(img);
                } else {
                    console.warn('Unknown image format, using as-is:', img.substring(0, 50));
                    imageInputs.push(img);
                }
            }

            console.log('Prepared', imageInputs.length, 'image inputs');

            // Background execution - no progress popup
            // this.showProgress(20, 'APIを呼び出し中...');

            // Call Replicate Nano Banana API via Cloudflare Workers proxy
            const apiEndpointConfig = config.get('apiEndpoint');
            console.log('Full apiEndpoint config:', apiEndpointConfig);
            const apiUrl = apiEndpointConfig.replicate.nanoBanana;
            console.log('API endpoint (Cloudflare proxy):', apiUrl);

            // Validation: Ensure we're using Cloudflare Workers proxy
            if (!apiUrl.includes('workers.dev')) {
                console.error('WARNING: Not using Cloudflare Workers proxy!');
                console.error('Expected URL to contain "workers.dev", got:', apiUrl);
                throw new Error(`設定エラー: Cloudflare Workersプロキシが設定されていません。実際のURL: ${apiUrl}。ブラウザのキャッシュをクリアしてページをリロードしてください（Cmd+Shift+R / Ctrl+Shift+R）。`);
            }

            // Extract Replicate API key from config
            const replicateApiKey = config.get('replicateApiKey');
            if (!replicateApiKey) {
                throw new Error('Replicate APIキーが設定されていません。設定画面からAPIキーを入力してください。');
            }

            console.log('Using UI-side API key for Replicate authentication');

            // Payload for Cloudflare Workers proxy (includes UI-side API token)
            const payload = {
                apiToken: replicateApiKey,  // UI-side API key (encrypted via HTTPS)
                path: '/v1/models/google/nano-banana/predictions', // Specify Replicate API path
                input: {
                    prompt: prompt,
                    image_input: imageInputs,
                    aspect_ratio: aspectRatio,
                    output_format: outputFormat
                }
            };

            console.log('Request payload:', JSON.stringify(payload).substring(0, 200) + '...');

            let response;
            try {
                // Note: No Authorization header needed - Cloudflare Workers handles authentication
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            } catch (fetchError) {
                console.error('Fetch failed:', fetchError);
                throw new Error(`ネットワークエラー: ${fetchError.message}。Cloudflare Workersプロキシに接続できません。エンドポイント: ${apiUrl}`);
            }

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { detail: errorText };
                }
                throw new Error(`Replicate APIエラー (${response.status}): ${errorData.detail || errorData.error || response.statusText}。APIキーとエンドポイント設定を確認してください。`);
            }

            // Background execution - no progress popup
            // this.showProgress(60, '画像を生成中...');

            const result = await response.json();
            console.log('API result:', result);
            console.log('API result structure:', JSON.stringify(result, null, 2).substring(0, 500));

            // Cloudflare Workers response structure: { ok: true, prediction: {...}, saved: [...] }
            // Extract prediction from Cloudflare Workers response
            const prediction = result.prediction || result;
            console.log('Prediction object:', prediction);

            // Check for failed status
            if (prediction.status === 'failed') {
                throw new Error(`Generation failed: ${prediction.error || 'Unknown error'}`);
            }

            // Check if still processing
            if (prediction.status !== 'succeeded') {
                throw new Error(`画像生成が完了していません。Status: ${prediction.status}。しばらく待ってから再試行してください。`);
            }

            // Background execution - no progress popup
            // this.showProgress(80, '画像を処理中...');

            // Extract output image(s) from prediction
            // Prefer R2 URLs (from Cloudflare Workers) over Replicate URLs for better reliability
            let outputImages = [];

            // First, try R2 output (Cloudflare Workers R2 storage)
            if (prediction.r2Output && Array.isArray(prediction.r2Output) && prediction.r2Output.length > 0) {
                outputImages = prediction.r2Output;
                console.log('Using R2 URLs from Cloudflare Workers');
            }
            // Fallback to original Replicate output
            else if (prediction.output) {
                if (Array.isArray(prediction.output)) {
                    outputImages = prediction.output;
                } else if (typeof prediction.output === 'string') {
                    outputImages = [prediction.output];
                }
                console.log('Using original Replicate URLs');
            }

            console.log('Output images extracted:', outputImages.length);
            console.log('Output images URLs:', outputImages);

            if (outputImages.length === 0) {
                console.error('No output in prediction:', prediction);
                throw new Error(`No output images returned from API. Prediction status: ${prediction.status}. Full response: ${JSON.stringify(result).substring(0, 200)}`);
            }
            
            // Convert output to proper format
            const results = [];
            const conversionErrors = [];

            for (let index = 0; index < outputImages.length; index++) {
                const url = outputImages[index];
                console.log(`Processing output image ${index + 1}/${outputImages.length}`);

                try {
                    // Download and convert to base64, save to IndexedDB
                    const base64Image = await this.urlToBase64(url, nodeId, {
                        api: 'replicate',
                        modelName: 'google/nano-banana',
                        aspectRatio: aspectRatio,
                        outputFormat: outputFormat,
                        predictionId: prediction.id,
                        prompt: prompt
                    });

                    results.push({
                        id: `nano_banana_${Date.now()}_${index}`,
                        url: base64Image,
                        thumbnail: base64Image,
                        prompt: prompt,
                        model: 'google/nano-banana',
                        createdAt: new Date().toISOString(),
                        metadata: {
                            api: 'replicate',
                            modelName: 'google/nano-banana',
                            aspectRatio: aspectRatio,
                            outputFormat: outputFormat,
                            predictionId: prediction.id,
                            sourceUrl: url,
                            conversionSuccess: true
                        }
                    });
                } catch (conversionError) {
                    console.error(`Failed to convert image ${index + 1}:`, conversionError);
                    conversionErrors.push({
                        index: index + 1,
                        error: conversionError.message
                    });
                    // Do not add failed images to results - this ensures only successfully converted images are saved
                }
            }

            // Show warning if some images failed to convert
            if (conversionErrors.length > 0) {
                const errorMessage = `警告: ${conversionErrors.length}枚の画像の変換に失敗しました。\n` +
                    conversionErrors.map(e => `画像${e.index}: ${e.error}`).join('\n');
                console.warn(errorMessage);

                // If ALL images failed, throw error
                if (results.length === 0) {
                    throw new Error('すべての画像の変換に失敗しました。ネットワーク接続を確認してください。\n\n' + errorMessage);
                }

                // If some images succeeded, show warning but continue
                alert(errorMessage + '\n\n変換に成功した画像のみが保存されました。');
            }
            
            console.log('Nano Banana transformation completed successfully');
            return results;
            
        } catch (error) {
            console.error('Nano Banana API呼び出しエラー:', error);
            this.hideProgress();
            throw error;
        }
    }
    
    


    /**
     * Show progress indicator
     */
    showProgress(percentage, message) {
        const container = document.getElementById('progressContainer');
        const bar = document.getElementById('progressBar');
        const text = document.getElementById('progressText');
        
        if (container) {
            container.classList.remove('hidden');
        }
        
        if (bar) {
            bar.style.width = `${percentage}%`;
        }
        
        if (text) {
            text.textContent = message;
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const container = document.getElementById('progressContainer');
        if (container) {
            container.classList.add('hidden');
        }
    }

    /**
     * Batch transform with multiple prompts
     */
    async batchTransform(sourceImage, prompts, model = 'flux-pro/ultra') {
        const allResults = [];
        
        for (let i = 0; i < prompts.length; i++) {
            try {
                const results = await this.transformImage(
                    sourceImage,
                    prompts[i],
                    1,
                    model
                );
                allResults.push(...results);
            } catch (error) {
                console.error(`Failed to transform with prompt ${i}:`, error);
            }
        }
        
        return allResults;
    }

    /**
     * Apply style transfer
     */
    async applyStyleTransfer(contentImage, styleImage, strength = 0.5) {
        try {
            // This would call a style transfer API
            const prompt = `Apply style transfer from reference image with strength ${strength}`;
            return await this.transformImage(contentImage, prompt, 1, 'gpt-image-1');
        } catch (error) {
            console.error('Style transfer failed:', error);
            throw error;
        }
    }

    /**
     * Upscale image
     */
    async upscaleImage(imageUrl, scale = 2) {
        throw new Error('アップスケール機能はまだ実装されていません');
    }

    /**
     * Remove background
     */
    async removeBackground(imageUrl) {
        throw new Error('背景除去機能はまだ実装されていません');
    }

    /**
     * Prepare image for API (convert base64 to usable URL)
     */
    async prepareImageForApi(imageUrl) {
        // If already a URL, return as is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        
        // If base64, convert to Blob URL
        if (imageUrl.startsWith('data:')) {
            return this.base64ToBlobURL(imageUrl);
        }
        
        return imageUrl;
    }
    
    /**
     * Convert base64 to Blob URL
     */
    base64ToBlobURL(base64Data) {
        try {
            // Extract base64 content
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error('Invalid base64 format');
            }
            
            const contentType = matches[1];
            const base64 = matches[2];
            
            // Convert to binary
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            // Create Blob
            const blob = new Blob([bytes], { type: contentType });
            
            // Create Blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            return blobUrl;
        } catch (error) {
            console.error('Error converting base64 to Blob URL:', error);
            throw error;
        }
    }
    
    /**
     * Convert URL to base64 and save to IndexedDB
     * @param {string} imageUrl - Image URL to download
     * @param {string} nodeId - Node ID for IndexedDB storage
     * @param {Object} metadata - Additional metadata
     * @param {number} retries - Number of retry attempts
     * @returns {Promise<string>} Base64 data URL
     */
    async urlToBase64(imageUrl, nodeId = null, metadata = {}, retries = 3) {
        console.log('[ImageDownload] Starting download:', imageUrl.substring(0, 100));

        // If already base64, return as is
        if (imageUrl.startsWith('data:')) {
            console.log('[ImageDownload] Already base64, returning as is');
            return imageUrl;
        }

        let lastError = null;

        // Retry loop
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`[ImageDownload] Attempt ${attempt}/${retries}: Fetching image from URL...`);

                // Fetch image with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                const response = await fetch(imageUrl, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Failed to fetch image: HTTP ${response.status} ${response.statusText}`);
                }

                // Convert to blob
                console.log('[ImageDownload] Converting to blob...');
                const blob = await response.blob();
                console.log('[ImageDownload] Blob size:', blob.size, 'bytes, type:', blob.type);

                // Validate blob is an image
                if (!blob.type.startsWith('image/')) {
                    throw new Error(`Invalid image type: ${blob.type}`);
                }

                // Save to IndexedDB if imageStorage is available and nodeId is provided
                if (typeof imageStorage !== 'undefined' && nodeId) {
                    try {
                        console.log('[ImageDownload] Saving to IndexedDB for node:', nodeId);
                        const savedImage = await imageStorage.saveImage(nodeId, blob, {
                            ...metadata,
                            originalUrl: imageUrl,
                            savedAt: new Date().toISOString()
                        });
                        console.log('[ImageDownload] Saved to IndexedDB with ID:', savedImage.id);
                    } catch (dbError) {
                        console.error('[ImageDownload] Failed to save to IndexedDB:', dbError);
                        // Continue even if IndexedDB save fails - base64 in LocalStorage is primary storage
                    }
                } else {
                    if (!nodeId) {
                        console.warn('[ImageDownload] No nodeId provided, skipping IndexedDB save');
                    }
                    if (typeof imageStorage === 'undefined') {
                        console.warn('[ImageDownload] imageStorage not available, skipping IndexedDB save');
                    }
                }

                // Convert to base64
                console.log('[ImageDownload] Converting blob to base64...');
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        console.log('[ImageDownload] Base64 conversion completed successfully');
                        resolve(reader.result);
                    };
                    reader.onerror = () => {
                        reject(new Error('FileReader error: ' + reader.error));
                    };
                    reader.readAsDataURL(blob);
                });

                return base64;

            } catch (error) {
                lastError = error;
                console.error(`[ImageDownload] Attempt ${attempt}/${retries} failed:`, error.message);

                // If not the last attempt, wait before retrying
                if (attempt < retries) {
                    const waitTime = attempt * 1000; // Exponential backoff
                    console.log(`[ImageDownload] Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // All retries failed
        console.error('[ImageDownload] All retry attempts failed. Last error:', lastError);
        throw new Error(`画像のダウンロードに失敗しました（${retries}回試行）: ${lastError.message}`);
    }

    /**
     * Get transformation status
     */
    getStatus() {
        return {
            isTransforming: this.isTransforming,
            currentId: this.currentTransformationId
        };
    }

    /**
     * Cancel current transformation
     */
    cancelTransformation() {
        if (this.isTransforming) {
            this.isTransforming = false;
            this.currentTransformationId = null;
            this.hideProgress();
            return true;
        }
        return false;
    }
}

// Initialize transformation service
const transformationService = new TransformationService();