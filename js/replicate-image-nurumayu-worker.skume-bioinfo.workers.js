/**
 * AI危険生物辞典 画像生成 Worker JavaScript
 * LLMを活用した危険生物検索ツール with Replicate API画像生成
 * 画像生成関連機能
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
        seed: imageOptions.seed
      };
      result = await client.generateImageSDXL(optimizedPrompt, sdxlOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        return {
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
      } else if (result.output) {
        return {
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
        return {
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
      } else if (result.output) {
        return {
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
        return {
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
      } else if (result.output) {
        return {
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
      } else {
        throw new Error('画像URLが返されませんでした');
      }
    } else {
      // Minimax使用（デフォルト）- アスペクト比指定可能
      const minimaxOptions = {
        aspectRatio: imageOptions.aspectRatio || "1:1",
        seed: imageOptions.seed,
        negative_prompt: imageOptions.negativePrompt || "text, words, letters, writing, watermark, signature, labels, captions, annotations, typography, symbols, numbers"
      };
      result = await client.generateImageMinimax(optimizedPrompt, minimaxOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        return {
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
      } else if (result.output) {
        return {
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
      wasActuallyOptimized: false,
      hasJapanese: containsJapanese(optimizedPrompt || draftPrompt),
      styleStrength: 0,
      sessionId: sessionId,
      duration: totalDuration
    };
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
          `A traditional fictional encyclopedia drawing of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `A highly detailed scientific illustration of ${dangerousInfo.scientificName}`,
          `A traditional naturalist drawing of ${dangerousInfo.scientificName}`,
          `A detailed scientific plate depicting ${dangerousInfo.scientificName}`,
          `A classical biological illustration of ${dangerousInfo.scientificName}`,
          `A traditional scientific encyclopedia drawing of ${dangerousInfo.scientificName}`
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
          `An anime-style fantasy monster artwork of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `An anime-style creature illustration of ${dangerousInfo.scientificName}`,
          `A manga-inspired artwork featuring ${dangerousInfo.scientificName}`,
          `A traditional anime drawing of ${dangerousInfo.scientificName}`,
          `A classic Japanese anime illustration of ${dangerousInfo.scientificName}`,
          `An anime-style tribute artwork of ${dangerousInfo.scientificName}`
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
          `A professional realistic fantasy creature photography of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `A photorealistic depiction of ${dangerousInfo.scientificName}`,
          `A hyper-realistic biological creature image of ${dangerousInfo.scientificName}`,
          `A high-resolution realistic photograph of ${dangerousInfo.scientificName}`,
          `A detailed photographic-style documentation of ${dangerousInfo.scientificName}`,
          `A professional realistic nature photography of ${dangerousInfo.scientificName}`
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
          `A detailed fictional creature portrait of ${dangerousInfo.scientificName}`
        ];
      } else {
        styleVariations = [
          `A detailed image of ${dangerousInfo.scientificName}`,
          `A beautiful depiction of ${dangerousInfo.scientificName}`,
          `An artistic rendering of ${dangerousInfo.scientificName}`,
          `A biological study of ${dangerousInfo.scientificName}`,
          `A detailed creature portrait of ${dangerousInfo.scientificName}`
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
      stylePrompt = `. A highly detailed traditional dangerous illustration in classical Edo period style. The image features fine ink outlines combined with delicate watercolor shading using traditional Japanese painting techniques.`;
      break;
    case 'anime':
      stylePrompt = `. Illustrated in authentic Mizuki Shigeru art style with characteristic dangerous aesthetics and bold, distinctive colors typical of GeGeGe no Kitaro series.`;
      break;
    case 'realistic':
      stylePrompt = `. Captured as a highly detailed, photorealistic supernatural creature image with documentary photography quality.`;
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
        ', traditional dangerous encyclopedia illustration composition'
      ];
      break;
    case 'anime':
      compositions = [
        ', traditional centered composition with mystical dangerous presentation',
        ', anime close-up focusing on supernatural features with eerie effects',
        ', dynamic diagonal composition typical of dangerous manga panels',
        ', artistic traditional manga style with mysterious dangerous arrangement',
        ', Mizuki Shigeru inspired composition with folkloric flow'
      ];
      break;
    case 'realistic':
      compositions = [
        ', professional paranormal photography composition with perfect focus',
        ', supernatural photography close-up with ethereal depth of field',
        ', award-winning cryptid photography layout',
        ', expert supernatural shot highlighting dangerous textures and details',
        ', professional paranormal documentary style composition'
      ];
      break;
    default:
      compositions = [
        ', centered composition with full dangerous view',
        ', close-up detail view focusing on supernatural features',
        ', diagonal composition showing dangerous structure',
        ', artistic angled view with mystical depth',
        ', side profile view highlighting dangerous silhouette'
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

// セキュリティとバリデーション用ユーティリティ関数
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
    .substring(0, 3000);
}

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

// エクスポート用のグローバル変数
if (typeof window !== 'undefined') {
  window.ReplicateImageClient = ReplicateImageClient;
  window.generatedangerousImage = generatedangerousImage;
  window.optimizeImagePrompt = optimizeImagePrompt;
  window.createdangerousImagePrompt = createdangerousImagePrompt;
  window.checkPromptStyleKeywords = checkPromptStyleKeywords;
  window.extractStyleFromDraft = extractStyleFromDraft;
  window.getStyleKeywords = getStyleKeywords;
  window.checkStyleStrength = checkStyleStrength;
  window.enhanceStyleInPrompt = enhanceStyleInPrompt;
  window.translateFeaturesToEnglish = translateFeaturesToEnglish;
  window.containsJapanese = containsJapanese;
  window.sanitizeInput = sanitizeInput;
  window.retryWithExponentialBackoff = retryWithExponentialBackoff;
} 