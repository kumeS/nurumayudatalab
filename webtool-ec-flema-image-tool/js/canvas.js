// ========== キャンバス管理モジュール ==========
// Fabric.jsキャンバスの初期化と基本操作

let canvas = null;
let selectedObject = null;
let canvasZoom = 1;
let isPanning = false;
let lastPosX = 0;
let lastPosY = 0;
let viewportTransform = [1, 0, 0, 1, 0, 0];
const CANVAS_HISTORY_LIMIT = 25;
const CANVAS_STATE_PROPS = ['id', 'objectType', 'customData', 'customFilters', 'shadow'];
let canvasHistory = [];
let isLoadingHistory = false;
let historyCaptureTimer = null;
const MIN_CANVAS_ZOOM = 0.1;
const MAX_CANVAS_ZOOM = 5;
const DEFAULT_CANVAS_WIDTH = 1080;
const DEFAULT_CANVAS_HEIGHT = 1080;
const INITIAL_CANVAS_ZOOM = 0.5;  // 50% - より操作しやすいズームレベル
let suppressTabSwitchFlag = false;

window.DEFAULT_CANVAS_WIDTH = DEFAULT_CANVAS_WIDTH;
window.DEFAULT_CANVAS_HEIGHT = DEFAULT_CANVAS_HEIGHT;

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

function getCanvasStateSnapshot() {
    if (!canvas) return null;
    return {
        json: canvas.toJSON(CANVAS_STATE_PROPS),
        width: canvas.getWidth ? canvas.getWidth() : canvas.width,
        height: canvas.getHeight ? canvas.getHeight() : canvas.height,
        backgroundColor: canvas.backgroundColor,
        viewportTransform: canvas.viewportTransform ? [...canvas.viewportTransform] : null,
        zoom: canvas.getZoom()
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
}

function registerCanvasHistoryEvents() {
    if (!canvas) return;
    ['object:added', 'object:modified', 'object:removed'].forEach(eventName => {
        canvas.on(eventName, () => scheduleCanvasHistoryCapture());
    });
}

function resetCanvasHistory() {
    if (!canvas) return;
    isLoadingHistory = false;
    clearTimeout(historyCaptureTimer);
    historyCaptureTimer = null;
    canvasHistory = [];
    captureCanvasState(true);
}

function loadCanvasHistoryState(serialized) {
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
        showNotification('1つ前の状態に戻しました', 'success');
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

    // Remove current state
    canvasHistory.pop();
    const targetState = canvasHistory[canvasHistory.length - 1];
    loadCanvasHistoryState(targetState);
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

    // 重要: DOM要素には常に論理サイズ（ズーム適用前）のwidthとheightを設定
    // Fabric.jsの内部ズーム機構(viewportTransform)が拡大縮小を担当
    [wrapper, lower, upper].forEach((el) => {
        if (!el) return;
        // ズーム後のサイズではなく、キャンバスの論理サイズを設定
        el.style.width = `${canvasWidth}px`;
        el.style.height = `${canvasHeight}px`;
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
}

// キャンバス初期化
function initializeFabricCanvas() {
    const canvasElement = document.getElementById('mainCanvas');
    
    canvas = new fabric.Canvas('mainCanvas', {
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
        clipPath: null // キャンバス外のオブジェクトも表示
    });

    // キャンバスを表示
    canvasElement.classList.add('active');

    // ウィンドウリサイズ対応
    window.addEventListener('resize', handleCanvasResize);

    // オブジェクト選択イベント
    canvas.on('selection:created', handleObjectSelection);
    canvas.on('selection:updated', handleObjectSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', handleObjectModified);

    // オブジェクト追加・変更時に即座に保存（データ消失防止）
    canvas.on('object:added', triggerQuickSave);
    canvas.on('object:modified', triggerQuickSave);
    canvas.on('object:removed', triggerQuickSave);
    
    // タッチスクロール防止（キャンバス内）
    canvasElement.addEventListener('touchmove', (e) => {
        if (canvas.getActiveObject()) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // ピンチズーム機能を追加
    setupCanvasZoom();
    
    // パン機能を追加
    setupCanvasPan();

    // 初期表示は「画面に合わせる（フィット）」に統一
    // ビューポートサイズを先に同期してから、フィットを適用
    syncCanvasViewportSize();
    fitCanvasToContainer();
    updateZoomUiFromCanvas();

    registerCanvasHistoryEvents();
    resetCanvasHistory();

    canvas.requestRenderAll();
}

// ピンチズーム機能の設定
function setupCanvasZoom() {
    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer || !canvas) return;

    canvasContainer.addEventListener('wheel', function(e) {
        if (!(e.ctrlKey || e.metaKey)) return;

        e.preventDefault();
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
        if (e.touches.length === 2 && isZooming) {
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
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
            resetCanvasZoom();
            e.preventDefault();
        }
        lastTap = currentTime;
    });
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
    
    if (!obj) return;
    
    if (obj.type === 'activeSelection') {
        selectedObject = null;
        hideTextControls();
        hideImageControls();
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
}

// 選択解除時の処理
function handleSelectionCleared() {
    selectedObject = null;
    suppressTabSwitchFlag = false;
    hideTextControls();
    hideImageControls();
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
    const zoom = canvas.getZoom();
    
    // コンテナの中心座標
    const containerCenterX = canvasContainer.clientWidth / 2;
    const containerCenterY = canvasContainer.clientHeight / 2;
    
    // キャンバスの中心座標（論理座標）
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    // Fabric.jsのabsolutePanを使って正しく中央配置
    // これによりズーム後の座標変換が正しく維持される
    const point = new fabric.Point(canvasCenterX, canvasCenterY);
    canvas.viewportCenterObject({
        left: canvasCenterX,
        top: canvasCenterY,
        getCenterPoint: function() { return point; }
    });
    
    canvas.requestRenderAll();
}

// パン機能の設定
function setupCanvasPan() {
    if (!canvas) return;
    
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;
    
    // マウスパン（Spaceキー + ドラッグ、または中ボタンドラッグ）
    canvas.on('mouse:down', function(opt) {
        const evt = opt.e;
        if (evt.spaceKey || evt.button === 1) {
            isPanning = true;
            canvas.selection = false;
            lastX = evt.clientX;
            lastY = evt.clientY;
            canvas.defaultCursor = 'grab';
            canvas.setCursor('grabbing');
        }
    });
    
    canvas.on('mouse:move', function(opt) {
        if (isPanning) {
            const evt = opt.e;
            const vpt = canvas.viewportTransform;
            vpt[4] += evt.clientX - lastX;
            vpt[5] += evt.clientY - lastY;
            canvas.requestRenderAll();
            lastX = evt.clientX;
            lastY = evt.clientY;
        }
    });
    
    canvas.on('mouse:up', function() {
        if (isPanning) {
            isPanning = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            canvas.setCursor('default');
        }
    });
    
    // Spaceキー検知
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            e.spaceKey = true;
            canvas.defaultCursor = 'grab';
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (e.code === 'Space') {
            e.spaceKey = false;
            if (!isPanning) {
                canvas.defaultCursor = 'default';
            }
        }
    });
    
    // タッチパン（2本指ドラッグ）
    let touchStartDist = 0;
    let touchPanning = false;
    const canvasContainer = document.getElementById('canvasContainer');
    
    canvasContainer.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            touchPanning = true;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastX = (touch1.clientX + touch2.clientX) / 2;
            lastY = (touch1.clientY + touch2.clientY) / 2;
            touchStartDist = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }, { passive: false });
    
    canvasContainer.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2 && touchPanning) {
            e.preventDefault();
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            
            const dist = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            // ズームとパンを区別（距離変化が小さい場合はパン）
            if (Math.abs(dist - touchStartDist) < 10) {
                const vpt = canvas.viewportTransform;
                vpt[4] += centerX - lastX;
                vpt[5] += centerY - lastY;
                canvas.requestRenderAll();
            }
            
            lastX = centerX;
            lastY = centerY;
            touchStartDist = dist;
        }
    }, { passive: false });
    
    canvasContainer.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            touchPanning = false;
        }
    });
}
