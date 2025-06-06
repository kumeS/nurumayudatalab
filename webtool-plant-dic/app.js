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

    console.log('Replicate API Request:', requestData);

    const response = await fetch(this.workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Worker API呼び出しに失敗: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Replicate API エラー: ${JSON.stringify(data.details || data.error)}`);
    }

    return data;
  }
}

// 植物画像生成専用の便利関数
async function generatePlantImage(plantInfo, style = 'botanical', workerUrl, model = 'minimax', imageOptions = {}) {
  const client = new ReplicateImageClient(workerUrl);
  
  // プロンプト作成（時間帯とシードも考慮）
  const time = imageOptions.time || 'day';
  const seed = imageOptions.seed;
  const prompt = createPlantImagePrompt(plantInfo, style, time, seed);
  
  try {
    let result;
    
    if (model === 'sdxl-lightning') {
      // SDXL Lightning使用（サイズ指定可能）
      console.log(`Generating plant image with SDXL Lightning: ${prompt}`);
      const sdxlOptions = {
        width: imageOptions.width || 1024,
        height: imageOptions.height || 1024,
        scheduler: imageOptions.scheduler || "K_EULER",
        steps: imageOptions.steps || 4,
        guidance: imageOptions.guidance || 0,
        negativePrompt: imageOptions.negativePrompt || "text, words, letters, writing, watermark, signature, labels, captions, annotations, typography, symbols, numbers",
        seed: imageOptions.seed // シードを追加
      };
      result = await client.generateImageSDXL(prompt, sdxlOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        return {
          success: true,
          imageUrl: result.output[0],
          prompt: prompt,
          model: 'bytedance/sdxl-lightning-4step',
          options: sdxlOptions
        };
      } else if (result.output) {
        return {
          success: true,
          imageUrl: result.output,
          prompt: prompt,
          model: 'bytedance/sdxl-lightning-4step',
          options: sdxlOptions
        };
        } else {
        throw new Error('画像URLが返されませんでした');
      }
  } else {
      // Minimax使用（デフォルト）- アスペクト比指定可能
      console.log(`Generating plant image with Minimax: ${prompt}`);
      const minimaxOptions = {
        aspectRatio: imageOptions.aspectRatio || "1:1",
        seed: imageOptions.seed, // シードを追加
        negative_prompt: imageOptions.negativePrompt || "text, words, letters, writing, watermark, signature, labels, captions, annotations, typography, symbols, numbers"
      };
      result = await client.generateImageMinimax(prompt, minimaxOptions);
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        return {
          success: true,
          imageUrl: result.output[0],
          prompt: prompt,
          model: 'minimax/image-01',
          options: minimaxOptions
        };
      } else if (result.output) {
        return {
          success: true,
          imageUrl: result.output,
          prompt: prompt,
          model: 'minimax/image-01',
          options: minimaxOptions
        };
        } else {
        throw new Error('画像URLが返されませんでした');
      }
    }
  } catch (error) {
    console.error(`${model} generation failed:`, error);
    return {
      success: false,
      error: `画像生成に失敗しました: ${error.message}`,
      prompt: prompt
    };
  }
}

// 植物画像プロンプト作成
function createPlantImagePrompt(plantInfo, style, time = 'day', seed = null) {
  // プロンプトのバリエーションを追加するため、シードに基づいて異なる表現を選択
  const variations = [
    `A detailed botanical image of ${plantInfo.scientificName}`,
    `A beautiful illustration of ${plantInfo.scientificName}`,
    `An artistic rendering of ${plantInfo.scientificName}`,
    `A botanical study of ${plantInfo.scientificName}`,
    `A detailed plant portrait of ${plantInfo.scientificName}`
  ];
  
  // シードが提供された場合、それを使ってバリエーションを選択
  const variationIndex = seed ? seed % variations.length : 0;
  let basePrompt = variations[variationIndex];
  
  // 一般名があれば追加
  if (plantInfo.commonName) {
    basePrompt += ` (commonly known as ${plantInfo.commonName})`;
  }

  // 植物の詳細特徴を英語で追加（より具体的に）
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

  // シードに基づく構図のバリエーション
  let compositionPrompt = '';
  if (seed) {
    const compositions = [
      ', centered composition with full plant view',
      ', close-up detail view focusing on flowers and leaves',
      ', diagonal composition showing plant structure',
      ', artistic angled view with depth',
      ', side profile view highlighting plant silhouette'
    ];
    compositionPrompt = compositions[seed % compositions.length];
  }

  // 品質向上とテキスト抑制のための追加指示
  const qualityPrompt = ' High resolution, botanically accurate, detailed plant anatomy, professional quality, masterpiece';
  const noTextPrompt = ', no text, no words, no letters, no watermarks, no labels, clean image without any written content';

  return basePrompt + featuresPrompt + habitatPrompt + seasonPrompt + lightingPrompt + compositionPrompt + stylePrompt + qualityPrompt + noTextPrompt;
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
  
  // 地域設定に基づく優先度テキスト
  const regionTexts = {
    'japan': '日本で見られる植物を優先',
    'southeast-asia': '東南アジア（タイ、マレーシア、インドネシア、フィリピン、ベトナム、ラオス、カンボジア、ミャンマー、ブルネイ、シンガポール）で見られる植物を優先',
    'north-america': '北米大陸（アメリカ合衆国、カナダ、メキシコ）で見られる植物を優先'
  };

  const regionPriority = regionTexts[region] || regionTexts['japan'];
  
  const messages = [
    {
      role: "system", 
      content: `あなたは植物学の専門家です。ユーザーの曖昧で直感的な植物の説明から、該当する可能性のある植物を特定し、JSON形式で返してください。

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
1. ${regionPriority}
2. 曖昧な表現でも形態学的特徴に変換して候補を絞り込む
3. 複数の解釈が可能な場合は、最も一般的な植物から順に提案
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
    // 地域設定に基づく優先度テキスト
    const regionTexts = {
      'japan': '日本で見られる植物を優先',
      'southeast-asia': '東南アジア（タイ、マレーシア、インドネシア、フィリピン、ベトナム、ラオス、カンボジア、ミャンマー、ブルネイ、シンガポール）で見られる植物を優先',
      'north-america': '北米大陸（アメリカ合衆国、カナダ、メキシコ）で見られる植物を優先'
    };

    const regionPriority = regionTexts[region] || regionTexts['japan'];
    
    return [
      {
        role: "system", 
        content: `あなたは植物学の専門家です。ユーザーの曖昧で直感的な植物の説明から、該当する可能性のある植物を特定し、JSON形式で返してください。

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
1. ${regionPriority}
2. 曖昧な表現でも形態学的特徴に変換して候補を絞り込む
3. 複数の解釈が可能な場合は、最も一般的な植物から順に提案
4. confidence値は曖昧さを考慮して控えめに設定（0.3-0.7程度）
5. 特徴説明では、ユーザーの表現がなぜその植物に当てはまるかを説明
6. 俗名や地方名も aliases に含める
7. 季節情報がある場合は開花期・結実期と照合
8. 生育環境の情報も重要な手がかりとして活用

## 3つの特徴について：
- feature1（形態的特徴）：葉の形状・大きさ・色、花の色・形・サイズ、茎の特徴、全体の大きさなど視覚的特徴
- feature2（生態的特徴）：どこに生える、いつ咲く、どう成長する、環境への適応など
- feature3（識別特徴）：この植物ならではの特徴、似た植物との見分け方、特殊な構造や匂いなど

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
    return await callPlantSearchAPI(searchQuery, region);
  }

  // レスポンス解析
  parsePlantSearchResponse(responseText) {
    return parsePlantSearchResponse(responseText);
  }

  // 植物画像生成（新しいReplicate API使用）
  async generatePlantImage(plantInfo, style = 'botanical', model = 'minimax', imageOptions = {}) {
    try {
      // プロンプトの詳細ログ出力
      const prompt = createPlantImagePrompt(plantInfo, style, imageOptions.time || 'day', imageOptions.seed);
      console.log('Generated plant image prompt:', prompt);
      console.log('Plant info:', plantInfo);
      console.log('Style:', style, 'Model:', model, 'Options:', imageOptions);
      
      return await generatePlantImage(plantInfo, style, this.replicateWorkerUrl, model, imageOptions);
    } catch (error) {
      console.error('植物画像生成エラー:', error);
      return {
        success: false,
        error: `画像生成に失敗しました: ${error.message}`
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
} 