# LLMと天気予報ウェブツール

## 概要

このプロジェクトは、気象庁の天気予報APIを活用したウェブベースの天気予報表示ツールです。ページにアクセス時や更新時に自動的に最新の天気情報を取得して表示します。

## 主な機能

### 🗾 全国版
- 全国地図上に主要都道府県の天気情報を表示
- 地図上の地点をクリックするとポップアップで詳細な天気情報を表示
- `basic.json`を使用して全国の気象庁APIエンドポイントにアクセス
- 並列データ取得により高速表示

### 🏞️ 関西版
- 関西地方に特化した地図と天気情報表示
- 関西の主要地域の天気情報を詳細表示
- `area.json`と`kansai.json`を使用してデータを取得

### 🤖 LLM機能
- 取得した天気情報をLLMで処理・要約
- 音声読み上げ機能による天気予報の朗読
- ワンクリックで天気予報要約を生成

## 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **API**: 気象庁天気予報API
- **データ形式**: JSON
- **レスポンシブデザイン**: 対応

## ファイル構成

```
webtool-whether/
├── README.md                    # このファイル
├── 実装.txt                     # 実装仕様書
├── index.html                   # メインHTMLファイル
├── app.js                       # メインJavaScriptファイル
├── basic.json                   # 全国版APIエンドポイント定義
├── area.json                    # 気象庁地理情報・アクセス番号
├── kansai.json                  # 関西版データ（※要作成）
├── forecast.json                # 東京都データ例（参考用）
├── overview_forecast.json       # 東京都概要データ例（参考用）
└── 天気.txt                     # 地域アクセス番号簡易版
```

## データソース

### 気象庁API
- **概要予報**: `https://www.jma.go.jp/bosai/forecast/data/overview_forecast/{地域コード}.json`
- **詳細予報**: `https://www.jma.go.jp/bosai/forecast/data/forecast/{地域コード}.json`

### データ例
```json
{
  "name": "東京都",
  "overview_url": "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/130000.json",
  "forecast_url": "https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json"
}
```


### 3. 機能の使用
1. **全国版タブ**: 全国の天気情報を地図上で確認
2. **関西版タブ**: 関西地方の詳細天気情報を確認
3. **天気予報要約**: 全国版タブと関西版タブの下部にLLM機能で天気情報を要約・音声読み上げ

## パフォーマンス最適化

### 並列データ取得
```javascript
// 複数APIを並列実行
const promises = urls.map(url => fetch(url));
const results = await Promise.all(promises);
```

### 段階的表示
- データ取得完了分から順次UI更新
- ローディング状態の表示
- 重要地域優先表示オプション

## 実装予定機能

- [ ] 関西版地図の実装
- [ ] LLM音声読み上げ機能
- [ ] パフォーマンス最適化（主要5-6都市表示オプション）
- [ ] レスポンシブデザインの改善
- [ ] エラーハンドリングの強化

## 開発ガイドライン

### コーディング規約
- ES6+の使用
- 非同期処理は`async/await`を使用
- モジュール化されたコード構成
- コメントによる適切な文書化

### API制限への対応
- 同時リクエスト数の制限
- エラー時のフォールバック処理
- レスポンス時間の監視

## トラブルシューティング

### よくある問題

1. **APIアクセスエラー**
   - CORS設定の確認
   - ネットワーク接続の確認

2. **表示が遅い場合**
   - 主要都市表示モードに切り替え
   - ブラウザキャッシュのクリア

3. **音声読み上げが動作しない**
   - ブラウザの音声機能サポート確認
   - マイク・スピーカー権限の確認

## 参考リンク

- [気象庁API仕様](https://www.jma.go.jp/bosai/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [LLM API Documentation](https://platform.openai.com/docs)

---

**注意**: このツールは気象庁のAPIを使用しており、正確な気象情報の提供に努めていますが、重要な判断には公式の気象情報をご参照ください。 