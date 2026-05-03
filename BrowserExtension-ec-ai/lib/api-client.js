async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function normalizeApiError(payload, fallbackMessage) {
  return {
    code: payload.code || "UNKNOWN_ERROR",
    message: payload.message || fallbackMessage || "Unknown API error",
    retryable: Boolean(payload.retryable)
  };
}

async function submitJob(apiBaseUrl, password, payload, timeoutSec) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec || 60, 1) * 1000);

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/v1/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...payload, password }),
      signal: controller.signal
    });

    const body = await parseJsonSafe(response);
    if (!response.ok) {
      throw normalizeApiError(body, `Job submission failed (${response.status})`);
    }

    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJobResult(apiBaseUrl, remoteJobId, timeoutSec) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec || 60, 1) * 1000);

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/v1/jobs/${encodeURIComponent(remoteJobId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    const body = await parseJsonSafe(response);
    if (!response.ok) {
      throw normalizeApiError(body, `Result fetch failed (${response.status})`);
    }

    return body;
  } finally {
    clearTimeout(timer);
  }
}

globalThis.ApiClient = {
  submitJob,
  fetchJobResult,
  normalizeApiError
};
