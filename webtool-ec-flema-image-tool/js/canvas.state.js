// ========== キャンバス管理モジュール ==========
// Fabric.jsキャンバスの初期化と基本操作

let canvas = null;
let selectedObject = null;
let canvasZoom = 1;
let sharedCanvasZoom = 1; // グローバル共有ズーム値（全キャンバス同期用）

const canvasStateStore = new Map();
let canvasOrder = [];
let activeCanvasId = null;
let canvasIdCounter = 2;

function generateCanvasId() {
    let candidateId;
    do {
        candidateId = `canvas-${canvasIdCounter++}`;
    } while (canvasStateStore.has(candidateId));
    return candidateId;
}

function getActiveCanvasState() {
    return activeCanvasId ? canvasStateStore.get(activeCanvasId) : null;
}

function persistActiveCanvasState() {
    const state = getActiveCanvasState();
    if (!state) return;
    state.history = canvasHistory;
    state.redo = redoHistory;
    state.historyCaptureTimer = historyCaptureTimer;
    state.isLoadingHistory = isLoadingHistory;
    state.selectedObject = selectedObject;
    // ズームは共有値を使用するため個別保存は不要
}

function updateCanvasActiveClasses() {
    canvasOrder.forEach((id) => {
        const state = canvasStateStore.get(id);
        if (!state || !state.wrapper) return;
        state.wrapper.classList.toggle('active', id === activeCanvasId);
    });
}

function getActiveCanvasId() {
    return activeCanvasId;
}

function getCanvasCollection() {
    return canvasOrder
        .map((id, index) => {
            const state = canvasStateStore.get(id);
            if (!state || !state.canvas) return null;
            return { id, index, canvas: state.canvas };
        })
        .filter(Boolean);
}

let isPanning = false;
let lastPosX = 0;
let lastPosY = 0;
let viewportTransform = [1, 0, 0, 1, 0, 0];
const CANVAS_HISTORY_LIMIT = 25;
const CANVAS_STATE_PROPS = ['id', 'objectType', 'customData', 'customFilters', 'shadow'];
let canvasHistory = [];  // Undo用の履歴スタック
let redoHistory = [];    // Redo用の履歴スタック
let isLoadingHistory = false;
let historyCaptureTimer = null;
const MIN_CANVAS_ZOOM = 0.1;
const MAX_CANVAS_ZOOM = 5;
const DEFAULT_CANVAS_WIDTH = 1080;
const DEFAULT_CANVAS_HEIGHT = 1080;
const INITIAL_CANVAS_ZOOM = 0.5;  // 50% - より操作しやすいズームレベル
let suppressTabSwitchFlag = false;
let preferredCanvasSize = {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT
};

// デバッグログ用フラグ（開発時に true にすることで詳細ログが出力される）
const DEBUG_CANVAS = false;
const dbgCanvas = (...args) => DEBUG_CANVAS && console.debug('[Canvas]', ...args);

window.DEFAULT_CANVAS_WIDTH = DEFAULT_CANVAS_WIDTH;
window.DEFAULT_CANVAS_HEIGHT = DEFAULT_CANVAS_HEIGHT;

// ★Bug6 Fix: Calculate true available viewport height
function calculateAvailableViewportHeight() {
    const header = document.querySelector('.app-header');
    const toolbar = document.querySelector('.toolbar');
    
    const headerHeight = header ? header.offsetHeight : 96;
    const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
    
    const vh = window.innerHeight;
    const availableHeight = vh - headerHeight - toolbarHeight;
    
    console.log('[Bug6 Fix] Calculated available viewport height:', {
        windowHeight: vh,
        headerHeight,
        toolbarHeight,
        availableHeight
    });
    
    return Math.max(availableHeight, 200); // Minimum 200px
}


function setActiveCanvas(canvasId, options = {}) {
    if (!canvasStateStore.has(canvasId)) {
        console.warn(`Canvas "${canvasId}" not found`);
        return;
    }

    if (activeCanvasId === canvasId && !options.force) {
        return;
    }

    if (activeCanvasId && canvasStateStore.has(activeCanvasId)) {
        persistActiveCanvasState();
    }

    activeCanvasId = canvasId;
    const state = canvasStateStore.get(canvasId);
    canvas = state.canvas;
    canvasHistory = state.history || [];
    redoHistory = state.redo || [];
    historyCaptureTimer = state.historyCaptureTimer || null;
    isLoadingHistory = state.isLoadingHistory || false;
    const activeObject = state.canvas.getActiveObject() || null;
    selectedObject = activeObject || state.selectedObject || null;
    canvasZoom = sharedCanvasZoom; // 共有ズーム値を使用
    if (canvas && isFinite(sharedCanvasZoom)) {
        canvas.setZoom(sharedCanvasZoom);
    }

    if (canvas) {
        const width = typeof canvas.getWidth === 'function' ? canvas.getWidth() : canvas.width;
        const height = typeof canvas.getHeight === 'function' ? canvas.getHeight() : canvas.height;
        updatePreferredCanvasSize(width, height);
    }

    updateCanvasActiveClasses();
    updateUndoRedoButtonStates();
    updateZoomUiFromCanvas();

    const recenter = options.recenter === true;
    syncCanvasViewportSize({ recenter });
    canvas.requestRenderAll();

    if (selectedObject) {
        if (selectedObject.type === 'i-text') {
            if (typeof updateTextControlsUI === 'function') {
                updateTextControlsUI(selectedObject);
            }
            if (typeof showTextControls === 'function') {
                showTextControls();
            }
            if (typeof hideImageControls === 'function') {
                hideImageControls();
            }
        } else if (selectedObject.objectType === 'uploaded-image') {
            if (typeof updateImageControlsUI === 'function') {
                updateImageControlsUI(selectedObject);
            }
            if (typeof showImageControls === 'function') {
                showImageControls();
            }
            if (typeof hideTextControls === 'function') {
                hideTextControls();
            }
        }
    } else {
        if (typeof hideTextControls === 'function') {
            hideTextControls();
        }
        if (typeof hideImageControls === 'function') {
            hideImageControls();
        }
    }

    persistActiveCanvasState();
}

function suppressTabSwitchTemporarily(duration = 300) {
    suppressTabSwitchFlag = true;
    setTimeout(() => {
        suppressTabSwitchFlag = false;
    }, duration);
}

function updatePreferredCanvasSize(width, height) {
    if (typeof width === 'number' && typeof height === 'number') {
        preferredCanvasSize = {
            width: Math.max(1, Math.floor(width)),
            height: Math.max(1, Math.floor(height))
        };
        console.log('[Bug13] Updated preferred canvas size:', preferredCanvasSize);
    }
}

function clampCanvasZoom(value) {
    if (value < MIN_CANVAS_ZOOM) return MIN_CANVAS_ZOOM;
    if (value > MAX_CANVAS_ZOOM) return MAX_CANVAS_ZOOM;
    return value;
}

function getCanvasStateSnapshot(targetCanvas = canvas) {
    if (!targetCanvas) return null;
    return {
        json: targetCanvas.toJSON(CANVAS_STATE_PROPS),
        width: targetCanvas.getWidth ? targetCanvas.getWidth() : targetCanvas.width,
        height: targetCanvas.getHeight ? targetCanvas.getHeight() : targetCanvas.height,
        backgroundColor: targetCanvas.backgroundColor,
        viewportTransform: targetCanvas.viewportTransform ? [...targetCanvas.viewportTransform] : null,
        zoom: targetCanvas.getZoom ? targetCanvas.getZoom() : 1
    };
}

function captureCanvasState(force = false) {
    if (!canvas || isLoadingHistory) return;
    const snapshot = getCanvasStateSnapshot();
    if (!snapshot) return;
    const serialized = JSON.stringify(snapshot);
    if (!force && canvasHistory.length && canvasHistory[canvasHistory.length - 1] === serialized) {
        return;
    }
    canvasHistory.push(serialized);
    if (canvasHistory.length > CANVAS_HISTORY_LIMIT) {
        canvasHistory.shift();
    }
    // 新しい操作が行われたのでRedo履歴をクリア
    redoHistory = [];
    updateUndoRedoButtonStates();
    persistActiveCanvasState();
}

function scheduleCanvasHistoryCapture() {
    if (!canvas || isLoadingHistory) return;

    // 保存操作中は履歴キャプチャをスキップ（タイマー競合防止）
    if (typeof window.isSaving === 'function' && window.isSaving()) {
        console.log('Skipping history capture during save operation');
        return;
    }

    clearTimeout(historyCaptureTimer);
    historyCaptureTimer = setTimeout(() => captureCanvasState(), 150);
    persistActiveCanvasState();
}

function registerCanvasHistoryEvents(targetCanvas = canvas, stateId = activeCanvasId) {
    if (!targetCanvas) return;
    const ensureActive = () => {
        if (stateId && activeCanvasId !== stateId) {
            setActiveCanvas(stateId);
        }
    };
    ['object:added', 'object:modified', 'object:removed'].forEach(eventName => {
        targetCanvas.on(eventName, () => {
            ensureActive();
            scheduleCanvasHistoryCapture();
        });
    });
}

function resetCanvasHistory() {
    if (!canvas) return;
    isLoadingHistory = false;
    clearTimeout(historyCaptureTimer);
    historyCaptureTimer = null;
    canvasHistory = [];
    redoHistory = [];
    captureCanvasState(true);
    updateUndoRedoButtonStates();
    persistActiveCanvasState();
}

function loadCanvasHistoryState(serialized, notificationMessage = '1つ前の状態に戻しました') {
    if (!canvas) return;
    const state = JSON.parse(serialized);
    isLoadingHistory = true;
    canvas.loadFromJSON(state.json, () => {
        if (typeof state.width === 'number') {
            canvas.setWidth(state.width);
        }
        if (typeof state.height === 'number') {
            canvas.setHeight(state.height);
        }
        canvas.backgroundColor = state.backgroundColor || 'transparent';  // Bug修正: デフォルトを透明に
        if (state.viewportTransform && Array.isArray(state.viewportTransform)) {
            canvas.setViewportTransform(state.viewportTransform);
        } else {
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }
        if (typeof state.zoom === 'number') {
            canvas.setZoom(state.zoom);
        }
        canvasZoom = canvas.getZoom();
        sharedCanvasZoom = canvasZoom;
        canvas.renderAll();
        isLoadingHistory = false;
        hideTextControls();
        hideImageControls();
        syncCanvasViewportSize();
        updateZoomUiFromCanvas();
        triggerQuickSave();
        showNotification(notificationMessage, 'success');
        persistActiveCanvasState();
    });
}

function undoCanvasAction() {
    if (historyCaptureTimer) {
        clearTimeout(historyCaptureTimer);
        historyCaptureTimer = null;
        captureCanvasState();
    }

    if (!canvas || canvasHistory.length <= 1) {
        showNotification('戻れる操作はありません', 'info');
        return;
    }

    // 現在の状態をRedo履歴に保存
    const currentState = canvasHistory.pop();
    redoHistory.push(currentState);
    if (redoHistory.length > CANVAS_HISTORY_LIMIT) {
        redoHistory.shift();
    }
    
    const targetState = canvasHistory[canvasHistory.length - 1];
    loadCanvasHistoryState(targetState, '1つ前の状態に戻しました');
    updateUndoRedoButtonStates();
    persistActiveCanvasState();
}

function redoCanvasAction() {
    if (!canvas || redoHistory.length === 0) {
        showNotification('やり直せる操作はありません', 'info');
        return;
    }

    // Redo履歴から状態を取り出してUndo履歴に戻す
    const redoState = redoHistory.pop();
    canvasHistory.push(redoState);
    if (canvasHistory.length > CANVAS_HISTORY_LIMIT) {
        canvasHistory.shift();
    }
    
    loadCanvasHistoryState(redoState, 'やり直しました');
    updateUndoRedoButtonStates();
    persistActiveCanvasState();
}

function updateUndoRedoButtonStates() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        if (canvasHistory.length <= 1) {
            undoBtn.disabled = true;
            undoBtn.style.opacity = '0.5';
        } else {
            undoBtn.disabled = false;
            undoBtn.style.opacity = '1';
        }
    }
    
    if (redoBtn) {
        if (redoHistory.length === 0) {
            redoBtn.disabled = true;
            redoBtn.style.opacity = '0.5';
        } else {
            redoBtn.disabled = false;
            redoBtn.style.opacity = '1';
        }
    }
}

function normalizeTextScaling(textObject) {
    if (!textObject || textObject.type !== 'i-text') return false;

    const tolerance = 0.001;
    const scaleX = textObject.scaleX || 1;
    const scaleY = textObject.scaleY || 1;

    if (Math.abs(scaleX - 1) < tolerance && Math.abs(scaleY - 1) < tolerance) {
        return false;
    }

    const averageScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    const baseFontSize = textObject.fontSize || 16;
    const newFontSize = Math.max(6, Math.round(baseFontSize * averageScale));

    textObject.set({
        fontSize: newFontSize,
        scaleX: 1,
        scaleY: 1
    });

    textObject.setCoords();
    return true;
}

function updateZoomUiFromCanvas() {
    const zoomValue = document.getElementById('zoomValue');

    if (!canvas) {
        if (zoomValue) zoomValue.textContent = '100%';
        return;
    }

    const zoomPercent = Math.round(canvas.getZoom() * 100);

    if (zoomValue) {
        zoomValue.textContent = `${zoomPercent}%`;
    }
}

// ズーム値の一時表示インジケーター（Bug_report3対応）
function showZoomIndicator(zoom) {
    const indicator = document.getElementById('zoomIndicator');
    const percentage = document.getElementById('zoomPercentage');

    if (!indicator || !percentage) return;

    const zoomPercent = Math.round(zoom * 100);
    percentage.textContent = `${zoomPercent}%`;

    // 表示
    indicator.classList.add('show');

    // 既存のタイマーをクリア
    if (window.zoomIndicatorTimeout) {
        clearTimeout(window.zoomIndicatorTimeout);
    }

    // 2秒後にフェードアウト
    window.zoomIndicatorTimeout = setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// 汎用: 任意のキャンバスステートに対してビューポートサイズを同期
function syncCanvasViewportSizeForState(state, options = {}) {
    if (!state || !state.canvas) return;

    const { recenter = false } = options;
    const fabricCanvas = state.canvas;
    const zoom = fabricCanvas.getZoom();

    const canvasWidth = fabricCanvas.width;
    const canvasHeight = fabricCanvas.height;

    const wrapper = fabricCanvas.wrapperEl;
    const lower = fabricCanvas.lowerCanvasEl;
    const upper = fabricCanvas.upperCanvasEl;

    if (wrapper) {
        wrapper.style.width = `${canvasWidth}px`;
        wrapper.style.height = `${canvasHeight}px`;
        wrapper.style.transform = '';
        wrapper.style.transformOrigin = '';
    }

    [lower, upper].forEach((el) => {
        if (!el) return;
        el.style.width = `${canvasWidth}px`;
        el.style.height = `${canvasHeight}px`;
    });

    if (upper) {
        upper.style.zIndex = '11';
        upper.style.pointerEvents = 'auto';
        upper.style.backgroundColor = 'transparent';
    }
    if (lower) {
        lower.style.zIndex = '10';
        lower.style.backgroundColor = '#ffffff';
    }

    // 座標系を更新してポインタ計算を補正
    fabricCanvas.calcOffset();

    requestAnimationFrame(() => {
        fabricCanvas.renderAll();
    });

    dbgCanvas('syncViewportSizeForState', { zoom });
}

function syncCanvasViewportSize(options = {}) {
    if (!canvas) return;

    const container = document.getElementById('canvasContainer');
    if (!container) return;

    const { recenter = false } = options;
    const zoom = canvas.getZoom();

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const wrapper = canvas.wrapperEl;
    const lower = canvas.lowerCanvasEl;
    const upper = canvas.upperCanvasEl;

    // DOM要素サイズは論理サイズを維持し、CSS TransformでズームによるスケーリングGUI適用
    if (wrapper) {
        wrapper.style.width = `${canvasWidth}px`;
        wrapper.style.height = `${canvasHeight}px`;
        wrapper.style.transform = `scale(${zoom})`;
        wrapper.style.transformOrigin = 'center center';

        // ★Bug_report5対応: コンテナのpadding領域を考慮して中央配置
        const computedStyle = window.getComputedStyle(container);
        const paddingLeft = parseFloat(computedStyle.paddingLeft || '0');
        const paddingRight = parseFloat(computedStyle.paddingRight || '0');
        const paddingTop = parseFloat(computedStyle.paddingTop || '0');
        const paddingBottom = parseFloat(computedStyle.paddingBottom || '0');

        // 利用可能な領域の中心座標を計算
        const availableWidth = container.clientWidth - paddingLeft - paddingRight;
        const availableHeight = container.clientHeight - paddingTop - paddingBottom;

        // wrapper を絶対配置
        wrapper.style.position = 'absolute';
        
        // ★Bug6 Fix: Center horizontally
        wrapper.style.left = `${paddingLeft + (availableWidth - canvasWidth) / 2}px`;
        
        // ★Bug6 Fix: Center vertically (changed from 30% positioning)
        wrapper.style.top = `${paddingTop + (availableHeight - canvasHeight) / 2}px`;
        
        console.log('[Bug6 Fix] Canvas wrapper positioned:', {
            left: wrapper.style.left,
            top: wrapper.style.top,
            availableSize: [availableWidth, availableHeight],
            canvasSize: [canvasWidth, canvasHeight]
        });
    }

    [lower, upper].forEach((el) => {
        if (!el) return;
        el.style.width = `${canvasWidth}px`;
        el.style.height = `${canvasHeight}px`;
    });

    // z-indexと背景色を再設定（ズーム時に失われる可能性があるため）
    if (upper) {
        upper.style.zIndex = '11';
        upper.style.pointerEvents = 'auto';
        upper.style.backgroundColor = 'transparent';
    }
    if (lower) {
        lower.style.zIndex = '10';
        lower.style.backgroundColor = '#ffffff';
    }

    if (recenter) {
        centerCanvasInView();
    }

    // コンテナのスクロールは常に左上に固定
    container.scrollLeft = 0;
    container.scrollTop = 0;

    // DOMリサイズ後に座標系を更新
    canvas.calcOffset();

    // サイズ変更後に描画を実行
    requestAnimationFrame(() => {
        canvas.renderAll();
        console.log('[Canvas] Viewport size synced, zoom:', zoom);
    });

    dbgCanvas('syncViewportSize', { zoom, recenter });
}

// オブジェクトをキャンバスの中央に配置
function centerObjectOnCanvas(obj) {
    if (!canvas || !obj) return;
    canvas.centerObject(obj);
    obj.setCoords();
    dbgCanvas('centerObject', { left: obj.left, top: obj.top });
}

// オブジェクトが画面内に収まるようズーム調整
function zoomToFitObject(obj, padding = 24) {
    if (!canvas || !obj) return;
    
    const bounds = obj.getBoundingRect(true, true);
    if (!bounds.width || !bounds.height) {
        dbgCanvas('zoomToFitObject: invalid bounds', bounds);
        return;
    }

    const cW = canvas.width;
    const cH = canvas.height;
    const targetZoom = Math.min(
        (cW - padding * 2) / bounds.width,
        (cH - padding * 2) / bounds.height,
        2 // 最大 200% までの拡大を許可
    );

    const clampedZoom = clampCanvasZoom(targetZoom);
    const center = new fabric.Point(canvas.width / 2, canvas.height / 2);
    canvas.zoomToPoint(center, clampedZoom);
    canvasZoom = canvas.getZoom();
    sharedCanvasZoom = canvasZoom;
    
    centerObjectOnCanvas(obj);
    syncCanvasViewportSize({ recenter: true });
    
    dbgCanvas('zoomToFitObject', { targetZoom, clampedZoom, bounds });
}

function applyCanvasZoom(targetZoom, options = {}) {
    if (!canvas) return;

    const { point, centerOnView = false, silent = false } = options;
    const clampedZoom = clampCanvasZoom(targetZoom);

    // 共有ズーム値を更新
    sharedCanvasZoom = clampedZoom;
    canvasZoom = clampedZoom;

    // 全キャンバスにズームを適用
    canvasOrder.forEach((id) => {
        const state = canvasStateStore.get(id);
        if (!state || !state.canvas) return;

        const fabricCanvas = state.canvas;
        if (point && id === activeCanvasId) {
            fabricCanvas.zoomToPoint(point, clampedZoom);
        } else {
            fabricCanvas.setZoom(clampedZoom);
        }

        // 各キャンバスのビューポートサイズを同期
        syncCanvasViewportSizeForState(state, { recenter: centerOnView });
    });

    if (centerOnView) {
        centerCanvasInView();
    }

    if (!silent) {
        updateZoomUiFromCanvas();
        // Bug_report3対応: ズーム値の一時表示
        showZoomIndicator(clampedZoom);
    }

    canvas.requestRenderAll();
    persistActiveCanvasState();
}

function fitCanvasToContainer() {
    if (!canvas) return;

    const container = document.getElementById('canvasContainer');
    if (!container) return;

    // ★Bug6 Fix: Calculate true available viewport height
    const trueAvailableHeight = calculateAvailableViewportHeight();
    
    const computedStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(computedStyle.paddingLeft || '0') + parseFloat(computedStyle.paddingRight || '0');
    const paddingY = parseFloat(computedStyle.paddingTop || '0') + parseFloat(computedStyle.paddingBottom || '0');

    // ★Bug6 Fix: Use true viewport height, not container.clientHeight
    const availableWidth = Math.max(container.clientWidth - paddingX, 0);
    const availableHeight = Math.max(trueAvailableHeight - paddingY, 0);

    console.log('[Bug6 Fix] fitCanvasToContainer:', {
        trueAvailableHeight,
        paddingY,
        availableWidth,
        availableHeight,
        canvasSize: [canvas.width, canvas.height]
    });

    if (availableWidth === 0 || availableHeight === 0) {
        syncCanvasViewportSize({ recenter: true });
        updateZoomUiFromCanvas();
        return;
    }

    const widthScale = availableWidth / canvas.width;
    const heightScale = availableHeight / canvas.height;
    const fitZoom = Math.min(widthScale, heightScale);
    
    console.log('[Bug6 Fix] Calculated fit zoom:', {
        widthScale: widthScale.toFixed(3),
        heightScale: heightScale.toFixed(3),
        fitZoom: fitZoom.toFixed(3)
    });

    // ★Bug6 Fix: Set container height to match calculated height
    container.style.height = `${trueAvailableHeight}px`;
    container.style.minHeight = `${trueAvailableHeight}px`;
    container.style.maxHeight = `${trueAvailableHeight}px`;

    const currentZoom = canvas.getZoom();

    if (Math.abs(fitZoom - currentZoom) < 0.001) {
        // ズームは同じでも中央配置を確実に実行
        centerCanvasInView();
        syncCanvasViewportSize({ recenter: true });
        updateZoomUiFromCanvas();
        return;
    }

    // ★Bug_report5対応: CSS Transform使用時はzoomToPointを使わず、
    // zoom値を直接設定してからcenterCanvasInViewで中央配置
    // （zoomToPointはviewportTransformのオフセットを変更してしまい、
    //  CSS Transform centeringと競合する）
    canvas.setZoom(fitZoom);
    canvasZoom = fitZoom;
    sharedCanvasZoom = canvasZoom;

    // ビューポートを中央配置（vpt[4], vpt[5]を0に設定）
    centerCanvasInView();
    syncCanvasViewportSize({ recenter: true }); // ★Bug6 Fix: Changed to true
    updateZoomUiFromCanvas();
    canvas.requestRenderAll();
    persistActiveCanvasState();
    
    console.log('[Bug6 Fix] fitCanvasToContainer completed, final zoom:', fitZoom.toFixed(3));
}


// キャンバス管理ヘルパー
