# 🧬 Analysis-LoadingsPackage

**AI統合統計解析プラットフォーム - PCA解析×LLM結果解釈システム**

## 📋 プロジェクト概要

本プロジェクトは、PCAなどの次元圧縮結果をloadingsパッケージで処理し、LLM（Large Language Model）による高度な結果解釈を行うWebシステムです。研究者が複雑な統計解析結果を直感的に理解し、生物学的意味を把握できるよう設計されています。

### 🎯 主要機能
- **CSVファイルアップロード**: ドラッグ&ドロップによる簡単データ投入
- **PCA解析**: loadingsパッケージによる高度な主成分分析
- **LLM解釈**: AI（Llama-4）による多角的な統計結果解釈
- **可視化**: biplot、因子負荷量、p値分布の自動生成
- **MetaboLights連携**: 代謝学実験メタデータの自動取得
- **レポート生成**: 統合的な解析レポートの自動作成

## 🏗️ システムアーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External APIs │
│                 │    │                 │    │                 │
│ • index.html    │◄──►│ • api-integrated│◄──►│ • LLM API       │
│ • llm.js        │    │   .R (842 lines)│    │ • MetaboLights  │
│ • CSS Styling   │    │ • Plumber       │    │ • PubMed        │
│                 │    │ • loadings pkg  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 現在の実装状況

### ✅ 完了済み機能

#### バックエンドAPI（api-integrated.R - 842行）
- **データ処理**: CSV読み込み、検証、前処理機能
- **PCA解析**: カスタムパラメータ対応、複数解析手法
- **画像生成**: Base64エンコード対応、複数画像形式
- **エンドポイント群**:
  - `POST /upload/csv` - CSVアップロード
  - `POST /analyze/pca-custom` - カスタムPCA解析
  - `POST /analyze/correlation-custom/:component` - 因子負荷量解析
  - `POST /analyze/pvalue-custom/:component` - p値分布解析
  - `GET /data/summary` - データ要約統計
  - `GET /health` - ヘルスチェック

#### フロントエンドUI（index.html - 1,375行）
- **モダンデザイン**: gitingest-ui.htmlベースの洗練されたUI
- **レスポンシブ対応**: デスクトップ・タブレット・モバイル最適化
- **タブナビゲーション**: Upload、Analysis、Results、Settingsタブ
- **可視化エリア**: 結果表示、画像ギャラリー、統計サマリー

#### LLM連携基盤（llm.js - 183行）
- **API統合**: io.net経由でLlama-4-Maverick-17B呼び出し
- **レスポンス解析**: JSON形式での構造化データ処理
- **エラーハンドリング**: 堅牢なAPI通信エラー管理

### 🔄 部分実装機能

#### システム統合
- **フロントエンド・バックエンド連携**: 80% 完了
- **ファイルアップロード**: UI完成、API連携が必要
- **結果表示ロジック**: 基本構造完成、詳細実装が必要

#### LLM解釈機能
- **基本API呼び出し**: 完了
- **統計解析特化プロンプト**: 要実装
- **多角的解釈ロジック**: 要実装

### ❌ 未実装機能

#### 高度機能
- **MetaboLights API連携**: 実験メタデータ自動取得
- **論文検索統合**: PubMed/Semantic Scholar連携
- **レポート生成**: PDF/HTML形式での総合レポート
- **インタラクティブ可視化**: D3.js/Plotly.js統合

#### システム最適化
- **エラーハンドリング改善**: ユーザーフレンドリーなエラー表示
- **パフォーマンス最適化**: 大容量データ対応
- **セキュリティ強化**: ファイルアップロード検証

## 🐛 確認済みバグ・課題

### 高優先度バグ
1. **API統合エラー**: フロントエンドのfetch呼び出しが未実装
2. **LLM解釈エラー**: llm.jsがレシピ処理用のため、統計解析用に要修正
3. **ファイルアップロード**: multipart/form-data処理の不完全実装
4. **CORS問題**: ローカル開発時のクロスオリジン問題

### 中優先度課題
1. **UI/UX改善**: ローディング状態の視覚化不足
2. **エラー表示**: 技術的エラーメッセージのユーザーフレンドリー化
3. **レスポンシブ対応**: モバイル端末での操作性改善
4. **データ検証**: CSV形式の厳密な検証ロジック

### 低優先度課題
1. **パフォーマンス**: 大容量ファイル処理の最適化
2. **アクセシビリティ**: WCAG準拠の改善
3. **国際化**: 多言語対応の基盤構築

## 🛠️ UI改善案

### デザイン改善
- **プログレスバー**: 解析進行状況の可視化
- **結果プレビュー**: 画像のサムネイル表示
- **ダークモード**: ユーザー選択可能なテーマ
- **アニメーション**: スムーズな画面遷移効果

### UX改善
- **ドラッグ&ドロップ改善**: ファイル形式の事前検証
- **ワンクリック操作**: 標準設定での即座解析
- **結果共有**: URLでの結果共有機能
- **履歴管理**: 過去の解析結果アクセス

## 🔧 技術仕様

### フロントエンド
- **言語**: HTML5, CSS3, Vanilla JavaScript
- **デザイン**: gitingest-ui.htmlベースのモダンUI
- **API通信**: Fetch API + async/await
- **可視化**: Chart.js / D3.js（予定）

### バックエンド
- **言語**: R 4.x
- **フレームワーク**: Plumber
- **分析パッケージ**: loadings, stats, factoextra
- **デプロイ**: Docker + Hugging Face Spaces

### 外部API
- **LLM**: io.net + Llama-4-Maverick-17B-128E-Instruct-FP8
- **メタデータ**: MetaboLights REST API
- **文献検索**: PubMed E-utilities API

## 🚀 実行環境

### 必要ソフトウェア
- R 4.0以上
- Docker（デプロイ用）
- モダンブラウザ（Chrome 90+, Firefox 90+, Safari 14+）

### 依存パッケージ
```r
# R packages
install.packages(c("loadings", "plumber", "jsonlite", "base64enc"))
```

### 起動手順
```bash
# 1. プロジェクトクローン
git clone [repository-url]
cd Analysis-LoadingsPackage

# 2. Dockerコンテナ起動
cd loadings-web-api-sample-main
docker compose up -d

# 3. API接続確認
curl http://localhost:7860/health

# 4. ブラウザでアクセス
# Frontend: index.html を直接開く
open ../index.html

# 5. 統合テスト実行（UI上で）
# - "🔗 API接続テスト"ボタンをクリック
# - "🧪 完全API統合テスト"ボタンでエンドツーエンドテスト
```

### 🔧 設定修正済み
- **ポート統一**: Docker(7860) ↔ フロントエンド(7860)に修正
- **Dockerfile修正**: api-integrated.R実行に変更
- **LLM機能**: 統計解析専用に全面書き換え完了

## 📈 開発ロードマップ

### Phase 1: システム統合（Week 1-2）
- フロントエンド・バックエンド完全連携
- ファイルアップロード機能完成
- 基本的なPCA解析フロー確立

### Phase 2: LLM統合（Week 3-4）
- 統計解析特化プロンプト開発
- 多角的解釈ロジック実装
- 結果の構造化表示

### Phase 3: 高度機能（Week 5-6）
- MetaboLights API連携
- 論文検索機能
- レポート生成システム

### Phase 4: 最適化（Week 7-8）
- パフォーマンス改善
- エラーハンドリング強化
- UI/UX最終調整

## 🤝 貢献ガイドライン

### 開発フロー
1. **Issue作成**: 機能追加・バグ報告
2. **ブランチ作成**: feature/*, bugfix/*
3. **実装・テスト**: 単体・統合テスト実行
4. **プルリクエスト**: レビュー後マージ

### コーディング規約
- **R**: tidyverse style guide準拠
- **JavaScript**: ES6+ 推奨、async/await使用
- **CSS**: BEM命名規則、モバイルファースト

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 📧 連絡先

開発チーム: [連絡先情報]
バグ報告: GitHub Issues
機能要望: GitHub Discussions 