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
    const requestData = {
      apiUrl: apiUrl,
      payload: payload
    };

    console.log('🔥 画像生成API呼び出し開始:', {
      workerUrl: this.workerUrl,
      apiUrl: apiUrl,
      payload: payload
    });

    const response = await fetch(this.workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    console.log('🔥 Worker API応答ステータス:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('🔥 Worker API呼び出しエラー:', errorData);
      throw new Error(`Worker API呼び出しに失敗: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('🔥 Worker API応答データ:', data);
    
    if (data.error) {
      console.error('🔥 Replicate API内部エラー:', data.error, data.details);
      throw new Error(`Replicate API エラー: ${JSON.stringify(data.details || data.error)}`);
    }

    console.log('🔥 画像生成成功:', data.output ? '画像URLあり' : '画像URLなし');
    return data;
  }
}

// プロンプト最適化用のLLM呼び出し関数
async function optimizeImagePrompt(draftPrompt, workerUrl) {
  const optimizationPrompt = `あなたは画像生成AI（Stable Diffusion、DALL-E、Midjourney等）用のプロンプト最適化の専門家です。

与えられたドラフトプロンプトを以下の条件で最適化してください：

【最適化条件】
1. **完全英語化**: 日本語部分をすべて自然な英語に変換
2. **画像生成最適化**: 画像生成AIが理解しやすい具体的で明確な表現に変更
3. **冗長性の削除**: 重複や不要な部分を削除して簡潔に
4. **視覚的要素の強化**: 色、形、質感、光などの視覚的詳細を強調
5. **専門用語の適切な使用**: 植物学的に正確で画像生成に有効な専門用語を使用

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

    if (!response.ok) {
      throw new Error(`プロンプト最適化API呼び出しに失敗: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result && data.result.response) {
      return data.result.response.trim();
    } else {
      throw new Error('プロンプト最適化レスポンスが無効です');
    }
  } catch (error) {
    console.warn('プロンプト最適化に失敗、元のプロンプトを使用:', error);
    return draftPrompt; // 最適化に失敗した場合は元のプロンプトを返す
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
  console.log('🌱 植物画像生成開始:', {
    plant: plantInfo.commonName || plantInfo.scientificName,
    style: style,
    model: model,
    workerUrl: workerUrl,
    imageOptions: imageOptions
  });

  const client = new ReplicateImageClient(workerUrl);
  
  // ドラフトプロンプト作成（シードも考慮）
  const seed = imageOptions.seed;
  const draftPrompt = createPlantImagePrompt(plantInfo, style, 'day', seed);
  
  console.log('🌱 ドラフトプロンプト:', draftPrompt);
  
  // LLMでプロンプトを最適化（植物検索と同じWorkerを使用）
  const llmWorkerUrl = 'https://nurumayu-ai-api.skume-bioinfo.workers.dev/';
  const optimizedPrompt = await optimizeImagePrompt(draftPrompt, llmWorkerUrl);
  
  console.log('🌱 最適化プロンプト:', optimizedPrompt);
  
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
    console.error(`${model} generation failed:`, error);
    
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
      draftPrompt: draftPrompt
    };
  }
}

// 画像をストレージに保存するヘルパー関数
async function saveImageToStorage(imageResult, plantInfo, style) {
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
    if (saved) {
      console.log('🗂️ 画像が自動保存されました');
    }
  } catch (error) {
    console.warn('🗂️ 自動保存に失敗しました:', error);
  }
}

// 植物画像プロンプト作成
function createPlantImagePrompt(plantInfo, style, time = 'day', seed = null) {
  // 植物の学名と一般名を組み合わせて、より固有のプロンプトベースを作成
  let basePrompt = `A detailed botanical image of ${plantInfo.scientificName}`;
  
  // 植物固有のハッシュを作成（学名と一般名から）
  const plantHash = (plantInfo.scientificName + (plantInfo.commonName || '')).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // シードと植物ハッシュを組み合わせてより多様なバリエーションを作成
  const combinedSeed = seed ? (seed + Math.abs(plantHash)) : Math.abs(plantHash);
  
  // より多くのバリエーションを用意（10個に増加）
  const variations = [
    `A detailed botanical image of ${plantInfo.scientificName}`,
    `A beautiful illustration of ${plantInfo.scientificName}`,
    `An artistic rendering of ${plantInfo.scientificName}`,
    `A botanical study of ${plantInfo.scientificName}`,
    `A detailed plant portrait of ${plantInfo.scientificName}`,
    `A scientific documentation of ${plantInfo.scientificName}`,
    `A nature photography of ${plantInfo.scientificName}`,
    `A botanical specimen image of ${plantInfo.scientificName}`,
    `A field guide illustration of ${plantInfo.scientificName}`,
    `A horticultural display of ${plantInfo.scientificName}`
  ];
  
  // 組み合わせシードを使ってバリエーションを選択
  const variationIndex = combinedSeed % variations.length;
  basePrompt = variations[variationIndex];
  
  // 一般名があれば追加
  if (plantInfo.commonName) {
    basePrompt += ` (commonly known as ${plantInfo.commonName})`;
  }

  // 植物の詳細特徴を英語で追加（より具体的かつ植物固有に）
  let featuresPrompt = '';
  
  // 総合的な特徴説明
  if (plantInfo.features) {
    const translatedFeatures = translateFeaturesToEnglish(plantInfo.features);
    featuresPrompt = `, featuring ${translatedFeatures}`;
  }
  
  // 3つの個別特徴を詳細に追加
  const specificFeatures = [];
  if (plantInfo.feature1) {
    const morphological = translateFeaturesToEnglish(plantInfo.feature1);
    specificFeatures.push(`morphological characteristics: ${morphological}`);
  }
  if (plantInfo.feature2) {
    const ecological = translateFeaturesToEnglish(plantInfo.feature2);
    specificFeatures.push(`ecological traits: ${ecological}`);
  }
  if (plantInfo.feature3) {
    const distinctive = translateFeaturesToEnglish(plantInfo.feature3);
    specificFeatures.push(`distinctive features: ${distinctive}`);
  }
  
  if (specificFeatures.length > 0) {
    featuresPrompt += `, with detailed ${specificFeatures.join(', ')}`;
  }
  
  // 植物固有の識別子を追加（学名の一部を含める）
  const scientificParts = plantInfo.scientificName.split(' ');
  if (scientificParts.length >= 2) {
    featuresPrompt += `, characteristic of ${scientificParts[0]} genus ${scientificParts[1]} species`;
  }

  // 生育環境情報を追加
  let habitatPrompt = '';
  if (plantInfo.habitat) {
    const translatedHabitat = translateFeaturesToEnglish(plantInfo.habitat);
    habitatPrompt = `, typically found in ${translatedHabitat}`;
  }

  // 季節情報を追加
  let seasonPrompt = '';
  if (plantInfo.season) {
    const translatedSeason = translateFeaturesToEnglish(plantInfo.season);
    seasonPrompt = `, ${translatedSeason}`;
  }

  // 時間帯に応じたライティング（より詳細に）
  let lightingPrompt = '';
  switch (time) {
    case 'morning':
      lightingPrompt = ', captured in soft morning light with golden hour illumination, fresh dewdrops on petals and leaves, misty atmospheric background, gentle warm glow';
      break;
    case 'night':
      lightingPrompt = ', photographed under moonlight with subtle artificial lighting, evening atmosphere with cool blue tones, gentle shadows and mysterious ambiance';
      break;
    case 'day':
    default:
      lightingPrompt = ', photographed in bright natural daylight with even illumination, clear visibility of all botanical details, vibrant natural colors';
      break;
  }

  // スタイルに応じたプロンプト（より具体的で植物に特化）
  let stylePrompt = '';
  switch (style) {
    case 'botanical':
      stylePrompt = `. A highly detailed botanical illustration of a plant, in classical scientific style. The image features fine ink outlines combined with delicate watercolor shading using glazing techniques. Each leaf and bud is rendered with botanical accuracy, showing intricate vein patterns and subtle color gradients. The background is pure white, with no shadows or textures. The style is reminiscent of 18th to 19th century botanical field guides, with precise, academic aesthetics and clean composition. Pure visual botanical art without any text or labels.`;
      break;
    case 'anime':
      stylePrompt = `. Illustrated in beautiful anime art style with vibrant colors and soft cel-shading. Clean vector-like lines with bright, saturated colors typical of Japanese animation. The plant maintains botanical accuracy while being stylized with artistic flair. Soft gradients, glowing effects on flowers, and a cheerful, appealing aesthetic. Background with soft bokeh or gradient effects. Digital art finish with smooth textures. Pure illustration without text or writing.`;
      break;
    case 'realistic':
      stylePrompt = `. Captured as a highly detailed, photorealistic image with macro photography quality. Crystal clear focus showing minute details like leaf textures, petal surface patterns, stem structures, and natural imperfections. Professional nature photography with excellent depth of field, natural color reproduction, and lifelike appearance. Include environmental context showing the plant's natural growing conditions. Shot with high-end botanical photography techniques. Clean natural photography without any text overlays or watermarks.`;
      break;
    default:
      stylePrompt = '. Beautifully rendered with accurate botanical details, natural colors, excellent lighting, and clear definition of plant structures.';
  }

  // 植物固有の構図バリエーション（常に適用）
  let compositionPrompt = '';
  const compositions = [
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
  // 組み合わせシードを使って構図を選択（常に適用）
  compositionPrompt = compositions[combinedSeed % compositions.length];

  // 品質向上とテキスト抑制のための追加指示
  const qualityPrompt = ' High resolution, botanically accurate, detailed plant anatomy, professional quality, masterpiece';
  const noTextPrompt = ', no text, no words, no letters, no watermarks, no labels, clean image without any written content';

  const finalPrompt = basePrompt + featuresPrompt + habitatPrompt + seasonPrompt + lightingPrompt + compositionPrompt + stylePrompt + qualityPrompt + noTextPrompt;
  
  // デバッグ用：植物固有の情報をログ出力
  console.log(`🌿 画像プロンプト生成 - ${plantInfo.scientificName}:`, {
    plantHash: plantHash,
    combinedSeed: combinedSeed,
    variationIndex: variationIndex,
    selectedVariation: variations[variationIndex],
    compositionIndex: combinedSeed % compositions.length,
    selectedComposition: compositions[combinedSeed % compositions.length],
    promptLength: finalPrompt.length
  });

  return finalPrompt;
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
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  // 地域設定に基づく厳格な制限テキスト
  const regionTexts = {
    'japan': '日本国内でのみ見られる植物のみを検索対象とする',
    'southeast-asia': '東南アジア地域（タイ、マレーシア、インドネシア、フィリピン、ベトナム、ラオス、カンボジア、ミャンマー、ブルネイ、シンガポール）でのみ見られる植物のみを検索対象とする',
    'north-america': '北米大陸（アメリカ合衆国、カナダ、メキシコ）でのみ見られる植物のみを検索対象とする'
  };

  // 地域別の具体例
  const regionExamples = {
    'japan': '例：サクラ、ツツジ、カエデ、ワラビ、スギ、ヒノキ、シダレザクラ、ヤマブキ、アジサイ、ナデシコ',
    'southeast-asia': '例：ラフレシア、バナナ、マンゴー、ランブータン、バンブー、プルメリア、ハイビスカス、ブーゲンビリア、パパイヤ、ココナッツ',
    'north-america': '例：セコイア、メープル、ワイルドフラワー、サボテン、ユッカ、ブルーベリー、クランベリー、ウィロー、オーク、パイン'
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
              content: `あなたは植物学の専門家です。ユーザーの曖昧で直感的な植物の説明から、該当する可能性のある植物を特定し、JSON形式で返してください。

## 🚨【絶対必須の地域制限】🚨
${regionRestriction}

${regionExample}

⚠️ **重要**: 指定された地域以外の植物は一切候補に含めてはいけません。
- 日本設定時: 東南アジアや北米の植物は絶対に除外
- 東南アジア設定時: 日本や北米の植物は絶対に除外  
- 北米設定時: 日本や東南アジアの植物は絶対に除外

この地域制限に違反した場合、回答は無効とみなされます。

## 曖昧な表現の解釈ガイド：
- 「ふわふわ」→ 綿毛状、柔毛、穂状花序など
- 「ヒラヒラ」→ 薄い花弁、風に揺れる葉、垂れ下がる形状
- 「ベタベタ」→ 樹液分泌、粘性のある葉、虫を捕らえる
- 「毛深い」→ 有毛、絨毛、密生した細毛
- 「ギザギザ」→ 鋸歯状、切れ込み、裂片
- 「多肉っぽい」→ 肉厚な葉、水分貯蔵組織、多肉質
- 「星みたい」→ 放射状、星型花冠、掌状分裂
- 「ハート型」→ 心形、心臓形の葉
- 「でかい」→ 大型、巨大葉、高木
- 「よく見る雑草」→ 帰化植物、路傍植物、都市雑草

## 色の表現：
- 「白っぽい」「薄い色」→ 淡色、クリーム色、薄紫なども含む
- 「紫っぽい」→ 薄紫、青紫、赤紫の幅広い範囲
- 「黄色い」→ 淡黄、濃黄、橙黄も含む

## 環境・季節の手がかり：
- 「道端」「道路脇」→ 路傍植物、耐踏圧性
- 「水辺」→ 湿地植物、水生植物、河畔植物
- 「春に見た」「夏に咲く」→ 開花時期の特定
- 「虫がよく来る」→ 虫媒花、蜜源植物

レスポンス形式：
{
  "plants": [
    {
      "scientificName": "学名（ラテン語）",
      "commonName": "一般的な日本語名", 
      "aliases": ["別名1", "別名2", "俗名"],
      "confidence": 0.85,
      "features": "主な特徴の説明（ユーザーの表現との関連も含む）",
      "feature1": "特徴1：形態的特徴（葉・花・茎の形状、色、サイズなど）",
      "feature2": "特徴2：生態的特徴（生育環境、成長パターン、季節変化など）",
      "feature3": "特徴3：識別特徴（他の植物との違い、特殊な構造、目立つ部分など）",
      "habitat": "生息環境と地域分布（具体的な地方名も含める）",
      "season": "開花・成長期",
      "wildlifeConnection": "野生動物との関係",
      "culturalInfo": "文化的背景や用途"
    }
  ]
}

## 重要な指針：
1. **【最優先】指定地域の植物のみ回答** - 他地域の植物は絶対に含めない
2. 曖昧な表現でも形態学的特徴に変換して候補を絞り込む
3. 複数の解釈が可能な場合は、指定地域内で最も一般的な植物から順に提案
4. confidence値は曖昧さを考慮して控えめに設定（0.3-0.7程度）
5. 特徴説明では、ユーザーの表現がなぜその植物に当てはまるかを説明
6. 俗名や地方名も aliases に含める
7. 季節情報がある場合は開花期・結実期と照合
8. 生育環境の情報も重要な手がかりとして活用`
    },
    {
      role: "user",
      content: `以下の植物の説明から、該当する可能性のある植物を特定してください：\n\n${searchQuery}`
    }
  ];
  
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.7,
      stream: false,
    max_completion_tokens: 2000,
      messages: messages
    };

    console.log('📤 LLMへのリクエスト詳細:', {
      region: region,
      regionRestrictionInPrompt: regionRestriction,
      regionExample: regionExample,
      systemPromptPreview: messages[0].content.substring(0, 500) + '...',
      userQuery: searchQuery
    });
    
  const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    throw new Error(`API呼び出しに失敗しました: ${response.status}`);
  }
  
  const data = await response.json();
  
  console.log('📥 LLMからの応答:', {
    region: region,
    hasChoices: !!(data.choices && data.choices.length > 0),
    hasAnswer: !!data.answer,
    responsePreview: data.choices?.[0]?.message?.content?.substring(0, 300) || data.answer?.substring(0, 300) || 'No content'
  });
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return parsePlantSearchResponse(data.choices[0].message.content);
  } else if (data.answer) {
    return parsePlantSearchResponse(data.answer);
        } else {
    throw new Error('レスポンスに期待されるフィールドがありません');
  }
}

// 植物検索レスポンス解析
function parsePlantSearchResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.plants && Array.isArray(parsed.plants)) {
        console.log('🌱 解析された植物データ:', {
          植物数: parsed.plants.length,
          植物名リスト: parsed.plants.map(p => p.commonName || p.scientificName),
          各植物の生息環境: parsed.plants.map(p => ({ 
            名前: p.commonName, 
            生息環境: p.habitat?.substring(0, 100) 
          }))
        });
        return parsed.plants;
      }
    }
  } catch (error) {
    console.warn('JSON解析に失敗:', error);
  }
  
  // フォールバック: 基本的な植物情報を返す
  return [{
    scientificName: "Unknown species",
    commonName: "不明な植物",
    aliases: [],
    confidence: 0.1,
    features: "詳細な特徴を特定できませんでした",
    feature1: "形態的特徴：特定できませんでした",
    feature2: "生態的特徴：特定できませんでした", 
    feature3: "識別特徴：特定できませんでした",
    morphology: "形態学的特徴：詳細情報なし",
    physiology: "生理的特徴：詳細情報なし",
    taxonomy: "分類学的特徴：詳細情報なし",
    habitat: "分布不明",
    season: "不明",
    wildlifeConnection: "情報なし",
    culturalInfo: "情報なし"
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

  // 植物検索用のプロンプトを作成
  createPlantSearchPrompt(searchQuery, region = 'japan') {
    // 地域設定に基づく厳格な制限テキスト
    const regionTexts = {
      'japan': '日本国内でのみ見られる植物のみを検索対象とする',
      'southeast-asia': '東南アジア地域（タイ、マレーシア、インドネシア、フィリピン、ベトナム、ラオス、カンボジア、ミャンマー、ブルネイ、シンガポール）でのみ見られる植物のみを検索対象とする',
      'north-america': '北米大陸（アメリカ合衆国、カナダ、メキシコ）でのみ見られる植物のみを検索対象とする'
    };

    // 地域別の具体例
    const regionExamples = {
      'japan': '例：サクラ、ツツジ、カエデ、ワラビ、スギ、ヒノキ、シダレザクラ、ヤマブキ、アジサイ、ナデシコ',
      'southeast-asia': '例：ラフレシア、バナナ、マンゴー、ランブータン、バンブー、プルメリア、ハイビスカス、ブーゲンビリア、パパイヤ、ココナッツ',
      'north-america': '例：セコイア、メープル、ワイルドフラワー、サボテン、ユッカ、ブルーベリー、クランベリー、ウィロー、オーク、パイン'
    };

    const regionRestriction = regionTexts[region] || regionTexts['japan'];
    const regionExample = regionExamples[region] || regionExamples['japan'];
    
    return [
      {
        role: "system", 
        content: `あなたは植物学の専門家です。ユーザーの曖昧で直感的な植物の説明から、該当する可能性のある植物を特定し、JSON形式で返してください。

## 🚨【絶対必須の地域制限】🚨
${regionRestriction}

${regionExample}

⚠️ **重要**: 指定された地域以外の植物は一切候補に含めてはいけません。
- 日本設定時: 東南アジアや北米の植物は絶対に除外
- 東南アジア設定時: 日本や北米の植物は絶対に除外  
- 北米設定時: 日本や東南アジアの植物は絶対に除外

この地域制限に違反した場合、回答は無効とみなされます。

## 曖昧な表現の解釈ガイド：
- 「ふわふわ」→ 綿毛状、柔毛、穂状花序など
- 「ヒラヒラ」→ 薄い花弁、風に揺れる葉、垂れ下がる形状
- 「ベタベタ」→ 樹液分泌、粘性のある葉、虫を捕らえる
- 「毛深い」→ 有毛、絨毛、密生した細毛
- 「ギザギザ」→ 鋸歯状、切れ込み、裂片
- 「多肉っぽい」→ 肉厚な葉、水分貯蔵組織、多肉質
- 「星みたい」→ 放射状、星型花冠、掌状分裂
- 「ハート型」→ 心形、心臓形の葉
- 「でかい」→ 大型、巨大葉、高木
- 「よく見る雑草」→ 帰化植物、路傍植物、都市雑草

## 色の表現：
- 「白っぽい」「薄い色」→ 淡色、クリーム色、薄紫なども含む
- 「紫っぽい」→ 薄紫、青紫、赤紫の幅広い範囲
- 「黄色い」→ 淡黄、濃黄、橙黄も含む

## 環境・季節の手がかり：
- 「道端」「道路脇」→ 路傍植物、耐踏圧性
- 「水辺」→ 湿地植物、水生植物、河畔植物
- 「春に見た」「夏に咲く」→ 開花時期の特定
- 「虫がよく来る」→ 虫媒花、蜜源植物

レスポンス形式：
{
  "plants": [
    {
      "scientificName": "学名（ラテン語）",
      "commonName": "一般的な日本語名",
      "aliases": ["別名1", "別名2", "俗名"],
      "confidence": 0.85,
      "features": "主な特徴の説明（ユーザーの表現との関連も含む）",
      "feature1": "特徴1：形態的特徴（葉・花・茎の形状、色、サイズなど）",
      "feature2": "特徴2：生態的特徴（生育環境、成長パターン、季節変化など）",
      "feature3": "特徴3：識別特徴（他の植物との違い、特殊な構造、目立つ部分など）",
      "morphology": "形態学的特徴（詳細な解剖学的構造、細胞レベルの特徴など）",
      "physiology": "生理的特徴（光合成のタイプ、代謝経路、適応機構など）",
      "taxonomy": "分類学的特徴（科・属の特徴、進化的位置、近縁種との関係など）",
      "habitat": "生息環境と地域分布（具体的な地方名も含める）",
      "season": "開花・成長期",
      "wildlifeConnection": "野生動物との関係",
      "culturalInfo": "文化的背景や用途"
    }
  ]
}

## 重要な指針：
1. **【最優先】指定地域の植物のみ回答** - 他地域の植物は絶対に含めない
2. 曖昧な表現でも形態学的特徴に変換して候補を絞り込む
3. 複数の解釈が可能な場合は、指定地域内で最も一般的な植物から順に提案
4. confidence値は曖昧さを考慮して控えめに設定（0.3-0.7程度）
5. 特徴説明では、ユーザーの表現がなぜその植物に当てはまるかを説明
6. 俗名や地方名も aliases に含める
7. 季節情報がある場合は開花期・結実期と照合
8. 生育環境の情報も重要な手がかりとして活用

## 特徴について：
- feature1（形態的特徴）：葉の形状・大きさ・色、花の色・形・サイズ、茎の特徴、全体の大きさなど視覚的特徴
- feature2（生態的特徴）：どこに生える、いつ咲く、どう成長する、環境への適応など
- feature3（識別特徴）：この植物ならではの特徴、似た植物との見分け方、特殊な構造や匂いなど
- morphology（形態学的特徴）：詳細な解剖学的構造（維管束の配置、毛状突起の種類、花粉の形状、細胞壁の特徴など）
- physiology（生理的特徴）：光合成経路（C3/C4/CAM）、窒素固定、耐塩性、耐乾性、化学防御物質の産生など
- taxonomy（分類学的特徴）：所属する科・属の特徴、分類群内での位置、近縁種や類似種との系統関係、進化的起源など

## 地域別分布情報について：
- 日本が選択された場合：生息環境と併せて具体的な分布地域を記載
  例：「本州中部の山地」「北海道〜九州の湿地」「関東以西の平地」「西日本の里山」「沖縄・南西諸島の海岸」
  「東北地方の林床」「中部高原」「近畿の河川敷」「九州南部」「北陸の雪国」など
- 東南アジアが選択された場合：「タイ北部の山地」「マレー半島の熱帯雨林」「ジャワ島の火山性土壌」など
- 北米が選択された場合：「アメリカ東部の落葉樹林」「西海岸の地中海性気候区」「五大湖周辺の湿原」など

## 特徴の記載について：
- feature1, feature2は必ず記載し、ユーザーが視覚的に確認しやすい要素を優先する
- 特に花の色・形、葉の形状、全体のサイズ感、特徴的な部分を具体的に記載する`
      },
      {
        role: "user",
        content: `以下の植物の説明から、該当する可能性のある植物を特定してください：\n\n${searchQuery}`
      }
    ];
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

  // レスポンス解析
  parsePlantSearchResponse(responseText) {
    return parsePlantSearchResponse(responseText);
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
      const prompt = createPlantImagePrompt(plantInfo, style, 'day', imageOptions.seed);
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

// プロンプト作成のヘルパー関数（改良版）
class PlantImagePromptHelper {
  static createBotanicalPrompt(plantInfo, time = 'day') {
    return createPlantImagePrompt(plantInfo, 'botanical', time);
  }

  static createAnimePrompt(plantInfo, time = 'day') {
    return createPlantImagePrompt(plantInfo, 'anime', time);
  }

  static createRealisticPrompt(plantInfo, time = 'day') {
    return createPlantImagePrompt(plantInfo, 'realistic', time);
  }

  // 高精度な植物特化プロンプト生成
  static createAdvancedBotanicalPrompt(plantInfo, includeAnatomical = true) {
    let prompt = `Scientific botanical illustration of ${plantInfo.scientificName}`;
    
    if (plantInfo.commonName) {
      prompt += ` (${plantInfo.commonName})`;
    }
    
    if (plantInfo.features) {
      prompt += `, showing ${translateFeaturesToEnglish(plantInfo.features)}`;
    }
    
    prompt += `. Highly detailed scientific illustration in the style of botanical field guides, featuring precise pen and ink linework with watercolor washes. Complete plant specimen showing root system, stem structure, leaf morphology, flower anatomy, and fruit development stages.`;
    
    if (includeAnatomical) {
      prompt += ` Include detailed cross-sectional views of flowers and fruits, showing internal structures, stamens, pistils, and seed arrangements.`;
    }
    
    prompt += ` Pure white background, museum-quality botanical illustration, scientifically accurate, professional botanical art style.`;
    
    return prompt;
  }
}

// エクスポート用のグローバル変数
if (typeof window !== 'undefined') {
  window.ReplicateImageClient = ReplicateImageClient;
  window.generatePlantImage = generatePlantImage;
  window.createPlantImagePrompt = createPlantImagePrompt;
  window.translateFeaturesToEnglish = translateFeaturesToEnglish;
  window.callPlantSearchAPI = callPlantSearchAPI;
  window.parsePlantSearchResponse = parsePlantSearchResponse;
  window.PlantSearchLLM = PlantSearchLLM;
  window.PlantImagePromptHelper = PlantImagePromptHelper;
  window.PlantImageStorage = PlantImageStorage;
  window.saveImageToStorage = saveImageToStorage;
} 