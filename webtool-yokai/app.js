/**
 * AI植物辞典 JavaScript
 * LLMを活用した植物検索ツール with Replicate API画像生成
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

  // 汎用Replicate API呼び出し
  async callReplicateAPI(apiUrl, payload) {
    const requestId = Math.random().toString(36).substring(2);
    const startTime = performance.now();
    
    const requestData = {
      apiUrl: apiUrl,
      payload: payload
    };

    console.log('🔥 [API_REQUEST] Replicate API Call Started:', {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      workerUrl: this.workerUrl,
      apiUrl: apiUrl,
      payloadSize: JSON.stringify(payload).length,
      model: payload?.version || payload?.input?.model || 'unknown',
      method: 'POST'
    });

    try {
      const response = await fetch(this.workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const duration = Math.round(performance.now() - startTime);
      
      console.log('🔥 [API_RESPONSE] Worker API Response Received:', {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        status: response.status,
        statusText: response.statusText,
        duration: duration,
        ok: response.ok,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        console.error('🔥 [API_ERROR] Worker API Call Failed:', {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          status: response.status,
          statusText: response.statusText,
          url: this.workerUrl,
          duration: duration,
          errorData: errorData,
          originalPayload: {
            apiUrl: apiUrl,
            payloadKeys: Object.keys(payload),
            hasInput: !!payload?.input
          }
        });
        
        throw new Error(`Worker API呼び出しに失敗: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      console.log('🔥 [API_SUCCESS] Worker API Response Data:', {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        duration: duration,
        hasOutput: !!data.output,
        outputType: Array.isArray(data.output) ? 'array' : typeof data.output,
        outputLength: Array.isArray(data.output) ? data.output.length : 'n/a',
        hasError: !!data.error,
        dataKeys: Object.keys(data)
      });
      
      if (data.error) {
        console.error('🔥 [API_INTERNAL_ERROR] Replicate API Internal Error:', {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          error: data.error,
          details: data.details,
          duration: duration
        });
        throw new Error(`Replicate API エラー: ${JSON.stringify(data.details || data.error)}`);
      }

      console.log('🔥 [API_COMPLETE] Image Generation Successful:', {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        duration: duration,
        hasImageUrl: !!data.output,
        success: true
      });
      
      return data;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      console.error('🔥 [API_EXCEPTION] API Call Exception:', {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        duration: duration,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      
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
  
  console.log('🔄 [OPTIMIZE_START] プロンプト最適化API呼び出し開始:', {
    optimizationId: optimizationId,
    workerUrl: workerUrl,
    draftLength: draftPrompt.length,
    timestamp: new Date().toISOString()
  });
  
  const optimizationPrompt = `あなたは画像生成AI（Stable Diffusion、DALL-E、Midjourney等）用のプロンプト最適化の専門家です。

与えられたドラフトプロンプトを以下の条件で最適化してください：

【最優先事項】
- **画像スタイル指定を絶対に保持**: botanical、anime、realistic等のスタイル情報は強化する
- **植物固有の特徴を保持**: 植物の形態学的・生態学的特徴は削除せず、むしろ強化する

【最適化条件】
1. **完全英語化**: 日本語部分をすべて自然な英語に変換
2. **スタイル強化**: 画像スタイル（botanical illustration、anime art style、photorealistic等）の表現を強化・明確化
3. **植物特徴の詳細化**: 葉、花、茎、根の具体的特徴を視覚的に表現
4. **視覚的要素の強化**: 色、形、質感、光、構図などの視覚的詳細を強調
5. **専門用語の活用**: 植物学的に正確で画像生成に有効な専門用語を追加
6. **画像品質向上**: "high resolution", "detailed", "masterpiece"等の品質向上キーワードを保持

【削除禁止】
- スタイル指定（botanical、anime、realistic等）
- 植物の学名・一般名
- 色彩情報（白い花、緑の葉等）
- 形態学的特徴（ハート型の葉、鋸歯状の縁等）

【出力形式】
最適化されたプロンプトのみを出力してください。説明や追加コメントは不要です。

【ドラフトプロンプト】
${draftPrompt}`;

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
        stream: false
      })
    });

    const duration = Math.round(performance.now() - startTime);

    if (!response.ok) {
      console.error('❌ [OPTIMIZE_ERROR] プロンプト最適化API失敗:', {
        optimizationId: optimizationId,
        status: response.status,
        statusText: response.statusText,
        duration: duration,
        timestamp: new Date().toISOString()
      });
      throw new Error(`プロンプト最適化API呼び出しに失敗: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('📥 [OPTIMIZE_RESPONSE] プロンプト最適化API応答受信:', {
      optimizationId: optimizationId,
      duration: duration,
      hasResult: !!(data.result && data.result.response),
      dataKeys: Object.keys(data),
      responseLength: data.result?.response?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (data.result && data.result.response) {
      const optimizedText = data.result.response.trim();
      
      // 最適化成功の検証
      const hasJapanese = containsJapanese(optimizedText);
      const actuallyOptimized = optimizedText !== draftPrompt;
      
      console.log('✅ [OPTIMIZE_SUCCESS] プロンプト最適化成功:', {
        optimizationId: optimizationId,
        duration: duration,
        originalLength: draftPrompt.length,
        optimizedLength: optimizedText.length,
        compressionRatio: Math.round((optimizedText.length / draftPrompt.length) * 100),
        sampleOptimized: optimizedText.substring(0, 100) + '...',
        hasJapanese: hasJapanese,
        actuallyOptimized: actuallyOptimized,
        optimizationQuality: hasJapanese ? 'POOR' : 'GOOD',
        timestamp: new Date().toISOString()
      });
      
      // 日本語が残っている場合は手動フォールバック翻訳を適用
      if (hasJapanese) {
        console.warn('⚠️ [OPTIMIZE_JAPANESE_DETECTED] Applying manual translation fallback');
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
        
        console.log('🎨 [STYLE_CHECK] プロンプト最適化後のスタイル強度:', {
          originalStyle: styleKeywords.style,
          styleStrength: optimizedStyleStrength.percentage,
          foundKeywords: optimizedStyleStrength.found.length,
          totalKeywords: optimizedStyleStrength.total
        });
        
        // スタイル強度が低い場合（50%未満）、スタイル情報を補強
        if (optimizedStyleStrength.percentage < 50) {
          const enhancedPrompt = enhanceStyleInPrompt(finalOptimizedText, styleKeywords.style);
          console.log('🔧 [STYLE_ENHANCE] スタイル情報を補強しました');
          return enhancedPrompt;
        }
      }
      
      return finalOptimizedText;
    } else {
      console.error('❌ [OPTIMIZE_INVALID] プロンプト最適化レスポンス無効:', {
        optimizationId: optimizationId,
        duration: duration,
        dataStructure: JSON.stringify(data).substring(0, 200),
        timestamp: new Date().toISOString()
      });
      throw new Error('プロンプト最適化レスポンスが無効です');
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.warn('⚠️ [OPTIMIZE_FALLBACK] プロンプト最適化失敗、フォールバック処理開始:', {
      optimizationId: optimizationId,
      duration: duration,
      errorName: error.name,
      errorMessage: error.message,
      fallbackLength: draftPrompt.length,
      timestamp: new Date().toISOString()
    });
    
    // フォールバック：日本語含有チェックとクリーンアップ
    if (containsJapanese(draftPrompt)) {
      console.warn('⚠️ [FALLBACK_JAPANESE] 元プロンプトに日本語が含まれています、最小限の英語化を実行');
      
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
      
      // 空になった場合は基本的な英語プロンプトを生成
      if (!cleanPrompt || cleanPrompt.length < 20) {
        cleanPrompt = `A detailed botanical image of a plant specimen, professional scientific illustration style, clean background`;
        console.warn('⚠️ [FALLBACK_MINIMAL] 最小限の英語プロンプトを生成');
      }
      
      console.log('🔧 [FALLBACK_CLEANED] フォールバック最適化完了:', {
        originalLength: draftPrompt.length,
        translatedLength: translatedPrompt.length,
        cleanedLength: cleanPrompt.length,
        containsJapanese: containsJapanese(cleanPrompt)
      });
      
      return cleanPrompt;
    }
    
    // 日本語が含まれていない場合は元のプロンプトを返す
    console.log('✅ [FALLBACK_CLEAN] 元プロンプトは日本語を含まないため、そのまま使用');
    return draftPrompt;
  }
}

// ローカルストレージ管理クラス
class PlantImageStorage {
  constructor() {
    this.storageKey = 'plantDictionary_savedImages';
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
        plantName: imageData.plantName || 'Unknown Plant',
        scientificName: imageData.scientificName || '',
        commonName: imageData.commonName || '',
        imageUrl: imageData.imageUrl,
        base64Data: base64Data,
        prompt: imageData.prompt || '',
        style: imageData.style || 'botanical',
        model: imageData.model || '',
        confidence: imageData.confidence || 0
      };

      savedImages.unshift(newImageData);

      // 最大件数を超えた場合、古いものを削除
      if (savedImages.length > this.maxItems) {
        savedImages.splice(this.maxItems);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(savedImages));
      console.log('🗂️ 画像を保存しました:', newImageData.plantName);
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
      console.log('🗂️ 画像を削除しました:', imageId);
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
      console.log('🗂️ 全ての保存画像を削除しました');
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

// 植物画像生成専用の便利関数
async function generatePlantImage(plantInfo, style = 'botanical', workerUrl, model = 'minimax', imageOptions = {}) {
  const startTime = performance.now();
  const sessionId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  
  console.log('🌱 植物画像生成開始:', {
    plant: plantInfo.commonName || plantInfo.scientificName,
    style: style,
    model: model,
    workerUrl: workerUrl,
    imageOptions: imageOptions,
    sessionId: sessionId
  });

  const client = new ReplicateImageClient(workerUrl);
  
  // ドラフトプロンプト作成（シードも考慮）
  const seed = imageOptions.seed;
  const draftPrompt = createPlantImagePrompt(plantInfo, style, seed);
  
  console.log('🌱 [DRAFT_PROMPT] ドラフトプロンプト生成完了:', {
    sessionId: sessionId,
    draftLength: draftPrompt.length,
    preview: draftPrompt.substring(0, 150) + '...'
  });
  
  // LLMでプロンプトを最適化（植物検索と同じWorkerを使用）
  const llmWorkerUrl = 'https://nurumayu-ai-api.skume-bioinfo.workers.dev/';
  console.log('🔄 [OPTIMIZATION_START] プロンプト最適化開始:', {
    sessionId: sessionId,
    llmWorkerUrl: llmWorkerUrl,
    draftLength: draftPrompt.length
  });
  
  const optimizedPrompt = await optimizeImagePrompt(draftPrompt, llmWorkerUrl);
  
  // プロンプト最適化の品質検証
  const hasJapanese = containsJapanese(optimizedPrompt);
  const wasActuallyOptimized = optimizedPrompt !== draftPrompt && !hasJapanese;
  const styleStrength = checkStyleStrength(optimizedPrompt, style);
  
  console.log('✅ [OPTIMIZATION_COMPLETE] プロンプト最適化完了:', {
    sessionId: sessionId,
    originalLength: draftPrompt.length,
    optimizedLength: optimizedPrompt.length,
    textChanged: optimizedPrompt !== draftPrompt,
    hasJapanese: hasJapanese,
    wasActuallyOptimized: wasActuallyOptimized,
    styleStrength: styleStrength.percentage,
    optimizedPreview: optimizedPrompt.substring(0, 150) + '...'
  });
  
  try {
    let result;
    
    if (model === 'sdxl-lightning') {
      // SDXL Lightning使用（サイズ指定可能）
      console.log(`Generating plant image with SDXL Lightning: ${optimizedPrompt}`);
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
        await saveImageToStorage(imageResult, plantInfo, style);
        
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
        await saveImageToStorage(imageResult, plantInfo, style);
        
        return imageResult;
        } else {
        throw new Error('画像URLが返されませんでした');
      }
  } else {
      // Minimax使用（デフォルト）- アスペクト比指定可能
      console.log(`Generating plant image with Minimax: ${optimizedPrompt}`);
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
        await saveImageToStorage(imageResult, plantInfo, style);
        
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
        await saveImageToStorage(imageResult, plantInfo, style);
        
        return imageResult;
        } else {
        throw new Error('画像URLが返されませんでした');
      }
    }
  } catch (error) {
    const totalDuration = Math.round(performance.now() - startTime);
    
    console.error('🌱 [IMAGE_GEN_ERROR] Plant Image Generation Failed:', {
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      model: model,
      duration: totalDuration,
      plantName: plantInfo.commonName,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
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
    
    console.log('🌱 [IMAGE_GEN_FAILED] Returning Error Response:', {
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      shortError: shortErrorMessage,
      hasOptimizedPrompt: !!optimizedPrompt,
      hasDraftPrompt: !!draftPrompt
    });
    
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
async function saveImageToStorage(imageResult, plantInfo, style) {
  const startTime = performance.now();
  
  console.log('🗂️ [STORAGE_START] Image Storage Started:', {
    timestamp: new Date().toISOString(),
    plantName: plantInfo.commonName || plantInfo.scientificName,
    hasImageUrl: !!imageResult.imageUrl,
    style: style,
    model: imageResult.model
  });
  
  try {
    const storage = new PlantImageStorage();
    const saveData = {
      imageUrl: imageResult.imageUrl,
      plantName: plantInfo.commonName || plantInfo.scientificName,
      scientificName: plantInfo.scientificName,
      commonName: plantInfo.commonName,
      prompt: imageResult.prompt,
      style: style,
      model: imageResult.model,
      confidence: plantInfo.confidence
    };
    
    const saved = await storage.saveImage(saveData);
    const duration = Math.round(performance.now() - startTime);
    
    if (saved) {
      console.log('🗂️ [STORAGE_SUCCESS] Image Storage Completed:', {
        timestamp: new Date().toISOString(),
        plantName: saveData.plantName,
        duration: duration,
        imageUrlLength: imageResult.imageUrl?.length || 0
      });
    } else {
      console.warn('🗂️ [STORAGE_FAILED] Image Storage Failed (Unknown Reason):', {
        timestamp: new Date().toISOString(),
        plantName: saveData.plantName,
        duration: duration
      });
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.error('🗂️ [STORAGE_ERROR] Image Storage Exception:', {
      timestamp: new Date().toISOString(),
      plantName: plantInfo.commonName || plantInfo.scientificName,
      duration: duration,
      errorName: error.name,
      errorMessage: error.message
    });
  }
}

// 植物画像プロンプト作成
function createPlantImagePrompt(plantInfo, style, seed = null) {
  // 植物固有のハッシュを作成（学名と一般名から）
  const plantHash = (plantInfo.scientificName + (plantInfo.commonName || '')).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // シードと植物ハッシュを組み合わせてより多様なバリエーションを作成
  const combinedSeed = seed ? (seed + Math.abs(plantHash)) : Math.abs(plantHash);
  
  // スタイル別のベースプロンプトバリエーション（スタイル強調）
  let styleVariations = [];
  switch (style) {
    case 'botanical':
      styleVariations = [
        `A highly detailed botanical illustration of ${plantInfo.scientificName}`,
        `A scientific botanical study of ${plantInfo.scientificName}`,
        `A detailed botanical field guide illustration of ${plantInfo.scientificName}`,
        `A precise botanical diagram of ${plantInfo.scientificName}`,
        `A classical botanical artwork depicting ${plantInfo.scientificName}`,
        `A watercolor botanical illustration of ${plantInfo.scientificName}`,
        `An academic botanical documentation of ${plantInfo.scientificName}`,
        `A botanical specimen illustration of ${plantInfo.scientificName}`,
        `A detailed botanical plate showing ${plantInfo.scientificName}`,
        `A vintage botanical drawing of ${plantInfo.scientificName}`
      ];
      break;
    case 'anime':
      styleVariations = [
        `A vibrant anime-style illustration of ${plantInfo.scientificName}`,
        `A Japanese animation artwork featuring ${plantInfo.scientificName}`,
        `A kawaii anime drawing of ${plantInfo.scientificName}`,
        `A cel-shaded anime illustration of ${plantInfo.scientificName}`,
        `A Studio Ghibli style artwork of ${plantInfo.scientificName}`,
        `A shoujo manga style drawing of ${plantInfo.scientificName}`,
        `A colorful anime art depicting ${plantInfo.scientificName}`,
        `A Japanese anime botanical illustration of ${plantInfo.scientificName}`,
        `An anime-style nature artwork of ${plantInfo.scientificName}`,
        `A manga-style botanical drawing of ${plantInfo.scientificName}`
      ];
      break;
    case 'realistic':
      styleVariations = [
        `A photorealistic image of ${plantInfo.scientificName}`,
        `A macro photography shot of ${plantInfo.scientificName}`,
        `A high-resolution nature photograph of ${plantInfo.scientificName}`,
        `A detailed photographic documentation of ${plantInfo.scientificName}`,
        `A professional nature photography of ${plantInfo.scientificName}`,
        `A lifelike botanical photograph of ${plantInfo.scientificName}`,
        `A crystal-clear macro image of ${plantInfo.scientificName}`,
        `A realistic botanical photography of ${plantInfo.scientificName}`,
        `An ultra-detailed nature photo of ${plantInfo.scientificName}`,
        `A high-definition botanical photograph of ${plantInfo.scientificName}`
      ];
      break;
    default:
      styleVariations = [
        `A detailed image of ${plantInfo.scientificName}`,
        `A beautiful depiction of ${plantInfo.scientificName}`,
        `An artistic rendering of ${plantInfo.scientificName}`,
        `A botanical study of ${plantInfo.scientificName}`,
        `A detailed plant portrait of ${plantInfo.scientificName}`,
        `A nature documentation of ${plantInfo.scientificName}`,
        `A botanical visualization of ${plantInfo.scientificName}`,
        `A plant specimen image of ${plantInfo.scientificName}`,
        `A detailed botanical view of ${plantInfo.scientificName}`,
        `A natural history illustration of ${plantInfo.scientificName}`
      ];
  }
  
  // 組み合わせシードを使ってバリエーションを選択
  const variationIndex = combinedSeed % styleVariations.length;
  let basePrompt = styleVariations[variationIndex];
  
  // 一般名があれば追加
  if (plantInfo.commonName) {
    basePrompt += ` (commonly known as ${plantInfo.commonName})`;
  }

  // スタイル別の植物特徴表現
  let featuresPrompt = '';
  
  // 総合的な特徴説明
  if (plantInfo.features) {
    const translatedFeatures = translateFeaturesToEnglish(plantInfo.features);
    switch (style) {
      case 'botanical':
        featuresPrompt = `, scientifically showcasing ${translatedFeatures}`;
        break;
      case 'anime':
        featuresPrompt = `, beautifully displaying ${translatedFeatures} with magical enhancement`;
        break;
      case 'realistic':
        featuresPrompt = `, photographically capturing ${translatedFeatures} in natural detail`;
        break;
      default:
        featuresPrompt = `, featuring ${translatedFeatures}`;
    }
  }
  
  // 3つの個別特徴を詳細に追加
  const specificFeatures = [];
  if (plantInfo.feature1) {
    const morphological = translateFeaturesToEnglish(plantInfo.feature1);
    switch (style) {
      case 'botanical':
        specificFeatures.push(`precise morphological documentation: ${morphological}`);
        break;
      case 'anime':
        specificFeatures.push(`charming visual characteristics: ${morphological}`);
        break;
      case 'realistic':
        specificFeatures.push(`detailed morphological structures: ${morphological}`);
        break;
      default:
        specificFeatures.push(`morphological characteristics: ${morphological}`);
    }
  }
  if (plantInfo.feature2) {
    const ecological = translateFeaturesToEnglish(plantInfo.feature2);
    switch (style) {
      case 'botanical':
        specificFeatures.push(`documented ecological adaptations: ${ecological}`);
        break;
      case 'anime':
        specificFeatures.push(`enchanting natural behaviors: ${ecological}`);
        break;
      case 'realistic':
        specificFeatures.push(`natural ecological traits: ${ecological}`);
        break;
      default:
        specificFeatures.push(`ecological traits: ${ecological}`);
    }
  }
  if (plantInfo.feature3) {
    const distinctive = translateFeaturesToEnglish(plantInfo.feature3);
    switch (style) {
      case 'botanical':
        specificFeatures.push(`taxonomic distinguishing features: ${distinctive}`);
        break;
      case 'anime':
        specificFeatures.push(`magical distinctive qualities: ${distinctive}`);
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
  
  // 植物固有の識別子を追加（学名の一部を含める）
  const scientificParts = plantInfo.scientificName.split(' ');
  if (scientificParts.length >= 2) {
    featuresPrompt += `, characteristic of ${scientificParts[0]} genus ${scientificParts[1]} species`;
  }

  // スタイル別の生育環境表現
  let habitatPrompt = '';
  if (plantInfo.habitat) {
    const translatedHabitat = translateFeaturesToEnglish(plantInfo.habitat);
    switch (style) {
      case 'botanical':
        habitatPrompt = `, documented from natural habitat: ${translatedHabitat}`;
        break;
      case 'anime':
        habitatPrompt = `, flourishing in magical environment: ${translatedHabitat}`;
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
  if (plantInfo.season) {
    const translatedSeason = translateFeaturesToEnglish(plantInfo.season);
    switch (style) {
      case 'botanical':
        seasonPrompt = `, seasonal observation: ${translatedSeason}`;
        break;
      case 'anime':
        seasonPrompt = `, in enchanting seasonal setting: ${translatedSeason}`;
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
    case 'botanical':
      lightingPrompt = ', depicted with even, diffused lighting ideal for botanical illustration, clear visibility of all morphological details, academic documentation standard';
      break;
    case 'anime':
      lightingPrompt = ', brightened with vibrant anime daylight, cheerful and colorful illumination, perfect cel-shading lighting with soft gradient backgrounds';
      break;
    case 'realistic':
      lightingPrompt = ', shot in optimal natural daylight with professional photography lighting, crystal clear macro details, perfect exposure and color reproduction';
      break;
    default:
      lightingPrompt = ', photographed in bright natural daylight with even illumination, clear visibility of all botanical details, vibrant natural colors';
  }

  // スタイルに応じたプロンプト（より具体的で植物に特化）
  let stylePrompt = '';
  switch (style) {
    case 'botanical':
      stylePrompt = `. A highly detailed botanical illustration of a plant, in classical scientific style. The image features fine ink outlines combined with delicate watercolor shading using glazing techniques. Each leaf and bud is rendered with botanical accuracy, showing intricate vein patterns and subtle color gradients. The background is pure white, with no shadows or textures. The style is reminiscent of 18th to 19th century botanical field guides, with precise, academic aesthetics and clean composition. Pure visual botanical art without any text or labels.`;
      break;
    case 'anime':
      stylePrompt = `. Illustrated in authentic Japanese anime art style with vibrant cel-shading and bold, saturated colors characteristic of modern Japanese animation studios. Clean vector-like outlines with precise lineart, bright color palettes typical of manga and anime aesthetics. The plant maintains botanical accuracy while being stylized with kawaii charm and artistic flair. Features soft gradient backgrounds, sparkling highlight effects on petals and leaves, and an appealing shoujo/seinen manga visual style. Digital art finish with smooth textures and gentle lighting effects reminiscent of Studio Ghibli nature scenes. Pure Japanese animation-style illustration without text or writing.`;
      break;
    case 'realistic':
      stylePrompt = `. Captured as a highly detailed, photorealistic image with macro photography quality. Crystal clear focus showing minute details like leaf textures, petal surface patterns, stem structures, and natural imperfections. Professional nature photography with excellent depth of field, natural color reproduction, and lifelike appearance. Include environmental context showing the plant's natural growing conditions. Shot with high-end botanical photography techniques. Clean natural photography without any text overlays or watermarks.`;
      break;
    default:
      stylePrompt = '. Beautifully rendered with accurate botanical details, natural colors, excellent lighting, and clear definition of plant structures.';
  }

  // スタイル別の構図バリエーション
  let compositionPrompt = '';
  let compositions = [];
  
  switch (style) {
    case 'botanical':
      compositions = [
        ', centered scientific composition with full specimen view',
        ', detailed botanical study focusing on diagnostic features',
        ', classical field guide layout showing plant architecture',
        ', academic specimen presentation with clear morphological details',
        ', traditional botanical illustration composition',
        ', scientific documentation style with systematic arrangement',
        ', vintage botanical plate composition',
        ', methodical botanical survey layout',
        ', herbarium specimen style arrangement',
        ', systematic botanical classification presentation'
      ];
      break;
    case 'anime':
      compositions = [
        ', kawaii centered composition with magical plant presentation',
        ', anime close-up focusing on beautiful flowers with sparkling effects',
        ', dynamic diagonal composition typical of manga panels',
        ', artistic shoujo manga style with dreamy plant arrangement',
        ', Studio Ghibli inspired natural composition with organic flow',
        ', anime nature scene with enchanting plant display',
        ', colorful anime garden composition with vibrant plant life',
        ', manga-style botanical illustration with artistic flair',
        ', anime environmental art composition showing plant beauty',
        ', Japanese animation style nature composition'
      ];
      break;
    case 'realistic':
      compositions = [
        ', professional macro photography composition with perfect focus',
        ', nature photography close-up with shallow depth of field',
        ', award-winning botanical photography layout',
        ', expert macro shot highlighting plant textures and details',
        ', professional nature documentary style composition',
        ', high-end botanical photography with environmental context',
        ', macro photography masterpiece with crystal clear details',
        ', nature photographer\'s artistic composition',
        ', professional plant photography with perfect lighting',
        ', botanical macro photography with scientific accuracy'
      ];
      break;
    default:
      compositions = [
        ', centered composition with full plant view',
        ', close-up detail view focusing on flowers and leaves',
        ', diagonal composition showing plant structure',
        ', artistic angled view with depth',
        ', side profile view highlighting plant silhouette',
        ', macro photography focusing on distinctive features',
        ', three-quarter view showing plant architecture',
        ', overhead view displaying leaf arrangement',
        ', low angle view emphasizing plant height',
        ', natural habitat composition'
      ];
  }
  
  // 組み合わせシードを使って構図を選択
  compositionPrompt = compositions[combinedSeed % compositions.length];

  // スタイル別の品質向上と仕上げ指示
  let qualityPrompt = '';
  let noTextPrompt = '';
  
  switch (style) {
    case 'botanical':
      qualityPrompt = ' High resolution, scientifically accurate botanical details, precise plant anatomy, academic quality, vintage botanical field guide masterpiece';
      noTextPrompt = ', completely clean botanical illustration without any text, labels, watermarks, or written annotations, pure visual botanical art';
      break;
    case 'anime':
      qualityPrompt = ' High resolution, vibrant anime art quality, perfect cel-shading technique, Studio Ghibli level detail, kawaii aesthetic masterpiece';
      noTextPrompt = ', clean anime illustration without any text overlays, speech bubbles, or written content, pure Japanese animation art style';
      break;
    case 'realistic':
      qualityPrompt = ' Ultra-high resolution, macro photography quality, crystal clear botanical details, professional nature photography, award-winning photographic masterpiece';
      noTextPrompt = ', natural photography without any text, labels, watermarks, or digital overlays, pure photographic documentation';
      break;
    default:
      qualityPrompt = ' High resolution, botanically accurate, detailed plant anatomy, professional quality, masterpiece';
      noTextPrompt = ', no text, no words, no letters, no watermarks, no labels, clean image without any written content';
  }

  const finalPrompt = basePrompt + featuresPrompt + habitatPrompt + seasonPrompt + lightingPrompt + compositionPrompt + stylePrompt + qualityPrompt + noTextPrompt;
  
  // デバッグ用：植物固有の情報をログ出力
  const styleAnalysis = checkPromptStyleKeywords(finalPrompt, style);
  console.log(`🌿 画像プロンプト生成 - ${plantInfo.scientificName}:`, {
    style: style,
    plantHash: plantHash,
    combinedSeed: combinedSeed,
    variationIndex: variationIndex,
    selectedStyleVariation: styleVariations[variationIndex],
    compositionIndex: combinedSeed % compositions.length,
    selectedComposition: compositions[combinedSeed % compositions.length],
    promptLength: finalPrompt.length,
    stylePromptLength: stylePrompt.length,
    styleKeywordAnalysis: styleAnalysis,
    styleStrength: `${styleAnalysis.found.length}/${styleAnalysis.total} keywords (${styleAnalysis.percentage}%)`,
    basePromptContainsStyle: basePrompt.toLowerCase().includes(style)
  });

  return finalPrompt;
}

// プロンプト内のスタイルキーワードをチェック
function checkPromptStyleKeywords(prompt, style) {
  const styleKeywords = {
    'botanical': ['botanical', 'scientific style', 'field guide', 'watercolor', 'botanical illustration'],
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
  const styles = ['botanical', 'anime', 'realistic'];
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
    'botanical': ['botanical illustration', 'botanical', 'scientific style', 'field guide', 'watercolor', 'ink outlines', 'academic', 'specimen'],
    'anime': ['anime', 'cel-shading', 'manga', 'kawaii', 'Studio Ghibli', 'shoujo', 'seinen', 'lineart', 'vibrant colors', 'Japanese animation'],
    'realistic': ['photorealistic', 'macro photography', 'realistic', 'photography', 'lifelike', 'crystal clear', 'professional nature']
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
    'botanical': ' Rendered as a classical botanical illustration with scientific accuracy, fine ink lineart, and delicate watercolor techniques in the style of vintage botanical field guides.',
    'anime': ' Created in authentic Japanese anime art style with vibrant cel-shading, clean lineart, kawaii aesthetic, and Studio Ghibli-inspired natural beauty.',
    'realistic': ' Captured as ultra-realistic macro photography with photographic quality, crystal-clear details, and professional nature photography techniques.'
  };
  
  const enhancement = styleEnhancements[style] || '';
  
  // プロンプトの終端（品質向上キーワードの前）に挿入
  if (prompt.includes('High resolution')) {
    return prompt.replace('High resolution', enhancement + ' High resolution');
  } else {
    return prompt + enhancement;
  }
}

// 日本語植物特徴を英語に変換
function translateFeaturesToEnglish(features) {
  const translations = {
    // 花の特徴
    '白い花': 'white flowers with delicate petals',
    '小さい花': 'small delicate flowers',
    '紫の花': 'purple violet flowers',
    '黄色い花': 'bright yellow flowers',
    '赤い花': 'red crimson flowers',
    '青い花': 'blue flowers',
    'ふわふわした花': 'fluffy cotton-like flowers',
    '星みたいな花': 'star-shaped flowers with radiating petals',
    'いい匂いの花': 'fragrant aromatic flowers',
    
    // 葉の特徴
    '葉っぱがハート型': 'heart-shaped leaves',
    'ギザギザの葉': 'serrated jagged-edged leaves',
    '毛深い葉っぱ': 'fuzzy hairy leaves with dense pubescence',
    'でかい葉っぱ': 'large broad leaves',
    '多肉っぽい': 'succulent fleshy leaves',
    
    // 全体的な特徴
    'ヒラヒラしてる': 'delicate drooping parts',
    'ベタベタする': 'sticky resinous surface',
    '垂れ下がってる': 'drooping pendulous branches',
    'シダっぽい': 'fern-like fronds',
    'コケみたい': 'moss-like appearance',
    
    // 環境・場所
    '道端': 'roadside habitat',
    '雑草': 'weedy wild plant',
    'よく見る雑草': 'common roadside weed',
    '水辺にある': 'aquatic wetland plant',
    
    // 季節・時期
    '春': 'spring blooming season',
    '夏': 'summer flowering period',
    '秋': 'autumn fruiting season',
    '冬': 'winter dormant period',
    
    // サイズ・形状
    '大きい': 'large-sized',
    '小さい': 'small compact',
    '背が高い': 'tall upright growth',
    '低い': 'low growing prostrate',
    '這う': 'creeping ground-covering',
    
    // 植物タイプ
    '木': 'woody tree',
    '草': 'herbaceous plant',
    
    // 色の詳細
    '黄色くて小さい': 'small bright yellow',
    '白っぽい': 'whitish pale colored',
    '紫っぽい': 'purplish violet tinted',
    
    // 植物部位
    '葉': 'foliage leaves',
    '花': 'blooming flowers',
    '実': 'fruits berries',
    '種': 'seeds',
    '赤い実がなる': 'producing red berries',
    
    // 生態
    '虫がよく来る': 'attracting insects pollinator-friendly',
    
    // 追加の形態的特徴
    '単葉': 'simple leaves',
    '複葉': 'compound leaves',
    '羽状複葉': 'pinnately compound leaves',
    '掌状複葉': 'palmately compound leaves',
    '鋸歯': 'serrated margins',
    '全縁': 'entire margins',
    '心形葉': 'cordate heart-shaped leaves',
    '卵形葉': 'ovate egg-shaped leaves',
    '線形葉': 'linear narrow leaves',
    '円形葉': 'round circular leaves',
    '掌状分裂': 'palmately lobed',
    '羽状分裂': 'pinnately lobed',
    
    // 茎の特徴
    '直立': 'upright erect stem',
    '匍匐': 'creeping prostrate stem',
    '蔓性': 'climbing vine',
    '中空': 'hollow stem',
    '木質化': 'woody lignified',
    '草質': 'herbaceous soft',
    
    // 花の詳細特徴
    '合弁花': 'fused petals',
    '離弁花': 'separate petals',
    '両性花': 'hermaphroditic flowers',
    '単性花': 'unisexual flowers',
    '頭状花序': 'head inflorescence',
    '穂状花序': 'spike inflorescence',
    '総状花序': 'raceme inflorescence',
    '散房花序': 'corymb inflorescence',
    '散形花序': 'umbel inflorescence',
    
    // 果実の特徴
    '液果': 'berry fruits',
    '核果': 'drupe stone fruits',
    '蒴果': 'capsule fruits',
    '豆果': 'legume pod fruits',
    '翼果': 'winged samara fruits',
    '痩果': 'achene dry fruits',
    
    // 根の特徴
    '直根': 'taproot system',
    '髭根': 'fibrous root system',
    '塊根': 'tuberous roots',
    '気根': 'aerial roots',
    
    // 質感・表面
    '光沢のある': 'glossy shiny surface',
    'ビロード状': 'velvety pubescent',
    'ザラザラ': 'rough textured surface',
    'ツルツル': 'smooth surface',
    'ワックス質': 'waxy coating',
    
    // 生育特性
    '常緑': 'evergreen persistent foliage',
    '落葉': 'deciduous seasonal leaf drop',
    '一年草': 'annual plant lifecycle',
    '二年草': 'biennial plant lifecycle',
    '多年草': 'perennial plant lifecycle',
    '球根': 'bulbous underground storage',
    '地下茎': 'underground rhizome',
    
    // 環境適応
    '耐寒性': 'cold hardy frost tolerant',
    '耐暑性': 'heat tolerant',
    '耐陰性': 'shade tolerant',
    '耐乾性': 'drought tolerant',
    '湿生': 'moisture loving hydrophytic',
    '塩生': 'salt tolerant halophytic'
  };

  let englishFeatures = features;
  Object.entries(translations).forEach(([jp, en]) => {
    englishFeatures = englishFeatures.replace(new RegExp(jp, 'g'), en);
  });

  return englishFeatures;
}

// 植物検索用LLM API呼び出し
async function callPlantSearchAPI(searchQuery, region = 'japan') {
  const sanitizedQuery = sanitizeInput(searchQuery);
  
  return await retryWithExponentialBackoff(async () => {
    return await callPlantSearchAPIInternal(sanitizedQuery, region);
  }, 3, 1000);
}

// 内部API呼び出し関数
async function callPlantSearchAPIInternal(searchQuery, region = 'japan') {
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  // 地域設定に基づく緩和された制限テキスト（より実用的に調整）
  const regionTexts = {
    'japan': '主に日本国内で見られる植物を中心に検索し、日本で一般的に見かける帰化植物や栽培植物も含めて検索対象とする',
    'southeast-asia': '主に東南アジア地域で見られる植物を中心に検索し、地域で一般的な栽培植物も含めて検索対象とする',
    'north-america': '主に北米大陸で見られる植物を中心に検索し、地域で一般的な栽培植物も含めて検索対象とする'
  };

  // 地域別の具体例
  const regionExamples = {
    'japan': '例：サクラ、ツツジ、カエデ、ワラビ、スギ、ヒノキ、タンポポ、クローバー、コスモス等',
    'southeast-asia': '例：ラフレシア、バナナ、マンゴー、ランブータン、バンブー、プルメリア、ハイビスカス等',
    'north-america': '例：セコイア、メープル、ワイルドフラワー、サボテン、ユッカ、ブルーベリー、オーク等'
  };

  const regionRestriction = regionTexts[region] || regionTexts['japan'];
  const regionExample = regionExamples[region] || regionExamples['japan'];
  
  console.log('🌍 callPlantSearchAPI地域設定:', {
    inputRegion: region,
    resolvedRegionRestriction: regionRestriction,
    regionExample: regionExample,
    availableRegions: Object.keys(regionTexts)
  });
  
  const messages = [
    {
      role: "system", 
      content: `あなたは植物学の専門家です。ユーザーの植物の説明から、該当する可能性のある植物を特定し、必ずJSON形式で返してください。

## 地域設定 🌍
${regionRestriction}

${regionExample}

## 検索結果の多様性を確保：
**重要**: ユーザーの曖昧な説明に基づいて、可能性のある植物を幅広く提案してください。1つの特徴でも複数の植物種が該当する可能性があります。より多くの選択肢を提供することで、ユーザーが正確な植物を見つけやすくなります。

## 曖昧な表現の解釈ガイド：
- 「ふわふわ」→ 綿毛状、柔毛、穂状花序など（エニシダ、ススキ、ガマ、ワタスギギク、ネコヤナギなど複数可能性）
- 「ヒラヒラ」→ 薄い花弁、風に揺れる葉、垂れ下がる形状（サクラ、コスモス、シダレザクラ、ポピーなど）
- 「ベタベタ」→ 樹液分泌、粘性のある葉、虫を捕らえる（モウセンゴケ、ウツボカズラ、松脂など）
- 「毛深い」→ 有毛、絨毛、密生した細毛（ヤツデ、ビロードモウズイカ、ラムズイヤーなど）
- 「ギザギザ」→ 鋸歯状、切れ込み、裂片（ケヤキ、バラ、アザミ、クワ、ザクロなど）
- 「多肉っぽい」→ 肉厚な葉、水分貯蔵組織、多肉質（マツバギク、ベンケイソウ、アロエなど）
- 「星みたい」→ 放射状、星型花冠、掌状分裂（アサガオ、ペチュニア、フクロウソウなど）
- 「ハート型」→ 心形、心臓形の葉（カタバミ、ハート型クローバー、ヤマイモなど）
- 「でかい」→ 大型、巨大葉、高木（オオバギボウシ、フキ、パンパスグラス、ケヤキなど）
- 「よく見る雑草」→ 帰化植物、路傍植物、都市雑草（タンポポ、ドクダミ、オオバコ、ヨモギ、スズメノカタビラなど）

## 色の表現：
- 「白っぽい」「薄い色」→ 淡色、クリーム色、薄紫なども含む
- 「紫っぽい」→ 薄紫、青紫、赤紫の幅広い範囲
- 「黄色い」→ 淡黄、濃黄、橙黄も含む

## 環境・季節の手がかり：
- 「道端」「道路脇」→ 路傍植物、耐踏圧性
- 「水辺」→ 湿地植物、水生植物、河畔植物
- 「春に見た」「夏に咲く」→ 開花時期の特定
- 「虫がよく来る」→ 虫媒花、蜜源植物

レスポンス形式（必ず有効なJSONで返してください）：
{
  "plants": [
    {
      "scientificName": "学名（ラテン語）",
      "commonName": "一般的な日本語名",
      "aliases": ["別名1", "別名2"],
      "confidence": 0.85,
      "features": "主な特徴の詳細説明（40-60文字程度で植物の全体的な印象や代表的特徴を記述）",
      "feature1": "形態的特徴：花・葉・茎・根の具体的な形状、大きさ、色、質感などの詳細（40-60文字程度）",
      "feature2": "生態的特徴：生育環境、成長習性、繁殖方法、季節変化などの生活史（40-60文字程度）",
      "feature3": "識別特徴：他の類似植物との区別点、特有の形質、見分け方のポイント（40-60文字程度）",
      "habitat": "生息環境と地域分布の詳細",
      "season": "開花・成長期の詳細",
      "wildlifeConnection": "野生動物との関係の詳細",
      "culturalInfo": "文化的背景や用途の詳細"
    }
  ]
}

## 重要な指針：
1. 必ず完全で有効なJSONを返す
2. JSONの構文エラーを避ける（末尾カンマ禁止、正しい引用符使用）
3. 3-6個の植物候補を提案（多様な可能性を提供するが、多すぎは避ける）
4. confidence値は0.3-0.8の範囲で設定
5. 特徴説明は具体的かつ詳細に（features, feature1, feature2, feature3は各40-60文字程度）
6. 形態的特徴では具体的な色・形・大きさ・質感を記述
7. 生態的特徴では生育習性・環境適応・繁殖戦略を含める
8. 識別特徴では類似種との明確な区別点を示す
9. 曖昧な検索では幅広い解釈から複数候補を提案
10. 似た特徴を持つ近縁種も含めて多様な選択肢を提供`
    },
    {
      role: "user",
      content: `以下の植物の説明から、該当する可能性のある植物を特定してJSON形式で返してください：\n\n${searchQuery}`
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

  console.log('📤 [LLM_REQUEST] Plant Search API Call Started:', {
    timestamp: new Date().toISOString(),
    requestId: requestId,
    region: region,
    queryLength: searchQuery.length,
    model: requestData.model,
    temperature: requestData.temperature,
    maxTokens: requestData.max_completion_tokens,
    messageCount: messages.length,
    systemPromptLength: messages[0].content.length,
    userQuery: searchQuery.substring(0, 100) + (searchQuery.length > 100 ? '...' : ''),
    regionRestriction: regionRestriction.substring(0, 50) + '...'
  });
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    console.log('📤 [LLM_RESPONSE] Plant Search API Response:', {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      status: response.status,
      statusText: response.statusText,
      duration: duration,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      console.error('📤 [LLM_ERROR] Plant Search API Failed:', {
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
    
    // より詳細なレスポンス構造のログ出力
    console.log('📥 [LLM_SUCCESS] Plant Search Results Received - Full Structure:', {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      duration: duration,
      region: region,
      dataKeys: Object.keys(data),
      hasChoices: !!(data.choices && data.choices.length > 0),
      hasAnswer: !!data.answer,
      hasResult: !!data.result,
      hasResponse: !!data.response,
      choicesCount: data.choices?.length || 0,
      // レスポンス内容をより詳しくログ
      responseContent: {
        choices: data.choices ? 'present' : 'missing',
        answer: data.answer ? 'present' : 'missing',
        result: data.result ? 'present' : 'missing',
        response: data.response ? 'present' : 'missing'
      },
      fullDataSample: JSON.stringify(data).substring(0, 500) + '...'
    });
    
    // 複数のレスポンス形式に対応した柔軟な解析
    let responseText = null;
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      responseText = data.choices[0].message.content;
      console.log('📥 [LLM_PARSE] Using data.choices[0].message.content');
    } else if (data.answer) {
      responseText = data.answer;
      console.log('📥 [LLM_PARSE] Using data.answer');
    } else if (data.result && data.result.response) {
      responseText = data.result.response;
      console.log('📥 [LLM_PARSE] Using data.result.response');
    } else if (data.response) {
      responseText = data.response;
      console.log('📥 [LLM_PARSE] Using data.response');
    } else if (typeof data === 'string') {
      responseText = data;
      console.log('📥 [LLM_PARSE] Using raw string data');
    } else {
      // 最後の手段：data内のテキスト文字列を探索
      const findTextContent = (obj, path = '') => {
        if (typeof obj === 'string' && obj.length > 10) {
          console.log(`📥 [LLM_PARSE] Found text content at: ${path}`);
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
    
    console.log('📥 [LLM_PARSE] Response text extracted successfully:', {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      responseLength: responseText?.length || 0,
      responsePreview: responseText?.substring(0, 300) + '...'
    });
    
    return parsePlantSearchResponse(responseText);
    
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.error('📤 [LLM_EXCEPTION] Plant Search API Exception:', {
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

// validatePlantData関数は削除（app_old.jsではシンプルなチェックのみ）

// 複雑なsafeJsonParse関数は削除（app_old.jsでは標準のJSON.parseのみ）

// getImprovedDefaultPlantData関数は削除（app_old.jsではシンプルなフォールバック）

async function retryWithExponentialBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        console.log(`🔄 Retry successful on attempt ${attempt + 1}`);
      }
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

// 植物検索レスポンス解析（app_old.jsの実証済みロジックに戻る + 軽微な修復）
function parsePlantSearchResponse(responseText) {
  const sanitizedText = sanitizeInput(responseText);
  
  console.log('🔍 [PARSE_START] Starting response parsing:', {
    responseLength: sanitizedText.length,
    responsePreview: sanitizedText.substring(0, 200) + '...',
    containsJSON: sanitizedText.includes('{') && sanitizedText.includes('}')
  });
  
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
          console.log('✅ [JSON_REPAIR] Minimal repair successful');
        } catch (repairError) {
          console.warn('🔧 [JSON_REPAIR] Minimal repair failed, using fallback');
          throw repairError;
        }
      }
      
      if (parsed && parsed.plants && Array.isArray(parsed.plants)) {
        console.log('🌱 解析された植物データ:', {
          植物数: parsed.plants.length,
          植物名リスト: parsed.plants.map(p => p.commonName || p.scientificName),
          各植物の生息環境: parsed.plants.map(p => ({ 
            名前: p.commonName, 
            生息環境: p.habitat?.substring(0, 100) 
          }))
        });
        
        // 検証とサニタイゼーション（最小限）
        const validatedPlants = parsed.plants
          .filter(plant => plant && plant.scientificName && plant.commonName)
          .slice(0, 15)
          .map(plant => ({
            scientificName: sanitizeInput(plant.scientificName),
            commonName: sanitizeInput(plant.commonName),
            aliases: Array.isArray(plant.aliases) ? plant.aliases.slice(0, 5).map(sanitizeInput) : [],
            confidence: Math.max(0, Math.min(1, plant.confidence || 0.5)),
            features: sanitizeInput(plant.features || ''),
            feature1: sanitizeInput(plant.feature1 || ''),
            feature2: sanitizeInput(plant.feature2 || ''),
            feature3: sanitizeInput(plant.feature3 || ''),
            habitat: sanitizeInput(plant.habitat || ''),
            season: sanitizeInput(plant.season || ''),
            wildlifeConnection: sanitizeInput(plant.wildlifeConnection || ''),
            culturalInfo: sanitizeInput(plant.culturalInfo || '')
          }));
        
        if (validatedPlants.length > 0) {
          return validatedPlants;
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
    features: "APIからの応答を正しく解析できませんでした。より具体的な植物の特徴を追加して再検索してください。",
    feature1: "検索のコツ: 花の色と形を具体的に（例：「小さい白い花」）",
    feature2: "検索のコツ: 葉の特徴を詳しく（例：「ハート型の葉」）", 
    feature3: "検索のコツ: 環境を含める（例：「道端でよく見る」）",
    habitat: "より具体的な特徴で再検索をお試しください",
    season: "季節情報も追加してください",
    wildlifeConnection: "「虫がよく来る」「鳥が実を食べる」なども有効です",
    culturalInfo: "システム: API応答の形式を確認中です"
  }];
}

// 植物検索用のLLM処理システム
class PlantSearchLLM {
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


  // 植物検索実行
  async searchPlants(searchQuery, region = 'japan') {
    console.log('🔍 PlantSearchLLM.searchPlants呼び出し:', {
      searchQuery: searchQuery,
      region: region,
      使用するAPI: 'callPlantSearchAPI'
    });
    
    return await callPlantSearchAPI(searchQuery, region);
  }


  // 植物画像生成（新しいReplicate API使用）
  async generatePlantImage(plantInfo, style = 'botanical', model = 'minimax', imageOptions = {}) {
    console.log('🎯 PlantSearchLLM.generatePlantImage呼び出し:', {
      plantInfo: plantInfo,
      style: style,
      model: model,
      imageOptions: imageOptions,
      replicateWorkerUrl: this.replicateWorkerUrl
    });

    try {
      // プロンプトの詳細ログ出力
      const prompt = createPlantImagePrompt(plantInfo, style, imageOptions.seed);
      console.log('🎯 Generated plant image prompt:', prompt);
      console.log('🎯 Plant info:', plantInfo);
      console.log('🎯 Style:', style, 'Model:', model, 'Options:', imageOptions);
      
      const result = await generatePlantImage(plantInfo, style, this.replicateWorkerUrl, model, imageOptions);
      console.log('🎯 画像生成結果:', result);
      return result;
    } catch (error) {
      console.error('🎯 植物画像生成エラー:', error);
      
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

// PlantDictionaryApp クラスは index.html で定義されています


// エクスポート用のグローバル変数
if (typeof window !== 'undefined') {
  window.ReplicateImageClient = ReplicateImageClient;
  window.generatePlantImage = generatePlantImage;
  window.createPlantImagePrompt = createPlantImagePrompt;
  window.checkPromptStyleKeywords = checkPromptStyleKeywords;
  window.extractStyleFromDraft = extractStyleFromDraft;
  window.getStyleKeywords = getStyleKeywords;
  window.checkStyleStrength = checkStyleStrength;
  window.enhanceStyleInPrompt = enhanceStyleInPrompt;
  window.translateFeaturesToEnglish = translateFeaturesToEnglish;
  window.callPlantSearchAPI = callPlantSearchAPI;
  window.parsePlantSearchResponse = parsePlantSearchResponse;
  window.PlantSearchLLM = PlantSearchLLM;
  window.PlantImageStorage = PlantImageStorage;
  window.saveImageToStorage = saveImageToStorage;
  window.containsJapanese = containsJapanese;
  window.sanitizeInput = sanitizeInput;
  window.retryWithExponentialBackoff = retryWithExponentialBackoff;
} 