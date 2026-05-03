# Nurumayu UI Design Template

バージョン: 1.0
最終更新: 2025.11.30

---

## 📋 概要

**Nurumayu UI Design Template**は、Amazon販売集計ダッシュボードで使用されているUIデザインを抽出・体系化した再利用可能なCSSテンプレートです。温かみのあるオレンジ系グラデーションをメインカラーとし、モダンで洗練されたUIコンポーネントを提供します。

---

## 🎨 デザインコンセプト

### カラーパレット

| 色名 | HEX | 用途 |
|------|-----|------|
| Primary | `#ff9966` | メインブランドカラー |
| Secondary | `#ff5e62` | アクセント・グラデーション終点 |
| Accent | `#00C9FF` | 補助アクセントカラー |
| Success | `#00b894` | 成功・プラス表示 |
| Danger | `#d63031` | エラー・マイナス表示 |
| Text Primary | `#2d3436` | メインテキスト |
| Text Secondary | `#636e72` | サブテキスト |

### デザインの特徴

1. **グラデーション効果**
   - 温かみのあるオレンジ系グラデーション（135deg）
   - SVGアイコンへのグラデーション適用
   - テキストやボタンへの積極的な活用

2. **モダンなUI要素**
   - 柔らかいシャドウ（多層シャドウ）
   - 丸みのある角（border-radius: 8px〜20px）
   - backdrop-filterによるぼかし効果
   - スムーズなトランジションアニメーション

3. **インタラクティブ**
   - ホバー時の浮き上がり効果（transform: translateY）
   - アクティブ状態の視覚的フィードバック
   - ドラッグ&ドロップ対応のビジュアル変化

---

## 📁 ファイル構成

```
.
├── nurumayu_template.css           # メインテンプレートCSS
├── nurumayu_template_example.html  # 使用例デモページ
└── nurumayu_template_README.md     # このドキュメント
```

---

## 🚀 クイックスタート

### 1. テンプレートのインポート

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Project</title>
    <link rel="stylesheet" href="nurumayu_template.css">
</head>
<body>
    <!-- コンテンツ -->
</body>
</html>
```

### 2. 基本的なコンポーネントの使用

#### ボタン

```html
<button class="btn-primary">プライマリーボタン</button>
<button class="btn-secondary">セカンダリーボタン</button>
<button class="btn-success">成功ボタン</button>
```

#### カード

```html
<div class="card">
    <div class="card-label">ラベル</div>
    <div class="card-value">¥10,000</div>
    <div class="card-change positive">↑ 5%</div>
</div>
```

#### グラデーションテキスト

```html
<h1 class="nuruma-gradient">タイトル</h1>
```

---

## 🧩 コンポーネント一覧

### 1. ボタン

| クラス名 | 説明 | 用途 |
|---------|------|------|
| `.btn-primary` | プライマリーボタン | メインアクション |
| `.btn-secondary` | セカンダリーボタン | サブアクション |
| `.btn-success` | 成功ボタン | 確定・保存など |

### 2. カード

| クラス名 | 説明 |
|---------|------|
| `.card` | 基本カードコンテナ |
| `.card-label` | カードラベル（小文字・大文字変換） |
| `.card-value` | カード値（大きい数値） |
| `.card-change` | 変動表示 |
| `.card-change.positive` | プラス変動（緑） |
| `.card-change.negative` | マイナス変動（赤） |

### 3. ヘッダー

```html
<div class="header">
    <h1>
        <svg class="header-icon">...</svg>
        <span class="nuruma-gradient">タイトル</span>
    </h1>
</div>
```

### 4. アップロードゾーン

```html
<div class="upload-zone">
    <div class="upload-icon">📁</div>
    <div>ファイルをドラッグ&ドロップ</div>
</div>
```

### 5. タブ

```html
<div class="table-tabs">
    <button class="tab-button active">タブ1</button>
    <button class="tab-button">タブ2</button>
</div>
```

### 6. テーブル

```html
<table>
    <thead>
        <tr>
            <th>列1</th>
            <th>列2</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>データ1</td>
            <td class="profit-positive">+¥1,000</td>
        </tr>
    </tbody>
</table>
```

### 7. モーダル

```html
<div class="modal active">
    <div class="modal-content">
        <div class="modal-header">
            <h2>タイトル</h2>
            <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">内容</div>
        <div class="modal-footer">
            <button class="btn-secondary">キャンセル</button>
            <button class="btn-primary">確定</button>
        </div>
    </div>
</div>
```

### 8. バッジ

```html
<span class="badge badge-primary">新着</span>
<span class="badge badge-success">完了</span>
<span class="badge badge-danger">エラー</span>
```

### 9. ローディングスピナー

```html
<div class="loading active">
    <div class="spinner"></div>
    <div>読み込み中...</div>
</div>
```

---

## 🎭 アニメーション

### 使用可能なアニメーション

| クラス名 | 効果 | 使用場面 |
|---------|------|---------|
| `.animate-slideDown` | 上から下へスライド | ヘッダー、モーダル |
| `.animate-fadeIn` | フェードイン | コンテンツ表示 |
| `.animate-slideIn` | 左から右へスライド | リスト項目 |
| `.animate-bounce` | バウンス | アイコン、注目要素 |

### カスタムアニメーション

```css
@keyframes yourAnimation {
    from { opacity: 0; }
    to { opacity: 1; }
}

.your-element {
    animation: yourAnimation 0.5s ease;
}
```

---

## 🛠 カスタマイズ方法

### 1. カラースキームの変更

```css
:root {
    --primary: #4facfe;    /* 青系に変更 */
    --secondary: #00f2fe;
}
```

### 2. グラデーション角度の調整

```css
/* デフォルト: 135deg（左上→右下） */
background: linear-gradient(135deg, var(--primary), var(--secondary));

/* 変更例 */
background: linear-gradient(90deg, var(--primary), var(--secondary));  /* 左→右 */
background: linear-gradient(180deg, var(--primary), var(--secondary)); /* 上→下 */
```

### 3. 角の丸みの調整

```css
:root {
    --radius-lg: 16px;  /* デフォルト: 20px */
    --radius-md: 10px;  /* デフォルト: 12px */
    --radius-sm: 6px;   /* デフォルト: 8px */
}
```

### 4. アニメーション速度の変更

```css
:root {
    --transition-speed: 0.2s;  /* デフォルト: 0.3s */
}
```

---

## 📐 SVGアイコンへのグラデーション適用

### 基本パターン

```html
<svg width="40" height="40" viewBox="0 0 40 40">
    <defs>
        <linearGradient id="your_gradient_id"
                        x1="0%" y1="0%"
                        x2="100%" y2="100%"
                        gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ff9966"/>
            <stop offset="100%" stop-color="#ff5e62"/>
        </linearGradient>
    </defs>
    <path d="..." fill="url(#your_gradient_id)"/>
</svg>
```

### グラデーション方向

- `x1="0%" y1="0%" x2="100%" y2="100%"` → 左上から右下
- `x1="0%" y1="0%" x2="100%" y2="0%"` → 左から右
- `x1="0%" y1="0%" x2="0%" y2="100%"` → 上から下

---

## 📱 レスポンシブデザイン

### ブレークポイント

```css
@media (max-width: 768px) {
    /* モバイル向けスタイル */
}
```

### 推奨レスポンシブ設定

- **デスクトップ**: 1400px以上
- **タブレット**: 768px〜1399px
- **モバイル**: 768px未満

### グリッドレイアウト

```css
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 25px;
}
```

---

## ⚡ パフォーマンス最適化

### 推奨事項

1. **CSSの最小化**
   本番環境ではCSSを最小化してください

2. **未使用スタイルの削除**
   実際に使用するコンポーネントのみを抽出

3. **アニメーションの制限**
   will-changeプロパティを使用してパフォーマンスを向上

```css
.animated-element {
    will-change: transform;
}
```

---

## 🎓 ベストプラクティス

### 1. セマンティックなHTML

```html
<!-- 良い例 -->
<header class="header">
    <h1>タイトル</h1>
</header>

<!-- 悪い例 -->
<div class="header">
    <div>タイトル</div>
</div>
```

### 2. クラスの命名

- BEM記法を推奨: `.block__element--modifier`
- 意味のある名前を使用
- 汎用的な名前は避ける

### 3. アクセシビリティ

```html
<!-- aria属性の使用 -->
<button class="btn-primary" aria-label="送信">
    送信
</button>

<!-- キーボードナビゲーション対応 -->
<div class="modal" role="dialog" aria-labelledby="modal-title">
    <h2 id="modal-title">モーダルタイトル</h2>
</div>
```

---

## 🔧 トラブルシューティング

### グラデーションが表示されない

**原因**: backdrop-filterが未対応のブラウザ
**解決策**: フォールバックスタイルを追加

```css
.header {
    background: white; /* フォールバック */
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
}
```

### アニメーションが動作しない

**原因**: transition/animationプロパティの重複
**解決策**: プロパティの優先順位を確認

```css
/* 正しい順序 */
.element {
    transition: all 0.3s ease;
    animation: fadeIn 0.5s ease;
}
```

### モバイルでレイアウトが崩れる

**原因**: 固定幅の使用
**解決策**: レスポンシブ単位を使用

```css
/* 悪い例 */
.container {
    width: 1400px;
}

/* 良い例 */
.container {
    max-width: 1400px;
    width: 100%;
}
```

---

## 📚 参考リソース

### CSS関連

- [MDN Web Docs - CSS](https://developer.mozilla.org/ja/docs/Web/CSS)
- [Can I Use](https://caniuse.com/) - ブラウザ互換性チェック

### デザインインスピレーション

- [Dribbble](https://dribbble.com/)
- [Behance](https://www.behance.net/)

### カラーパレットツール

- [Coolors](https://coolors.co/)
- [Adobe Color](https://color.adobe.com/)

---

## 📝 変更履歴

### v1.0 (2025.11.30)
- 初回リリース
- 基本コンポーネント20種を実装
- レスポンシブデザイン対応
- アニメーション5種を追加

---

## 📄 ライセンス

このテンプレートは自由に使用・改変できます。
商用・非商用問わず利用可能です。

---

## 🙋 サポート

質問や問題がある場合は、プロジェクトの担当者までお問い合わせください。

---

## 🎯 今後の予定

- [ ] ダークモード対応
- [ ] より多くのコンポーネント追加
- [ ] JavaScriptインタラクション例の追加
- [ ] Sass/SCSS版の提供
- [ ] Tailwind CSS統合版の検討

---

**Happy Coding! 🚀**
