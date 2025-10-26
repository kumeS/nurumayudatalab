# R2 バケット設定ガイド

## 現在の状態

✅ **画像生成**: 成功
✅ **Cloudflare Workers**: 正常動作
✅ **Replicate API**: 接続成功
❌ **R2保存**: IMAGE_BUCKETバインディング未設定

## テスト結果

```
Prediction ID: kpab2y29f9rma0ct43hsh2x46r
Status: succeeded
Output URL: https://replicate.delivery/xezq/eijcqr9sWLyYSi9AlczbZHYL6e1D3Bh4G8e0s16f0UCOfvXsC/tmpeife8dwi.png
生成時間: 13.36秒

⚠️ R2 Saved: [] (空)
```

## IMAGE_BUCKET バインディング設定手順

### 方法1: Cloudflare ダッシュボード（推奨）

1. **Cloudflare ダッシュボードにアクセス**
   - https://dash.cloudflare.com/
   - Workers & Pages → `replicate-nanobanana` を選択

2. **Settings タブを開く**
   - 左メニューから「Settings」をクリック

3. **Variables セクションを開く**
   - 下にスクロールして「Variables」を見つける

4. **R2 Bucket Bindings を追加**
   - 「R2 Bucket Bindings」セクションを見つける
   - 「Add binding」ボタンをクリック

   **設定値**:
   ```
   Variable name: IMAGE_BUCKET
   R2 bucket: nurumayu-nanobanana
   ```

5. **Save をクリック**

6. **Worker を再デプロイ**
   - 「Quick Edit」タブに戻る
   - 「Save and Deploy」をクリック（コード変更不要）

### 方法2: wrangler.toml（すでに設定済み）

`wrangler.toml` には既に設定されています：

```toml
[[r2_buckets]]
binding = "IMAGE_BUCKET"
bucket_name = "nurumayu-nanobanana"
```

この設定でデプロイすれば自動的に反映されます：

```bash
cd /Users/skume/Desktop/AI_Driven/Dev_nurumayu_proj/nurumayudatalab/webtool-image-transformation-tracking

npx wrangler deploy
```

## R2バケットの確認

### R2バケットが存在するか確認

```bash
npx wrangler r2 bucket list
```

**期待される出力**:
```
nurumayu-nanobanana
```

### R2バケットが無い場合は作成

```bash
npx wrangler r2 bucket create nurumayu-nanobanana
```

## 設定後の確認手順

### 1. Workerを再デプロイ（ダッシュボードで設定した場合）

ダッシュボードで「Save and Deploy」をクリック

### 2. テストリクエストを送信

```bash
python3 << 'EOF'
import urllib.request
import json

url = "https://replicate-nanobanana.skume-bioinfo.workers.dev/proxy"
payload = {
    "path": "/v1/models/google/nano-banana/predictions",
    "input": {
        "prompt": "test R2 storage",
        "image_input": ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4"],
        "aspect_ratio": "1:1",
        "output_format": "png"
    }
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req, timeout=60) as response:
    result = json.loads(response.read().decode('utf-8'))
    saved = result.get('saved', [])

    print(f"Saved count: {len(saved)}")

    if len(saved) > 0:
        print("✅ R2保存成功！")
        for item in saved:
            if 'r2Key' in item:
                print(f"  - {item['r2Key']}")
    else:
        print("❌ R2保存失敗 - IMAGE_BUCKETバインディングを確認してください")
EOF
```

### 3. Cloudflare R2 バケットを確認

ダッシュボードで確認：
1. Cloudflare ダッシュボード → R2
2. `nurumayu-nanobanana` バケットを開く
3. ファイルが保存されているか確認

**期待されるファイル名形式**:
```
20251026-141917_google-nano-banana_kpab2y29f9rma0ct43hsh2x46r_0.png
20251026-141917_google-nano-banana_kpab2y29f9rma0ct43hsh2x46r_metadata.json
```

### 4. Cloudflare Workers のログを確認

```bash
npx wrangler tail
```

リアルタイムでログが表示されます。`[R2]` プレフィックスのログメッセージを探してください：

**成功時のログ例**:
```
[R2] Starting R2 save process
[R2] Found 1 image URLs to save
[R2] Saving to R2 with key: 20251026-141917_google-nano-banana_xxx_0.png
[R2] Successfully saved to R2. ETag: ...
[R2] Save process completed. Total saved: 2
```

**失敗時のログ例**:
```
[R2] CRITICAL ERROR: IMAGE_BUCKET not configured - R2 save disabled
[R2] Available env keys: [...]
```

## トラブルシューティング

### R2バケットが見つからない

```bash
# バケット一覧を確認
npx wrangler r2 bucket list

# バケットを作成
npx wrangler r2 bucket create nurumayu-nanobanana
```

### バインディングが反映されない

1. ダッシュボードで設定を確認
2. Workerを再デプロイ（「Save and Deploy」）
3. ブラウザキャッシュをクリア
4. 数分待ってから再試行

### ログでエラーを確認

```bash
# リアルタイムログ監視
npx wrangler tail --format pretty

# 別のターミナルでテストリクエスト送信
python3 test.py
```

## 参考リンク

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Workers Bindings Documentation](https://developers.cloudflare.com/workers/platform/bindings/)
- [Wrangler R2 Commands](https://developers.cloudflare.com/workers/wrangler/commands/#r2)
