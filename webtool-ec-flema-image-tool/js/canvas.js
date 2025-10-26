// ========== キャンバス管理モジュール ==========
// Fabric.jsキャンバスの初期化と基本操作

let canvas = null;
let selectedObject = null;
let canvasZoom = 1;

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
    state.zoom = canvasZoom;
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

// デバッグログ用フラグ（開発時に true にすることで詳細ログが出力される）
const DEBUG_CANVAS = false;
const dbgCanvas = (...args) => DEBUG_CANVAS && console.debug('[Canvas]', ...args);

window.DEFAULT_CANVAS_WIDTH = DEFAULT_CANVAS_WIDTH;
window.DEFAULT_CANVAS_HEIGHT = DEFAULT_CANVAS_HEIGHT;

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
    canvasZoom = typeof state.zoom === 'number' ? state.zoom : state.canvas.getZoom();

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
        canvas.backgroundColor = state.backgroundColor || '#ffffff';
        if (state.viewportTransform && Array.isArray(state.viewportTransform)) {
            canvas.setViewportTransform(state.viewportTransform);
        } else {
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }
        if (typeof state.zoom === 'number') {
            canvas.setZoom(state.zoom);
        }
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

function syncCanvasViewportSize(options = {}) {
    if (!canvas) return;

    const container = document.getElementById('canvasContainer');
    if (!container) return;

    const { recenter = false } = options;
    const zoom = canvas.getZoom();
    
    // キャンバスの論理サイズ（ズーム適用前）
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // ズーム適用後の表示サイズ
    const scaledWidth = canvasWidth * zoom;
    const scaledHeight = canvasHeight * zoom;

    // DOM要素の取得
    const wrapper = canvas.wrapperEl;
    const lower = canvas.lowerCanvasEl;
    const upper = canvas.upperCanvasEl;

    // キャンバスDOM要素にズーム適用後のサイズを設定
    if (wrapper) {
        wrapper.style.width = `${scaledWidth}px`;
        wrapper.style.height = `${scaledHeight}px`;
    }
    
    // lowerとupperはcanvas要素なので、CSS表示サイズのみ設定
    // canvas要素のwidth/height属性（描画解像度）は変更しない
    [lower, upper].forEach((el) => {
        if (!el) return;
        el.style.width = `${scaledWidth}px`;
        el.style.height = `${scaledHeight}px`;
    });

    // コンテナのスクロール位置調整（ズーム後のサイズに基づく）
    if (scaledWidth <= container.clientWidth) {
        container.scrollLeft = 0;
    } else if (recenter) {
        container.scrollLeft = Math.max(0, (scaledWidth - container.clientWidth) / 2);
    }

    if (scaledHeight <= container.clientHeight) {
        container.scrollTop = 0;
    } else if (recenter) {
        container.scrollTop = Math.max(0, (scaledHeight - container.clientHeight) / 2);
    }

    canvas.calcOffset();
    dbgCanvas('syncViewportSize', { zoom, scaled: [scaledWidth, scaledHeight], recenter });
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
    
    centerObjectOnCanvas(obj);
    syncCanvasViewportSize({ recenter: true });
    
    dbgCanvas('zoomToFitObject', { targetZoom, clampedZoom, bounds });
}

function applyCanvasZoom(targetZoom, options = {}) {
    if (!canvas) return;

    const { point, centerOnView = false, silent = false } = options;
    const clampedZoom = clampCanvasZoom(targetZoom);

    if (point) {
        canvas.zoomToPoint(point, clampedZoom);
    } else {
        canvas.setZoom(clampedZoom);
    }

    canvasZoom = canvas.getZoom();

    if (centerOnView) {
        centerCanvasInView();
    }

    syncCanvasViewportSize({ recenter: centerOnView });

    if (!silent) {
        updateZoomUiFromCanvas();
    }

    canvas.requestRenderAll();
    persistActiveCanvasState();
}

function fitCanvasToContainer() {
    if (!canvas) return;

    const container = document.getElementById('canvasContainer');
    if (!container) return;

    const computedStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(computedStyle.paddingLeft || '0') + parseFloat(computedStyle.paddingRight || '0');
    const paddingY = parseFloat(computedStyle.paddingTop || '0') + parseFloat(computedStyle.paddingBottom || '0');

    const availableWidth = Math.max(container.clientWidth - paddingX, 0);
    const availableHeight = Math.max(container.clientHeight - paddingY, 0);

    if (availableWidth === 0 || availableHeight === 0) {
        syncCanvasViewportSize({ recenter: true });
        updateZoomUiFromCanvas();
        return;
    }

    const widthScale = availableWidth / canvas.width;
    const heightScale = availableHeight / canvas.height;
    const fitZoom = Math.min(widthScale, heightScale);
    const currentZoom = canvas.getZoom();

    if (Math.abs(fitZoom - currentZoom) < 0.001) {
        // ズームは同じでも中央配置を確実に実行
        centerCanvasInView();
        syncCanvasViewportSize({ recenter: true });
        updateZoomUiFromCanvas();
        return;
    }

    // キャンバス中心を基準にズーム
    const centerPoint = new fabric.Point(canvas.width / 2, canvas.height / 2);
    canvas.zoomToPoint(centerPoint, fitZoom);
    canvasZoom = canvas.getZoom();
    
    // ビューポートを中央配置
    centerCanvasInView();
   syncCanvasViewportSize({ recenter: false });
   updateZoomUiFromCanvas();
   canvas.requestRenderAll();
    persistActiveCanvasState();
}


// キャンバス管理ヘルパー
function ensureCanvasIdCounter(canvasId) {
    const match = typeof canvasId === 'string' && canvasId.match(/canvas-(\d+)/);
    if (!match) return;
    const numeric = parseInt(match[1], 10);
    if (!Number.isNaN(numeric)) {
        canvasIdCounter = Math.max(canvasIdCounter, numeric + 1);
    }
}

function getCanvasIdFromElement(element) {
    if (!element) return null;
    if (element.dataset && element.dataset.canvasId) {
        return element.dataset.canvasId;
    }
    const slot = element.closest ? element.closest('.canvas-slot') : null;
    if (slot && slot.dataset && slot.dataset.canvasId) {
        return slot.dataset.canvasId;
    }
    if (element.id && canvasStateStore.has(element.id)) {
        return element.id;
    }
    return null;
}

const panContext = {
    isPanning: false,
    canvasId: null,
    lastX: 0,
    lastY: 0
};

const touchPanState = {
    isActive: false,
    canvasId: null,
    lastX: 0,
    lastY: 0,
    lastDistance: 0
};

let panInfrastructureReady = false;

function initializeGlobalPanShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            if (canvas) {
                canvas.defaultCursor = 'grab';
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            const state = getActiveCanvasState();
            if (state && !panContext.isPanning) {
                state.canvas.defaultCursor = 'default';
            }
        }
    });

    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer) return;

    canvasContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const targetId = getCanvasIdFromElement(e.target);
            if (targetId && targetId !== activeCanvasId) {
                setActiveCanvas(targetId);
            }
            touchPanState.isActive = true;
            touchPanState.canvasId = activeCanvasId;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            touchPanState.lastX = (t1.clientX + t2.clientX) / 2;
            touchPanState.lastY = (t1.clientY + t2.clientY) / 2;
            touchPanState.lastDistance = Math.hypot(
                t2.clientX - t1.clientX,
                t2.clientY - t1.clientY
            );
        }
    }, { passive: false });

    canvasContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && touchPanState.isActive && touchPanState.canvasId) {
            e.preventDefault();
            const state = canvasStateStore.get(touchPanState.canvasId);
            if (!state) return;

            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const centerX = (t1.clientX + t2.clientX) / 2;
            const centerY = (t1.clientY + t2.clientY) / 2;
            const distance = Math.hypot(
                t2.clientX - t1.clientX,
                t2.clientY - t1.clientY
            );

            if (Math.abs(distance - touchPanState.lastDistance) < 10) {
                const vpt = state.canvas.viewportTransform;
                vpt[4] += centerX - touchPanState.lastX;
                vpt[5] += centerY - touchPanState.lastY;
                state.canvas.requestRenderAll();
            }

            touchPanState.lastX = centerX;
            touchPanState.lastY = centerY;
            touchPanState.lastDistance = distance;
        }
    }, { passive: false });

    canvasContainer.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            touchPanState.isActive = false;
            touchPanState.canvasId = null;
        }
    });
}

function attachCanvasPanHandlers(state) {
    if (!state || state.panHandlersAttached) return;

    const fabricCanvas = state.canvas;

    fabricCanvas.on('mouse:down', function(opt) {
        const evt = opt.e;
        if (evt.spaceKey || evt.button === 1) {
            setActiveCanvas(state.id);
            panContext.isPanning = true;
            panContext.canvasId = state.id;
            fabricCanvas.selection = false;
            panContext.lastX = evt.clientX;
            panContext.lastY = evt.clientY;
            fabricCanvas.defaultCursor = 'grab';
            fabricCanvas.setCursor('grabbing');
        }
    });

    fabricCanvas.on('mouse:move', function(opt) {
        if (!panContext.isPanning || panContext.canvasId !== state.id) return;
        const evt = opt.e;
        const vpt = fabricCanvas.viewportTransform;
        vpt[4] += evt.clientX - panContext.lastX;
        vpt[5] += evt.clientY - panContext.lastY;
        fabricCanvas.requestRenderAll();
        panContext.lastX = evt.clientX;
        panContext.lastY = evt.clientY;
    });

    fabricCanvas.on('mouse:up', function() {
        if (!panContext.isPanning || panContext.canvasId !== state.id) return;
        panContext.isPanning = false;
        panContext.canvasId = null;
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.setCursor('default');
        persistActiveCanvasState();
    });

    state.panHandlersAttached = true;
}

function attachCanvasEventHandlers(state) {
    if (!state || state.eventsAttached) return;

    const fabricCanvas = state.canvas;
    const wrapper = state.wrapper;

    const ensureActive = () => {
        if (activeCanvasId !== state.id) {
            setActiveCanvas(state.id);
        }
    };

    if (wrapper) {
        wrapper.addEventListener('click', () => ensureActive());
    }

    fabricCanvas.on('mouse:down', ensureActive);

    ['selection:created', 'selection:updated'].forEach(eventName => {
        fabricCanvas.on(eventName, (event) => {
            ensureActive();
            handleObjectSelection(event);
        });
    });

    fabricCanvas.on('selection:cleared', (event) => {
        ensureActive();
        handleSelectionCleared(event);
    });

    fabricCanvas.on('object:modified', (event) => {
        ensureActive();
        handleObjectModified(event);
    });

    ['object:added', 'object:modified', 'object:removed'].forEach(eventName => {
        fabricCanvas.on(eventName, () => {
            ensureActive();
            triggerQuickSave();
        });
    });

    state.eventsAttached = true;
}

function setupCanvasSlotControls(state) {
    if (!state || !state.wrapper) return;

    const wrapper = state.wrapper;
    wrapper.dataset.canvasId = state.id;

    let toolbar = wrapper.querySelector('.canvas-slot-toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'canvas-slot-toolbar';
        wrapper.appendChild(toolbar);
    }

    let deleteBtn = toolbar.querySelector('.delete-canvas-btn');
    if (!deleteBtn) {
        deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-canvas-action delete-canvas-btn';
        deleteBtn.setAttribute('aria-label', 'キャンバスを削除');
        deleteBtn.setAttribute('title', 'キャンバスを削除');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        toolbar.appendChild(deleteBtn);
    }

    deleteBtn.dataset.canvasId = state.id;

    if (!deleteBtn.dataset.bound) {
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            handleCanvasDeletion(state.id);
        });
        deleteBtn.dataset.bound = 'true';
    }
}

function createCanvasStateFromElement(canvasElement, wrapper) {
    const canvasId = canvasElement.id || generateCanvasId();
    canvasElement.id = canvasId;
    if (wrapper) {
        wrapper.dataset.canvasId = canvasId;
    }
    ensureCanvasIdCounter(canvasId);

    const fabricCanvas = new fabric.Canvas(canvasElement, {
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
        clipPath: null
    });

    const state = {
        id: canvasId,
        canvas: fabricCanvas,
        history: [],
        redo: [],
        historyCaptureTimer: null,
        isLoadingHistory: false,
        selectedObject: null,
        zoom: fabricCanvas.getZoom(),
        wrapper,
        element: canvasElement,
        eventsAttached: false,
        panHandlersAttached: false
    };

    canvasStateStore.set(canvasId, state);
    if (!canvasOrder.includes(canvasId)) {
        canvasOrder.push(canvasId);
    }

    attachCanvasEventHandlers(state);
    registerCanvasHistoryEvents(fabricCanvas, canvasId);
    attachCanvasPanHandlers(state);
    setupCanvasSlotControls(state);

    return state;
}

function createCanvasSlotElement(preferredId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-slot';
    const canvasElement = document.createElement('canvas');
    if (preferredId) {
        canvasElement.id = preferredId;
        wrapper.dataset.canvasId = preferredId;
    }
    wrapper.appendChild(canvasElement);
    return { wrapper, canvasElement };
}

function addCanvasBelow() {
    const stack = document.getElementById('canvasStack');
    if (!stack) return;

    const { wrapper, canvasElement } = createCanvasSlotElement();
    stack.appendChild(wrapper);

    const state = createCanvasStateFromElement(canvasElement, wrapper);
    setActiveCanvas(state.id, { force: true, recenter: true });
    resetCanvasHistory();
    fitCanvasToContainer();

    const container = document.getElementById('canvasContainer');
    if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    showNotification('新しいキャンバスを追加しました', 'success');
}

function disposeCanvasById(canvasId) {
    const state = canvasStateStore.get(canvasId);
    if (!state) return;
    if (state.canvas) {
        state.canvas.dispose();
    }
    if (state.wrapper && state.wrapper.parentElement) {
        state.wrapper.parentElement.removeChild(state.wrapper);
    }
    canvasStateStore.delete(canvasId);
    canvasOrder = canvasOrder.filter(id => id !== canvasId);
    if (activeCanvasId === canvasId) {
        activeCanvasId = null;
        canvas = null;
        selectedObject = null;
    }
}

function handleCanvasDeletion(canvasId) {
    if (!canvasOrder.includes(canvasId)) return;

    if (canvasOrder.length <= 1) {
        showNotification('キャンバスは最低1枚必要です', 'warning');
        return;
    }

    const state = canvasStateStore.get(canvasId);
    const hasObjects = state?.canvas && state.canvas.getObjects().length > 0;
    const confirmMessage = hasObjects
        ? 'このキャンバスを削除しますか？\n配置した要素はすべて削除されます。'
        : 'このキャンバスを削除しますか？';

    if (!confirm(confirmMessage)) {
        return;
    }

    const orderSnapshot = canvasOrder.slice();
    const targetIndex = orderSnapshot.indexOf(canvasId);
    const nextCandidate = orderSnapshot[targetIndex + 1] || orderSnapshot[targetIndex - 1] || null;

    disposeCanvasById(canvasId);

    let nextActiveId = nextCandidate && canvasStateStore.has(nextCandidate)
        ? nextCandidate
        : (canvasOrder[0] || null);

    if (!nextActiveId) {
        const stack = document.getElementById('canvasStack');
        if (stack) {
            const { wrapper, canvasElement } = createCanvasSlotElement('mainCanvas');
            stack.appendChild(wrapper);
            const newState = createCanvasStateFromElement(canvasElement, wrapper);
            nextActiveId = newState.id;
        }
    }

    if (nextActiveId) {
        setActiveCanvas(nextActiveId, { force: true, recenter: true });
    }

    fitCanvasToContainer();
    triggerQuickSave();
    showNotification('キャンバスを削除しました', 'success');
    if (navigator.vibrate) {
        navigator.vibrate([30, 20, 30]);
    }
}

async function loadCanvasesFromProjectData(projectData) {
    const stack = document.getElementById('canvasStack');
    if (!stack) return;

    const entries = [];
    if (projectData && Array.isArray(projectData.canvases) && projectData.canvases.length) {
        projectData.canvases.forEach((item, index) => {
            const entryId = item.id || generateCanvasId();
            ensureCanvasIdCounter(entryId);
            entries.push({
                id: entryId,
                width: item.width || DEFAULT_CANVAS_WIDTH,
                height: item.height || DEFAULT_CANVAS_HEIGHT,
                backgroundColor: item.backgroundColor || '#ffffff',
                json: item.canvasData || item.json || null,
                zoom: typeof item.zoom === 'number' ? item.zoom : null,
                order: typeof item.order === 'number' ? item.order : index
            });
        });
        entries.sort((a, b) => a.order - b.order);
    } else if (projectData && projectData.canvasData) {
        entries.push({
            id: 'mainCanvas',
            width: projectData.canvasWidth || DEFAULT_CANVAS_WIDTH,
            height: projectData.canvasHeight || DEFAULT_CANVAS_HEIGHT,
            backgroundColor: '#ffffff',
            json: projectData.canvasData,
            zoom: typeof projectData.zoom === 'number' ? projectData.zoom : null
        });
    } else {
        entries.push({
            id: 'mainCanvas',
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT,
            backgroundColor: '#ffffff',
            json: null,
            zoom: null
        });
    }

    // Remove existing canvases
    canvasOrder.slice().forEach(id => disposeCanvasById(id));

    let firstStateId = null;
    for (const entry of entries) {
        const { wrapper, canvasElement } = createCanvasSlotElement(entry.id);
        stack.appendChild(wrapper);

        const state = createCanvasStateFromElement(canvasElement, wrapper);
        setActiveCanvas(state.id, { force: true, recenter: true });

        state.canvas.setWidth(entry.width || DEFAULT_CANVAS_WIDTH);
        state.canvas.setHeight(entry.height || DEFAULT_CANVAS_HEIGHT);
        state.canvas.backgroundColor = entry.backgroundColor || '#ffffff';
        state.canvas.renderAll();

        if (entry.json) {
            await deserializeCanvas(state.canvas, entry.json);
        } else {
            state.canvas.clear();
            state.canvas.backgroundColor = entry.backgroundColor || '#ffffff';
            state.canvas.renderAll();
        }

        if (entry.zoom && typeof entry.zoom === 'number') {
            applyCanvasZoom(entry.zoom, { centerOnView: true, silent: true });
        } else {
            resetCanvasZoom();
        }

        resetCanvasHistory();
        if (!firstStateId) {
            firstStateId = state.id;
        }
    }

    if (firstStateId) {
        const desiredActiveId = projectData && projectData.activeCanvasId ? projectData.activeCanvasId : null;
        let preferredActiveId = firstStateId;
        if (desiredActiveId) {
            const matchEntry = entries.find(item => item.id === desiredActiveId);
            if (matchEntry) {
                preferredActiveId = matchEntry.id;
            }
        }
        setActiveCanvas(preferredActiveId, { force: true, recenter: true });
    }

    fitCanvasToContainer();
}

function resetCanvasWorkspaceToDefault() {
    const stack = document.getElementById('canvasStack');
    if (!stack) return;

    const idsToRemove = canvasOrder.slice(1);
    idsToRemove.forEach(id => disposeCanvasById(id));

    let baseId = canvasOrder[0];
    if (!baseId) {
        const { wrapper, canvasElement } = createCanvasSlotElement('mainCanvas');
        stack.appendChild(wrapper);
        const state = createCanvasStateFromElement(canvasElement, wrapper);
        baseId = state.id;
    }

    setActiveCanvas(baseId, { force: true, recenter: true });

    const state = getActiveCanvasState();
    if (state && state.canvas) {
        state.canvas.clear();
        state.canvas.backgroundColor = '#ffffff';
        state.canvas.setWidth(DEFAULT_CANVAS_WIDTH);
        state.canvas.setHeight(DEFAULT_CANVAS_HEIGHT);
        state.canvas.renderAll();
    }

    resetCanvasZoom();
    resetCanvasHistory();
    fitCanvasToContainer();
}

// キャンバス初期化
function initializeFabricCanvas() {
    const stack = document.getElementById('canvasStack');
    if (!stack) return;

    let slots = Array.from(stack.querySelectorAll('.canvas-slot'));
    if (slots.length === 0) {
        const { wrapper, canvasElement } = createCanvasSlotElement('mainCanvas');
        stack.appendChild(wrapper);
        canvasElement.id = 'mainCanvas';
        wrapper.dataset.canvasId = 'mainCanvas';
        slots = [wrapper];
    }

    let firstStateId = null;
    slots.forEach((slot, index) => {
        const canvasElement = slot.querySelector('canvas');
        if (!canvasElement) return;
        const state = createCanvasStateFromElement(canvasElement, slot);
        setActiveCanvas(state.id, { force: true, recenter: index === 0 });
        resetCanvasHistory();
        if (index === 0) {
            firstStateId = state.id;
        }
    });

    if (firstStateId) {
        setActiveCanvas(firstStateId, { force: true, recenter: true });
        fitCanvasToContainer();
        dbgCanvas('initializeFabricCanvas', { 
            activeId: firstStateId, 
            zoom: canvas ? canvas.getZoom() : null,
            canvasSize: canvas ? [canvas.width, canvas.height] : null
        });
    }

    if (!panInfrastructureReady) {
        initializeGlobalPanShortcuts();
        panInfrastructureReady = true;
    }

    const addCanvasBtn = document.getElementById('addCanvasBtn');
    if (addCanvasBtn && !addCanvasBtn.dataset.bound) {
        addCanvasBtn.addEventListener('click', () => addCanvasBelow());
        addCanvasBtn.dataset.bound = 'true';
    }

    setupCanvasZoom();
    setupCanvasPan();
    window.addEventListener('resize', handleCanvasResize);
}

// ピンチズーム機能の設定
function setupCanvasZoom() {
    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer) return;

    canvasContainer.addEventListener('wheel', function(e) {
        if (!(e.ctrlKey || e.metaKey)) return;

        e.preventDefault();
        const targetId = getCanvasIdFromElement(e.target);
        if (targetId && targetId !== activeCanvasId) {
            setActiveCanvas(targetId);
        }

        if (!canvas) return;

        const zoomFactor = 0.999 ** e.deltaY;
        const targetZoom = clampCanvasZoom(canvas.getZoom() * zoomFactor);

        const rect = canvasContainer.getBoundingClientRect();
        const point = new fabric.Point(
            e.clientX - rect.left + canvasContainer.scrollLeft,
            e.clientY - rect.top + canvasContainer.scrollTop
        );

        applyCanvasZoom(targetZoom, { point });
    }, { passive: false });

    let lastDistance = 0;
    let isZooming = false;

    canvasContainer.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            const targetId = getCanvasIdFromElement(e.target);
            if (targetId && targetId !== activeCanvasId) {
                setActiveCanvas(targetId);
            }
            if (!canvas) return;
            isZooming = true;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }, { passive: false });

    canvasContainer.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2 && isZooming && canvas) {
            e.preventDefault();

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (lastDistance > 0) {
                const zoomFactor = distance / lastDistance;
                const targetZoom = clampCanvasZoom(canvas.getZoom() * zoomFactor);

                const rect = canvasContainer.getBoundingClientRect();
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                const point = new fabric.Point(
                    centerX - rect.left + canvasContainer.scrollLeft,
                    centerY - rect.top + canvasContainer.scrollTop
                );

                applyCanvasZoom(targetZoom, { point });
            }

            lastDistance = distance;
        }
    }, { passive: false });

    canvasContainer.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            isZooming = false;
            lastDistance = 0;
        }
    });

    let lastTap = 0;
    canvasContainer.addEventListener('touchend', function(e) {
        const currentTime = Date.now();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
            resetCanvasZoom();
            e.preventDefault();
        }
        lastTap = currentTime;
    });
}

// キャンバスパンの設定
function setupCanvasPan(state = getActiveCanvasState()) {
    if (state) {
        attachCanvasPanHandlers(state);
    }
    if (!panInfrastructureReady) {
        initializeGlobalPanShortcuts();
        panInfrastructureReady = true;
    }
}


// キャンバスリサイズ処理
function handleCanvasResize() {
    if (!canvas) return;

    syncCanvasViewportSize();
    updateZoomUiFromCanvas();
    canvas.requestRenderAll();
}

// オブジェクト選択時の処理
function handleObjectSelection(e) {
    const obj = e.target || (e.selected && e.selected[0]) || null;
    
    if (!obj) {
        persistActiveCanvasState();
        return;
    }
    
    if (obj.type === 'activeSelection') {
        selectedObject = null;
        hideTextControls();
        hideImageControls();
        persistActiveCanvasState();
        return;
    }
    
    selectedObject = obj;
    
    // 画像が選択された場合
    if (obj.objectType === 'uploaded-image') {
        if (!suppressTabSwitchFlag) {
            switchTab(document.querySelector('[data-tab="image"]'));
        }
        showImageControls();
        updateImageControlsUI(obj);
        hideTextControls();
    }
    // テキストが選択された場合
    else if (obj.type === 'i-text') {
        if (!suppressTabSwitchFlag) {
            switchTab(document.querySelector('[data-tab="template"]'));
        }
        showTextControls();
        updateTextControlsUI(obj);
        hideImageControls();
    }
    persistActiveCanvasState();
}

// 選択解除時の処理
function handleSelectionCleared() {
    selectedObject = null;
    suppressTabSwitchFlag = false;
    hideTextControls();
    hideImageControls();
    persistActiveCanvasState();
}

// オブジェクト変更時の処理
function handleObjectModified(e) {
    const target = e.target;
    if (!target) return;

    if (target.type === 'activeSelection') {
        const items = target._objects || [];
        let normalized = false;

        items.forEach(obj => {
            if (normalizeTextScaling(obj)) {
                normalized = true;
            }
        });

        if (normalized) {
            canvas.requestRenderAll();
        }

        return;
    }

    if (normalizeTextScaling(target) && target.type === 'i-text') {
        updateTextControlsUI(target);
        canvas.requestRenderAll();
        scheduleCanvasHistoryCapture();
        return;
    }

    if (target.type === 'i-text') {
        updateTextControlsUI(target);
    } else if (target.objectType === 'uploaded-image') {
        updateImageControlsUI(target);
    }

    scheduleCanvasHistoryCapture();
    persistActiveCanvasState();
}

// キャンバス取得
function getCanvas() {
    return canvas;
}

// 選択中のオブジェクト取得
function getSelectedObject() {
    return selectedObject;
}

// 選択中のオブジェクト設定
function setSelectedObject(obj) {
    selectedObject = obj;
    persistActiveCanvasState();
}

// オブジェクト複製（汎用）
function duplicateSelectedObject() {
    if (!selectedObject) return;
    
    selectedObject.clone(function(cloned) {
        cloned.set({
            left: cloned.left + 20,
            top: cloned.top + 20
        });
        
        // カスタムプロパティもコピー
        if (selectedObject.customData) {
            cloned.customData = { ...selectedObject.customData };
        }
        if (selectedObject.customFilters) {
            cloned.customFilters = { ...selectedObject.customFilters };
        }
        if (selectedObject.objectType) {
            cloned.objectType = selectedObject.objectType;
        }
        
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
        persistActiveCanvasState();
    });
}

// ズームリセット
function resetCanvasZoom() {
    if (!canvas) return;

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1);
    canvasZoom = 1;

    centerCanvasInView();
    syncCanvasViewportSize({ recenter: true });
   updateZoomUiFromCanvas();

    canvas.requestRenderAll();

    scheduleCanvasHistoryCapture();
    persistActiveCanvasState();
}

// ズーム取得
function getCanvasZoom() {
    return canvasZoom;
}

// レイヤー移動：最前面へ
function bringToFront() {
    const obj = getSelectedObject();
    if (!obj || !canvas) return;
    
    canvas.bringToFront(obj);
    canvas.renderAll();
    
    showNotification('最前面に移動しました', 'success');
    
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    scheduleCanvasHistoryCapture();
}

// レイヤー移動：最背面へ
function sendToBack() {
    const obj = getSelectedObject();
    if (!obj || !canvas) return;
    
    canvas.sendToBack(obj);
    canvas.renderAll();
    
    showNotification('最背面に移動しました', 'success');
    
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    scheduleCanvasHistoryCapture();
}

// レイヤー移動：前へ
function bringForward() {
    const obj = getSelectedObject();
    if (!obj || !canvas) return;
    
    canvas.bringForward(obj);
    canvas.renderAll();
    
    showNotification('前面に移動しました', 'success');
    
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    scheduleCanvasHistoryCapture();
}

// レイヤー移動：後ろへ
function sendBackward() {
    const obj = getSelectedObject();
    if (!obj || !canvas) return;
    
    canvas.sendBackward(obj);
    canvas.renderAll();
    
    showNotification('背面に移動しました', 'success');
    
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    scheduleCanvasHistoryCapture();
}

// キャンバスサイズ変更
function resizeCanvas(width, height) {
    if (!canvas) return;
    
    // キャンバスサイズを設定
    canvas.setWidth(width);
    canvas.setHeight(height);
    
    // ズームをリセット
    resetCanvasZoom();
    
    // キャンバスコンテナの高さを調整
    const container = document.getElementById('canvasContainer');
    if (container) {
        const maxHeight = window.innerHeight * 0.6;
        const actualHeight = Math.min(height + 40, maxHeight);
        container.style.maxHeight = actualHeight + 'px';
    }

    showNotification(`キャンバスサイズを${width}×${height}に変更しました`, 'success');

    scheduleCanvasHistoryCapture();
}

// ズームスライダーの初期化
function setupZoomSlider() {
    const zoomValue = document.getElementById('zoomValue');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const zoomFitBtn = document.getElementById('zoomFitBtn');

    if (!canvas) return;

    // ズームイン (+10%)
    zoomInBtn.addEventListener('click', function() {
        const currentZoomPercent = Math.round(canvas.getZoom() * 100);
        const newZoomPercent = Math.min(currentZoomPercent + 10, MAX_CANVAS_ZOOM * 100);
        const clampedZoom = clampCanvasZoom(newZoomPercent / 100);
        applyCanvasZoom(clampedZoom, { centerOnView: true });
    });

    // ズームアウト (-10%)
    zoomOutBtn.addEventListener('click', function() {
        const currentZoomPercent = Math.round(canvas.getZoom() * 100);
        const newZoomPercent = Math.max(currentZoomPercent - 10, MIN_CANVAS_ZOOM * 100);
        const clampedZoom = clampCanvasZoom(newZoomPercent / 100);
        applyCanvasZoom(clampedZoom, { centerOnView: true });
    });

    // ズームリセット (100%)
    zoomResetBtn.addEventListener('click', function() {
        resetCanvasZoom();
    });

    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', function() {
            fitCanvasToContainer();
        });
    }

    canvas.on('after:render', function() {
        updateZoomUiFromCanvas();
    });
}

// ズーム値を更新（外部から呼び出し可能）
function updateZoomDisplay() {
    const zoomValue = document.getElementById('zoomValue');
    
    if (zoomValue && canvas) {
        const currentZoom = Math.round(canvas.getZoom() * 100);
        zoomValue.textContent = currentZoom + '%';
    }
}

// キャンバスを表示領域の中央に配置
function centerCanvasInView() {
    if (!canvas) return;
    
    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer) return;
    
    const zoom = canvas.getZoom();
    
    // コンテナの中心座標
    const containerCenterX = canvasContainer.clientWidth / 2;
    const containerCenterY = canvasContainer.clientHeight / 2;
    
    // キャンバスの中心座標（論理座標）
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    // viewportTransformを直接操作してビューポートを中央配置
    // viewportCenterObjectは実在するFabricオブジェクトが必要なため、代わりにabsolutePanを使用
    const vpt = canvas.viewportTransform.slice(); // コピー
    vpt[4] = containerCenterX - canvasCenterX * zoom;
    vpt[5] = containerCenterY - canvasCenterY * zoom;
    canvas.setViewportTransform(vpt);
    
    canvas.requestRenderAll();
}

// グローバルエクスポート
window.getCanvasCollection = getCanvasCollection;
window.getActiveCanvasId = getActiveCanvasId;
window.setActiveCanvas = setActiveCanvas;
window.addCanvasBelow = addCanvasBelow;
window.disposeCanvasById = disposeCanvasById;
window.loadCanvasesFromProjectData = loadCanvasesFromProjectData;
window.resetCanvasWorkspaceToDefault = resetCanvasWorkspaceToDefault;
window.deleteCanvasById = handleCanvasDeletion;
