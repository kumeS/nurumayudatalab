# EC月次集計ツール

Amazon と eBay の月次 CSV レポートを読み込んで、売上や手数料を計算・可視化する Web ツールです。

## 機能

### 📊 データ分析
- **Amazon・eBay対応**: 両プラットフォームの CSV レポートに対応
- **自動計算**: 売上、手数料、純利益を自動計算
- **月次集計**: データを月別に集計して表示

### 📈 可視化
- **売上推移グラフ**: 月次売上の推移を線グラフで表示
- **利益分析チャート**: 売上・手数料・利益を棒グラフで比較
- **サマリーカード**: 総売上、総手数料、純利益、販売点数を一覧表示

### 💾 データ出力
- **CSV出力**: 分析結果を CSV ファイルでダウンロード
- **JSON出力**: 生データを JSON 形式でダウンロード

## 使用方法

1. **プラットフォーム選択**: Amazon または eBay を選択
2. **ファイルアップロード**: CSV ファイルをドラッグ&ドロップまたはクリックで選択
3. **結果確認**: 自動で分析され、グラフと表で結果を表示
4. **データ出力**: 必要に応じて CSV または JSON で結果をダウンロード

## 対応CSVフォーマット

### Amazon
- `date/time` または `Date` または `注文日`: 注文日
- `total` または `Total` または `売上金額`: 売上金額
- `fees` または `Fees` または `手数料`: 手数料
- `quantity` または `Quantity` または `数量`: 数量
- `sku` または `SKU` または `商品名`: 商品名

### eBay
- `Sale Date` または `販売日` または `Date`: 販売日
- `Total Price` または `売上金額` または `Sales`: 売上金額
- `eBay Fee` または `Final Value Fee` または `手数料`: 手数料
- `Quantity` または `数量`: 数量
- `Title` または `Item Title` または `商品名`: 商品名

## 技術仕様

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **チャート**: Chart.js
- **ファイル処理**: FileReader API
- **レスポンシブ対応**: モバイル・タブレット・デスクトップ対応

## ファイル構成

```
web-tools-ec-calc/
├── index.html    # メインHTML
├── app.js        # アプリケーションロジック
└── README.md     # このファイル
```

## 特徴

- **静的解析**: サーバー不要でブラウザ上で完結
- **プライバシー**: データはブラウザ内でのみ処理、外部送信なし
- **多言語対応**: 日本語・英語のCSVヘッダーに対応
- **エラーハンドリング**: 不正なデータや形式に対する適切な処理

## ブラウザサポート

- Chrome (推奨)
- Firefox
- Safari
- Edge

## 注意事項

- ファイルサイズが大きい場合、処理に時間がかかる場合があります
- データテーブルは最初の100件のみ表示されますが、エクスポート時は全データが出力されます
- 日付形式は標準的な形式に加えて、日本語形式（例：2024年1月15日）にも対応しています