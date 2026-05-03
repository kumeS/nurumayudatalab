importScripts("lib/storage.js", "lib/prompt-template.js", "lib/api-client.js");

const TERMINAL_STATUS = new Set(["done", "failed"]);

function toErrorDetails(error) {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    code: error.code || "RUNTIME_ERROR",
    message: error.message || "予期しないランタイムエラー",
    stack: error.stack || ""
  };
}

async function logDebug(level, source, message, details = null) {
  try {
    await StorageRepo.appendDebugLog({ level, source, message, details });
  } catch (_error) {
    // Logging must never break the main flow.
  }
}

function createLocalJobId() {
  return `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeSourceData(sourceData) {
  if (!sourceData) {
    return null;
  }

  if (typeof sourceData === "string") {
    try {
      const parsed = JSON.parse(sourceData);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  if (typeof sourceData === "object") {
    try {
      return JSON.parse(JSON.stringify(sourceData));
    } catch (_error) {
      return null;
    }
  }

  return null;
}

function resolveJobMode(mode) {
  return mode === "improve" ? "improve" : "draft";
}

function resolveTemplateByMode(settings, mode) {
  if (mode === "improve") {
    return settings.promptImproveTemplate || settings.promptDraftTemplate || settings.defaultTemplate;
  }
  return settings.promptDraftTemplate || settings.defaultTemplate;
}

function is1688Url(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith("1688.com");
  } catch (_error) {
    return false;
  }
}

async function getActiveTab() {
  const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const current = currentTabs[0];

  if (current && is1688Url(current.url || "")) {
    return current;
  }

  const activeTabs = await chrome.tabs.query({ active: true });
  const active1688 = activeTabs.find((tab) => is1688Url(tab.url || ""));
  if (active1688) {
    return active1688;
  }

  const all1688 = await chrome.tabs.query({ url: ["https://*.1688.com/*"] });
  if (all1688.length) {
    all1688.sort((a, b) => Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0));
    return all1688[0];
  }

  return current;
}

async function schedulePoll(jobId, seconds) {
  const delayMs = Math.max(2, Number(seconds) || 5) * 1000;
  await chrome.alarms.create(`poll:${jobId}`, { when: Date.now() + delayMs });
}

async function cancelPoll(jobId) {
  await chrome.alarms.clear(`poll:${jobId}`);
}

async function runExtractionOnActiveTab() {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id || !activeTab.url) {
    await logDebug("error", "background", "アクティブなタブ取得に失敗", { activeTab: activeTab || null });
    throw { code: "ACTIVE_TAB_NOT_FOUND", message: "アクティブなタブが見つかりません" };
  }

  await logDebug("info", "background", "解析対象タブを選択", {
    tabId: activeTab.id,
    url: activeTab.url
  });

  if (!is1688Url(activeTab.url)) {
    await logDebug("warn", "background", "1688以外のページで解析要求", { url: activeTab.url });
    throw {
      code: "UNSUPPORTED_PAGE",
      message: "1688の商品ページが見つかりません。上部の「1688ページを開く」リンクから対象ページを開いてください。"
    };
  }

  // 新しいウィンドウを作成して対象ページを開く
  const newWindow = await chrome.windows.create({
    url: activeTab.url,
    type: "normal",
    width: 1200,
    height: 800,
    focused: false
  });

  // ウィンドウ内のタブを取得
  const tabs = await chrome.tabs.query({ windowId: newWindow.id });
  const newTab = tabs.find((tab) => tab.url === activeTab.url);

  if (!newTab || !newTab.id) {
    await logDebug("error", "background", "新規ウィンドウのタブ取得失敗", { url: activeTab.url });
    throw { code: "WINDOW_CREATION_FAILED", message: "新規ウィンドウの作成に失敗しました" };
  }

  // ページが読み込まれるまで待機
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.windows.remove(newWindow.id);
      reject({ code: "TIMEOUT", message: "ページ読み込みがタイムアウトしました" });
    }, 15000);

    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === newTab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  let extraction = null;
  try {
    // データ抽出を実行
    extraction = await chrome.tabs.sendMessage(newTab.id, { type: "EXTRACT_PRODUCT" });
    if (!extraction || !extraction.ok) {
      await logDebug("warn", "background", "抽出結果が失敗として返却", {
        tabId: newTab.id,
        error: extraction && extraction.error ? extraction.error : null
      });

      if (extraction && extraction.data) {
        await StorageRepo.appendExtractionHistory(extraction.data);
      }

      if (extraction && extraction.error) {
        const partial = extraction.data || null;
        if (partial && partial.extractionStats) {
          const stats = partial.extractionStats;
          const missing = Array.isArray(partial.missingFields) ? partial.missingFields.slice(0, 8).join(", ") : "";
          throw {
            ...extraction.error,
            message: `${extraction.error.message} (取得率: ${stats.coveragePercent}${missing ? ` / 未取得: ${missing}` : ""})`
          };
        }
      }

      throw extraction && extraction.error ? extraction.error : { code: "EXTRACTION_FAILED", message: "商品データの抽出に失敗しました" };
    }
  } finally {
    // ウィンドウを閉じる
    await chrome.windows.remove(newWindow.id);
  }

  if (!extraction || !extraction.data) {
    await logDebug("error", "background", "抽出データが空", { tabId: newTab.id });
    throw { code: "EXTRACTION_EMPTY", message: "抽出データが取得できませんでした" };
  }

  await logDebug("info", "background", "抽出データ取得成功", {
    tabId: newTab.id,
    title: extraction.data.title || "",
    coverage: extraction.data.extractionStats ? extraction.data.extractionStats.coveragePercent : "-"
  });

  const settings = await StorageRepo.readSettings();
  const draftTemplate = settings.promptDraftTemplate || settings.defaultTemplate;
  await StorageRepo.appendExtractionHistory(extraction.data);

  const jobId = createLocalJobId();
  const prompt = PromptTemplate.buildPrompt(extraction.data, draftTemplate);
  const job = {
    jobId,
    status: "queued",
    source: extraction.data,
    requestPrompt: prompt,
    result: null,
    error: null
  };
  await StorageRepo.upsertJob(job);

  if (!settings.apiBaseUrl || !settings.toolPassword) {
    await logDebug("warn", "background", "設定不足でジョブ送信をスキップ", {
      jobId,
      hasApiBaseUrl: Boolean(settings.apiBaseUrl),
      hasToolPassword: Boolean(settings.toolPassword)
    });
    await StorageRepo.upsertJob({
      jobId,
      status: "failed",
      error: {
        code: "SETTINGS_INCOMPLETE",
        message: "apiBaseUrl と toolPassword は必須です",
        retryable: false
      }
    });
    return { jobId, status: "failed" };
  }

  try {
    const submitResponse = await ApiClient.submitJob(
      settings.apiBaseUrl,
      settings.toolPassword,
      {
        sourceData: extraction.data,
        template: draftTemplate,
        lang: "ja",
        prompt
      },
      settings.timeoutSec
    );

    await StorageRepo.upsertJob({
      jobId,
      remoteJobId: submitResponse.jobId || submitResponse.id || jobId,
      status: submitResponse.status || "processing"
    });

    await schedulePoll(jobId, settings.pollIntervalSec);
    await logDebug("info", "background", "ジョブ送信成功", {
      jobId,
      remoteJobId: submitResponse.jobId || submitResponse.id || jobId,
      status: submitResponse.status || "processing"
    });
    return { jobId, status: submitResponse.status || "processing" };
  } catch (error) {
    await logDebug("error", "background", "ジョブ送信失敗", {
      jobId,
      error: toErrorDetails(error)
    });
    await StorageRepo.upsertJob({
      jobId,
      status: "failed",
      error: ApiClient.normalizeApiError(error || {}, "ジョブ送信に失敗しました")
    });
    return { jobId, status: "failed" };
  }
}

async function runPageCreateFromExtraction(sourceDataInput, requestedMode) {
  const sourceData = normalizeSourceData(sourceDataInput);
  if (!sourceData) {
    throw { code: "INVALID_SOURCE_DATA", message: "抽出結果データが不正です" };
  }

  const mode = resolveJobMode(requestedMode);
  const settings = await StorageRepo.readSettings();
  const template = resolveTemplateByMode(settings, mode);
  const prompt = PromptTemplate.buildPrompt(sourceData, template);

  const jobId = createLocalJobId();
  await StorageRepo.upsertJob({
    jobId,
    status: "queued",
    source: sourceData,
    requestPrompt: prompt,
    result: null,
    error: null,
    jobType: mode
  });

  if (!settings.apiBaseUrl || !settings.toolPassword) {
    await StorageRepo.upsertJob({
      jobId,
      status: "failed",
      error: {
        code: "SETTINGS_INCOMPLETE",
        message: "apiBaseUrl と toolPassword は必須です",
        retryable: false
      }
    });
    return { jobId, status: "failed" };
  }

  try {
    const submitResponse = await ApiClient.submitJob(
      settings.apiBaseUrl,
      settings.toolPassword,
      {
        sourceData,
        template,
        lang: "ja",
        prompt,
        mode
      },
      settings.timeoutSec
    );

    await StorageRepo.upsertJob({
      jobId,
      remoteJobId: submitResponse.jobId || submitResponse.id || jobId,
      status: submitResponse.status || "processing",
      jobType: mode
    });

    await schedulePoll(jobId, settings.pollIntervalSec);
    await logDebug("info", "background", "page create job submitted", {
      jobId,
      mode,
      remoteJobId: submitResponse.jobId || submitResponse.id || jobId,
      status: submitResponse.status || "processing"
    });
    return { jobId, status: submitResponse.status || "processing", mode };
  } catch (error) {
    await logDebug("error", "background", "page create job submit failed", {
      jobId,
      mode,
      error: toErrorDetails(error)
    });
    await StorageRepo.upsertJob({
      jobId,
      status: "failed",
      jobType: mode,
      error: ApiClient.normalizeApiError(error || {}, "ジョブ送信に失敗しました")
    });
    return { jobId, status: "failed", mode };
  }
}

async function pollJob(localJobId) {
  const jobs = await StorageRepo.readJobs();
  const job = jobs.find((item) => item.jobId === localJobId);
  if (!job) {
    return null;
  }

  const settings = await StorageRepo.readSettings();
  if (!job.remoteJobId || !settings.apiBaseUrl) {
    await StorageRepo.upsertJob({
      jobId: localJobId,
      status: "failed",
      error: { code: "REMOTE_JOB_ID_MISSING", message: "remoteJobId がありません", retryable: false }
    });
    return null;
  }

  try {
    const result = await ApiClient.fetchJobResult(settings.apiBaseUrl, job.remoteJobId, settings.timeoutSec);
    const status = result.status || "processing";

    await StorageRepo.upsertJob({
      jobId: localJobId,
      status,
      result: result.result || result.output || null,
      error: result.error || null
    });

    if (!TERMINAL_STATUS.has(status)) {
      await schedulePoll(localJobId, settings.pollIntervalSec);
    } else {
      await cancelPoll(localJobId);
    }

    return result;
  } catch (error) {
    await StorageRepo.upsertJob({
      jobId: localJobId,
      status: "failed",
      error: ApiClient.normalizeApiError(error || {}, "ジョブ状態の取得に失敗しました")
    });
    await cancelPoll(localJobId);
    return null;
  }
}

async function retryJob(localJobId) {
  const jobs = await StorageRepo.readJobs();
  const existing = jobs.find((item) => item.jobId === localJobId);
  if (!existing) {
    throw { code: "JOB_NOT_FOUND", message: "ジョブが見つかりません" };
  }

  const settings = await StorageRepo.readSettings();
  if (!settings.apiBaseUrl || !settings.toolPassword) {
    throw { code: "SETTINGS_INCOMPLETE", message: "apiBaseUrl と toolPassword は必須です" };
  }

  const mode = resolveJobMode(existing.jobType);
  const template = resolveTemplateByMode(settings, mode);

  const submitResponse = await ApiClient.submitJob(
    settings.apiBaseUrl,
    settings.toolPassword,
    {
      sourceData: existing.source,
      template,
      lang: "ja",
      prompt: existing.requestPrompt,
      mode
    },
    settings.timeoutSec
  );

  await StorageRepo.upsertJob({
    jobId: localJobId,
    remoteJobId: submitResponse.jobId || submitResponse.id || existing.remoteJobId,
    status: submitResponse.status || "processing",
    jobType: mode,
    error: null
  });

  await schedulePoll(localJobId, settings.pollIntervalSec);
  return { jobId: localJobId, status: submitResponse.status || "processing" };
}

self.addEventListener("error", (event) => {
  logDebug("error", "background", "service worker error", {
    message: event.message || "",
    filename: event.filename || "",
    lineno: event.lineno || 0,
    colno: event.colno || 0,
    error: toErrorDetails(event.error)
  });
});

self.addEventListener("unhandledrejection", (event) => {
  logDebug("error", "background", "service worker unhandled rejection", {
    reason: toErrorDetails(event.reason)
  });
});

chrome.runtime.onInstalled.addListener(async () => {
  await StorageRepo.writeSettings({});
  await logDebug("info", "background", "extension installed or updated", null);
});

chrome.action.onClicked.addListener(async () => {
  await logDebug("info", "background", "open options page from action button", null);
  await chrome.runtime.openOptionsPage();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm || !alarm.name || !alarm.name.startsWith("poll:")) {
    return;
  }
  const localJobId = alarm.name.replace("poll:", "");
  await logDebug("debug", "background", "poll alarm triggered", { localJobId });
  await pollJob(localJobId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message && message.type) {
      case "ADD_DEBUG_LOG": {
        const payload = message.payload || {};
        await StorageRepo.appendDebugLog({
          level: payload.level || "info",
          source: payload.source || "content-script",
          message: payload.message || "",
          details: payload.details || null
        });
        sendResponse({ ok: true, data: true });
        return;
      }
      case "GET_DEBUG_LOGS": {
        const logs = await StorageRepo.readDebugLogs();
        sendResponse({ ok: true, data: logs });
        return;
      }
      case "CLEAR_DEBUG_LOGS": {
        await StorageRepo.clearDebugLogs();
        sendResponse({ ok: true, data: true });
        return;
      }
      case "OPEN_MANAGER_PAGE": {
        try {
          await chrome.runtime.openOptionsPage();
          await logDebug("info", "background", "open manager page via openOptionsPage", null);
          sendResponse({ ok: true, data: { openedBy: "openOptionsPage" } });
          return;
        } catch (openError) {
          const managerUrl = chrome.runtime.getURL("options/manager.html");
          await chrome.tabs.create({ url: managerUrl, active: true });
          await logDebug("warn", "background", "openOptionsPage failed, fallback to tabs.create", {
            error: toErrorDetails(openError)
          });
          sendResponse({ ok: true, data: { openedBy: "tabs.create" } });
        }
        return;
      }
      case "RUN_EXTRACTION_ON_ACTIVE_TAB": {
        const result = await runExtractionOnActiveTab();
        sendResponse({ ok: true, data: result });
        return;
      }
      case "RUN_PAGE_CREATE_FROM_EXTRACTION": {
        const result = await runPageCreateFromExtraction(message.sourceData, message.mode);
        sendResponse({ ok: true, data: result });
        return;
      }
      case "GET_JOBS": {
        const jobs = await StorageRepo.readJobs();
        sendResponse({ ok: true, data: jobs });
        return;
      }
      case "DELETE_JOB": {
        const jobs = await StorageRepo.deleteJob(message.jobId);
        await cancelPoll(message.jobId);
        sendResponse({ ok: true, data: jobs });
        return;
      }
      case "RETRY_JOB": {
        const result = await retryJob(message.jobId);
        sendResponse({ ok: true, data: result });
        return;
      }
      case "POLL_JOB": {
        const result = await pollJob(message.jobId);
        sendResponse({ ok: true, data: result });
        return;
      }
      case "GET_SETTINGS": {
        const settings = await StorageRepo.readSettings({ forUi: true });
        sendResponse({ ok: true, data: settings });
        return;
      }
      case "SAVE_SETTINGS": {
        const settings = await StorageRepo.writeSettings(message.payload || {});
        sendResponse({ ok: true, data: settings });
        return;
      }
      case "DECRYPT_API_KEYS": {
        if (!message.passphrase) {
          throw { code: "PASSPHRASE_REQUIRED", message: "暗号化パスフレーズを入力してください" };
        }
        const keys = await StorageRepo.decryptApiKeys(message.passphrase);
        sendResponse({ ok: true, data: keys });
        return;
      }
      case "SAVE_LAST_EXTRACTION": {
        if (message.payload && typeof message.payload === "object") {
          await StorageRepo.appendExtractionHistory(message.payload);
        } else {
          await StorageRepo.storageSet(StorageRepo.STORAGE_KEYS.lastExtraction, null);
        }
        sendResponse({ ok: true, data: true });
        return;
      }
      case "GET_LAST_EXTRACTION": {
        const lastExtraction = await StorageRepo.storageGet(StorageRepo.STORAGE_KEYS.lastExtraction, null);
        sendResponse({ ok: true, data: lastExtraction });
        return;
      }
      case "GET_EXTRACTION_HISTORY": {
        const history = await StorageRepo.readExtractionHistory();
        sendResponse({ ok: true, data: history });
        return;
      }
      case "DELETE_EXTRACTION_HISTORY_ITEM": {
        const history = await StorageRepo.deleteExtractionHistoryItem(message.extractionKey);
        sendResponse({ ok: true, data: history });
        return;
      }
      default:
        await logDebug("warn", "background", "unknown message type", {
          type: message && message.type ? message.type : ""
        });
        sendResponse({ ok: false, error: { code: "UNKNOWN_MESSAGE", message: "不明なメッセージタイプです" } });
    }
  })().catch((error) => {
    const normalized = {
      code: error && error.code ? error.code : "RUNTIME_ERROR",
      message: error && error.message ? error.message : "予期しないランタイムエラー"
    };

    logDebug("error", "background", "runtime message handler error", {
      type: message && message.type ? message.type : "",
      error: toErrorDetails(error)
    });

    sendResponse({
      ok: false,
      error: normalized
    });
  });

  return true;
});
