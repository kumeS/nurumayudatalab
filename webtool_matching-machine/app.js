/**
 * キーワード組み込みチェックマシーン - 高度分析モジュール
 * LLM活用によるメーカー名・商品名検出およびキーワード最適化
 */

class KeywordAnalyzer {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.manufacturerCache = new Map();
    this.keywordCache = new Map();
  }

  /**
   * メーカー名・商品名を抽出してグレイでハイライトするLLM機能
   * @param {string} text - 分析対象のテキスト
   * @returns {Promise<Object>} - 分析結果
   */
  async detectManufacturersAndBrands(text) {
    const cacheKey = this.generateCacheKey(text);
    if (this.manufacturerCache.has(cacheKey)) {
      return this.manufacturerCache.get(cacheKey);
    }

    const messages = [
      {
        role: "system",
        content: `あなたは商品情報からメーカー名・ブランド名・商品名を正確に抽出する専門家です。
以下の基準で分類してください：

1. **メーカー名**: 企業名（Sony, Apple, Samsung, Nike, Adidas等）
2. **ブランド名**: 商品ブランド（iPhone, PlayStation, AirPods等）
3. **商品名**: 具体的な型番や商品名（WF-1000XM4, iPhone 15 Pro等）

出力は以下のJSON形式で返してください：
{
  "manufacturers": ["メーカー名1", "メーカー名2"],
  "brands": ["ブランド名1", "ブランド名2"],
  "products": ["商品名1", "商品名2"],
  "highlighted_text": "元のテキストで該当部分を<strike>タグでマークアップしたもの",
  "amazon_unsuitable": ["Amazon検索に不適切なキーワードリスト"],
  "confidence": 0.95
}`
      },
      {
        role: "user",
        content: `以下のテキストを分析してください：\n\n${text}`
      }
    ];

    try {
      const result = await this.callLLMAPI(messages);
      this.manufacturerCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('メーカー名検出エラー:', error);
      throw error;
    }
  }

  /**
   * キーワードの形容詞、複合語などを判定するLLM機能
   * @param {string} keywords - 分析対象のキーワード
   * @returns {Promise<Object>} - 分析結果
   */
  async analyzeKeywordTypes(keywords) {
    const cacheKey = this.generateCacheKey(keywords);
    if (this.keywordCache.has(cacheKey)) {
      return this.keywordCache.get(cacheKey);
    }

    const messages = [
      {
        role: "system",
        content: `あなたは日本語キーワードの品詞・種類を分析する専門家です。
各キーワードを以下のカテゴリーに分類してください：

1. **名詞**: 物や概念を表す語（イヤホン、コーヒー、ワンピース等）
2. **形容詞**: 性質や状態を表す語（高音質、おしゃれ、快適等）
3. **複合語**: 複数の語が組み合わさった語（ワイヤレスイヤホン、深煎りコーヒー等）
4. **技術用語**: 専門的な技術語（Bluetooth、WiFi、USB-C等）
5. **ブランド語**: メーカー・ブランド名（Sony、Apple、ZARA等）
6. **検索価値**: Amazon検索での重要度（high/medium/low）

出力は以下のJSON形式で返してください：
{
  "analysis": [
    {
      "keyword": "キーワード",
      "type": "カテゴリー",
      "search_value": "high/medium/low",
      "amazon_suitable": true/false,
      "reason": "判定理由"
    }
  ],
  "optimized_keywords": "最適化されたキーワード（半角スペース区切り）",
  "removed_keywords": ["除外されたキーワード"],
  "duplicate_keywords": ["重複していたキーワード"],
  "recommendations": ["改善提案1", "改善提案2"]
}`
      },
      {
        role: "user",
        content: `以下のキーワードを分析してください：\n\n${keywords}`
      }
    ];

    try {
      const result = await this.callLLMAPI(messages);
      this.keywordCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('キーワード分析エラー:', error);
      throw error;
    }
  }

  /**
   * 総合的なキーワード最適化分析
   * @param {string} keywords - キーワード一覧
   * @param {string} productText - 商品概要
   * @returns {Promise<Object>} - 総合分析結果
   */
  async performComprehensiveAnalysis(keywords, productText) {
    const messages = [
      {
        role: "system",
        content: `あなたはAmazon検索エンジン最適化（SEO）の専門家です。
商品概要とキーワードを分析し、Amazon検索での視認性と関連性を最大化する最適化を行ってください。

分析内容：
1. **重複検出**: キーワード間の重複や類似語を特定
2. **関連性評価**: 商品概要との関連性を評価
3. **検索価値評価**: Amazon検索での有効性を判定
4. **競合分析**: 一般的な検索トレンドとの照合
5. **最適化提案**: 具体的な改善案を提案

評価基準：
- 検索ボリューム: Amazon での検索頻度
- 競合度: 競合商品の多さ
- 関連性: 商品との関連度
- 特異性: ユニークな特徴を表現しているか

出力は以下のJSON形式で返してください：
{
  "score": 85,
  "optimized_keywords": "最適化されたキーワード（重要度順）",
  "highlighted_product": "商品概要（<mark>でキーワード一致、<strike>でメーカー名をマークアップ）",
  "duplicate_count": 3,
  "optimization_count": 2,
  "analysis_details": {
    "high_value_keywords": ["高価値キーワード"],
    "medium_value_keywords": ["中価値キーワード"],
    "low_value_keywords": ["低価値キーワード"],
    "removed_keywords": ["除外キーワード"],
    "brand_terms": ["ブランド用語"],
    "technical_terms": ["技術用語"]
  },
  "improvements": [
    "具体的な改善提案1",
    "具体的な改善提案2",
    "具体的な改善提案3"
  ],
  "search_trends": {
    "trending_keywords": ["トレンドキーワード"],
    "seasonal_keywords": ["季節キーワード"],
    "competitor_keywords": ["競合キーワード"]
  }
}`
      },
      {
        role: "user",
        content: `キーワード一覧：
${keywords}

商品概要：
${productText}

上記を総合的に分析し、Amazon検索最適化の観点から最適なキーワード構成を提案してください。`
      }
    ];

    try {
      const result = await this.callLLMAPI(messages);
      return result;
    } catch (error) {
      console.error('総合分析エラー:', error);
      throw error;
    }
  }

  /**
   * キーワードトレンド分析
   * @param {string} keywords - キーワード一覧
   * @param {string} category - 商品カテゴリー
   * @returns {Promise<Object>} - トレンド分析結果
   */
  async analyzeTrends(keywords, category = 'general') {
    const messages = [
      {
        role: "system",
        content: `あなたはEコマース市場のトレンド分析専門家です。
指定されたキーワードの現在のトレンドと将来性を分析してください。

分析観点：
1. **現在の人気度**: 現時点での検索ボリューム推定
2. **季節性**: 季節による変動パターン
3. **成長性**: 今後の成長可能性
4. **競合状況**: 市場の競争激しさ
5. **関連キーワード**: 併用すべきキーワード

出力は以下のJSON形式で返してください：
{
  "trend_score": 75,
  "current_popularity": "high/medium/low",
  "seasonality": {
    "peak_months": ["月のリスト"],
    "low_months": ["月のリスト"],
    "pattern": "seasonal/steady/volatile"
  },
  "growth_potential": "high/medium/low",
  "competition_level": "high/medium/low",
  "related_keywords": ["関連キーワード"],
  "emerging_keywords": ["新興キーワード"],
  "declining_keywords": ["衰退キーワード"],
  "recommendations": [
    "トレンド活用提案1",
    "トレンド活用提案2"
  ]
}`
      },
      {
        role: "user",
        content: `カテゴリー: ${category}
キーワード: ${keywords}

上記キーワードのトレンド分析を実行してください。`
      }
    ];

    try {
      const result = await this.callLLMAPI(messages);
      return result;
    } catch (error) {
      console.error('トレンド分析エラー:', error);
      throw error;
    }
  }

  /**
   * LLM API呼び出し
   * @param {Array} messages - メッセージ配列
   * @returns {Promise<Object>} - API レスポンス
   */
  async callLLMAPI(messages) {
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.3,
      stream: false,
      max_completion_tokens: 3000,
      messages: messages
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`API呼び出し失敗: ${response.status}`);
    }

    const data = await response.json();
    
    let content;
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      content = data.choices[0].message.content;
    } else if (data.answer) {
      content = data.answer;
    } else {
      throw new Error('レスポンスに期待されるフィールドがありません');
    }

    return this.parseJSONResponse(content);
  }

  /**
   * JSON レスポンスのパース
   * @param {string} text - レスポンステキスト
   * @returns {Object} - パースされたオブジェクト
   */
  parseJSONResponse(text) {
    let jsonText = text;
    
    // ```json で囲まれている場合の処理
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // { で始まり } で終わる部分を抽出
      const startIndex = text.indexOf('{');
      const lastIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        jsonText = text.substring(startIndex, lastIndex + 1);
      }
    }
    
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('JSON パースエラー:', error);
      console.error('元のテキスト:', text);
      throw new Error('レスポンスのJSON解析に失敗しました');
    }
  }

  /**
   * キャッシュキーの生成
   * @param {string} text - 元のテキスト
   * @returns {string} - ハッシュ化されたキー
   */
  generateCacheKey(text) {
    // 簡易的なハッシュ関数
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString();
  }

  /**
   * キャッシュのクリア
   */
  clearCache() {
    this.manufacturerCache.clear();
    this.keywordCache.clear();
  }

  /**
   * キャッシュ統計の取得
   * @returns {Object} - キャッシュ統計
   */
  getCacheStats() {
    return {
      manufacturerCacheSize: this.manufacturerCache.size,
      keywordCacheSize: this.keywordCache.size,
      totalCacheSize: this.manufacturerCache.size + this.keywordCache.size
    };
  }
}

// 使用例とユーティリティ関数
class KeywordOptimizationUtils {
  /**
   * キーワードの重複を検出
   * @param {string} keywords - キーワード文字列
   * @returns {Object} - 重複分析結果
   */
  static detectDuplicates(keywords) {
    const keywordArray = keywords.split(/[\s\n,]+/).filter(k => k.trim() !== '');
    const counts = {};
    const duplicates = [];
    
    keywordArray.forEach(keyword => {
      const normalized = keyword.toLowerCase().trim();
      counts[normalized] = (counts[normalized] || 0) + 1;
      
      if (counts[normalized] === 2) {
        duplicates.push(normalized);
      }
    });
    
    const unique = [...new Set(keywordArray.map(k => k.toLowerCase().trim()))];
    
    return {
      original: keywordArray,
      unique: unique,
      duplicates: duplicates,
      duplicateCount: keywordArray.length - unique.length
    };
  }

  /**
   * スコア計算
   * @param {Object} analysisData - 分析データ
   * @returns {number} - 最適化スコア
   */
  static calculateOptimizationScore(analysisData) {
    let score = 100;
    
    // 重複ペナルティ
    if (analysisData.duplicate_count) {
      score -= analysisData.duplicate_count * 5;
    }
    
    // 最適化機会ボーナス
    if (analysisData.optimization_count) {
      score -= analysisData.optimization_count * 3;
    }
    
    // 関連性ボーナス/ペナルティ
    if (analysisData.analysis_details) {
      const highValueCount = analysisData.analysis_details.high_value_keywords?.length || 0;
      const lowValueCount = analysisData.analysis_details.low_value_keywords?.length || 0;
      
      score += highValueCount * 2;
      score -= lowValueCount * 2;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * ハイライト処理
   * @param {string} text - 元のテキスト
   * @param {Array} keywords - ハイライト対象キーワード
   * @param {Array} brands - ブランド名（グレーハイライト対象）
   * @returns {string} - ハイライト済みテキスト
   */
  static applyHighlighting(text, keywords = [], brands = []) {
    let result = text;
    
    // キーワードハイライト（黄色）
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    });
    
    // ブランド名ハイライト（グレー）
    brands.forEach(brand => {
      const regex = new RegExp(`(${brand})`, 'gi');
      result = result.replace(regex, '<strike>$1</strike>');
    });
    
    return result;
  }
}

// ===== UI制御部分 =====

// グローバル変数
let analyzer;
let analysisOptions = {
  'manufacturer-detection': true,
  'keyword-classification': true,
  'trend-analysis': true
};

// サンプルデータ（性能テスト用 - 重複キーワード・ダミー商品名含む）
const sampleData = {
  keywords: {
    electronics: 'ワイヤレス イヤホン Bluetooth 高音質 ノイズキャンセリング 防水 スポーツ TechBrand TB-WE100 プレミアム 音楽 完全ワイヤレス ワイヤレス 高音質 イヤホン Bluetooth ノイズキャンセリング機能 防水性能 スポーツ用 音楽再生',
    fashion: 'レディース ワンピース 夏 半袖 カジュアル フォーマル おしゃれ 大きいサイズ ブランド FashionCorp FC-OP200 花柄 シンプル エレガント レディース ワンピース 夏物 半袖タイプ おしゃれ 大きめサイズ 花柄デザイン',
    food: '有機 コーヒー豆 エチオピア アラビカ種 フェアトレード 深煎り 中煎り スペシャルティコーヒー CoffeeMaster CM-ET300 香り 苦味 酸味 有機栽培 コーヒー豆 エチオピア産 深煎り 中煎り 香り豊か 苦味'
  },
  products: {
    electronics: 'TechBrand TB-WE100 ワイヤレスイヤホンは、業界最高クラスのノイズキャンセリング技術を搭載したプレミアムオーディオデバイスです。Bluetooth 5.2対応で高音質再生を実現し、IPX4防水規格でスポーツシーンにも最適。8時間連続再生＋ケース充電で最大24時間の長時間バッテリーと快適な装着感で、音楽愛好家に選ばれています。完全ワイヤレス設計で自由な音楽体験をお楽しみください。TechBrand独自の音響技術により、クリアな高音質を実現しています。',
    fashion: 'FashionCorp FC-OP200 春夏新作レディースワンピースは、上品なデザインと快適な着心地を両立したアイテムです。半袖タイプでカジュアルシーンからフォーマルな場面まで幅広く対応。大きいサイズも展開し、様々な体型の女性におしゃれを楽しんでいただけます。花柄とシンプルなデザインからお選びいただけ、エレガントな印象を演出します。FashionCorpブランドの高品質な素材を使用しています。',
    food: 'CoffeeMaster CM-ET300 エチオピア産アラビカ種100%使用のスペシャルティコーヒー豆です。有機栽培・フェアトレード認証済みで、深煎りの豊かなコクと中煎りの爽やかな酸味をお楽しみいただけます。プロが厳選した高品質なコーヒー豆で、芳醇な香りと絶妙な苦味のバランスが特徴。本格的な一杯をご自宅でお楽しみください。CoffeeMaster独自の焙煎技術により、最高の風味を引き出しています。'
  }
};

// DOM要素の取得
const keywordInput = document.getElementById('keywordInput');
const productInput = document.getElementById('productInput');
const executeBtn = document.getElementById('executeBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const progressFill = document.getElementById('progressFill');
const resultsSection = document.getElementById('resultsSection');
const optimizedKeywords = document.getElementById('optimizedKeywords');
const highlightedProduct = document.getElementById('highlightedProduct');
const improvementTips = document.getElementById('improvementTips');
const analysisDetails = document.getElementById('analysisDetails');
const trendAnalysis = document.getElementById('trendAnalysis');

// 新しいスコア表示エリアの要素
const scoresSection = document.getElementById('scoresSection');
const mainScoreValue = document.getElementById('mainScoreValue');
const mainScoreDetail = document.getElementById('mainScoreDetail');
const mainScoreBreakdown = document.getElementById('mainScoreBreakdown');
const trendScoreValue = document.getElementById('trendScoreValue');
const trendScoreDetail = document.getElementById('trendScoreDetail');
const trendScoreBreakdown = document.getElementById('trendScoreBreakdown');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  analyzer = new KeywordAnalyzer('https://nurumayu-worker.skume-bioinfo.workers.dev/');
  setupEventListeners();
  
  // DOM要素が確実に準備されてからデータを復元
  setTimeout(() => {
    loadSavedData();
  }, 100);
});

// イベントリスナー設定
function setupEventListeners() {
  // タブ切り替え
  document.querySelectorAll('.results-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // メイン実行ボタン
  executeBtn.addEventListener('click', handleAnalysisExecution);
  
  // クリアボタン
  clearBtn.addEventListener('click', clearAllData);
  
  // 入力フィールドの変更を監視してローカルストレージに保存
  keywordInput.addEventListener('input', saveInputData);
  productInput.addEventListener('input', saveInputData);
  
  // ページ離脱時にデータを保存
  window.addEventListener('beforeunload', () => {
    saveInputData();
  });
  
  // ページが非表示になった時にもデータを保存（モバイル対応）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveInputData();
    }
  });
}

// サンプルデータ挿入関数
function insertSampleKeywords(category) {
  if (category === 'clear') {
    keywordInput.value = '';
  } else {
    keywordInput.value = sampleData.keywords[category];
  }
  keywordInput.classList.add('highlight-input');
  setTimeout(() => {
    keywordInput.classList.remove('highlight-input');
  }, 1000);
}

function insertSampleProduct(category) {
  if (category === 'clear') {
    productInput.value = '';
  } else {
    productInput.value = sampleData.products[category];
  }
  productInput.classList.add('highlight-input');
  setTimeout(() => {
    productInput.classList.remove('highlight-input');
  }, 1000);
}

// ヘルプセクション切り替え
function toggleHelp() {
  const helpContent = document.getElementById('helpContent');
  const helpArrow = document.querySelector('.help-arrow');
  
  helpContent.classList.toggle('active');
  helpArrow.classList.toggle('rotated');
}

// タブ切り替え
function switchTab(tabName) {
  // すべてのタブコンテンツを非表示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // すべてのタブボタンを非アクティブ
  document.querySelectorAll('.results-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 選択されたタブを表示
  document.getElementById(`${tabName}-tab`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// 分析実行メイン処理
async function handleAnalysisExecution() {
  const keywords = keywordInput.value.trim();
  const product = productInput.value.trim();

  if (!keywords || !product) {
    alert('キーワード入力と商品概要の両方を入力してください。');
    return;
  }

  try {
    startLoadingIndicator();
    
    // 全ての分析を実行
    const results = await executeComprehensiveAnalysis(keywords, product);
    
    displayResults(results);
    
  } catch (error) {
    console.error('分析エラー:', error);
    alert(`分析中にエラーが発生しました: ${error.message}`);
  } finally {
    stopLoadingIndicator();
  }
}

// 包括的分析（全ての分析を実行）
async function executeComprehensiveAnalysis(keywords, product) {
  const results = { type: 'comprehensive', data: {} };
  
  updateProgress(15);
  
  // 基本分析
  const comprehensiveAnalysis = await analyzer.performComprehensiveAnalysis(keywords, product);
  results.data.comprehensive = comprehensiveAnalysis;
  
  updateProgress(35);
  
  // メーカー名検出
  if (analysisOptions['manufacturer-detection']) {
    const manufacturerAnalysis = await analyzer.detectManufacturersAndBrands(product);
    results.data.manufacturers = manufacturerAnalysis;
  }
  
  updateProgress(55);
  
  // キーワード分類
  if (analysisOptions['keyword-classification']) {
    const keywordAnalysis = await analyzer.analyzeKeywordTypes(keywords);
    results.data.keywordTypes = keywordAnalysis;
  }
  
  updateProgress(75);
  
  // トレンド分析
  if (analysisOptions['trend-analysis']) {
    const trendAnalysis = await analyzer.analyzeTrends(keywords, 'general');
    results.data.trends = trendAnalysis;
  }
  
  updateProgress(100);
  
  return results;
}

// 結果表示
function displayResults(results) {
  const data = results.data;
  
  // グローバルに分析結果を保存（メーカー名ハイライト用）
  window.currentAnalysisResults = data;
  
  // 新しいスコアセクションを表示
  displayMainScores(data);
  
  // 基本情報表示
  if (data.comprehensive) {
    displayBasicResults(data.comprehensive);
  } else if (data.score !== undefined) {
    displayBasicResults(data);
  }
  
  // 詳細分析表示（常に表示）
  displayAdvancedResults(data);
  
  // トレンド分析表示
  if (data.trends) {
    displayTrendResults(data.trends);
  }
  
  // スコアセクションと結果セクションを表示
  scoresSection.classList.add('active');
  resultsSection.classList.add('active');
  
  // スコアセクションまでスクロール
  scoresSection.scrollIntoView({ behavior: 'smooth' });
  
  // 結果をローカルストレージに保存
  saveResultsData(results);
}

// メインスコア表示
function displayMainScores(data) {
  // キーワード最適化スコア表示
  if (data.comprehensive) {
    const comprehensiveData = data.comprehensive;
    
    // スコア値表示
    mainScoreValue.textContent = comprehensiveData.score || 0;
    mainScoreDetail.textContent = `重複キーワード数: ${comprehensiveData.duplicate_count || 0}個 | 最適化候補: ${comprehensiveData.optimization_count || 0}個`;
    
    // 算出根拠表示
    displayMainScoreBreakdown(comprehensiveData);
  }
  
  // トレンドスコア表示
  if (data.trends) {
    const trendData = data.trends;
    
    trendScoreValue.textContent = trendData.trend_score || 0;
    trendScoreDetail.textContent = `人気度: ${trendData.current_popularity || '-'} | 成長性: ${trendData.growth_potential || '-'}`;
    
    // トレンドスコア算出根拠表示
    displayTrendScoreBreakdown(trendData);
  }
}

// メインスコア算出根拠表示
function displayMainScoreBreakdown(data) {
  let breakdownHTML = '<h4>算出根拠:</h4><ul>';
  
  // 基本スコア
  breakdownHTML += '<li>基本スコア: 100点</li>';
  
  // 重複ペナルティ
  if (data.duplicate_count > 0) {
    const penalty = data.duplicate_count * 5;
    breakdownHTML += `<li>重複ペナルティ: -${penalty}点 (${data.duplicate_count}個 × 5点)</li>`;
  }
  
  // 最適化機会ペナルティ
  if (data.optimization_count > 0) {
    const penalty = data.optimization_count * 3;
    breakdownHTML += `<li>最適化機会: -${penalty}点 (${data.optimization_count}個 × 3点)</li>`;
  }
  
  // 高価値キーワードボーナス
  if (data.analysis_details && data.analysis_details.high_value_keywords) {
    const bonus = data.analysis_details.high_value_keywords.length * 2;
    breakdownHTML += `<li>高価値キーワード: +${bonus}点 (${data.analysis_details.high_value_keywords.length}個 × 2点)</li>`;
  }
  
  // 低価値キーワードペナルティ
  if (data.analysis_details && data.analysis_details.low_value_keywords) {
    const penalty = data.analysis_details.low_value_keywords.length * 2;
    breakdownHTML += `<li>低価値キーワード: -${penalty}点 (${data.analysis_details.low_value_keywords.length}個 × 2点)</li>`;
  }
  
  breakdownHTML += '</ul>';
  mainScoreBreakdown.innerHTML = breakdownHTML;
}

// トレンドスコア算出根拠表示
function displayTrendScoreBreakdown(data) {
  let breakdownHTML = '<h4>算出根拠:</h4><ul>';
  
  // 基本スコア
  breakdownHTML += '<li>基本スコア: 50点</li>';
  
  // 人気度による加点・減点
  if (data.current_popularity) {
    const popularityScore = data.current_popularity === 'high' ? 25 : 
                           data.current_popularity === 'medium' ? 15 : 5;
    breakdownHTML += `<li>人気度評価: +${popularityScore}点 (${data.current_popularity})</li>`;
  }
  
  // 成長性による加点・減点
  if (data.growth_potential) {
    const growthScore = data.growth_potential === 'high' ? 20 : 
                       data.growth_potential === 'medium' ? 10 : 0;
    breakdownHTML += `<li>成長性評価: +${growthScore}点 (${data.growth_potential})</li>`;
  }
  
  // 競合レベルによる減点
  if (data.competition_level) {
    const competitionPenalty = data.competition_level === 'high' ? 10 : 
                              data.competition_level === 'medium' ? 5 : 0;
    if (competitionPenalty > 0) {
      breakdownHTML += `<li>競合度ペナルティ: -${competitionPenalty}点 (${data.competition_level})</li>`;
    }
  }
  
  // 季節性ボーナス
  if (data.seasonality && data.seasonality.pattern === 'seasonal') {
    breakdownHTML += '<li>季節性ボーナス: +5点 (季節トレンドあり)</li>';
  }
  
  // 関連キーワード数ボーナス
  if (data.related_keywords && data.related_keywords.length > 0) {
    const relatedBonus = Math.min(data.related_keywords.length * 2, 10);
    breakdownHTML += `<li>関連キーワード: +${relatedBonus}点 (${data.related_keywords.length}個)</li>`;
  }
  
  breakdownHTML += '</ul>';
  trendScoreBreakdown.innerHTML = breakdownHTML;
}

// 基本結果表示
function displayBasicResults(data) {
  // 最適化されたキーワード表示（重複除去・半角スペース区切り・メーカー名ハイライト）
  displayOptimizedKeywords(data);
  
  // ハイライトされた商品概要表示
  let highlightedText = data.highlighted_product || '';
  highlightedText = highlightedText.replace(/<mark>(.*?)<\/mark>/g, '<span class="highlight-yellow">$1</span>');
  highlightedText = highlightedText.replace(/<strike>(.*?)<\/strike>/g, '<span class="highlight-gray">$1</span>');
  highlightedProduct.innerHTML = highlightedText;
  
  // 改善提案表示
  improvementTips.innerHTML = '';
  if (data.improvements && Array.isArray(data.improvements)) {
    data.improvements.forEach(tip => {
      const li = document.createElement('li');
      li.textContent = tip;
      improvementTips.appendChild(li);
    });
  }
}



// 最適化されたキーワード表示
function displayOptimizedKeywords(data) {
  let keywords = data.optimized_keywords || '';
  
  // コンマ区切りを半角スペース区切りに変換
  keywords = keywords.replace(/,\s*/g, ' ');
  
  // 重複除去
  const keywordArray = keywords.split(/\s+/).filter(k => k.trim() !== '');
  const uniqueKeywords = [...new Set(keywordArray.map(k => k.toLowerCase()))];
  
  // メーカー名・ブランド名をハイライト
  let displayKeywords = uniqueKeywords.join(' ');
  
  // グローバルな分析結果からメーカー名・ブランド名を取得してハイライト
  if (window.currentAnalysisResults && window.currentAnalysisResults.manufacturers) {
    const manufacturers = window.currentAnalysisResults.manufacturers;
    const allBrands = [
      ...(manufacturers.manufacturers || []),
      ...(manufacturers.brands || []),
      ...(manufacturers.products || [])
    ];
    
    allBrands.forEach(brand => {
      const regex = new RegExp(`\\b(${brand})\\b`, 'gi');
      displayKeywords = displayKeywords.replace(regex, '<span class="highlight-gray">$1</span>');
    });
  }
  
  optimizedKeywords.innerHTML = displayKeywords;
}

// 高度分析結果表示
function displayAdvancedResults(data) {
  analysisDetails.innerHTML = '';
  
  // キーワード分類表示
  if (data.keywordTypes && data.keywordTypes.analysis) {
    const keywordCard = createDetailCard('キーワード分類', '各キーワードの種類と価値を分析');
    const keywordContent = document.createElement('div');
    
    data.keywordTypes.analysis.forEach(item => {
      const tag = document.createElement('span');
      tag.className = `keyword-tag ${item.search_value}-value`;
      tag.textContent = `${item.keyword} (${item.type})`;
      tag.title = item.reason;
      keywordContent.appendChild(tag);
    });
    
    keywordCard.appendChild(keywordContent);
    analysisDetails.appendChild(keywordCard);
  }
  
  // メーカー名検出結果表示
  if (data.manufacturers) {
    const manufacturerCard = createDetailCard('検出されたブランド', 'Amazon検索に不適切な可能性のある項目');
    const manufacturerContent = document.createElement('div');
    
    const allBrands = [
      ...(data.manufacturers.manufacturers || []),
      ...(data.manufacturers.brands || []),
      ...(data.manufacturers.products || [])
    ];
    
    allBrands.forEach(brand => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag low-value';
      tag.textContent = brand;
      manufacturerContent.appendChild(tag);
    });
    
    manufacturerCard.appendChild(manufacturerContent);
    analysisDetails.appendChild(manufacturerCard);
  }
  
  // 分析詳細表示
  if (data.comprehensive && data.comprehensive.analysis_details) {
    const details = data.comprehensive.analysis_details;
    
    ['high_value_keywords', 'medium_value_keywords', 'low_value_keywords'].forEach(category => {
      if (details[category] && details[category].length > 0) {
        const card = createDetailCard(
          category.replace('_', ' ').replace('keywords', 'キーワード'),
          `${category.includes('high') ? '高価値' : category.includes('medium') ? '中価値' : '低価値'}なキーワード`
        );
        
        const content = document.createElement('div');
        details[category].forEach(keyword => {
          const tag = document.createElement('span');
          tag.className = `keyword-tag ${category.split('_')[0]}-value`;
          tag.textContent = keyword;
          content.appendChild(tag);
        });
        
        card.appendChild(content);
        analysisDetails.appendChild(card);
      }
    });
  }
}

// トレンド結果表示
function displayTrendResults(data) {
  trendAnalysis.innerHTML = '';
  
  // 季節性情報
  if (data.seasonality) {
    const seasonCard = createDetailCard('季節性分析', 'キーワードの季節変動パターン');
    const seasonContent = document.createElement('div');
    seasonContent.innerHTML = `
      <p><strong>パターン:</strong> ${data.seasonality.pattern || 'N/A'}</p>
      <p><strong>ピーク月:</strong> ${(data.seasonality.peak_months || []).join(', ') || 'N/A'}</p>
      <p><strong>低調月:</strong> ${(data.seasonality.low_months || []).join(', ') || 'N/A'}</p>
    `;
    seasonCard.appendChild(seasonContent);
    trendAnalysis.appendChild(seasonCard);
  }
  
  // 関連キーワード
  if (data.related_keywords && data.related_keywords.length > 0) {
    const relatedCard = createDetailCard('関連キーワード', '併用すべきキーワード');
    const relatedContent = document.createElement('div');
    
    data.related_keywords.forEach(keyword => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.textContent = keyword;
      relatedContent.appendChild(tag);
    });
    
    relatedCard.appendChild(relatedContent);
    trendAnalysis.appendChild(relatedCard);
  }
}

// 詳細カード作成
function createDetailCard(title, description) {
  const card = document.createElement('div');
  card.className = 'detail-card';
  
  const titleElement = document.createElement('div');
  titleElement.className = 'detail-title';
  titleElement.textContent = title;
  
  const descElement = document.createElement('div');
  descElement.className = 'detail-content';
  descElement.textContent = description;
  
  card.appendChild(titleElement);
  card.appendChild(descElement);
  
  return card;
}

// ローディング表示開始
function startLoadingIndicator() {
  executeBtn.disabled = true;
  loadingIndicator.classList.add('active');
  executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';
  updateProgress(0);
}

// ローディング表示停止
function stopLoadingIndicator() {
  executeBtn.disabled = false;
  loadingIndicator.classList.remove('active');
  executeBtn.innerHTML = '<i class="fas fa-play"></i> 分析実行';
  updateProgress(0);
  
  // プログレステキストをリセット
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = '0%';
  }
}

// プログレス更新
function updateProgress(percentage) {
  progressFill.style.width = `${percentage}%`;
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = `${percentage}%`;
  }
}

// データ保存機能
function saveInputData() {
  // 入力値が空でない場合のみ保存
  if (keywordInput.value.trim() !== '' || productInput.value.trim() !== '') {
    const data = {
      keywords: keywordInput.value,
      product: productInput.value,
      timestamp: Date.now()
    };
    localStorage.setItem('keywordCheckerData', JSON.stringify(data));
  }
}

function saveResultsData(results) {
  const data = {
    results: results,
    timestamp: Date.now()
  };
  localStorage.setItem('keywordCheckerResults', JSON.stringify(data));
}

function loadSavedData() {
  // DOM要素が存在することを確認
  if (!keywordInput || !productInput) {
    console.warn('DOM要素が準備されていません');
    return;
  }
  
  // 入力データの復元
  const savedData = localStorage.getItem('keywordCheckerData');
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      // 有効なデータが存在する場合のみ復元
      if (data && typeof data === 'object') {
        keywordInput.value = data.keywords || '';
        productInput.value = data.product || '';
        console.log('入力データを復元しました:', { keywords: data.keywords || '', product: data.product || '' });
      }
    } catch (error) {
      console.error('保存データの読み込みエラー:', error);
      // 破損したデータを削除
      localStorage.removeItem('keywordCheckerData');
    }
  }
  
  // 結果データの復元
  const savedResults = localStorage.getItem('keywordCheckerResults');
  if (savedResults) {
    try {
      const data = JSON.parse(savedResults);
      // 24時間以内の結果のみ復元
      if (data && data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        displayResults(data.results);
      } else {
        localStorage.removeItem('keywordCheckerResults');
      }
    } catch (error) {
      console.error('保存結果の読み込みエラー:', error);
      // 破損したデータを削除
      localStorage.removeItem('keywordCheckerResults');
    }
  }
}

function clearAllData() {
  // 入力フィールドをクリア
  keywordInput.value = '';
  productInput.value = '';
  
  // スコアセクションと結果セクションを非表示
  scoresSection.classList.remove('active');
  resultsSection.classList.remove('active');
  
  // ローカルストレージをクリア（入力データと結果データの両方）
  localStorage.removeItem('keywordCheckerData');
  localStorage.removeItem('keywordCheckerResults');
  
  // グローバル分析結果をクリア
  window.currentAnalysisResults = null;
  
  // メインスコア表示エリアをリセット
  mainScoreValue.textContent = '0';
  mainScoreDetail.textContent = '重複キーワード数: 0個 | 最適化候補: 0個';
  mainScoreBreakdown.innerHTML = '';
  trendScoreValue.textContent = '0';
  trendScoreDetail.textContent = '人気度: - | 成長性: -';
  trendScoreBreakdown.innerHTML = '';
  
  // 既存の結果表示エリアをリセット
  optimizedKeywords.innerHTML = '';
  highlightedProduct.innerHTML = '';
  improvementTips.innerHTML = '';
  analysisDetails.innerHTML = '';
  trendAnalysis.innerHTML = '';
  
  // 概要タブに戻る
  switchTab('overview');
  
  // 入力データの保存を停止するため、イベントリスナーを一時的に無効化
  keywordInput.removeEventListener('input', saveInputData);
  productInput.removeEventListener('input', saveInputData);
  
  // 少し遅延してからイベントリスナーを再設定
  setTimeout(() => {
    keywordInput.addEventListener('input', saveInputData);
    productInput.addEventListener('input', saveInputData);
  }, 100);
}

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeywordAnalyzer, KeywordOptimizationUtils };
} 