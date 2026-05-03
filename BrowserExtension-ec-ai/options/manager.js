const nodes = {
  runBtn: document.getElementById("run-btn"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  refreshBtn: document.getElementById("refresh-btn"),
  refreshExtractionBtn: document.getElementById("refresh-extraction-btn"),
  jobsBody: document.getElementById("jobs-body"),
  detail: document.getElementById("job-detail"),
  extractionHistoryMeta: document.getElementById("extraction-history-meta"),
  extractionHistoryList: document.getElementById("extraction-history-list"),
  lastExtraction: document.getElementById("last-extraction"),
  createDraftBtn: document.getElementById("create-draft-btn"),
  createImproveBtn: document.getElementById("create-improve-btn"),
  pageCreateStatus: document.getElementById("page-create-status"),
  extractionMetrics: document.getElementById("extraction-metrics"),
  extractionMissing: document.getElementById("extraction-missing"),
  form: document.getElementById("settings-form"),
  apiBaseUrl: document.getElementById("api-base-url"),
  toolPassword: document.getElementById("tool-password"),
  replicateApiKey: document.getElementById("replicate-api-key"),
  openRouterApiKey: document.getElementById("openrouter-api-key"),
  secretPassphrase: document.getElementById("secret-passphrase"),
  clearReplicateApiKey: document.getElementById("clear-replicate-api-key"),
  clearOpenRouterApiKey: document.getElementById("clear-openrouter-api-key"),
  keyStatus: document.getElementById("key-status"),
  timeoutSec: document.getElementById("timeout-sec"),
  pollIntervalSec: document.getElementById("poll-interval-sec"),
  promptDraftTemplate: document.getElementById("prompt-draft-template"),
  promptImproveTemplate: document.getElementById("prompt-improve-template"),
  saveStatus: document.getElementById("save-status"),
  refreshDebugBtn: document.getElementById("refresh-debug-btn"),
  clearDebugBtn: document.getElementById("clear-debug-btn"),
  debugMeta: document.getElementById("debug-meta"),
  debugLog: document.getElementById("debug-log")
};

const DRAFT_PROMPT_DEFAULT = [
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
].join("\n");

const IMPROVE_PROMPT_DEFAULT =
  "下記の商品説明をもとに、Bullet Points（5つの箇条書き、ここでは<br>での改行が必要です、それぞれ100文字程度）、商品説明文（5つの箇条書き、ここでは改行してください。<br>は使用しません。それぞれ100文字程度の適切な文章量で作成してください）を作成してください。商品の強みポイントをピックアップして、商品アピールに変えて、商品説明してください。商品の良さが伝わる言葉、商品説明に適切な用語の使用、さらに購入者の顕在ニーズ・潜在ニーズを明らかにして、何によって購入者の要求が満たされているか？のストーリーを商品説明の訴求要素として追加してください。商品説明や商品仕様では、軽減、緩和、安心、安全、定番、効果、効果抜群、高評価、おすすめ、流行、大人気、返品、格安、激安などのAmazonで引っかかりやすい用語は除いてください。 この商品およびこの商品カテゴリーと関連するアマゾン販売でベストな最強の検索キーワード・関連語（300個のビッグキーワード、200個のジャンルキーワード、100個の中ボリュームキーワード、100個のニッチキーワード）をそれぞれ列挙してください。キーワードの出力は、半角スペース区切り、名詞（ひらがな、漢字、カタカナ）のみとして、複合語はできる限り避けてください。例えば、〇〇服等に代表されるように一般的に検索しないキーワードは除外してください。**などのハイライト記号は使用してないでください。";

let cacheJobs = [];
let extractionHistory = [];
let selectedExtractionKey = "";

function escapeHtml(text) {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response || !response.ok) {
    const error = response && response.error ? response.error : { message: "不明なメッセージエラー" };
    throw new Error(error.message || "不明なランタイムエラー");
  }
  return response.data;
}

function showStatus(message, isError = false) {
  nodes.saveStatus.textContent = message;
  nodes.saveStatus.classList.toggle("error", isError);
}

function showPageCreateStatus(message, isError = false) {
  nodes.pageCreateStatus.textContent = message;
  nodes.pageCreateStatus.classList.toggle("error", isError);
}

function setPageCreateButtonsDisabled(disabled) {
  nodes.createDraftBtn.disabled = disabled;
  nodes.createImproveBtn.disabled = disabled;
}

function switchTab(tabName) {
  for (const button of nodes.tabButtons) {
    button.classList.toggle("active", button.dataset.tab === tabName);
  }
  for (const panel of nodes.tabPanels) {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  }

  if (tabName === "debug") {
    refreshDebugLogs().catch((error) => {
      showStatus(error.message || "ログ取得に失敗しました。", true);
    });
  }
}

function formatDebugLogs(logs) {
  if (!Array.isArray(logs) || !logs.length) {
    return "ログはありません。";
  }

  return logs
    .map((entry) => {
      const timestamp = entry.timestamp || "-";
      const source = entry.source || "unknown";
      const level = (entry.level || "info").toUpperCase();
      const message = entry.message || "";
      const detail = entry.details ? `\n${JSON.stringify(entry.details, null, 2)}` : "";
      return `[${timestamp}] [${source}] [${level}] ${message}${detail}`;
    })
    .join("\n\n");
}

async function refreshDebugLogs() {
  const logs = await send("GET_DEBUG_LOGS");
  nodes.debugMeta.textContent = `ログ件数: ${Array.isArray(logs) ? logs.length : 0}`;
  nodes.debugLog.textContent = formatDebugLogs(logs);
}

async function clearDebugLogs() {
  await send("CLEAR_DEBUG_LOGS");
  await refreshDebugLogs();
  showStatus("デバッグログをクリアしました。", false);
}

function indentLines(text, spaces) {
  const indent = " ".repeat(spaces);
  return String(text)
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function formatPlainText(value, indent = 0) {
  if (value == null) {
    return "なし";
  }

  if (typeof value === "string") {
    return value.trim() ? value : "（空）";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return "なし";
    }
    const pad = " ".repeat(indent);
    return value
      .map((item) => {
        const rendered = formatPlainText(item, indent + 2);
        if (rendered.includes("\n")) {
          return `${pad}-\n${indentLines(rendered, indent + 2)}`;
        }
        return `${pad}- ${rendered}`;
      })
      .join("\n");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) {
      return "なし";
    }
    const pad = " ".repeat(indent);
    return entries
      .map(([key, item]) => {
        const rendered = formatPlainText(item, indent + 2);
        if (rendered.includes("\n")) {
          return `${pad}${key}:\n${indentLines(rendered, indent + 2)}`;
        }
        return `${pad}${key}: ${rendered}`;
      })
      .join("\n");
  }

  return String(value);
}

function formatJobDetail(job) {
  const source = job && typeof job.source === "object" && job.source ? job.source : {};
  const sourceSummary = {
    title: source.title || "",
    productId: source.productId || "",
    url: source.url || "",
    crawledAt: source.crawledAt || "",
    attributesCount: Array.isArray(source.attributes) ? source.attributes.length : 0,
    skuCount: Array.isArray(source.skuList) ? source.skuList.length : 0,
    reviewCount: Array.isArray(source.reviews) ? source.reviews.length : 0
  };

  const sections = [
    {
      title: "基本情報",
      value: {
        jobId: job.jobId || "",
        status: job.status || "",
        jobType: job.jobType || "draft",
        remoteJobId: job.remoteJobId || "",
        updatedAt: job.updatedAt || ""
      }
    },
    {
      title: "抽出元データ（概要）",
      value: sourceSummary
    },
    {
      title: "プロンプト",
      value: job.requestPrompt || "なし"
    },
    {
      title: "結果",
      value: job.result || "なし"
    },
    {
      title: "エラー",
      value: job.error || "なし"
    }
  ];

  return sections
    .map((section) => {
      const rendered = formatPlainText(section.value, 0);
      return `${section.title}\n${rendered}`;
    })
    .join("\n\n");
}

function selectJob(jobId) {
  const job = cacheJobs.find((item) => item.jobId === jobId);
  if (!job) {
    nodes.detail.textContent = "ジョブが見つかりません。";
    return;
  }
  nodes.detail.textContent = formatJobDetail(job);
}

function createActionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderJobs(jobs) {
  cacheJobs = jobs;
  nodes.jobsBody.innerHTML = "";

  if (!jobs.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "ジョブがありません。";
    tr.appendChild(td);
    nodes.jobsBody.appendChild(tr);
    return;
  }

  for (const job of jobs) {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.textContent = job.jobId;

    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status ${escapeHtml(job.status || "")}`;
    badge.textContent = job.status || "不明";
    statusTd.appendChild(badge);

    const titleTd = document.createElement("td");
    titleTd.textContent = (job.source && job.source.title) || "（タイトルなし）";

    const updatedTd = document.createElement("td");
    updatedTd.textContent = job.updatedAt || "";

    const actionsTd = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "job-actions";

    actionsWrap.appendChild(
      createActionButton("詳細", () => {
        selectJob(job.jobId);
      })
    );

    actionsWrap.appendChild(
      createActionButton("更新", async () => {
        await send("POLL_JOB", { jobId: job.jobId });
        await refreshJobs();
      })
    );

    actionsWrap.appendChild(
      createActionButton("再実行", async () => {
        await send("RETRY_JOB", { jobId: job.jobId });
        await refreshJobs();
      })
    );

    actionsWrap.appendChild(
      createActionButton("削除", async () => {
        await send("DELETE_JOB", { jobId: job.jobId });
        if (nodes.detail.textContent.includes(job.jobId)) {
          nodes.detail.textContent = "ジョブを選択してください。";
        }
        await refreshJobs();
      })
    );

    actionsTd.appendChild(actionsWrap);

    tr.appendChild(idTd);
    tr.appendChild(statusTd);
    tr.appendChild(titleTd);
    tr.appendChild(updatedTd);
    tr.appendChild(actionsTd);
    nodes.jobsBody.appendChild(tr);
  }
}

async function refreshJobs() {
  const jobs = await send("GET_JOBS");
  renderJobs(jobs);
}

function getExtractionKey(data) {
  if (!data || typeof data !== "object") {
    return "empty";
  }
  const productId = String(data.productId || "").trim();
  const url = String(data.url || "").trim();
  const crawledAt = String(data.crawledAt || "").trim();
  return `${productId}|${url}|${crawledAt}`;
}

function getSelectedExtraction() {
  if (!extractionHistory.length || !selectedExtractionKey) {
    return null;
  }
  return extractionHistory.find((item) => getExtractionKey(item) === selectedExtractionKey) || null;
}

function renderExtractionDetail(data) {
  nodes.lastExtraction.textContent = data ? JSON.stringify(data, null, 2) : "抽出結果はありません。";
  showPageCreateStatus("", false);
  setPageCreateButtonsDisabled(!data);

  if (!data) {
    nodes.extractionMetrics.textContent = "取得率: -";
    nodes.extractionMissing.textContent = "未取得項目: -";
    return;
  }

  const stats = data.extractionStats || null;
  const coverageText = stats
    ? `${stats.coveragePercent} (${stats.filledFields}/${stats.totalFields})`
    : "-";
  const patternCount = data.extractionPatternCount || 1;
  nodes.extractionMetrics.textContent = `取得率: ${coverageText} / 抽出パターン: ${patternCount}`;

  if (Array.isArray(data.missingFields) && data.missingFields.length) {
    nodes.extractionMissing.textContent = `未取得項目: ${data.missingFields.join(", ")}`;
  } else {
    nodes.extractionMissing.textContent = "未取得項目: なし";
  }
}

function renderExtractionHistoryList() {
  nodes.extractionHistoryList.innerHTML = "";
  nodes.extractionHistoryMeta.textContent = `履歴件数: ${extractionHistory.length}`;

  if (!extractionHistory.length) {
    const empty = document.createElement("div");
    empty.className = "extraction-history-empty";
    empty.textContent = "抽出履歴はありません。";
    nodes.extractionHistoryList.appendChild(empty);
    renderExtractionDetail(null);
    return;
  }

  extractionHistory.forEach((item, index) => {
    const key = getExtractionKey(item);
    const row = document.createElement("div");
    row.className = "extraction-history-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "extraction-history-item";
    if (key === selectedExtractionKey) {
      button.classList.add("active");
    }

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = item.title || "（タイトルなし）";

    const meta = document.createElement("span");
    meta.className = "meta";
    const productId = item.productId ? `ID:${item.productId}` : "ID: -";
    const crawledAt = item.crawledAt ? new Date(item.crawledAt).toLocaleString("ja-JP") : "日時: -";
    meta.textContent = `${productId} / ${crawledAt}`;

    button.appendChild(title);
    button.appendChild(meta);
    button.addEventListener("click", () => {
      selectedExtractionKey = key;
      renderExtractionHistoryList();
      renderExtractionDetail(item);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "extraction-history-delete";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      deleteButton.disabled = true;
      try {
        await send("DELETE_EXTRACTION_HISTORY_ITEM", { extractionKey: key });
        if (selectedExtractionKey === key) {
          selectedExtractionKey = "";
        }
        await refreshExtractionHistory();
        showStatus("抽出履歴を削除しました。", false);
      } catch (error) {
        showStatus(error.message || "抽出履歴の削除に失敗しました。", true);
      } finally {
        deleteButton.disabled = false;
      }
    });

    row.appendChild(button);
    row.appendChild(deleteButton);
    nodes.extractionHistoryList.appendChild(row);
  });
}

async function refreshExtractionHistory() {
  let history = [];

  try {
    history = await send("GET_EXTRACTION_HISTORY");
  } catch (_error) {
    const last = await send("GET_LAST_EXTRACTION");
    history = last ? [last] : [];
  }

  extractionHistory = Array.isArray(history) ? history : [];

  if (!extractionHistory.length) {
    selectedExtractionKey = "";
    renderExtractionHistoryList();
    return;
  }

  const keySet = new Set(extractionHistory.map((item) => getExtractionKey(item)));
  if (!selectedExtractionKey || !keySet.has(selectedExtractionKey)) {
    selectedExtractionKey = getExtractionKey(extractionHistory[0]);
  }

  renderExtractionHistoryList();
  const selectedIndex = extractionHistory.findIndex((item) => getExtractionKey(item) === selectedExtractionKey);
  renderExtractionDetail(selectedIndex >= 0 ? extractionHistory[selectedIndex] : extractionHistory[0]);
}

async function loadSettings() {
  const settings = await send("GET_SETTINGS");
  nodes.apiBaseUrl.value = settings.apiBaseUrl || "";
  nodes.toolPassword.value = settings.toolPassword || "";
  nodes.replicateApiKey.value = "";
  nodes.openRouterApiKey.value = "";
  nodes.secretPassphrase.value = "";
  nodes.clearReplicateApiKey.checked = false;
  nodes.clearOpenRouterApiKey.checked = false;
  nodes.timeoutSec.value = String(settings.timeoutSec || 60);
  nodes.pollIntervalSec.value = String(settings.pollIntervalSec || 5);
  nodes.promptDraftTemplate.value = settings.promptDraftTemplate || settings.defaultTemplate || DRAFT_PROMPT_DEFAULT;
  nodes.promptImproveTemplate.value = settings.promptImproveTemplate || IMPROVE_PROMPT_DEFAULT;

  const keyNotes = [];
  keyNotes.push(`Replicate key: ${settings.hasReplicateApiKey ? "保存済み" : "未保存"}`);
  keyNotes.push(`OpenRouter key: ${settings.hasOpenRouterApiKey ? "保存済み" : "未保存"}`);
  nodes.keyStatus.textContent = keyNotes.join(" / ");
}

async function saveSettings(event) {
  event.preventDefault();

  const replicateApiKey = nodes.replicateApiKey.value.trim();
  const openRouterApiKey = nodes.openRouterApiKey.value.trim();
  const clearReplicateApiKey = nodes.clearReplicateApiKey.checked;
  const clearOpenRouterApiKey = nodes.clearOpenRouterApiKey.checked;
  const secretPassphrase = nodes.secretPassphrase.value;
  const keyUpdateRequested = Boolean(replicateApiKey || openRouterApiKey || clearReplicateApiKey || clearOpenRouterApiKey);

  if (keyUpdateRequested && !secretPassphrase.trim()) {
    showStatus("APIキー保存/削除には暗号化パスフレーズが必要です。", true);
    return;
  }

  const payload = {
    apiBaseUrl: nodes.apiBaseUrl.value.trim(),
    toolPassword: nodes.toolPassword.value,
    timeoutSec: Number(nodes.timeoutSec.value || 60),
    pollIntervalSec: Number(nodes.pollIntervalSec.value || 5),
    defaultTemplate: nodes.promptDraftTemplate.value,
    promptDraftTemplate: nodes.promptDraftTemplate.value,
    promptImproveTemplate: nodes.promptImproveTemplate.value
  };

  if (replicateApiKey) {
    payload.replicateApiKey = replicateApiKey;
  }
  if (openRouterApiKey) {
    payload.openRouterApiKey = openRouterApiKey;
  }
  if (clearReplicateApiKey) {
    payload.clearReplicateApiKey = true;
  }
  if (clearOpenRouterApiKey) {
    payload.clearOpenRouterApiKey = true;
  }
  if (keyUpdateRequested) {
    payload.secretPassphrase = secretPassphrase;
  }

  try {
    await send("SAVE_SETTINGS", { payload });
    await loadSettings();
    showStatus("設定を保存しました。", false);
  } catch (error) {
    showStatus(error.message || "設定保存に失敗しました。", true);
  }
}

async function runOnActiveTab() {
  nodes.runBtn.disabled = true;
  try {
    await send("RUN_EXTRACTION_ON_ACTIVE_TAB");
    await refreshJobs();
    await refreshExtractionHistory();
    await refreshDebugLogs().catch(() => {});
    showStatus("解析ジョブを作成しました。", false);
  } catch (error) {
    await refreshDebugLogs().catch(() => {});
    showStatus(error.message || "解析に失敗しました。", true);
  } finally {
    nodes.runBtn.disabled = false;
  }
}

async function runPageCreateJob(mode) {
  const selected = getSelectedExtraction();
  if (!selected) {
    showPageCreateStatus("抽出結果を選択してください。", true);
    return;
  }

  setPageCreateButtonsDisabled(true);
  const modeLabel = mode === "improve" ? "改善" : "ドラフト作成";

  try {
    const result = await send("RUN_PAGE_CREATE_FROM_EXTRACTION", {
      mode,
      sourceData: selected
    });

    await refreshJobs();
    await refreshDebugLogs().catch(() => {});
    switchTab("page-create");

    const status = result && result.status ? result.status : "queued";
    showPageCreateStatus(`${modeLabel}ジョブを実行しました。jobId: ${result.jobId || "-"} / status: ${status}`, false);
    showStatus(`${modeLabel}ジョブを実行しました。`, false);
  } catch (error) {
    await refreshDebugLogs().catch(() => {});
    showPageCreateStatus(error.message || `${modeLabel}ジョブの実行に失敗しました。`, true);
  } finally {
    setPageCreateButtonsDisabled(false);
  }
}

nodes.form.addEventListener("submit", saveSettings);
nodes.runBtn.addEventListener("click", runOnActiveTab);
nodes.createDraftBtn.addEventListener("click", () => {
  runPageCreateJob("draft").catch((error) => {
    showPageCreateStatus(error.message || "ドラフト作成ジョブの実行に失敗しました。", true);
  });
});
nodes.createImproveBtn.addEventListener("click", () => {
  runPageCreateJob("improve").catch((error) => {
    showPageCreateStatus(error.message || "改善ジョブの実行に失敗しました。", true);
  });
});
nodes.refreshBtn.addEventListener("click", refreshJobs);
nodes.refreshExtractionBtn.addEventListener("click", refreshExtractionHistory);
nodes.refreshDebugBtn.addEventListener("click", () => {
  refreshDebugLogs().catch((error) => {
    showStatus(error.message || "ログ取得に失敗しました。", true);
  });
});
nodes.clearDebugBtn.addEventListener("click", () => {
  clearDebugLogs().catch((error) => {
    showStatus(error.message || "ログクリアに失敗しました。", true);
  });
});
for (const button of nodes.tabButtons) {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab || "product-data");
  });
}

(async () => {
  try {
    switchTab("product-data");
    await loadSettings();
    await refreshJobs();
    await refreshExtractionHistory();
    await refreshDebugLogs();
  } catch (error) {
    showStatus(error.message || "初期化エラー", true);
  }
})();
