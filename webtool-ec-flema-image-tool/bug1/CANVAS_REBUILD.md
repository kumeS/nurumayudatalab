# Canvas System Rebuild - Complete

## 問題

キャンバスが大きすぎて、コンテナからはみ出していました。

スクリーンショット：キャンバスがコンテナより大きく、スクロールバーが表示されている状態。

## 根本原因

1. **複雑すぎるコード構造**
   - `canvas.state.js` (756行)
   - `canvas.interaction.js` (584行)  
   - `canvas.init.js` (769行)
   - **合計 2,109行**の複雑なコード

2. **多重のズーム計算**
   - 複数箇所でズーム計算が競合
   - `viewportTransform`、`CSS transform`、`zoom`が混在

3. **不正確なサイズ計算**
   - パディング、マージン、ズームの計算が不正確
   - コンテナサイズの取得タイミングが不適切

## 解決策

**全て削除して、シンプルで正確なコードを再作成しました。**

### 新しいファイル構成

#### 1. `js/canvas.simple.js` (約290行)
キャンバスのコア機能：

```javascript
// シンプルで正確な初期化
function initializeFabricCanvas() {
    canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#ffffff'
    });
    
    setupCanvasEvents();
    fitCanvasToContainer();
}

// 正確なサイズ計算
function fitCanvasToContainer() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const padding = 40;
    
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;
    
    // シンプルなズーム計算
    const scaleX = availableWidth / canvas.width;
    const scaleY = availableHeight / canvas.height;
    const zoom = Math.min(scaleX, scaleY, 1);
    
    canvas.setZoom(zoom);
    
    // 中央配置（CSS transform使用）
    wrapper.style.transform = 'translate(-50%, -50%)';
}
```

**機能：**
- キャンバス初期化
- イベントリスナー設定
- オブジェクト選択処理
- ズーム操作
- レイヤー操作
- サイズ変更

#### 2. `js/canvas.controls.js` (約150行)
ズームコントロールとUndo/Redo：

```javascript
// ズームコントロール
function setupZoomControls() {
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    
    // ホイールズーム（Ctrl + Wheel）
    container.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const newZoom = currentZoom * (delta > 0 ? 0.95 : 1.05);
            canvas.setZoom(newZoom);
        }
    });
}

// Undo/Redo
let canvasHistory = [];
let redoHistory = [];

function captureCanvasState() {
    const state = JSON.stringify({
        json: canvas.toJSON(),
        width: canvas.width,
        height: canvas.height,
        zoom: canvas.getZoom()
    });
    canvasHistory.push(state);
}
```

**機能：**
- ズームイン/アウト
- ズームリセット
- 画面に合わせる
- Undo/Redo
- ホイールズーム

### 削減されたコード量

| ファイル | 旧 | 新 | 削減 |
|---------|-----|-----|-----|
| canvas.state.js | 756行 | - | -756 |
| canvas.interaction.js | 584行 | - | -584 |
| canvas.init.js | 769行 | - | -769 |
| **合計（旧）** | **2,109行** | - | - |
| canvas.simple.js | - | 290行 | - |
| canvas.controls.js | - | 150行 | - |
| **合計（新）** | - | **440行** | **-1,669行 (79%削減)** |

## 主な改善点

### 1. シンプルで正確な計算
```javascript
// 旧: 複雑で不正確
const trueAvailableHeight = calculateAvailableViewportHeight();
const computedStyle = window.getComputedStyle(container);
const paddingX = parseFloat(computedStyle.paddingLeft || '0') + ...
// ... 50行以上の複雑な計算

// 新: シンプルで正確
const padding = 40;
const availableWidth = containerWidth - padding;
const zoom = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight, 1);
```

### 2. CSS transformで中央配置
```javascript
// 旧: viewportTransformを使用（複雑）
canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);

// 新: CSS transformを使用（シンプル）
wrapper.style.left = '50%';
wrapper.style.top = '50%';
wrapper.style.transform = 'translate(-50%, -50%)';
```

### 3. 明確な責務分離
- **canvas.simple.js**: コア機能のみ
- **canvas.controls.js**: UI操作のみ

## テスト確認項目

✅ キャンバスがコンテナに正しく収まる  
✅ ズーム表示が正確  
✅ ズームイン/アウトが動作  
✅ 画面に合わせるが動作  
✅ Undo/Redoが動作  
✅ オブジェクト選択が動作  
✅ レイヤー操作が動作  
✅ 画像追加が動作  
✅ テキスト追加が動作  
✅ エクスポートが動作

## 使用方法

ブラウザでindex.htmlを開くだけです。

開発者コンソールに以下のログが表示されます：
```
=== Canvas Initialization ===
Canvas created: 1080 x 1080
Container size: 1200 x 800
Canvas logical size: 1080 x 1080
Calculated zoom: 0.7 (70%)
Zoom display updated: 70%
Canvas initialization complete
```

## バックアップ

旧ファイルは `.backup` 拡張子で保存されています：
- `js/canvas.state.js.backup`
- `js/canvas.interaction.js.backup`
- `js/canvas.init.js.backup`

必要に応じて復元できます。

## まとめ

- ✅ **2,109行 → 440行（79%削減）**
- ✅ **キャンバスサイズ問題を完全解決**
- ✅ **コードが読みやすく、保守しやすい**
- ✅ **全機能が正常動作**

シンプルなコードは、バグも少なく、拡張も容易です。
