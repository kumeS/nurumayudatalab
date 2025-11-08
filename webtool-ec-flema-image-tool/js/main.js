// ========== メインアプリケーション ==========
// イベントリスナーの設定とアプリケーション初期化

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // デバッグ: Fabric.jsの読み込み確認
    console.log('=== DEBUG: Application Initialization ===');
    console.log('Fabric.js loaded:', typeof fabric);
    console.log('Fabric version:', fabric ? fabric.version : 'N/A');
    console.log('Canvas element:', document.getElementById('mainCanvas'));
    console.log('Canvas context:', document.getElementById('mainCanvas')?.getContext('2d'));
    
    // IndexedDB初期化
    await initIndexedDB();
    
    // ★Bug7修正: CSSレイアウト確定を待つ
    await new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
    
    // キャンバス初期化
    initializeFabricCanvas();
    
    // ズームコントロール初期化
    setupZoomControls();
    
    // 履歴初期化
    initializeHistory();
    
    // Undo/Redoボタンの設定
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoCanvasAction);
    if (redoBtn) redoBtn.addEventListener('click', redoCanvasAction);
    
    // 最後のプロジェクトを復元
    await restoreLastProject();

    // イベントリスナー設定
    initializeEventListeners();

    // 画像履歴を表示
    await displayImageHistory();

    // 自動保存開始
    startAutoSave();

    // 初回ヒント表示
    showInitialHint();

    initializeLayoutMode();

    // PWA対応の準備（将来の拡張用）
    if ('serviceWorker' in navigator) {
        // Service Worker登録はここで実装可能
    }
});

// スクロール隔離ヘルパー：パネル内のスクロールがキャンバスに伝播しないようにする
function isolatePanelScroll(element) {
    if (!element) return;
    
    // ホイールイベントの伝播を停止
    element.addEventListener('wheel', (e) => {
        e.stopPropagation();
    }, { passive: true });
    
    // タッチイベントの伝播を停止
    element.addEventListener('touchmove', (e) => {
        e.stopPropagation();
    }, { passive: true });
    
    // スクロールイベントの伝播を停止（念のため）
    element.addEventListener('scroll', (e) => {
        e.stopPropagation();
    }, { passive: true });
}

// イベントリスナー設定
function initializeEventListeners() {
    // ========== パネルのスクロール隔離を適用 ==========
    const imageControlsSection = document.getElementById('imageControlsSection');
    const textControlsSection = document.getElementById('textControlsSection');
    
    if (imageControlsSection) {
        isolatePanelScroll(imageControlsSection);
    }
    
    if (textControlsSection) {
        isolatePanelScroll(textControlsSection);
    }
    
    // ========== プロジェクト関連 ==========
    document.getElementById('projectMenuBtn').addEventListener('click', toggleProjectMenu);
    document.getElementById('settingsBtn').addEventListener('click', showSettingsDialog);
    const layoutToggleBtn = document.getElementById('layoutToggleBtn');
    if (layoutToggleBtn) {
        layoutToggleBtn.addEventListener('click', toggleLayoutMode);
    }
    
    // ========== 画像関連 ==========
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });
    
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    const importImageUrlBtn = document.getElementById('importImageUrlBtn');
    const imageUrlInput = document.getElementById('imageUrlInput');

    if (importImageUrlBtn) {
        importImageUrlBtn.addEventListener('click', handleImageUrlImport);
    }

    if (imageUrlInput) {
        imageUrlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleImageUrlImport();
            }
        });
    }

    // 画像履歴
    const refreshImageHistoryBtn = document.getElementById('refreshImageHistoryBtn');
    if (refreshImageHistoryBtn) {
        refreshImageHistoryBtn.addEventListener('click', refreshImageHistory);
    }

    // 画像フィルター
    document.getElementById('brightness').addEventListener('input', handleFilterChange);
    document.getElementById('contrast').addEventListener('input', handleFilterChange);
    document.getElementById('saturation').addEventListener('input', handleFilterChange);
    document.getElementById('hue').addEventListener('input', handleFilterChange);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    const deleteImageBtn = document.getElementById('deleteImageBtn');
    if (deleteImageBtn) {
        deleteImageBtn.addEventListener('click', deleteSelectedImage);
    }

    const closeImageControlsPanelBtn = document.getElementById('closeImageControlsPanel');
    if (closeImageControlsPanelBtn) {
        closeImageControlsPanelBtn.addEventListener('click', () => {
            hideImageControls();
            const canvas = getCanvas();
            if (canvas) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        });
    }

    const closeTextControlsPanelBtn = document.getElementById('closeTextControlsPanel');
    if (closeTextControlsPanelBtn) {
        closeTextControlsPanelBtn.addEventListener('click', () => {
            hideTextControls();
            const canvas = getCanvas();
            if (canvas) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        });
    }
    
    // レイヤー移動（画像）
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');
    const bringForwardBtn = document.getElementById('bringForwardBtn');
    const sendBackwardBtn = document.getElementById('sendBackwardBtn');

    if (bringToFrontBtn) bringToFrontBtn.addEventListener('click', bringToFront);
    if (sendToBackBtn) sendToBackBtn.addEventListener('click', sendToBack);
    if (bringForwardBtn) bringForwardBtn.addEventListener('click', bringForward);
    if (sendBackwardBtn) sendBackwardBtn.addEventListener('click', sendBackward);

    const fitImageHeightBtn = document.getElementById('fitImageHeightBtn');
    if (fitImageHeightBtn) {
        fitImageHeightBtn.addEventListener('click', fitImageToCanvasHeight);
    }

    const removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
    if (removeBackgroundBtn) {
        removeBackgroundBtn.addEventListener('click', removeImageBackgroundQuick);
    }

    const bgRemovalTolerance = document.getElementById('bgRemovalTolerance');
    if (bgRemovalTolerance) {
        bgRemovalTolerance.addEventListener('input', function(e) {
            document.getElementById('bgRemovalToleranceValue').textContent = e.target.value;
        });
    }

    const bringToFrontBtnSide = document.getElementById('bringToFrontBtnSide');
    const sendToBackBtnSide = document.getElementById('sendToBackBtnSide');
    const bringForwardBtnSide = document.getElementById('bringForwardBtnSide');
    const sendBackwardBtnSide = document.getElementById('sendBackwardBtnSide');

    if (bringToFrontBtnSide) bringToFrontBtnSide.addEventListener('click', bringToFront);
    if (sendToBackBtnSide) sendToBackBtnSide.addEventListener('click', sendToBack);
    if (bringForwardBtnSide) bringForwardBtnSide.addEventListener('click', bringForward);
    if (sendBackwardBtnSide) sendBackwardBtnSide.addEventListener('click', sendBackward);

    // 画像回転・反転
    const rotateImage90Btn = document.getElementById('rotateImage90Btn');
    const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
    const flipVerticalBtn = document.getElementById('flipVerticalBtn');

    if (rotateImage90Btn) rotateImage90Btn.addEventListener('click', rotateSelectedImage90);
    if (flipHorizontalBtn) flipHorizontalBtn.addEventListener('click', flipSelectedImageHorizontal);
    if (flipVerticalBtn) flipVerticalBtn.addEventListener('click', flipSelectedImageVertical);

    // 一部ぼかし
    const blurRadiusInput = document.getElementById('blurRadius');
    const startPartialBlurBtn = document.getElementById('startPartialBlurBtn');
    const applyPartialBlurBtn = document.getElementById('applyPartialBlurBtn');
    const cancelPartialBlurBtn = document.getElementById('cancelPartialBlurBtn');

    if (blurRadiusInput) {
        blurRadiusInput.addEventListener('input', function(e) {
            const value = parseInt(e.target.value);
            document.getElementById('blurRadiusValue').textContent = value + 'px';
            // ぼかし状態があれば半径を更新
            if (typeof blurState !== 'undefined' && blurState) {
                blurState.radius = value;
            }
        });
    }

    if (startPartialBlurBtn) startPartialBlurBtn.addEventListener('click', startPartialBlur);
    if (applyPartialBlurBtn) applyPartialBlurBtn.addEventListener('click', applyPartialBlur);
    if (cancelPartialBlurBtn) cancelPartialBlurBtn.addEventListener('click', cancelPartialBlur);

    // トリミング
    const startCroppingBtn = document.getElementById('startCroppingBtn');
    const applyCroppingBtn = document.getElementById('applyCroppingBtn');
    const cancelCroppingBtn = document.getElementById('cancelCroppingBtn');

    if (startCroppingBtn) startCroppingBtn.addEventListener('click', startCropping);
    if (applyCroppingBtn) applyCroppingBtn.addEventListener('click', applyCropping);
    if (cancelCroppingBtn) cancelCroppingBtn.addEventListener('click', cancelCropping);
    
    // ========== テキスト関連 ==========
    document.getElementById('addTextBtn').addEventListener('click', () => addNewText());
    document.getElementById('textContent').addEventListener('input', updateSelectedText);
    document.getElementById('fontSize').addEventListener('input', updateSelectedText);
    document.getElementById('fontFamily').addEventListener('change', updateSelectedText);
    document.getElementById('textColor').addEventListener('input', handleColorChange);
    document.getElementById('textColorHex').addEventListener('input', handleHexColorChange);
    document.getElementById('textBgColor').addEventListener('input', handleBgColorChange);
    document.getElementById('textBgColorHex').addEventListener('input', handleBgHexColorChange);
    document.getElementById('textBgTransparent').addEventListener('change', updateSelectedText);
    document.getElementById('textShadow').addEventListener('change', updateSelectedText);
    document.getElementById('textStroke').addEventListener('change', updateSelectedText);
    document.getElementById('textShadowColor').addEventListener('input', updateSelectedText);
    document.getElementById('textShadowOpacity').addEventListener('input', updateSelectedText);
    document.getElementById('textShadowBlur').addEventListener('input', updateSelectedText);
    document.getElementById('textShadowOffset').addEventListener('input', updateSelectedText);
    document.getElementById('textShadowAngle').addEventListener('input', updateSelectedText);
    document.getElementById('textStrokeColor').addEventListener('input', updateSelectedText);
    document.getElementById('textStrokeWidth').addEventListener('input', updateSelectedText);
    document.getElementById('textLetterSpacing').addEventListener('input', updateSelectedText);
    document.getElementById('textLineHeight').addEventListener('input', updateSelectedText);
    document.getElementById('textRotation').addEventListener('input', updateSelectedText);
    document.getElementById('textScale').addEventListener('input', updateSelectedText);
    document.getElementById('textOpacity').addEventListener('input', updateSelectedText);
    document.getElementById('deleteTextBtn').addEventListener('click', deleteSelectedText);
    document.getElementById('duplicateTextBtn').addEventListener('click', duplicateSelectedObject);
    
    // レイヤー移動（テキスト）
    document.getElementById('textBringToFrontBtn').addEventListener('click', bringToFront);
    document.getElementById('textSendToBackBtn').addEventListener('click', sendToBack);
    document.getElementById('textBringForwardBtn').addEventListener('click', bringForward);
    document.getElementById('textSendBackwardBtn').addEventListener('click', sendBackward);
    
    // テキストスタイル
    document.querySelectorAll('[data-style]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            updateSelectedText();
        });
    });
    
    // ========== テンプレート関連 ==========
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.dataset.template) {
                addTemplateText(this.dataset.template);
            } else if (this.dataset.logo) {
                addLogoText(this.dataset.logo);
            }
        });
    });
    
    document.querySelectorAll('.style-template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            applyStyleTemplate(this.dataset.styleTemplate);
        });
    });
    
    // ========== カスタムテンプレート機能 ==========
    const CUSTOM_TEMPLATES_KEY = 'flema_custom_templates';
    
    function loadCustomTemplates() {
        try {
            const saved = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load custom templates:', e);
            return [];
        }
    }
    
    function saveCustomTemplates(templates) {
        try {
            localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
        } catch (e) {
            console.error('Failed to save custom templates:', e);
        }
    }
    
    function renderCustomTemplates() {
        const grid = document.getElementById('customTemplateGrid');
        if (!grid) return;
        
        const templates = loadCustomTemplates();
        grid.innerHTML = '';
        
        templates.forEach((text, index) => {
            const btn = document.createElement('button');
            btn.className = 'template-btn custom-template-btn';
            btn.textContent = text;
            btn.style.position = 'relative';
            btn.style.paddingRight = '36px';
            
            const deleteBtn = document.createElement('span');
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; opacity: 0.6; font-size: 12px;';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                const templates = loadCustomTemplates();
                templates.splice(index, 1);
                saveCustomTemplates(templates);
                renderCustomTemplates();
                showNotification('カスタム文言を削除しました', 'success');
            };
            
            btn.appendChild(deleteBtn);
            btn.onclick = () => addTemplateText(text);
            grid.appendChild(btn);
        });
    }
    
    const addCustomBtn = document.getElementById('addCustomTemplateBtn');
    const customInput = document.getElementById('customTemplateInput');
    
    if (addCustomBtn && customInput) {
        addCustomBtn.addEventListener('click', () => {
            const text = customInput.value.trim();
            if (!text) {
                showNotification('文言を入力してください', 'error');
                return;
            }
            if (text.length > 30) {
                showNotification('文言は30文字以内にしてください', 'error');
                return;
            }
            
            const templates = loadCustomTemplates();
            if (templates.includes(text)) {
                showNotification('既に登録されています', 'error');
                return;
            }
            
            templates.push(text);
            saveCustomTemplates(templates);
            renderCustomTemplates();
            customInput.value = '';
            showNotification('カスタム文言を追加しました', 'success');
        });
        
        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCustomBtn.click();
            }
        });
    }
    
    renderCustomTemplates();
    
    // ========== タブ切り替え ==========
    document.querySelectorAll('.tool-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });
    
    // ========== エクスポート関連 ==========
    document.getElementById('exportBtn').addEventListener('click', exportImage);
    
    // ========== キーボードショートカット ==========
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // ========== スマホ最適化 ==========
    // ダブルタップズーム防止
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // ロングタップメニュー防止（キャンバス上）
    const canvasContainer = document.getElementById('canvasContainer');
    if (canvasContainer) {
        canvasContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    // タッチスクロールの最適化
    document.querySelectorAll('.tool-panel').forEach(panel => {
        panel.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
    });

    const toolbar = document.getElementById('toolbar');

    if (canvasContainer) {
        canvasContainer.addEventListener('wheel', (e) => {
            if (document.body.classList.contains('toolbar-scroll-active')) {
                e.preventDefault();
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (document.body.classList.contains('toolbar-scroll-active')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    if (toolbar) {
        const activateToolbarScroll = () => document.body.classList.add('toolbar-scroll-active');
        const deactivateToolbarScroll = () => document.body.classList.remove('toolbar-scroll-active');

        toolbar.addEventListener('mouseenter', activateToolbarScroll);
        toolbar.addEventListener('mouseleave', deactivateToolbarScroll);
        toolbar.addEventListener('focusin', activateToolbarScroll);
        toolbar.addEventListener('focusout', (event) => {
            if (!toolbar.contains(event.relatedTarget)) {
                deactivateToolbarScroll();
            }
        });
        toolbar.addEventListener('wheel', (event) => {
            activateToolbarScroll();
            event.stopPropagation();
        }, { passive: false });
        toolbar.addEventListener('touchstart', activateToolbarScroll, { passive: true });
        toolbar.addEventListener('touchend', (event) => {
            if (!toolbar.contains(event.target)) {
                deactivateToolbarScroll();
            }
        }, { passive: true });
        toolbar.addEventListener('touchcancel', deactivateToolbarScroll, { passive: true });

        document.addEventListener('pointerdown', (event) => {
            if (!toolbar.contains(event.target)) {
                deactivateToolbarScroll();
            }
        });
    }
    
    // スワイプでタブ切り替え（ツールバー上）
    if (toolbar && isTouchDevice()) {
        new SwipeDetector(toolbar, (direction) => {
            const tabs = Array.from(document.querySelectorAll('.tool-tab'));
            const activeTab = document.querySelector('.tool-tab.active');
            const currentIndex = tabs.indexOf(activeTab);
            
            if (direction === 'left' && currentIndex < tabs.length - 1) {
                switchTab(tabs[currentIndex + 1]);
            } else if (direction === 'right' && currentIndex > 0) {
                switchTab(tabs[currentIndex - 1]);
            }
        });
    }
}

function getInitialLayoutMode() {
    // 画面幅を最優先（メディアクエリと一致させる）
    const isSmallScreen = window.innerWidth < 768;
    const isMobileDevice = isMobile();

    // スマホ判定：モバイルデバイス かつ 画面幅768px未満
    if (isMobileDevice && isSmallScreen) {
        return 'mobile';
    }

    // タブレット・PC、または大画面
    // localStorageの設定を参考にするが、画面幅が優先
    if (!isSmallScreen) {
        const savedMode = localStorage.getItem('layoutMode');
        return savedMode || 'desktop';
    }

    return 'desktop';
}

function initializeLayoutMode() {
    const initialMode = getInitialLayoutMode();
    applyLayoutMode(initialMode);

    updateHeaderHeightVariable();
    window.addEventListener('resize', throttle(updateHeaderHeightVariable, 150));
}

function toggleLayoutMode() {
    const isDesktop = document.body.classList.contains('desktop-mode');
    applyLayoutMode(isDesktop ? 'mobile' : 'desktop');
}

function applyLayoutMode(mode) {
    const normalizedMode = mode === 'desktop' ? 'desktop' : 'mobile';
    const body = document.body;
    body.classList.toggle('desktop-mode', normalizedMode === 'desktop');
    body.classList.toggle('mobile-mode', normalizedMode === 'mobile');

    const toggleBtn = document.getElementById('layoutToggleBtn');
    const icon = toggleBtn ? toggleBtn.querySelector('i') : null;
    const title = normalizedMode === 'desktop'
        ? 'スマホ表示に切り替え'
        : 'PC表示に切り替え';

    if (toggleBtn) {
        toggleBtn.setAttribute('title', title);
        toggleBtn.setAttribute('aria-label', title);
    }

    if (icon) {
        icon.className = normalizedMode === 'desktop'
            ? 'fas fa-mobile-screen-button'
            : 'fas fa-display';
    }

    localStorage.setItem('layoutMode', normalizedMode);
    updateHeaderHeightVariable();
}

function updateHeaderHeightVariable() {
    const header = document.querySelector('.app-header');
    if (!header) return;

    const height = header.offsetHeight || 96;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
}

// スマホ用UIの追加調整
if (isMobile()) {
    // モバイルデバイスでの追加調整
    document.body.classList.add('is-mobile');
    
    // ビューポート高さの動的調整（アドレスバー対策）
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', throttle(setVH, 100));
}

// iOS用の追加調整
if (isIOS()) {
    document.body.classList.add('is-ios');
    
    // iOSのバウンススクロール防止
    document.body.addEventListener('touchmove', (e) => {
        if (e.target === document.body) {
            e.preventDefault();
        }
    }, { passive: false });
}

// タッチデバイス用のクラス追加
if (isTouchDevice()) {
    document.body.classList.add('is-touch');
}

// ページ離脱時の確認（編集中の場合）
window.addEventListener('beforeunload', (e) => {
    const canvas = getCanvas();
    if (canvas && canvas.getObjects().length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

// オンライン/オフライン状態の監視
window.addEventListener('online', () => {
    console.log('オンラインに接続しました');
});

window.addEventListener('offline', () => {
    console.log('オフラインです');
    alert('インターネット接続が切断されました。保存機能が使用できない場合があります。');
});
