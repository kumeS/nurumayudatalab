const STORAGE_KEYS = {
  jobs: "jobs",
  settings: "settings",
  lastExtraction: "lastExtraction",
  extractionHistory: "extractionHistory",
  debugLogs: "debugLogs"
};

const DEBUG_LOG_LIMIT = 300;
const EXTRACTION_HISTORY_LIMIT = 20;
const MAX_TEXT_LENGTH = 4000;
const MAX_LONG_TEXT_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 80;

const DEFAULT_SETTINGS = {
  apiBaseUrl: "",
  toolPassword: "",
  replicateApiKey: "",
  openRouterApiKey: "",
  defaultTemplate: [
    "あなたはEC商品のコピーライターです。",
    "日本語で簡潔な商品要約とSEOキーワードを生成してください。",
    "summary と keywords を持つ有効なJSONのみを返してください。",
    "keywords は短い文字列の配列にしてください。"
  ].join("\n"),
  promptDraftTemplate: [
    "あなたはAmazonのSEOとCVR最大化を考慮した商品ページ作成のプロです。以下の1688の商品情報を元に、Amazon.co.jp（日本のAmazon）向けの商品タイトル、検索キーワード、仕様（Bullet Points）、商品説明文を作成してください。",
    "",
    "【厳守ルール】",
    "",
    "Amazon向けの商品タイトル",
    "",
    "80〜110文字の範囲でSEO最適化した商品タイトルを作成する。",
    "重要な検索キーワードを前方に配置し、競合に埋もれないようにする。",
    "単語単位で重複しないように配置する。（例：「レディース ワイドパンツ」をタイトルに入れた場合、検索キーワードリストには「レディース」や「ワイドパンツ」を含めない）",
    "Amazon向けの検索キーワード",
    "",
    "250バイト以内で最適化された検索キーワードリストを作成する。",
    "1文字3バイトで計算し、全角83文字以内に収める。",
    "商品タイトルで使用した単語を検索キーワードでは重複して使用しないことを厳守する。",
    "需給比が高いキーワードを優先し、競合が少ないキーワードを活用する。",
    "Amazon向けの箇条書き（Bullet Points）",
    "",
    "5つの特徴を具体的に説明し、購買意欲を高める情報を伝える。",
    "各ポイントは120〜150文字以内に収める。",
    "Amazon向けの商品説明文",
    "",
    "900〜1500文字で商品の魅力を引き出す。",
    "特徴 → ベネフィット の順で、具体的な使用シーンを想像させる内容にする。",
    "リスクを排除し、購入者の不安を解消する内容を盛り込む。",
    "必要な箇所に改行タグ（<br/>）を追加し、視認性を高める。",
    "【】や「」を使用して見出しや重要ポイントを強調し、読みやすく整理されたレイアウトにする。",
    "【1688の商品情報】",
    "",
    "商品名:",
    "仕様・説明文など:",
    "販売時の商品バリエーション:"
  ].join("\n"),
  promptImproveTemplate:
    "下記の商品説明をもとに、Bullet Points（5つの箇条書き、ここでは<br>での改行が必要です、それぞれ100文字程度）、商品説明文（5つの箇条書き、ここでは改行してください。<br>は使用しません。それぞれ100文字程度の適切な文章量で作成してください）を作成してください。商品の強みポイントをピックアップして、商品アピールに変えて、商品説明してください。商品の良さが伝わる言葉、商品説明に適切な用語の使用、さらに購入者の顕在ニーズ・潜在ニーズを明らかにして、何によって購入者の要求が満たされているか？のストーリーを商品説明の訴求要素として追加してください。商品説明や商品仕様では、軽減、緩和、安心、安全、定番、効果、効果抜群、高評価、おすすめ、流行、大人気、返品、格安、激安などのAmazonで引っかかりやすい用語は除いてください。 この商品およびこの商品カテゴリーと関連するアマゾン販売でベストな最強の検索キーワード・関連語（300個のビッグキーワード、200個のジャンルキーワード、100個の中ボリュームキーワード、100個のニッチキーワード）をそれぞれ列挙してください。キーワードの出力は、半角スペース区切り、名詞（ひらがな、漢字、カタカナ）のみとして、複合語はできる限り避けてください。例えば、〇〇服等に代表されるように一般的に検索しないキーワードは除外してください。**などのハイライト記号は使用してないでください。",
  timeoutSec: 60,
  retryCount: 3,
  pollIntervalSec: 5,
  hasReplicateApiKey: false,
  hasOpenRouterApiKey: false
};

const CRYPTO_VERSION = 1;
const CRYPTO_ITERATIONS = 250000;

function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: CRYPTO_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSecret(plainText, passphrase) {
  if (!plainText) {
    return null;
  }
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  return {
    v: CRYPTO_VERSION,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter: CRYPTO_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipherBuffer))
  };
}

async function decryptSecret(payload, passphrase) {
  if (!payload || !payload.data) {
    return "";
  }
  const key = await deriveAesKey(passphrase, fromBase64(payload.salt));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );
  return new TextDecoder().decode(plainBuffer);
}

function normalizeSettingsForUi(settings) {
  const next = { ...settings };
  delete next.replicateApiKeyEnc;
  delete next.openRouterApiKeyEnc;
  next.replicateApiKey = "";
  next.openRouterApiKey = "";
  next.hasReplicateApiKey = Boolean(settings.replicateApiKeyEnc);
  next.hasOpenRouterApiKey = Boolean(settings.openRouterApiKeyEnc);
  return next;
}

async function storageGet(key, fallbackValue) {
  const data = await chrome.storage.local.get(key);
  if (Object.prototype.hasOwnProperty.call(data, key)) {
    return data[key];
  }
  return fallbackValue;
}

async function storageSet(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function readSettings(options = {}) {
  const { forUi = false } = options;
  const settings = await storageGet(STORAGE_KEYS.settings, {});
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  if (forUi) {
    return normalizeSettingsForUi(merged);
  }
  return merged;
}

async function writeSettings(nextSettings) {
  const current = await readSettings();
  const merged = {
    ...current,
    apiBaseUrl: Object.prototype.hasOwnProperty.call(nextSettings, "apiBaseUrl") ? nextSettings.apiBaseUrl : current.apiBaseUrl,
    toolPassword: Object.prototype.hasOwnProperty.call(nextSettings, "toolPassword") ? nextSettings.toolPassword : current.toolPassword,
    defaultTemplate: Object.prototype.hasOwnProperty.call(nextSettings, "defaultTemplate") ? nextSettings.defaultTemplate : current.defaultTemplate,
    promptDraftTemplate: Object.prototype.hasOwnProperty.call(nextSettings, "promptDraftTemplate")
      ? nextSettings.promptDraftTemplate
      : current.promptDraftTemplate,
    promptImproveTemplate: Object.prototype.hasOwnProperty.call(nextSettings, "promptImproveTemplate")
      ? nextSettings.promptImproveTemplate
      : current.promptImproveTemplate,
    timeoutSec: Object.prototype.hasOwnProperty.call(nextSettings, "timeoutSec") ? nextSettings.timeoutSec : current.timeoutSec,
    retryCount: Object.prototype.hasOwnProperty.call(nextSettings, "retryCount") ? nextSettings.retryCount : current.retryCount,
    pollIntervalSec: Object.prototype.hasOwnProperty.call(nextSettings, "pollIntervalSec") ? nextSettings.pollIntervalSec : current.pollIntervalSec
  };

  const hasReplicateInPayload = Object.prototype.hasOwnProperty.call(nextSettings, "replicateApiKey");
  const hasOpenRouterInPayload = Object.prototype.hasOwnProperty.call(nextSettings, "openRouterApiKey");
  const clearReplicate = Boolean(nextSettings.clearReplicateApiKey);
  const clearOpenRouter = Boolean(nextSettings.clearOpenRouterApiKey);
  const needSecretUpdate = hasReplicateInPayload || hasOpenRouterInPayload || clearReplicate || clearOpenRouter;

  if (needSecretUpdate) {
    const passphrase = (nextSettings.secretPassphrase || "").trim();
    if (!passphrase) {
      throw { code: "PASSPHRASE_REQUIRED", message: "APIキー更新には暗号化パスフレーズが必要です" };
    }

    if (clearReplicate) {
      delete merged.replicateApiKeyEnc;
    } else if (hasReplicateInPayload && String(nextSettings.replicateApiKey || "").trim()) {
      merged.replicateApiKeyEnc = await encryptSecret(String(nextSettings.replicateApiKey).trim(), passphrase);
    }

    if (clearOpenRouter) {
      delete merged.openRouterApiKeyEnc;
    } else if (hasOpenRouterInPayload && String(nextSettings.openRouterApiKey || "").trim()) {
      merged.openRouterApiKeyEnc = await encryptSecret(String(nextSettings.openRouterApiKey).trim(), passphrase);
    }
  }

  delete merged.replicateApiKey;
  delete merged.openRouterApiKey;
  delete merged.secretPassphrase;
  delete merged.clearReplicateApiKey;
  delete merged.clearOpenRouterApiKey;

  await storageSet(STORAGE_KEYS.settings, merged);
  return normalizeSettingsForUi(merged);
}

async function decryptApiKeys(passphrase) {
  const settings = await readSettings();
  return {
    replicateApiKey: settings.replicateApiKeyEnc ? await decryptSecret(settings.replicateApiKeyEnc, passphrase) : "",
    openRouterApiKey: settings.openRouterApiKeyEnc ? await decryptSecret(settings.openRouterApiKeyEnc, passphrase) : ""
  };
}

async function readJobs() {
  const jobs = await storageGet(STORAGE_KEYS.jobs, []);
  return Array.isArray(jobs) ? jobs : [];
}

function normalizeExtractionEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(entry));
  } catch (_error) {
    return null;
  }
}

function truncateText(value, maxLength) {
  if (typeof value !== "string") {
    return value;
  }
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    return "";
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function trimArray(value, maxLength) {
  if (!Array.isArray(value)) {
    return value;
  }
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    return [];
  }
  return value.slice(0, maxLength);
}

function compactExtractionEntry(entry, options = {}) {
  const { aggressive = false } = options;
  if (!entry || typeof entry !== "object") {
    return entry;
  }

  const next = { ...entry };
  const textLimit = aggressive ? 1600 : MAX_TEXT_LENGTH;
  const longTextLimit = aggressive ? 3200 : MAX_LONG_TEXT_LENGTH;
  const arrayLimit = aggressive ? 20 : MAX_ARRAY_LENGTH;

  next.title = truncateText(next.title, 500);
  next.price = truncateText(next.price, 120);
  next.moq = truncateText(next.moq, 120);
  next.url = truncateText(next.url, 1500);
  next.description = truncateText(next.description, longTextLimit);
  next.packagingInfo = truncateText(next.packagingInfo, textLimit);
  next.source = truncateText(next.source, 120);

  next.images = Array.isArray(next.images) ? trimArray(next.images, arrayLimit) : [];
  next.detailImages = Array.isArray(next.detailImages) ? trimArray(next.detailImages, arrayLimit) : [];
  next.priceTiers = (Array.isArray(next.priceTiers) ? trimArray(next.priceTiers, arrayLimit) : []).map((tier) => ({
    quantity: truncateText(tier && tier.quantity, 120),
    price: truncateText(tier && tier.price, 120)
  }));
  next.missingFields = (Array.isArray(next.missingFields) ? trimArray(next.missingFields, arrayLimit) : []).map((item) =>
    truncateText(item, 160)
  );

  if (Array.isArray(next.attributes)) {
    next.attributes = next.attributes.slice(0, arrayLimit).map((item) => ({
      key: truncateText(item && item.key, 200),
      value: truncateText(item && item.value, textLimit)
    }));
  }

  if (next.variants && typeof next.variants === "object") {
    next.variants = {
      colors: (Array.isArray(next.variants.colors) ? trimArray(next.variants.colors, arrayLimit) : []).map((item) =>
        truncateText(item, 120)
      ),
      sizes: (Array.isArray(next.variants.sizes) ? trimArray(next.variants.sizes, arrayLimit) : []).map((item) =>
        truncateText(item, 120)
      )
    };
  }

  if (Array.isArray(next.skuList)) {
    next.skuList = next.skuList.slice(0, arrayLimit).map((item) => ({
      color: truncateText(item && item.color, 120),
      size: truncateText(item && item.size, 120),
      image: truncateText(item && item.image, 800),
      price: truncateText(item && item.price, 120),
      stock: truncateText(item && item.stock, 120)
    }));
  }

  if (Array.isArray(next.reviews)) {
    next.reviews = next.reviews.slice(0, aggressive ? 10 : 30).map((item) => ({
      rating: truncateText(item && item.rating, 40),
      date: truncateText(item && item.date, 80),
      content: truncateText(item && item.content, aggressive ? 320 : 900),
      user: truncateText(item && item.user, 120)
    }));
  }

  if (next.shop && typeof next.shop === "object") {
    next.shop = {
      ...next.shop,
      name: truncateText(next.shop.name, 300),
      url: truncateText(next.shop.url, 800),
      seller: truncateText(next.shop.seller, 300)
    };
  }

  if (!next.crawledAt) {
    next.crawledAt = new Date().toISOString();
  }

  return next;
}

async function persistExtractionState(history, lastEntry) {
  let candidateHistory = Array.isArray(history) ? history.slice() : [];
  let candidateLast = lastEntry;
  let usedAggressiveCompaction = false;
  let lastError = null;

  while (candidateHistory.length > 0) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.extractionHistory]: candidateHistory,
        [STORAGE_KEYS.lastExtraction]: candidateLast
      });
      return candidateHistory;
    } catch (error) {
      lastError = error;

      if (candidateHistory.length === 1 && !usedAggressiveCompaction) {
        candidateHistory = [compactExtractionEntry(candidateHistory[0], { aggressive: true })];
        candidateLast = candidateHistory[0];
        usedAggressiveCompaction = true;
        continue;
      }

      candidateHistory = candidateHistory.slice(0, Math.max(1, candidateHistory.length - 1));
      candidateLast = candidateHistory[0] || candidateLast;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

function getExtractionEntryKey(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }

  const productId = String(entry.productId || "").trim();
  const url = String(entry.url || "").trim();
  const crawledAt = String(entry.crawledAt || "").trim();
  if (productId || url || crawledAt) {
    return `${productId}|${url}|${crawledAt}`;
  }

  const title = String(entry.title || "").trim();
  if (title) {
    return `title:${title}`;
  }

  try {
    return JSON.stringify(entry).slice(0, 500);
  } catch (_error) {
    return "";
  }
}

async function readExtractionHistory() {
  const history = await storageGet(STORAGE_KEYS.extractionHistory, []);
  const normalizedHistory = Array.isArray(history)
    ? history.map((item) => compactExtractionEntry(normalizeExtractionEntry(item))).filter(Boolean)
    : [];

  if (normalizedHistory.length) {
    return normalizedHistory;
  }

  const last = await storageGet(STORAGE_KEYS.lastExtraction, null);
  const normalizedLast = normalizeExtractionEntry(last);
  return normalizedLast ? [normalizedLast] : [];
}

async function writeExtractionHistory(history) {
  const normalizedHistory = Array.isArray(history)
    ? history.map((item) => compactExtractionEntry(normalizeExtractionEntry(item))).filter(Boolean)
    : [];
  await storageSet(STORAGE_KEYS.extractionHistory, normalizedHistory);
}

async function appendExtractionHistory(entry) {
  const normalizedEntry = compactExtractionEntry(normalizeExtractionEntry(entry));
  if (!normalizedEntry) {
    const current = await readExtractionHistory();
    return current;
  }

  const history = await readExtractionHistory();
  const compactedHistory = history.map((item) => compactExtractionEntry(item));
  const nextHistory = [normalizedEntry, ...compactedHistory].slice(0, EXTRACTION_HISTORY_LIMIT);

  return persistExtractionState(nextHistory, normalizedEntry);
}

async function deleteExtractionHistoryItem(extractionKey) {
  const targetKey = String(extractionKey || "").trim();
  const history = await readExtractionHistory();
  if (!targetKey || !history.length) {
    return history;
  }

  const nextHistory = history.filter((entry) => getExtractionEntryKey(entry) !== targetKey);
  if (nextHistory.length === history.length) {
    return history;
  }

  if (!nextHistory.length) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.extractionHistory]: [],
      [STORAGE_KEYS.lastExtraction]: null
    });
    return [];
  }

  return persistExtractionState(nextHistory, nextHistory[0]);
}

async function writeJobs(jobs) {
  await storageSet(STORAGE_KEYS.jobs, jobs);
}

async function upsertJob(job) {
  const jobs = await readJobs();
  const idx = jobs.findIndex((item) => item.jobId === job.jobId);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], ...job, updatedAt: new Date().toISOString() };
  } else {
    jobs.unshift({ ...job, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  await writeJobs(jobs);
  return jobs;
}

async function deleteJob(jobId) {
  const jobs = await readJobs();
  const filtered = jobs.filter((job) => job.jobId !== jobId);
  await writeJobs(filtered);
  return filtered;
}

function normalizeLogLevel(level) {
  const value = String(level || "info").toLowerCase();
  if (value === "error" || value === "warn" || value === "debug") {
    return value;
  }
  return "info";
}

function sanitizeDetails(details) {
  if (details === null || details === undefined) {
    return null;
  }
  if (typeof details === "string") {
    return details;
  }
  try {
    return JSON.parse(JSON.stringify(details));
  } catch (_error) {
    return String(details);
  }
}

function normalizeDebugLogEntry(entry) {
  return {
    timestamp: entry && entry.timestamp ? entry.timestamp : new Date().toISOString(),
    level: normalizeLogLevel(entry && entry.level),
    source: entry && entry.source ? String(entry.source) : "unknown",
    message: entry && entry.message ? String(entry.message) : "",
    details: sanitizeDetails(entry && entry.details)
  };
}

async function readDebugLogs() {
  const logs = await storageGet(STORAGE_KEYS.debugLogs, []);
  return Array.isArray(logs) ? logs : [];
}

async function writeDebugLogs(logs) {
  await storageSet(STORAGE_KEYS.debugLogs, Array.isArray(logs) ? logs : []);
}

async function appendDebugLog(entry) {
  const logs = await readDebugLogs();
  logs.unshift(normalizeDebugLogEntry(entry));
  if (logs.length > DEBUG_LOG_LIMIT) {
    logs.length = DEBUG_LOG_LIMIT;
  }
  await writeDebugLogs(logs);
  return logs;
}

async function clearDebugLogs() {
  await writeDebugLogs([]);
  return [];
}

globalThis.StorageRepo = {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  storageGet,
  storageSet,
  readSettings,
  writeSettings,
  decryptApiKeys,
  readJobs,
  writeJobs,
  readExtractionHistory,
  writeExtractionHistory,
  appendExtractionHistory,
  deleteExtractionHistoryItem,
  upsertJob,
  deleteJob,
  readDebugLogs,
  writeDebugLogs,
  appendDebugLog,
  clearDebugLogs
};
