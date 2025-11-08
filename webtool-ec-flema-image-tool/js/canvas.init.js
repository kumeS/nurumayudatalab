function resetCanvasWorkspaceToDefault() {
    console.log('[Canvas] Resetting canvas workspace to default...');
    const stack = document.getElementById('canvasStack');
    if (!stack) {
        console.error('[Canvas] Canvas stack not found');
        return;
    }

    const idsToRemove = canvasOrder.slice(1);
    console.log('[Canvas] Removing extra canvases:', idsToRemove);
    idsToRemove.forEach(id => disposeCanvasById(id));

    let baseId = canvasOrder[0];
    if (!baseId) {
        console.log('[Canvas] No base canvas found, creating new one');
        const { wrapper, canvasElement } = createCanvasSlotElement('mainCanvas');
        stack.appendChild(wrapper);
        const state = createCanvasStateFromElement(canvasElement, wrapper);
        baseId = state.id;
    }

    console.log('[Canvas] Setting active canvas:', baseId);
    setActiveCanvas(baseId, { force: true, recenter: true });

    const state = getActiveCanvasState();
    if (state && state.canvas) {
        console.log('[Canvas] Clearing canvas and resetting to default size');
        state.canvas.clear();
        state.canvas.backgroundColor = 'transparent';  // Bug修正: CSS背景を使用
        state.canvas.setWidth(DEFAULT_CANVAS_WIDTH);
        state.canvas.setHeight(DEFAULT_CANVAS_HEIGHT);

        // z-indexと背景色を再設定（念のため）
        if (state.canvas.upperCanvasEl) {
            state.canvas.upperCanvasEl.style.zIndex = '11';
            state.canvas.upperCanvasEl.style.pointerEvents = 'auto';
            state.canvas.upperCanvasEl.style.backgroundColor = 'transparent';
        }
        if (state.canvas.lowerCanvasEl) {
            state.canvas.lowerCanvasEl.style.zIndex = '10';
            state.canvas.lowerCanvasEl.style.backgroundColor = '#ffffff';
        }

        state.canvas.renderAll();
        updatePreferredCanvasSize(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);
        console.log('[Canvas] Canvas reset complete, size:', DEFAULT_CANVAS_WIDTH, 'x', DEFAULT_CANVAS_HEIGHT);
    } else {
        console.error('[Canvas] Active canvas state not found');
    }

    resetCanvasZoom();
    resetCanvasHistory();
    console.log('[Canvas] Workspace reset complete');
    
    // ★Bug13修正: デフォルトサイズに戻した後は、
    // そのサイズを維持し、fitはしない
    // 新規プロジェクト作成時などは画面にフィットさせる
    fitCanvasToContainer();
}

// キャンバス初期化
function initializeFabricCanvas() {
    const stack = document.getElementById('canvasStack');
    if (!stack) {
        console.error('Canvas stack element not found');
        return;
    }

    console.log('=== DEBUG: Canvas Initialization ===');
    console.log('Canvas stack found:', stack);
    console.log('Existing canvas slots:', stack.querySelectorAll('.canvas-slot').length);

    let slots = Array.from(stack.querySelectorAll('.canvas-slot'));
    if (slots.length === 0) {
        console.log('No canvas slots found, creating default slot');
        const { wrapper, canvasElement } = createCanvasSlotElement('mainCanvas');
        stack.appendChild(wrapper);
        canvasElement.id = 'mainCanvas';
        wrapper.dataset.canvasId = 'mainCanvas';
        slots = [wrapper];
    }

    console.log('Canvas slots to initialize:', slots.length);

    let firstStateId = null;
    slots.forEach((slot, index) => {
        const canvasElement = slot.querySelector('canvas');
        if (!canvasElement) {
            console.error('Canvas element not found in slot:', slot);
            return;
        }

        console.log(`Initializing canvas ${index + 1}:`, canvasElement.id);

        const initialWidth = canvasElement.width || preferredCanvasSize.width;
        const initialHeight = canvasElement.height || preferredCanvasSize.height;
        const state = createCanvasStateFromElement(canvasElement, slot, {
            width: initialWidth,
            height: initialHeight
        });

        console.log(`Canvas state created:`, state.id, 'fabric canvas:', !!state.canvas);

        setActiveCanvas(state.id, { force: true, recenter: index === 0 });
        resetCanvasHistory();
        if (index === 0) {
            firstStateId = state.id;
        }
    });

    if (firstStateId) {
        setActiveCanvas(firstStateId, { force: true, recenter: true });
        fitCanvasToContainer();
        
        // ★Bug7修正: 初期化完了後にコンテナを表示
        const container = document.getElementById('canvasContainer');
        if (container) {
            // 少し遅延させてから表示（描画完了を待つ）
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    container.classList.add('initialized');
                    console.log('[Bug7] Canvas container initialized and visible');
                });
            });
        }
        
        console.log('Canvas initialization completed, active canvas:', firstStateId);
        console.log('Canvas dimensions:', canvas ? [canvas.width, canvas.height] : 'N/A');
        console.log('Canvas objects count:', canvas ? canvas.getObjects().length : 'N/A');
        dbgCanvas('initializeFabricCanvas', {
            activeId: firstStateId,
            zoom: canvas ? canvas.getZoom() : null,
            canvasSize: canvas ? [canvas.width, canvas.height] : null
        });
    } else {
        console.error('No canvas was successfully initialized');
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

    // ★Bug7 Fix: Display toolbar based on OBJECT TYPE, not active tab
    // This matches user expectations: clicking an object shows its controls

    if (obj.objectType === 'uploaded-image') {
        // Image object selected → show image controls
        console.log('[Bug7 Fix] Image object selected, showing image controls');
        showImageControls();
        updateImageControlsUI(obj);
        hideTextControls();
    }
    else if (obj.type === 'i-text') {
        // Text object selected → show text controls
        console.log('[Bug7 Fix] Text object selected, showing text controls');
        showTextControls();
        updateTextControlsUI(obj);
        hideImageControls();
    }
    else {
        // Other object types (future: logos, shapes, etc.)
        // For now, hide all controls
        console.log('[Bug7 Fix] Other object type selected:', obj.type);
        hideTextControls();
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

// Canvasサイズの同期を確保する関数
function ensureCanvasSizeSync() {
    const canvas = getCanvas();
    if (!canvas) return;

    const canvasElement = canvas.getElement();
    if (!canvasElement) return;

    // HTML属性とFabric.jsサイズの同期
    canvasElement.width = canvas.width;
    canvasElement.height = canvas.height;

    // CSSサイズも確認（必ず一致させる）
    canvasElement.style.width = canvas.width + 'px';
    canvasElement.style.height = canvas.height + 'px';

    // offsetとrenderを確実に実行
    canvas.calcOffset();

    // requestAnimationFrame内で描画
    requestAnimationFrame(() => {
        canvas.renderAll();
        console.log('[Canvas] Size sync and render completed');
    });
}

// デバッグ用の強制再描画機能
function forceCanvasRedraw() {
    const canvas = getCanvas();
    if (!canvas) {
        console.warn('Canvas not available for redraw');
        return;
    }

    canvas.calcOffset();
    canvas.renderAll();
    console.log('Canvas forced redraw - objects:', canvas.getObjects().length);

    // 通知を表示
    showNotification('キャンバスを再描画しました', 'info');
}

// グローバル関数として公開（コンソールから呼び出し可能）
window.forceCanvasRedraw = forceCanvasRedraw;

// キャンバス取得
function getCanvas() {
    console.log('[DEBUG] getCanvas called, canvas:', canvas);
    console.log('[DEBUG] canvas type:', typeof canvas);
    console.log('[DEBUG] canvas instance:', canvas instanceof fabric.Canvas);
    if (canvas) {
        console.log('[DEBUG] canvas width/height:', canvas.width, canvas.height);
        console.log('[DEBUG] canvas objects count:', canvas.getObjects().length);
    }
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
    sharedCanvasZoom = 1;

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

    // ★Bug13修正: キャンバスサイズ変更時の完全な相対サイズ・位置維持

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    const currentZoom = canvas.getZoom();
    
    // 入力値の検証
    if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
        console.error('[ResizeCanvas] Invalid canvas size:', width, height);
        showNotification('無効なキャンバスサイズです', 'error');
        return;
    }
    
    console.log('[Bug13 ResizeCanvas] Starting resize:', {
        oldSize: [oldWidth, oldHeight],
        newSize: [width, height],
        currentZoom: currentZoom
    });

    // 全オブジェクトの相対位置・相対サイズを記録
    const objectRelativeData = new Map();
    canvas.getObjects().forEach(obj => {
        // キャンバスに対する相対位置（0.0～1.0）
        const relativeLeft = obj.left / oldWidth;
        const relativeTop = obj.top / oldHeight;
        
        // キャンバスに対する相対サイズ（0.0～1.0）
        const objectCanvasWidth = obj.width * obj.scaleX;
        const objectCanvasHeight = obj.height * obj.scaleY;
        const relativeWidth = objectCanvasWidth / oldWidth;
        const relativeHeight = objectCanvasHeight / oldHeight;
        
        objectRelativeData.set(obj, {
            relativeLeft,
            relativeTop,
            relativeWidth,
            relativeHeight,
            originalWidth: obj.width,
            originalHeight: obj.height
        });
        
        console.log('[Bug13 ResizeCanvas] Object relative data:', {
            type: obj.type,
            relativePos: [relativeLeft.toFixed(3), relativeTop.toFixed(3)],
            relativeSize: [relativeWidth.toFixed(3), relativeHeight.toFixed(3)]
        });
    });

    // キャンバスサイズを変更
    canvas.setWidth(width);
    canvas.setHeight(height);
    updatePreferredCanvasSize(width, height);

    // 全オブジェクトの相対位置・相対サイズを復元
    canvas.getObjects().forEach(obj => {
        const relData = objectRelativeData.get(obj);
        if (!relData) return;
        
        // 新しいキャンバスでの絶対位置
        const newLeft = relData.relativeLeft * width;
        const newTop = relData.relativeTop * height;
        
        // 新しいキャンバスでの相対サイズを維持するための新しいスケール
        const newScaleX = (relData.relativeWidth * width) / relData.originalWidth;
        const newScaleY = (relData.relativeHeight * height) / relData.originalHeight;
        
        obj.set({
            left: newLeft,
            top: newTop,
            scaleX: newScaleX,
            scaleY: newScaleY
        });
        
        obj.setCoords();
        
        console.log('[Bug13 ResizeCanvas] Object updated:', {
            type: obj.type,
            newPos: [newLeft.toFixed(2), newTop.toFixed(2)],
            newScale: [newScaleX.toFixed(4), newScaleY.toFixed(4)]
        });
    });

    // ★重要: ズームは変更しない（ユーザー設定を維持）
    canvas.setZoom(currentZoom);
    canvasZoom = currentZoom;
    sharedCanvasZoom = currentZoom;
    
    // ビューポートを中央に配置
    centerCanvasInView();
    syncCanvasViewportSize({ recenter: true });
    updateZoomUiFromCanvas();
    
    canvas.requestRenderAll();
    
    console.log('[Bug13 ResizeCanvas] Resize completed:', {
        newSize: [width, height],
        maintainedZoom: currentZoom,
        zoomPercentage: Math.round(currentZoom * 100) + '%'
    });

    // 削除ボタンの位置を更新
    const state = getActiveCanvasState();
    if (state) {
        updateCanvasSlotToolbarPosition(state);
        persistActiveCanvasState();
    }

    showNotification(
        `キャンバスサイズを${width}×${height}に変更しました\n※画像の相対位置・サイズは完全に維持されます`,
        'success'
    );

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

// ★Bug17修正: キャンバスを表示領域の正確な中央に配置
function centerCanvasInView() {
    if (!canvas) return;

    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer) return;

    const zoom = canvas.getZoom();

    // ★修正: パディング値を動的に取得
    const computedStyle = window.getComputedStyle(canvasContainer);
    const paddingLeft = parseFloat(computedStyle.paddingLeft || '0');
    const paddingRight = parseFloat(computedStyle.paddingRight || '0');
    const paddingTop = parseFloat(computedStyle.paddingTop || '0');
    const paddingBottom = parseFloat(computedStyle.paddingBottom || '0');

    // ★修正: 実際の表示可能領域を計算
    const availableWidth = Math.max(
        canvasContainer.clientWidth - paddingLeft - paddingRight,
        0
    );
    const availableHeight = Math.max(
        canvasContainer.clientHeight - paddingTop - paddingBottom,
        0
    );

    // ★修正: 実際の表示領域の中心座標を計算
    const containerCenterX = paddingLeft + availableWidth / 2;
    const containerCenterY = paddingTop + availableHeight / 2;

    // キャンバスの中心座標（論理座標）
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // ★Bug_report4対応: CSS Transform scale()を使用している場合、
    // transform-origin: center centerにより自動的に中央配置されるため、
    // viewportTransformのオフセットは不要（むしろ二重にオフセットされてずれる）
    const vpt = canvas.viewportTransform.slice(); // コピー

    // CSS Transform使用時は viewportTransform のオフセットをゼロにする
    vpt[4] = 0;
    vpt[5] = 0;
    canvas.setViewportTransform(vpt);

    canvas.requestRenderAll();

    // ★追加: デバッグログ (開発時のみ有効化)
    if (DEBUG_CANVAS) {
        console.log('[Bug17 Fix] centerCanvasInView:', {
            containerSize: [canvasContainer.clientWidth, canvasContainer.clientHeight],
            padding: { left: paddingLeft, right: paddingRight, top: paddingTop, bottom: paddingBottom },
            availableSize: [availableWidth, availableHeight],
            center: [containerCenterX, containerCenterY],
            zoom: zoom,
            vpt: [vpt[4], vpt[5]]
        });
    }
}

// ★Bug6 Fix: Add debounced resize handler for container height recalculation
let resizeTimeoutForFit;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeoutForFit);
    resizeTimeoutForFit = setTimeout(() => {
        const container = document.getElementById('canvasContainer');
        if (container && canvas) {
            console.log('[Bug6 Fix] Window resized, recalculating container height');
            // Reset container height to allow recalculation
            if (container.style.height) {
                container.style.height = '';
                container.style.minHeight = '';
                container.style.maxHeight = '';
            }
            // Sync viewport size with new dimensions
            handleCanvasResize();
        }
    }, 250);
});

// グローバルエクスポート
window.getCanvasCollection = getCanvasCollection;
window.getActiveCanvasId = getActiveCanvasId;
window.setActiveCanvas = setActiveCanvas;
window.addCanvasBelow = addCanvasBelow;
window.disposeCanvasById = disposeCanvasById;
window.loadCanvasesFromProjectData = loadCanvasesFromProjectData;
window.resetCanvasWorkspaceToDefault = resetCanvasWorkspaceToDefault;
window.deleteCanvasById = handleCanvasDeletion;
