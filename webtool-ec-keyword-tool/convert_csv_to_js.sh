#!/bin/bash

# スクリプトのあるディレクトリに移動
cd "$(dirname "$0")"

CSV_FILE="2_or_more_character_keywords.csv"
JS_FILE="split_keywords.js"

if [ ! -f "$CSV_FILE" ]; then
    echo "エラー: $CSV_FILE が見つかりません。"
    exit 1
fi

# Pythonを使って安全・確実にCSVをパースし、JSファイルを出力します
python3 -c '
import csv
import sys

csv_file = sys.argv[1]
js_file = sys.argv[2]

try:
    with open(csv_file, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        words = []
        for row in reader:
            # 行が空でなく、A列（0番目の要素）に文字が入っている場合のみ抽出
            if row and row[0].strip():
                words.append(row[0].strip())
                
    with open(js_file, "w", encoding="utf-8") as f:
        f.write("const SPLIT_KEYWORDS = [\n")
        for w in words:
            # ダブルクォーテーションやバックスラッシュをエスケープ処理
            w_esc = w.replace("\\", "\\\\").replace("\"", "\\\"")
            f.write(f"  \"{w_esc}\",\n")
        f.write("];\n")
        
    print(f"成功: {csv_file} を {js_file} に変換しました。")
except Exception as e:
    print(f"エラーが発生しました: {e}")
    sys.exit(1)
' "$CSV_FILE" "$JS_FILE"
