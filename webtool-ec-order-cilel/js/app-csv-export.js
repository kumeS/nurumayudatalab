// ============================================================
// 商品選択CSVエクスポート機能
// order_apa.xlsx / order_zak.xlsx 形式のヘッダー定義とCSV生成
// ============================================================

/**
 * アパレル / 雑貨 共通（order_apa / order_zak）のCSVヘッダー定義
 * No, サイト1, サイト2, サイト3, 画像URL, サイズ・カラー・各個数など,
 * 数量, 単価(元), 納品プラン, 送り先, 納品指示
 */
const CSV_HEADERS_APA = [
  'No', 'サイト1', 'サイト2', 'サイト3',
  '画像URL', 'サイズ・カラー・各個数など',
  '数量', '単価(元)', '納品プラン', '送り先', '納品指示'
];

// 雑貨用も同一フォーマットを利用する
const CSV_HEADERS_ZAK = CSV_HEADERS_APA;

/**
 * アイテムをCSV行の値配列にマッピング
 * @param {Object} item - processDataで生成された商品アイテム
 * @param {string} format - 'apa' | 'zak'
 * @param {number} index - 通し番号用のインデックス（0始まり）
 * @returns {string[]} ヘッダー順の値配列
 */
function itemToCsvRow(item, format, index) {
  const headers = format === 'zak' ? CSV_HEADERS_ZAK : CSV_HEADERS_APA;
  // 画像URLは埋め込みデータURLではなく、元のURLを使用する
  const photoVal = item.photo || '';
  const photoStr = typeof photoVal === 'string' ? photoVal : (photoVal?.url || '');

  const siteText = item.siteUrl ?? '';
  const urls = String(siteText).match(/https?:\/\/[^\s]+/g) || [];
  const site1 = urls[0] || '';
  const site2 = urls[1] || '';
  const site3 = urls[2] || '';

  // 数量は発注数量を優先し、なければ出荷数量
  const quantity = item.orderQty ?? item.shipQty ?? '';

  const rowMap = {
    'No': (typeof index === 'number' ? index + 1 : (item.no ?? '')),
    'サイト1': site1,
    'サイト2': site2,
    'サイト3': site3,
    '画像URL': photoStr,
    'サイズ・カラー・各個数など': item.variant ?? '',
    '数量': quantity,
    '単価(元)': item.unitPriceCny ?? '',
    '納品プラン': item.inspectionPlan ?? '',
    '送り先': item.deliveryAddress ?? '',
    '納品指示': item.deliveryInstructions ?? ''
  };

  return headers.map(h => rowMap[h] ?? '');
}

/**
 * CSVの1フィールドをエスケープ（ダブルクォート、改行対応）
 * @param {string} val - 値
 * @returns {string}
 */
function escapeCsvField(val) {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(',')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 画像キーが選択キーと一致するか
 */
function imageKeyMatchesSelection(imageUrl, selectedKeys) {
  if (!imageUrl || !selectedKeys) return false;
  const url = String(imageUrl).trim();
  if (selectedKeys.has(url)) return true;
  const built = buildImageKey(url);
  if (built && selectedKeys.has(built)) return true;
  if (url.startsWith('data:') && selectedKeys.has(url.slice(0, 200))) return true;
  return false;
}

/**
 * 選択された画像キーから商品アイテムを解決
 * FT（注文）ファイルのみ対象。WJFTは除外。
 * @param {Set<string>} selectedKeys - 選択された画像のキー集合
 * @returns {Array<{item: Object, fileName: string}>}
 */
function resolveSelectedItemsFromImageKeys(selectedKeys) {
  const result = [];
  if (!selectedKeys || selectedKeys.size === 0) return result;

  for (const [fileName, data] of Object.entries(allData)) {
    if (data.fileType === 'wjft') continue;
    const items = data.items || [];
    for (const item of items) {
      const imageUrl = item._embeddedImage || extractImageUrl(item.photo) || extractImageUrl(item.siteUrl);
      if (!imageUrl) continue;
      if (imageKeyMatchesSelection(imageUrl, selectedKeys)) {
        result.push({ item, fileName });
      }
    }
  }
  return result;
}

/**
 * 選択された商品をCSV文字列に変換（BOM付きUTF-8）
 * @param {Array<{item: Object, fileName: string}>} selectedItems
 * @param {string} format - 'apa' | 'zak'
 * @returns {string}
 */
function generateCsvFromSelectedItems(selectedItems, format) {
  const headers = format === 'zak' ? CSV_HEADERS_ZAK : CSV_HEADERS_APA;
  const headerLine = headers.map(escapeCsvField).join(',');
  const lines = [headerLine];

  selectedItems.forEach(({ item }, index) => {
    const row = itemToCsvRow(item, format, index);
    lines.push(row.map(escapeCsvField).join(','));
  });

  const csv = lines.join('\r\n');
  const BOM = '\uFEFF';
  return BOM + csv;
}

/**
 * CSVをダウンロード
 * @param {string} csvContent - BOM付きCSV文字列
 * @param {string} filename - ダウンロードファイル名
 */
function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
