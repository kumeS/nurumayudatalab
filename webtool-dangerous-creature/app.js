/**
 * AI危険生物辞典 JavaScript
 * LLMを活用した危険生物検索ツール with Replicate API画像生成
 * 統合版 - 全機能を含む
 * 
 * 更新内容：
 * - アスペクト比をデフォルト1:1に変更
 * - 画像サイズ・アスペクト比調整機能を追加
 * - SDXL Lightning: width/height指定可能（512-1280px）
 * - Minimax Image-01: aspect_ratio指定可能（1:1, 3:4, 4:3, 9:16, 16:9）
 */

// Replicate API画像生成用クライアント
class ReplicateImageClient {
  constructor(workerUrl = 'https://nurumayu-replicate-api.skume-bioinfo.workers.dev/') {
    this.workerUrl = workerUrl;
  }

  // SDXL Lightning 4-step による高速画像生成（1:1アスペクト比対応）
  async generateImageSDXL(prompt, options = {}) {
    const apiUrl = 'https://api.replicate.com/v1/predictions';
    const payload = {
      version: "6f7a773af6fc3e8de9d5a3c00be77c17308914bf67772726aff83496ba1e3bbe",
      input: {
        prompt: prompt,
        width: options.width || 1024,
        height: options.height || 1024,
        scheduler: options.scheduler || "K_EULER",
        num_inference_steps: options.steps || 4,
        guidance_scale: options.guidance || 0,
        negative_prompt: options.negativePrompt || ""
      }
    };

    return this.callReplicateAPI(apiUrl, payload);
  }

  // Minimax Image-01 による高品質画像生成
  async generateImageMinimax(prompt, options = {}) {
    const apiUrl = 'https://api.replicate.com/v1/models/minimax/image-01/predictions';
    const payload = {
      input: {
        prompt: prompt,
        aspect_ratio: options.aspectRatio || "1:1"
      }
    };

    return this.callReplicateAPI(apiUrl, payload);
  }

  // Recraft v3 による高品質画像生成（1回のみ制限）
  async generateImageRecraft(prompt, options = {}) {
    const apiUrl = 'https://api.replicate.com/v1/models/recraft-ai/recraft-v3/predictions';
    const payload = {
      input: {
        prompt: prompt,
        size: options.size || "1024x1024"
      }
    };

    return this.callReplicateAPI(apiUrl, payload);
  }

  // Google Imagen 4 Fast による高速画像生成（3回制限）
  async generateImageImagen(prompt, options = {}) {
    const apiUrl = 'https://api.replicate.com/v1/models/google/imagen-4-fast/predictions';
    const payload = {
      input: {
        prompt: prompt,
        aspect_ratio: options.aspectRatio || "1:1"
      }
    };

    return this.callReplicateAPI(apiUrl, payload);
  }

  // 汎用Replicate API呼び出し
  async callReplicateAPI(apiUrl, payload) {
    const requestId = Math.random().toString(36).substring(2);
    const startTime = performance.now();
    
    const requestData = {
      apiUrl: apiUrl,
      payload: payload
    };

    // モデル別のタイムアウト設定
    const isMinimaxModel = apiUrl.includes('minimax/image-01');
    const isRecraftModel = apiUrl.includes('recraft-ai/recraft-v3');
    const isImagenModel = apiUrl.includes('google/imagen-4-fast');
    
    let timeoutMs = 60000; // デフォルト60秒
    if (isMinimaxModel) {
      timeoutMs = 120000; // Minimax: 120秒
    } else if (isRecraftModel) {
      timeoutMs = 90000; // Recraft: 90秒
    } else if (isImagenModel) {
      timeoutMs = 60000; // Imagen: 60秒
    }
    
    // AbortControllerでタイムアウトを実装
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(this.workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      // タイムアウトをクリア（成功時）
      clearTimeout(timeoutId);

      const duration = Math.round(performance.now() - startTime);
      


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        

        
        throw new Error(`Worker API呼び出しに失敗: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      

      
      if (data.error) {

        throw new Error(`Replicate API エラー: ${JSON.stringify(data.details || data.error)}`);
      }


      
      return data;
    } catch (error) {
      // タイムアウトをクリア（エラー時）
      clearTimeout(timeoutId);

      const duration = Math.round(performance.now() - startTime);
      
      // タイムアウトエラーの場合、分かりやすいメッセージに変換
      if (error.name === 'AbortError') {
        const timeoutSeconds = Math.round(timeoutMs / 1000);
        let modelName = 'SDXL Lightning';
        if (isMinimaxModel) {
          modelName = 'Minimax Image-01';
        } else if (isRecraftModel) {
          modelName = 'Recraft v3';
        } else if (isImagenModel) {
          modelName = 'Google Imagen 4 Fast';
        }
        throw new Error(`画像生成がタイムアウトしました（${timeoutSeconds}秒経過）。${modelName}は時間がかかる場合があります。Cloudflare Workersの制限も原因の可能性があります。`);
      }

      
      throw error;
    }
  }
}

// プロンプト最適化用のLLM呼び出し関数
async function optimizeImagePrompt(draftPrompt, workerUrl) {
  const sanitizedPrompt = sanitizeInput(draftPrompt);
  
  return await retryWithExponentialBackoff(async () => {
    return await optimizeImagePromptInternal(sanitizedPrompt, workerUrl);
  }, 2, 1500);
}

// 内部プロンプト最適化関数
async function optimizeImagePromptInternal(draftPrompt, workerUrl) {
  const startTime = performance.now();
  const optimizationId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  

  
  const optimizationPrompt = `You are an expert at optimizing prompts for image generation AI (Stable Diffusion, DALL-E, Midjourney).

Optimize the given draft prompt following these rules:

CRITICAL REQUIREMENTS:
- Keep ALL style information (traditional, anime, realistic)
- Keep ALL dangerous/creature specific features and characteristics
- Convert Japanese text to natural English
- Enhance visual details (colors, shapes, textures, lighting)
- Add quality keywords: "high resolution", "detailed", "masterpiece"

OUTPUT FORMAT: Return ONLY the optimized prompt, no explanations.

DRAFT PROMPT:
${draftPrompt}`;

  try {
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.7,
      stream: false,
      max_completion_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: optimizationPrompt
        }
      ]
    };



    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const duration = Math.round(performance.now() - startTime);

    if (!response.ok) {

      throw new Error(`プロンプト最適化API呼び出しに失敗: ${response.status}`);
    }

    const data = await response.json();
    

    
    // 複数のレスポンス形式に対応した柔軟な解析
    let responseText = null;
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      responseText = data.choices[0].message.content;

    } else if (data.answer) {
      responseText = data.answer;
      
    } else if (data.result && data.result.response) {
      responseText = data.result.response;
      
    } else if (data.response) {
      responseText = data.response;
      
    } else if (typeof data === 'string') {
      responseText = data;
      
    } else {
      
      throw new Error('プロンプト最適化レスポンスに有効なテキストコンテンツが見つかりません');
    }
    
    if (responseText) {
      const optimizedText = responseText.trim();
      

      
      // 最適化成功の検証
      const hasJapanese = containsJapanese(optimizedText);
      const actuallyOptimized = optimizedText !== draftPrompt;
      
      // 最適化の品質チェック
      const isEmptyOrTooShort = optimizedText.length < 50;
      const isSystemMessage = optimizedText.toLowerCase().includes('i cannot') || 
                             optimizedText.toLowerCase().includes('i am unable') ||
                             optimizedText.toLowerCase().includes('i apologize');
      
      if (isEmptyOrTooShort || isSystemMessage) {

        throw new Error('最適化結果が無効です');
      }
      
      
      
      // 日本語が残っている場合は手動フォールバック翻訳を適用
      if (hasJapanese) {

        const manualTranslated = translateFeaturesToEnglish(optimizedText);
        // 翻訳後も句読点をクリーンアップ
        const cleanedManualTranslated = manualTranslated
          .replace(/[。、；：]/g, ' ') // 日本語句読点を除去
          .replace(/\s+/g, ' ') // 連続スペース除去
          .trim();
        return cleanedManualTranslated;
      }
      
      // 日本語句読点が残っている場合は除去
      let finalOptimizedText = optimizedText
        .replace(/[。、；：]/g, ' ') // 日本語句読点を除去
        .replace(/\s+/g, ' ') // 連続スペース除去
        .trim();
      
      // スタイル情報の強度をチェック
      const styleKeywords = extractStyleFromDraft(draftPrompt);
      if (styleKeywords.style) {
        const optimizedStyleStrength = checkStyleStrength(finalOptimizedText, styleKeywords.style);
        

        
        // スタイル強度が低い場合（50%未満）、スタイル情報を補強
        if (optimizedStyleStrength.percentage < 50) {
          const enhancedPrompt = enhanceStyleInPrompt(finalOptimizedText, styleKeywords.style);
          
          return enhancedPrompt;
        }
      }
      
      return finalOptimizedText;
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    

    
    // フォールバック：日本語含有チェックとクリーンアップ
    if (containsJapanese(draftPrompt)) {

      
      // 手動翻訳機能を使用して日本語を英語に変換
      const translatedPrompt = translateFeaturesToEnglish(draftPrompt);
      
      // 翻訳後も日本語が残っている場合は機械的除去
      let cleanPrompt = translatedPrompt;
      if (containsJapanese(translatedPrompt)) {
        cleanPrompt = translatedPrompt
          .replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ') // 日本語文字除去
          .replace(/[。、；：]/g, ' ') // 日本語句読点除去
          .replace(/\s+/g, ' ') // 連続スペース除去
          .trim();
      }
      
      // 英語プロンプトでも日本語句読点をチェック・除去
      cleanPrompt = cleanPrompt
        .replace(/[。、；：]/g, ' ') // 日本語句読点を完全除去
        .replace(/\s+/g, ' ') // 連続スペース除去
        .trim();
      
      // 空になった場合は元のドラフトプロンプトベースの基本的な英語プロンプトを生成
      if (!cleanPrompt || cleanPrompt.length < 20) {
        // ドラフトプロンプトから重要なキーワードを抽出して基本プロンプトを構築
        const styleMatch = draftPrompt.match(/(traditional|anime|realistic)/i);
        const style = styleMatch ? styleMatch[1].toLowerCase() : 'traditional';
        
        cleanPrompt = `A detailed dangerous creature illustration in ${style} scientific art style, high resolution, masterpiece quality, clean background, no text`;

      }
      
      return cleanPrompt;
    }
    
    // 日本語が含まれていない場合は元のプロンプトを返す
    return draftPrompt;
  }
}

// ローカルストレージ管理クラス
class dangerousImageStorage {
  constructor() {
    this.storageKey = 'dangerousDictionary_savedImages';
    this.maxItems = 50; // 最大保存件数
    this.maxSizePerImage = 5 * 1024 * 1024; // 5MB per image
  }

  // 画像をローカルストレージに保存
  async saveImage(imageData) {
    try {
      const savedImages = this.getSavedImages();
      
      // 画像データをBase64に変換
      const base64Data = await this.convertImageToBase64(imageData.imageUrl);
      
      if (!base64Data) {
        console.warn('🗂️ 画像のBase64変換に失敗しました');
        return false;
      }

      // データサイズチェック
      if (base64Data.length > this.maxSizePerImage) {
        console.warn('🗂️ 画像サイズが大きすぎます（5MB制限）');
        return false;
      }

      const newImageData = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        dangerousName: imageData.dangerousName || 'Unknown dangerous',
        scientificName: imageData.scientificName || '',
        commonName: imageData.commonName || '',
        imageUrl: imageData.imageUrl,
        base64Data: base64Data,
        prompt: imageData.prompt || '',
        style: imageData.style || 'traditional',
        model: imageData.model || '',
        confidence: imageData.confidence || 0
      };

      savedImages.unshift(newImageData);

      // 最大件数を超えた場合、古いものを削除
      if (savedImages.length > this.maxItems) {
        savedImages.splice(this.maxItems);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(savedImages));
      return true;
    } catch (error) {
      console.error('🗂️ 画像保存エラー:', error);
      return false;
    }
  }

  // 画像URLをBase64に変換
  async convertImageToBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('🗂️ Base64変換エラー:', error);
      return null;
    }
  }

  // 保存された画像一覧を取得
  getSavedImages() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('🗂️ 保存画像取得エラー:', error);
      return [];
    }
  }

  // 特定の画像を削除
  deleteImage(imageId) {
    try {
      const savedImages = this.getSavedImages();
      const filtered = savedImages.filter(img => img.id !== imageId);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('🗂️ 画像削除エラー:', error);
      return false;
    }
  }

  // 全ての保存画像を削除
  clearAllImages() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('🗂️ 全削除エラー:', error);
      return false;
    }
  }

  // ストレージ使用量を取得
  getStorageInfo() {
    const savedImages = this.getSavedImages();
    const totalSize = JSON.stringify(savedImages).length;
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    return {
      totalImages: savedImages.length,
      totalSize: totalSize,
      totalSizeMB: totalSizeMB,
      maxItems: this.maxItems
    };
  }
}

// 危険生物画像生成専用の便利関数
async function generatedangerousImage(dangerousInfo, style = 'traditional', workerUrl, model = 'minimax', imageOptions = {}) {
  const startTime = performance.now();
  const sessionId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  
  const client = new ReplicateImageClient(workerUrl);
  
  // ドラフトプロンプト作成（シードも考慮）
  const seed = imageOptions.seed;
  const draftPrompt = createdangerousImagePrompt(dangerousInfo, style, seed);
  
      // LLMでプロンプトを最適化（危険生物検索と同じWorkerを使用）
  const llmWorkerUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  const optimizedPrompt = await optimizeImagePrompt(draftPrompt, llmWorkerUrl);
  
  // プロンプト最適化の品質検証
  const hasJapanese = containsJapanese(optimizedPrompt);
  const wasActuallyOptimized = optimizedPrompt !== draftPrompt && !hasJapanese;
  const styleStrength = checkStyleStrength(optimizedPrompt, style);
  
  // プロンプト最適化完了のコールバック実行
  if (imageOptions.onOptimizationComplete) {
    imageOptions.onOptimizationComplete(optimizedPrompt);
  }
  
  try {
    let result;
    
    if (model === 'sdxl-lightning') {
      // SDXL Lightning使用（サイズ指定可能）
      const sdxlOptions = {
        width: imageOptions.width || 1024,
        height: imageOptions.height || 1024,
        scheduler: imageOptions.scheduler || "K_EULER",
        steps: imageOptions.steps || 4,
        guidance: imageOptions.guidance || 0,
        negativePrompt: imageOptions.negativePrompt || "text, words, letters, writing, watermark, signature, labels, captions, annotations, typography, symbols, numbers",
        seed: imageOptions.seed // シードを追加
      };
      result = await client.generateImageSDXL(optimizedPrompt, sdxlOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        const imageResult = {
          success: true,
          imageUrl: result.output[0],
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'bytedance/sdxl-lightning-4step',
          options: sdxlOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
      } else if (result.output) {
        const imageResult = {
          success: true,
          imageUrl: result.output,
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'bytedance/sdxl-lightning-4step',
          options: sdxlOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
        } else {
        throw new Error('画像URLが返されませんでした');
      }
  } else if (model === 'recraft-v3') {
      // Recraft v3使用 - サイズ指定可能
      const recraftOptions = {
        size: imageOptions.size || "1024x1024",
        seed: imageOptions.seed
      };
      result = await client.generateImageRecraft(optimizedPrompt, recraftOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        const imageResult = {
          success: true,
          imageUrl: result.output[0],
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'recraft-ai/recraft-v3',
          options: recraftOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
      } else if (result.output) {
        const imageResult = {
          success: true,
          imageUrl: result.output,
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'recraft-ai/recraft-v3',
          options: recraftOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
      } else {
        throw new Error('画像URLが返されませんでした');
      }
    } else if (model === 'imagen-4-fast') {
      // Google Imagen 4 Fast使用 - アスペクト比指定可能
      const imagenOptions = {
        aspectRatio: imageOptions.aspectRatio || "1:1",
        seed: imageOptions.seed
      };
      result = await client.generateImageImagen(optimizedPrompt, imagenOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        const imageResult = {
          success: true,
          imageUrl: result.output[0],
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'google/imagen-4-fast',
          options: imagenOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
      } else if (result.output) {
        const imageResult = {
          success: true,
          imageUrl: result.output,
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'google/imagen-4-fast',
          options: imagenOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
      } else {
        throw new Error('画像URLが返されませんでした');
      }
    } else {
      // Minimax使用（デフォルト）- アスペクト比指定可能
      const minimaxOptions = {
        aspectRatio: imageOptions.aspectRatio || "1:1",
        seed: imageOptions.seed, // シードを追加
        negative_prompt: imageOptions.negativePrompt || "text, words, letters, writing, watermark, signature, labels, captions, annotations, typography, symbols, numbers"
      };
      result = await client.generateImageMinimax(optimizedPrompt, minimaxOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        const imageResult = {
          success: true,
          imageUrl: result.output[0],
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'minimax/image-01',
          options: minimaxOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
      } else if (result.output) {
        const imageResult = {
          success: true,
          imageUrl: result.output,
          prompt: optimizedPrompt,
          draftPrompt: draftPrompt,
          wasActuallyOptimized: wasActuallyOptimized,
          hasJapanese: hasJapanese,
          styleStrength: styleStrength.percentage,
          model: 'minimax/image-01',
          options: minimaxOptions
        };
        
        // 自動保存
        await saveImageToStorage(imageResult, dangerousInfo, style);
        
        return imageResult;
        } else {
        throw new Error('画像URLが返されませんでした');
      }
    }
  } catch (error) {
    const totalDuration = Math.round(performance.now() - startTime);
    
    // エラーメッセージを短く分かりやすく変換
    let shortErrorMessage = 'サーバーエラー';
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('worker api呼び出しに失敗')) {
      shortErrorMessage = 'API接続エラー';
    } else if (errorMsg.includes('replicate api エラー')) {
      shortErrorMessage = 'Replicate APIエラー';
    } else if (errorMsg.includes('画像生成がタイムアウトしました')) {
      if (errorMsg.includes('cloudflare workers')) {
        shortErrorMessage = 'タイムアウト（Cloudflare制限）';
      } else {
        shortErrorMessage = 'タイムアウト（120秒経過）';
      }
    } else if (errorMsg.includes('timeout') || errorMsg.includes('タイムアウト')) {
      shortErrorMessage = 'タイムアウト';
    } else if (errorMsg.includes('network')) {
      shortErrorMessage = 'ネットワークエラー';
    } else if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
      shortErrorMessage = 'API制限に達しました';
    } else if (errorMsg.includes('invalid')) {
      shortErrorMessage = '無効なリクエスト';
    } else if (errorMsg.includes('unauthorized')) {
      shortErrorMessage = 'API認証エラー';
    }
    
    return {
      success: false,
      error: shortErrorMessage,
      fullError: error.message,
      prompt: optimizedPrompt || draftPrompt,
      draftPrompt: draftPrompt,
      wasActuallyOptimized: false, // エラー時は最適化失敗とみなす
      hasJapanese: containsJapanese(optimizedPrompt || draftPrompt),
      styleStrength: 0, // エラー時はスタイル強度0
      sessionId: sessionId,
      duration: totalDuration
    };
  }
}

// 画像をストレージに保存するヘルパー関数
async function saveImageToStorage(imageResult, dangerousInfo, style) {
  const startTime = performance.now();
  
  try {
    const storage = new dangerousImageStorage();
    const saveData = {
      imageUrl: imageResult.imageUrl,
      dangerousName: dangerousInfo.commonName || dangerousInfo.scientificName,
      scientificName: dangerousInfo.scientificName,
      commonName: dangerousInfo.commonName,
      prompt: imageResult.prompt,
      style: style,
      model: imageResult.model,
      confidence: dangerousInfo.confidence
    };
    
    const saved = await storage.saveImage(saveData);
    const duration = Math.round(performance.now() - startTime);
    
    if (saved) {
    } else {
      console.warn('🗂️ [STORAGE_FAILED] Image Storage Failed (Unknown Reason):', {
        timestamp: new Date().toISOString(),
        dangerousName: saveData.dangerousName,
        duration: duration
      });
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.error('🗂️ [STORAGE_ERROR] Image Storage Exception:', {
      timestamp: new Date().toISOString(),
      dangerousName: dangerousInfo.commonName || dangerousInfo.scientificName,
      duration: duration,
      errorName: error.name,
      errorMessage: error.message
    });
  }
}

// 危険生物画像プロンプト作成
function createdangerousImagePrompt(dangerousInfo, style, seed = null) {
  // 架空の危険生物かどうかを判定（学名に架空の特徴があるかチェック）
  const isFictional = dangerousInfo.scientificName && (
    dangerousInfo.scientificName.includes('Prisma') ||
    dangerousInfo.scientificName.includes('Crystallinus') ||
    dangerousInfo.scientificName.includes('Umbra') ||
    dangerousInfo.scientificName.includes('Neon') ||
    dangerousInfo.scientificName.includes('Phantasma') ||
    dangerousInfo.scientificName.includes('Lumina') ||
    dangerousInfo.scientificName.includes('Spectra') ||
    dangerousInfo.scientificName.includes('Mysticus') ||
    dangerousInfo.scientificName.includes('Fictus') ||
    dangerousInfo.scientificName.includes('Imaginarius') ||
    // 架空生物の一般的な特徴
    /^[A-Z][a-z]+ (veneficus|mortalis|phantasma|luminosa|crystallinus|mysticus|fictus)/.test(dangerousInfo.scientificName)
  );
  
  // 危険生物固有のハッシュを作成（学名と一般名から）
  const dangerousHash = (dangerousInfo.scientificName + (dangerousInfo.commonName || '')).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // シードと危険生物ハッシュを組み合わせてより多様なバリエーションを作成
  const combinedSeed = seed ? (seed + Math.abs(dangerousHash)) : Math.abs(dangerousHash);
  
  // スタイル別のベースプロンプトバリエーション（スタイル強調）
  let styleVariations = [];
  switch (style) {
    case 'traditional':
      if (isFictional) {
        styleVariations = [
          `A highly detailed fantasy creature illustration of ${dangerousInfo.scientificName}`,
          `A traditional fantasy bestiary drawing of ${dangerousInfo.scientificName}`,
          `A detailed fictional creature plate depicting ${dangerousInfo.scientificName}`,
          `A classical fantasy biological illustration of ${dangerousInfo.scientificName}`,
          `A traditional fictional encyclopedia drawing of ${dangerousInfo.scientificName}`,
          `An antique fantasy creature artwork of ${dangerousInfo.scientificName}`,
          `A historical fictional creature documentation of ${dangerousInfo.scientificName}`,
          `A traditional fantasy bestiary illustration of ${dangerousInfo.scientificName}`,
          `A detailed fictional creature study showing ${dangerousInfo.scientificName}`,
          `A vintage fantasy creature drawing of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `A highly detailed scientific illustration of ${dangerousInfo.scientificName}`,
          `A traditional naturalist drawing of ${dangerousInfo.scientificName}`,
          `A detailed scientific plate depicting ${dangerousInfo.scientificName}`,
          `A classical biological illustration of ${dangerousInfo.scientificName}`,
          `A traditional scientific encyclopedia drawing of ${dangerousInfo.scientificName}`,
          `An antique natural history artwork of ${dangerousInfo.scientificName}`,
          `A historical scientific documentation of ${dangerousInfo.scientificName}`,
          `A traditional botanical/zoological illustration of ${dangerousInfo.scientificName}`,
          `A detailed scientific bestiary plate showing ${dangerousInfo.scientificName}`,
          `A vintage natural history drawing of ${dangerousInfo.scientificName}`
        ];
      }
      break;
    case 'anime':
      if (isFictional) {
        styleVariations = [
          `An anime-style fantasy creature illustration of ${dangerousInfo.scientificName}`,
          `A manga-inspired fictional beast artwork featuring ${dangerousInfo.scientificName}`,
          `A traditional anime fantasy drawing of ${dangerousInfo.scientificName}`,
          `A classic Japanese anime fictional creature illustration of ${dangerousInfo.scientificName}`,
          `An anime-style fantasy monster artwork of ${dangerousInfo.scientificName}`,
          `A vintage anime-style fictional creature drawing of ${dangerousInfo.scientificName}`,
          `A traditional anime fantasy art depicting ${dangerousInfo.scientificName}`,
          `A classic anime fantasy creature illustration of ${dangerousInfo.scientificName}`,
          `A retro anime fictional beast artwork of ${dangerousInfo.scientificName}`,
          `A traditional manga-style fantasy creature drawing of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `An anime-style creature illustration of ${dangerousInfo.scientificName}`,
          `A manga-inspired artwork featuring ${dangerousInfo.scientificName}`,
          `A traditional anime drawing of ${dangerousInfo.scientificName}`,
          `A classic Japanese anime illustration of ${dangerousInfo.scientificName}`,
          `An anime-style tribute artwork of ${dangerousInfo.scientificName}`,
          `A vintage anime-style drawing of ${dangerousInfo.scientificName}`,
          `A traditional anime art depicting ${dangerousInfo.scientificName}`,
          `A classic anime animation illustration of ${dangerousInfo.scientificName}`,
          `A retro anime artwork of ${dangerousInfo.scientificName}`,
          `A traditional manga-style drawing of ${dangerousInfo.scientificName}`
        ];
      }
      break;
    case 'realistic':
      if (isFictional) {
        styleVariations = [
          `A photorealistic depiction of fictional creature ${dangerousInfo.scientificName}`,
          `A hyper-realistic fantasy creature image of ${dangerousInfo.scientificName}`,
          `A high-resolution realistic fantasy photograph of ${dangerousInfo.scientificName}`,
          `A detailed photographic-style fictional creature documentation of ${dangerousInfo.scientificName}`,
          `A professional realistic fantasy creature photography of ${dangerousInfo.scientificName}`,
          `A lifelike fictional creature specimen photograph of ${dangerousInfo.scientificName}`,
          `A crystal-clear realistic fantasy image of ${dangerousInfo.scientificName}`,
          `A realistic fictional creature photography of ${dangerousInfo.scientificName}`,
          `An ultra-detailed realistic fantasy creature photo of ${dangerousInfo.scientificName}`,
          `A high-definition realistic fantasy creature photograph of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `A photorealistic depiction of ${dangerousInfo.scientificName}`,
          `A hyper-realistic biological creature image of ${dangerousInfo.scientificName}`,
          `A high-resolution realistic photograph of ${dangerousInfo.scientificName}`,
          `A detailed photographic-style documentation of ${dangerousInfo.scientificName}`,
          `A professional realistic nature photography of ${dangerousInfo.scientificName}`,
          `A lifelike biological specimen photograph of ${dangerousInfo.scientificName}`,
          `A crystal-clear realistic image of ${dangerousInfo.scientificName}`,
          `A realistic creature photography of ${dangerousInfo.scientificName}`,
          `An ultra-detailed realistic biological photo of ${dangerousInfo.scientificName}`,
          `A high-definition realistic nature photograph of ${dangerousInfo.scientificName}`
        ];
      }
      break;
    default:
      if (isFictional) {
        styleVariations = [
          `A detailed image of fictional creature ${dangerousInfo.scientificName}`,
          `A beautiful depiction of fantasy creature ${dangerousInfo.scientificName}`,
          `An artistic rendering of fictional beast ${dangerousInfo.scientificName}`,
          `A fantasy creature study of ${dangerousInfo.scientificName}`,
          `A detailed fictional creature portrait of ${dangerousInfo.scientificName}`,
          `A fantasy creature documentation of ${dangerousInfo.scientificName}`,
          `A fantasy visualization of ${dangerousInfo.scientificName}`,
          `A fictional creature image of ${dangerousInfo.scientificName}`,
          `A detailed fantasy creature view of ${dangerousInfo.scientificName}`,
          `A fantasy bestiary illustration of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `A detailed image of ${dangerousInfo.scientificName}`,
          `A beautiful depiction of ${dangerousInfo.scientificName}`,
          `An artistic rendering of ${dangerousInfo.scientificName}`,
          `A biological study of ${dangerousInfo.scientificName}`,
          `A detailed creature portrait of ${dangerousInfo.scientificName}`,
          `A scientific documentation of ${dangerousInfo.scientificName}`,
          `A natural visualization of ${dangerousInfo.scientificName}`,
          `A biological creature image of ${dangerousInfo.scientificName}`,
          `A detailed nature view of ${dangerousInfo.scientificName}`,
          `A natural history illustration of ${dangerousInfo.scientificName}`
        ];
      }
  }
  
  // 組み合わせシードを使ってバリエーションを選択
  const variationIndex = combinedSeed % styleVariations.length;
  let basePrompt = styleVariations[variationIndex];
  
  // 一般名があれば追加
  if (dangerousInfo.commonName) {
    basePrompt += ` (commonly known as ${dangerousInfo.commonName})`;
  }

  // スタイル別の危険生物特徴表現
  let featuresPrompt = '';
  
  // 総合的な特徴説明
  if (dangerousInfo.features) {
    const translatedFeatures = translateFeaturesToEnglish(dangerousInfo.features);
    switch (style) {
      case 'traditional':
        featuresPrompt = `, scientifically showcasing ${translatedFeatures}`;
        break;
      case 'anime':
        featuresPrompt = `, beautifully displaying ${translatedFeatures} with stylized enhancement`;
        break;
      case 'realistic':
        featuresPrompt = `, realistically capturing ${translatedFeatures} in natural detail`;
        break;
      default:
        featuresPrompt = `, featuring ${translatedFeatures}`;
    }
  }
  
  // 3つの個別特徴を詳細に追加
  const specificFeatures = [];
  if (dangerousInfo.feature1) {
    const morphological = translateFeaturesToEnglish(dangerousInfo.feature1);
    switch (style) {
      case 'traditional':
        specificFeatures.push(`precise morphological documentation: ${morphological}`);
        break;
      case 'anime':
        specificFeatures.push(`stylized visual characteristics: ${morphological}`);
        break;
      case 'realistic':
        specificFeatures.push(`detailed morphological structures: ${morphological}`);
        break;
      default:
        specificFeatures.push(`morphological characteristics: ${morphological}`);
    }
  }
  if (dangerousInfo.feature2) {
    const ecological = translateFeaturesToEnglish(dangerousInfo.feature2);
    switch (style) {
      case 'traditional':
        specificFeatures.push(`documented ecological adaptations: ${ecological}`);
        break;
      case 'anime':
        specificFeatures.push(`stylized behavioral features: ${ecological}`);
        break;
      case 'realistic':
        specificFeatures.push(`natural ecological traits: ${ecological}`);
        break;
      default:
        specificFeatures.push(`ecological traits: ${ecological}`);
    }
  }
  if (dangerousInfo.feature3) {
    const distinctive = translateFeaturesToEnglish(dangerousInfo.feature3);
    switch (style) {
      case 'traditional':
        specificFeatures.push(`taxonomic distinguishing features: ${distinctive}`);
        break;
      case 'anime':
        specificFeatures.push(`distinctive visual qualities: ${distinctive}`);
        break;
      case 'realistic':
        specificFeatures.push(`distinctive identifying features: ${distinctive}`);
        break;
      default:
        specificFeatures.push(`distinctive features: ${distinctive}`);
    }
  }
  
  if (specificFeatures.length > 0) {
    featuresPrompt += `, with ${specificFeatures.join(', ')}`;
  }
  
  // 危険生物固有の識別子を追加（学名の一部を含める）
  const scientificParts = dangerousInfo.scientificName.split(' ');
  if (scientificParts.length >= 2) {
    featuresPrompt += `, characteristic of ${scientificParts[0]} genus ${scientificParts[1]} species`;
  }

  // スタイル別の生育環境表現
  let habitatPrompt = '';
  if (dangerousInfo.habitat) {
    const translatedHabitat = translateFeaturesToEnglish(dangerousInfo.habitat);
    switch (style) {
      case 'traditional':
        habitatPrompt = `, documented from natural habitat: ${translatedHabitat}`;
        break;
      case 'anime':
        habitatPrompt = `, flourishing in natural environment: ${translatedHabitat}`;
        break;
      case 'realistic':
        habitatPrompt = `, photographed in natural habitat: ${translatedHabitat}`;
        break;
      default:
        habitatPrompt = `, typically found in ${translatedHabitat}`;
    }
  }

  // スタイル別の季節情報表現
  let seasonPrompt = '';
  if (dangerousInfo.season) {
    const translatedSeason = translateFeaturesToEnglish(dangerousInfo.season);
    switch (style) {
      case 'traditional':
        seasonPrompt = `, seasonal observation: ${translatedSeason}`;
        break;
      case 'anime':
        seasonPrompt = `, in beautiful seasonal setting: ${translatedSeason}`;
        break;
      case 'realistic':
        seasonPrompt = `, captured during natural season: ${translatedSeason}`;
        break;
      default:
        seasonPrompt = `, ${translatedSeason}`;
    }
  }

  // スタイル別のライティング設定
  let lightingPrompt = '';
  switch (style) {
    case 'traditional':
              lightingPrompt = ', depicted with even, diffused lighting ideal for scientific illustration, clear visibility of all biological details, academic documentation standard';
      break;
    case 'anime':
      lightingPrompt = ', brightened with vibrant anime daylight, cheerful and colorful illumination, perfect cel-shading lighting with soft gradient backgrounds';
      break;
    case 'realistic':
      lightingPrompt = ', shot in optimal natural daylight with professional photography lighting, crystal clear macro details, perfect exposure and color reproduction';
      break;
    default:
              lightingPrompt = ', photographed in bright natural daylight with even illumination, clear visibility of all supernatural details, vibrant mystical colors';
  }

  // スタイルに応じたプロンプト（より具体的で危険生物に特化）
  let stylePrompt = '';
  switch (style) {
    case 'traditional':
      stylePrompt = `. A highly detailed traditional dangerous illustration in classical Edo period style. The image features fine ink outlines combined with delicate watercolor shading using traditional Japanese painting techniques. Each supernatural characteristic is rendered with folkloric accuracy, showing intricate details of supernatural features and mystical elements. The background is pure white, with no shadows or textures. The style is reminiscent of 18th to 19th century dangerous scrolls and demon encyclopedias, with precise, traditional aesthetics and clean composition. Pure visual dangerous art without any text or labels.`;
      break;
    case 'anime':
      stylePrompt = `. Illustrated in authentic Mizuki Shigeru art style with characteristic dangerous aesthetics and bold, distinctive colors typical of GeGeGe no Kitaro series. Clean vector-like outlines with precise lineart, supernatural color palettes typical of traditional dangerous manga aesthetics. The dangerous maintains folkloric accuracy while being stylized with traditional Japanese monster art charm and artistic flair. Features mystical backgrounds, supernatural lighting effects on creature features, and an appealing traditional dangerous manga visual style. Digital art finish with smooth textures and eerie lighting effects reminiscent of classic Japanese monster illustrations. Pure Japanese dangerous animation-style illustration without text or writing.`;
      break;
    case 'realistic':
      stylePrompt = `. Captured as a highly detailed, photorealistic supernatural creature image with documentary photography quality. Crystal clear focus showing minute details like supernatural textures, ethereal features, mystical characteristics, and otherworldly imperfections. Professional paranormal photography with excellent depth of field, supernatural color reproduction, and lifelike supernatural appearance. Include environmental context showing the dangerous's natural haunting conditions. Shot with high-end supernatural photography techniques. Clean paranormal photography without any text overlays or watermarks.`;
      break;
    default:
      stylePrompt = '. Beautifully rendered with accurate folkloric details, supernatural colors, excellent lighting, and clear definition of dangerous characteristics.';
  }

  // スタイル別の構図バリエーション
  let compositionPrompt = '';
  let compositions = [];
  
  switch (style) {
    case 'traditional':
      compositions = [
        ', centered traditional composition with full dangerous specimen view',
        ', detailed folkloric study focusing on supernatural characteristics',
        ', classical demon scroll layout showing dangerous anatomy',
        ', traditional documentation presentation with clear supernatural details',
        ', traditional dangerous encyclopedia illustration composition',
        ', folkloric documentation style with systematic arrangement',
        ', vintage dangerous scroll plate composition',
        ', methodical supernatural survey layout',
        ', traditional dangerous classification style arrangement',
        ', systematic folklore documentation presentation'
      ];
      break;
    case 'anime':
      compositions = [
        ', traditional centered composition with mystical dangerous presentation',
        ', anime close-up focusing on supernatural features with eerie effects',
        ', dynamic diagonal composition typical of dangerous manga panels',
        ', artistic traditional manga style with mysterious dangerous arrangement',
        ', Mizuki Shigeru inspired composition with folkloric flow',
        ', traditional dangerous scene with enchanting supernatural display',
        ', classic dangerous manga composition with distinctive creature art',
        ', manga-style supernatural illustration with traditional flair',
        ', anime dangerous art composition showing creature mystery',
        ', Japanese traditional dangerous animation style composition'
      ];
      break;
    case 'realistic':
      compositions = [
        ', professional paranormal photography composition with perfect focus',
        ', supernatural photography close-up with ethereal depth of field',
        ', award-winning cryptid photography layout',
        ', expert supernatural shot highlighting dangerous textures and details',
        ', professional paranormal documentary style composition',
        ', high-end supernatural photography with environmental context',
        ', paranormal photography masterpiece with crystal clear details',
        ', supernatural photographer\'s artistic composition',
        ', professional dangerous photography with perfect lighting',
        ', supernatural macro photography with folkloric accuracy'
      ];
      break;
    default:
      compositions = [
        ', centered composition with full dangerous view',
        ', close-up detail view focusing on supernatural features',
        ', diagonal composition showing dangerous structure',
        ', artistic angled view with mystical depth',
        ', side profile view highlighting dangerous silhouette',
        ', supernatural photography focusing on distinctive features',
        ', three-quarter view showing dangerous anatomy',
        ', overhead view displaying supernatural characteristics',
        ', low angle view emphasizing dangerous presence',
        ', natural haunting habitat composition'
      ];
  }
  
  // 組み合わせシードを使って構図を選択
  compositionPrompt = compositions[combinedSeed % compositions.length];

  // スタイル別の品質向上と仕上げ指示
  let qualityPrompt = '';
  let noTextPrompt = '';
  
  switch (style) {
    case 'traditional':
      qualityPrompt = ' High resolution, folkloric accurate dangerous details, precise supernatural anatomy, traditional quality, vintage dangerous encyclopedia masterpiece';
      noTextPrompt = ', completely clean dangerous illustration without any text, labels, watermarks, or written annotations, pure visual dangerous art';
      break;
    case 'anime':
      qualityPrompt = ' High resolution, vibrant dangerous anime art quality, perfect traditional technique, Mizuki Shigeru level detail, traditional dangerous aesthetic masterpiece';
      noTextPrompt = ', clean dangerous anime illustration without any text overlays, speech bubbles, or written content, pure Japanese dangerous animation art style';
      break;
    case 'realistic':
      qualityPrompt = ' Ultra-high resolution, supernatural photography quality, crystal clear dangerous details, professional paranormal photography, award-winning supernatural photographic masterpiece';
      noTextPrompt = ', supernatural photography without any text, labels, watermarks, or digital overlays, pure paranormal photographic documentation';
      break;
    default:
      qualityPrompt = ' High resolution, folkloric accurate, detailed dangerous anatomy, professional quality, masterpiece';
      noTextPrompt = ', no text, no words, no letters, no watermarks, no labels, clean image without any written content';
  }

  const finalPrompt = basePrompt + featuresPrompt + habitatPrompt + seasonPrompt + lightingPrompt + compositionPrompt + stylePrompt + qualityPrompt + noTextPrompt;
  
  return finalPrompt;
}

// プロンプト内のスタイルキーワードをチェック
function checkPromptStyleKeywords(prompt, style) {
  const styleKeywords = {
    'traditional': ['traditional', 'folkloric style', 'dangerous scroll', 'watercolor', 'traditional illustration'],
    'anime': ['Japanese anime', 'cel-shading', 'manga', 'kawaii', 'Studio Ghibli', 'shoujo', 'seinen', 'lineart', 'vibrant colors'],
    'realistic': ['photorealistic', 'macro photography', 'realistic', 'photography', 'lifelike']
  };
  
  const keywords = styleKeywords[style] || [];
  const foundKeywords = keywords.filter(keyword => 
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return {
    found: foundKeywords,
    total: keywords.length,
    percentage: Math.round((foundKeywords.length / keywords.length) * 100)
  };
}

// ドラフトプロンプトからスタイル情報を抽出
function extractStyleFromDraft(draftPrompt) {
  const styles = ['traditional', 'anime', 'realistic'];
  const lowercasePrompt = draftPrompt.toLowerCase();
  
  for (const style of styles) {
    const keywords = getStyleKeywords(style);
    const foundKeywords = keywords.filter(keyword => 
      lowercasePrompt.includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      return {
        style: style,
        foundKeywords: foundKeywords,
        confidence: foundKeywords.length / keywords.length
      };
    }
  }
  
  return { style: null };
}

// スタイル別キーワードを取得
function getStyleKeywords(style) {
  const styleKeywords = {
    'traditional': ['traditional illustration', 'traditional', 'folkloric style', 'dangerous scroll', 'watercolor', 'ink outlines', 'academic', 'demon documentation'],
    'anime': ['anime', 'cel-shading', 'manga', 'kawaii', 'Studio Ghibli', 'shoujo', 'seinen', 'lineart', 'vibrant colors', 'Japanese animation'],
    'realistic': ['photorealistic', 'documentary photography', 'realistic', 'photography', 'lifelike', 'crystal clear', 'professional paranormal']
  };
  
  return styleKeywords[style] || [];
}

// プロンプトのスタイル強度をチェック
function checkStyleStrength(prompt, style) {
  const keywords = getStyleKeywords(style);
  const foundKeywords = keywords.filter(keyword => 
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return {
    found: foundKeywords,
    total: keywords.length,
    percentage: Math.round((foundKeywords.length / keywords.length) * 100)
  };
}

// プロンプトにスタイル情報を補強
function enhanceStyleInPrompt(prompt, style) {
  const styleEnhancements = {
    'traditional': ' Rendered as a classical folkloric illustration with documentary accuracy, fine ink lineart, and delicate watercolor techniques in the style of vintage dangerous scrolls.',
    'anime': ' Created in authentic Japanese anime art style with vibrant cel-shading, clean lineart, kawaii aesthetic, and Studio Ghibli-inspired natural beauty.',
    'realistic': ' Captured as ultra-realistic documentary photography with photographic quality, crystal-clear details, and professional paranormal photography techniques.'
  };
  
  const enhancement = styleEnhancements[style] || '';
  
  // プロンプトの終端（品質向上キーワードの前）に挿入
  if (prompt.includes('High resolution')) {
    return prompt.replace('High resolution', enhancement + ' High resolution');
  } else {
    return prompt + enhancement;
  }
}

// 日本語危険生物特徴を英語に変換
function translateFeaturesToEnglish(features) {
  const translations = {
    // 外見の特徴
    '白い': 'white pale ghostly appearance',
    '小さい': 'small compact creature',
    '紫の': 'purple mystical coloring',
    '黄色い': 'bright yellow glowing features',
    '赤い': 'red crimson coloring',
    '青い': 'blue supernatural hue',
    'ふわふわした': 'fluffy ethereal texture',
    '星みたいな': 'star-shaped mystical form',
    'いい匂い': 'fragrant supernatural aura',
    
    // 体の特徴
    'ハート型': 'heart-shaped features',
    'ギザギザ': 'jagged sharp edges',
    '毛深い': 'hairy furry body',
    'でかい': 'large massive size',
    '多肉っぽい': 'thick fleshy appearance',
    
    // 全体的な特徴
    'ヒラヒラしてる': 'flowing ethereal movement',
    'ベタベタする': 'sticky slimy surface',
    '垂れ下がってる': 'drooping hanging features',
    'シダっぽい': 'wispy tendril-like appendages',
    'コケみたい': 'moss-covered ancient appearance',
    
    // 環境・場所
    '道端': 'roadside encounters',
    '雑草': 'common spirit',
    'よく見る': 'frequently sighted',
    '水辺にある': 'aquatic water spirit',
    
    // 季節・時期
    '春': 'spring appearance season',
    '夏': 'summer active period',
    '秋': 'autumn manifestation season',
    '冬': 'winter dormant period',
    
    // サイズ・形状
    '大きい': 'large-sized creature',
    '小さい': 'small compact being',
    '背が高い': 'tall towering form',
    '低い': 'low crouching posture',
    '這う': 'crawling movement',
    
    // 危険生物タイプ
    '木': 'tree spirit',
    '草': 'nature spirit',
    
    // 色の詳細
    '黄色くて小さい': 'small bright yellow glowing',
    '白っぽい': 'whitish pale ghostly',
    '紫っぽい': 'purplish mystical tinted',
    
    // 危険生物部位
    '角': 'horns and protrusions',
    '翼': 'supernatural wings',
    '尻尾': 'mystical tail',
    '牙': 'fangs and teeth',
    '爪': 'sharp claws',
    
    // 生態
    '虫がよく来る': 'attracting insects supernatural magnetism',
    
    // 追加の形態的特徴
    '鱗': 'supernatural scales',
    '毛': 'mystical fur',
    '触手': 'tentacle appendages',
    '多腕': 'multiple arms',
    '鋸歯': 'serrated edges',
    '全縁': 'smooth edges',
    '心形': 'heart-shaped features',
    '卵形': 'oval egg-shaped features',
    '線形': 'linear narrow features',
    '円形': 'round circular features',
    '掌状分裂': 'hand-like divisions',
    '羽状分裂': 'feather-like divisions',
    
    // 体の特徴
    '直立': 'upright erect posture',
    '匍匐': 'creeping crawling movement',
    '浮遊': 'floating ethereal movement',
    '半透明': 'translucent spectral body',
    '石化': 'stone-like hardened skin',
    '霊体': 'soft ethereal texture',
    
    // 装飾特徴
    '合弁': 'fused ornamental features',
    '離弁': 'separate decorative elements',
    '両性': 'dual-natured characteristics',
    '単性': 'single-aspect features',
    '頭状': 'head-like clusters',
    '穂状': 'spike-like projections',
    '総状': 'branched arrangements',
    '散房': 'scattered formations',
    '散形': 'radiating patterns',
    
    // 生成物の特徴
    '液果': 'liquid orbs',
    '核果': 'hard core spheres',
    '蒴果': 'explosive pods',
    '豆果': 'seed containers',
    '翼果': 'winged projectiles',
    '痩果': 'dry remnants',
    
    // 基部の特徴
    '直根': 'deep anchoring foundation',
    '髭根': 'fibrous underground network',
    '塊根': 'bulbous storage organs',
    '気根': 'aerial tendrils',
    
    // 質感・表面
    '光沢のある': 'glossy shiny surface',
    'ビロード状': 'velvety pubescent',
    'ザラザラ': 'rough textured surface',
    'ツルツル': 'smooth surface',
    'ワックス質': 'waxy coating',
    
    // 存在特性
    '常緑': 'persistent eternal presence',
    '落葉': 'seasonal manifestation cycles',
    '一年': 'annual appearance cycle',
    '二年': 'biennial manifestation cycle',
    '多年': 'perennial eternal existence',
    '球根': 'bulbous hidden core',
    '地下茎': 'underground network',
    
    // 環境適応
    '耐寒性': 'cold resistant frost-immune',
    '耐暑性': 'heat resistant fire-proof',
    '耐陰性': 'shadow dwelling darkness-loving',
    '耐乾性': 'drought resistant desiccation-proof',
    '湿生': 'moisture dwelling water-dependent',
    '塩生': 'salt-water dwelling marine-adapted'
  };

  let englishFeatures = features;
  Object.entries(translations).forEach(([jp, en]) => {
    englishFeatures = englishFeatures.replace(new RegExp(jp, 'g'), en);
  });

  return englishFeatures;
}

// 危険生物検索用LLM API呼び出し
async function calldangerousSearchAPI(searchQuery, region = 'japan') {
  const sanitizedQuery = sanitizeInput(searchQuery);
  
  return await retryWithExponentialBackoff(async () => {
    return await calldangerousSearchAPIInternal(sanitizedQuery, region);
  }, 3, 1000);
}

// 内部API呼び出し関数
async function calldangerousSearchAPIInternal(searchQuery, region = 'japan') {
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  // 地域設定に基づく危険生物の検索範囲
  const regionTexts = {
    'japan': '主に日本国内で見られる実在する危険生物を中心に検索し、毒性動物、病原性微生物、有毒植物、咬傷・刺傷を起こす生物を検索対象とする',
    'southeast-asia': '主に東南アジア地域で見られる実在する危険生物を中心に検索し、熱帯・亜熱帯の毒性生物、感染症媒介動物を検索対象とする',
    'north-america': '主にヨーロッパ・北米大陸で見られる実在する危険生物を中心に検索し、温帯・寒帯の毒性生物、病原性生物を検索対象とする',
    'fictional': '架空の危険生物を創造的に生成する。実在しない創作上の危険生物で、既存の生物学的知識を基に科学的に説得力のある架空種を設計する'
  };

  // 地域別の具体例
  const regionExamples = {
    'japan': '例：マムシ、ヤマカガシ、セアカゴケグモ、オオスズメバチ、カツオノエボシ、ドクガ、トリカブト、ベニテングタケ、ツツガムシ、マダニ等',
    'southeast-asia': '例：キングコブラ、ハブクラゲ、オニヒトデ、ホワイトテールスパイダー、マラリア蚊、デング熱媒介蚊、毒クワガタ、有毒カエル等',
    'north-america': '例：ガラガラヘビ、ブラックウィドウ、ブラウンリクルーススパイダー、アメリカドクトカゲ、毒ツタ、毒オーク、ライム病媒介ダニ等',
    'fictional': '例：プリズムスパイダー（Prisma veneficus）、クリスタルスコーピオン（Crystallinus mortalis）、シャドウヴァイパー（Umbra phantasma）、ネオンジェリーフィッシュ（Neon luminosa）等の架空種'
  };

  const regionRestriction = regionTexts[region] || regionTexts['japan'];
  const regionExample = regionExamples[region] || regionExamples['japan'];
  
  // 架空の危険生物の場合は特別なプロンプトを使用
  const systemPrompt = region === 'fictional' ? 
    `あなたは創作生物学・架空毒物学の専門家です。ユーザーの説明から、科学的に説得力のある架空の危険生物を創造し、必ずJSON形式で返してください。実在の生物学的知識を基に、現実的でありながら独創的な架空種を設計してください。` :
    `あなたは生物学・毒物学・感染症学の専門家です。ユーザーの生物の説明から、該当する可能性のある実在する危険生物（毒性動物、病原性微生物、有毒植物、咬傷・刺傷生物など）を特定し、必ずJSON形式で返してください。`;
  
  const messages = [
    {
      role: "system", 
      content: systemPrompt + `

## 地域設定 🌍
${regionRestriction}

${regionExample}

## 検索結果の多様性を確保：
**重要**: ユーザーの曖昧な説明に基づいて、可能性のある危険生物を幅広く提案してください。1つの特徴でも複数の危険生物が該当する可能性があります。より多くの選択肢を提供することで、ユーザーが正確な危険生物を見つけやすくなります。

## 曖昧な表現の解釈ガイド：
- 「毛深い」→ 体毛が多い動物（毒を持つ毛虫、ドクガ、タランチュラ、毒性のある哺乳動物など）
- 「ヒラヒラ」→ 膜状の構造物（毒クラゲの触手、ヒレ、翼膜、毒を持つ海洋生物など）
- 「ベタベタ」→ 粘液質の分泌物（毒を持つナメクジ、両生類、粘液毒を持つ魚類など）
- 「赤い目」→ 赤い色素を持つ部位（毒ヘビの目、危険な昆虫の複眼、警告色など）
- 「ギザギザ」→ 鋭い歯、棘、刺（毒蛇の牙、毒魚の棘、サソリの尾、ハチの針など）
- 「透明な」→ 透明・半透明の体（毒クラゲ、透明な毒魚、寄生虫の卵など）
- 「光る」→ 生物発光（毒を持つ発光生物、夜光虫、毒性プランクトンなど）
- 「黒い」→ 黒い色素（毒ヘビ、毒グモ、危険な昆虫の体色など）
- 「でかい」→ 大型の危険生物（大型毒ヘビ、オオスズメバチ、大型クラゲなど）
- 「小さい」→ 微小な危険生物（ダニ、ノミ、病原菌、ウイルスなど）

## 色の表現：
- 「白っぽい」「薄い色」→ 白い毒キノコ、淡色の毒ヘビ、白い毒グモ
- 「紫っぽい」→ 紫色の毒キノコ、紫の警告色を持つ生物
- 「黄色い」→ 黄色の警告色（毒ガエル、毒バチ、毒ヘビの腹部など）
- 「赤い」→ 赤い警告色（毒グモ、毒ヘビ、毒キノコなど）

## 環境・季節の手がかり：
- 「道端」「道路脇」→ 都市部の危険生物（セアカゴケグモ、ドクガなど）
- 「水辺」→ 水生の危険生物（毒ヘビ、毒クラゲ、病原菌など）
- 「春に見た」「夏に現れる」→ 季節性の危険生物（毒虫の発生期、毒キノコの季節など）
- 「夜に現れる」→ 夜行性危険生物（毒ヘビ、吸血性昆虫など）
- 「森で」→ 森林性危険生物（毒ヘビ、毒虫、毒キノコなど）
- 「海で」→ 海洋性危険生物（毒クラゲ、毒魚、毒貝など）

レスポンス形式（必ず有効なJSONで返してください）：
{
  "dangerous": [
    {
      "scientificName": "正式な学名（二名法によるラテン語学名）",
      "commonName": "一般的な日本語名",
      "aliases": ["別名1", "別名2"],
      "confidence": 0.85,
      "features": "主な生物学的特徴の詳細説明（80-120文字程度で生物の全体的な形態や危険性を詳細に記述）",
      "feature1": "形態学的特徴（体型・色・大きさ・構造などの具体的な外見詳細、80-120文字程度で詳細に記述）",
      "feature2": "毒性・病原性・生態学的特徴（毒の種類、感染経路、行動パターンなど、80-120文字程度で詳細に記述）",
      "feature3": "識別・鑑別のポイント（他の類似種との区別点、危険度判定のポイント、80-120文字程度で詳細に記述）",
      "habitat": "生息地・分布・生育環境の詳細",
      "season": "活動時期・繁殖期・発生時期の詳細",
      "humanConnection": "人間に対する危険性・被害・対処法の詳細",
      "culturalInfo": "医学的情報・注意事項・応急処置の詳細"
    }
  ]
}

## 重要な指針：
1. 必ず完全で有効なJSONを返す
2. JSONの構文エラーを避ける（末尾カンマ禁止、正しい引用符使用）
3. ${region === 'fictional' ? '3-6個の架空の危険生物候補を創造（多様な創作種を提供するが、多すぎは避ける）' : '3-6個の実在する危険生物候補を提案（多様な可能性を提供するが、多すぎは避ける）'}
4. confidence値は0.3-0.8の範囲で設定
5. 特徴説明は${region === 'fictional' ? '創作生物学的に説得力があり詳細に' : '生物学的に正確で詳細に'}（features, feature1, feature2, feature3は各80-120文字程度で科学的記述）
6. 形態的特徴では具体的な色・形・大きさ・構造に加え、分類学的特徴、解剖学的詳細も含める
7. 毒性・病原性特徴では毒の成分・作用機序・症状・感染経路に加え、医学的重要性も含める
8. 識別特徴では類似種との科学的区別点に加え、生息環境、行動、分布パターンなども詳細に示す
9. 曖昧な検索では生物学的幅広い解釈から複数の${region === 'fictional' ? '架空種' : '実在種'}を提案
10. ${region === 'fictional' ? '架空の危険生物のみを対象とし、実在する生物は一切含めない。科学的に説得力のある創作種を設計する' : '実在する危険生物のみを対象とし、架空・超自然的な存在は一切含めない'}

${region === 'fictional' ? `
## 詳細記述の例（架空危険生物）：
**總合的特徴（features）**: 「体長30-40cmの大型架空毒蜘蛛で、全身が虹色に光る結晶状の外骨格で覆われ、腹部に発光するプリズム模様を持つ。独特の光毒を持ち、接触により幻覚と神経麻痺を引き起こす。」

**形態的特徴（feature1）**: 「雌は体長3.5cm、雄は1.8cm程度で極端な性的二形を示す。頭胸部は透明な結晶質で覆われ、8本の脚は多関節で伸縮自在。腹部は六角形で、内部に発光器官を持つ。」

**毒性特徴（feature2）**: 「ルミノトキシンを主成分とする光感応性神経毒を分泌する。皮膚接触により発光性皮疹が現れ、視覚幻覚、時空間認識障害、筋肉の不随意収縮などの症状が段階的に進行する。」

**識別特徴（feature3）**: 「他の架空蜘蛛類と異なり、腹部のプリズム模様が光の角度により色彩変化する点が最重要な識別点。巣は光ファイバー状の糸で構成され、紫外線下で青白く発光する。」
` : `
## 詳細記述の例（実在危険生物）：
**總合的特徴（features）**: 「体長15-20cmの大型毒蜘蛛で、全身が光沢のある黒色で覆われ、腹部に赤い砂時計模様を持つ。強力な神経毒を持ち、咬傷により重篤な中毒症状を引き起こす。」

**形態的特徴（feature1）**: 「雌は体長1.5cm、雄は0.7cm程度で明確な性的二形を示す。頭胸部は黒く光沢があり、8本の脚は長く細い。腹部は球状で黒色、腹面中央に特徴的な赤い砂時計状マーキングを持つ。」

**毒性特徴（feature2）**: 「α-ラトロトキシンを主成分とする強力な神経毒を分泌する。咬傷部位に激痛が走り、筋肉痙攣、呼吸困難、血圧上昇などの全身症状が現れる。重症例では呼吸筋麻痺により生命危険がある。」

**識別特徴（feature3）**: 「他のクモ類と異なり、腹部の赤い砂時計模様が最も重要な識別点。網は不規則で強固、振動に敏感で攻撃的。類似種のオーストラリアセアカゴケグモより体が大きく、模様がより鮮明。」
`}`
    },
    {
      role: "user",
      content: `以下の危険生物の説明から、該当する可能性のある危険生物を特定してJSON形式で返してください：\n\n${searchQuery}`
    }
  ];
  
  const requestId = Math.random().toString(36).substring(2);
  const startTime = performance.now();
  
  const requestData = {
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.7,
    stream: false,
    max_completion_tokens: 3000,
    messages: messages
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      console.error('📤 [LLM_ERROR] dangerous Search API Failed:', {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        status: response.status,
        statusText: response.statusText,
        duration: duration,
        region: region,
        query: searchQuery.substring(0, 100) + '...',
        errorText: errorText.substring(0, 200),
        apiUrl: apiUrl
      });
      
      throw new Error(`API呼び出しに失敗しました: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // 複数のレスポンス形式に対応した柔軟な解析
    let responseText = null;
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      responseText = data.choices[0].message.content;
    } else if (data.answer) {
      responseText = data.answer;
    } else if (data.result && data.result.response) {
      responseText = data.result.response;
    } else if (data.response) {
      responseText = data.response;
    } else if (typeof data === 'string') {
      responseText = data;
    } else {
      // 最後の手段：data内のテキスト文字列を探索
      const findTextContent = (obj, path = '') => {
        if (typeof obj === 'string' && obj.length > 10) {
          return obj;
        }
        if (obj && typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            const result = findTextContent(value, path ? `${path}.${key}` : key);
            if (result) return result;
          }
        }
        return null;
      };
      
      responseText = findTextContent(data);
      
      if (!responseText) {
        console.error('📥 [LLM_INVALID] No valid response text found in API response:', {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          dataKeys: Object.keys(data),
          dataStructure: JSON.stringify(data, null, 2).substring(0, 1000)
        });
        throw new Error('レスポンスに有効なテキストコンテンツが見つかりません');
      }
    }
    
    return parsedangerousSearchResponse(responseText);
    
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.error('📤 [LLM_EXCEPTION] dangerous Search API Exception:', {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      duration: duration,
      errorName: error.name,
      errorMessage: error.message,
      region: region,
      query: searchQuery.substring(0, 100)
    });
    
    throw error;
  }
}

// セキュリティとバリデーション用ユーティリティ関数（簡素化）
function containsJapanese(text) {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 3000);  // 1000から3000に拡大してJSONの切り詰めを防ぐ
}

// validatedangerousData関数は削除（app_old.jsではシンプルなチェックのみ）

// 複雑なsafeJsonParse関数は削除（app_old.jsでは標準のJSON.parseのみ）

// getImprovedDefaultdangerousData関数は削除（app_old.jsではシンプルなフォールバック）

async function retryWithExponentialBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries + 1} attempts failed:`, error.message);
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// 危険生物検索レスポンス解析（app_old.jsの実証済みロジックに戻る + 軽微な修復）
function parsedangerousSearchResponse(responseText) {
  const sanitizedText = sanitizeInput(responseText);
  
  try {
    // app_old.jsと同じシンプルなJSON抽出
    const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonText = jsonMatch[0];
      let parsed = null;
      
      try {
        // まず標準のJSON.parseを試行（app_old.jsと同様）
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        console.warn('🔧 [JSON_REPAIR] Standard parse failed, attempting minimal repair:', parseError.message);
        
        // 最小限の修復のみ（よくある構文エラーのみ）
        let repairedJson = jsonText
          // 1. 末尾の余分なカンマを除去
          .replace(/,(\s*[}\]])/g, '$1')
          // 2. 配列内の末尾カンマを除去
          .replace(/,(\s*\])/g, '$1')
          // 3. オブジェクト内の末尾カンマを除去
          .replace(/,(\s*\})/g, '$1')
          // 4. 文字列内の不正な改行をエスケープ
          .replace(/"([^"]*)\n([^"]*)":/g, '"$1\\n$2":');
        
        // 修復を試行
        try {
          parsed = JSON.parse(repairedJson);
        } catch (repairError) {
          console.warn('🔧 [JSON_REPAIR] Minimal repair failed, using fallback');
          throw repairError;
        }
      }
      
      if (parsed && parsed.dangerous && Array.isArray(parsed.dangerous)) {
        // 検証とサニタイゼーション（最小限）
        const validateddangerous = parsed.dangerous
          .filter(dangerous => dangerous && dangerous.scientificName && dangerous.commonName)
          .slice(0, 15)
          .map(dangerous => ({
            scientificName: sanitizeInput(dangerous.scientificName),
            commonName: sanitizeInput(dangerous.commonName),
            aliases: Array.isArray(dangerous.aliases) ? dangerous.aliases.slice(0, 5).map(sanitizeInput) : [],
            confidence: Math.max(0, Math.min(1, dangerous.confidence || 0.5)),
            features: sanitizeInput(dangerous.features || ''),
            feature1: sanitizeInput(dangerous.feature1 || ''),
            feature2: sanitizeInput(dangerous.feature2 || ''),
            feature3: sanitizeInput(dangerous.feature3 || ''),
            habitat: sanitizeInput(dangerous.habitat || ''),
            season: sanitizeInput(dangerous.season || ''),
            humanConnection: sanitizeInput(dangerous.humanConnection || ''),
            culturalInfo: sanitizeInput(dangerous.culturalInfo || '')
          }));
        
        if (validateddangerous.length > 0) {
          return validateddangerous;
        }
      }
    }
  } catch (error) {
    console.warn('🚨 JSON解析に失敗:', error.message);
  }
  
  // app_old.jsと同じフォールバック（改善されたメッセージ）
  console.warn('⚠️ [FALLBACK] JSON解析失敗、フォールバックデータを返却');
  return [{
    scientificName: "JSON解析エラー",
    commonName: "API応答の解析に失敗しました",
    aliases: ["システムエラー"],
    confidence: 0.1,
    features: "APIからの応答を正しく解析できませんでした。より具体的な危険生物の特徴を追加して再検索してください。",
    feature1: "検索のコツ: 外見の特徴を具体的に（例：「赤い目」「毛深い」）",
    feature2: "検索のコツ: 出現場所を詳しく（例：「水辺で見かけた」「山で見た」）", 
    feature3: "検索のコツ: 行動や能力を含める（例：「夜に現れる」「光る」）",
    habitat: "より具体的な特徴で再検索をお試しください",
    season: "出現時期情報も追加してください",
    humanConnection: "「人を驚かす」「人に憑く」「人を守る」なども有効です",
    culturalInfo: "システム: API応答の形式を確認中です"
  }];
}

// 危険生物検索用のLLM処理システム
class dangerousSearchLLM {
  constructor() {
    this.apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    this.model = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";
    // Replicate API用Cloudflare Workerのエンドポイント
    this.replicateWorkerUrl = 'https://nurumayu-replicate-api.skume-bioinfo.workers.dev/';
  }

  // Replicate Worker URLを設定
  setReplicateWorkerUrl(url) {
    this.replicateWorkerUrl = url;
  }


  // 危険生物検索実行
  async searchdangerous(searchQuery, region = 'japan') {
    return await calldangerousSearchAPI(searchQuery, region);
  }


  // 危険生物画像生成（新しいReplicate API使用）
  async generatedangerousImage(dangerousInfo, style = 'traditional', model = 'minimax', imageOptions = {}) {
    try {
      const result = await generatedangerousImage(dangerousInfo, style, this.replicateWorkerUrl, model, imageOptions);
      return result;
    } catch (error) {
      console.error('🎯 危険生物画像生成エラー:', error);
      
      // エラーメッセージを短く分かりやすく変換
      let shortErrorMessage = 'サーバーエラー';
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('worker api呼び出しに失敗')) {
        shortErrorMessage = 'API接続エラー';
      } else if (errorMsg.includes('replicate api エラー')) {
        shortErrorMessage = 'Replicate APIエラー';
      } else if (errorMsg.includes('timeout')) {
        shortErrorMessage = 'タイムアウト';
      } else if (errorMsg.includes('network')) {
        shortErrorMessage = 'ネットワークエラー';
      } else if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
        shortErrorMessage = 'API制限に達しました';
      } else if (errorMsg.includes('invalid')) {
        shortErrorMessage = '無効なリクエスト';
      } else if (errorMsg.includes('unauthorized')) {
        shortErrorMessage = 'API認証エラー';
      }
      
      return {
        success: false,
        error: shortErrorMessage,
        fullError: error.message
      };
    }
  }
}

// dangerousDictionaryApp クラスは index.html で定義されています


// エクスポート用のグローバル変数
if (typeof window !== 'undefined') {
  window.ReplicateImageClient = ReplicateImageClient;
  window.generatedangerousImage = generatedangerousImage;
  window.createdangerousImagePrompt = createdangerousImagePrompt;
  window.checkPromptStyleKeywords = checkPromptStyleKeywords;
  window.extractStyleFromDraft = extractStyleFromDraft;
  window.getStyleKeywords = getStyleKeywords;
  window.checkStyleStrength = checkStyleStrength;
  window.enhanceStyleInPrompt = enhanceStyleInPrompt;
  window.translateFeaturesToEnglish = translateFeaturesToEnglish;
  window.calldangerousSearchAPI = calldangerousSearchAPI;
  window.parsedangerousSearchResponse = parsedangerousSearchResponse;
  window.dangerousSearchLLM = dangerousSearchLLM;
  window.dangerousImageStorage = dangerousImageStorage;
  window.saveImageToStorage = saveImageToStorage;
  window.containsJapanese = containsJapanese;
  window.sanitizeInput = sanitizeInput;
  window.retryWithExponentialBackoff = retryWithExponentialBackoff;
} 