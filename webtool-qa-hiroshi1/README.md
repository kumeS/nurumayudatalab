# なぜを4回問い続ける - 深層心理探求システム

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![HTML5](https://img.shields.io/badge/HTML5-CSS3-orange.svg)
![LLM](https://img.shields.io/badge/LLM-Llama4--Maverick-green.svg)

理研の松本理事長の洞察「4回目のなぜには、ほぼ誰も答えられなくなる」を基盤とした、LLM活用型の深層心理探求ウェブアプリケーション。

## 🎯 プロジェクト概要

### コンセプト
人は1回目、2回目の「なぜ」には答えられるが、4回目の「なぜ」で思考の限界に到達し、自己の本質と向き合うことになる。このシステムは、その哲学的・実存的な体験を技術的に実現し、ユーザーの深層心理への洞察を促進します。

### 核心的価値
- **自己理解の深化**: 表面的な理由から存在論的問いまでの段階的探求
- **自己欺瞞の解除**: 社会的に用意された常識的答えを超えた真の動機の発見  
- **実存的自覚**: 価値観形成の偶然性と自由意志の限界への直面
- **存在への畏敬**: 言葉や論理の限界を通じた存在そのものへの敬意

## 🔬 実装状況

### ✅ 実装済み機能

#### 核心システム
- **4段階質問プロセス**: 表面的理由 → 個人的動機 → 深層信念 → 存在根源
- **LLM動的質問生成**: 回答内容を分析して個別化された次の質問を生成
- **深層心理分析**: 4回の探求完了後の包括的AI分析
- **回答品質評価**: 表面的回答を検出し、より深い探求を促進

#### テーマシステム  
- **存在の意味**: なぜあなたは存在しているのか
- **自己同一性**: あなたを「あなた」たらしめるものは何か
- **価値観の起源**: 価値観がどのように形成されたか
- **恐れと不安**: 恐れや不安の根本的原因
- **欲望と願望**: 欲望や願望の本質的動機
- **人間関係の根源**: なぜ他者との関係を求めるのか
- **人生の目的**: 人生における真の目的や使命  
- **苦悩の意味**: なぜ苦しみが存在するのか
- **自由探求**: ユーザー定義のカスタムテーマ

#### UI/UX
- **深淵デザイン**: 哲学的探求を表現する洗練されたダークテーマ
- **段階的アニメーション**: 心理状態に配慮した視覚的フィードバック
- **レスポンシブ対応**: デスクトップ・タブレット・モバイル対応
- **アクセシビリティ**: 基本的なキーボードナビゲーション

### 🔧 技術仕様

#### アーキテクチャ
```
webtool-qa-hiroshi1/
├── index.html          # メインUIとレガシースクリプト（要整理）
├── app.js             # 核心ロジックとLLM統合
├── 実装案.txt         # 哲学的コンセプト文書
└── README.md          # 本ドキュメント
```

#### 技術スタック
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **LLMモデル**: Llama-4-Maverick-17B-128E-Instruct-FP8  
- **API**: Cloudflare Workers (`nurumayu-worker.skume-bioinfo.workers.dev`)
- **スタイリング**: CSS Grid, Flexbox, Custom Properties

#### API仕様
```javascript
// LLM API呼び出し例
const requestData = {
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.8,
    stream: false,
    max_completion_tokens: 1000,
    messages: [
        { role: "system", content: "専門家プロンプト" },
        { role: "user", content: "ユーザークエリ" }
    ]
};
```

## 🐛 既知の問題とバグ

### 🚨 重要な問題

#### 1. コード重複による競合
**問題**: index.html内のscriptタグとapp.jsで同一機能が重複定義
```javascript
// 重複している関数群
- startQuestioning()
- submitAnswer()  
- restart()
- conversationHistory変数
```
**影響**: イベントリスナーの二重登録、予期しない動作
**優先度**: 🔴 緊急

#### 2. テーマデータの不整合  
**問題**: HTML(4テーマ) vs app.js(9テーマ)の構造的相違
**影響**: テーマ選択時のエラー、機能不全
**優先度**: 🔴 緊急

#### 3. セキュリティの懸念
**問題**: ユーザー入力の不十分な検証、プロンプトインジェクション
**影響**: LLM API の悪用、意図しない出力
**優先度**: 🟡 中

### 🔧 軽微な問題

#### UI/UX改善点
- **プログレス表示なし**: 現在の進行状況が不明
- **戻る機能なし**: 前の質問に戻れない
- **オフライン対応なし**: ネットワーク切断時の処理不足
- **エラーメッセージ**: 技術的すぎて分かりにくい

#### アクセシビリティ
- **ARIA属性不足**: スクリーンリーダー対応が不十分
- **コントラスト比**: 一部テキスト(#999)が基準値未満
- **キーボードナビゲーション**: Tab順序の最適化不足

#### パフォーマンス
- **Web Fonts**: 読み込み最適化不足
- **API依存**: LLM API停止時の完全機能停止
- **メモリリーク**: 長時間使用時の潜在的問題

## 🎨 UI/UX改善計画

### 高優先度改善

#### 1. プログレスインジケータ
```html
<div class="progress-container">
    <div class="progress-bar">
        <div class="progress-fill" style="width: 25%"></div>
    </div>
    <div class="progress-text">質問 1/4</div>
</div>
```

#### 2. ナビゲーション強化
```javascript
// 前の質問に戻る機能
function goToPrevious() {
    if (questionLevel > 0) {
        questionLevel--;
        displayPreviousQuestion();
    }
}
```

#### 3. エラーハンドリング改善
```javascript
const errorMessages = {
    'network': '接続に問題があります。しばらく待ってから再度お試しください。',
    'timeout': '処理に時間がかかっています。もう一度お試しください。',
    'validation': 'もう少し詳しく教えていただけますか？'
};
```

### 中優先度改善

#### 1. アクセシビリティ強化
```html
<div class="current-question" role="main" aria-live="polite">
    <div class="question-text" aria-label="現在の質問"></div>
</div>
```

#### 2. レスポンシブデザイン強化
```css
/* より細かいブレークポイント */
@media (max-width: 1024px) { /* タブレット */ }
@media (max-width: 768px) { /* モバイル */ }  
@media (orientation: landscape) { /* 横向き */ }
```

#### 3. パフォーマンス最適化
```javascript
// 指数バックオフリトライ
async function callLLMWithRetry(prompt, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await callLLM(prompt);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => 
                setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}
```

## 📊 実装案との整合性分析

### 85% 実現済み

#### ✅ 完全に実現された要素
- **4段階質問プロセス**: 理研松本理事長の指摘を忠実に実装
- **段階的深化構造**: 表面→個人→深層→存在の論理的進行
- **心理的負荷への配慮**: 視覚デザインと段階的アプローチ

#### ⚡ 実装案を超えた価値
- **LLM動的質問生成**: 個人に完全特化した質問（実装案では想定外）
- **深層心理分析**: 包括的AI分析による洞察提供
- **テーマ体系化**: 3例から8テーマへの哲学的拡張

#### 🎯 改善が必要な領域

##### 体験の強度
**現状**: やや親しみやすい設計
**目標**: 実装案が描く「強烈な心理的負荷」「困惑と戸惑い」
```javascript
// より容赦のない質問生成
function generateChallenging Question(answer) {
    // 前提を疑問視する質問
    // 価値観の偶然性を暴露する質問
    // 自由意志を問い直す質問
}
```

##### 存在論的到達
**現状**: 部分的到達
**目標**: 「なぜ何もないのではなく、何かがあるのか？」レベル
```javascript
// 5回目の質問オプション実装
if (questionLevel >= 4 && deepeningRequired) {
    await generateExistentialQuestion();
}
```

## 🚀 インストールと使用方法

### 前提条件
- モダンウェブブラウザ（Chrome 90+, Firefox 88+, Safari 14+）
- インターネット接続（LLM API使用）

### セットアップ
```bash
# リポジトリクローン
git clone [repository-url]
cd webtool-qa-hiroshi1

# ローカルサーバー起動
python3 -m http.server 8080

# ブラウザでアクセス  
open http://localhost:8080
```

### 基本的な使用フロー
1. **テーマ選択**: 9つの深層心理テーマから選択
2. **4段階探求**: 各レベルで質問に回答
3. **深層分析**: LLMによる包括的心理分析
4. **洞察獲得**: 自己理解の深化

### API設定（開発者向け）
```javascript
// app.js内の設定変更
const API_URL = 'your-llm-api-endpoint';
const MODEL_NAME = 'your-preferred-model';
```

## 🔮 今後の拡張計画

### Phase 1: 安定化（短期）
- [ ] コード重複の解消
- [ ] セキュリティ強化
- [ ] エラーハンドリング改善
- [ ] アクセシビリティ対応

### Phase 2: 体験強化（中期）  
- [ ] 5回目の質問実装
- [ ] より深刻な心理的負荷設計
- [ ] 無答状態の積極的価値化
- [ ] セッション保存機能

### Phase 3: 高度化（長期）
- [ ] 音声入力対応
- [ ] 多言語対応（英語、中国語）
- [ ] データ分析ダッシュボード
- [ ] コミュニティ機能（匿名）

### Phase 4: 研究展開
- [ ] 学術研究との連携
- [ ] 心理療法への応用検討
- [ ] 哲学教育ツールとしての活用
- [ ] カウンセリング補助機能

## 🤝 貢献ガイド

### 開発参加
```bash
# 開発ブランチ作成
git checkout -b feature/your-feature

# 変更後テスト
npm test  # 未実装

# プルリクエスト作成
git push origin feature/your-feature
```

### 報告推奨事項
- **バグ報告**: 再現手順と環境情報
- **機能提案**: 哲学的妥当性の説明
- **UI改善**: アクセシビリティ影響の考慮

## ⚖️ ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🙏 謝辞

- **理研 松本理事長**: 「4回目のなぜ」という根源的洞察
- **哲学者たち**: ソクラテス、ハイデガー、サルトルの思想的基盤  
- **LLM技術**: Claude、Llama等の言語モデル開発者
- **オープンソースコミュニティ**: Web技術の発展

---

> 「なぜ」を4回問い続けることで、人は必然的に自分自身や世界に対する本質的な問いを回避できない状況に置かれ、避けがちな哲学的・実存的課題に直面することになる。この体験こそが、真の自己理解への扉を開く。

**最終更新**: 2024年1月
**バージョン**: 1.0.0
**メンテナ**: [Your Name]