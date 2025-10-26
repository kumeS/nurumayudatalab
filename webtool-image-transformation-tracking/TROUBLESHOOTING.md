# トラブルシューティング：Endpoint not found エラー

## エラー内容

```json
{"error":"Not Found","message":"Endpoint not found. Use POST / or POST /poll"}
```

## 原因と解決方法

### 1. ブラウザのキャッシュ問題（最も可能性が高い）

**症状**: LocalStorageに保存された古いAPI設定が使われている

**解決方法**:

```javascript
// ブラウザのコンソール（F12）で以下を実行
localStorage.clear();
location.reload();
```

または、以下の手順：
1. ブラウザで `F12` を押してDevToolsを開く
2. `Application` タブを選択
3. 左メニューから `Local Storage` を選択
4. `http://localhost:8088` を選択
5. すべてのキーを削除
6. `Cmd+Shift+R`（Mac）または `Ctrl+Shift+R`（Windows）でハードリロード

### 2. Cloudflare Workersが古いバージョン

**確認方法**:
```bash
curl https://replicate-nanobanana.skume-bioinfo.workers.dev/health
```

**期待される出力**:
```json
{
  "version": "2.0",
  "updated": "2025-10-26"
}
```

**解決方法**:
```bash
cd /Users/skume/Desktop/AI_Driven/Dev_nurumayu_proj/nurumayudatalab/webtool-image-transformation-tracking
npx wrangler deploy
```

### 3. APIエンドポイント設定の確認

**ブラウザのコンソールで確認**:

1. ブラウザで `F12` を押してDevToolsを開く
2. `Console` タブを選択
3. 以下を実行：

```javascript
// 現在の設定を確認
console.log('Config:', config.get('apiEndpoint'));

// 期待される出力:
// replicate.nanoBanana: "https://replicate-nanobanana.skume-bioinfo.workers.dev/proxy"
```

4. もし異なるURLが表示されたら：

```javascript
// 設定をリセット
config.reset();
location.reload();
```

### 4. リクエストの詳細確認

**ブラウザのコンソールでリクエストを確認**:

1. DevToolsの `Network` タブを開く
2. 画像生成を実行
3. `proxy` または Cloudflare Workers へのリクエストを選択
4. 以下を確認：
   - **Method**: `POST` であること
   - **Request URL**: `https://replicate-nanobanana.skume-bioinfo.workers.dev/proxy` であること
   - **Request Payload**: `path` と `input` が含まれていること

### 5. CORS設定の問題

**症状**: CORSエラーがコンソールに表示される

**解決方法**:

CORS無効化したChromeで起動：

```bash
# Mac
./sh/start-chrome-no-cors.sh

# または手動で
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --disable-web-security \
    --user-data-dir="/tmp/chrome-dev-session" \
    http://localhost:8088
```

## デバッグ用コンソールコマンド

```javascript
// 1. 現在の設定を確認
console.log('API Endpoint:', config.get('apiEndpoint'));

// 2. 設定バージョンを確認
console.log('Config Version:', config.get('configVersion'));

// 3. 設定をリセット
config.reset();

// 4. LocalStorageをクリア
localStorage.clear();

// 5. IndexedDBの状態を確認
imageStorage.getStats().then(stats => console.log('IndexedDB Stats:', stats));

// 6. 手動でAPIテスト
fetch('https://replicate-nanobanana.skume-bioinfo.workers.dev/health')
    .then(r => r.json())
    .then(data => console.log('Health Check:', data));
```

## よくある間違い

### ❌ 間違い 1: 古いURLを使用
```
https://api.replicate.com/v1/models/google/nano-banana/predictions
```

### ✅ 正解: Cloudflare Workers経由
```
https://replicate-nanobanana.skume-bioinfo.workers.dev/proxy
```

### ❌ 間違い 2: GETリクエスト
```javascript
fetch(url, { method: 'GET' })
```

### ✅ 正解: POSTリクエスト
```javascript
fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
```

## まだ解決しない場合

以下の情報を確認してください：

1. **ブラウザのコンソールログ**（エラーメッセージ全文）
2. **Network タブのリクエスト詳細**
   - Request URL
   - Request Method
   - Request Headers
   - Request Payload
3. **Health endpoint のレスポンス**
   ```bash
   curl https://replicate-nanobanana.skume-bioinfo.workers.dev/health
   ```

## クイックフィックス（まとめ）

```bash
# 1. ターミナルで
cd /Users/skume/Desktop/AI_Driven/Dev_nurumayu_proj/nurumayudatalab/webtool-image-transformation-tracking
npx wrangler deploy

# 2. ブラウザのコンソールで
localStorage.clear();
location.reload();

# 3. ハードリロード
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
```
