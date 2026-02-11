#!/bin/bash
# =============================================================================
# WatchMate v2.0 - ECサイト検索スクレイパー (CLI版)
# 
# 4つのECサイト (7net, HMV, Animate, 楽天ブックス) から商品検索結果を
# 直接curlで取得・パースし、コンソールに整形出力します。
#
# 使い方:
#   ./test.sh -q "Vジャンプ"
#   ./test.sh -q "ドラゴンボール" --site hmv
#   ./test.sh -q "ONE PIECE" --max 5
#   ./test.sh --help
# =============================================================================

set +e  # エラーがあっても処理を継続

# ----- 定数 / デフォルト設定 -----
VERSION="2.0.0"
MAX_RESULTS=10
TARGET_SITE="all"   # all | 7net | hmv | animate | rakuten
KEYWORD=""
VERBOSE=0
TIMEOUT_CONNECT=15
TIMEOUT_MAX=30
RETRY_COUNT=2
RETRY_DELAY=2
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
TMPDIR_BASE="/tmp/watchmate_$$"

# ----- カラー定義 -----
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  MAGENTA='\033[0;35m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  DIM='\033[2m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' BOLD='' DIM='' RESET=''
fi

# ----- ユーティリティ関数 -----

usage() {
  cat <<EOF

$(echo -e "${BOLD}")WatchMate v${VERSION} - ECサイト検索スクレイパー$(echo -e "${RESET}")

$(echo -e "${BOLD}")使い方:$(echo -e "${RESET}")
  $0 -q "検索キーワード" [オプション]

$(echo -e "${BOLD}")必須:$(echo -e "${RESET}")
  -q, --query KEYWORD    検索キーワード

$(echo -e "${BOLD}")オプション:$(echo -e "${RESET}")
  -s, --site SITE        対象サイト (7net|hmv|animate|rakuten|all) [default: all]
  -t, -m, --max NUM      最大表示件数 [default: 10]
  -v, --verbose          詳細出力モード
  -h, --help             このヘルプを表示

$(echo -e "${BOLD}")例:$(echo -e "${RESET}")
  $0 -q "Vジャンプ"
  $0 -q "Vジャンプ 2026年 4月号" -t 10
  $0 -q "ドラゴンボール" --site hmv --max 5

EOF
  exit 0
}

log_info()  { echo -e "${BLUE}[INFO]${RESET}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${RESET}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $*"; }
log_debug() { [[ "$VERBOSE" -eq 1 ]] && echo -e "${DIM}[DEBUG] $*${RESET}"; }

# URLエンコード (日本語対応, macOS互換)
urlencode() {
  local string="$1"
  # Python3が利用可能ならそちらを使う (最も正確)
  if command -v python3 &>/dev/null; then
    python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$string"
  else
    # Pure bash fallback
    local length="${#string}"
    local i c
    for (( i = 0; i < length; i++ )); do
      c="${string:i:1}"
      case "$c" in
        [a-zA-Z0-9.~_-]) printf '%s' "$c" ;;
        *) printf '%%%02X' "'$c" ;;
      esac
    done
    echo
  fi
}

# HTMLタグ除去
strip_tags() {
  sed 's/<[^>]*>//g' | sed 's/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&#39;/'"'"'/g; s/&nbsp;/ /g'
}

# 空白トリム
trim() {
  sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | tr -s '[:space:]' ' '
}

# curl共通ラッパー (リトライ + エラーハンドリング)
fetch_url() {
  local url="$1"
  local output_file="$2"
  local extra_opts="${3:-}"
  local attempt=0
  local http_code=""

  while (( attempt <= RETRY_COUNT )); do
    if (( attempt > 0 )); then
      log_debug "リトライ ${attempt}/${RETRY_COUNT} (${RETRY_DELAY}秒後)..."
      sleep "$RETRY_DELAY"
    fi

    http_code=$(curl -sL -o "$output_file" -w "%{http_code}" \
      -H "User-Agent: ${USER_AGENT}" \
      -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
      -H "Accept-Language: ja,en-US;q=0.7,en;q=0.3" \
      -H "Accept-Encoding: identity" \
      -H "Cache-Control: no-cache" \
      -H "Connection: keep-alive" \
      --connect-timeout "$TIMEOUT_CONNECT" \
      --max-time "$TIMEOUT_MAX" \
      $extra_opts \
      "$url" 2>/dev/null)

    local curl_exit=$?

    if (( curl_exit == 0 )); then
      if [[ "$http_code" =~ ^[23] ]]; then
        log_debug "HTTP ${http_code} - $(wc -c < "$output_file" | tr -d ' ') bytes"
        echo "$http_code"
        return 0
      else
        log_debug "HTTP ${http_code} (attempt $((attempt+1)))"
      fi
    else
      log_debug "curl exit code: ${curl_exit} (attempt $((attempt+1)))"
    fi

    (( attempt++ ))
  done

  echo "${http_code:-000}"
  return 1
}

# ----- 引数パース -----
while [[ $# -gt 0 ]]; do
  case "$1" in
    -q|--query)   KEYWORD="$2"; shift 2 ;;
    -s|--site)    TARGET_SITE="$2"; shift 2 ;;
    -t|-m|--max)  MAX_RESULTS="$2"; shift 2 ;;
    -v|--verbose) VERBOSE=1; shift ;;
    -h|--help)    usage ;;
    *) log_error "不明なオプション: $1"; usage ;;
  esac
done

if [[ -z "$KEYWORD" ]]; then
  log_error "検索キーワードを指定してください (-q オプション)"
  echo ""
  usage
fi

# ----- 一時ディレクトリ作成 / クリーンアップ -----
mkdir -p "$TMPDIR_BASE"
trap 'rm -rf "$TMPDIR_BASE"' EXIT

# ----- メイン処理開始 -----
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  WatchMate v${VERSION} - ECサイト検索${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${CYAN}キーワード:${RESET} ${BOLD}${KEYWORD}${RESET}"
echo -e "  ${CYAN}対象サイト:${RESET} ${TARGET_SITE}"
echo -e "  ${CYAN}最大件数:${RESET}   ${MAX_RESULTS}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

ENCODED_KEYWORD=$(urlencode "$KEYWORD")
log_debug "エンコード済みキーワード: ${ENCODED_KEYWORD}"

TOTAL_FOUND=0
SITE_COUNT=0

# =============================================================================
# 7net (セブンネット)
# 構造: <p class="productName"><a href="...">タイトル</a></p>
#        <p class="productPrice">...<b>XX,XXX<span class="u-unit">円</span></b>
#        <span class="u-inTaxTxt">XX,XXX</span>
# =============================================================================
search_7net() {
  local site_name="セブンネット (7net)"
  (( SITE_COUNT++ ))
  echo -e "${MAGENTA}▶ ${site_name}${RESET}"
  echo -e "${DIM}  URL: https://7net.omni7.jp/search/?keyword=${ENCODED_KEYWORD}${RESET}"

  local raw_file="${TMPDIR_BASE}/7net_raw.html"
  local url="https://7net.omni7.jp/search/?keyword=${ENCODED_KEYWORD}"

  local http_code
  http_code=$(fetch_url "$url" "$raw_file")
  local fetch_status=$?

  if (( fetch_status != 0 )); then
    log_warn "  ${site_name}: 取得失敗 (HTTP ${http_code})"
    echo ""
    return 1
  fi

  local file_size
  file_size=$(wc -c < "$raw_file" 2>/dev/null | tr -d ' ')

  if (( file_size < 1000 )); then
    log_warn "  ${site_name}: レスポンスが小さすぎます (${file_size} bytes) - WAFブロックの可能性"
    echo ""
    return 1
  fi

  # 商品名・URL・税込価格をブロック単位で抽出
  # 7netはCRLF改行のため、改行を除去して1行にしてからパース
  # 商品ブロック区切り: <p class="productImg">
  # 各ブロック内: <p class="productName"><a href="URL">TITLE</a></p>
  #               <span class="u-inTaxTxt">XXX.XX</span>
  # ※価格のないブロックがあるため、個別抽出ではなくブロック単位でペアリング
  local count=0
  local oneline_file="${TMPDIR_BASE}/7net_oneline.html"
  tr -d '\r\n' < "$raw_file" > "$oneline_file"

  # ブロック単位でタイトル・URL・価格を同時抽出 (python3使用)
  while IFS=$'\t' read -r item_title item_url item_price; do
    [[ -z "$item_title" ]] && continue
    (( count >= MAX_RESULTS )) && break
    (( count++ ))

    # URL正規化
    if [[ "$item_url" == //* ]]; then
      item_url="https:${item_url}"
    elif [[ "$item_url" == /* ]]; then
      item_url="https://7net.omni7.jp${item_url}"
    fi

    local price_str=""
    if [[ -n "$item_price" && "$item_price" != "-" ]]; then
      # 小数点以下を除去して整数表示
      local price_int="${item_price%%.*}"
      price_str=" ${YELLOW}¥${price_int}(税込)${RESET}"
    fi
    echo -e "  ${GREEN}${count}.${RESET} ${BOLD}${item_title}${RESET}${price_str}"
    echo -e "     ${DIM}${item_url}${RESET}"
  done < <(
    python3 -c "
import re, sys, html as h
with open('${oneline_file}', 'r') as f:
    data = f.read()
blocks = re.split(r'<p class=\"productImg\">', data)
for block in blocks[1:]:
    m_name = re.search(r'<p class=\"productName\"><a href=\"([^\"]*)\"[^>]*>(.+?)</a></p>', block)
    if not m_name:
        continue
    url = m_name.group(1)
    title = re.sub(r'<[^>]+>', '', m_name.group(2)).strip()
    title = h.unescape(title)
    m_price = re.search(r'<span class=\"u-inTaxTxt\">([0-9,.]+)</span>', block)
    price = m_price.group(1) if m_price else '-'
    print(f'{title}\t{url}\t{price}')
"
  )

  if (( count > 0 )); then
    log_ok "  ${site_name}: ${count} 件取得"
    TOTAL_FOUND=$((TOTAL_FOUND + count))
  else
    log_warn "  ${site_name}: 検索結果なし (WAFブロックの可能性あり)"
  fi

  echo ""
}

# =============================================================================
# HMV & BOOKS
# 構造: <h3 class="title"><a href="...">タイトル</a></h3>
#        <div class="price">...<div class="right">￥XX,XXX</div>...
# 注意: Shift_JIS エンコーディング → iconv で UTF-8 変換が必要
# =============================================================================
search_hmv() {
  local site_name="HMV & BOOKS"
  (( SITE_COUNT++ ))
  echo -e "${MAGENTA}▶ ${site_name}${RESET}"

  local url="https://www.hmv.co.jp/search/adv_1/category_24/keyword_${ENCODED_KEYWORD}/target_LBOOKS/type_sr/"
  echo -e "${DIM}  URL: ${url}${RESET}"

  local raw_file="${TMPDIR_BASE}/hmv_raw.html"
  local utf8_file="${TMPDIR_BASE}/hmv_utf8.html"

  local http_code
  http_code=$(fetch_url "$url" "$raw_file")
  local fetch_status=$?

  if (( fetch_status != 0 )); then
    log_warn "  ${site_name}: 取得失敗 (HTTP ${http_code})"
    echo ""
    return 1
  fi

  local file_size
  file_size=$(wc -c < "$raw_file" 2>/dev/null | tr -d ' ')

  if (( file_size < 1000 )); then
    log_warn "  ${site_name}: レスポンスが小さすぎます (${file_size} bytes)"
    echo ""
    return 1
  fi

  # Shift_JIS → UTF-8 変換
  # HMVはcharset=Shift_JISを返すことが多い
  local needs_convert=false

  # charset宣言をチェック
  if LC_ALL=C grep -qi 'charset=Shift_JIS\|charset=shift_jis\|charset=sjis' "$raw_file" 2>/dev/null; then
    needs_convert=true
  fi

  # fileコマンドでも判定
  if ! $needs_convert; then
    local file_type
    file_type=$(file "$raw_file" 2>/dev/null)
    if echo "$file_type" | grep -qi 'iso-8859\|Non-ISO extended-ASCII\|unknown'; then
      needs_convert=true
    fi
  fi

  if $needs_convert; then
    log_debug "  Shift_JIS → UTF-8 変換中..."
    if ! iconv -f SHIFT_JIS -t UTF-8 "$raw_file" > "$utf8_file" 2>/dev/null; then
      if ! iconv -f CP932 -t UTF-8 "$raw_file" > "$utf8_file" 2>/dev/null; then
        log_debug "  iconv失敗, 元ファイルをそのまま使用"
        cp "$raw_file" "$utf8_file"
      fi
    fi
  else
    cp "$raw_file" "$utf8_file"
  fi

  log_debug "  変換後: $(wc -c < "$utf8_file" | tr -d ' ') bytes"

  # 商品をパース
  # <h3 class="title"><a href="URL">TITLE</a></h3>
  # <div class="price">...<div class="right">￥XX,XXX</div>...
  local count=0

  local -a titles_h urls_h prices_h

  # タイトルとURLを抽出 (h3.title > a のみ)
  while IFS='|' read -r item_url item_title; do
    [[ -z "$item_title" ]] && continue
    item_title=$(echo "$item_title" | trim)
    [[ -z "$item_title" ]] && continue
    titles_h+=("$item_title")
    if [[ "$item_url" == /* ]]; then
      item_url="https://www.hmv.co.jp${item_url}"
    fi
    urls_h+=("$item_url")
  done < <(
    grep -A1 '<h3 class="title">' "$utf8_file" \
    | grep -oE '<a href="[^"]*">[^<]+</a>' \
    | sed -E 's/<a href="([^"]*)">(.*)<\/a>/\1|\2/' \
    | head -"$MAX_RESULTS"
  )

  # 価格を抽出 (right > ￥)
  while IFS= read -r p; do
    prices_h+=("$p")
  done < <(
    grep -oE '<div class="right">￥[0-9,]+</div>' "$utf8_file" \
    | sed -E 's/<div class="right">￥([0-9,]+)<\/div>/\1/' \
    | head -"$MAX_RESULTS"
  )

  # 結果表示
  local i
  for (( i = 0; i < ${#titles_h[@]} && i < MAX_RESULTS; i++ )); do
    (( count++ ))
    local price_str=""
    if (( i < ${#prices_h[@]} )); then
      price_str=" ${YELLOW}¥${prices_h[$i]}(税込)${RESET}"
    fi
    echo -e "  ${GREEN}${count}.${RESET} ${BOLD}${titles_h[$i]}${RESET}${price_str}"
    echo -e "     ${DIM}${urls_h[$i]}${RESET}"
  done

  if (( count > 0 )); then
    log_ok "  ${site_name}: ${count} 件取得"
    TOTAL_FOUND=$((TOTAL_FOUND + count))
  else
    log_warn "  ${site_name}: 検索結果なし"
  fi

  echo ""
}

# =============================================================================
# アニメイト オンラインショップ
# 構造: <h3><a href="/pn/..." title="タイトル">タイトル</a></h3>
#        <p class="price"><font class="notranslate">XXX</font>円(税込)</p>
# =============================================================================
search_animate() {
  local site_name="アニメイト"
  (( SITE_COUNT++ ))
  echo -e "${MAGENTA}▶ ${site_name}${RESET}"

  local url="https://www.animate-onlineshop.jp/products/list.php?mode=search&smt=${ENCODED_KEYWORD}"
  echo -e "${DIM}  URL: ${url}${RESET}"

  local raw_file="${TMPDIR_BASE}/animate_raw.html"

  local http_code
  http_code=$(fetch_url "$url" "$raw_file")
  local fetch_status=$?

  if (( fetch_status != 0 )); then
    log_warn "  ${site_name}: 取得失敗 (HTTP ${http_code})"
    echo ""
    return 1
  fi

  local file_size
  file_size=$(wc -c < "$raw_file" 2>/dev/null | tr -d ' ')

  if (( file_size < 1000 )); then
    log_warn "  ${site_name}: レスポンスが小さすぎます (${file_size} bytes)"
    echo ""
    return 1
  fi

  # 商品をパース
  # <h3><a href="/pn/..." title='タイトル'>タイトル</a></h3>
  # <p class="price"><font class="notranslate">XXX</font>円(税込)</p>
  local count=0

  local -a titles_a urls_a prices_a

  # タイトルとURLを抽出
  while IFS='|' read -r item_url item_title; do
    [[ -z "$item_title" ]] && continue
    item_title=$(echo "$item_title" | strip_tags | trim)
    [[ -z "$item_title" ]] && continue
    titles_a+=("$item_title")
    if [[ "$item_url" == /* ]]; then
      item_url="https://www.animate-onlineshop.jp${item_url}"
    fi
    urls_a+=("$item_url")
  done < <(
    grep -oE '<h3><a href="[^"]*"[^>]*>[^<]+</a></h3>' "$raw_file" \
    | sed -E "s/<h3><a href=\"([^\"]*)\"[^>]*>([^<]+)<\/a><\/h3>/\1|\2/" \
    | head -"$MAX_RESULTS"
  )

  # 価格を抽出
  while IFS= read -r p; do
    prices_a+=("$p")
  done < <(
    grep -oE '<p class="price"><font class="notranslate">[0-9,]+</font>円' "$raw_file" \
    | sed -E 's/<p class="price"><font class="notranslate">([0-9,]+)<\/font>円/\1/' \
    | head -"$MAX_RESULTS"
  )

  # 結果表示
  local i
  for (( i = 0; i < ${#titles_a[@]} && i < MAX_RESULTS; i++ )); do
    (( count++ ))
    local price_str=""
    if (( i < ${#prices_a[@]} )); then
      price_str=" ${YELLOW}¥${prices_a[$i]}(税込)${RESET}"
    fi
    echo -e "  ${GREEN}${count}.${RESET} ${BOLD}${titles_a[$i]}${RESET}${price_str}"
    echo -e "     ${DIM}${urls_a[$i]}${RESET}"
  done

  if (( count > 0 )); then
    log_ok "  ${site_name}: ${count} 件取得"
    TOTAL_FOUND=$((TOTAL_FOUND + count))
  else
    log_warn "  ${site_name}: 検索結果なし"
  fi

  echo ""
}

# =============================================================================
# 楽天ブックス
# 構造: <a href="https://books.rakuten.co.jp/rb/XXXXX/?...">
#        <span class="rbcomp__item-list__item__title">タイトル</span></a>
#        <span class="rbcomp__item-list__item__price"><em>XXX円</em></span>
# =============================================================================
search_rakuten() {
  local site_name="楽天ブックス"
  (( SITE_COUNT++ ))
  echo -e "${MAGENTA}▶ ${site_name}${RESET}"

  local url="https://books.rakuten.co.jp/search?sitem=${ENCODED_KEYWORD}&g=007&l-id=search-l-genre-1"
  echo -e "${DIM}  URL: ${url}${RESET}"

  local raw_file="${TMPDIR_BASE}/rakuten_raw.html"

  local http_code
  http_code=$(fetch_url "$url" "$raw_file")
  local fetch_status=$?

  if (( fetch_status != 0 )); then
    log_warn "  ${site_name}: 取得失敗 (HTTP ${http_code})"
    echo ""
    return 1
  fi

  local file_size
  file_size=$(wc -c < "$raw_file" 2>/dev/null | tr -d ' ')

  if (( file_size < 1000 )); then
    log_warn "  ${site_name}: レスポンスが小さすぎます (${file_size} bytes)"
    echo ""
    return 1
  fi

  # 商品をパース
  # 楽天はHTML内のタグが改行で分割されているため1行化する
  local count=0
  local oneline_file="${TMPDIR_BASE}/rakuten_oneline.html"
  tr -d '\r\n' < "$raw_file" | sed 's/>[[:space:]]*</></g' > "$oneline_file"

  local -a titles_r urls_r prices_r

  # タイトルとURL: <a href="...rb/XXXXX/..."><span class="rbcomp__item-list__item__title">TITLE</span></a>
  while IFS='|' read -r item_url item_title; do
    [[ -z "$item_title" ]] && continue
    item_title=$(echo "$item_title" | strip_tags | trim)
    [[ -z "$item_title" ]] && continue
    titles_r+=("$item_title")
    urls_r+=("$item_url")
  done < <(
    grep -oE '<a href="https://books\.rakuten\.co\.jp/rb/[0-9]+/[^"]*"><span class="rbcomp__item-list__item__title">[^<]+</span>' "$oneline_file" \
    | sed -E 's/<a href="([^"]*)"><span class="rbcomp__item-list__item__title">([^<]+)<\/span>/\1|\2/' \
    | head -"$MAX_RESULTS"
  )

  # 価格を抽出
  while IFS= read -r p; do
    prices_r+=("$p")
  done < <(
    grep -oE '<span class="rbcomp__item-list__item__price"><em>[0-9,]+円</em>' "$oneline_file" \
    | sed -E 's/.*<em>([0-9,]+)円<\/em>/\1/' \
    | head -"$MAX_RESULTS"
  )

  # 結果表示
  local i
  for (( i = 0; i < ${#titles_r[@]} && i < MAX_RESULTS; i++ )); do
    (( count++ ))
    local price_str=""
    if (( i < ${#prices_r[@]} )); then
      price_str=" ${YELLOW}¥${prices_r[$i]}(税込)${RESET}"
    fi
    echo -e "  ${GREEN}${count}.${RESET} ${BOLD}${titles_r[$i]}${RESET}${price_str}"
    echo -e "     ${DIM}${urls_r[$i]}${RESET}"
  done

  if (( count > 0 )); then
    log_ok "  ${site_name}: ${count} 件取得"
    TOTAL_FOUND=$((TOTAL_FOUND + count))
  else
    log_warn "  ${site_name}: 検索結果なし"
  fi

  echo ""
}

# =============================================================================
# メイン処理 - 各サイトを検索
# =============================================================================

run_search() {
  case "$TARGET_SITE" in
    7net)     search_7net ;;
    hmv)      search_hmv ;;
    animate)  search_animate ;;
    rakuten)  search_rakuten ;;
    all)
      search_7net
      search_hmv
      search_animate
      search_rakuten
      ;;
    *)
      log_error "不明なサイト: ${TARGET_SITE}"
      log_info "有効なサイト: 7net, hmv, animate, rakuten, all"
      exit 1
      ;;
  esac
}

# 実行
START_TIME=$(date +%s)
run_search
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# ----- サマリー表示 -----
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  検索完了${RESET}"
echo -e "  ${CYAN}合計:${RESET} ${BOLD}${TOTAL_FOUND}${RESET} 件"
echo -e "  ${CYAN}所要時間:${RESET} ${ELAPSED} 秒"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

exit 0
