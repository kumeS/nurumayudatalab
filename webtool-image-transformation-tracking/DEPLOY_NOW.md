# Cloudflare Workers デプロイ手順（簡易版）

## 現在の状態

- ✅ コードは準備完了（Version 2.0）
- ⚠️ デプロイが必要（現在はVersion 2.1が動いている）

## デプロイコマンド

```bash
# 1. このディレクトリに移動
cd /Users/skume/Desktop/AI_Driven/Dev_nurumayu_proj/nurumayudatalab/webtool-image-transformation-tracking

# 2. デプロイ実行
npx wrangler deploy

# 3. 確認
curl https://replicate-nanobanana.skume-bioinfo.workers.dev/health
```

## 期待される出力

デプロイ後、healthエンドポイントは以下を返すはずです：

```json
{
  "ok": true,
  "service": "replicate-proxy",
  "version": "2.0",
  "updated": "2025-10-26",
  "features": {
    "r2Storage": true,
    "autoPolling": true,
    "imageServing": true
  }
}
```

## トラブルシューティング

### Wranglerがインストールされていない場合

```bash
npm install -g wrangler
```

### ログインが必要な場合

```bash
npx wrangler login
```

### デプロイ後もバージョンが変わらない場合

1. ブラウザのキャッシュをクリア（Cmd+Shift+R / Ctrl+Shift+R）
2. LocalStorageをクリア（DevTools → Application → Local Storage → クリア）
3. ページをリロード

### R2バケットが見つからないエラーが出る場合

```bash
# R2バケットを作成
npx wrangler r2 bucket create nurumayu-nanobanana

# Replicate APIトークンを設定
npx wrangler secret put REPLICATE_API_TOKEN
```

## デプロイ後の確認項目

1. ✅ Health endpoint が version 2.0 を返す
2. ✅ ブラウザのコンソールで `[R2]` ログが表示される
3. ✅ 画像生成後、R2バケットにファイルが保存される
4. ✅ IndexedDBに画像が保存される（DevTools → Application → IndexedDB）
