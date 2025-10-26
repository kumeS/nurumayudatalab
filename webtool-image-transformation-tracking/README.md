# Image Transformation Tracker - 画像変換追跡システム

最終更新: 2025-01-26 (v5.2)

**ビジュアルワークフローエディタ**: ノードベースの画像処理パイプライン構築ツール

## 📚 最新アップデート (2025-01-26 v5.2)

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

## 📚 Previous Updates (2025-01-25 v5.1)

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

## 📚 Previous Updates (2025-01-25 v5)

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

## 📚 Previous Updates (2025-01-25 v4)

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

## 📚 Previous Updates (2025-01-22 v3)

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

## 📚 Recent Bug Fixes & Improvements (2025-01-22 v2)

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

## 📚 Recent Bug Fixes (2025-01-22 v1)

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

### 🎯 短期実装可能な機能（優先度: 高 🔴）

以下は、現在の実装を活かして1-3時間程度で追加できる実用的な機能です。

#### 1. 画像の複数選択削除機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: ノード内の不要な画像を一括削除してメモリを節約

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
  indices.sort((a, b) => b - a); // 後ろから削除
  indices.forEach(i => {
    const node = workflowEngine.nodes.get(nodeId);
    node.images.splice(i, 1);
  });
  workflowEngine.saveWorkflow();
}
```

---

#### 2. エッジのプロンプトテンプレート機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1-2時間
**目的**: よく使うプロンプトをテンプレートとして保存・再利用

**実装内容**:
- プロンプト編集モーダルに「テンプレートとして保存」ボタン
- LocalStorageに`prompt_templates`配列として保存
- プロンプト入力時にテンプレートをドロップダウンで表示
- テンプレート選択で自動入力
- テンプレート管理（削除、編集）機能

**実装方法**:
```javascript
// テンプレート保存
saveTemplate(prompt) {
  const templates = JSON.parse(localStorage.getItem('prompt_templates') || '[]');
  templates.push({ name: prompt.substring(0, 30), text: prompt, created: Date.now() });
  localStorage.setItem('prompt_templates', JSON.stringify(templates));
}

// テンプレート読み込み
loadTemplates() {
  return JSON.parse(localStorage.getItem('prompt_templates') || '[]');
}
```

---

#### 3. ノードのメモ機能
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: ノードに説明やメモを追加して作業を整理

**実装内容**:
- ノード詳細パネルに「メモ」テキストエリアを追加
- メモはノードオブジェクトの`metadata.note`に保存
- メモがあるノードには📝アイコンを表示
- 実装箇所: `js/canvasController.js`、`js/workflowEngine.js`

**実装方法**:
```javascript
// ノードにメモを追加
workflowEngine.updateNode(nodeId, {
  metadata: { ...node.metadata, note: noteText }
});

// レンダリング時にアイコン表示
if (node.metadata?.note) {
  ctx.fillText('📝', x + width/2 - 20, y - height/2 + 15);
}
```

---

#### 4. ワークフロー履歴機能（Undo/Redo）
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

#### 5. 画像のドラッグ&ドロップ並び替え
**実装難易度**: ⭐⭐ 中程度
**実装時間**: 2時間
**目的**: ノード内の画像順序を自由に変更

**実装内容**:
- ノード詳細パネルの画像グリッドにドラッグ&ドロップ機能を追加
- HTML5 Drag and Drop APIを使用
- 並び替え後に自動保存
- 実装箇所: `js/canvasController.js`の`renderNodeDetails()`

**実装方法**:
```javascript
// 画像要素にdraggable属性を追加
<img draggable="true" ondragstart="handleDragStart(event, ${index})" ...>

function handleDragStart(e, index) {
  e.dataTransfer.setData('imageIndex', index);
}

function handleDrop(e, targetIndex) {
  const sourceIndex = parseInt(e.dataTransfer.getData('imageIndex'));
  const node = workflowEngine.nodes.get(nodeId);
  const [removed] = node.images.splice(sourceIndex, 1);
  node.images.splice(targetIndex, 0, removed);
  workflowEngine.saveWorkflow();
}
```

---

#### 6. エッジの色カスタマイズ
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: エッジに色をつけて視覚的に整理

**実装内容**:
- エッジ詳細パネルに色選択パレットを追加
- 5-8色のプリセットカラーを用意
- エッジの`color`プロパティに保存
- カラーコードを`canvasController.js`の`addEdge()`で反映
- 実装箇所: `index.html`、`js/canvasController.js`

---

#### 7. ノードのズーム機能
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

#### 8. ワークフローのエクスポート改善
**実装難易度**: ⭐ 簡単
**実装時間**: 1時間
**目的**: ワークフローを見やすいPNG画像として保存

**実装内容**:
- ヘッダーに「📸 スクリーンショット」ボタンを追加
- キャンバス全体をPNG画像として保存
- ファイル名に日時を含める
- 実装箇所: `js/workflowApp.js`

**実装方法**:
```javascript
async exportAsScreenshot() {
  const canvas = this.container.querySelector('canvas');
  const link = document.createElement('a');
  link.download = `workflow-${new Date().toISOString().slice(0,10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

---

### 📋 中期実装機能（優先度: 中 🟡）

#### 9. 生成ノードタイプの追加
**実装難易度**: ⭐⭐ 中程度
**実装時間**: 2-3時間
**目的**: ノード作成時に生成ノードも選択できるようにする

**実装内容**:
- ノード追加ボタンをクリック時にモーダルを表示
- 入力ノード/生成ノードを選択
- 生成ノードは紫色で作成
- 実装箇所: `index.html`、`js/workflowApp.js`

---

#### 10. 画像生成の完全実装
**実装難易度**: ⭐⭐⭐ 複雑
**実装時間**: 4-6時間
**目的**: Generateボタンの完全動作化

**実装内容**:
- Cloudflare Workers CORSプロキシ経由でReplicate APIを呼び出し
- プログレスバー表示（ポーリング状態を可視化）
- 生成画像を自動的に生成ノードに追加
- R2から画像を取得して表示
- 実装箇所: `js/transformationService.js`を完全実装

---

### 🔮 将来検討機能（参考）

以下は興味深いですが、優先度が低いため将来的な検討課題とします：

- **プロンプト効果の評価システム**: 生成結果に★評価をつけて良いプロンプトを記録
- **ノードグループ化**: 複数ノードをまとめてフォルダのように整理
- **画像比較ビュー**: 2つの画像を並べて比較表示
- **ワークフロー実行の自動化**: ボタン一つで全ノードの画像生成を実行
- **画像のフィルタ適用**: 明るさ、コントラスト等の基本的な画像編集

### 実装しない機能 ❌

以下は複雑すぎるか、現在の目的に合わないため実装しません：

- **Production環境への大規模デプロイ**: 個人/小規模チーム用途に限定
- **ユーザー認証システム**: LocalStorageベースで十分
- **データベース連携**: JSONファイルベースが適切
- **リアルタイムコラボレーション**: 実装コストが高すぎる
- **モバイルアプリ化**: Webアプリケーションに集中

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

**Last Updated**: 2025-01-25
**Version**: 2.6.0
