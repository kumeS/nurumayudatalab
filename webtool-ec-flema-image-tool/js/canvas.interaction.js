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
        wrapper.addEventListener('click', (e) => {
            // クリックされた要素からcanvasIdを取得
            const targetId = getCanvasIdFromElement(e.target);
            if (targetId && targetId !== activeCanvasId) {
                setActiveCanvas(targetId);
            }
        });
    }

    fabricCanvas.on('mouse:down', (opt) => {
        // パン操作中でない場合のみキャンバスを切り替え
        if (!panContext.isPanning) {
            ensureActive();
        }
    });

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

    // 削除ボタンの位置を更新
    updateCanvasSlotToolbarPosition(state);
}

// キャンバス削除ボタンの位置をキャンバスサイズに応じて更新
function updateCanvasSlotToolbarPosition(state) {
    if (!state || !state.wrapper || !state.canvas) return;

    const toolbar = state.wrapper.querySelector('.canvas-slot-toolbar');
    if (!toolbar) return;

    toolbar.style.left = '100%';
    toolbar.style.right = 'auto';
    toolbar.style.marginLeft = '12px';
    toolbar.style.top = '12px';
    toolbar.style.transform = 'none';
}

function createCanvasStateFromElement(canvasElement, wrapper, options = {}) {
    const canvasId = canvasElement.id || generateCanvasId();
    canvasElement.id = canvasId;
    if (wrapper) {
        wrapper.dataset.canvasId = canvasId;
    }
    ensureCanvasIdCounter(canvasId);

    const initialWidth = (options && typeof options.width === 'number')
        ? options.width
        : preferredCanvasSize.width;
    const initialHeight = (options && typeof options.height === 'number')
        ? options.height
        : preferredCanvasSize.height;

    // canvas要素の描画解像度を明示的に設定
    canvasElement.width = initialWidth;
    canvasElement.height = initialHeight;

    // CSSサイズも明示的に設定
    canvasElement.style.width = initialWidth + 'px';
    canvasElement.style.height = initialHeight + 'px';

    const fabricCanvas = new fabric.Canvas(canvasElement, {
        backgroundColor: 'transparent',  // Bug修正: CSS背景を使用するため透明化
        preserveObjectStacking: true,
        selection: true,
        width: initialWidth,
        height: initialHeight,
        clipPath: null,  // クリッピングなし
        renderOnAddRemove: false,  // 手動で描画制御（Bug修正: タイミング問題を回避）
        enableRetinaScaling: true,  // Retina対応
        stateful: true,  // オブジェクトの状態管理を有効化
        controlsAboveOverlay: true  // ★追加: コントロールを最前面に表示
    });

    // ★Bug12修正: 既存のsharedCanvasZoomを即座に適用
    // これにより、新しいキャンバスが既存のキャンバスと同じズームで表示される
    if (sharedCanvasZoom !== 1.0 && isFinite(sharedCanvasZoom)) {
        fabricCanvas.setZoom(sharedCanvasZoom);
        console.log('[Bug12] Applied shared zoom to new canvas:', sharedCanvasZoom);
    }

    // ★追加: グローバル設定でもコントロールを最前面に
    fabric.Object.prototype.controlsAboveOverlay = true;

    // 初期描画を遅延実行（DOM準備完了を待つ）
    requestAnimationFrame(() => {
        // z-indexと背景色を強制設定（Bug修正: CSSとJSの両方から設定）
        if (fabricCanvas.upperCanvasEl) {
            fabricCanvas.upperCanvasEl.style.zIndex = '11';
            fabricCanvas.upperCanvasEl.style.pointerEvents = 'auto';
            fabricCanvas.upperCanvasEl.style.backgroundColor = 'transparent';
            console.log('[Canvas] Upper canvas z-index set to 11, background: transparent');
        }
        if (fabricCanvas.lowerCanvasEl) {
            fabricCanvas.lowerCanvasEl.style.zIndex = '10';
            fabricCanvas.lowerCanvasEl.style.backgroundColor = '#ffffff';
            console.log('[Canvas] Lower canvas z-index set to 10, background: #ffffff');
        }

        fabricCanvas.calcOffset();
        fabricCanvas.renderAll();
        console.log('[Canvas] Initial render completed for:', canvasId, 
                    'zoom:', fabricCanvas.getZoom());
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
    updatePreferredCanvasSize(initialWidth, initialHeight);
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
    
    // ★Bug12修正: canvas要素のwidth/height属性を初期設定
    // これによりブラウザのデフォルトサイズ（300x150）を回避し、
    // HTML定義のmainCanvasと同じサイズで開始する
    canvasElement.width = preferredCanvasSize.width;
    canvasElement.height = preferredCanvasSize.height;
    
    console.log('[Bug12] Canvas element created with size:', 
                preferredCanvasSize.width, 'x', preferredCanvasSize.height);
    
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

    const referenceState = getActiveCanvasState();
    const referenceCanvas = referenceState ? referenceState.canvas : null;
    const referenceWidth = referenceCanvas
        ? (typeof referenceCanvas.getWidth === 'function' ? referenceCanvas.getWidth() : referenceCanvas.width)
        : preferredCanvasSize.width;
    const referenceHeight = referenceCanvas
        ? (typeof referenceCanvas.getHeight === 'function' ? referenceCanvas.getHeight() : referenceCanvas.height)
        : preferredCanvasSize.height;

    const state = createCanvasStateFromElement(canvasElement, wrapper, {
        width: referenceWidth,
        height: referenceHeight
    });
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
                backgroundColor: 'transparent',  // Bug修正: CSS背景を使用
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
            backgroundColor: 'transparent',  // Bug修正: CSS背景を使用
            json: projectData.canvasData,
            zoom: typeof projectData.zoom === 'number' ? projectData.zoom : null
        });
    } else {
        entries.push({
            id: 'mainCanvas',
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT,
            backgroundColor: 'transparent',  // Bug修正: CSS背景を使用
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

        const state = createCanvasStateFromElement(canvasElement, wrapper, {
            width: entry.width || DEFAULT_CANVAS_WIDTH,
            height: entry.height || DEFAULT_CANVAS_HEIGHT
        });
        setActiveCanvas(state.id, { force: true, recenter: true });

        state.canvas.setWidth(entry.width || DEFAULT_CANVAS_WIDTH);
        state.canvas.setHeight(entry.height || DEFAULT_CANVAS_HEIGHT);
        state.canvas.backgroundColor = 'transparent';  // Bug修正: CSS背景を使用
        state.canvas.renderAll();

        if (entry.json) {
            await deserializeCanvas(state.canvas, entry.json);
        } else {
            state.canvas.clear();
            state.canvas.backgroundColor = 'transparent';  // Bug修正: CSS背景を使用
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

    // ★Bug13修正: プロジェクトデータからの復元時は、
    // 保存されたキャンバスサイズとズームを尊重し、
    // fitCanvasToContainer()は呼ばない
    // （新規プロジェクト作成時のみfitを実行）
    const isNewProject = !projectData || 
        (!projectData.canvases || projectData.canvases.length === 0) ||
        (projectData.canvases.length === 1 && !projectData.canvases[0].json);
    if (isNewProject) {
        console.log('[Bug13] New project detected, fitting to container');
        fitCanvasToContainer();
    } else {
        console.log('[Bug13] Existing project loaded, maintaining saved canvas size and zoom');
        // 既存プロジェクトの場合は、ビューポートサイズのみ同期
        syncCanvasViewportSize({ recenter: true });
        updateZoomUiFromCanvas();
    }
}

