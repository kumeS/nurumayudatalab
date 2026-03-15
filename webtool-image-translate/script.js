const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const formatSelect = document.getElementById("formatSelect");
const qualityWrap = document.getElementById("qualityWrap");
const qualityRange = document.getElementById("qualityRange");
const qualityValue = document.getElementById("qualityValue");
const resizeToggle = document.getElementById("resizeToggle");
const convertButton = document.getElementById("convertButton");
const convertZipButton = document.getElementById("convertZipButton");
const downloadAllButton = document.getElementById("downloadAllButton");
const clearButton = document.getElementById("clearButton");
const downloadList = document.getElementById("downloadList");
const statusText = document.getElementById("statusText");
const inputGallery = document.getElementById("inputGallery");
const outputGallery = document.getElementById("outputGallery");
const inputPlaceholder = document.getElementById("inputPlaceholder");
const outputPlaceholder = document.getElementById("outputPlaceholder");

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const DEFAULT_MAX_LONG_EDGE = 1920;
const MAX_CONCURRENT_CONVERSIONS = Math.min(
  6,
  Math.max(2, Math.floor((navigator.hardwareConcurrency || 4) * 0.75))
);
const MAX_CONCURRENT_HEIC_CONVERSIONS = 2;
const FILE_CONVERSION_TIMEOUT_MS = 60000;
let selectedFiles = [];
let convertedBlobUrls = [];
let convertedResults = [];
let inputPreviewBlobUrls = [];
const normalizedBlobPromiseCache = new Map();
let activeHeicConversions = 0;
const heicWaitQueue = [];
let isPreviewLoading = false;
let isConverting = false;
let previewLoadedCount = 0;
let previewTotalCount = 0;
let pendingConversionMode = null;
let previewBatchToken = 0;

function revokeInputPreviewBlobUrls() {
  for (const blobUrl of inputPreviewBlobUrls) {
    URL.revokeObjectURL(blobUrl);
  }
  inputPreviewBlobUrls = [];
}

function revokeConvertedBlobUrls() {
  for (const blobUrl of convertedBlobUrls) {
    URL.revokeObjectURL(blobUrl);
  }
  convertedBlobUrls = [];
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#b00020" : "";
}

function queueConversionMode(autoZipDownload) {
  if (autoZipDownload) {
    pendingConversionMode = "zip";
    return;
  }

  if (!pendingConversionMode) {
    pendingConversionMode = "convert";
  }
}

function getLoadingStatusText() {
  return `画像読み込み中... ${previewLoadedCount}/${previewTotalCount}`;
}

function isHeicFile(file) {
  const lowerName = file.name.toLowerCase();
  return (
    HEIC_MIME_TYPES.has(file.type) ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  );
}

function outputExtensionFromMime(mime) {
  return mime === "image/png" ? "png" : "jpg";
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} がタイムアウトしました。`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function acquireHeicSlot() {
  if (activeHeicConversions < MAX_CONCURRENT_HEIC_CONVERSIONS) {
    activeHeicConversions += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    heicWaitQueue.push(resolve);
  }).then(() => {
    activeHeicConversions += 1;
  });
}

function releaseHeicSlot() {
  activeHeicConversions = Math.max(0, activeHeicConversions - 1);
  const next = heicWaitQueue.shift();
  if (next) {
    next();
  }
}

function getResizeDimensions(width, height, shouldResize) {
  if (!shouldResize) {
    return { width, height, resized: false };
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= DEFAULT_MAX_LONG_EDGE) {
    return { width, height, resized: false };
  }

  const scale = DEFAULT_MAX_LONG_EDGE / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true
  };
}

async function decodeImageSource(fileOrBlob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(fileOrBlob);
    } catch (_error) {
      // Fallback to Image decode below.
    }
  }

  return new Promise((resolve, reject) => {
    const localUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(localUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(localUrl);
      reject(new Error("画像のデコードに失敗しました。"));
    };

    img.src = localUrl;
  });
}

async function normalizeInputToBlob(file) {
  if (!isHeicFile(file)) {
    return file;
  }

  if (typeof heic2any !== "function") {
    throw new Error("heic2any の読み込みに失敗しました。ページを再読み込みしてください。");
  }

  await acquireHeicSlot();
  try {
    const converted = await withTimeout(
      heic2any({
        blob: file,
        toType: "image/png"
      }),
      FILE_CONVERSION_TIMEOUT_MS,
      `${file.name} のHEIC変換`
    );

    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) {
      throw new Error("HEIC変換結果が不正です。別ファイルでお試しください。");
    }

    return blob;
  } finally {
    releaseHeicSlot();
  }
}

function getNormalizedBlobCached(file) {
  const key = fileFingerprint(file);
  if (normalizedBlobPromiseCache.has(key)) {
    return normalizedBlobPromiseCache.get(key);
  }

  const promise = normalizeInputToBlob(file).catch((error) => {
    normalizedBlobPromiseCache.delete(key);
    throw error;
  });

  normalizedBlobPromiseCache.set(key, promise);
  return promise;
}

async function normalizeInputToImage(file) {
  const blob = await getNormalizedBlobCached(file);
  return decodeImageSource(blob);
}

async function updateInputPreviewList(files, addedCount) {
  revokeInputPreviewBlobUrls();
  inputGallery.innerHTML = "";
  previewBatchToken += 1;
  const currentBatch = previewBatchToken;
  previewLoadedCount = 0;
  previewTotalCount = files.length;
  isPreviewLoading = files.length > 0;

  if (isPreviewLoading && !isConverting) {
    setStatus(getLoadingStatusText());
  }

  const previewTasks = [];

  const markPreviewLoaded = () => {
    if (currentBatch !== previewBatchToken) {
      return;
    }

    previewLoadedCount += 1;
    if (!isConverting) {
      setStatus(getLoadingStatusText());
    }
  };

  for (const file of files) {
    const wrapper = document.createElement("div");
    wrapper.className = "input-thumb";

    const name = document.createElement("div");
    name.className = "input-thumb-name";
    name.textContent = file.name;

    const loadingBox = document.createElement("div");
    loadingBox.className = "input-thumb-error";
    loadingBox.style.color = "#2d6f75";
    loadingBox.style.borderColor = "rgba(45, 111, 117, 0.35)";
    loadingBox.style.background = "rgba(45, 111, 117, 0.08)";
    loadingBox.textContent = "読み込み中";

    wrapper.appendChild(loadingBox);
    wrapper.appendChild(name);
    inputGallery.appendChild(wrapper);

    if (!isHeicFile(file)) {
      const previewUrl = URL.createObjectURL(file);
      inputPreviewBlobUrls.push(previewUrl);

      const img = document.createElement("img");
      img.src = previewUrl;
      img.alt = `${file.name} の入力プレビュー`;
      wrapper.replaceChild(img, loadingBox);
      markPreviewLoaded();
      continue;
    }

    const heicTask = getNormalizedBlobCached(file)
      .then((previewBlob) => {
        const previewUrl = URL.createObjectURL(previewBlob);
        inputPreviewBlobUrls.push(previewUrl);

        const img = document.createElement("img");
        img.src = previewUrl;
        img.alt = `${file.name} の入力プレビュー`;
        wrapper.replaceChild(img, loadingBox);
      })
      .catch(() => {
        const errorBox = document.createElement("div");
        errorBox.className = "input-thumb-error";
        errorBox.textContent = "表示失敗";
        wrapper.replaceChild(errorBox, loadingBox);
      })
      .finally(() => {
        markPreviewLoaded();
      });

    previewTasks.push(heicTask);
  }

  inputGallery.hidden = false;
  inputPlaceholder.hidden = true;

  await Promise.allSettled(previewTasks);

  if (currentBatch !== previewBatchToken) {
    return;
  }

  isPreviewLoading = false;
  const queuedMode = pendingConversionMode;
  pendingConversionMode = null;

  if (queuedMode) {
    if (!isConverting) {
      setStatus("画像読み込み完了。変換を開始します...");
      await runConversion(queuedMode === "zip");
    }
    return;
  }

  if (!isConverting) {
    setStatus(`選択中: ${files.length}枚（今回追加: ${addedCount}枚）`);
  }
}

function resetOutput() {
  revokeConvertedBlobUrls();
  convertedResults = [];
  outputGallery.hidden = true;
  outputGallery.innerHTML = "";
  outputPlaceholder.hidden = false;
  outputPlaceholder.textContent = "未変換";
  downloadList.hidden = true;
  downloadList.innerHTML = "";
  downloadAllButton.disabled = true;
  downloadAllButton.hidden = true;
}

function setActionButtonsDisabled(isDisabled) {
  convertButton.disabled = isDisabled || selectedFiles.length === 0;
  convertZipButton.disabled = isDisabled || selectedFiles.length === 0;
  clearButton.disabled = isDisabled;
}

function fileFingerprint(file) {
  return `${file.name}__${file.size}__${file.lastModified}`;
}

function mergeFiles(existingFiles, incomingFiles) {
  const seen = new Set(existingFiles.map(fileFingerprint));
  const mergedFiles = [...existingFiles];
  let addedCount = 0;

  for (const file of incomingFiles) {
    const key = fileFingerprint(file);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    mergedFiles.push(file);
    addedCount += 1;
  }

  return { mergedFiles, addedCount };
}

function onFilesSelected(files, options = {}) {
  const { addedCount = files.length } = options;
  selectedFiles = files;

  const activeKeys = new Set(files.map(fileFingerprint));
  for (const key of normalizedBlobPromiseCache.keys()) {
    if (!activeKeys.has(key)) {
      normalizedBlobPromiseCache.delete(key);
    }
  }

  convertButton.disabled = files.length === 0;
  convertZipButton.disabled = files.length === 0;
  resetOutput();
  if (files.length) {
    void updateInputPreviewList(files, addedCount);
    return;
  }

  pendingConversionMode = null;
  isPreviewLoading = false;
  previewTotalCount = 0;
  previewLoadedCount = 0;
  previewBatchToken += 1;
  inputGallery.hidden = true;
  inputGallery.innerHTML = "";
  inputPlaceholder.hidden = false;
  setStatus("ファイルを選択してください");
}

function handleIncomingFiles(fileList) {
  if (!fileList || !fileList.length) {
    return;
  }

  const candidates = Array.from(fileList);
  const validFiles = candidates.filter(
    (file) => file.type.startsWith("image/") || isHeicFile(file)
  );

  if (!validFiles.length) {
    setStatus("画像ファイルを選択してください。", true);
    return;
  }

  const { mergedFiles, addedCount } = mergeFiles(selectedFiles, validFiles);
  if (!addedCount) {
    setStatus(`既に選択済みです: 合計 ${selectedFiles.length}枚`);
    return;
  }

  onFilesSelected(mergedFiles, { addedCount });
}

fileInput.addEventListener("change", (event) => {
  handleIncomingFiles(event.target.files);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (eventName === "drop") {
      handleIncomingFiles(event.dataTransfer.files);
    }
    dropZone.classList.remove("dragover");
  });
});

formatSelect.addEventListener("change", () => {
  syncQualityVisibility();
});

function syncQualityVisibility() {
  const isJpeg = formatSelect.value === "image/jpeg";
  qualityWrap.hidden = !isJpeg;
  qualityWrap.classList.toggle("force-hidden", !isJpeg);
}

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = Number(qualityRange.value).toFixed(2);
});

async function runConversion(autoZipDownload = false) {
  if (!selectedFiles.length) {
    setStatus("先に画像ファイルを選択してください。", true);
    return false;
  }

  if (isPreviewLoading) {
    queueConversionMode(autoZipDownload);
    setStatus(`${getLoadingStatusText()}（完了後に変換を実行します）`);
    return false;
  }

  isConverting = true;

  resetOutput();
  setActionButtonsDisabled(true);

  try {
    const total = selectedFiles.length;
    const mimeType = formatSelect.value;
    const quality = mimeType === "image/jpeg" ? Number(qualityRange.value) : undefined;
    const shouldResize = resizeToggle.checked;

    const results = [];
    let resizedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let nextIndex = 0;

    outputGallery.innerHTML = "";
    outputGallery.hidden = false;
    outputPlaceholder.hidden = true;

    downloadList.innerHTML = "";
    downloadList.hidden = false;

    const convertSingleFile = async (file) => {
      const image = await withTimeout(
        normalizeInputToImage(file),
        FILE_CONVERSION_TIMEOUT_MS,
        `${file.name} の読み込み`
      );
      const canvas = document.createElement("canvas");

      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const target = getResizeDimensions(sourceWidth, sourceHeight, shouldResize);

      canvas.width = target.width;
      canvas.height = target.height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvasコンテキストを取得できませんでした。");
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (typeof image.close === "function") {
        image.close();
      }

      const outputBlob = await withTimeout(
        new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("画像の出力に失敗しました。"));
              }
            },
            mimeType,
            quality
          );
        }),
        FILE_CONVERSION_TIMEOUT_MS,
        `${file.name} の出力`
      );

      const extension = outputExtensionFromMime(mimeType);
      const baseName = file.name.replace(/\.[^.]+$/, "") || "converted-image";
      const filename = `${baseName}.${extension}`;
      const blobUrl = URL.createObjectURL(outputBlob);

      return {
        filename,
        blobUrl,
        blob: outputBlob,
        width: canvas.width,
        height: canvas.height,
        resized: target.resized
      };
    };

    const workerCount = Math.min(MAX_CONCURRENT_CONVERSIONS, total);
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < total) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const file = selectedFiles[currentIndex];

        setStatus(
          `変換中です... ${total}枚を処理しています。ステップ ${currentIndex + 1}/${total}: ${file.name} を変換中`
        );

        try {
          const converted = await convertSingleFile(file);
          results.push(converted);

          if (converted.resized) {
            resizedCount += 1;
          }

          const wrapper = document.createElement("div");
          wrapper.className = "output-thumb";

          const img = document.createElement("img");
          img.src = converted.blobUrl;
          img.alt = `${converted.filename} の変換後プレビュー`;

          const name = document.createElement("div");
          name.className = "output-thumb-name";
          name.textContent = converted.filename;

          wrapper.appendChild(img);
          wrapper.appendChild(name);
          outputGallery.appendChild(wrapper);

          const link = document.createElement("a");
          link.href = converted.blobUrl;
          link.download = converted.filename;
          link.className = "download-link";
          link.textContent = `${converted.filename} をダウンロード`;
          downloadList.appendChild(link);

          completedCount += 1;
          setStatus(
            `変換中です... ${total}枚を処理しています。完了 ${completedCount}/${total}: ${converted.filename}`
          );
        } catch (fileError) {
          failedCount += 1;
          console.error(fileError);
          setStatus(
            `変換中です... ${total}枚を処理しています。失敗 ${failedCount}件: ${file.name}`,
            true
          );
        }
      }
    });

    await Promise.all(workers);

    revokeConvertedBlobUrls();
    convertedResults = results;
    convertedBlobUrls = results.map((item) => item.blobUrl);

    if (results.length > 0) {
      downloadAllButton.disabled = false;
      downloadAllButton.hidden = false;
    }

    if (!results.length) {
      throw new Error("全ての画像変換に失敗しました。別の画像でお試しください。");
    }

    setStatus(
      `変換完了: 成功 ${results.length}枚 / 失敗 ${failedCount}件（リサイズ適用: ${resizedCount}枚）`
    );

    if (autoZipDownload) {
      await downloadAllAsZip(true);
    }

    return true;
  } catch (error) {
    console.error(error);
    setStatus(error.message || "変換中にエラーが発生しました。", true);
    return false;
  } finally {
    isConverting = false;
    setActionButtonsDisabled(false);
  }
}

async function downloadAllAsZip(fromOneClick = false) {
  if (!convertedResults.length) {
    setStatus("先に変換を実行してください。", true);
    return false;
  }

  if (typeof JSZip !== "function") {
    setStatus("ZIPライブラリの読み込みに失敗しました。再読み込みしてください。", true);
    return false;
  }

  const zip = new JSZip();
  for (const item of convertedResults) {
    zip.file(item.filename, item.blob);
  }

  downloadAllButton.disabled = true;
  setStatus(
    fromOneClick
      ? "ステップ 2/2: ZIPを生成中です..."
      : "ZIPを生成中です..."
  );
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(zipBlob);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const a = document.createElement("a");
  a.href = zipUrl;
  a.download = `converted-images-${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(zipUrl);
  downloadAllButton.disabled = false;
  setStatus(`ZIPダウンロードを開始しました: ${convertedResults.length}枚`);
  return true;
}

convertButton.addEventListener("click", async () => {
  await runConversion(false);
});

convertZipButton.addEventListener("click", async () => {
  const ok = await runConversion(true);
  if (!ok) {
    return;
  }
});

downloadAllButton.addEventListener("click", async () => {
  await downloadAllAsZip(false);
});

clearButton.addEventListener("click", () => {
  selectedFiles = [];
  normalizedBlobPromiseCache.clear();
  onFilesSelected([]);
  fileInput.value = "";
  setStatus("入力画像をクリアしました。");
});

window.addEventListener("beforeunload", () => {
  revokeInputPreviewBlobUrls();
  revokeConvertedBlobUrls();
});

syncQualityVisibility();
