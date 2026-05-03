// ========== ユーティリティモジュール ==========
// 汎用機能とヘルパー関数

// Fabric.js の textBaseline 警告対策（`alphabetical` → `alphabetic` 正規化）
if (window.fabric?.Text?.prototype?._setTextStyles) {
    fabric.Text.prototype._setTextStyles = function(ctx, decl, style) {
        ctx.textBaseline = 'alphabetic';

        if (this.path) {
            switch (this.pathAlign) {
                case 'center':
                    ctx.textBaseline = 'middle';
                    break;
                case 'ascender':
                    ctx.textBaseline = 'top';
                    break;
                case 'descender':
                    ctx.textBaseline = 'bottom';
                    break;
            }
        }

        ctx.font = this._getFontDeclaration(decl, style);
    };
}

// ========== 共通ヘルパー関数 ==========

// 触覚フィードバック＋通知のヘルパー
function vibrateAndNotify(message, type = 'success', vibratePattern = 30) {
    showNotification(message, type);
    if (navigator.vibrate) {
        navigator.vibrate(vibratePattern);
    }
}

// コントロール非表示の共通処理
function hideAllControls() {
    if (typeof hideImageControls === 'function') {
        hideImageControls();
    }
    if (typeof hideTextControls === 'function') {
        hideTextControls();
    }
}

// キャンバス状態の自動保存トリガー
function saveCanvasState() {
    if (typeof scheduleCanvasHistoryCapture === 'function') {
        scheduleCanvasHistoryCapture();
    }
    if (typeof triggerQuickSave === 'function') {
        triggerQuickSave();
    }
    if (typeof persistActiveCanvasState === 'function') {
        persistActiveCanvasState();
    }
}

// キャンバス取得と検証の共通処理
function getValidCanvas() {
    const canvas = typeof getCanvas === 'function' ? getCanvas() : null;
    if (!canvas) {
        console.warn('[getValidCanvas] Canvas not available');
    }
    return canvas;
}

// オブジェクト座標更新とレンダリングの共通処理
function updateAndRender(obj, canvas = null) {
    if (!canvas) {
        canvas = getValidCanvas();
    }
    if (!canvas) return;
    
    if (obj && typeof obj.setCoords === 'function') {
        obj.setCoords();
    }
    
    if (typeof canvas.calcOffset === 'function') {
        canvas.calcOffset();
    }
    
    canvas.requestRenderAll();
}

// レイヤー操作の共通処理
function moveLayer(direction, notificationMsg) {
    const obj = getSelectedObject();
    const canvas = getValidCanvas();
    if (!obj || !canvas) return;
    
    switch(direction) {
        case 'front':
            canvas.bringToFront(obj);
            break;
        case 'back':
            canvas.sendToBack(obj);
            break;
        case 'forward':
            canvas.bringForward(obj);
            break;
        case 'backward':
            canvas.sendBackward(obj);
            break;
    }
    
    canvas.renderAll();
    vibrateAndNotify(notificationMsg, 'success');
    saveCanvasState();
}

// タブ切り替え
function switchTab(activeTab) {
    document.querySelectorAll('.tool-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tool-panel').forEach(panel => panel.classList.remove('active'));

    activeTab.classList.add('active');
    const tabName = activeTab.dataset.tab;
    document.getElementById(tabName + 'Panel').classList.add('active');

    // ★ Bug8 Fix #1: DON'T force-hide controls on tab switch
    // Controls visibility is managed by handleObjectSelection()
    // based on selected object type, not active tab
    //
    // This allows user to:
    // - Switch tabs while editing an object
    // - Access upload/creation tools while keeping edit controls visible
    // - Have consistent behavior across tab switches
    //
    // REMOVED: Automatic hiding of controls on tab switch
    // if (typeof hideImageControls === 'function') {
    //     hideImageControls();
    // }
    // if (typeof hideTextControls === 'function') {
    //     hideTextControls();
    // }

    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}

// キーボードショートカット処理
function handleKeyboardShortcuts(e) {
    const activeElement = document.activeElement;
    const isEditing = activeElement.tagName === 'INPUT' || 
                     activeElement.tagName === 'TEXTAREA' ||
                     activeElement.classList.contains('text-editing');

    const canvas = getCanvas();
    const activeObjects = !isEditing && canvas ? canvas.getActiveObjects() : [];
    const selectedObject = getSelectedObject();

    // Ctrl/Cmd + Shift + Z: Redo
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!isEditing) {
            e.preventDefault();
            redoCanvasAction();
        }
        return;
    }
    
    // Ctrl/Cmd + Z: Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!isEditing) {
            e.preventDefault();
            undoCanvasAction();
        }
        return;
    }
    
    // Delete / Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
        if (activeObjects.length > 0) {
            e.preventDefault();
            const textObjects = activeObjects.filter(obj => obj.type === 'i-text');
            const nonTextObjects = activeObjects.filter(obj => obj.type !== 'i-text');
            
            if (textObjects.length > 0) {
                deleteSelectedText();
                return;
            }
            
            if (typeof deleteSelectedLogo === 'function' && deleteSelectedLogo()) {
                return;
            }

            if (nonTextObjects.length === 1 && nonTextObjects[0].objectType === 'uploaded-image') {
                deleteSelectedImage();
                return;
            }
        } else if (selectedObject) {
            e.preventDefault();
            if (selectedObject.type === 'i-text') {
                deleteSelectedText();
                return;
            }
            if (selectedObject.objectType === 'uploaded-image') {
                deleteSelectedImage();
                return;
            }
            if (typeof deleteSelectedLogo === 'function' && deleteSelectedLogo()) {
                return;
            }
        }
    }
    
    // Ctrl/Cmd + D: 複製
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedObject) {
        e.preventDefault();
        duplicateSelectedObject();
    }
    
    // Ctrl/Cmd + S: 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportImage();
    }
    
    // Escape: 選択解除
    if (e.key === 'Escape' && selectedObject) {
        const canvas = getCanvas();
        canvas.discardActiveObject();
        canvas.renderAll();
    }
}

// スワイプジェスチャー検出（将来の拡張用）
class SwipeDetector {
    constructor(element, onSwipe) {
        this.element = element;
        this.onSwipe = onSwipe;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.minSwipeDistance = 50;
        
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }
    
    handleTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
    }
    
    handleTouchEnd(e) {
        this.endX = e.changedTouches[0].clientX;
        this.endY = e.changedTouches[0].clientY;
        this.detectSwipe();
    }
    
    detectSwipe() {
        const deltaX = this.endX - this.startX;
        const deltaY = this.endY - this.startY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.minSwipeDistance) {
            // 横スワイプ
            if (deltaX > 0) {
                this.onSwipe('right');
            } else {
                this.onSwipe('left');
            }
        } else if (Math.abs(deltaY) > this.minSwipeDistance) {
            // 縦スワイプ
            if (deltaY > 0) {
                this.onSwipe('down');
            } else {
                this.onSwipe('up');
            }
        }
    }
}

// デバイス判定
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// タッチデバイス判定
function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

// ローカルストレージ操作（将来の拡張用）
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('LocalStorage保存エラー:', e);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('LocalStorage読み込みエラー:', e);
        return null;
    }
}

// 画面の向き変更検出
function handleOrientationChange() {
    const canvas = getCanvas();
    if (!canvas) return;

    setTimeout(() => {
        if (typeof handleCanvasResize === 'function') {
            handleCanvasResize();
        }
    }, 200);
}

// 初回起動時のヒント表示
function showInitialHint() {
    const hasSeenHint = loadFromLocalStorage('hasSeenHint');
    
    if (!hasSeenHint && isTouchDevice()) {
        // 簡単なヒントトースト表示（将来実装）
        saveToLocalStorage('hasSeenHint', true);
    }
}

// パフォーマンス最適化: デバウンス関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// パフォーマンス最適化: スロットル関数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// フルスクリーンモード切り替え
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('フルスクリーン表示エラー:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// プロジェクトメニューの表示/非表示
function toggleProjectMenu() {
    const menu = document.getElementById('projectMenu');
    menu.classList.toggle('show');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

function closeProjectMenu() {
    const menu = document.getElementById('projectMenu');
    menu.classList.remove('show');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}

// メニュー外クリックで閉じる
document.addEventListener('click', (e) => {
    const menu = document.getElementById('projectMenu');
    const menuBtn = document.getElementById('projectMenuBtn');
    
    if (menu && menu.classList.contains('show')) {
        if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
            closeProjectMenu();
        }
    }
});

// 設定ダイアログを表示
function showSettingsDialog() {
    const canvas = getCanvas();
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;
    
    const dialog = document.createElement('div');
    dialog.className = 'settings-dialog-overlay';

    // DOMPurifyでサニタイズしてXSS対策
    // ADD_ATTR オプションで id 属性を明示的に許可
    dialog.innerHTML = DOMPurify.sanitize(`
        <div class="settings-dialog">
            <div class="settings-dialog-header">
                <h3><i class="fas fa-cog"></i> 設定</h3>
                <button class="btn-close" id="closeSettingsBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-dialog-body">
                <div class="settings-group">
                    <h4>キャンバスサイズ</h4>
                    <div class="canvas-size-options">
                        <button class="canvas-size-btn" data-size="square-small">
                            <strong>正方形</strong>
                            <small>800 × 800px</small>
                        </button>
                        <button class="canvas-size-btn" data-size="square-large">
                            <strong>正方形（大）</strong>
                            <small>1080 × 1080px</small>
                        </button>
                        <button class="canvas-size-btn" data-size="portrait">
                            <strong>縦長</strong>
                            <small>800 × 1200px</small>
                        </button>
                        <button class="canvas-size-btn" data-size="landscape">
                            <strong>横長</strong>
                            <small>1200 × 800px</small>
                        </button>
                        <button class="canvas-size-btn" data-size="story">
                            <strong>ストーリー</strong>
                            <small>1080 × 1920px</small>
                        </button>
                        <button class="canvas-size-btn" data-size="a4">
                            <strong>A4</strong>
                            <small>2480 × 3508px</small>
                        </button>
                    </div>
                    <div class="custom-size-input">
                        <input type="number" id="customWidth" placeholder="幅" min="100" max="5000" value="${escapeHtml(currentWidth.toString())}">
                        <span>×</span>
                        <input type="number" id="customHeight" placeholder="高さ" min="100" max="5000" value="${escapeHtml(currentHeight.toString())}">
                    </div>
                </div>
            </div>
            <div class="settings-dialog-footer">
                <button class="btn-secondary" id="cancelSettingsBtn">
                    キャンセル
                </button>
                <button class="btn-primary" id="applySettingsBtn">
                    <i class="fas fa-check"></i> 適用
                </button>
            </div>
        </div>
    `, { ADD_ATTR: ['id'] });

    document.body.appendChild(dialog);

    // イベントリスナーをアタッチ（DOMPurifyがonclick属性を削除するため、プログラム的に追加）
    const closeBtn = dialog.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsDialog);
        console.log('Close button event listener attached');
    } else {
        console.error('Close button not found!');
    }

    const cancelBtn = dialog.querySelector('.btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeSettingsDialog);
        console.log('Cancel button event listener attached');
    } else {
        console.error('Cancel button not found!');
    }

    const applyBtn = dialog.querySelector('.btn-primary');
    if (applyBtn) {
        applyBtn.addEventListener('click', applySettings);
        console.log('Apply button event listener attached');
    } else {
        console.error('Apply button not found!');
    }

    // プリセットボタンのイベントリスナー
    dialog.querySelectorAll('.canvas-size-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            dialog.querySelectorAll('.canvas-size-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const size = this.dataset.size;
            const sizes = {
                'square-small': [800, 800],
                'square-large': [1080, 1080],
                'portrait': [800, 1200],
                'landscape': [1200, 800],
                'story': [1080, 1920],
                'a4': [2480, 3508]
            };

            if (sizes[size]) {
                document.getElementById('customWidth').value = sizes[size][0];
                document.getElementById('customHeight').value = sizes[size][1];
            }
        });
    });
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// 設定ダイアログを閉じる
function closeSettingsDialog() {
    const dialog = document.querySelector('.settings-dialog-overlay');
    if (dialog) {
        document.body.removeChild(dialog);
    }
}

// 設定を適用
function applySettings() {
    const width = parseInt(document.getElementById('customWidth').value);
    const height = parseInt(document.getElementById('customHeight').value);
    
    if (isNaN(width) || isNaN(height) || width < 100 || height < 100 || width > 5000 || height > 5000) {
        showNotification('サイズは100〜5000の範囲で指定してください', 'error');
        return;
    }
    
    resizeCanvas(width, height);
    closeSettingsDialog();
}

// 画面の向き変更時のイベントリスナー
window.addEventListener('orientationchange', handleOrientationChange);
window.addEventListener('resize', debounce(handleOrientationChange, 250));
