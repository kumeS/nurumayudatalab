#!/bin/bash
echo "=== WatchMate v2.0 品質チェック ==="
echo ""

# 1. 構文チェック
echo "1. JavaScript構文チェック"
node -c worker.js && echo "   ✓ worker.js" || echo "   ✗ worker.js FAILED"
node -c admin-v2.js && echo "   ✓ admin-v2.js" || echo "   ✗ admin-v2.js FAILED"
echo ""

# 2. HTML整合性チェック
echo "2. HTML/JS DOM整合性チェック"
jsids=$(grep -oE "getElementById\('[^']+'\)" admin-v2.js | sed "s/getElementById('//" | sed "s/')//" | sort -u)
htmlids=$(grep -oE 'id="[^"]+"' index.html | sed 's/id="//' | sed 's/"//' | sort -u)
missing=0
for id in $jsids; do
  if ! echo "$htmlids" | grep -q "^$id$"; then
    echo "   ✗ Missing ID in HTML: $id"
    missing=$((missing + 1))
  fi
done
if [ $missing -eq 0 ]; then
  echo "   ✓ 全DOM ID一致（$(echo "$jsids" | wc -l)個）"
else
  echo "   ✗ $missing 個のID不一致"
fi
echo ""

# 3. API整合性チェック
echo "3. APIエンドポイント整合性"
echo "   Worker提供: $(grecho "   Worker提供: $(grecho jsecho "   W "echo "   Worker提供: $(grecho "   Worker提�/'echo "-v2echo "   Worker提供:APecho "   Worker提供: $(grecho "   W��echo "   Work�
echo "4. ドキュメント"
[ -f README.md ] && echo "   ✓ RE[ -f README.md ] && echo "   ✓ RE[ -f README.md ] && echo "   ✓ RE[ -f REA "   �[ -f RGEL[ -f README.md ] && echo "   ch[ -f README.md ] && echo "   ✓ RE[ -f R��[ -f イル
echo "5. 設定ファイル"
[ -f wrangler.toml ] && echo "   ✓ wrangler.toml"
grep -q "YOUR_KV_NAgrep -q "YOUR_KV_NAgrep -q "YOUR_KV_NAgrep -q "YOUR_KV_NAgrep -q "YOUR_KV_NAgrep -q� grep -q��grep -q "YOUR_KV_NA "=== チェック完了 ==="
