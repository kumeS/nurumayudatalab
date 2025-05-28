#!/bin/bash
# ───────────────────────────────────────────────────────────
# preview_mobile_debug.command
# → ターミナルで実行してログを確認してください
# ───────────────────────────────────────────────────────────

# 1) このスクリプト自身のディレクトリへ移動
cd "$(cd "$(dirname "$0")" && pwd)" || {
  echo "ディレクトリ移動に失敗しました"; exit 1;
}

# 2) index.html が存在するかチェック
if [ ! -f "index.html" ]; then
  echo "ERROR: このフォルダに index.html が見つかりません"; exit 1;
fi

# 3) file:// URL を組み立てて表示（デバッグ用）
FILE_URL="file://$(pwd)/index.html"
echo "Opening: $FILE_URL"

# 4) Chrome のパスを確認し、なければ Canary も試す
CHROME_APP="/Applications/Google Chrome.app"
if [ ! -d "$CHROME_APP" ]; then
  echo "→ 標準の Google Chrome.app が見つかりません: $CHROME_APP"
  CHROME_APP="/Applications/Google Chrome Canary.app"
  if [ ! -d "$CHROME_APP" ]; then
    echo "ERROR: Chrome が見つかりません。/Applications 配下を確認してください"; exit 1;
  else
    echo "→ Canary を使います: $CHROME_APP"
  fi
fi

# 5) Chrome をモバイルビュー風に起動
open -n -a "$CHROME_APP" --args \
  --user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1" \
  --window-size=390,844 \
  "$FILE_URL" || {
    echo "ERROR: Chrome の起動に失敗しました"; exit 1;
}

echo "Done. ターミナルを閉じると終了します。"
