/**
 * AI妖怪辞典 JavaScript
 * LLMを活用した妖怪検索ツール with Replicate API画像生成
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



    try {
      const response = await fetch(this.workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

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
      const duration = Math.round(performance.now() - startTime);
      

      
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
- Keep ALL yokai/creature specific features and characteristics
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
        
        cleanPrompt = `A detailed yokai illustration in ${style} Japanese supernatural creature art style, high resolution, masterpiece quality, clean background, no text`;

      }
      
      return cleanPrompt;
    }
    
    // 日本語が含まれていない場合は元のプロンプトを返す
    return draftPrompt;
  }
}

// ローカルストレージ管理クラス
class YokaiImageStorage {
  constructor() {
    this.storageKey = 'yokaiDictionary_savedImages';
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
        yokaiName: imageData.yokaiName || 'Unknown Yokai',
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

// 妖怪画像生成専用の便利関数
async function generateYokaiImage(yokaiInfo, style = 'traditional', workerUrl, model = 'minimax', imageOptions = {}) {
  const startTime = performance.now();
  const sessionId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  
  const client = new ReplicateImageClient(workerUrl);
  
  // ドラフトプロンプト作成（シードも考慮）
  const seed = imageOptions.seed;
  const draftPrompt = createYokaiImagePrompt(yokaiInfo, style, seed);
  
      // LLMでプロンプトを最適化（妖怪検索と同じWorkerを使用）
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
        await saveImageToStorage(imageResult, yokaiInfo, style);
        
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
        await saveImageToStorage(imageResult, yokaiInfo, style);
        
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
        await saveImageToStorage(imageResult, yokaiInfo, style);
        
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
        await saveImageToStorage(imageResult, yokaiInfo, style);
        
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
async function saveImageToStorage(imageResult, yokaiInfo, style) {
  const startTime = performance.now();
  
  try {
    const storage = new YokaiImageStorage();
    const saveData = {
      imageUrl: imageResult.imageUrl,
      yokaiName: yokaiInfo.commonName || yokaiInfo.scientificName,
      scientificName: yokaiInfo.scientificName,
      commonName: yokaiInfo.commonName,
      prompt: imageResult.prompt,
      style: style,
      model: imageResult.model,
      confidence: yokaiInfo.confidence
    };
    
    const saved = await storage.saveImage(saveData);
    const duration = Math.round(performance.now() - startTime);
    
    if (saved) {
    } else {
      console.warn('🗂️ [STORAGE_FAILED] Image Storage Failed (Unknown Reason):', {
        timestamp: new Date().toISOString(),
        yokaiName: saveData.yokaiName,
        duration: duration
      });
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.error('🗂️ [STORAGE_ERROR] Image Storage Exception:', {
      timestamp: new Date().toISOString(),
      yokaiName: yokaiInfo.commonName || yokaiInfo.scientificName,
      duration: duration,
      errorName: error.name,
      errorMessage: error.message
    });
  }
}

// 妖怪画像プロンプト作成
function createYokaiImagePrompt(yokaiInfo, style, seed = null) {
  // 妖怪固有のハッシュを作成（学名と一般名から）
  const yokaiHash = (yokaiInfo.scientificName + (yokaiInfo.commonName || '')).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // シードと妖怪ハッシュを組み合わせてより多様なバリエーションを作成
  const combinedSeed = seed ? (seed + Math.abs(yokaiHash)) : Math.abs(yokaiHash);
  
  // スタイル別のベースプロンプトバリエーション（スタイル強調）
  let styleVariations = [];
  switch (style) {
    case 'traditional':
      styleVariations = [
        `A highly detailed Edo period yokai illustration of ${yokaiInfo.scientificName}`,
        `A traditional Japanese yokai painting of ${yokaiInfo.scientificName}`,
        `A detailed yokai scroll artwork depicting ${yokaiInfo.scientificName}`,
        `A classical Japanese monster illustration of ${yokaiInfo.scientificName}`,
        `A traditional yokai encyclopedia drawing of ${yokaiInfo.scientificName}`,
        `An ancient Japanese demon artwork of ${yokaiInfo.scientificName}`,
        `A historical yokai documentation of ${yokaiInfo.scientificName}`,
        `A traditional Japanese spirit illustration of ${yokaiInfo.scientificName}`,
        `A detailed yokai bestiary plate showing ${yokaiInfo.scientificName}`,
        `A vintage Japanese folklore drawing of ${yokaiInfo.scientificName}`
      ];
      break;
    case 'anime':
      styleVariations = [
        `A Mizuki Shigeru style yokai illustration of ${yokaiInfo.scientificName}`,
        `A GeGeGe no Kitaro inspired artwork featuring ${yokaiInfo.scientificName}`,
        `A traditional yokai manga drawing of ${yokaiInfo.scientificName}`,
        `A classic Japanese monster anime illustration of ${yokaiInfo.scientificName}`,
        `A Shigeru Mizuki tribute artwork of ${yokaiInfo.scientificName}`,
        `A vintage yokai manga style drawing of ${yokaiInfo.scientificName}`,
        `A traditional Japanese spirit anime art depicting ${yokaiInfo.scientificName}`,
        `A classic yokai animation illustration of ${yokaiInfo.scientificName}`,
        `A retro Japanese monster artwork of ${yokaiInfo.scientificName}`,
        `A traditional demon manga-style drawing of ${yokaiInfo.scientificName}`
      ];
      break;
    case 'realistic':
      styleVariations = [
        `A photorealistic depiction of ${yokaiInfo.scientificName}`,
        `A hyper-realistic supernatural creature image of ${yokaiInfo.scientificName}`,
        `A high-resolution realistic yokai photograph of ${yokaiInfo.scientificName}`,
        `A detailed photographic-style documentation of ${yokaiInfo.scientificName}`,
        `A professional realistic monster photography of ${yokaiInfo.scientificName}`,
        `A lifelike supernatural being photograph of ${yokaiInfo.scientificName}`,
        `A crystal-clear realistic image of ${yokaiInfo.scientificName}`,
        `A realistic yokai creature photography of ${yokaiInfo.scientificName}`,
        `An ultra-detailed realistic supernatural photo of ${yokaiInfo.scientificName}`,
        `A high-definition realistic monster photograph of ${yokaiInfo.scientificName}`
      ];
      break;
    default:
      styleVariations = [
        `A detailed image of ${yokaiInfo.scientificName}`,
        `A beautiful depiction of ${yokaiInfo.scientificName}`,
        `An artistic rendering of ${yokaiInfo.scientificName}`,
        `A supernatural study of ${yokaiInfo.scientificName}`,
        `A detailed yokai portrait of ${yokaiInfo.scientificName}`,
        `A folklore documentation of ${yokaiInfo.scientificName}`,
        `A yokai visualization of ${yokaiInfo.scientificName}`,
        `A supernatural creature image of ${yokaiInfo.scientificName}`,
        `A detailed yokai view of ${yokaiInfo.scientificName}`,
        `A folklore history illustration of ${yokaiInfo.scientificName}`
      ];
  }
  
  // 組み合わせシードを使ってバリエーションを選択
  const variationIndex = combinedSeed % styleVariations.length;
  let basePrompt = styleVariations[variationIndex];
  
  // 一般名があれば追加
  if (yokaiInfo.commonName) {
    basePrompt += ` (commonly known as ${yokaiInfo.commonName})`;
  }

  // スタイル別の妖怪特徴表現
  let featuresPrompt = '';
  
  // 総合的な特徴説明
  if (yokaiInfo.features) {
    const translatedFeatures = translateFeaturesToEnglish(yokaiInfo.features);
    switch (style) {
      case 'traditional':
        featuresPrompt = `, traditionally showcasing ${translatedFeatures}`;
        break;
      case 'anime':
        featuresPrompt = `, beautifully displaying ${translatedFeatures} with supernatural enhancement`;
        break;
      case 'realistic':
        featuresPrompt = `, realistically capturing ${translatedFeatures} in supernatural detail`;
        break;
      default:
        featuresPrompt = `, featuring ${translatedFeatures}`;
    }
  }
  
  // 3つの個別特徴を詳細に追加
  const specificFeatures = [];
  if (yokaiInfo.feature1) {
    const morphological = translateFeaturesToEnglish(yokaiInfo.feature1);
    switch (style) {
      case 'traditional':
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
  if (yokaiInfo.feature2) {
    const ecological = translateFeaturesToEnglish(yokaiInfo.feature2);
    switch (style) {
      case 'traditional':
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
  if (yokaiInfo.feature3) {
    const distinctive = translateFeaturesToEnglish(yokaiInfo.feature3);
    switch (style) {
      case 'traditional':
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
  
  // 妖怪固有の識別子を追加（学名の一部を含める）
  const scientificParts = yokaiInfo.scientificName.split(' ');
  if (scientificParts.length >= 2) {
    featuresPrompt += `, characteristic of ${scientificParts[0]} genus ${scientificParts[1]} species`;
  }

  // スタイル別の生育環境表現
  let habitatPrompt = '';
  if (yokaiInfo.habitat) {
    const translatedHabitat = translateFeaturesToEnglish(yokaiInfo.habitat);
    switch (style) {
      case 'traditional':
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
  if (yokaiInfo.season) {
    const translatedSeason = translateFeaturesToEnglish(yokaiInfo.season);
    switch (style) {
      case 'traditional':
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
    case 'traditional':
              lightingPrompt = ', depicted with even, diffused lighting ideal for folkloric illustration, clear visibility of all supernatural details, academic documentation standard';
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

  // スタイルに応じたプロンプト（より具体的で妖怪に特化）
  let stylePrompt = '';
  switch (style) {
    case 'traditional':
      stylePrompt = `. A highly detailed traditional yokai illustration in classical Edo period style. The image features fine ink outlines combined with delicate watercolor shading using traditional Japanese painting techniques. Each supernatural characteristic is rendered with folkloric accuracy, showing intricate details of supernatural features and mystical elements. The background is pure white, with no shadows or textures. The style is reminiscent of 18th to 19th century yokai scrolls and demon encyclopedias, with precise, traditional aesthetics and clean composition. Pure visual yokai art without any text or labels.`;
      break;
    case 'anime':
      stylePrompt = `. Illustrated in authentic Mizuki Shigeru art style with characteristic yokai aesthetics and bold, distinctive colors typical of GeGeGe no Kitaro series. Clean vector-like outlines with precise lineart, supernatural color palettes typical of traditional yokai manga aesthetics. The yokai maintains folkloric accuracy while being stylized with traditional Japanese monster art charm and artistic flair. Features mystical backgrounds, supernatural lighting effects on creature features, and an appealing traditional yokai manga visual style. Digital art finish with smooth textures and eerie lighting effects reminiscent of classic Japanese monster illustrations. Pure Japanese yokai animation-style illustration without text or writing.`;
      break;
    case 'realistic':
      stylePrompt = `. Captured as a highly detailed, photorealistic supernatural creature image with documentary photography quality. Crystal clear focus showing minute details like supernatural textures, ethereal features, mystical characteristics, and otherworldly imperfections. Professional paranormal photography with excellent depth of field, supernatural color reproduction, and lifelike supernatural appearance. Include environmental context showing the yokai's natural haunting conditions. Shot with high-end supernatural photography techniques. Clean paranormal photography without any text overlays or watermarks.`;
      break;
    default:
      stylePrompt = '. Beautifully rendered with accurate folkloric details, supernatural colors, excellent lighting, and clear definition of yokai characteristics.';
  }

  // スタイル別の構図バリエーション
  let compositionPrompt = '';
  let compositions = [];
  
  switch (style) {
    case 'traditional':
      compositions = [
        ', centered traditional composition with full yokai specimen view',
        ', detailed folkloric study focusing on supernatural characteristics',
        ', classical demon scroll layout showing yokai anatomy',
        ', traditional documentation presentation with clear supernatural details',
        ', traditional yokai encyclopedia illustration composition',
        ', folkloric documentation style with systematic arrangement',
        ', vintage yokai scroll plate composition',
        ', methodical supernatural survey layout',
        ', traditional yokai classification style arrangement',
        ', systematic folklore documentation presentation'
      ];
      break;
    case 'anime':
      compositions = [
        ', traditional centered composition with mystical yokai presentation',
        ', anime close-up focusing on supernatural features with eerie effects',
        ', dynamic diagonal composition typical of yokai manga panels',
        ', artistic traditional manga style with mysterious yokai arrangement',
        ', Mizuki Shigeru inspired composition with folkloric flow',
        ', traditional yokai scene with enchanting supernatural display',
        ', classic yokai manga composition with distinctive creature art',
        ', manga-style supernatural illustration with traditional flair',
        ', anime yokai art composition showing creature mystery',
        ', Japanese traditional yokai animation style composition'
      ];
      break;
    case 'realistic':
      compositions = [
        ', professional paranormal photography composition with perfect focus',
        ', supernatural photography close-up with ethereal depth of field',
        ', award-winning cryptid photography layout',
        ', expert supernatural shot highlighting yokai textures and details',
        ', professional paranormal documentary style composition',
        ', high-end supernatural photography with environmental context',
        ', paranormal photography masterpiece with crystal clear details',
        ', supernatural photographer\'s artistic composition',
        ', professional yokai photography with perfect lighting',
        ', supernatural macro photography with folkloric accuracy'
      ];
      break;
    default:
      compositions = [
        ', centered composition with full yokai view',
        ', close-up detail view focusing on supernatural features',
        ', diagonal composition showing yokai structure',
        ', artistic angled view with mystical depth',
        ', side profile view highlighting yokai silhouette',
        ', supernatural photography focusing on distinctive features',
        ', three-quarter view showing yokai anatomy',
        ', overhead view displaying supernatural characteristics',
        ', low angle view emphasizing yokai presence',
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
      qualityPrompt = ' High resolution, folkloric accurate yokai details, precise supernatural anatomy, traditional quality, vintage yokai encyclopedia masterpiece';
      noTextPrompt = ', completely clean yokai illustration without any text, labels, watermarks, or written annotations, pure visual yokai art';
      break;
    case 'anime':
      qualityPrompt = ' High resolution, vibrant yokai anime art quality, perfect traditional technique, Mizuki Shigeru level detail, traditional yokai aesthetic masterpiece';
      noTextPrompt = ', clean yokai anime illustration without any text overlays, speech bubbles, or written content, pure Japanese yokai animation art style';
      break;
    case 'realistic':
      qualityPrompt = ' Ultra-high resolution, supernatural photography quality, crystal clear yokai details, professional paranormal photography, award-winning supernatural photographic masterpiece';
      noTextPrompt = ', supernatural photography without any text, labels, watermarks, or digital overlays, pure paranormal photographic documentation';
      break;
    default:
      qualityPrompt = ' High resolution, folkloric accurate, detailed yokai anatomy, professional quality, masterpiece';
      noTextPrompt = ', no text, no words, no letters, no watermarks, no labels, clean image without any written content';
  }

  const finalPrompt = basePrompt + featuresPrompt + habitatPrompt + seasonPrompt + lightingPrompt + compositionPrompt + stylePrompt + qualityPrompt + noTextPrompt;
  
  return finalPrompt;
}

// プロンプト内のスタイルキーワードをチェック
function checkPromptStyleKeywords(prompt, style) {
  const styleKeywords = {
    'traditional': ['traditional', 'folkloric style', 'yokai scroll', 'watercolor', 'traditional illustration'],
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
    'traditional': ['traditional illustration', 'traditional', 'folkloric style', 'yokai scroll', 'watercolor', 'ink outlines', 'academic', 'demon documentation'],
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
    'traditional': ' Rendered as a classical folkloric illustration with documentary accuracy, fine ink lineart, and delicate watercolor techniques in the style of vintage yokai scrolls.',
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

// 日本語妖怪特徴を英語に変換
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
    
    // 妖怪タイプ
    '木': 'tree spirit',
    '草': 'nature spirit',
    
    // 色の詳細
    '黄色くて小さい': 'small bright yellow glowing',
    '白っぽい': 'whitish pale ghostly',
    '紫っぽい': 'purplish mystical tinted',
    
    // 妖怪部位
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

// 妖怪検索用LLM API呼び出し
async function callYokaiSearchAPI(searchQuery, region = 'japan') {
  const sanitizedQuery = sanitizeInput(searchQuery);
  
  return await retryWithExponentialBackoff(async () => {
    return await callYokaiSearchAPIInternal(sanitizedQuery, region);
  }, 3, 1000);
}

// 内部API呼び出し関数
async function callYokaiSearchAPIInternal(searchQuery, region = 'japan') {
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  // 地域設定に基づく緩和された制限テキスト（より実用的に調整）
  const regionTexts = {
    'japan': '主に日本国内で見られる妖怪を中心に検索し、日本で一般的に知られる伝承や民話の妖怪も含めて検索対象とする',
    'southeast-asia': '主に東南アジア地域で見られる妖怪を中心に検索し、地域で一般的な精霊や超自然的存在も含めて検索対象とする',
    'north-america': '主にヨーロッパ・北米大陸で見られる妖怪を中心に検索し、地域で一般的な怪物や超自然的存在も含めて検索対象とする'
  };

  // 地域別の具体例
  const regionExamples = {
    'japan': '例：鬼、天狗、河童、雪女、座敷わらし、のっぺらぼう、ろくろ首、猫又、狐の妖怪、一つ目小僧等',
    'southeast-asia': '例：アスワン、ペナンガラン、ポンティアナック、アップ、マナナンガル、ティクバラン等',
    'north-america': '例：ビッグフット、チュパカブラ、ウェンディゴ、スキンウォーカー、ジャージーデビル、モスマン等'
  };

  const regionRestriction = regionTexts[region] || regionTexts['japan'];
  const regionExample = regionExamples[region] || regionExamples['japan'];
  
  const messages = [
    {
      role: "system", 
      content: `あなたは妖怪学の専門家です。ユーザーの妖怪の説明から、該当する可能性のある妖怪を特定し、必ずJSON形式で返してください。

## 地域設定 🌍
${regionRestriction}

${regionExample}

## 検索結果の多様性を確保：
**重要**: ユーザーの曖昧な説明に基づいて、可能性のある妖怪を幅広く提案してください。1つの特徴でも複数の妖怪が該当する可能性があります。より多くの選択肢を提供することで、ユーザーが正確な妖怪を見つけやすくなります。

## 曖昧な表現の解釈ガイド：
- 「毛深い」→ 体毛が多い、獣のような（狼男、猿の妖怪、毛むくじゃらの鬼など複数可能性）
- 「ヒラヒラ」→ 衣装が揺れる、髪が長い、霊的な浮遊感（雪女、幽霊、風の精霊など）
- 「ベタベタ」→ 粘液質、湿った体表、沼地の妖怪（ぬらりひょん、沼の主、粘液系妖怪など）
- 「赤い目」→ 怒り、邪悪、超自然的な光（鬼、悪霊、火の玉系妖怪など）
- 「ギザギザ」→ 鋭い歯、爪、角（鬼、悪魔、獣系妖怪など）
- 「透明な」→ 半透明、霊体、見えにくい（幽霊、精霊、透明妖怪など）
- 「光る」→ 発光、炎、超自然的な輝き（火の玉、鬼火、光る妖怪など）
- 「顔がない」→ のっぺらぼう系、顔が隠れている（のっぺらぼう、覆面妖怪など）
- 「でかい」→ 巨大、大型妖怪（大鬼、巨人系、大型獣妖怪など）
- 「小さい」→ 妖精サイズ、子供のような（座敷わらし、小鬼、妖精系など）

## 色の表現：
- 「白っぽい」「薄い色」→ 淡い霊体、雪のような、骨のような色
- 「紫っぽい」→ 神秘的、魔法的、夜の色合い
- 「黄色い」→ 金色の目、炎のような、光る特徴

## 環境・季節の手がかり：
- 「道端」「道路脇」→ 人里に現れる妖怪、都市伝説系
- 「水辺」→ 川の妖怪、池の主、水神系
- 「春に見た」「夏に現れる」→ 季節限定の妖怪
- 「夜に現れる」→ 夜行性妖怪、幽霊系

レスポンス形式（必ず有効なJSONで返してください）：
{
  "yokai": [
    {
      "scientificName": "学名（ラテン語風分類名）",
      "commonName": "一般的な日本語名",
      "aliases": ["別名1", "別名2"],
      "confidence": 0.85,
      "features": "主な特徴の詳細説明（80-120文字程度で妖怪の全体的な印象や代表的特徴を詳細に記述）",
      "feature1": "体型・顔・手足・色・質感などの具体的な外見詳細（80-120文字程度で詳細に記述）",
      "feature2": "超自然的能力、行動パターン、習性などの特殊能力（80-120文字程度で詳細に記述）",
      "feature3": "他の類似妖怪との区別点、特有の特徴、見分け方のポイント（80-120文字程度で詳細に記述）",
      "habitat": "出現場所と地域分布の詳細",
      "season": "出現時期・活動期の詳細",
      "humanConnection": "人間との関係や影響の詳細",
      "culturalInfo": "文化的背景や伝承の詳細"
    }
  ]
}

## 重要な指針：
1. 必ず完全で有効なJSONを返す
2. JSONの構文エラーを避ける（末尾カンマ禁止、正しい引用符使用）
3. 3-6個の妖怪候補を提案（多様な可能性を提供するが、多すぎは避ける）
4. confidence値は0.3-0.8の範囲で設定
5. 特徴説明は非常に具体的かつ詳細に（features, feature1, feature2, feature3は各80-120文字程度で詳細記述）
6. 外見的特徴では具体的な色・形・大きさ・質感に加え、体の各部位の詳細、動きの特徴、発光や透明感なども含める
7. 能力的特徴では超自然的能力・行動パターン・習性に加え、人間への影響、時間帯による変化、発現条件なども含める
8. 識別特徴では類似妖怪との明確な区別点に加え、独特の音、匂い、痕跡、出現パターンなども詳細に示す
9. 曖昧な検索では幅広い解釈から複数候補を提案
10. 似た特徴を持つ関連妖怪も含めて多様な選択肢を提供

## 詳細記述の例：
**總合的特徴（features）**: 「身長約2メートルの人型妖怪で、長い黒髪が風に靡き、青白い肌から淡い光を放つ。顔は美しい女性の形をしているが、目は真っ黒で瞳孔が見えず、口角が耳まで裂けている。」

**形態的特徴（feature1）**: 「頭部は通常の人間より一回り大きく、額には小さな角が3本生えている。手足は異常に長く、指は6本で先端に鋭い爪がある。体全体が半透明で、光の加減により姿が揺らめく。」

**能力的特徴（feature2）**: 「夜間にのみ活動し、人の恐怖心を察知して現れる。見つめられた者は動けなくなり、甲高い笑い声と共に精神を消耗させる。霧や煙のように姿を消すことができ、壁をすり抜ける。」

**識別特徴（feature3）**: 「類似の女性型妖怪と異なり、現れる際に周囲の温度が急激に下がり、特有の鉄錆びのような匂いを発する。足音は聞こえず、影だけが先行して現れるという独特の出現パターンを持つ。」`
    },
    {
      role: "user",
      content: `以下の妖怪の説明から、該当する可能性のある妖怪を特定してJSON形式で返してください：\n\n${searchQuery}`
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
      
      console.error('📤 [LLM_ERROR] Yokai Search API Failed:', {
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
    
    return parseYokaiSearchResponse(responseText);
    
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    console.error('📤 [LLM_EXCEPTION] Yokai Search API Exception:', {
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

// validateYokaiData関数は削除（app_old.jsではシンプルなチェックのみ）

// 複雑なsafeJsonParse関数は削除（app_old.jsでは標準のJSON.parseのみ）

// getImprovedDefaultYokaiData関数は削除（app_old.jsではシンプルなフォールバック）

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

// 妖怪検索レスポンス解析（app_old.jsの実証済みロジックに戻る + 軽微な修復）
function parseYokaiSearchResponse(responseText) {
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
      
      if (parsed && parsed.yokai && Array.isArray(parsed.yokai)) {
        // 検証とサニタイゼーション（最小限）
        const validatedYokai = parsed.yokai
          .filter(yokai => yokai && yokai.scientificName && yokai.commonName)
          .slice(0, 15)
          .map(yokai => ({
            scientificName: sanitizeInput(yokai.scientificName),
            commonName: sanitizeInput(yokai.commonName),
            aliases: Array.isArray(yokai.aliases) ? yokai.aliases.slice(0, 5).map(sanitizeInput) : [],
            confidence: Math.max(0, Math.min(1, yokai.confidence || 0.5)),
            features: sanitizeInput(yokai.features || ''),
            feature1: sanitizeInput(yokai.feature1 || ''),
            feature2: sanitizeInput(yokai.feature2 || ''),
            feature3: sanitizeInput(yokai.feature3 || ''),
            habitat: sanitizeInput(yokai.habitat || ''),
            season: sanitizeInput(yokai.season || ''),
            humanConnection: sanitizeInput(yokai.humanConnection || ''),
            culturalInfo: sanitizeInput(yokai.culturalInfo || '')
          }));
        
        if (validatedYokai.length > 0) {
          return validatedYokai;
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
    features: "APIからの応答を正しく解析できませんでした。より具体的な妖怪の特徴を追加して再検索してください。",
    feature1: "検索のコツ: 外見の特徴を具体的に（例：「赤い目」「毛深い」）",
    feature2: "検索のコツ: 出現場所を詳しく（例：「水辺で見かけた」「山で見た」）", 
    feature3: "検索のコツ: 行動や能力を含める（例：「夜に現れる」「光る」）",
    habitat: "より具体的な特徴で再検索をお試しください",
    season: "出現時期情報も追加してください",
    humanConnection: "「人を驚かす」「人に憑く」「人を守る」なども有効です",
    culturalInfo: "システム: API応答の形式を確認中です"
  }];
}

// 妖怪検索用のLLM処理システム
class YokaiSearchLLM {
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


  // 妖怪検索実行
  async searchYokai(searchQuery, region = 'japan') {
    return await callYokaiSearchAPI(searchQuery, region);
  }


  // 妖怪画像生成（新しいReplicate API使用）
  async generateYokaiImage(yokaiInfo, style = 'traditional', model = 'minimax', imageOptions = {}) {
    try {
      const result = await generateYokaiImage(yokaiInfo, style, this.replicateWorkerUrl, model, imageOptions);
      return result;
    } catch (error) {
      console.error('🎯 妖怪画像生成エラー:', error);
      
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

// YokaiDictionaryApp クラスは index.html で定義されています


// エクスポート用のグローバル変数
if (typeof window !== 'undefined') {
  window.ReplicateImageClient = ReplicateImageClient;
  window.generateYokaiImage = generateYokaiImage;
  window.createYokaiImagePrompt = createYokaiImagePrompt;
  window.checkPromptStyleKeywords = checkPromptStyleKeywords;
  window.extractStyleFromDraft = extractStyleFromDraft;
  window.getStyleKeywords = getStyleKeywords;
  window.checkStyleStrength = checkStyleStrength;
  window.enhanceStyleInPrompt = enhanceStyleInPrompt;
  window.translateFeaturesToEnglish = translateFeaturesToEnglish;
  window.callYokaiSearchAPI = callYokaiSearchAPI;
  window.parseYokaiSearchResponse = parseYokaiSearchResponse;
  window.YokaiSearchLLM = YokaiSearchLLM;
  window.YokaiImageStorage = YokaiImageStorage;
  window.saveImageToStorage = saveImageToStorage;
  window.containsJapanese = containsJapanese;
  window.sanitizeInput = sanitizeInput;
  window.retryWithExponentialBackoff = retryWithExponentialBackoff;
} 