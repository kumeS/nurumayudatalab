# Canvas Display Fix - Quick Debug

## 問題
キャンバスが何も表示されない

## 実施した修正

### 1. 詳細なデバッグログ追加
`initializeFabricCanvas()`に詳細なログを追加：
- Step 1: Canvas要素の検出
- Step 2: Fabric.jsキャンバスの作成
- Step 3: イベント設定
- Step 4: コンテナの表示
- Step 5: サイズ調整
- Step 6: リサイズリスナー

### 2. コンテナ表示の確実化
```javascript
container.classList.add('initialized');
```
これにより、CSSの`opacity: 0`から`opacity: 1`に変更

### 3. サイズ0のチェック追加
```javascript
if (containerWidth === 0 || containerHeight === 0) {
    console.warn('Container has no size, retrying...');
    setTimeout(() => fitCanvasToContainer(), 100);
    return;
}
```

### 4. テストHTML作成
`canvas-test.html` - 最小構成でのテスト

## デバッグ手順

### 1. テストHTMLで確認
```bash
# canvas-test.htmlをブラウザで開く
open canvas-test.html
```

期待される動作：
- 白いキャンバスが表示される
- 緑の矩形が見える
- 赤いテキスト "Test Text" が見える
- 下部にデバッグログが表示される

### 2. index.htmlで確認
```bash
# index.htmlをブラウザで開く
open index.html
```

開発者コンソール（F12）で確認：

#### 正常な場合のログ
```
=== Canvas Initialization ===
Step 1: Looking for canvas element...
Canvas element found: true
Canvas element attributes: {id: "mainCanvas", width: 1080, height: 1080, ...}
Step 2: Creating Fabric.js canvas...
✓ Canvas created successfully
Canvas properties: {width: 1080, height: 1080, zoom: 1, ...}
Step 3: Setting up events...
Step 4: Making container visible...
✓ Container initialized
Container dimensions: {clientWidth: 1200, clientHeight: 800, ...}
Step 5: Fitting canvas to container...
Step 6: Setting up resize listener...
=== Canvas initialization complete ===
Container size: 1200 x 800
Canvas logical size: 1080 x 1080
Calculated zoom: 0.7 (70%)
fitCanvasToContainer complete
```

#### エラーの場合
エラーメッセージが表示されます。コンソールをコピーして共有してください。

### 3. DOM検査
Elements タブで確認：

1. `<canvas id="mainCanvas">` を探す
2. 親要素を確認：
   - `.canvas-slot`
   - `#canvasStack`
   - `#canvasContainer`
3. Fabric.jsが追加する要素を確認：
   - `.canvas-container` (wrapper)
   - `.lower-canvas`
   - `.upper-canvas`

### 4. CSS確認
`#canvasContainer`のスタイルを確認：
- `opacity: 1` であること
- `display: block` であること
- `width`, `height` が0でないこと

## よくある問題と解決策

### 問題1: "Canvas element not found"
**原因:** HTMLの構造が正しくない
**解決:** index.htmlで`<canvas id="mainCanvas">`が存在することを確認

### 問題2: "Container has no size"
**原因:** CSSが適用されていない、または親要素が非表示
**解決:** 
- css/style.cssが読み込まれているか確認
- `#canvasContainer`のサイズを確認

### 問題3: キャンバスは作成されるが表示されない
**原因:** opacity: 0のまま、またはz-index問題
**解決:**
- `.initialized`クラスが追加されているか確認
- z-indexの競合を確認

### 問題4: Fabric.jsのエラー
**原因:** Fabric.jsが読み込まれていない
**解決:**
```html
<script src="https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js"></script>
```
が存在することを確認

## 修正ファイル
- ✅ js/canvas.simple.js - 詳細ログ追加
- ✅ canvas-test.html - テスト用HTML作成

## 次のステップ

1. **canvas-test.html**を開いて動作確認
2. **index.html**を開いて開発者コンソールを確認
3. コンソールのログをコピーして共有

これにより、問題の原因を特定できます！
