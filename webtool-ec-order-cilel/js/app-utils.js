// ============================================================
// 共通ユーティリティ関数
// ============================================================

// グローバル定数
const LOCAL_CACHE_KEY = 'CiLELViewerCache';

// ============================================================
// HTML操作関連
// ============================================================

/**
 * HTMLエスケープ処理
 * @param {string} text - エスケープするテキスト
 * @returns {string} エスケープされたHTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// 数値処理関連
// ============================================================

/**
 * 文字列から数値をパースする
 * @param {any} val - パースする値
 * @returns {number} パースされた数値（失敗時はNaN）
 */
function parseNumeric(val) {
  if (val === undefined || val === null || val === '') return NaN;
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? NaN : num;
}

/**
 * 数値をフォーマットして表示用文字列に変換
 * @param {any} val - フォーマットする値
 * @returns {string} カンマ区切りの数値文字列
 */
function formatNumber(val) {
  if (!val) return '0';
  const num = parseFloat(String(val).replace(/[¥,]/g, ''));
  return isNaN(num) ? '0' : num.toLocaleString();
}

/**
 * アイテム配列から指定フィールドの合計を計算
 * @param {Array} items - アイテム配列
 * @param {string} key - 合計するフィールド名
 * @returns {number} 合計値
 */
function sumField(items, key) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const val = parseNumeric(item[key]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
}

// sumSubtotal removed - use sumField(items, 'subtotal') instead
// ============================================================
// キャッシュ操作関連
// ============================================================

/**
 * localStorageからキャッシュを読み込む
 * @returns {Object|null} キャッシュデータまたはnull
 */
function loadCache() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load cache', err);
    return null;
  }
}

/**
 * キャッシュをlocalStorageに保存
 * @param {Object} snapshot - 保存するスナップショット
 */
function saveCache(snapshot) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to persist local cache', err);
  }
}

/**
 * localStorageからキャッシュを削除
 */
function removeCache() {
  try {
    localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch (err) {
    console.warn('Failed to clear local cache', err);
  }
}

// ============================================================
// ヘッダーテキスト正規化
// ============================================================

/**
 * ヘッダーテキストを正規化（空白削除）
 * @param {string} text - 正規化するテキスト
 * @returns {string} 正規化されたテキスト
 */
function normalizeHeaderText(text) {
  if (text === undefined || text === null) return '';
  return String(text).replace(/\s+/g, '');
}

// ============================================================
// Blob操作関連
// ============================================================

/**
 * BlobをDataURLに変換
 * @param {Blob} blob - 変換するBlob
 * @returns {Promise<string>} DataURL文字列
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
