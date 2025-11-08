# Canvas Centering Fix - 完全修正

## 問題

キャンバスが左にずれて、画面からはみ出していた。

## 根本原因

**CSS transformとFabric.jsのviewportTransformが競合していた**

### 競合の詳細

#### 問題のあったコード
```javascript
// CSS transformで中央配置を試みる
wrapper.style.left = '50%';
wrapper.style.top = '50%';
wrapper.style.transform = 'translate(-50%, -50%)';

// しかし、Fabric.jsもviewportTransformを使用
canvas.setZoom(zoom);
```

この場合：
1. CSS transformが wrapper要素を移動
2. Fabric.jsがviewportTransformでキャンバスを変換
3. **2つの変換が競合** → ずれが発生

## 解決策

**Fabric.jsのviewportTransformのみを使用**

### 正しいコード

```javascript
function fitCanvasToContainer() {
    // コンテナとキャンバスのサイズを取得
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // ズーム計算
    const zoom = Math.min(
        (containerWidth - padding) / canvasWidth,
        (containerHeight - padding) / canvasHeight,
        1
    );
    
    // 拡大後のサイズ
    const scaledWidth = canvasWidth * zoom;
    const scaledHeight = canvasHeight * zoom;
    
    // 中央配置のためのオフセット計算
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;
    
    // ✅ viewportTransformで一括設定
    canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);
    
    // ✅ CSS transformをクリア（競合を防ぐ）
    wrapper.style.position = '';
    wrapper.style.left = '';
    wrapper.style.top = '';
    wrapper.style.transform = '';
}
```

### viewportTransformの説明

Fabric.jsの`viewportTransform`は6つの値を持つ配列：
```javascript
[scaleX, skewY, skewX, scaleY, translateX, translateY]
```

通常の使用（スキューなし）：
```javascript
[zoom, 0, 0, zoom, offsetX, offsetY]
```

- `zoom` - 拡大率
- `0, 0` - スキュー（傾き）なし
- `offsetX, offsetY` - 平行移動（中央配置用）

## 修正内容

### 1. fitCanvasToContainer()
```javascript
// 変更前：
canvas.setZoom(zoom);
wrapper.style.transform = 'translate(-50%, -50%)';

// 変更後：
canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);
wrapper.style.transform = ''; // クリア
```

### 2. resetZoom()
```javascript
// 変更前：
canvas.setZoom(1);
canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
wrapper.style.transform = 'translate(-50%, -50%)';

// 変更後：
const offsetX = (containerWidth - canvasWidth) / 2;
const offsetY = (containerHeight - canvasHeight) / 2;
canvas.setViewportTransform([1, 0, 0, 1, offsetX, offsetY]);
wrapper.style.transform = ''; // クリア
```

## オフセット計算の詳細

### 中央配置の計算式

```javascript
// 拡大後のキャンバスサイズ
const scaledWidth = canvasWidth * zoom;
const scaledHeight = canvasHeight * zoom;

// 余白を計算
const extraSpaceX = containerWidth - scaledWidth;
const extraSpaceY = containerHeight - scaledHeight;

// 中央に配置するため、余白を半分ずつ
const offsetX = extraSpaceX / 2;
const offsetY = extraSpaceY / 2;
```

### 例：具体的な数値

コンテナ: 1200px × 800px
キャンバス: 1080px × 1080px
ズーム: 0.7 (70%)

```
拡大後のサイズ:
- scaledWidth  = 1080 × 0.7 = 756px
- scaledHeight = 1080 × 0.7 = 756px

中央配置オフセット:
- offsetX = (1200 - 756) / 2 = 222px
- offsetY = (800 - 756) / 2 = 22px

viewportTransform:
[0.7, 0, 0, 0.7, 222, 22]
```

## パン機能との統合

パン機能は`viewportTransform`の`translateX`と`translateY`を変更：

```javascript
canvas.on('mouse:move', function(opt) {
    if (isPanning) {
        const vpt = canvas.viewportTransform;
        vpt[4] += deltaX; // translateXを更新
        vpt[5] += deltaY; // translateYを更新
        canvas.requestRenderAll();
    }
});
```

これにより：
- 初期表示：中央配置
- パン中：自由に移動
- リセット：再度中央配置

すべてが`viewportTransform`で統一され、競合なし！

## テスト確認

### 1. 初期表示
```
✓ キャンバスが画面中央に表示される
✓ 左右のパディングが均等
✓ 上下のパディングが均等
```

### 2. ズーム操作
```
✓ [+] で拡大しても中心がずれない
✓ [-] で縮小しても中心がずれない
✓ [↔] でリセットすると中央に戻る
```

### 3. パン操作
```
✓ Space + ドラッグで移動できる
✓ [⇔] で画面に合わせると中央に戻る
```

### 4. コンソールログ確認
```javascript
Container size: 1200 x 800
Canvas logical size: 1080 x 1080
Calculated zoom: 0.7 (70%)
Centering offsets: {
    offsetX: "222.00",
    offsetY: "22.00",
    scaledSize: "756.00x756.00"
}
fitCanvasToContainer complete
```

## 修正ファイル

- ✅ `js/canvas.simple.js`
  - `fitCanvasToContainer()` - viewportTransform使用
  - `resetZoom()` - オフセット計算追加

## まとめ

### 問題の原因
❌ CSS transformとFabric.js viewportTransformの競合

### 解決方法
✅ Fabric.jsのviewportTransformのみを使用
✅ CSS transformをクリア
✅ 正確なオフセット計算

### 結果
✅ キャンバスが完全に中央配置
✅ ズーム・パンが正常動作
✅ 画面からはみ出さない

**キャンバスが正確に中央に配置されるようになりました！** 🎯
