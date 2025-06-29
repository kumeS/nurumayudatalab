# NuruMayu StudyLab - AI OCR学習支援ツール

## 概要

NuruMayu StudyLab は、写真から文字を読み取り、AIで理解しやすい説明・要約・クイズを自動生成する学習支援ツールです。「わからない」を「わかる」に変える次世代学習プラットフォームとして開発されています。

## 主要機能

### 1. OCR（光学文字認識）機能
- **Tesseract.js**を使用したクライアントサイドOCR
- 日本語・英語対応
- JPEG、PNG、WebP形式の画像に対応
- ドラッグ&ドロップでの画像アップロード
- AI補正機能による認識精度向上

### 2. テキスト入力・音声入力
- 直接テキスト入力
- Web Speech APIを使用した音声入力
- 理解度レベル別サンプルテキスト

### 3. AI学習コンテンツ生成
- **要約生成**: テキストの重要ポイント抽出
- **詳しい説明**: わかりやすい言い回しでの再説明
- **クイズ自動生成**: 理解度テスト

### 4. 理解度レベル対応
- 小学生（低学年・中学年・高学年）
- 中学生
- 高校生
- 大学生

### 5. クイズ機能
- 2択～5択の選択式問題
- ヒント機能
- 詳細な解説
- 成績記録・進捗管理

### 6. 学習履歴管理
- 学習内容の自動保存
- クイズ結果の蓄積
- 成績分析

## 技術仕様

### フロントエンド
- **HTML5, CSS3, Vanilla JavaScript**
- **Tesseract.js** - OCR処理
- **Web Speech API** - 音声認識
- **localStorage** - データ保存
- **FontAwesome** - アイコン

### AI統合準備
- LLM API統合フレームワーク実装済み
- Claude API / OpenAI API対応可能
- 段階的なAI機能向上に対応

## ファイル構成

```
webtool_OCRv2/
├── index.html          # メインページ
├── app.js             # アプリケーションロジック
├── test.png           # テスト用画像
├── MVP仕様書.md       # 製品仕様書
├── 開発方針.txt       # 開発方針・コンセプト
└── README.md          # このファイル
```

## 使用方法

### 1. 基本的な使い方

1. **ブラウザでindex.htmlを開く**
2. **理解度レベルを選択**（小学生～大学生）
3. **学習コンテンツを選択**（要約・説明・クイズ）
4. **テキスト入力方法を選択**：
   - OCRタブ: 画像をアップロードして文字起こし
   - テキストタブ: 直接入力・音声入力・サンプル使用
5. **学習コンテンツ生成ボタンをクリック**
6. **生成されたクイズに挑戦**

### 2. OCR機能の使い方

1. OCRタブを選択
2. 画像をドラッグ&ドロップまたはクリックして選択
3. 言語設定（日本語・英語）を選択
4. 「文字起こし開始」ボタンをクリック
5. 必要に応じて「AI補正」で認識結果を改善
6. 学習コンテンツを生成

### 3. クイズ機能

- **問題数**: 3問または5問を選択
- **形式**: 2択～5択を選択
- **ヒント機能**: 各問題にヒントボタンあり
- **解説**: 回答後に詳細な解説を表示
- **再挑戦**: 同じクイズの再テストが可能

## 推奨環境

- **ブラウザ**: Chrome、Firefox、Safari、Edge（最新版）
- **JavaScript**: 有効にしてください
- **カメラ・マイク**: 音声入力使用時のみ必要

## 今後の拡張予定

### フェーズ1完了項目
- ✅ OCR基本機能
- ✅ AI学習コンテンツ生成
- ✅ クイズシステム
- ✅ 理解度レベル対応
- ✅ 学習履歴管理

### フェーズ2予定
- 🔄 実際のLLM API統合
- 🔄 音声読み上げ機能
- 🔄 多言語対応強化
- 🔄 個別最適化機能

### フェーズ3予定
- 📋 復習スケジューリング
- 📋 苦手分野分析
- 📋 学習レポート生成
- 📋 クラウド同期

## ライセンス

このプロジェクトは学習・研究目的で開発されています。

## 開発者

NuruMayu DataLab 開発チーム

---

**注意**: 現在のバージョンはMVP（最小実行可能製品）として開発されており、AI機能は高度なシミュレーションで実装されています。実際のLLM統合は次のフェーズで実装予定です。