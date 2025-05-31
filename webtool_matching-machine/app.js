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
        content: `あなたは商品情報からメーカー名・ブランド名・商品名・型番を正確に抽出する専門家です。
以下の基準で徹底的に分類してください：

1. **メーカー名**: 企業名・会社名
   - 大手企業: Sony, Apple, Samsung, Nike, Adidas, Canon, Nikon, Panasonic, Sharp, Toshiba
   - 中小企業: TechBrand, FashionCorp, CoffeeMaster等
   - 日本企業: トヨタ, ホンダ, 任天堂, ソニー, パナソニック等

2. **ブランド名**: 商品ブランド・シリーズ名
   - 電子機器: iPhone, PlayStation, AirPods, Galaxy, Xperia, AQUOS, BRAVIA
   - ファッション: UNIQLO, ZARA, H&M, GU等のブランド
   - 食品: 明治, 森永, カルビー等のブランド

3. **商品名**: 具体的な商品名・製品名
   - 完全な商品名: iPhone 15 Pro, Galaxy S24 Ultra, WF-1000XM4
   - シリーズ名を含む: MacBook Pro, Surface Pro, ThinkPad
   - 日本語商品名: アクオス, ブラビア, サイバーショット

4. **型番・モデル番号**: 製品識別コード（最重要）
   - 英数字組み合わせ: WF-1000XM4, TB-WE100, FC-OP200, CM-ET300
   - ハイフン付き: DSC-RX100, EOS-R5, α7R-IV
   - 連続英数字: iPhone15Pro, GalaxyS24, MacBookPro16
   - バージョン番号: v2.0, Gen3, Mark IV, Pro Max
   - 日本語型番: WH-1000XM5, MDR-Z1R

5. **検索価値のある独自語句**: Amazon検索で有効だが一般的なキーワードではない語句
   - 技術仕様: IPX4, Bluetooth 5.2, 連続再生, ノイズキャンセリング
   - 特徴語: 高音質, 長時間, 防水, 軽量, コンパクト
   - 用途語: スポーツ, 音楽愛好家, プロ仕様, 業務用
   - **品質・質感**: 上品, 高品質, 高級感, 質感, なめらか, しっとり, さらさら, 肌触り
   - **快適性**: 快適, 着心地, 履き心地, 使い心地, 心地よい, 楽, らくらく, フィット感
   - **対象者**: 女性, 男性, レディース, メンズ, 大人, 子供, ママ, パパ, シニア
   - **体型・サイズ**: 体型, スタイル, 体形, ぽっちゃり, スリム, 細身, ゆったり, 大きいサイズ
   - **デザイン**: おしゃれ, スタイリッシュ, シンプル, エレガント, モダン, クラシック
   - **使用感**: 簡単, 便利, 手軽, スムーズ, なめらか, 安定, 使いやすい

**検出強化ポイント**:
- 大文字小文字を区別せず検出
- 部分一致も含めて検出（例：「1000XM4」「XM4」も検出）
- 日本語・英語混在の商品名も検出
- 略称・愛称も検出（例：「アイフォン」→「iPhone」）
- 世代表記も検出（例：第3世代、3rd Gen）
- 商品概要独自の価値ある語句も検出

**重要**: 商品概要テキストは一切変更せず、検出された語句の分類のみを行ってください。

出力は以下のJSON形式で返してください：
{
  "manufacturers": ["メーカー名1", "メーカー名2"],
  "brands": ["ブランド名1", "ブランド名2"],
  "products": ["商品名1", "商品名2"],
  "model_numbers": ["型番1", "型番2"],
  "all_detected_terms": ["検出された全ての用語"],
  "unique_search_terms": ["商品概要独自の検索価値語句"],
  "highlighted_text": "元のテキストで該当部分を<strike>タグでマークアップしたもの",
  "amazon_unsuitable": ["Amazon検索に不適切なキーワードリスト"],
  "confidence": 0.95
}`
      },
      {
        role: "user",
        content: `以下の商品概要からメーカー名・ブランド名・商品名・型番・独自語句を抽出してください：

${text}

**重要**: 
1. 元のテキストは一切変更しないでください
2. 検出された語句を正確に分類してください
3. Amazon検索で価値のある独自語句も特定してください
4. highlighted_textでは<strike>タグのみを使用してください`
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
    // 商品概要独自のキーワードを追加
    let allKeywords = keywords;
    if (window.uniqueProductKeywords && window.uniqueProductKeywords.length > 0) {
      const uniqueKeywordsStr = window.uniqueProductKeywords.join(' ');
      allKeywords = `${keywords}\n\n【商品概要独自キーワード（検索網拡大に重要）】\n${uniqueKeywordsStr}`;
    }
    
    const cacheKey = this.generateCacheKey(allKeywords);
    if (this.keywordCache.has(cacheKey)) {
      return this.keywordCache.get(cacheKey);
    }

    const messages = [
      {
        role: "system",
        content: `あなたは日本語キーワードの品詞・種類を分析する専門家です。
各キーワードを以下のカテゴリーに分類してください：

**分析対象**：
1. 基本キーワード（ユーザー入力）
2. 商品概要独自キーワード（商品概要でのみ検出された価値語句）

**分類基準**：
1. **名詞**: 物や概念を表す語（イヤホン、コーヒー、ワンピース等）
2. **形容詞**: 性質や状態を表す語（高音質、おしゃれ、快適、上品、着心地等）
3. **複合語**: 複数の語が組み合わさった語（ワイヤレスイヤホン、深煎りコーヒー等）
4. **技術用語**: 専門的な技術語（Bluetooth、WiFi、USB-C等）
5. **ブランド語**: メーカー・ブランド名（Sony、Apple、ZARA等）
6. **独自価値語**: 商品概要独自の価値キーワード（上品、快適、着心地、女性、体型、高品質等）
7. **検索価値**: Amazon検索での重要度（high/medium/low）

**独自価値語の重点評価**：
以下のような語句は高い検索価値を持つと評価してください：
- **品質・質感**: 上品、高品質、高級感、質感、なめらか、しっとり、さらさら、肌触り
- **快適性**: 快適、着心地、履き心地、使い心地、心地よい、楽、らくらく、フィット感
- **対象者**: 女性、男性、レディース、メンズ、大人、子供、ママ、パパ、シニア
- **体型・サイズ**: 体型、スタイル、体形、ぽっちゃり、スリム、細身、ゆったり、大きいサイズ
- **デザイン**: おしゃれ、スタイリッシュ、シンプル、エレガント、モダン、クラシック
- **使用感**: 簡単、便利、手軽、スムーズ、なめらか、安定、使いやすい

出力は以下のJSON形式で返してください：
{
  "analysis": [
    {
      "keyword": "キーワード",
      "type": "カテゴリー",
      "search_value": "high/medium/low",
      "amazon_suitable": true/false,
      "is_unique_product_keyword": true/false,
      "reason": "判定理由"
    }
  ],
  "optimized_keywords": "最適化されたキーワード（半角スペース区切り）",
  "removed_keywords": ["除外されたキーワード"],
  "duplicate_keywords": ["重複していたキーワード"],
  "unique_value_keywords": ["商品概要独自の高価値キーワード"],
  "recommendations": ["改善提案1", "改善提案2"]
}`
      },
      {
        role: "user",
        content: `以下のキーワードを分析してください：\n\n${allKeywords}`
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

**重要な分析観点**：
1. **検索キーワード**: ユーザーが検索で使用する語句（競合を考慮した戦略的選定）
2. **商品概要の独自性**: キーワードリストにない独自の語句が多いほど、より多くの検索クエリにヒット
3. **カバレッジ拡大**: 検索キーワードと商品概要で異なる語句を使うことで、検索網を拡大
4. **独自キーワード価値**: 商品概要にのみ含まれる語句は追加の検索流入源として重要

分析内容：
1. **重複検出**: キーワード間の重複や類似語を特定
2. **独自性評価**: 商品概要内の独自キーワードを高く評価
3. **検索価値評価**: Amazon検索での有効性を判定
4. **カバレッジ分析**: 検索キーワードと商品概要の相補性を評価
5. **最適化提案**: より広範囲な検索をカバーする改善案を提案
6. **独自キーワード抽出**: 商品概要にのみ含まれる価値ある語句を特定

**重要：商品概要テキストの保持**
- highlighted_productでは、元の商品概要テキストを必ず完全に保持してください
- 文章構造、句読点、助詞、改行なども含めて一切変更しないでください
- マークアップタグのみを追加し、元のテキストは絶対に変更・削除しないでください

**ハイライト分類指示（4つの異なる色分け）**：
1. **最適化されたキーワードと一致したキーワード**: <mark>タグでマークアップ（黄色ハイライト用）
   - 検索キーワードと商品概要で一致する語句
   - 部分一致、同義語、類似語も含む
2. **検出されたブランド名、型番、商品名**: <strike>タグでマークアップ（グレーハイライト用）
   - メーカー名、ブランド名、商品名、型番
   - Amazon検索で固有名詞として扱われる語句
3. **禁止ワード**: <del>タグでマークアップ（グレーハイライト用）
   - Amazon規約違反・非推奨語
   - 誇大表現、断定的表現
4. **キーワードチェックされた商品概要でのみ検出されるキーワード**: <em>タグでマークアップ（薄赤色ハイライト用）
   - 商品概要に含まれるが検索キーワードリストにない価値ある語句
   - 検索流入拡大に寄与する独自語句

**キーワード検出の徹底指示**：
- 商品概要内で各キーワードを徹底的に検索
- 完全一致、部分一致、類似語、同義語も検出
- 漢字・ひらがな・カタカナ・英語の表記揺れも対応
- 複合語の構成要素も個別に検出
- 形容詞の活用形も検出（例：「高い」「高く」「高音質」）
- 略語・省略形も検出（例：「ワイヤレス」→「無線」）

**商品概要独自キーワードの重点検出**：
以下のような価値ある語句を必ず検出してください：
1. **品質・質感表現**: 上品、高品質、高級感、質感、なめらか、しっとり、さらさら
2. **快適性表現**: 快適、着心地、履き心地、使い心地、心地よい、楽、らくらく
3. **対象・用途表現**: 女性、男性、レディース、メンズ、大人、子供、ママ、パパ
4. **体型・サイズ表現**: 体型、スタイル、体形、ぽっちゃり、スリム、細身、ゆったり
5. **機能・特徴表現**: 軽量、コンパクト、薄型、防水、耐久性、長持ち、丈夫
6. **デザイン表現**: おしゃれ、スタイリッシュ、シンプル、エレガント、モダン、クラシック
7. **使用感表現**: 簡単、便利、手軽、スムーズ、なめらか、安定
8. **季節・時期表現**: 春夏、秋冬、オールシーズン、夏用、冬用、年中
9. **場面・シーン表現**: 日常、普段使い、お出かけ、旅行、ビジネス、カジュアル
10. **効果・結果表現**: 効果的、実用的、実用性、機能性、パフォーマンス

**検出強化の具体的指示**：
- 形容詞の語幹も検出（例：「快適な」「快適に」「快適さ」→「快適」）
- 複合語の要素も個別検出（例：「着心地良い」→「着心地」「良い」）
- 類似語・同義語も検出（例：「上品」→「品のある」「エレガント」）
- 助詞付きも検出（例：「女性に」「女性の」「女性向け」→「女性」）
- カタカナ・ひらがな表記も検出（例：「レディース」「れでぃーす」）

出力は以下のJSON形式で返してください：
{
  "score": 85,
  "optimized_keywords": "最適化された検索キーワード（重要度順）",
  "highlighted_product": "商品概要（元のテキストを完全保持し、適切なタグでマークアップ済み）",
  "duplicate_count": 3,
  "optimization_count": 2,
  "unique_product_keywords_count": 8,
  "coverage_analysis": {
    "keyword_overlap_ratio": 0.3,
    "unique_product_terms": ["商品概要にのみ含まれる価値ある語句"],
    "search_coverage_expansion": "60%",
    "complementarity_score": 8
  },
  "keyword_matches": {
    "found_keywords": ["商品概要内で見つかった検索キーワード"],
    "missing_keywords": ["商品概要内で見つからなかった検索キーワード"],
    "partial_matches": ["部分一致した検索キーワード"],
    "synonym_matches": ["同義語として一致した検索キーワード"]
  },
  "highlight_analysis": {
    "search_terms": ["検索キーワードとして検出された語（黄色ハイライト）"],
    "brand_terms": ["メーカー・ブランド・型番として検出された語（グレーハイライト）"],
    "forbidden_terms": ["Amazon検索で禁止・非推奨の語（グレーハイライト）"],
    "unique_value_terms": ["商品概要独自の価値キーワード（薄赤色ハイライト）"]
  },
  "analysis_details": {
    "high_value_keywords": ["高価値検索キーワード"],
    "medium_value_keywords": ["中価値検索キーワード"],
    "low_value_keywords": ["低価値検索キーワード"],
    "unique_product_keywords": ["商品概要独自の価値キーワード（キーワード分析に追加対象）"],
    "removed_keywords": ["除外キーワード"],
    "brand_terms": ["ブランド用語"],
    "technical_terms": ["技術用語"]
  },
  "improvements": [
    "より広範囲な検索をカバーする改善提案1",
    "商品概要の独自性を活かした改善提案2",
    "検索網拡大のための改善提案3"
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
        content: `【キーワード一覧】
${keywords}

【商品概要】
${productText}

【重要指示】
1. 商品概要・仕様の入力テキストを必ずそのまま維持してください
2. highlighted_productでは以下の4つの分類で正確にマークアップしてください：
   - **最適化されたキーワードと一致したキーワード**: <mark>タグ（黄色ハイライト）
   - **検出されたブランド名、型番、商品名**: <strike>タグ（グレーハイライト）
   - **禁止ワード**: <del>タグ（グレーハイライト）
   - **キーワードチェックされた商品概要でのみ検出されるキーワード**: <em>タグ（薄赤色ハイライト）

3. キーワードチェックされた商品概要でのみ検出されるキーワードは、キーワード分析でも分析するために analysis_details.unique_product_keywords に必ず含めてください

4. 禁止ワード例：
   - 「最高」「最強」「世界一」「業界No.1」（誇大表現）
   - 「激安」「格安」「破格」（価格関連の誇大表現）
   - 「限定」「特別」「プレミアム」（限定性を強調する語）
   - 「保証」「確実」「絶対」（断定的表現）

5. 独自価値キーワード例（重点検出対象）：
   - **品質・質感**: 上品、高品質、高級感、質感、なめらか、しっとり、さらさら、肌触り
   - **快適性**: 快適、着心地、履き心地、使い心地、心地よい、楽、らくらく、フィット感
   - **対象者**: 女性、男性、レディース、メンズ、大人、子供、ママ、パパ、シニア
   - **体型・サイズ**: 体型、スタイル、体形、ぽっちゃり、スリム、細身、ゆったり、大きいサイズ
   - **機能特徴**: 軽量、コンパクト、薄型、防水、耐久性、長持ち、丈夫、実用的
   - **デザイン**: おしゃれ、スタイリッシュ、シンプル、エレガント、モダン、クラシック
   - **使用感**: 簡単、便利、手軽、スムーズ、なめらか、安定、使いやすい
   - **季節・場面**: 春夏、秋冬、オールシーズン、日常、普段使い、お出かけ、旅行
   - 商品概要に含まれるが検索キーワードリストにない有効な語
   - 技術仕様や特徴を表す語で追加検索流入が期待できるもの
   - 同義語や関連語で検索網を拡大するもの

検索キーワードと商品概要の相補性を活かし、最大限の検索カバレッジを実現する最適化を提案してください。`
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
   * キーワードトレンド分析（強化版）
   * @param {string} keywords - キーワード一覧
   * @param {string} category - 商品カテゴリー
   * @returns {Promise<Object>} - トレンド分析結果
   */
  async analyzeTrends(keywords, category = 'general') {
    const messages = [
      {
        role: "system",
        content: `あなたは日本のEコマース市場とAmazon検索トレンドの専門家です。
指定されたキーワードについて、包括的なトレンド分析を実行してください。

**分析項目**：
1. **市場トレンド**: 現在の人気度・検索ボリューム・成長性
2. **季節性分析**: 月別変動パターン・ピーク時期・需要予測
3. **競合分析**: 市場競争度・参入障壁・差別化要因
4. **関連キーワード**: 併用推奨・代替語・拡張語
5. **新興・衰退トレンド**: 成長キーワード・衰退キーワード
6. **消費者行動**: 検索意図・購買パターン・デモグラフィック
7. **価格トレンド**: 価格帯・価格感度・コスパ重視度
8. **技術トレンド**: 新技術・イノベーション・規格変化

**季節性分析の詳細指示**：
- 各月の需要レベル（1-10スケール）
- ピーク月とその理由
- 低調月とその理由
- 季節イベント（年末年始、夏休み、新生活等）との関連
- 気候・天候による影響

**関連キーワード分析の詳細指示**：
- **併用推奨**: 同時に使うべきキーワード
- **代替語**: 同義語・類似語
- **拡張語**: より具体的・詳細なキーワード
- **ロングテール**: ニッチな組み合わせ
- **競合回避**: 競争の激しいキーワードの代替案

出力は以下のJSON形式で返してください：
{
  "trend_score": 75,
  "market_analysis": {
    "current_popularity": "high/medium/low",
    "search_volume_trend": "increasing/stable/decreasing",
    "growth_potential": "high/medium/low",
    "market_maturity": "emerging/growing/mature/declining",
    "competition_level": "high/medium/low"
  },
  "seasonality": {
    "pattern": "seasonal/steady/volatile",
    "peak_months": [
      {"month": "12月", "level": 10, "reason": "年末商戦・ギフト需要"},
      {"month": "3月", "level": 8, "reason": "新生活準備"}
    ],
    "low_months": [
      {"month": "2月", "level": 3, "reason": "年始の消費控え"},
      {"month": "8月", "level": 4, "reason": "夏季休暇・外出増加"}
    ],
    "seasonal_events": ["年末年始", "新生活", "夏休み", "クリスマス"],
    "weather_impact": "high/medium/low/none"
  },
  "keyword_analysis": {
    "related_keywords": [
      {"keyword": "関連語1", "type": "併用推奨", "strength": "high"},
      {"keyword": "関連語2", "type": "代替語", "strength": "medium"}
    ],
    "emerging_keywords": [
      {"keyword": "新興語1", "growth_rate": "high", "reason": "技術革新"},
      {"keyword": "新興語2", "growth_rate": "medium", "reason": "トレンド変化"}
    ],
    "declining_keywords": [
      {"keyword": "衰退語1", "decline_rate": "high", "reason": "技術陳腐化"},
      {"keyword": "衰退語2", "decline_rate": "medium", "reason": "需要減少"}
    ],
    "longtail_opportunities": ["ロングテール1", "ロングテール2"],
    "competitive_alternatives": ["競合回避語1", "競合回避語2"]
  },
  "consumer_insights": {
    "search_intent": ["情報収集", "比較検討", "購入意図"],
    "target_demographics": ["年齢層", "性別", "ライフスタイル"],
    "purchase_triggers": ["価格", "機能", "ブランド", "レビュー"],
    "decision_factors": ["品質", "価格", "配送", "サポート"]
  },
  "price_trends": {
    "price_sensitivity": "high/medium/low",
    "average_price_range": "価格帯",
    "value_perception": "コスパ重視度",
    "premium_acceptance": "プレミアム受容度"
  },
  "technology_trends": {
    "innovation_impact": "high/medium/low",
    "emerging_technologies": ["新技術1", "新技術2"],
    "disruptive_factors": ["破壊的要因1", "破壊的要因2"],
    "technology_adoption": "早期/中期/後期"
  },
  "recommendations": {
    "immediate_actions": ["即座に実行すべきアクション"],
    "seasonal_strategies": ["季節戦略"],
    "long_term_positioning": ["長期ポジショニング"],
        "risk_mitigation": ["リスク軽減策"]
  }
}
}`
      },
      {
        role: "user",
        content: `【分析対象】
カテゴリー: ${category}
キーワード: ${keywords}

【分析指示】
上記キーワードについて、日本のAmazon市場における包括的なトレンド分析を実行してください。
特に以下の点を重視してください：

1. **季節性**: 日本の季節・イベント・消費パターンを考慮
2. **競合状況**: Amazon内での競争激しさと差別化要因
3. **消費者行動**: 日本の消費者の検索・購買行動パターン
4. **技術トレンド**: 最新技術・規格変更の影響
5. **価格動向**: 価格感度・コスパ意識・プレミアム志向

実用的で具体的な分析結果を提供してください。`
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
   * LLM API呼び出し（タイムアウト・リトライ機能付き）
   * @param {Array} messages - メッセージ配列
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @param {number} retries - リトライ回数
   * @returns {Promise<Object>} - API レスポンス
   */
  async callLLMAPI(messages, timeout = 30000, retries = 2) {
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.3,
      stream: false,
      max_completion_tokens: 3000,
      messages: messages
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // タイムアウト付きfetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API呼び出し失敗: ${response.status} ${response.statusText}`);
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

      } catch (error) {
        console.warn(`API呼び出し試行 ${attempt + 1}/${retries + 1} 失敗:`, error.message);
        
        if (attempt === retries) {
          throw new Error(`API呼び出しが${retries + 1}回失敗しました: ${error.message}`);
        }
        
        // リトライ前に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  /**
   * JSON レスポンスのパース
   * @param {string} text - レスポンステキスト
   * @returns {Object} - パースされたオブジェクト
   */
  parseJSONResponse(text) {
    let jsonText = text;
    
    // デバッグ用：元のレスポンステキストを確認
    console.log('LLMレスポンス（元）:', text);
    
    // ```json で囲まれている場合の処理
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
      console.log('JSONブロック抽出:', jsonText);
    } else {
      // { で始まり } で終わる部分を抽出
      const startIndex = text.indexOf('{');
      const lastIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        jsonText = text.substring(startIndex, lastIndex + 1);
        console.log('JSON部分抽出:', jsonText);
      }
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      console.log('パース成功:', parsed);
      return parsed;
    } catch (error) {
      console.error('JSON パースエラー:', error);
      console.error('元のテキスト:', text);
      console.error('抽出したJSON:', jsonText);
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

  /**
   * 統合詳細分析 - 基本分析、メーカー検出、キーワード分類の結果を統合してさらに深く分析
   * @param {Object} basicAnalysisResult - 基本分析結果
   * @param {Object} manufacturerDetectionResult - メーカー検出結果
   * @param {Object} keywordClassificationResult - キーワード分類結果
   * @param {string} originalKeywords - 元のキーワード文字列
   * @param {string} productDescription - 商品概要
   * @returns {Promise<Object>} - 統合分析結果
   */
  async performIntegratedAnalysis(basicAnalysisResult, manufacturerDetectionResult, keywordClassificationResult, originalKeywords, productDescription) {
    const messages = [
      {
        role: "system", 
        content: `あなたは高度なマーケティング分析専門家です。基本分析、メーカー検出、キーワード分類の結果を統合して、より深い洞察と戦略的提案を行ってください。

**分析フレームワーク**:

1. **競合優位性分析**
   - 検出されたブランド・メーカーの市場ポジション
   - 競合との差別化ポイント
   - 独自性アピール戦略

2. **キーワード戦略最適化**
   - 検索意図と購買段階の分析
   - ロングテールキーワードの可能性
   - SEO効果の最大化方法

3. **ターゲット顧客インサイト**
   - キーワードから読み取れる顧客ニーズ
   - ペルソナ分析と購買動機
   - カスタマージャーニーの最適化

4. **商品価値の最適表現**
   - 検出された特徴・利益の効果的アピール
   - 感情的価値と機能的価値のバランス
   - 購買決定要因の強化

5. **マーケティング戦略提案**
   - チャネル別最適化案
   - 季節性・トレンドを考慮した施策
   - 効果測定指標の設定

**出力形式**:
{
  "overall_assessment": {
    "strengths": ["強み1", "強み2"],
    "weaknesses": ["課題1", "課題2"],
    "opportunities": ["機会1", "機会2"],
    "threats": ["脅威1", "脅威2"]
  },
  "competitive_analysis": {
    "brand_positioning": "ブランドポジショニング分析",
    "differentiation_points": ["差別化要素1", "差別化要素2"],
    "competitive_advantages": ["競合優位性1", "競合優位性2"]
  },
  "keyword_strategy": {
    "search_intent_analysis": "検索意図の分析",
    "longtail_opportunities": ["ロングテール候補1", "ロングテール候補2"],
    "seo_optimization_tips": ["SEO最適化提案1", "SEO最適化提案2"]
  },
  "customer_insights": {
    "target_personas": ["ペルソナ1", "ペルソナ2"],
    "purchase_motivations": ["購買動機1", "購買動機2"],
    "pain_points": ["課題1", "課題2"]
  },
  "value_proposition": {
    "emotional_appeals": ["感情的価値1", "感情的価値2"],
    "functional_benefits": ["機能的利益1", "機能的利益2"],
    "unique_selling_points": ["USP1", "USP2"]
  },
  "marketing_recommendations": {
    "immediate_actions": ["即座に実行すべき施策1", "即座に実行すべき施策2"],
    "medium_term_strategy": ["中期戦略1", "中期戦略2"],
    "long_term_vision": ["長期ビジョン1", "長期ビジョン2"]
  },
  "performance_metrics": {
    "key_indicators": ["KPI1", "KPI2"],
    "measurement_methods": ["測定方法1", "測定方法2"]
  },
  "confidence_score": 0.95,
  "analysis_summary": "分析結果の要約（2-3文）"
}`
      },
      {
        role: "user",
        content: `以下の分析結果を統合して、戦略的なマーケティング洞察を提供してください：

**基本分析結果**:
${JSON.stringify(basicAnalysisResult, null, 2)}

**メーカー検出結果**:
${JSON.stringify(manufacturerDetectionResult, null, 2)}

**キーワード分類結果**:
${JSON.stringify(keywordClassificationResult, null, 2)}

**元のキーワード**:
${originalKeywords}

**商品概要**:
${productDescription}

**重要**: 各分析結果の相関関係を詳しく分析し、統合的な戦略提案を行ってください。`
      }
    ];

    try {
      const response = await this.callAPI(messages, 'integrated_analysis');
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('統合分析エラー:', error);
      return this.generateFallbackIntegratedAnalysis(basicAnalysisResult, manufacturerDetectionResult, keywordClassificationResult);
    }
  }

  /**
   * 統合分析のフォールバック処理
   */
  generateFallbackIntegratedAnalysis(basicAnalysisResult, manufacturerDetectionResult, keywordClassificationResult) {
    return {
      overall_assessment: {
        strengths: ["キーワードの多様性", "商品特徴の明確性"],
        weaknesses: ["ブランド依存度が高い", "差別化要素が不明確"],
        opportunities: ["ニッチ市場への展開", "ロングテールキーワードの活用"],
        threats: ["競合の価格競争", "ブランド力の制限"]
      },
      competitive_analysis: {
        brand_positioning: "検出されたブランドの市場での位置づけを分析中",
        differentiation_points: ["独自機能", "デザイン性"],
        competitive_advantages: ["技術力", "品質"]
      },
      keyword_strategy: {
        search_intent_analysis: "購買意図の高いキーワードが含まれています",
        longtail_opportunities: ["特定用途向けキーワード", "詳細スペック系キーワード"],
        seo_optimization_tips: ["関連キーワードの追加", "検索ボリュームの最適化"]
      },
      customer_insights: {
        target_personas: ["品質重視ユーザー", "機能性重視ユーザー"],
        purchase_motivations: ["品質への信頼", "機能の充実"],
        pain_points: ["価格の高さ", "選択肢の多さ"]
      },
      value_proposition: {
        emotional_appeals: ["安心感", "満足感"],
        functional_benefits: ["高性能", "使いやすさ"],
        unique_selling_points: ["独自技術", "高品質"]
      },
      marketing_recommendations: {
        immediate_actions: ["キーワード重複の解消", "ブランド依存の軽減"],
        medium_term_strategy: ["ニッチキーワードの開拓", "コンテンツマーケティング強化"],
        long_term_vision: ["ブランド独立性の確立", "市場シェア拡大"]
      },
      performance_metrics: {
        key_indicators: ["キーワード最適化スコア", "検索順位", "コンバージョン率"],
        measurement_methods: ["定期的な分析実行", "A/Bテスト", "競合分析"]
      },
      confidence_score: 0.75,
      analysis_summary: "フォールバック分析により基本的な統合洞察を提供しました。より詳細な分析のためにLLM接続を確認してください。"
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
   * スコア計算（独自性とカバレッジ重視）
   * @param {Object} analysisData - 分析データ
   * @returns {number} - 最適化スコア
   */
  static calculateOptimizationScore(analysisData) {
    let score = 100;
    
    // 重複ペナルティ
    if (analysisData.duplicate_count) {
      score -= analysisData.duplicate_count * 5;
    }
    
    // 最適化機会ペナルティ
    if (analysisData.optimization_count) {
      score -= analysisData.optimization_count * 3;
    }
    
    // 商品概要独自キーワードボーナス（新機能）
    if (analysisData.unique_product_keywords_count) {
      score += analysisData.unique_product_keywords_count * 3;
    }
    
    // カバレッジ分析によるボーナス
    if (analysisData.coverage_analysis) {
      const complementarity = analysisData.coverage_analysis.complementarity_score || 0;
      score += complementarity * 2;
    }
    
    // 関連性ボーナス/ペナルティ
    if (analysisData.analysis_details) {
      const highValueCount = analysisData.analysis_details.high_value_keywords?.length || 0;
      const lowValueCount = analysisData.analysis_details.low_value_keywords?.length || 0;
      const uniqueProductCount = analysisData.analysis_details.unique_product_keywords?.length || 0;
      
      score += highValueCount * 2;
      score -= lowValueCount * 2;
      score += uniqueProductCount * 4; // 独自キーワードに高いボーナス
    }
    
    return Math.max(0, Math.min(120, score)); // 最大120点まで許可（独自性ボーナス考慮）
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

// 統合分析用変数
let currentAnalysisResults = null;
let currentOptimizedKeywords = null;
let currentHighlightedProduct = null;
let currentIntegratedAnalysis = null;

// 分析結果の保存用
let basicAnalysisResult = null;
let manufacturerDetectionResult = null;
let keywordClassificationResult = null;

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

// DOM要素の取得（エラー防止のため存在確認）
let keywordInput, productInput, executeBtn, clearBtn, loadingIndicator, progressFill;
let resultsSection, optimizedKeywords, highlightedProduct, overviewImprovementTips;
let analysisDetails, trendAnalysis, scoresSection, mainScoreValue, mainScoreDetail;
let mainScoreBreakdown, trendScoreValue, trendScoreDetail, trendScoreBreakdown;

function initializeDOMElements() {
  // 基本入力要素
  keywordInput = document.getElementById('keywordInput');
  productInput = document.getElementById('productInput');
  executeBtn = document.getElementById('executeBtn');
  clearBtn = document.getElementById('clearBtn');
  loadingIndicator = document.getElementById('loadingIndicator');
  progressFill = document.getElementById('progressFill');
  
  // 結果表示要素
  resultsSection = document.getElementById('resultsSection');
  optimizedKeywords = document.getElementById('optimizedKeywords');
  highlightedProduct = document.getElementById('highlightedProduct');
  overviewImprovementTips = document.getElementById('overviewImprovementTips');
  analysisDetails = document.getElementById('analysisDetails');
  trendAnalysis = document.getElementById('trendAnalysis');
  
  // アクションボタン要素
  const copyKeywordsBtn = document.getElementById('copyKeywordsBtn');
  const replaceKeywordsBtn = document.getElementById('replaceKeywordsBtn');
  const detailedAnalysisBtn = document.getElementById('detailedAnalysisBtn');
  
  // ボタン要素をグローバルに保存（他の関数からアクセスするため）
  window.copyKeywordsBtn = copyKeywordsBtn;
  window.replaceKeywordsBtn = replaceKeywordsBtn;
  window.detailedAnalysisBtn = detailedAnalysisBtn;
  
  // スコア表示要素
  scoresSection = document.getElementById('scoresSection');
  mainScoreValue = document.getElementById('mainScoreValue');
  mainScoreDetail = document.getElementById('mainScoreDetail');
  mainScoreBreakdown = document.getElementById('mainScoreBreakdown');
  trendScoreValue = document.getElementById('trendScoreValue');
  trendScoreDetail = document.getElementById('trendScoreDetail');
  trendScoreBreakdown = document.getElementById('trendScoreBreakdown');

  // 統合分析関連要素
  window.integratedAnalysisSection = document.getElementById('integratedAnalysisSection');
  window.basicAnalysisSummary = document.getElementById('basicAnalysisSummary');
  window.manufacturerSummary = document.getElementById('manufacturerSummary');
  window.classificationSummary = document.getElementById('classificationSummary');
  window.integratedInsightsContent = document.getElementById('integratedInsightsContent');
  
  // 重要な要素の存在確認
  const criticalElements = [
    { element: keywordInput, name: 'keywordInput' },
    { element: productInput, name: 'productInput' },
    { element: executeBtn, name: 'executeBtn' },
    { element: overviewImprovementTips, name: 'overviewImprovementTips' }
  ];
  
  const missingElements = criticalElements.filter(({ element, name }) => {
    if (!element) {
      console.error(`重要なDOM要素が見つかりません: ${name}`);
      return true;
    }
    return false;
  });
  
  if (missingElements.length > 0) {
    console.error('必要なDOM要素が不足しています:', missingElements.map(e => e.name));
    return false;
  }
  
  return true;
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の初期化
  if (!initializeDOMElements()) {
    console.error('DOM要素の初期化に失敗しました');
    alert('ページの読み込みに問題があります。ページを再読み込みしてください。');
    return;
  }
  
  analyzer = new KeywordAnalyzer('https://nurumayu-worker.skume-bioinfo.workers.dev/');
  setupEventListeners();
  
  // 初期状態でスコアセクションを非表示に設定
  if (scoresSection) scoresSection.classList.remove('active');
  if (resultsSection) resultsSection.classList.remove('active');
  
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
  if (executeBtn) executeBtn.addEventListener('click', handleAnalysisExecution);
  
  // クリアボタン
  if (clearBtn) clearBtn.addEventListener('click', clearAllData);
  
  // キーワードアクションボタン
  if (copyKeywordsBtn) copyKeywordsBtn.addEventListener('click', copyOptimizedKeywords);
  if (replaceKeywordsBtn) replaceKeywordsBtn.addEventListener('click', replaceKeywordsInput);
  
  // 詳細解析ボタン
  if (window.detailedAnalysisBtn) {
    window.detailedAnalysisBtn.addEventListener('click', handleDetailedAnalysis);
  }
  
  // 入力フィールドの変更を監視してローカルストレージに保存
  if (keywordInput) keywordInput.addEventListener('input', saveInputData);
  if (productInput) productInput.addEventListener('input', saveInputData);
  
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
  if (!keywordInput) return;
  
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
  if (!productInput) return;
  
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
  
  // 現在のタブをローカルストレージに保存
  localStorage.setItem('keywordCheckerActiveTab', tabName);
}

// 保存されたアクティブタブを復元
function restoreActiveTab() {
  const savedTab = localStorage.getItem('keywordCheckerActiveTab');
  if (savedTab) {
    // 有効なタブ名かチェック
    const validTabs = ['overview', 'detailed', 'trends'];
    if (validTabs.includes(savedTab)) {
      // 少し遅延してからタブを切り替え（DOM要素が確実に準備されるまで待機）
      setTimeout(() => {
        switchTab(savedTab);
        console.log(`保存されたタブを復元しました: ${savedTab}`);
      }, 100);
    }
  }
}

// 分析実行メイン処理
async function handleAnalysisExecution() {
  if (!keywordInput || !productInput) {
    alert('入力エリアが見つかりません。ページを再読み込みしてください。');
    return;
  }
  
  const keywords = keywordInput.value.trim();
  const product = productInput.value.trim();

  if (!keywords || !product) {
    alert('キーワード入力と商品概要の両方を入力してください。');
    return;
  }

  try {
    startLoadingIndicator();
    
    // パフォーマンス計測開始
    const startTime = performance.now();
    console.log('分析開始:', new Date().toLocaleTimeString());
    
    // 全ての分析を実行
    const results = await executeComprehensiveAnalysis(keywords, product);
    
    // パフォーマンス計測終了
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    console.log(`分析完了: ${executionTime}ms (${(executionTime / 1000).toFixed(1)}秒)`);
    
    // 結果にパフォーマンス情報を追加
    results.performance = {
      executionTime: executionTime,
      timestamp: new Date().toISOString(),
      analysisCount: Object.keys(results.data).length
    };
    
    displayResults(results);
    
    // 分析完了後に入力データも保存
    saveInputData();
    
  } catch (error) {
    console.error('分析エラー:', error);
    console.error('エラースタック:', error.stack);
    
    // DOM要素のnull参照の場合の特別な処理
    if (error.message.includes('Cannot set properties of null')) {
      console.error('DOM要素のnull参照エラーが発生しました。DOM初期化を確認してください。');
      alert('ページの初期化に問題があります。ページを再読み込みしてから再実行してください。');
    } else {
      alert(`分析中にエラーが発生しました: ${error.message}`);
    }
  } finally {
    stopLoadingIndicator();
  }
}

// 包括的分析（全ての分析を並列実行で高速化）
async function executeComprehensiveAnalysis(keywords, product) {
  const results = { type: 'comprehensive', data: {} };
  
  updateProgress(10);
  
  // 並列実行用のPromise配列を作成
  const analysisPromises = [];
  const analysisNames = [];
  
  // 基本分析（必須）
  analysisPromises.push(analyzer.performComprehensiveAnalysis(keywords, product));
  analysisNames.push('comprehensive');
  
  // メーカー名検出（オプション）
  if (analysisOptions['manufacturer-detection']) {
    analysisPromises.push(analyzer.detectManufacturersAndBrands(product));
    analysisNames.push('manufacturers');
  }
  
  // キーワード分類（オプション）
  if (analysisOptions['keyword-classification']) {
    analysisPromises.push(analyzer.analyzeKeywordTypes(keywords));
    analysisNames.push('keywordTypes');
  }
  
  // トレンド分析（オプション）
  if (analysisOptions['trend-analysis']) {
    analysisPromises.push(analyzer.analyzeTrends(keywords, 'general'));
    analysisNames.push('trends');
  }
  
  updateProgress(25);
  
  try {
    // 全ての分析を並列実行
    console.log(`${analysisPromises.length}個の分析を並列実行中...`);
    const analysisResults = await Promise.all(analysisPromises);
    
    updateProgress(85);
    
    // 結果をマッピング
    analysisResults.forEach((result, index) => {
      results.data[analysisNames[index]] = result;
    });
    
    updateProgress(100);
    
    console.log('全ての分析が完了しました');
    return results;
    
  } catch (error) {
    console.error('並列分析中にエラーが発生:', error);
    
    // エラーが発生した場合は順次実行にフォールバック
    console.log('順次実行にフォールバック中...');
    return await executeSequentialAnalysis(keywords, product);
  }
}

// フォールバック用の順次実行関数
async function executeSequentialAnalysis(keywords, product) {
  const results = { type: 'comprehensive', data: {} };
  
  updateProgress(30);
  
  try {
    // 基本分析
    const comprehensiveAnalysis = await analyzer.performComprehensiveAnalysis(keywords, product);
    results.data.comprehensive = comprehensiveAnalysis;
    updateProgress(50);
    
    // メーカー名検出
    if (analysisOptions['manufacturer-detection']) {
      const manufacturerAnalysis = await analyzer.detectManufacturersAndBrands(product);
      results.data.manufacturers = manufacturerAnalysis;
    }
    updateProgress(70);
    
    // キーワード分類
    if (analysisOptions['keyword-classification']) {
      const keywordAnalysis = await analyzer.analyzeKeywordTypes(keywords);
      results.data.keywordTypes = keywordAnalysis;
    }
    updateProgress(85);
    
    // トレンド分析
    if (analysisOptions['trend-analysis']) {
      const trendAnalysis = await analyzer.analyzeTrends(keywords, 'general');
      results.data.trends = trendAnalysis;
    }
    updateProgress(100);
    
    return results;
    
  } catch (error) {
    console.error('順次実行でもエラーが発生:', error);
    throw error;
  }
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
  if (scoresSection) scoresSection.classList.add('active');
  if (resultsSection) resultsSection.classList.add('active');
  
  // スコアセクションまでスクロール
  if (scoresSection) {
    scoresSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  // 結果をローカルストレージに保存
  saveResultsData(results);
  console.log('分析結果をローカルストレージに保存しました');
}

// メインスコア表示
function displayMainScores(data) {
  // キーワード最適化スコア表示
  if (data.comprehensive) {
    const comprehensiveData = data.comprehensive;
    
    // スコア値表示
    if (mainScoreValue) {
      mainScoreValue.textContent = comprehensiveData.score || 0;
    }
    if (mainScoreDetail) {
      mainScoreDetail.textContent = `重複キーワード数: ${comprehensiveData.duplicate_count || 0}個 | 最適化候補: ${comprehensiveData.optimization_count || 0}個`;
    }
    
    // 算出根拠表示
    displayMainScoreBreakdown(comprehensiveData);
  }
  
  // トレンドスコア表示
  if (data.trends) {
    const trendData = data.trends;
    
    if (trendScoreValue) {
      trendScoreValue.textContent = trendData.trend_score || 0;
    }
    if (trendScoreDetail) {
      trendScoreDetail.textContent = `人気度: ${trendData.current_popularity || '-'} | 成長性: ${trendData.growth_potential || '-'}`;
    }
    
    // トレンドスコア算出根拠表示
    displayTrendScoreBreakdown(trendData);
  }
}

// メインスコア算出根拠表示（独自性重視）
function displayMainScoreBreakdown(data) {
  if (!mainScoreBreakdown) {
    console.warn('mainScoreBreakdown要素が見つかりません');
    return;
  }
  
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
  
  // 商品概要独自キーワードボーナス（新機能）
  if (data.unique_product_keywords_count > 0) {
    const bonus = data.unique_product_keywords_count * 3;
    breakdownHTML += `<li>商品概要独自キーワード: +${bonus}点 (${data.unique_product_keywords_count}個 × 3点)</li>`;
  }
  
  // カバレッジボーナス
  if (data.coverage_analysis && data.coverage_analysis.complementarity_score > 0) {
    const bonus = data.coverage_analysis.complementarity_score * 2;
    breakdownHTML += `<li>カバレッジ相補性: +${bonus}点 (${data.coverage_analysis.complementarity_score}点 × 2)</li>`;
  }
  
  // 高価値キーワードボーナス
  if (data.analysis_details && data.analysis_details.high_value_keywords) {
    const bonus = data.analysis_details.high_value_keywords.length * 2;
    breakdownHTML += `<li>高価値検索キーワード: +${bonus}点 (${data.analysis_details.high_value_keywords.length}個 × 2点)</li>`;
  }
  
  // 独自価値キーワードボーナス
  if (data.analysis_details && data.analysis_details.unique_product_keywords) {
    const bonus = data.analysis_details.unique_product_keywords.length * 4;
    breakdownHTML += `<li>独自価値キーワード: +${bonus}点 (${data.analysis_details.unique_product_keywords.length}個 × 4点)</li>`;
  }
  
  // 低価値キーワードペナルティ
  if (data.analysis_details && data.analysis_details.low_value_keywords) {
    const penalty = data.analysis_details.low_value_keywords.length * 2;
    breakdownHTML += `<li>低価値キーワード: -${penalty}点 (${data.analysis_details.low_value_keywords.length}個 × 2点)</li>`;
  }
  
  breakdownHTML += '</ul>';
  if (mainScoreBreakdown) {
    mainScoreBreakdown.innerHTML = breakdownHTML;
  }
}

// トレンドスコア算出根拠表示
function displayTrendScoreBreakdown(data) {
  if (!trendScoreBreakdown) {
    console.warn('trendScoreBreakdown要素が見つかりません');
    return;
  }
  
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
  if (trendScoreBreakdown) {
    trendScoreBreakdown.innerHTML = breakdownHTML;
  }
}

// 基本結果表示
function displayBasicResults(data) {
  // 最適化されたキーワード表示（重複除去・半角スペース区切り・メーカー名ハイライト）
  displayOptimizedKeywords(data);
  
  // ハイライトされた商品概要表示
  if (highlightedProduct) {
    let highlightedText = data.highlighted_product || '';
    
    // LLMからの4つの異なるハイライトタグを正確に適用
    highlightedText = highlightedText.replace(/<mark>(.*?)<\/mark>/g, '<span class="highlight-yellow">$1</span>'); // 最適化されたキーワードと一致（黄色）
    highlightedText = highlightedText.replace(/<strike>(.*?)<\/strike>/g, '<span class="highlight-gray">$1</span>'); // ブランド名・型番・商品名（グレー）
    highlightedText = highlightedText.replace(/<del>(.*?)<\/del>/g, '<span class="highlight-forbidden">$1</span>'); // 禁止ワード（グレー）
    highlightedText = highlightedText.replace(/<em>(.*?)<\/em>/g, '<span class="highlight-red">$1</span>'); // 商品概要でのみ検出されるキーワード（薄赤色）
    
    // 追加でキーワードハイライト処理を実行（LLMで検出されなかった場合のフォールバック）
    highlightedText = enhanceAdvancedHighlighting(highlightedText, data);
    
    highlightedProduct.innerHTML = highlightedText;
  } else {
    console.warn('highlightedProduct要素が見つかりません');
  }
  
  // キーワードチェックされた商品概要でのみ検出されるキーワードをグローバルに保存（キーワード分析用）
  if (data.highlight_analysis && data.highlight_analysis.unique_value_terms) {
    window.uniqueProductKeywords = data.highlight_analysis.unique_value_terms;
  }
  if (data.analysis_details && data.analysis_details.unique_product_keywords) {
    if (!window.uniqueProductKeywords) {
      window.uniqueProductKeywords = [];
    }
    window.uniqueProductKeywords = [...new Set([...window.uniqueProductKeywords, ...data.analysis_details.unique_product_keywords])];
  }
  
  // 改善提案表示（ハイライト強化版）
  if (overviewImprovementTips) {
    overviewImprovementTips.innerHTML = '';
    
    // ハイライト分析情報を表示
    if (data.highlight_analysis) {
      const highlight = data.highlight_analysis;
      
      if (highlight.forbidden_terms && highlight.forbidden_terms.length > 0) {
        const li = document.createElement('li');
        li.className = 'critical';
        li.innerHTML = `<strong>🚫 禁止ワード検出:</strong> <span class="tip-keyword-list">${highlight.forbidden_terms.join(' ')}</span> - <span class="tip-highlight">Amazon規約に注意が必要です</span>`;
        overviewImprovementTips.appendChild(li);
      }
      
      if (highlight.unique_value_terms && highlight.unique_value_terms.length > 0) {
        const li = document.createElement('li');
        li.className = 'success';
        li.innerHTML = `<strong>💡 商品概要独自キーワード:</strong> <span class="tip-keyword-list">${highlight.unique_value_terms.join(' ')}</span> - <span class="tip-action">キーワード分析に追加されました</span>`;
        overviewImprovementTips.appendChild(li);
      }
      
      if (highlight.search_terms && highlight.search_terms.length > 0) {
        const li = document.createElement('li');
        li.className = 'success';
        li.innerHTML = `<strong>✅ 最適化済みキーワード:</strong> <span class="tip-number">${highlight.search_terms.length}個</span>のキーワードが適切に配置されています`;
        overviewImprovementTips.appendChild(li);
      }
      
      if (highlight.brand_terms && highlight.brand_terms.length > 0) {
        const li = document.createElement('li');
        li.className = 'info';
        li.innerHTML = `<strong>🏷️ ブランド・型番検出:</strong> <span class="tip-keyword-list">${highlight.brand_terms.join(' ')}</span> - <span class="tip-highlight">グレーでハイライトされています</span>`;
        overviewImprovementTips.appendChild(li);
      }
    }
    
    // キーワードマッチング情報を表示
    if (data.keyword_matches) {
      const matches = data.keyword_matches;
      if (matches.missing_keywords && matches.missing_keywords.length > 0) {
        const li = document.createElement('li');
        li.className = 'critical';
        li.innerHTML = `<strong>⚠️ 未検出キーワード:</strong> <span class="tip-keyword-list">${matches.missing_keywords.join(' ')}</span> - <span class="tip-action">商品概要での表現を確認してください</span>`;
        overviewImprovementTips.appendChild(li);
      }
      if (matches.found_keywords && matches.found_keywords.length > 0) {
        const li = document.createElement('li');
        li.className = 'success';
        li.innerHTML = `<strong>🎯 検出済みキーワード:</strong> <span class="tip-number">${matches.found_keywords.length}個</span> - 黄色でハイライトされています`;
        overviewImprovementTips.appendChild(li);
      }
    }
    
    // カバレッジ分析情報を表示
    if (data.coverage_analysis) {
      const coverage = data.coverage_analysis;
      
      if (coverage.unique_product_terms && coverage.unique_product_terms.length > 0) {
        const li = document.createElement('li');
        li.className = 'success';
        li.innerHTML = `<strong>🌟 商品概要独自語句:</strong> <span class="tip-number">${coverage.unique_product_terms.length}個</span>の独自語句が検索網拡大に貢献 - <span class="tip-highlight">薄赤色でハイライトされています</span>`;
        overviewImprovementTips.appendChild(li);
      }
      
      if (coverage.search_coverage_expansion) {
        const expansionRate = parseFloat(coverage.search_coverage_expansion.replace('%', ''));
        const li = document.createElement('li');
        li.className = expansionRate >= 50 ? 'success' : expansionRate >= 30 ? 'info' : 'critical';
        const icon = expansionRate >= 50 ? '🚀' : expansionRate >= 30 ? '📈' : '📊';
        li.innerHTML = `<strong>${icon} 検索カバレッジ拡大:</strong> <span class="tip-number">${coverage.search_coverage_expansion}</span> - ${expansionRate >= 50 ? '<span class="tip-highlight">優秀な検索網拡大</span>' : expansionRate >= 30 ? '<span class="tip-action">良好な検索網拡大</span>' : '<span class="tip-highlight">検索網拡大の改善余地あり</span>'}`;
        overviewImprovementTips.appendChild(li);
      }
    }
    
    // 通常の改善提案を表示（ハイライト処理付き）
    if (data.improvements && Array.isArray(data.improvements)) {
      data.improvements.forEach(tip => {
        const li = document.createElement('li');
        
        // 提案の重要度を判定してクラスとアイコンを設定
        let icon = '💡';
        if (tip.includes('禁止') || tip.includes('注意') || tip.includes('削除') || tip.includes('避ける')) {
          li.className = 'critical';
          icon = '🚫';
        } else if (tip.includes('追加') || tip.includes('改善') || tip.includes('最適化') || tip.includes('強化')) {
          li.className = 'info';
          icon = '💡';
        } else if (tip.includes('良好') || tip.includes('適切') || tip.includes('効果的')) {
          li.className = 'success';
          icon = '✅';
        }
        
        // テキスト内の重要な部分をハイライト
        let enhancedTip = tip;
        
        // 数字をハイライト
        enhancedTip = enhancedTip.replace(/(\d+)([個件点%])/g, '<span class="tip-number">$1$2</span>');
        
        // キーワードをハイライト（「」で囲まれた部分）- コンマを除去して半角スペース区切りに
        enhancedTip = enhancedTip.replace(/「([^」]+)」/g, (match, keywords) => {
          const cleanKeywords = keywords.replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim();
          return `<span class="tip-keyword-list">${cleanKeywords}</span>`;
        });
        
        // アクション語をハイライト
        enhancedTip = enhancedTip.replace(/(追加|削除|改善|最適化|強化|確認|検討|注意|推奨|必要)/g, '<span class="tip-action">$1</span>');
        
        // 重要な警告語をハイライト
        enhancedTip = enhancedTip.replace(/(禁止|注意が必要|規約違反|非推奨|危険|問題)/g, '<span class="tip-highlight">$1</span>');
        
        // 効果的な語句をハイライト
        enhancedTip = enhancedTip.replace(/(効果的|良好|適切|優秀|向上|改善|最適)/g, '<span class="tip-success">$1</span>');
        
        // 価値のある語句をハイライト
        enhancedTip = enhancedTip.replace(/(価値|重要|有効|貢献|拡大|強化)/g, '<span class="tip-value">$1</span>');
        
        li.innerHTML = `<strong>${icon}</strong> ${enhancedTip}`;
        overviewImprovementTips.appendChild(li);
      });
    }
    
    // 提案が何もない場合のメッセージ
    if (overviewImprovementTips.children.length === 0) {
      const li = document.createElement('li');
      li.className = 'success';
      li.innerHTML = '<strong>🎉 分析完了:</strong> 現在のキーワード構成は <span class="tip-highlight">良好な状態</span> です';
      overviewImprovementTips.appendChild(li);
    }
  } else {
    console.warn('overviewImprovementTips要素が見つかりません');
  }
}



// 高度なキーワードハイライト機能（新しい分類対応）
function enhanceAdvancedHighlighting(text, analysisData) {
  let enhancedText = text;
  
  // LLMからのハイライト分析データを使用（利用可能な場合）
  if (analysisData.highlight_analysis) {
    const highlightData = analysisData.highlight_analysis;
    
    // 未最適化キーワードをハイライト（LLMで検出されなかった場合のフォールバック）
    if (highlightData.unoptimized_terms) {
      highlightData.unoptimized_terms.forEach(term => {
        if (term && term.trim()) {
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?<!<span[^>]*>)\\b(${escapedTerm})\\b(?![^<]*</span>)`, 'gi');
          enhancedText = enhancedText.replace(regex, '<span class="highlight-red">$1</span>');
        }
      });
    }
    
    // 禁止ワードをハイライト（LLMで検出されなかった場合のフォールバック）
    if (highlightData.forbidden_terms) {
      highlightData.forbidden_terms.forEach(term => {
        if (term && term.trim()) {
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?<!<span[^>]*>)\\b(${escapedTerm})\\b(?![^<]*</span>)`, 'gi');
          enhancedText = enhancedText.replace(regex, '<span class="highlight-forbidden">$1</span>');
        }
      });
    }
  }
  
  // フォールバック: 従来のキーワードハイライト処理
  enhancedText = enhanceKeywordHighlighting(enhancedText, analysisData);
  
  // フォールバック: メーカー名・ブランド名・型番をハイライト
  if (window.currentAnalysisResults && window.currentAnalysisResults.manufacturers) {
    const manufacturers = window.currentAnalysisResults.manufacturers;
    const allBrands = [
      ...(manufacturers.manufacturers || []),
      ...(manufacturers.brands || []),
      ...(manufacturers.products || []),
      ...(manufacturers.model_numbers || []),
      ...(manufacturers.all_detected_terms || [])
    ];
    
    // 重複を除去し、長い順にソート
    const uniqueBrands = [...new Set(allBrands)].sort((a, b) => b.length - a.length);
    
    uniqueBrands.forEach(brand => {
      if (brand && brand.trim()) {
        const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 既にハイライトされていない部分のみをハイライト
        const regex = new RegExp(`(?<!<span[^>]*>)\\b(${escapedBrand})\\b(?![^<]*</span>)`, 'gi');
        enhancedText = enhancedText.replace(regex, '<span class="highlight-gray">$1</span>');
      }
    });
  }
  
  // フォールバック: 独自価値キーワードをハイライト（薄赤色）
  const commonUniqueValueWords = [
    '上品', '快適', '着心地', '履き心地', '使い心地', '女性', '男性', '体型', '高品質',
    '質感', 'なめらか', 'しっとり', 'さらさら', '肌触り', 'フィット感',
    'レディース', 'メンズ', '大人', '子供', 'ママ', 'パパ', 'シニア',
    'スタイル', '体形', 'ぽっちゃり', 'スリム', '細身', 'ゆったり', '大きいサイズ',
    'おしゃれ', 'スタイリッシュ', 'シンプル', 'エレガント', 'モダン', 'クラシック',
    '簡単', '便利', '手軽', 'スムーズ', '安定', '使いやすい',
    '春夏', '秋冬', 'オールシーズン', '日常', '普段使い', 'お出かけ', '旅行',
    '実用的', '機能性', 'パフォーマンス', '効果的'
  ];
  
  commonUniqueValueWords.forEach(word => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!<span[^>]*>)\\b(${escapedWord})\\b(?![^<]*</span>)`, 'gi');
    enhancedText = enhancedText.replace(regex, '<span class="highlight-red">$1</span>');
  });
  
  // フォールバック: 一般的な禁止ワードをハイライト
  const commonForbiddenWords = [
    '最高', '最強', '世界一', '業界No.1', '業界ナンバーワン',
    '激安', '格安', '破格', '超安', '最安',
    '限定', '特別', 'プレミアム', 'エクスクルーシブ',
    '保証', '確実', '絶対', '必ず', '間違いなく',
    '完璧', 'パーフェクト', '究極', '至高'
  ];
  
  commonForbiddenWords.forEach(word => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!<span[^>]*>)\\b(${escapedWord})\\b(?![^<]*</span>)`, 'gi');
    enhancedText = enhancedText.replace(regex, '<span class="highlight-forbidden">$1</span>');
  });
  
  return enhancedText;
}

// 従来のキーワードハイライト機能（フォールバック用）
function enhanceKeywordHighlighting(text, analysisData) {
  if (!analysisData.optimized_keywords) return text;
  
  // 最適化されたキーワードを取得
  const keywords = analysisData.optimized_keywords.split(/[\s,]+/).filter(k => k.trim() !== '');
  
  // キーワード同義語マッピング
  const synonymMap = {
    'ワイヤレス': ['無線', 'コードレス', 'wireless'],
    '高音質': ['高品質', 'クリア', '音質', 'high quality', 'clear'],
    'イヤホン': ['ヘッドホン', 'オーディオ', 'earphone', 'headphone'],
    '防水': ['耐水', 'IPX', 'waterproof'],
    'Bluetooth': ['ブルートゥース', 'BT'],
    'ノイズキャンセリング': ['ノイキャン', 'NC', 'noise canceling'],
    'スポーツ': ['運動', 'エクササイズ', 'フィットネス'],
    'バッテリー': ['電池', 'battery', '充電'],
    'レディース': ['女性', '婦人', 'women'],
    'ワンピース': ['ドレス', 'dress'],
    'おしゃれ': ['オシャレ', 'ファッション', 'stylish'],
    'カジュアル': ['casual', 'カジュアル'],
    'フォーマル': ['formal', 'フォーマル'],
    'コーヒー': ['珈琲', 'coffee'],
    '有機': ['オーガニック', 'organic'],
    '深煎り': ['ダークロースト', 'dark roast']
  };
  
  let enhancedText = text;
  
  // 各キーワードとその同義語をハイライト
  keywords.forEach(keyword => {
    if (!keyword || keyword.trim() === '') return;
    
    const searchTerms = [keyword];
    
    // 同義語を追加
    if (synonymMap[keyword]) {
      searchTerms.push(...synonymMap[keyword]);
    }
    
    // 部分一致も追加（3文字以上の場合）
    if (keyword.length >= 3) {
      // 複合語の構成要素を抽出
      const components = extractWordComponents(keyword);
      searchTerms.push(...components);
    }
    
    // 各検索語でハイライト（既にハイライトされていない場合のみ）
    searchTerms.forEach(term => {
      if (term && term.trim() && term.length >= 2) {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 既にハイライトされていない部分のみをハイライト
        const regex = new RegExp(`(?<!<span[^>]*>)\\b(${escapedTerm})\\b(?![^<]*</span>)`, 'gi');
        enhancedText = enhancedText.replace(regex, '<span class="highlight-yellow">$1</span>');
      }
    });
  });
  
  return enhancedText;
}

// 複合語の構成要素を抽出
function extractWordComponents(word) {
  const components = [];
  
  // カタカナ複合語の分解
  if (/^[ァ-ヶー]+$/.test(word)) {
    // 一般的な区切りパターン
    const patterns = [
      /^(ワイヤレス)(.+)$/,
      /^(.+)(イヤホン)$/,
      /^(.+)(ヘッドホン)$/,
      /^(ノイズ)(キャンセリング)$/,
      /^(.+)(プレーヤー)$/
    ];
    
    patterns.forEach(pattern => {
      const match = word.match(pattern);
      if (match) {
        components.push(...match.slice(1).filter(c => c && c.length >= 2));
      }
    });
  }
  
  // 英数字混在の分解
  if (/[a-zA-Z]/.test(word) && /[0-9]/.test(word)) {
    const alphaMatch = word.match(/[a-zA-Z]+/g);
    const numMatch = word.match(/[0-9]+/g);
    if (alphaMatch) components.push(...alphaMatch.filter(c => c.length >= 2));
    if (numMatch) components.push(...numMatch.filter(c => c.length >= 2));
  }
  
  return components;
}

// グレーハイライトされたキーワードを除外してクリーンなキーワード文字列を取得
function getCleanKeywords(htmlString) {
  // HTMLタグを除去してテキストのみを抽出
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  
  // グレーハイライトされた要素を除外
  const grayElements = tempDiv.querySelectorAll('.highlight-gray');
  grayElements.forEach(element => element.remove());
  
  // 残ったテキストを取得して整形
  const cleanText = tempDiv.textContent || tempDiv.innerText || '';
  return cleanText.replace(/\s+/g, ' ').trim();
}

// 最適化されたキーワード表示
function displayOptimizedKeywords(data) {
  let keywords = data.optimized_keywords || '';
  
  // コンマ区切りを半角スペース区切りに変換
  keywords = keywords.replace(/,\s*/g, ' ');
  
  // キーワード配列を作成
  const keywordArray = keywords.split(/\s+/).filter(k => k.trim() !== '');
  
  // 完全語彙一致の重複のみを除去
  const processedKeywords = [];
  const exactDuplicates = new Set();
  
  keywordArray.forEach(current => {
    const trimmed = current.trim();
    let isExactDuplicate = false;
    
    // 完全一致の重複をチェック
    for (const processed of processedKeywords) {
      if (trimmed.toLowerCase() === processed.text.toLowerCase()) {
        exactDuplicates.add(trimmed);
        isExactDuplicate = true;
        break;
      }
    }
    
    if (!isExactDuplicate) {
      // 他のキーワードを一部に含むかチェック
      let isPartialMatch = false;
      for (const processed of processedKeywords) {
        const other = processed.text.toLowerCase();
        const currentLower = trimmed.toLowerCase();
        if (currentLower !== other && (currentLower.includes(other) || other.includes(currentLower))) {
          isPartialMatch = true;
          break;
        }
      }
      
      processedKeywords.push({
        text: trimmed,
        isPartialMatch: isPartialMatch
      });
    }
  });
  
  // HTMLを構築
  let displayKeywords = processedKeywords.map(keywordObj => {
    if (keywordObj.isPartialMatch) {
      return `<span class="keyword-partial-match">${keywordObj.text}</span>`;
    }
    return keywordObj.text;
  }).join(' ');
  
  // グローバルな分析結果からメーカー名・ブランド名・型番を取得してハイライト
  if (window.currentAnalysisResults && window.currentAnalysisResults.manufacturers) {
    const manufacturers = window.currentAnalysisResults.manufacturers;
    const allBrands = [
      ...(manufacturers.manufacturers || []),
      ...(manufacturers.brands || []),
      ...(manufacturers.products || []),
      ...(manufacturers.model_numbers || []),
      ...(manufacturers.all_detected_terms || [])  // 検出された全ての用語を追加
    ];
    
    // 重複を除去し、長い順にソート（部分一致を防ぐため）
    const uniqueBrands = [...new Set(allBrands)].sort((a, b) => b.length - a.length);
    
    uniqueBrands.forEach(brand => {
      if (brand && brand.trim()) {
        // より柔軟な正規表現パターンを使用
        const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedBrand})\\b`, 'gi');
        displayKeywords = displayKeywords.replace(regex, '<span class="highlight-gray">$1</span>');
      }
    });
  }
  
  // グローバルに最適化されたキーワード（グレーハイライト除外版）を保存
  window.cleanOptimizedKeywords = getCleanKeywords(displayKeywords);
  
  if (optimizedKeywords) {
    optimizedKeywords.innerHTML = displayKeywords;
  } else {
    console.warn('optimizedKeywords要素が見つかりません');
  }
}

// 高度分析結果表示
function displayAdvancedResults(data) {
  if (!analysisDetails) {
    console.warn('analysisDetails要素が見つかりません');
    return;
  }
  
  analysisDetails.innerHTML = '';
  
  // キーワード分類セクション（上部・横長）
  if (data.keywordTypes && data.keywordTypes.analysis) {
    const classificationSection = document.createElement('div');
    classificationSection.className = 'keyword-classification-section';
    
    // コピー用のキーワードリストを作成
    const classificationKeywords = data.keywordTypes.analysis.map(item => item.keyword);
    
    const keywordCard = createDetailCard('キーワード分類', '各キーワードの種類と価値を分析', classificationKeywords);
    const keywordContent = document.createElement('div');
    
    data.keywordTypes.analysis.forEach(item => {
      const tag = document.createElement('span');
      tag.className = `keyword-tag ${item.search_value}-value`;
      tag.textContent = `${item.keyword} (${item.type})`;
      tag.title = item.reason;
      keywordContent.appendChild(tag);
    });
    
    keywordCard.appendChild(keywordContent);
    classificationSection.appendChild(keywordCard);
    analysisDetails.appendChild(classificationSection);
  }
  
  // 2x2グリッドセクション（下部）
  const gridSection = document.createElement('div');
  gridSection.className = 'keyword-values-grid';
  
  // 検出されたブランド（左上）
  if (data.manufacturers) {
    const allBrands = [
      ...(data.manufacturers.manufacturers || []),
      ...(data.manufacturers.brands || []),
      ...(data.manufacturers.products || []),
      ...(data.manufacturers.model_numbers || [])
    ];
    
    const manufacturerCard = createDetailCard('検出されたブランド', 'Amazon検索に不適切な可能性のある項目', allBrands.length > 0 ? allBrands : null);
    const manufacturerContent = document.createElement('div');
    
    if (allBrands.length > 0) {
      allBrands.forEach(brand => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag low-value';
        tag.textContent = brand;
        manufacturerContent.appendChild(tag);
      });
    } else {
      manufacturerContent.textContent = 'ブランド名は検出されませんでした';
      manufacturerContent.style.color = 'var(--text-secondary)';
      manufacturerContent.style.fontStyle = 'italic';
    }
    
    manufacturerCard.appendChild(manufacturerContent);
    gridSection.appendChild(manufacturerCard);
  }
  
  // 高価値キーワード（右上）
  if (data.comprehensive && data.comprehensive.analysis_details) {
    const details = data.comprehensive.analysis_details;
    
    const highValueCard = createDetailCard('高価値キーワード', 'Amazon検索で効果的なキーワード', details.high_value_keywords && details.high_value_keywords.length > 0 ? details.high_value_keywords : null);
    const highValueContent = document.createElement('div');
    
    if (details.high_value_keywords && details.high_value_keywords.length > 0) {
      details.high_value_keywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag high-value';
        tag.textContent = keyword;
        highValueContent.appendChild(tag);
      });
    } else {
      highValueContent.textContent = '高価値キーワードは検出されませんでした';
      highValueContent.style.color = 'var(--text-secondary)';
      highValueContent.style.fontStyle = 'italic';
    }
    
    highValueCard.appendChild(highValueContent);
    gridSection.appendChild(highValueCard);
    
    // 中価値キーワード（左下）
    const mediumValueCard = createDetailCard('中価値キーワード', '標準的な検索効果のキーワード', details.medium_value_keywords && details.medium_value_keywords.length > 0 ? details.medium_value_keywords : null);
    const mediumValueContent = document.createElement('div');
    
    if (details.medium_value_keywords && details.medium_value_keywords.length > 0) {
      details.medium_value_keywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag medium-value';
        tag.textContent = keyword;
        mediumValueContent.appendChild(tag);
      });
    } else {
      mediumValueContent.textContent = '中価値キーワードは検出されませんでした';
      mediumValueContent.style.color = 'var(--text-secondary)';
      mediumValueContent.style.fontStyle = 'italic';
    }
    
    mediumValueCard.appendChild(mediumValueContent);
    gridSection.appendChild(mediumValueCard);
    
    // 独自価値キーワード（右下）
    const uniqueValueCard = createDetailCard('商品概要独自キーワード', '検索網拡大に寄与する独自語句', details.unique_product_keywords && details.unique_product_keywords.length > 0 ? details.unique_product_keywords : null);
    const uniqueValueContent = document.createElement('div');
    
    if (details.unique_product_keywords && details.unique_product_keywords.length > 0) {
      details.unique_product_keywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag unique-value';
        tag.textContent = keyword;
        uniqueValueContent.appendChild(tag);
      });
    } else {
      uniqueValueContent.textContent = '独自価値キーワードは検出されませんでした';
      uniqueValueContent.style.color = 'var(--text-secondary)';
      uniqueValueContent.style.fontStyle = 'italic';
    }
    
    uniqueValueCard.appendChild(uniqueValueContent);
    gridSection.appendChild(uniqueValueCard);
  }
  
  // グリッドセクションを追加
  analysisDetails.appendChild(gridSection);
}

// トレンド結果表示（強化版）
function displayTrendResults(data) {
  if (!trendAnalysis) {
    console.warn('trendAnalysis要素が見つかりません');
    return;
  }
  
  // デバッグ用：レスポンス構造を確認
  console.log('トレンド分析データ:', data);
  if (data.seasonality) {
    console.log('季節性データ:', data.seasonality);
    console.log('ピーク月データ:', data.seasonality.peak_months);
    console.log('低調月データ:', data.seasonality.low_months);
  }
  
  trendAnalysis.innerHTML = '';
  
  // 市場分析サマリー（上部・全幅）
  if (data.market_analysis) {
    const marketCard = createDetailCard('市場分析サマリー', 'キーワードの市場状況と競合分析');
    const marketContent = document.createElement('div');
    marketContent.className = 'market-summary';
    
    const analysis = data.market_analysis;
    marketContent.innerHTML = `
      <div class="market-metrics">
        <div class="metric-item">
          <span class="metric-label">現在の人気度</span>
          <span class="metric-value ${analysis.current_popularity}">${getPopularityLabel(analysis.current_popularity)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">検索ボリューム</span>
          <span class="metric-value ${analysis.search_volume_trend}">${getTrendLabel(analysis.search_volume_trend)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">成長性</span>
          <span class="metric-value ${analysis.growth_potential}">${getGrowthLabel(analysis.growth_potential)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">市場成熟度</span>
          <span class="metric-value ${analysis.market_maturity}">${getMaturityLabel(analysis.market_maturity)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">競合レベル</span>
          <span class="metric-value ${analysis.competition_level}">${getCompetitionLabel(analysis.competition_level)}</span>
        </div>
      </div>
    `;
    
    marketCard.appendChild(marketContent);
    trendAnalysis.appendChild(marketCard);
  }
  
  // 季節性分析と関連キーワード（左右並び）
  const mainAnalysisGrid = document.createElement('div');
  mainAnalysisGrid.className = 'trend-main-grid';
  
  // 季節性分析（左側）
  if (data.seasonality) {
    const seasonCard = createDetailCard('季節性分析', 'キーワードの季節変動パターンと需要予測');
    const seasonContent = document.createElement('div');
    seasonContent.className = 'seasonality-content';
    
    let seasonHTML = `<div class="season-pattern">
      <strong>変動パターン:</strong> <span class="pattern-${data.seasonality.pattern}">${getPatternLabel(data.seasonality.pattern)}</span>
    </div>`;
    
    // ピーク月の表示
    if (data.seasonality.peak_months && data.seasonality.peak_months.length > 0) {
      seasonHTML += '<div class="peak-months"><h4>ピーク月</h4>';
      data.seasonality.peak_months.forEach(peak => {
        if (typeof peak === 'object' && peak !== null) {
          const month = peak.month || peak.name || peak.toString();
          const level = peak.level || peak.demand || '';
          const reason = peak.reason || peak.description || '';
          seasonHTML += `
            <div class="month-item peak">
              <span class="month">${month}</span>
              ${level ? `<span class="level">需要レベル: ${level}</span>` : ''}
              ${reason ? `<span class="reason">${reason}</span>` : ''}
            </div>`;
        } else {
          // 文字列の場合
          const monthStr = typeof peak === 'string' ? peak : String(peak);
          seasonHTML += `<div class="month-item peak"><span class="month">${monthStr}</span></div>`;
        }
      });
      seasonHTML += '</div>';
    }
    
    // 低調月の表示
    if (data.seasonality.low_months && data.seasonality.low_months.length > 0) {
      seasonHTML += '<div class="low-months"><h4>低調月</h4>';
      data.seasonality.low_months.forEach(low => {
        if (typeof low === 'object' && low !== null) {
          const month = low.month || low.name || low.toString();
          const level = low.level || low.demand || '';
          const reason = low.reason || low.description || '';
          seasonHTML += `
            <div class="month-item low">
              <span class="month">${month}</span>
              ${level ? `<span class="level">需要レベル: ${level}</span>` : ''}
              ${reason ? `<span class="reason">${reason}</span>` : ''}
            </div>`;
        } else {
          // 文字列の場合
          const monthStr = typeof low === 'string' ? low : String(low);
          seasonHTML += `<div class="month-item low"><span class="month">${monthStr}</span></div>`;
        }
      });
      seasonHTML += '</div>';
    }
    
    // 季節イベントの表示
    if (data.seasonality.seasonal_events && data.seasonality.seasonal_events.length > 0) {
      seasonHTML += `<div class="seasonal-events">
        <h4>関連イベント</h4>
        <div class="event-tags">
          ${data.seasonality.seasonal_events.map(event => `<span class="event-tag">${event}</span>`).join('')}
        </div>
      </div>`;
    }
    
    seasonContent.innerHTML = seasonHTML;
    seasonCard.appendChild(seasonContent);
    mainAnalysisGrid.appendChild(seasonCard);
  }
  
  // 関連キーワード分析（右側）
  if (data.keyword_analysis) {
    const keywordCard = createDetailCard('関連キーワード分析', '併用推奨・代替語・新興キーワード');
    const keywordContent = document.createElement('div');
    keywordContent.className = 'keyword-analysis-content';
    
    let keywordHTML = '';
    
    // 関連キーワード
    if (data.keyword_analysis.related_keywords && data.keyword_analysis.related_keywords.length > 0) {
      keywordHTML += '<div class="related-section"><h4>関連キーワード</h4>';
      data.keyword_analysis.related_keywords.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const keyword = item.keyword || item.name || item.toString();
          const type = item.type || item.category || '';
          const strength = item.strength || item.level || '';
          keywordHTML += `
            <div class="keyword-item ${strength}">
              <span class="keyword">${keyword}</span>
              ${type ? `<span class="type">${type}</span>` : ''}
              ${strength ? `<span class="strength">${getStrengthLabel(strength)}</span>` : ''}
            </div>`;
        } else {
          const keywordStr = typeof item === 'string' ? item : String(item);
          keywordHTML += `<span class="keyword-tag">${keywordStr}</span>`;
        }
      });
      keywordHTML += '</div>';
    }
    
    // 新興キーワード
    if (data.keyword_analysis.emerging_keywords && data.keyword_analysis.emerging_keywords.length > 0) {
      keywordHTML += '<div class="emerging-section"><h4>新興キーワード</h4>';
      data.keyword_analysis.emerging_keywords.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const keyword = item.keyword || item.name || item.toString();
          const growthRate = item.growth_rate || item.growth || '';
          const reason = item.reason || item.description || '';
          keywordHTML += `
            <div class="keyword-item emerging">
              <span class="keyword">${keyword}</span>
              ${growthRate ? `<span class="growth">${getGrowthRateLabel(growthRate)}</span>` : ''}
              ${reason ? `<span class="reason">${reason}</span>` : ''}
            </div>`;
        } else {
          const keywordStr = typeof item === 'string' ? item : String(item);
          keywordHTML += `<span class="keyword-tag emerging">${keywordStr}</span>`;
        }
      });
      keywordHTML += '</div>';
    }
    
    // 衰退キーワード
    if (data.keyword_analysis.declining_keywords && data.keyword_analysis.declining_keywords.length > 0) {
      keywordHTML += '<div class="declining-section"><h4>衰退キーワード</h4>';
      data.keyword_analysis.declining_keywords.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const keyword = item.keyword || item.name || item.toString();
          const declineRate = item.decline_rate || item.decline || '';
          const reason = item.reason || item.description || '';
          keywordHTML += `
            <div class="keyword-item declining">
              <span class="keyword">${keyword}</span>
              ${declineRate ? `<span class="decline">${getDeclineRateLabel(declineRate)}</span>` : ''}
              ${reason ? `<span class="reason">${reason}</span>` : ''}
            </div>`;
        } else {
          const keywordStr = typeof item === 'string' ? item : String(item);
          keywordHTML += `<span class="keyword-tag declining">${keywordStr}</span>`;
        }
      });
      keywordHTML += '</div>';
    }
    
    // ロングテール機会
    if (data.keyword_analysis.longtail_opportunities && data.keyword_analysis.longtail_opportunities.length > 0) {
      keywordHTML += `<div class="longtail-section">
        <h4>ロングテール機会</h4>
        <div class="keyword-tags">
          ${data.keyword_analysis.longtail_opportunities.map(keyword => `<span class="keyword-tag longtail">${keyword}</span>`).join('')}
        </div>
      </div>`;
    }
    
    keywordContent.innerHTML = keywordHTML;
    keywordCard.appendChild(keywordContent);
    mainAnalysisGrid.appendChild(keywordCard);
  }
  
  trendAnalysis.appendChild(mainAnalysisGrid);
  
  // 消費者インサイト（下部・全幅）
  if (data.consumer_insights) {
    const consumerCard = createDetailCard('消費者インサイト', '検索意図・購買行動・意思決定要因');
    const consumerContent = document.createElement('div');
    consumerContent.className = 'consumer-insights';
    
    const insights = data.consumer_insights;
    let consumerHTML = '<div class="insights-grid">';
    
    if (insights.search_intent && insights.search_intent.length > 0) {
      consumerHTML += `<div class="insight-item">
        <h4>検索意図</h4>
        <div class="tag-list">${insights.search_intent.map(intent => `<span class="insight-tag">${intent}</span>`).join('')}</div>
      </div>`;
    }
    
    if (insights.target_demographics && insights.target_demographics.length > 0) {
      consumerHTML += `<div class="insight-item">
        <h4>ターゲット層</h4>
        <div class="tag-list">${insights.target_demographics.map(demo => `<span class="insight-tag">${demo}</span>`).join('')}</div>
      </div>`;
    }
    
    if (insights.purchase_triggers && insights.purchase_triggers.length > 0) {
      consumerHTML += `<div class="insight-item">
        <h4>購買トリガー</h4>
        <div class="tag-list">${insights.purchase_triggers.map(trigger => `<span class="insight-tag">${trigger}</span>`).join('')}</div>
      </div>`;
    }
    
    if (insights.decision_factors && insights.decision_factors.length > 0) {
      consumerHTML += `<div class="insight-item">
        <h4>意思決定要因</h4>
        <div class="tag-list">${insights.decision_factors.map(factor => `<span class="insight-tag">${factor}</span>`).join('')}</div>
      </div>`;
    }
    
    consumerHTML += '</div>';
    consumerContent.innerHTML = consumerHTML;
    consumerCard.appendChild(consumerContent);
    trendAnalysis.appendChild(consumerCard);
  }
  
  // 価格・技術トレンド（下部・左右並び）
  const bottomGrid = document.createElement('div');
  bottomGrid.className = 'trend-bottom-grid';
  
  // 価格トレンド
  if (data.price_trends) {
    const priceCard = createDetailCard('価格トレンド', '価格感度・コスパ意識・プレミアム受容度');
    const priceContent = document.createElement('div');
    priceContent.className = 'price-trends';
    
    const price = data.price_trends;
    priceContent.innerHTML = `
      <div class="price-metrics">
        <div class="price-item">
          <span class="label">価格感度</span>
          <span class="value ${price.price_sensitivity}">${getSensitivityLabel(price.price_sensitivity)}</span>
        </div>
        <div class="price-item">
          <span class="label">平均価格帯</span>
          <span class="value">${price.average_price_range || 'N/A'}</span>
        </div>
        <div class="price-item">
          <span class="label">コスパ重視度</span>
          <span class="value">${price.value_perception || 'N/A'}</span>
        </div>
        <div class="price-item">
          <span class="label">プレミアム受容度</span>
          <span class="value">${price.premium_acceptance || 'N/A'}</span>
        </div>
      </div>
    `;
    
    priceCard.appendChild(priceContent);
    bottomGrid.appendChild(priceCard);
  }
  
  // 技術トレンド
  if (data.technology_trends) {
    const techCard = createDetailCard('技術トレンド', '新技術・イノベーション・規格変更');
    const techContent = document.createElement('div');
    techContent.className = 'technology-trends';
    
    const tech = data.technology_trends;
    let techHTML = `<div class="tech-impact">
      <strong>イノベーション影響度:</strong> <span class="${tech.innovation_impact}">${getImpactLabel(tech.innovation_impact)}</span>
    </div>`;
    
    if (tech.emerging_technologies && tech.emerging_technologies.length > 0) {
      techHTML += `<div class="tech-section">
        <h4>新興技術</h4>
        <div class="tech-tags">${tech.emerging_technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}</div>
      </div>`;
    }
    
    if (tech.standard_changes && tech.standard_changes.length > 0) {
      techHTML += `<div class="tech-section">
        <h4>規格変更</h4>
        <div class="tech-tags">${tech.standard_changes.map(change => `<span class="tech-tag">${change}</span>`).join('')}</div>
      </div>`;
    }
    
    if (tech.future_outlook) {
      techHTML += `<div class="tech-outlook">
        <h4>将来展望</h4>
        <p>${tech.future_outlook}</p>
      </div>`;
    }
    
    techContent.innerHTML = techHTML;
    techCard.appendChild(techContent);
    bottomGrid.appendChild(techCard);
  }
  
  trendAnalysis.appendChild(bottomGrid);
  
  // 推奨アクション（最下部・全幅）
  if (data.recommendations) {
    const recommendCard = createDetailCard('推奨アクション', '即座に実行すべき施策と長期戦略');
    const recommendContent = document.createElement('div');
    recommendContent.className = 'recommendations';
    
    const rec = data.recommendations;
    let recHTML = '<div class="recommendations-grid">';
    
    if (rec.immediate_actions && rec.immediate_actions.length > 0) {
      recHTML += `<div class="rec-section immediate">
        <h4><i class="fas fa-bolt"></i> 即座に実行</h4>
        <ul>${rec.immediate_actions.map(action => `<li>${action}</li>`).join('')}</ul>
      </div>`;
    }
    
    if (rec.seasonal_strategies && rec.seasonal_strategies.length > 0) {
      recHTML += `<div class="rec-section seasonal">
        <h4><i class="fas fa-calendar-alt"></i> 季節戦略</h4>
        <ul>${rec.seasonal_strategies.map(strategy => `<li>${strategy}</li>`).join('')}</ul>
      </div>`;
    }
    
    if (rec.long_term_planning && rec.long_term_planning.length > 0) {
      recHTML += `<div class="rec-section longterm">
        <h4><i class="fas fa-chart-line"></i> 長期戦略</h4>
        <ul>${rec.long_term_planning.map(plan => `<li>${plan}</li>`).join('')}</ul>
      </div>`;
    }
    
    if (rec.risk_mitigation && rec.risk_mitigation.length > 0) {
      recHTML += `<div class="rec-section risk">
        <h4><i class="fas fa-shield-alt"></i> リスク対策</h4>
        <ul>${rec.risk_mitigation.map(risk => `<li>${risk}</li>`).join('')}</ul>
      </div>`;
    }
    
    recHTML += '</div>';
    recommendContent.innerHTML = recHTML;
    recommendCard.appendChild(recommendContent);
    trendAnalysis.appendChild(recommendCard);
  }
}

// ラベル変換ヘルパー関数
function getPopularityLabel(level) {
  const labels = { high: '高', medium: '中', low: '低' };
  return labels[level] || level;
}

function getTrendLabel(trend) {
  const labels = { increasing: '上昇中', stable: '安定', decreasing: '下降中' };
  return labels[trend] || trend;
}

function getGrowthLabel(growth) {
  const labels = { high: '高成長', medium: '中成長', low: '低成長' };
  return labels[growth] || growth;
}

function getMaturityLabel(maturity) {
  const labels = { emerging: '新興', growing: '成長', mature: '成熟', declining: '衰退' };
  return labels[maturity] || maturity;
}

function getCompetitionLabel(level) {
  const labels = { high: '激戦', medium: '中程度', low: '緩やか' };
  return labels[level] || level;
}

function getPatternLabel(pattern) {
  const labels = { seasonal: '季節変動', steady: '安定', volatile: '変動大' };
  return labels[pattern] || pattern;
}

function getStrengthLabel(strength) {
  const labels = { high: '強', medium: '中', low: '弱' };
  return labels[strength] || strength;
}

function getGrowthRateLabel(rate) {
  const labels = { high: '急成長', medium: '成長中', low: '微成長' };
  return labels[rate] || rate;
}

function getDeclineRateLabel(rate) {
  const labels = { high: '急速衰退', medium: '衰退中', low: '微減' };
  return labels[rate] || rate;
}

function getSensitivityLabel(sensitivity) {
  const labels = { high: '高感度', medium: '中感度', low: '低感度' };
  return labels[sensitivity] || sensitivity;
}

function getImpactLabel(impact) {
  const labels = { high: '高影響', medium: '中影響', low: '低影響' };
  return labels[impact] || impact;
}

// 詳細カード作成（コピーボタン付き）
function createDetailCard(title, description, copyData = null) {
  const card = document.createElement('div');
  card.className = 'detail-card';
  
  const headerElement = document.createElement('div');
  headerElement.style.display = 'flex';
  headerElement.style.justifyContent = 'space-between';
  headerElement.style.alignItems = 'center';
  headerElement.style.marginBottom = '0.5rem';
  
  const titleElement = document.createElement('div');
  titleElement.className = 'detail-title';
  titleElement.textContent = title;
  titleElement.style.margin = '0';
  
  headerElement.appendChild(titleElement);
  
  // コピーボタンを追加（copyDataが提供された場合）
  if (copyData) {
    const copyButton = document.createElement('button');
    copyButton.className = 'action-btn copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = `${title}をコピー`;
    copyButton.style.fontSize = '0.8rem';
    copyButton.style.padding = '0.3rem';
    copyButton.style.minWidth = '28px';
    copyButton.style.height = '28px';
    
    copyButton.addEventListener('click', async () => {
      try {
        let textToCopy = '';
        if (Array.isArray(copyData)) {
          textToCopy = copyData.join(' ');
        } else if (typeof copyData === 'string') {
          textToCopy = copyData;
        }
        
        if (textToCopy) {
          await navigator.clipboard.writeText(textToCopy);
          
          // 視覚的フィードバック
          const originalHTML = copyButton.innerHTML;
          copyButton.innerHTML = '<i class="fas fa-check"></i>';
          copyButton.style.color = 'var(--success)';
          
          setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.style.color = '';
          }, 1500);
        }
      } catch (error) {
        console.error('コピーに失敗:', error);
        alert('コピーに失敗しました');
      }
    });
    
    headerElement.appendChild(copyButton);
  }
  
  const descElement = document.createElement('div');
  descElement.className = 'detail-content';
  descElement.textContent = description;
  
  card.appendChild(headerElement);
  card.appendChild(descElement);
  
  return card;
}

// ローディング表示開始
function startLoadingIndicator() {
  if (executeBtn) executeBtn.disabled = true;
  if (loadingIndicator) loadingIndicator.classList.add('active');
  if (executeBtn) executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 並列分析中...';
  updateProgress(0);
  
  // 分析中はスコアセクションを非表示
  if (scoresSection) scoresSection.classList.remove('active');
}

// ローディング表示停止
function stopLoadingIndicator() {
  if (executeBtn) executeBtn.disabled = false;
  if (loadingIndicator) loadingIndicator.classList.remove('active');
  if (executeBtn) executeBtn.innerHTML = '<i class="fas fa-play"></i> 分析実行';
  updateProgress(0);
  
  // プログレステキストをリセット
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = '0%';
  }
}

// プログレス更新
function updateProgress(percentage) {
  if (progressFill) progressFill.style.width = `${percentage}%`;
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = `${percentage}%`;
  }
}



// データ保存機能
function saveInputData() {
  // DOM要素が存在することを確認
  if (!keywordInput || !productInput) {
    return;
  }
  
  // 入力値が空でない場合のみ保存
  if (keywordInput.value.trim() !== '' || productInput.value.trim() !== '') {
    const data = {
      keywords: keywordInput.value,
      product: productInput.value,
      timestamp: Date.now()
    };
    localStorage.setItem('keywordCheckerData', JSON.stringify(data));
    console.log('入力データを保存しました');
  } else {
    // 入力が空の場合は保存データも削除
    localStorage.removeItem('keywordCheckerData');
    localStorage.removeItem('keywordCheckerResults');
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
  
  // 結果データの復元（24時間以内の結果があれば復元）
  const savedResults = localStorage.getItem('keywordCheckerResults');
  if (savedResults) {
    try {
      const data = JSON.parse(savedResults);
      // 24時間以内の結果のみ復元
      if (data && data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        // 結果データに対応する入力データがある場合のみ復元
        if (keywordInput.value.trim() !== '' || productInput.value.trim() !== '') {
          displayResults(data.results);
          console.log('分析結果を復元しました');
          
          // 保存されたタブを復元
          restoreActiveTab();
        }
      } else {
        localStorage.removeItem('keywordCheckerResults');
        console.log('期限切れの結果データを削除しました');
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
  if (keywordInput) keywordInput.value = '';
  if (productInput) productInput.value = '';
  
  // スコアセクションと結果セクションを非表示
  if (scoresSection) scoresSection.classList.remove('active');
  if (resultsSection) resultsSection.classList.remove('active');
  
  // ローカルストレージをクリア（入力データ、結果データ、タブ情報）
  localStorage.removeItem('keywordCheckerData');
  localStorage.removeItem('keywordCheckerResults');
  localStorage.removeItem('keywordCheckerActiveTab');
  
  // グローバル分析結果をクリア
  window.currentAnalysisResults = null;
  
  // メインスコア表示エリアをリセット（null チェック付き）
  if (mainScoreValue) mainScoreValue.textContent = '0';
  if (mainScoreDetail) mainScoreDetail.textContent = '重複キーワード数: 0個 | 最適化候補: 0個';
  if (mainScoreBreakdown) mainScoreBreakdown.innerHTML = '';
  if (trendScoreValue) trendScoreValue.textContent = '0';
  if (trendScoreDetail) trendScoreDetail.textContent = '人気度: - | 成長性: -';
  if (trendScoreBreakdown) trendScoreBreakdown.innerHTML = '';
  
  // 既存の結果表示エリアをリセット（null チェック付き）
  if (optimizedKeywords) optimizedKeywords.innerHTML = '';
  if (highlightedProduct) highlightedProduct.innerHTML = '';
  if (overviewImprovementTips) overviewImprovementTips.innerHTML = '';
  if (analysisDetails) analysisDetails.innerHTML = '';
  if (trendAnalysis) trendAnalysis.innerHTML = '';
  
  // 概要タブに戻る
  switchTab('overview');
  
  // 入力データの保存を停止するため、イベントリスナーを一時的に無効化
  if (keywordInput) keywordInput.removeEventListener('input', saveInputData);
  if (productInput) productInput.removeEventListener('input', saveInputData);
  
  // 少し遅延してからイベントリスナーを再設定
  setTimeout(() => {
    if (keywordInput) keywordInput.addEventListener('input', saveInputData);
    if (productInput) productInput.addEventListener('input', saveInputData);
  }, 100);
}

// 最適化されたキーワードをクリップボードにコピー
async function copyOptimizedKeywords() {
  try {
    const cleanKeywords = window.cleanOptimizedKeywords || '';
    if (!cleanKeywords) {
      alert('コピーするキーワードがありません。');
      return;
    }
    
    await navigator.clipboard.writeText(cleanKeywords);
    
    // ボタンの視覚的フィードバック
    const copyBtn = document.getElementById('copyKeywordsBtn');
    if (copyBtn) {
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      copyBtn.style.color = 'var(--success)';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.color = '';
      }, 1500);
    }
    
    console.log('キーワードをクリップボードにコピーしました:', cleanKeywords);
    
  } catch (error) {
    console.error('クリップボードへのコピーに失敗:', error);
    
    // フォールバック: テキストエリアを使用
    const textArea = document.createElement('textarea');
    textArea.value = window.cleanOptimizedKeywords || '';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    alert('キーワードをクリップボードにコピーしました。');
  }
}

// 最適化されたキーワードをキーワード入力欄に反映
function replaceKeywordsInput() {
  if (!keywordInput) {
    alert('キーワード入力欄が見つかりません。');
    return;
  }
  
  const cleanKeywords = window.cleanOptimizedKeywords || '';
  if (!cleanKeywords) {
    alert('反映するキーワードがありません。');
    return;
  }
  
  // キーワード入力欄に設定
  keywordInput.value = cleanKeywords;
  
  // 視覚的フィードバック
  keywordInput.classList.add('highlight-input');
  setTimeout(() => {
    keywordInput.classList.remove('highlight-input');
  }, 1000);
  
  // ボタンの視覚的フィードバック
  const replaceBtn = document.getElementById('replaceKeywordsBtn');
  if (replaceBtn) {
    const originalHTML = replaceBtn.innerHTML;
    replaceBtn.innerHTML = '<i class="fas fa-check"></i>';
    replaceBtn.style.color = 'var(--success)';
    
    setTimeout(() => {
      replaceBtn.innerHTML = originalHTML;
      replaceBtn.style.color = '';
    }, 1500);
  }
  
  // データを保存
  saveInputData();
  
  console.log('キーワードを入力欄に反映しました:', cleanKeywords);
}

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeywordAnalyzer, KeywordOptimizationUtils };
} 