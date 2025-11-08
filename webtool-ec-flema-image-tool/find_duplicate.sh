#!/bin/bash

# find_duplicate.sh - JSファイル間の関数コード重複検出ツール
# 使用方法: ./find_duplicate.sh [ディレクトリパス]

TARGET_DIR="${1:-.}"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "=== JSファイル間の関数コード重複検出 ==="
echo "対象ディレクトリ: $TARGET_DIR"
echo ""

# JSファイルから関数を抽出
extract_functions() {
    local file="$1"
    local output="$2"
    
    # 関数定義を抽出（function宣言、アロー関数、メソッド定義）
    awk '
    /^[[:space:]]*function[[:space:]]+[a-zA-Z_$][a-zA-Z0-9_$]*[[:space:]]*\(/ {
        func_start = NR
        func_name = $0
        gsub(/^[[:space:]]*function[[:space:]]+/, "", func_name)
        gsub(/[[:space:]]*\(.*/, "", func_name)
        brace_count = 0
        in_function = 1
        func_body = $0 "\n"
        next
    }
    /^[[:space:]]*(const|let|var)[[:space:]]+[a-zA-Z_$][a-zA-Z0-9_$]*[[:space:]]*=[[:space:]]*(\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)[[:space:]]*=>/ {
        func_start = NR
        func_name = $0
        gsub(/^[[:space:]]*(const|let|var)[[:space:]]+/, "", func_name)
        gsub(/[[:space:]]*=.*/, "", func_name)
        brace_count = 0
        in_function = 1
        func_body = $0 "\n"
        next
    }
    /^[[:space:]]*[a-zA-Z_$][a-zA-Z0-9_$]*[[:space:]]*\([^)]*\)[[:space:]]*\{/ {
        func_start = NR
        func_name = $0
        gsub(/^[[:space:]]*/, "", func_name)
        gsub(/[[:space:]]*\(.*/, "", func_name)
        brace_count = 0
        in_function = 1
        func_body = $0 "\n"
        next
    }
    in_function {
        func_body = func_body $0 "\n"
        for (i = 1; i <= length($0); i++) {
            char = substr($0, i, 1)
            if (char == "{") brace_count++
            if (char == "}") brace_count--
        }
        if (brace_count <= 0 && /}/) {
            # 関数の正規化（空白・コメント除去）
            normalized = func_body
            gsub(/\/\/.*$/, "", normalized)
            gsub(/\/\*.*?\*\//, "", normalized)
            gsub(/[[:space:]]+/, " ", normalized)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", normalized)
            
            # 関数が十分な長さがある場合のみ出力
            if (length(normalized) > 50) {
                print "FILE:" FILENAME
                print "NAME:" func_name
                print "LINE:" func_start
                print "HASH:" normalized
                print "---"
            }
            in_function = 0
        }
    }
    ' "$file" >> "$output"
}

# すべてのJSファイルを処理
echo "JSファイルを解析中..."
find "$TARGET_DIR" -name "*.js" -type f | while read -r jsfile; do
    echo "  処理中: $jsfile"
    extract_functions "$jsfile" "$TEMP_DIR/functions.txt"
done

# 重複を検出
echo ""
echo "=== 重複検出結果 ==="
echo ""

awk '
BEGIN {
    RS="---"
    FS="\n"
}
{
    if (NF < 4) next
    
    file = ""
    name = ""
    line = ""
    hash = ""
    
    for (i = 1; i <= NF; i++) {
        if ($i ~ /^FILE:/) {
            file = substr($i, 6)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", file)
        }
        if ($i ~ /^NAME:/) {
            name = substr($i, 6)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
        }
        if ($i ~ /^LINE:/) {
            line = substr($i, 6)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
        }
        if ($i ~ /^HASH:/) {
            hash = substr($i, 6)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", hash)
        }
    }
    
    if (hash != "") {
        if (hash in hashes) {
            hashes[hash] = hashes[hash] "\n" file ":" line " - " name
            count[hash]++
        } else {
            hashes[hash] = file ":" line " - " name
            count[hash] = 1
        }
    }
}
END {
    dup_found = 0
    for (hash in hashes) {
        if (count[hash] > 1) {
            dup_found++
            print "【重複グループ #" dup_found "】 (" count[hash] "箇所)"
            print hashes[hash]
            print ""
        }
    }
    
    if (dup_found == 0) {
        print "重複する関数は見つかりませんでした。"
    } else {
        print "合計 " dup_found " 個の重複グループが見つかりました。"
    }
}
' "$TEMP_DIR/functions.txt"

echo ""
echo "=== 完了 ==="
