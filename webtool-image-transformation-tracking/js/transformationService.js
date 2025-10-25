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
            // Show progress
            this.showProgress(0, '変換を開始しています...');

            // For demo, we'll generate placeholder images
            // Check which API to use based on model
            let results;
            if (model.startsWith('replicate/')) {
                results = await this.transformWithReplicate(sourceImage, prompt, count, model);
            } else {
                results = await this.simulateTransformation(sourceImage, prompt, count, model);
            }
            
            /* Production code would be:
            const results = [];
            
            for (let i = 0; i < count; i++) {
                this.showProgress((i / count) * 100, `画像 ${i + 1}/${count} を生成中...`);
                
                const response = await fetch('/api/image/generation', {
                    method: 'POST',
                    headers: config.getApiHeaders(),
                    body: JSON.stringify({
                        query: prompt,
                        image_urls: [sourceImage],
                        model: model,
                        aspect_ratio: '1:1',
                        task_summary: 'Image transformation based on prompt'
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                results.push({
                    id: `result_${Date.now()}_${i}`,
                    url: data.url,
                    prompt: prompt,
                    model: model,
                    createdAt: new Date().toISOString()
                });
            }
            */

            this.showProgress(100, '変換完了！');
            
            // Hide progress after a moment
            setTimeout(() => this.hideProgress(), 1000);

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
        // Validate API key
        const apiKey = config.get('replicateApiKey');
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('Replicate APIキーが設定されていません。設定画面からAPIキーを入力してください。');
        }
        
        // Get settings
        const aspectRatio = options.aspectRatio || config.get('aspectRatio') || '1:1';
        const outputFormat = options.outputFormat || config.get('outputFormat') || 'png';
        
        // Convert base64 images to blob URLs if needed
        const imageUrls = await Promise.all(
            sourceImages.map(img => this.prepareImageForApi(img))
        );
        
        try {
            this.showProgress(20, '画像を生成中...');
            
            // Call Replicate Nano Banana API
            const apiUrl = config.get('apiEndpoint').replicateNanoBanana;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'wait'
                },
                body: JSON.stringify({
                    input: {
                        prompt: prompt,
                        image_input: imageUrls,
                        aspect_ratio: aspectRatio,
                        output_format: outputFormat
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Replicate APIエラー: ${response.status} - ${errorData.detail || response.statusText}`);
            }
            
            this.showProgress(80, '画像を処理中...');
            
            const result = await response.json();
            
            // Extract output image(s)
            let outputImages = [];
            if (result.output) {
                if (Array.isArray(result.output)) {
                    outputImages = result.output;
                } else if (typeof result.output === 'string') {
                    outputImages = [result.output];
                }
            }
            
            // Convert output to proper format
            const results = await Promise.all(
                outputImages.map(async (url, index) => {
                    // Download and convert to base64 if needed
                    const base64Image = await this.urlToBase64(url);
                    return {
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
                            predictionId: result.id
                        }
                    };
                })
            );
            
            return results;
            
        } catch (error) {
            console.error('Nano Banana API呼び出しエラー:', error);
            throw error;
        }
    }
    
    /**
     * Transform with Replicate API (Legacy)
     */
    async transformWithReplicate(sourceImage, prompt, count, model) {
        // For Nano Banana, use the new method
        if (model === 'google/nano-banana' || model.includes('nano-banana')) {
            const images = Array.isArray(sourceImage) ? sourceImage : [sourceImage];
            return await this.transformWithNanoBanana(images, prompt, { count });
        }
        
        // Legacy simulation for other models
        const results = [];
        const modelName = model.replace('replicate/', '');
        
        for (let i = 0; i < count; i++) {
            this.showProgress((i / count) * 100, `画像 ${i + 1}/${count} を生成中...`);
            
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                results.push({
                    id: `result_${Date.now()}_${i}`,
                    url: this.createFilteredImage(sourceImage, `hue-rotate(${i * 60}deg)`),
                    prompt: prompt,
                    model: model,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        api: 'replicate',
                        modelName: modelName
                    }
                });
            } catch (error) {
                console.error(`Failed to generate image ${i + 1}:`, error);
            }
        }
        
        return results;
    }
    
    /**
     * Simulate transformation for demo
     */
    async simulateTransformation(sourceImage, prompt, count, model) {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            this.showProgress((i / count) * 100, `画像 ${i + 1}/${count} を生成中...`);
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate placeholder with different styles
            const styles = [
                'grayscale(100%) contrast(1.2)',
                'sepia(100%) saturate(2)',
                'hue-rotate(90deg) saturate(1.5)',
                'contrast(1.5) brightness(1.2)',
                'invert(100%) hue-rotate(180deg)'
            ];
            
            results.push({
                id: `result_${Date.now()}_${i}`,
                url: this.createFilteredImage(sourceImage, styles[i % styles.length]),
                prompt: prompt,
                model: model,
                createdAt: new Date().toISOString(),
                metadata: {
                    style: styles[i % styles.length],
                    simulated: true
                }
            });
        }
        
        return results;
    }

    /**
     * Create filtered image for demo
     */
    createFilteredImage(sourceImage, filter) {
        // In a real implementation, this would apply actual filters
        // For demo, we'll return the source with CSS filters applied via data attribute
        return `${sourceImage}#filter=${encodeURIComponent(filter)}`;
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
        try {
            // This would call an upscaling API
            const response = await this.simulateUpscale(imageUrl, scale);
            return response;
        } catch (error) {
            console.error('Upscaling failed:', error);
            throw error;
        }
    }

    /**
     * Simulate upscale for demo
     */
    async simulateUpscale(imageUrl, scale) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            url: imageUrl,
            scale: scale,
            originalUrl: imageUrl,
            upscaledAt: new Date().toISOString()
        };
    }

    /**
     * Remove background
     */
    async removeBackground(imageUrl) {
        try {
            // This would call a background removal API
            const response = await this.simulateBackgroundRemoval(imageUrl);
            return response;
        } catch (error) {
            console.error('Background removal failed:', error);
            throw error;
        }
    }

    /**
     * Simulate background removal for demo
     */
    async simulateBackgroundRemoval(imageUrl) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            url: imageUrl,
            originalUrl: imageUrl,
            processedAt: new Date().toISOString()
        };
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
     * Convert URL to base64
     */
    async urlToBase64(imageUrl) {
        try {
            // If already base64, return as is
            if (imageUrl.startsWith('data:')) {
                return imageUrl;
            }
            
            // Fetch image
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            // Convert to blob
            const blob = await response.blob();
            
            // Convert to base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting URL to base64:', error);
            // If conversion fails, return original URL
            return imageUrl;
        }
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