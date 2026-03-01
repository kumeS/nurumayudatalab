# WatchMate v2.0 セットアップガイド

このガイドでは、WatchMateのセットアップ手順を説明します。機能や使い方の詳細については [README.md](README.md) を参照してください。

---

## 📋 前提条件

- Cloudflare アカウント（無料）
- Node.js 14+ インストール済み
- （メール通知用）Resend または SendGrid アカウント（オプション）

---

## 🚀 セットアップ手順

### ステップ0: Cloudflare アカウント作成

#### Cloudflareアカウントがない場合

1. **Cloudflare にアクセス**
   - https://dash.cloudflare.com/sign-up にアクセス

2. **アカウント情報を入力**
   - メールアドレス
   - パスワード
   - 「Create Account」をクリック

3. **メール認証**
   - 登録したメールアドレスに確認メールが届く
   - メール内のリンクをクリックして認証

4. **ダッシュボードにアクセス**
   - https://dash.cloudflare.com にログイン
   - Workers & Pagesのセットアップ画面が表示される

#### Workers プランの確認

1. ダッシュボードで **Workers & Pages** をクリック
2. 初回の場合、Workersの説明が表示される
3. **無料プラン（Free）** を確認:
   - 10万リクエスト/日
   - KV読み取り: 10万回/日
   - KV書き込み: 1,000回/日
   - 完全無料で使用可能！

✅ Cloudflareアカウントの準備完了

---

### ステップ1: Wrangler CLI インストール

```bash
npm install -g wrangler
```

### ステップ2: Cloudflare にログイン

```bash
wrangler login
```

**実行すると:**
1. ブラウザが自動的に開く
2. Cloudflare ログイン画面が表示される
3. ログイン後、「Allow Wrangler」をクリック
4. ターミナルに `Successfully logged in` と表示される

✅ Wrangler と Cloudflare アカウントが連携完了

---

### ステップ3: KV Namespace 作成

#### コマンドラインで作成

```bash
wrangler kv:namespace create "WATCHMATE_KV"
```

**出力例:**
```
✨ Success!
Add the following to your configuration file:
{ binding = "KEYWORDS_KV", id = "a1b2c3d4..." }
```

**このIDをメモ！**

#### Cloudflare ダッシュボードで確認

1. https://dash.cloudflare.com にアクセス
2. 左メニューから **Workers & Pages** をクリック
3. 上部タブの **KV** をクリック
4. **WATCHMATE_KV** が表示されていることを確認
5. KV名をクリックして詳細を確認:
   - Namespace ID（上記でメモしたID）
   - Keys: 0（初期状態）
   - Storage: 0 bytes

✅ KV Namespace の作成と確認完了

---

### ステップ4: wrangler.toml 編集

`wrangler.toml` の `YOUR_KV_NAMESPACE_ID` を実際のIDに置き換え:

```toml
[[kv_namespaces]]
binding = "KEYWORDS_KV"
id = "a1b2c3d4..."  # ← ここに貼り付け
```

### ステップ5: メールサービスの設定（オプション）

メール通知を使う場合は、以下のいずれかを設定：

#### Option A: Resend（推奨）

1. https://resend.com でアカウント作成
2. API Keys → Create API Key
3. APIキーをコピー
4. Cloudflare Workers にシークレット設定:

```bash
wrangler secret put RESEND_API_KEY
# プロンプトでAPIキーを貼り付け
```

5. （オプション）送信元メールアドレスを設定:

```bash
# wrangler.tomlに追加
[vars]
FROM_EMAIL = "WatchMate <noreply@yourdomain.com>"
```

**Resend の特徴:**
- 月3,000通まで無料
- ドメイン認証が簡単
- 開発者フレンドリー

#### Option B: SendGrid

1. https://sendgrid.com でアカウント作成
2. Settings → API Keys → Create API Key
3. Full Access を選択
4. APIキーをコピー
5. Cloudflare Workers にシークレット設定:

```bash
wrangler secret put SENDGRID_API_KEY
# プロンプトでAPIキーを貼り付け
```

**SendGrid の特徴:**
- 1日100通まで無料
- 老舗のメールサービス
- 高い信頼性

### ステップ6: Worker デプロイ

```bash
wrangler publish
```

**出力例:**
```
✨ Success!
Published watchmate (x.xx sec)
  https://watchmate.YOUR_SUBDOMAIN.workers.dev
```

**このURLをメモ！**

#### Cloudflare ダッシュボードで確認

1. https://dash.cloudflare.com にアクセス
2. **Workers & Pages** をクリック
3. デプロイされた **watchmate** Worker が表示される
4. Worker名をクリックして詳細画面へ:

**詳細画面で確認できる項目:**

- **Overview**:
  - Worker URL: `https://watchmate.YOUR_SUBDOMAIN.workers.dev`
  - デプロイ日時
  - 最終更新日時

- **Settings**:
  - Environment Variables（環境変数）
  - KV Namespace Bindings（KV連携確認）
  - Triggers（Cron設定）

- **Logs**（リアルタイム）:
  - Worker実行ログ
  - エラーログ
  - スクレイピング結果

- **Metrics**（分析）:
  - リクエスト数
  - エラー率
  - CPU使用時間

✅ Worker のデプロイと確認完了

---

### ステップ7: Cron Trigger 確認

#### Cloudflare ダッシュボードで設定確認

1. https://dash.cloudflare.com にアクセス
2. **Workers & Pages** → **watchmate** をクリック
3. **Triggers** タブをクリック
4. **Cron Triggers** セクションで以下を確認:

**表示される内容:**
```
Cron Triggers
Schedule: */30 * * * *
Description: スケジュール実行（30分ごと）
Next Scheduled: 2026-02-04 12:30:00 UTC
```

**Cronパターンの意味:**
- `*/30 * * * *` = 30分ごと（1日48回）
- `*/15 * * * *` = 15分ごと（1日96回）
- `0 * * * *` = 1時間ごと（1日24回）

#### Cronスケジュールの変更方法（ダッシュボード）

1. **Triggers** タブで **Add Cron Trigger** をクリック
2. Cron式を入力（例: `*/15 * * * *`）
3. **Add Trigger** をクリック
4. 古いCronを削除（必要に応じて）

**注意:** `wrangler.toml` で設定したCronが優先されます。

✅ 30分ごとの自動実行が設定完了！

#### Cron実行履歴の確認

**ダッシュボードで確認:**
1. **watchmate** Worker の詳細画面
2. **Logs** タブをクリック
3. フィルター: **Scheduled** を選択
4. 過去のCron実行ログが時系列で表示される

**コマンドラインで確認:**
```bash
wrangler tail --format pretty
```

---

### ステップ8: 管理画面のデプロイ

#### Option A: GitHub Pages

```bash
git init
git add index.html admin-v2.js
git commit -m "Add WatchMate v2.0 dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/watchmate.git
git push -u origin main

# Settings → Pages で有効化
```

#### Option B: Netlify

```bash
netlify deploy --prod
```

#### Option C: ローカルテスト

```bash
python -m http.server 8000
# ブラウザで http://localhost:8000/index.html
```

### ステップ9: 管理画面の設定

1. 管理画面を開く
2. Worker URL 設定欄に Worker URL を入力:
   ```
   https://watchmate.YOUR_SUBDOMAIN.workers.dev
   ```
3. 保存

---

## ✅ 動作確認（コマンドライン）

すべてのテストは、Worker URLを環境変数に設定して実行できます:

```bash
# Worker URLを環境変数に設定
export WORKER_URL="https://watchmate.YOUR_SUBDOMAIN.workers.dev"
```

### Test 1: Worker API ヘルスチェック

```bash
curl -X GET "$WORKER_URL/health" | jq
```

**期待される応答:**
```json
{
  "status": "OK",
  "kvEnabled": true,
  "emailEnabled": true,
  "sites": ["7net", "hmv", "animate", "rakuten"]
}
```

✅ `status: "OK"` が返ればWorkerは正常動作

### Test 2: キーワード追加

```bash
curl -X POST "$WORKER_URL/api/keywords/add" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "test",
    "sites": ["7net", "hmv", "animate", "rakuten"],
    "enabled": true,
    "emailNotification": false
  }' | jq
```

**期待される応答:**
```json
{
  "success": true,
  "message": "キーワードを追加しました",
  "keyword": "test"
}
```

✅ `success: true` が返ればキーワード追加成功

### Test 3: キーワード一覧取得

```bash
curl -X GET "$WORKER_URL/api/keywords" | jq
```

**期待される応答:**
```json
[
  {
    "keyword": "test",
    "sites": ["7net", "hmv", "animate", "rakuten"],
    "enabled": true,
    "emailNotification": false
  }
]
```

✅ 追加したキーワードが表示されればOK

### Test 4: 手動検索実行

```bash
curl -X GET "$WORKER_URL/api/search/manual?keyword=test&sites=7net,hmv,animate,rakuten" | jq
```

**期待される応答:**
```json
{
  "keyword": "test",
  "timestamp": "2026-02-04T12:00:00.000Z",
  "data": {
    "7net": [...],
    "hmv": [...],
    "animate": [...],
    "rakuten": [...]
  }
}
```

✅ 各サイトの検索結果が配列で返ればOK

**HTMLRewriterの動作確認:**
```bash
# ログを別ターミナルで監視
wrangler tail

# 上記のコマンドを実行後、ログで以下を確認:
# - [サイト名] HTMLRewriter APIでパース開始
# - [サイト名] 抽出完了: X件
```

### Test 5: データ取得

```bash
curl -X GET "$WORKER_URL/api/data" | jq
```

**期待される応答:**
```json
{
  "test": {
    "keyword": "test",
    "timestamp": "2026-02-04T12:00:00.000Z",
    "data": {
      "7net": [...],
      "hmv": [...],
      "animate": [...],
      "rakuten": [...]
    }
  }
}
```

✅ 保存されたデータが取得できればOK

### Test 6: メール通知テスト（オプション）

```bash
curl -X POST "$WORKER_URL/api/email/test" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@example.com"
  }' | jq
```

**期待される応答:**
```json
{
  "success": true,
  "message": "テストメールを送信しました",
  "email": "your@example.com"
}
```

✅ メールが届き、`success: true` が返ればOK

### Test 7: キーワード削除

```bash
curl -X POST "$WORKER_URL/api/keywords/delete" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "test"
  }' | jq
```

**期待される応答:**
```json
{
  "success": true,
  "message": "キーワードを削除しました"
}
```

✅ `success: true` が返れば削除成功

### Test 8: Cron定期実行確認（30分待機）

30分後、自動実行されたデータを確認:

```bash
curl -X GET "$WORKER_URL/api/data/history" | jq
```

**期待される応答:**
```json
[
  {
    "timestamp": "2026-02-04T12:00:00.000Z",
    "keyword": "test",
    "totalResults": 80,
    "sites": ["7net", "hmv", "animate", "rakuten"]
  },
  ...
]
```

✅ 履歴にCron実行のログが記録されていれば自動スクレイピング動作中！

---

## 🧪 一括テストスクリプト

すべてのテストを一度に実行:

```bash
#!/bin/bash
# test-watchmate.sh

WORKER_URL="https://watchmate.YOUR_SUBDOMAIN.workers.dev"

echo "🧪 WatchMate API テスト開始"
echo "=============================="

echo ""
echo "✅ Test 1: ヘルスチェック"
curl -s "$WORKER_URL/health" | jq '.status'

echo ""
echo "✅ Test 2: キーワード追加"
curl -s -X POST "$WORKER_URL/api/keywords/add" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"test","sites":["7net","hmv","animate","rakuten"],"enabled":true}' \
  | jq '.success'

echo ""
echo "✅ Test 3: キーワード一覧"
curl -s "$WORKER_URL/api/keywords" | jq 'length'

echo ""
echo "✅ Test 4: 手動検索実行"
curl -s "$WORKER_URL/api/search/manual?keyword=test&sites=7net" | jq '.data.["7net"] | length'

echo ""
echo "✅ Test 5: データ取得"
curl -s "$WORKER_URL/api/data" | jq 'keys | length'

echo ""
echo "✅ Test 6: キーワード削除"
curl -s -X POST "$WORKER_URL/api/keywords/delete" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"test"}' \
  | jq '.success'

echo ""
echo "=============================="
echo "🎉 テスト完了！"
```

**実行方法:**
```bash
chmod +x test-watchmate.sh
./test-watchmate.sh
```

---



## 🐛 トラブルシューティング

### 問題: メール通知が届かない

**確認事項:**
1. API キーが正しく設定されているか:
   ```bash
   wrangler secret list
   ```
2. Worker のログを確認:
   ```bash
   wrangler tail
   ```
3. Cloudflare ダッシュボードで確認:
   - Workers & Pages → watchmate → **Settings** → **Variables**
   - **Environment Variables** に `RESEND_API_KEY` または `SENDGRID_API_KEY` が表示されているか
4. メールアドレスが正しいか
5. 迷惑メールフォルダを確認

**解決策:**
- テストメール機能で動作確認
- Worker を再デプロイ
- API キーを再設定:
  ```bash
  wrangler secret put RESEND_API_KEY
  ```

### 問題: 特定サイトの検索が失敗する

**確認事項:**
1. サイトのHTML構造が変更されていないか
2. アクセス制限を受けていないか
3. HTMLRewriterとフォールバックの両方が失敗していないか

**解決策:**

**コマンドラインでログ確認:**
```bash
wrangler tail
```

**Cloudflare ダッシュボードでログ確認:**
1. Workers & Pages → watchmate
2. **Logs** タブをクリック
3. **Real-time Logs** で以下を確認:
   - `[サイト名] HTMLRewriter APIでパース開始` - HTMLRewriter使用
   - `[サイト名] HTMLRewriterで抽出できず、正規表現にフォールバック` - フォールバック使用
   - `[サイト名] 抽出完了: X件` - 成功
4. エラーが表示される場合は、該当行をクリックして詳細を確認

**その他の解決策:**
- 該当サイトのみ無効化
- セレクタ設定を更新（上級者向け）:
  - `SITE_CONFIGS[サイト].selectors` を確認
  - サイトのHTML構造に合わせてCSSセレクタを調整

### 問題: Cron が実行されない

**確認事項:**

**ダッシュボードで確認:**
1. Workers & Pages → watchmate → **Triggers**
2. Cron Triggers に `*/30 * * * *` が表示されているか
3. **Logs** タブで Scheduled イベントが記録されているか

**コマンドラインで確認:**
```bash
# Worker が正常にデプロイされているか
wrangler publish

# Cron実行ログを監視
wrangler tail --format pretty
```

**解決策:**
1. Worker を再デプロイ:
   ```bash
   wrangler publish
   ```
2. `wrangler.toml` の `[triggers]` セクションを確認
3. Cloudflare ダッシュボードで手動でCron Triggerを追加

### 問題: KVにデータが保存されない

**確認事項:**

**ダッシュボードで確認:**
1. Workers & Pages → KV
2. **WATCHMATE_KV** をクリック
3. **View** をクリックしてキー一覧を確認
4. 以下のキーが存在するか:
   - `registered_keywords`
   - `data_latest_[キーワード名]`

**コマンドラインで確認:**
```bash
# キーワード一覧を取得
wrangler kv:key get "registered_keywords" --binding KEYWORDS_KV

# 全キーのリストを取得
wrangler kv:key list --binding KEYWORDS_KV
```

**解決策:**
1. Worker の Settings で KV Namespace Bindings を確認:
   - Binding名: `KEYWORDS_KV`
   - Namespace ID が正しいか
2. `wrangler.toml` の `[[kv_namespaces]]` セクションを確認
3. Worker を再デプロイ

### 問題: Worker URLにアクセスできない

**確認事項:**

**ダッシュボードで確認:**
1. Workers & Pages → watchmate
2. **Overview** で Worker URL を確認
3. **Status** が **Active** になっているか

**解決策:**
1. ブラウザで Worker URL (`https://watchmate.YOUR_SUBDOMAIN.workers.dev`) にアクセス
2. ウェルカムページが表示されることを確認
3. 表示されない場合:
   ```bash
   wrangler publish
   ```

---

## 📊 Cloudflare ダッシュボードでのモニタリング

### リアルタイムログ

**ダッシュボード:**
1. Workers & Pages → watchmate → **Logs**
2. **Real-time Logs** を有効化
3. フィルターオプション:
   - **All** - すべてのログ
   - **Errors** - エラーのみ
   - **Scheduled** - Cron実行のみ

**コマンドライン:**
```bash
wrangler tail --format pretty
```

### アナリティクス（分析）

**ダッシュボード:**
1. Workers & Pages → watchmate → **Metrics**
2. 確認できる項目:
   - **Requests** - リクエスト数の推移（グラフ）
   - **Errors** - エラー率
   - **CPU Time** - CPU使用時間
   - **Duration** - 実行時間

**期間選択:**
- Last 24 hours（過去24時間）
- Last 7 days（過去7日間）
- Last 30 days（過去30日間）

### KVストレージ使用状況

**ダッシュボード:**
1. Workers & Pages → **KV**
2. **WATCHMATE_KV** をクリック
3. 確認できる項目:
   - **Keys** - 保存されているキーの数
   - **Storage** - 使用中のストレージ容量
   - **Operations** - 読み取り/書き込み回数

### 使用量と制限の確認

**ダッシュボード:**
1. 右上のアカウントアイコン → **Account Home**
2. **Workers & Pages** をクリック
3. **Usage Models** で以下を確認:
   - Requests（リクエスト数）
   - CPU Time（CPU時間）
   - KV Operations（KV操作回数）

**無料プランの制限:**
- ✅ Requests: 100,000 / day
- ✅ KV Reads: 100,000 / day
- ✅ KV Writes: 1,000 / day
- ✅ KV Storage: 1 GB

---

## 🎉 セットアップ完了！

WatchMate v2.0 のセットアップが完了しました！

**次のステップ:**

1. 管理画面からキーワードを登録
2. 30分後にデータを確認
3. 使い方やカスタマイズについては [README.md](README.md) を参照

**Happy Monitoring!** 🚀
