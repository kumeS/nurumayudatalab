# Image Transformation Tracker - 画像変換追跡システム

<<<<<<< Updated upstream:webtool-Prev-Dev/webtool-image-transformation-tracking/README.md
最終更新: 2025-10-30 (v5.4)

**ビジュアルワークフローエディタ**: ノードベースの画像処理パイプライン構築ツール

AI駆動のNano Bananaモデルを使用した、Vanilla JavaScriptによる軽量でフレームワーク不要の画像変換ワークフロー管理ツールです。

## 📚 最新アップデート (2025-10-27 v5.3)
=======
最終更新: 2025-10-27 (v5.4)

**ビジュアルワークフローエディタ**: ノードベースの画像処理パイプライン構築ツール

## 📚 最新アップデート (2025-10-27 v5.4)

### ✨ Cloudflare Worker v5.0 - コード品質改善

**主な改善点**:

1. **コードの重複削除**
   - `formatTimestamp()`関数: 日時フォーマット処理を共通化（3箇所 → 1箇所）
   - `sanitizeFilename()`関数: ファイル名サニタイズを共通化（2箇所 → 1箇所）
   - 66%のコード重複を削減

2. **定数化によるマジックナンバー削除**
   - `CONFIG`オブジェクトで設定値を一元管理
   - ポーリングタイムアウト、リトライ回数、待機時間など10個以上の定数化
   - 設定変更が容易に

3. **ロギングの構造化**
   - `logInfo()`, `logError()`, `logR2()`関数を新規追加
   - 一貫したログフォーマット（INFO, ERROR, R2レベル）
   - エラースタックの自動出力

4. **関数の分割と単一責任の原則**
   - `processSingleFile()`を新規作成（単一ファイル処理専用）
   - `processAndSaveImages()`を90行に削減（v4は150行）
   - テスト・デバッグが容易に

5. **Content-Typeマッピングの定数化**
   - `CONTENT_TYPE_MAP`: MIMEタイプから拡張子へのマッピング
   - `EXTENSION_TO_CONTENT_TYPE`: 拡張子からMIMEタイプへのマッピング
   - 複数ファイル形式のサポート強化

6. **条件判定の簡潔化**
   - Optional chaining (`?.`) の活用
   - 意味のある変数名（例: `shouldPoll`）
   - 可読性の向上

**技術的な成果**:
- ✅ 全エンドポイントが正常動作
- ✅ R2バインディング設定完了
- ✅ セキュリティ保護機能が正常
- ✅ `exports.default`エラーを完全解消（v4で修正）
- ✅ コード行数: 950行（v4: 826行、v3: 787行）
  - 増加分は定数定義・JSDocコメント・ロギング関数の追加によるもの
  - 実際のロジックコードは削減されている

**ドキュメント**:
- `CLOUDFLARE_WORKER_V5_CHANGES.md`: 詳細な変更ログ
- `WORKER_V5_TEST_RESULTS.md`: 5つの動作確認テスト結果

## 📚 Previous Updates (2025-10-27 v5.3)
>>>>>>> Stashed changes:webtool-image-transformation-tracking/README.md

### ✨ 新機能とバグ修正
1. **Faviconの追加**
   - プロジェクト専用のアイコン（nu-circle.svg）を追加
   - ブラウザタブでの視認性向上

2. **アスペクト比選択機能**
   - プロンプト設定時にアスペクト比を選択可能
   - 対応比率: 1:1（正方形）、4:3（標準）、3:4（縦標準）、16:9（ワイド）、9:16（縦長）
   - Nano Bananaモデルでの画像生成に対応

3. **Replicate APIキーのUI側設定**
   - UI側でReplicate APIキーを設定可能に
   - HTTPS経由で安全に送信
   - 設定画面から簡単に入力・変更可能

4. **画像変換エラーハンドリングの強化**
   - 画像変換失敗時のエラーメッセージを改善
   - 部分的な失敗に対応（成功した画像のみ保存）
   - リトライ機能の追加（最大3回）
   - 変換成功/失敗の詳細なログ出力

5. **Cloudflare Worker v3.0の基盤実装**
   - extractAllFileUrls()による複数ファイルサポート
   - TRELLIS v2、Nano Bananaなどのモデル対応
   - 並列ファイル処理でパフォーマンス向上
   - R2ストレージへの画像保存機能の実装
   - 新しいエンドポイント: `GET /image/:key`（R2からの画像配信）

## 📚 Previous Updates (2025-10-26 v5.2)

### ✨ UI/UX改善とバグ修正
1. **画像表示の改善**
   - ノード内の画像サムネイルが縦横比を保持して表示されるように修正
   - 画像が変形せず、元の比率で中央配置される

2. **マルチプラットフォーム対応**
   - Macでの右クリック（Control+クリック）に対応
   - contextmenuイベントで処理することでMac/Windows/Linux全てで動作

3. **ミニマップの改善**
   - ページ読み込み後、ミニマップとノード配置が正しく対応するように修正
   - ネットワーク安定化後に遅延更新を実装

4. **設定UIの改善**
   - 画像編集モデルのデフォルト値を `google/nano-banana` に統一
   - LLMモデル設定を一番下（保存ボタンの上）に移動
   - プロンプト編集モーダルから不要な「変換スタイル」選択肢を削除

5. **ワークフロー永続化の強化**
   - ノード作成・削除・画像追加時に即座保存
   - ページ更新前に強制保存（beforeunloadイベント）
   - ページ読み込み時の二重読み込みバグを修正

6. **ノード操作の簡素化**
   - ノード追加は入力ノードのみに統一（選択モーダルを削除）
   - ノード詳細パネルに画像変換・アップロードボタンを追加
   - より直感的な操作フローを実現

## 📚 Previous Updates (2025-10-25 v5.1)

### ✨ 新機能: Auto Layout（ノード自動配置）
1. **階層的レイアウト**
   - 入力ノードを左側、生成ノードを右側に自動配置
   - 接続数に応じた優先度ソート
   - ノードの重なりを自動回避
   - アニメーション付きでスムーズに移動
2. **使い方**
   - フローティングツールバー（左側）の藍色ボタンをクリック
   - ワークフローが自動的に整列される
   - 詳細: `AUTO_LAYOUT_IMPLEMENTATION.md` を参照

## 📚 Previous Updates (2025-10-25 v5)

### 🔧 パフォーマンス改善
1. **無限レンダリングループの修正**
   - requestAnimationFrameベースの描画スケジューラを実装
   - 画像ロード時のCPU使用率が安定化
   - ブラウザのパフォーマンスが大幅に向上
   - 描画リクエストが1フレームに統合され、無限ループを完全に防止

2. **Cloudflare Workers統合（CORSプロキシ）**
   - ブラウザからReplicate APIへの直接アクセスでのCORSエラーを完全解決
   - APIトークンの安全な管理（ブラウザに露出しない）
   - R2バケットへの自動保存機能
   - 24秒の自動ポーリング + クライアント側継続ポーリングをサポート
   - エンドポイント: `https://replicate-nanobanana.skume-bioinfo.workers.dev/`

3. **セキュリティ強化**
   - Replicate APIトークンはサーバー側で管理
   - URLバリデーション（api.replicate.comのみ許可）
   - オリジン制限によるCSRF攻撃対策

4. **R2自動保存**
   - 生成された画像・動画・3Dモデルを自動的にR2バケットに保存
   - 予測JSONのバックアップ
   - 保存場所: `replicate/{predictionId}/`

### 🗂️ プロジェクト整理
- 重複ファイルを削除し、最新版の`cloudflare-replicate-proxy.js`に統合
- 詳細な実装レポート（`IMPLEMENTATION_REPORT.md`）を追加

## 📚 Previous Updates (2025-10-25 v4)

### 新機能実装
1. **ノードタイプシステム**
   - 入力ノード（Input Node）: 画像のアップロードが可能、青いグラデーション、📤アイコン
   - 生成ノード（Generated Node）: AI生成画像のみ受付、紫のグラデーション、✨アイコン
   - ノード作成時にタイプ選択モーダルを表示

2. **画像拡大モーダル**
   - ノード詳細パネルの画像クリックで拡大表示
   - ダウンロードボタンで画像保存が可能
   - フルサイズ画像の閲覧機能

3. **エッジ詳細パネル**
   - エッジクリックで詳細情報を表示
   - ソース/ターゲットノード情報
   - プロンプト、スタイル、モデル設定の確認
   - 「Edit Prompt」ボタンでプロンプト再編集可能

4. **Generateボタン**
   - 生成ノードに入力エッジ（プロンプト付き）がある場合に表示
   - クリックでAI画像生成を実行（デモ実装）
   - 処理中のステータス表示

5. **アップロード制限**
   - 生成ノードへの手動画像アップロードを制限
   - 日本語エラーメッセージで適切に案内
   - ドラッグ&ドロップも制限対象

6. **UI/UX改善**
   - 空のキャンバスクリックで全パネルを閉じる
   - デフォルト値を1に変更（出力ブランチ数、生成枚数）
   - ノードタイプに応じた色分け

## 📚 Previous Updates (2025-10-22 v3)

### 右クリックメニューの完全修正
1. **二重イベントハンドラー実装**
   - vis.jsの`oncontext`イベントとcanvas要素への直接的な`contextmenu`イベントの両方を実装
   - ブラウザ互換性を向上

2. **イベント処理の改善**
   - Canvas要素の正確な位置計算
   - DOMtoCanvas変換を使用した正確なノード検出
   - イベント伝播の適切な制御

3. **メニュー表示の安定化**
   - メニューのz-indexとpointer-eventsを強制
   - CSSでの視覚的な改善（影、ホバーエフェクト）
   - コンソールログによるデバッグ情報の出力

4. **ドラッグ制御の改善**
   - 右クリック時の一時的なドラッグ無効化
   - タイミング制御の最適化

## 📚 Recent Bug Fixes & Improvements (2025-10-22 v2)

### 新機能・改善点
1. **Active/Inactiveノードの視覚的区別**
   - アクティブノード（画像あり）: 紫色のグラデーション背景
   - 非アクティブノード（画像なし）: グレーの背景
   - ステータスインジケーターでACTIVE/INACTIVEを表示

2. **プロンプト設定済みエッジの色分け**
   - プロンプトあり: 紫色の太い線
   - プロンプトなし: グレーの細い線
   - ラベルの色も連動して変更

3. **プロンプトの再編集機能**
   - 設定済みプロンプトをダブルクリックで再編集可能
   - 現在のプロンプトがテキストエリアに自動表示
   - 設定済みステータスをバッジで表示

4. **画像アップロードの修正**
   - 右クリックメニューから直接アップロード可能
   - FileReaderエラーハンドリングを改善
   - アップロード後の自動リドロー

5. **右クリックメニューの安定化**
   - メニューの初期化チェックを追加
   - DOM存在確認を強化
   - コンソールログでデバッグ情報を出力

## 📚 Recent Bug Fixes (2025-10-22 v1)

### 修正済みのバグ
1. **ダブルクリックによるノード作成の削除**
   - 空のキャンバスエリアをダブルクリックしてもノードが作成されなくなりました

2. **右クリックメニューのバグ修正**
   - ノードを右クリックしても移動しなくなりました
   - メニューがすぐに消える問題を解決
   - 一時的にドラッグを無効化することで安定性を向上

3. **メモリリークの防止**
   - イベントリスナーのクリーンアップを改善
   - destroy()メソッドを拡張してリソースを適切に解放
   - コンテナ要素の再作成でイベントリスナーを完全に削除

4. **エラーハンドリングの改善**
   - ファイルアップロードの非同期処理を改善
   - Promise.allSettledを使用して部分的な失敗を処理
   - ファイルサイズ制限（10MB）を追加

5. **vis.jsレンダリングエラーの修正**
   - カスタムノードレンダリングの返り値を修正
   - drawExternalLabelプロパティを削除してエラーを解消

6. **未定義オブジェクトの修正**
   - storageオブジェクトの未定義エラーを修正
   - nodeManager, edgeManager, apiServiceを実装
   - グローバル変数の参照を適切に処理

7. **パフォーマンスの最適化**
   - debouncedSave()を追加して過度なストレージ書き込みを防止
   - 非同期処理のエラー境界を追加

## 📋 プロジェクト概要

**Image Transformation Tracker**は、ノードベースのビジュアルワークフローエディタを使用した画像処理パイプライン構築ツールです。

入力ノードに画像をアップロードし、エッジでノードを接続してプロンプトを設定。生成ノードでAI画像変換を実行します。ワークフロー全体を可視化し、複雑な画像処理フローを直感的に構築・管理できます。

### 🎯 プロジェクトの目標
- ノードベースUIで画像処理フローを視覚的に構築
- 入力ノードと生成ノードを明確に区別
- エッジを使った変換プロンプトの管理
- ワークフロー全体の保存・再利用
- プロンプトエンジニアリングの効率化

## ✨ 実装済みの機能

### 1. ノードベースワークフロー
- **ノードタイプシステム**
  - 入力ノード: 画像アップロード専用（青色、📤アイコン）
  - 生成ノード: AI生成画像専用（紫色、✨アイコン）
  - ノード追加は入力ノードに統一（簡素化）
- **ビジュアル表現**
  - アクティブ/非アクティブノードの色分け
  - ノードタイプに応じたグラデーション背景
  - ステータスインジケーター（ready/processing/error）
  - 画像サムネイルは縦横比を保持して表示
- **ノード操作**
  - ドラッグ&ドロップで位置調整
  - 右クリックでサークルメニュー表示（Mac対応）
  - ノードクリックで詳細パネル表示
  - 複数画像の保持と切り替え
  - Auto Layout機能でノード自動配置

### 2. エッジ管理
- **エッジ作成**
  - 接続モードでノード間を接続
  - エッジ作成時にプロンプト設定
  - プロンプト有無による色分け（紫/グレー）
- **プロンプト編集**
  - エッジダブルクリックで編集
  - エッジ詳細パネルから再編集
  - シンプルなプロンプト入力（スタイル選択は廃止）
  - 手動入力/AI生成の選択
- **エッジ詳細パネル**
  - ソース/ターゲットノード情報
  - プロンプトテキスト表示
  - モデル設定
  - Edit Promptボタン

### 3. 画像処理機能
- **画像アップロード**
  - ドラッグ&ドロップ（入力ノードのみ）
  - 右クリックメニューからアップロード
  - 複数ファイル対応（最大20MB/ファイル）
  - 対応形式: JPG, PNG, GIF, WebP
- **アップロード制限**
  - 生成ノードへの手動アップロードを禁止
  - エラーメッセージで適切に案内
- **画像表示**
  - ノード内でサムネイル表示
  - 複数画像の矢印ナビゲーション
  - 詳細パネルでグリッド表示
  - クリックで拡大モーダル表示

### 4. AI画像生成（デモ実装）
- **Generateボタン**
  - 生成ノードに入力エッジがある場合に表示
  - クリックで生成処理を実行
  - 処理中のステータス表示
- **生成処理**
  - 入力エッジのプロンプトを使用
  - ソースノードの画像を参照
  - 生成画像をノードに追加
  - メタデータ（プロンプト、モデル等）を保存

### 5. ワークフロー管理
- **保存/読込**
  - JSON形式でエクスポート
  - ファイルからインポート
  - LocalStorageへ即座自動保存
  - ページ更新前の強制保存（beforeunload）
  - ページ読み込み時の自動復元
- **操作**
  - クリアボタンでワークフロー全削除
  - ノード/エッジの削除
  - ノード結合（マージ）
- **表示制御**
  - ズームイン/アウト
  - ビューのフィット
  - ミニマップ表示（リアルタイム同期）

### 6. ユーザーインターフェース
- **モダンなデザイン**
  - ダークテーマ
  - グラスモーフィズムエフェクト
  - Tailwind CSSによるスタイリング
- **パネルシステム**
  - ノード詳細パネル（右側）
    - 画像アップロードボタン（入力ノードのみ）
    - URLから画像追加ボタン（入力ノードのみ）
    - 画像変換ボタン（画像がある場合）
  - エッジ詳細パネル（右側）
  - 空キャンバスクリックで全パネルを閉じる
- **キーボードショートカット**
  - N: ノード追加
  - C: 接続モード切替
  - Delete/Backspace: 削除
  - Ctrl/Cmd + S: ワークフロー保存
  - Ctrl/Cmd + O: ワークフロー読込
  - Esc: モーダル/パネルを閉じる
- **フローティングツールバー**
  - ノード追加、接続、削除の基本操作
  - 画像アップロード、ノード結合
  - クリアボタン（ワークフロー全削除）
  - ⭐ **Auto Layout**: ノードの自動配置

### 7. デバッグ機能
- 主要操作のコンソールログ出力
- ノードタイプ、状態の詳細ログ
- エラー時の詳細情報表示

### 8. バックエンド統合
- **Cloudflare Workers CORS プロキシ**
  - Replicate API用のプロキシサーバー（CORSエラー解決）
  - エンドポイント: `POST /`, `POST /poll`, `GET /health`
  - R2バケットへの自動保存（画像・動画・3Dモデル対応）
  - セキュアなAPIトークン管理
- **パフォーマンス最適化**
  - requestAnimationFrameベースの描画スケジューラ
  - 無限レンダリングループの完全防止
  - 画像キャッシュ機能

## 🔄 現在の機能エントリーポイント

### メインページ
- **URL**: `/index.html`
- **機能**: 
  - 画像アップロード
  - プロンプト生成
  - 画像変換実行
  - 結果表示
  - ツリービュー

### API エンドポイント（RESTful Table API）
- `GET tables/transformations` - 変換履歴一覧取得
- `GET tables/transformations/{id}` - 特定の変換詳細取得
- `POST tables/transformations` - 新規変換保存
- `PUT tables/transformations/{id}` - 変換情報更新
- `DELETE tables/transformations/{id}` - 変換削除

## 🚀 今後実装予定の機能

### 🎯 即座に実装可能な機能（優先度: 高 🔴）

<<<<<<< Updated upstream:webtool-Prev-Dev/webtool-image-transformation-tracking/README.md
以下は、現在の実装を活かして30分〜3時間程度で追加できる実用的な機能です。大規模実装やProduction公開は想定せず、個人・小規模チーム向けの実用機能に限定します。

#### 1. **プロンプトテンプレート管理** ⭐ 簡単
- **実装時間**: 1-1.5時間
- **目的**: よく使うプロンプトをテンプレートとして保存・再利用
- **実装内容**:
  - プロンプト編集モーダルに「💾 テンプレート保存」ボタンを追加
  - LocalStorageに`prompt_templates`配列として保存
  - プロンプト入力時にドロップダウンでテンプレート選択
  - 設定モーダルにテンプレート一覧と削除機能を追加
- **実装箇所**: `index.html`、`js/workflowApp.js`

#### 2. **ノードのメモ/ラベル機能** ⭐ 簡単
- **実装時間**: 45分〜1時間
- **目的**: ノードに説明やメモを追加して作業を整理
- **実装内容**:
  - ノード詳細パネルに「📝 メモ」テキストエリアを追加
  - ノードオブジェクトの`metadata.note`に保存（自動保存）
  - メモがあるノードのキャンバス上に📝アイコンを表示
  - ノード名をカスタマイズ可能に（デフォルト: "Node 1"など）
- **実装箇所**: `js/canvasController.js:renderNodeDetails()`、`js/workflowEngine.js`

#### 3. **ノードのズーム/フォーカス機能** ⭐ 簡単
- **実装時間**: 30分
- **目的**: 特定のノードにすばやくフォーカスしてワークフローを見やすくする
- **実装内容**:
  - ノード詳細パネルに「🎯 Zoom to Node」ボタンを追加
  - クリックでそのノードを中央に表示してズームイン（vis.js `moveTo()`）
  - スムーズなアニメーション付き（500ms）
- **実装箇所**: `js/canvasController.js`

#### 4. **エッジの色カスタマイズ** ⭐ 簡単
- **実装時間**: 1時間
- **目的**: エッジに色をつけてワークフローを視覚的に整理
- **実装内容**:
  - エッジ詳細パネルに色選択パレットを追加（6色プリセット）
  - エッジの`metadata.color`に保存してvis.jsに反映
  - プロンプトカテゴリごとに色分け可能
- **実装箇所**: `index.html`、`js/canvasController.js:renderEdgeDetails()`

#### 5. **ワークフローのPNGエクスポート** ⭐ 簡単
- **実装時間**: 45分〜1時間
- **目的**: ワークフロー全体を画像として保存してドキュメント化
- **実装内容**:
  - ヘッダーに「📸 スクリーンショット」ボタンを追加
  - vis.jsキャンバス全体をPNG画像としてエクスポート
  - ファイル名に日時を含める（`workflow-2025-10-30.png`）
- **実装箇所**: `js/workflowApp.js`

#### 6. **画像の複数選択削除** ⭐ 簡単
- **実装時間**: 1時間
- **目的**: ノード内の不要な画像を一括削除してストレージを節約
- **実装内容**:
  - ノード詳細パネルの画像グリッドにチェックボックスを追加
  - 「🗑️ 選択削除」ボタンで複数画像を一度に削除
  - 削除前に確認ダイアログを表示
- **実装箇所**: `js/canvasController.js:renderNodeDetails()`

#### 7. **画像のキーボードナビゲーション** ⭐ 簡単
- **実装時間**: 30分
- **目的**: 矢印キーで画像を素早く切り替え
- **実装内容**:
  - ノード詳細パネルで画像が選択されている時に←→キーで前後の画像に切り替え
  - Enterキーで画像拡大モーダルを表示
  - Escキーでパネルを閉じる（既存機能の拡張）
- **実装箇所**: `js/workflowApp.js:bindKeyboardEvents()`

#### 8. **ノードの複製機能** ⭐ 簡単
- **実装時間**: 45分
- **目的**: 既存ノードを複製して似たワークフローを素早く構築
- **実装内容**:
  - 右クリックメニューに「📋 複製」オプションを追加
  - ノードの画像、メタデータ、設定をコピー（エッジは除外）
  - 複製ノードを元のノードの右側に配置
- **実装箇所**: `js/canvasController.js:showCircleMenu()`、`js/workflowEngine.js`

#### 9. **Undo/Redo機能** ⭐⭐ 中程度
- **実装時間**: 2-3時間
- **目的**: 操作を取り消し・やり直しできるようにする
- **実装内容**:
  - ノード/エッジの作成・削除、画像追加などの操作を記録
  - `Ctrl/Cmd + Z`でUndo、`Ctrl/Cmd + Shift + Z`でRedo
  - ヘッダーにUndo/Redoボタンを追加（最大20操作まで）
- **実装箇所**: 新規ファイル`js/historyManager.js`、`js/workflowEngine.js`

#### 10. **バッチ画像生成機能** ⭐⭐ 中程度
- **実装時間**: 2-3時間
- **目的**: 複数の生成ノードで一括して画像生成を実行
- **実装内容**:
  - ヘッダーに「⚡ 一括生成」ボタンを追加
  - Generate可能なノード（入力エッジあり）を検出して確認ダイアログ表示
  - 順次または並列で画像生成を実行（オプション選択可能）
  - プログレス表示とエラーハンドリング
- **実装箇所**: `js/workflowApp.js`、`js/transformationService.js`
=======
以下は、現在の実装を活かして**30分〜2時間程度**で追加できる実用的な機能です。大規模実装やProduction公開は想定せず、**個人利用・小規模チーム向け**の実用機能に限定します。

#### 1. 生成履歴パネル
**実装難易度**: ⭐ 簡単
**実装時間**: 1-1.5時間
**目的**: 過去に生成した画像を一覧表示し、再利用を簡単にする

**実装内容**:
- 右サイドバーに「📜 履歴」タブを追加
- 画像生成時にメタデータ（プロンプト、生成日時、ノードID）をLocalStorageに保存
- 履歴パネルでサムネイル・プロンプト・日時を表示
- クリックで拡大表示、ダウンロード、ノードへの再適用が可能
- 最大50件まで保存（古いものから自動削除）
- 実装箇所: `js/workflowApp.js`、新規`js/historyManager.js`

**実装方法**:
```javascript
// historyManager.js
class GenerationHistoryManager {
  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
    this.storageKey = 'generation_history';
  }

  addGeneration(nodeId, prompt, imageUrl, metadata = {}) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now(),
      nodeId,
      prompt,
      imageUrl,
      timestamp: new Date().toISOString(),
      ...metadata
    });

    // 最大件数を超えたら古いものを削除
    if (history.length > this.maxHistory) {
      history.length = this.maxHistory;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(history));
  }

  getHistory() {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  clearHistory() {
    localStorage.removeItem(this.storageKey);
  }
}
```

**HTMLパネル**:
```html
<div id="historyPanel" class="side-panel">
  <h3>📜 生成履歴</h3>
  <div id="historyGrid" class="grid grid-cols-2 gap-2">
    <!-- 各履歴アイテム -->
    <div class="history-item cursor-pointer">
      <img src="..." class="w-full h-24 object-cover rounded">
      <div class="text-xs mt-1 truncate" title="プロンプト">...</div>
      <div class="text-xs text-gray-500">2025-10-27 15:30</div>
    </div>
  </div>
</div>
```

---

#### 2. プロンプト履歴とお気に入り機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: よく使うプロンプトを保存・再利用

**実装内容**:
- プロンプト入力モーダルに「⭐ お気に入りに追加」ボタンを追加
- 過去に使ったプロンプトを自動記録（最大30件）
- プロンプト入力時にドロップダウンで履歴・お気に入りを表示
- クリックで自動入力、編集可能
- 設定モーダルで履歴・お気に入り管理（削除、編集）
- 実装箇所: `index.html`、`js/workflowApp.js`

**LocalStorage構造**:
```javascript
{
  "prompt_history": [
    { "text": "a cute cat", "timestamp": "2025-10-27T...", "count": 5 },
    { "text": "sunset over mountains", "timestamp": "2025-10-27T...", "count": 2 }
  ],
  "prompt_favorites": [
    { "id": 1, "name": "動物シリーズ", "text": "a cute [ANIMAL]", "color": "#a855f7" },
    { "id": 2, "name": "風景", "text": "beautiful landscape...", "color": "#3b82f6" }
  ]
}
```

**実装方法**:
```javascript
// プロンプト履歴に追加
function addToHistory(promptText) {
  const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
  const existing = history.find(h => h.text === promptText);

  if (existing) {
    existing.count++;
    existing.timestamp = new Date().toISOString();
  } else {
    history.unshift({ text: promptText, timestamp: new Date().toISOString(), count: 1 });
  }

  // 最大30件に制限
  if (history.length > 30) history.length = 30;

  localStorage.setItem('prompt_history', JSON.stringify(history));
}

// お気に入りに追加
function addToFavorites(name, promptText) {
  const favorites = JSON.parse(localStorage.getItem('prompt_favorites') || '[]');
  favorites.push({
    id: Date.now(),
    name: name || promptText.substring(0, 20),
    text: promptText,
    color: '#a855f7',
    created: new Date().toISOString()
  });
  localStorage.setItem('prompt_favorites', JSON.stringify(favorites));
}
```

---

#### 3. ノードのコピー&ペースト機能
**実装難易度**: ⭐ 簡単
**実装時間**: 45分
**目的**: ノードを複製して作業を効率化

**実装内容**:
- ノード右クリックメニューに「📋 コピー」を追加
- キャンバス右クリックメニューに「📄 ペースト」を追加
- キーボードショートカット: `Ctrl/Cmd + C`（コピー）、`Ctrl/Cmd + V`（ペースト）
- ノードの画像・メタデータ・設定を全てコピー
- ペースト時に少しずらした位置に配置
- 実装箇所: `js/canvasController.js`

**実装方法**:
```javascript
// コピー
let copiedNode = null;

function copyNode(nodeId) {
  const node = workflowEngine.nodes.get(nodeId);
  copiedNode = JSON.parse(JSON.stringify(node)); // ディープコピー
  console.log('ノードをコピーしました:', nodeId);
}

// ペースト
function pasteNode(position = null) {
  if (!copiedNode) {
    alert('コピーされたノードがありません');
    return;
  }

  const newPosition = position || {
    x: copiedNode.x + 50,
    y: copiedNode.y + 50
  };

  const newNodeId = workflowEngine.createNode(copiedNode.type, newPosition);
  const newNode = workflowEngine.nodes.get(newNodeId);

  // 画像とメタデータをコピー
  newNode.images = [...copiedNode.images];
  newNode.metadata = { ...copiedNode.metadata };

  workflowEngine.emit('nodeCreated', { nodeId: newNodeId });
  workflowEngine.saveWorkflow();

  console.log('ノードをペーストしました:', newNodeId);
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    if (selectedNodeId) copyNode(selectedNodeId);
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    pasteNode();
  }
});
```

---

#### 4. エッジの一括削除機能
**実装難易度**: ⭐ 簡単
**実装時間**: 30分
**目的**: 不要なエッジを一度に削除してワークフローを整理

**実装内容**:
- ヘッダーに「🗑️ エッジ一括削除」ボタンを追加
- クリックで削除対象エッジを選択するモーダルを表示
- チェックボックスでエッジを複数選択
- 選択したエッジを一度に削除
- 実装箇所: `js/workflowApp.js`

**実装方法**:
```javascript
// エッジ一括削除モーダル
function showBatchDeleteModal() {
  const edges = Array.from(workflowEngine.edges.values());

  if (edges.length === 0) {
    alert('削除するエッジがありません');
    return;
  }

  // モーダルHTMLを生成
  const edgeList = edges.map(edge => {
    const from = workflowEngine.nodes.get(edge.from);
    const to = workflowEngine.nodes.get(edge.to);
    return `
      <div class="flex items-center gap-2 p-2 border-b">
        <input type="checkbox" id="edge-${edge.id}" value="${edge.id}">
        <label for="edge-${edge.id}" class="flex-1">
          ${from?.label || edge.from} → ${to?.label || edge.to}
          ${edge.prompt ? `(${edge.prompt.substring(0, 30)}...)` : ''}
        </label>
      </div>
    `;
  }).join('');

  // モーダルを表示（実装省略）
  // ...
}

// 選択したエッジを削除
function deleteBatchEdges() {
  const checked = document.querySelectorAll('#batchDeleteModal input:checked');
  const edgeIds = Array.from(checked).map(el => el.value);

  if (edgeIds.length === 0) {
    alert('削除するエッジを選択してください');
    return;
  }

  if (!confirm(`${edgeIds.length}本のエッジを削除しますか？`)) {
    return;
  }

  edgeIds.forEach(edgeId => workflowEngine.deleteEdge(edgeId));

  alert(`${edgeIds.length}本のエッジを削除しました`);
  closeModal('batchDeleteModal');
}
```

---

#### 2. 画像の複数選択削除機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: ノード内の不要な画像を一括削除してストレージを節約

**実装内容**:
- ノード詳細パネルの画像グリッドにチェックボックスを追加
- 「選択した画像を削除」ボタンを追加
- 複数の画像を選択して一度に削除
- 実装箇所: `js/canvasController.js`の`renderNodeDetails()`

**実装方法**:
```javascript
// 画像グリッドにチェックボックスを追加
<input type="checkbox" class="image-select" data-index="${index}">

// 削除ボタンのハンドラー
deleteSelectedImages(nodeId) {
  const checked = document.querySelectorAll('.image-select:checked');
  const indices = Array.from(checked).map(el => parseInt(el.dataset.index));

  if (indices.length === 0) {
    alert('削除する画像を選択してください');
    return;
  }

  if (!confirm(`${indices.length}枚の画像を削除しますか？`)) {
    return;
  }

  indices.sort((a, b) => b - a); // 後ろから削除
  const node = workflowEngine.nodes.get(nodeId);
  indices.forEach(i => node.images.splice(i, 1));

  workflowEngine.emit('nodeUpdated', { nodeId });
  workflowEngine.saveWorkflow();
}
```

---

#### 3. エッジのプロンプトテンプレート機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1.5時間
**目的**: よく使うプロンプトをテンプレートとして保存・再利用

**実装内容**:
- プロンプト編集モーダルに「💾 テンプレート保存」ボタンを追加
- LocalStorageに`prompt_templates`配列として保存
- プロンプト入力時にテンプレートをドロップダウンで表示
- テンプレート選択で自動入力
- 設定モーダルにテンプレート管理セクションを追加（削除機能）
- 実装箇所: `index.html`、`js/workflowApp.js`

**実装方法**:
```javascript
// テンプレート保存
saveTemplate(prompt, name = null) {
  const templates = JSON.parse(localStorage.getItem('prompt_templates') || '[]');
  const templateName = name || prompt.substring(0, 30) + '...';

  templates.push({
    id: Date.now(),
    name: templateName,
    text: prompt,
    created: new Date().toISOString()
  });

  localStorage.setItem('prompt_templates', JSON.stringify(templates));
  alert('テンプレートを保存しました');
}

// テンプレート読み込み
loadTemplates() {
  return JSON.parse(localStorage.getItem('prompt_templates') || '[]');
}

// テンプレート削除
deleteTemplate(templateId) {
  const templates = JSON.parse(localStorage.getItem('prompt_templates') || '[]');
  const filtered = templates.filter(t => t.id !== templateId);
  localStorage.setItem('prompt_templates', JSON.stringify(filtered));
}
```

---

#### 4. ノードのメモ機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: ノードに説明やメモを追加して作業を整理

**実装内容**:
- ノード詳細パネルに「📝 メモ」テキストエリアを追加
- メモはノードオブジェクトの`metadata.note`に保存
- メモがあるノードにはキャンバス上に📝アイコンを表示
- 自動保存機能（入力後1秒で保存）
- 実装箇所: `js/canvasController.js`、`js/workflowEngine.js`

**実装方法**:
```javascript
// ノード詳細パネルにメモエリアを追加
<div class="mt-4">
  <label class="block text-sm font-medium text-gray-300 mb-2">📝 メモ</label>
  <textarea
    id="nodeNoteInput"
    class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
    rows="3"
    placeholder="このノードについてのメモを入力..."
  ></textarea>
</div>

// メモ保存（デバウンス付き）
let noteTimeout;
document.getElementById('nodeNoteInput').addEventListener('input', (e) => {
  clearTimeout(noteTimeout);
  noteTimeout = setTimeout(() => {
    const node = workflowEngine.nodes.get(currentNodeId);
    node.metadata = { ...node.metadata, note: e.target.value };
    workflowEngine.emit('nodeUpdated', { nodeId: currentNodeId });
    workflowEngine.saveWorkflow();
  }, 1000);
});

// レンダリング時にアイコン表示
if (node.metadata?.note) {
  ctx.fillText('📝', x + radius - 15, y - radius + 20);
}
```

---

#### 5. ワークフロー履歴機能（Undo/Redo）
**実装難易度**: ⭐⭐ 中程度
**実装時間**: 2-3時間
**目的**: 操作を取り消し・やり直しできるようにする

**実装内容**:
- ノード作成・削除、エッジ作成・削除、画像追加などの操作を記録
- `Ctrl/Cmd + Z`でUndo、`Ctrl/Cmd + Shift + Z`でRedo
- ヘッダーにUndo/Redoボタンを追加
- 最大20操作まで履歴を保持
- 実装箇所: 新規ファイル`js/historyManager.js`

**実装方法**:
```javascript
class HistoryManager {
  constructor(maxHistory = 20) {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = maxHistory;
  }

  push(state) {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(state)));
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }
}
```

---

#### 6. 画像のドラッグ&ドロップ並び替え
**実装難易度**: ⭐⭐ 中程度
**実装時間**: 2時間
**目的**: ノード内の画像順序を自由に変更

**実装内容**:
- ノード詳細パネルの画像グリッドにドラッグ&ドロップ機能を追加
- HTML5 Drag and Drop APIを使用
- 並び替え中は視覚的なフィードバックを表示
- 並び替え後に自動保存
- 実装箇所: `js/canvasController.js`の`renderNodeDetails()`

**実装方法**:
```javascript
// 画像要素にdraggable属性を追加
<img
  draggable="true"
  ondragstart="handleDragStart(event, ${index})"
  ondragover="handleDragOver(event)"
  ondrop="handleDrop(event, ${index})"
  class="cursor-move"
  ...>

function handleDragStart(e, index) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('imageIndex', index);
  e.currentTarget.style.opacity = '0.5';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetIndex) {
  e.preventDefault();
  const sourceIndex = parseInt(e.dataTransfer.getData('imageIndex'));

  if (sourceIndex === targetIndex) return;

  const node = workflowEngine.nodes.get(nodeId);
  const [removed] = node.images.splice(sourceIndex, 1);
  node.images.splice(targetIndex, 0, removed);

  workflowEngine.emit('nodeUpdated', { nodeId });
  workflowEngine.saveWorkflow();

  // 画像グリッドを再描画
  this.renderNodeDetails(nodeId);
}
```

---

#### 7. エッジの色カスタマイズ
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: エッジに色をつけて視覚的に整理

**実装内容**:
- エッジ詳細パネルに色選択パレットを追加
- 6色のプリセットカラーを用意（紫、青、緑、黄、橙、赤）
- エッジの`metadata.color`プロパティに保存
- vis.jsのエッジ色設定に反映
- 実装箇所: `index.html`、`js/canvasController.js`

**実装方法**:
```javascript
// エッジ詳細パネルに色選択を追加
<div class="mt-4">
  <label class="block text-sm font-medium text-gray-300 mb-2">🎨 エッジの色</label>
  <div class="flex gap-2">
    ${['#a855f7', '#3b82f6', '#10b981', '#fbbf24', '#f97316', '#ef4444'].map(color => `
      <button
        onclick="setEdgeColor('${edge.id}', '${color}')"
        class="w-8 h-8 rounded border-2 border-gray-600 hover:border-white"
        style="background-color: ${color}">
      </button>
    `).join('')}
  </div>
</div>

// 色設定関数
function setEdgeColor(edgeId, color) {
  const edge = workflowEngine.edges.get(edgeId);
  edge.metadata = { ...edge.metadata, color };

  // vis.jsのエッジを更新
  this.network.body.data.edges.update({
    id: edgeId,
    color: { color: color }
  });

  workflowEngine.saveWorkflow();
}
```

---

#### 8. ノードのズーム機能
**実装難易度**: ⭐ 簡単
**実装時間**: 30分
**目的**: 特定のノードにすばやくフォーカス

**実装内容**:
- ノード詳細パネルに「Zoom to Node」ボタンを追加
- クリックでそのノードを中央に表示してズームイン
- ミニマップからのノードクリックでもズーム
- 実装箇所: `js/canvasController.js`

**実装方法**:
```javascript
zoomToNode(nodeId) {
  const position = this.network.getPositions([nodeId])[nodeId];
  this.network.moveTo({
    position: position,
    scale: 1.5,
    animation: {
      duration: 500,
      easingFunction: 'easeInOutQuad'
    }
  });
}
```

---

#### 9. ワークフローのエクスポート改善
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: ワークフローを見やすいPNG画像として保存

**実装内容**:
- ヘッダーに「📸 スクリーンショット」ボタンを追加
- vis.jsキャンバス全体をPNG画像として保存
- ファイル名に日時を含める（`workflow-YYYY-MM-DD.png`）
- 透明背景または白背景を選択可能
- 実装箇所: `js/workflowApp.js`

**実装方法**:
```javascript
exportAsScreenshot() {
  // vis.jsのキャンバスを取得
  const canvas = this.container.querySelector('canvas');

  if (!canvas) {
    alert('キャンバスが見つかりません');
    return;
  }

  // ダウンロードリンクを作成
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.download = `workflow-${timestamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  console.log('スクリーンショットを保存しました');
}
```
>>>>>>> Stashed changes:webtool-image-transformation-tracking/README.md

---

### 📋 中期実装機能（優先度: 中 🟡）

#### 11. **画像のドラッグ&ドロップ並び替え** ⭐⭐ 中程度
- **実装時間**: 2時間
- **目的**: ノード内の画像順序を自由に変更
- **実装内容**: HTML5 Drag and Drop APIを使用してノード詳細パネルの画像グリッドで並び替え
- **実装箇所**: `js/canvasController.js:renderNodeDetails()`

#### 12. **プロンプト生成進捗の視覚化** ⭐⭐ 中程度
- **実装時間**: 2-3時間
- **目的**: 画像生成中の進捗を視覚的に表示
- **実装内容**: 生成中のノードにプログレスバーを表示（0% → 100%）、推定残り時間表示
- **実装箇所**: `js/transformationService.js`、`js/canvasController.js`

#### 13. **ノードタイプ選択モーダルの復活** ⭐⭐ 中程度
- **実装時間**: 1.5-2時間
- **目的**: ノード作成時に入力/生成ノードを選択できるようにする
- **実装内容**: v5.2で簡素化された機能を復活させ、ノード追加時にタイプ選択モーダルを表示
- **実装箇所**: `index.html`、`js/workflowApp.js`

---

### 🔮 将来検討機能（参考）

以下は興味深いですが、優先度が低いため将来的な検討課題とします：

- **プロンプト効果の評価システム**: 生成結果に★評価をつけて良いプロンプトを記録
- **ノードグループ化**: 複数ノードをまとめてフォルダのように整理
- **画像比較ビュー**: 2つの画像を並べて比較表示
- **画像のフィルタ適用**: 明るさ、コントラスト等の基本的な画像編集
- **ワークフロー共有機能**: JSONでエクスポート/インポート（既存機能の拡張）

---

### 実装しない機能 ❌

以下は複雑すぎるか、現在の目的に合わないため実装しません：

- **Production環境への大規模デプロイ**: 個人/小規模チーム用途に限定
- **ユーザー認証・マルチユーザー対応**: LocalStorageベースで十分
- **データベース連携**: JSONファイルベースが適切
- **リアルタイムコラボレーション**: 実装コストが高すぎる
- **モバイルアプリ化**: Webアプリケーションに集中
- **複数の画像生成モデル対応**: Nano Bananaモデルに集中

## 💻 技術スタック

### フロントエンド
- HTML5
- Tailwind CSS（CDN）
- Vanilla JavaScript (ES6+)
- Vis.js（ネットワークビジュアライゼーション）
- Font Awesome（アイコン）

### バックエンド
- **Cloudflare Workers**: CORSプロキシ、API統合
- **Cloudflare R2**: 画像・モデルファイルのストレージ
- **Replicate API**: AI画像生成（Nano Banana等）

### データ管理
- LocalStorage（クライアント側ワークフロー保存）
- Cloudflare R2（生成ファイルの永続化）

### 外部API（統合済み・予定）
- ✅ **Replicate API**: 画像生成（Cloudflare Workers経由）
- 🔜 **IO Intelligence API**: LLMプロンプト生成

## 🔧 セットアップ方法

### ローカル開発環境
1. リポジトリをクローン
2. `index.html`をブラウザで開く
3. 画像をアップロードしてワークフローを構築

### Cloudflare Workers（CORSプロキシ）
1. Cloudflare Dashboard → Workers & Pages
2. 新しいWorkerを作成
3. `cloudflare-replicate-proxy.js`の内容をペースト
4. 環境変数を設定:
   - `REPLICATE_API_TOKEN`: Replicate APIトークン（Secret）
   - `ALLOWED_ORIGINS`: 許可するオリジン（オプション、デフォルト: `*`）
5. R2バインディングを設定:
   - Variable name: `IMAGE_BUCKET`
   - R2 bucket: `nurumayu-nanobanana`
6. デプロイ

詳細は`IMPLEMENTATION_REPORT.md`を参照してください。

## 📊 データモデル

### transformationsテーブル
```javascript
{
  id: string,                    // 一意の変換ID
  session_id: string,             // セッション識別子
  parent_id: string,              // 親変換ID（ツリー構造）
  source_image: string,           // ソース画像URL
  prompt: string,                 // 生成されたプロンプト
  llm_model: string,              // 使用したLLMモデル
  image_model: string,            // 使用した画像生成モデル
  transform_style: string,        // 変換スタイル
  additional_instructions: string,// 追加指示
  result_images: array,           // 生成画像の配列
  metadata: object,               // その他のメタデータ
  timestamp: datetime             // 変換実行日時
}
```

## 🎯 推奨される次のステップ

1. **API連携の実装**
   - IO Intelligence APIの実装
   - 画像生成APIの実装
   - 認証機能の追加

2. **パフォーマンス最適化**
   - 画像の遅延読み込み
   - キャッシュ戦略の実装
   - 大規模データ対応

3. **ユーザビリティ向上**
   - オンボーディングツアー
   - ツールチップの追加
   - ヘルプドキュメント

4. **品質向上**
   - ユニットテストの追加
   - E2Eテストの実装
   - アクセシビリティ改善

## 🔗 関連ドキュメント

- **IMPLEMENTATION_REPORT.md**: 最新実装の詳細レポート（無限ループ修正・CORS解決）
- **AUTO_LAYOUT_IMPLEMENTATION.md**: Auto Layout機能の実装ドキュメント
- **cloudflare-replicate-proxy.js**: Cloudflare Workers用CORSプロキシの実装

---

## 📝 使用方法

### 基本的なワークフロー

#### 1. ノードの作成
1. 「➕ 新規」ボタンまたはキーボードの `N` を押す
2. ノードタイプ選択モーダルが表示される
   - **入力ノード** (📤): 画像をアップロードする場合
   - **生成ノード** (✨): AI生成画像を受け取る場合
3. 希望のタイプをクリック

#### 2. 画像のアップロード（入力ノードのみ）
1. 入力ノードを右クリックしてサークルメニューを表示
2. 「Upload」を選択
3. 画像ファイルを選択（JPG, PNG, GIF, WebP対応）
4. または、ノードに直接ドラッグ&ドロップ

#### 3. ノードの接続
1. 「🔗」接続ボタンまたはキーボードの `C` を押す
2. ソースノード（画像がある入力ノード）をクリック
3. ターゲットノード（生成ノード）をクリック
4. プロンプト設定ダイアログが表示される

#### 4. プロンプトの設定
1. プロンプト入力方法を選択
   - **Manual Input**: 手動でプロンプトを入力
   - **Template**: テンプレートから選択
   - **AI Generate**: AIでプロンプトを生成（要API設定）
2. 変換スタイルを選択（artistic, photorealistic等）
3. 画像生成モデルを選択（Nano Banana等）
4. 生成枚数を設定（デフォルト: 1枚）
5. 「Save Prompt」をクリック

#### 5. 画像の生成
1. 生成ノードに緑色の「✨ Generate」ボタンが表示される
2. ボタンをクリックして生成を実行
3. 処理中はノードのステータスが黄色（processing）になる
4. 完了すると生成画像がノードに追加される

#### 6. 結果の確認
1. ノードをクリックして詳細パネルを表示
2. 画像をクリックして拡大表示
3. ダウンロードボタンで画像を保存
4. 複数画像がある場合は矢印で切り替え

#### 7. ワークフローの保存
1. ヘッダーの「💾 保存」ボタンをクリック
2. JSONファイルとしてダウンロードされる
3. 「📂 読込」ボタンでワークフローを復元可能

### キーボードショートカット

| キー | 機能 |
|------|------|
| `N` | ノード追加 |
| `C` | 接続モード切替 |
| `Delete` / `Backspace` | 選択中のノード/エッジを削除 |
| `Ctrl/Cmd + S` | ワークフロー保存 |
| `Ctrl/Cmd + O` | ワークフロー読込 |
| `Esc` | モーダル/パネルを閉じる |

### Tips

- **ノードタイプの選び方**
  - 最初は必ず入力ノードから開始
  - 生成ノードは変換結果を受け取る専用
  - 生成ノードには手動で画像アップロード不可

- **効率的なワークフロー構築**
  - 入力ノード → 生成ノード の基本パターン
  - 1つの入力ノードから複数の生成ノードに接続可能
  - エッジをクリックして後からプロンプト編集可能

- **画像の管理**
  - 各ノードは複数の画像を保持可能
  - 矢印ボタンで画像を切り替え
  - 詳細パネルで全画像を一覧表示

- **エラーが出た場合**
  - コンソール（F12）でログを確認
  - 生成ノードへのアップロード制限に注意
  - API設定が必要な機能は設定モーダルで確認

## 🌐 公開URL

- **開発環境**: ローカルで`index.html`を開く
- **本番環境**: Publishタブから公開（予定）

## 📄 ライセンス

MIT License

## 👥 コントリビューター

- 久米慧嗣 (Satoshi Kume) - プロジェクトオーナー

## 🔗 関連リンク

- [IO Intelligence API Documentation](https://io.google/intelligence)
- [Vis.js Documentation](https://visjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🤝 コントリビューション

機能追加や改善の提案は大歓迎です！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 🐛 バグ報告

バグを見つけた場合は、以下の情報を含めてIssueを作成してください：
- バグの説明
- 再現手順
- 期待される動作
- スクリーンショット（可能であれば）
- ブラウザとバージョン

---

<<<<<<< Updated upstream:webtool-Prev-Dev/webtool-image-transformation-tracking/README.md
**Last Updated**: 2025-10-30
=======
**Last Updated**: 2025-10-27
>>>>>>> Stashed changes:webtool-image-transformation-tracking/README.md
**Version**: 5.4.0
