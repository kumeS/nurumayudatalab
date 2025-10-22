// ========== テキスト管理モジュール ==========
// テキストの追加、編集、スタイル適用

// 新規テキスト追加
function addNewText(options = {}) {
    const {
        textContent = 'テキストを入力',
        switchToTextTab = true,
        position = null,
        fontSize = 160,
        fontWeight = 'normal'
    } = options;

    const canvas = getCanvas();
    const resolvedPosition = position || {
        left: canvas.width / 2,
        top: canvas.height / 2
    };

    if (!switchToTextTab) {
        suppressTabSwitchTemporarily(500);
    }

    const text = new fabric.IText(textContent, {
        left: resolvedPosition.left,
        top: resolvedPosition.top,
        fontSize,
        fontFamily: 'Noto Sans JP, sans-serif',
        fill: '#333333',
        backgroundColor: '',
        textAlign: 'center',
        fontWeight,
        fontStyle: 'normal',
        underline: false,
        shadow: null,
        stroke: null,
        strokeWidth: 0,
        originX: 'center',
        originY: 'center',
        centeredRotation: true,
        cornerStyle: 'circle',
        cornerColor: '#ff9a5a',
        cornerSize: 16, // スマホ用に大きめ
        transparentCorners: false,
        borderColor: '#ff9a5a',
        customData: {
            bgTransparent: true,
            hasShadow: false,
            hasStroke: false
        }
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    if (switchToTextTab) {
        switchTab(document.querySelector('[data-tab="template"]'));
    }
    showTextControls();
    updateTextControlsUI(text);
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// テンプレートテキスト追加（最後に選択したスタイルを適用）
let lastSelectedStyle = null;

// ロゴSVG追加
function addLogoText(logoType) {
    const canvas = getCanvas();
    if (!canvas) {
        showNotification('キャンバスが初期化されていません', 'error');
        return;
    }
    
    if (logoType === 'nurumayudatalab') {
        // SVGパスを使用してロゴを作成
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="180" height="60" viewBox="0 0 180 60">
                <!-- 背景 -->
                <rect width="180" height="60" rx="8" fill="rgba(255, 255, 255, 0.95)" />
                <!-- ロゴマーク（温泉マーク風） -->
                <g transform="translate(15, 15)">
                    <ellipse cx="15" cy="20" rx="12" ry="8" fill="#ff9a5a" opacity="0.3"/>
                    <path d="M 8 5 Q 8 0, 12 0 T 16 5" stroke="#ff9a5a" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <path d="M 14 5 Q 14 0, 18 0 T 22 5" stroke="#ff9a5a" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <path d="M 20 5 Q 20 0, 24 0 T 28 5" stroke="#ff9a5a" stroke-width="2" fill="none" stroke-linecap="round"/>
                </g>
                <!-- テキスト -->
                <text x="50" y="25" font-family="'Noto Sans JP', sans-serif" font-size="14" font-weight="600" fill="#ff9a5a">ゆるま湯</text>
                <text x="50" y="42" font-family="'Noto Sans JP', sans-serif" font-size="11" font-weight="500" fill="#ff9a5a">データラボ</text>
            </svg>
        `;
        
        fabric.loadSVGFromString(svgString, function(objects, options) {
            const logoGroup = fabric.util.groupSVGElements(objects, options);
            
            logoGroup.set({
                left: canvas.width - 100,
                top: canvas.height - 40,
                scaleX: 0.8,
                scaleY: 0.8,
                originX: 'right',
                originY: 'bottom',
                cornerStyle: 'circle',
                cornerColor: '#ff9a5a',
                cornerSize: 16,
                transparentCorners: false,
                borderColor: '#ff9a5a',
                objectType: 'logo-svg'
            });
            
            canvas.add(logoGroup);
            canvas.setActiveObject(logoGroup);
            canvas.renderAll();
            
            showNotification('ロゴを追加しました', 'success');
            
            // 触覚フィードバック
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });
        return;
    }

    const iconMap = {
        'icon-star':   { glyph: '⭐',  label: 'スター' },
        'icon-gem':    { glyph: '💎',  label: 'ジュエル' },
        'icon-truck':  { glyph: '🚚',  label: 'トラック' },
        'icon-ship':   { glyph: '📦',  label: '迅速発送' },
        'icon-handshake': { glyph: '🤝', label: 'ハンドシェイク' },
        'icon-tags':   { glyph: '🏷',  label: 'タグ' },
        'icon-crown':  { glyph: '👑',  label: 'クラウン' },
        'icon-bolt':   { glyph: '⚡',  label: 'ボルト' },
        'icon-percent': { glyph: '％', label: 'パーセント' },
        'icon-fire':   { glyph: '🔥',  label: 'ファイア' },
        'icon-tag':    { glyph: '🏷',  label: 'セールタグ' },
        'icon-globe':  { glyph: '🌏',  label: 'グローブ' },
        'icon-plane':  { glyph: '✈️',  label: 'プレーン' },
        'icon-certificate': { glyph: '📜', label: 'サーティフィケート' },
        'icon-store':  { glyph: '🏬',  label: 'ストア' }
    };

    const iconConfig = iconMap[logoType];

    if (!iconConfig) {
        showNotification('選択したロゴは現在サポートされていません', 'error');
        return;
    }

    const iconText = new fabric.IText(iconConfig.glyph, {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontSize: 200,
        fontFamily: "'Noto Sans JP', sans-serif",
        fill: '#ff9a5a',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        centeredRotation: true,
        cornerStyle: 'circle',
        cornerColor: '#ff9a5a',
        cornerSize: 16,
        transparentCorners: false,
        borderColor: '#ff9a5a',
        objectType: 'logo-icon',
        customData: {
            bgTransparent: true,
            hasShadow: false,
            hasStroke: false
        }
    });

    suppressTabSwitchTemporarily(500);
    canvas.add(iconText);
    canvas.setActiveObject(iconText);
    canvas.renderAll();

    showTextControls();
    updateTextControlsUI(iconText);

    showNotification(`${iconConfig.label}アイコンを追加しました`, 'success');

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function deleteSelectedLogo() {
    const canvas = getCanvas();
    if (!canvas) return false;

    const activeObjects = canvas.getActiveObjects();
    let logoObjects = [];

    if (activeObjects.length > 0) {
        logoObjects = activeObjects.filter(obj => obj && (obj.objectType === 'logo-svg' || obj.objectType === 'logo-icon'));
    } else {
        const selectedObject = getSelectedObject();
        if (selectedObject && (selectedObject.objectType === 'logo-svg' || selectedObject.objectType === 'logo-icon')) {
            logoObjects = [selectedObject];
        }
    }

    if (logoObjects.length === 0) return false;

    const uniqueObjects = Array.from(new Set(logoObjects));
    uniqueObjects.forEach(obj => {
        canvas.remove(obj);
    });

    canvas.discardActiveObject();
    setSelectedObject(null);
    if (typeof hideTextControls === 'function') {
        hideTextControls();
    }
    if (typeof hideImageControls === 'function') {
        hideImageControls();
    }
    canvas.requestRenderAll();

    if (typeof scheduleCanvasHistoryCapture === 'function') {
        scheduleCanvasHistoryCapture();
    }

    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
    }

    return true;
}

function addTemplateText(templateText) {
    const canvas = getCanvas();
    
    // デフォルトは黒字のシンプルスタイル
    const text = new fabric.IText(templateText, {
        left: canvas.width / 2,
        top: canvas.height / 4,
        fontSize: 160,
        fontFamily: 'Noto Sans JP, sans-serif',
        fill: '#000000', // 黒字に変更
        backgroundColor: '',
        textAlign: 'center',
        fontWeight: 'bold',
        fontStyle: 'normal',
        underline: false,
        shadow: null,
        stroke: null,
        strokeWidth: 0,
        originX: 'center',
        originY: 'center',
        centeredRotation: true,
        cornerStyle: 'circle',
        cornerColor: '#ff9a5a',
        cornerSize: 16,
        transparentCorners: false,
        borderColor: '#ff9a5a',
        customData: {
            bgTransparent: true,
            hasShadow: false,
            hasStroke: false
        }
    });
    
    suppressTabSwitchTemporarily(500);
    canvas.add(text);
    canvas.setActiveObject(text);
    
    // 最後に選択したスタイルがあれば適用
    if (lastSelectedStyle) {
        applyStyleTemplateToObject(text, lastSelectedStyle);
    }
    
    canvas.renderAll();
    
    showTextControls();
    updateTextControlsUI(text);
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// スタイルテンプレート適用
function applyStyleTemplate(template) {
    // 最後に選択したスタイルを記憶
    lastSelectedStyle = template;
    
    let selectedObject = getSelectedObject();
    
    if (!selectedObject || selectedObject.type !== 'i-text') {
        addNewText({ switchToTextTab: false });
        selectedObject = getCanvas().getActiveObject();
    }
    
    applyStyleTemplateToObject(selectedObject, template);
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// オブジェクトにスタイルを適用（内部関数）
function applyStyleTemplateToObject(text, template) {
    const originalFontSize = text.fontSize;
    const originalScaleX = text.scaleX ?? 1;
    const originalScaleY = text.scaleY ?? 1;

    if (!text.customData) {
        text.customData = {};
    }

    switch(template) {
        case 'bold-red':
            text.set({
                fill: '#d32f2f',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: null,
                stroke: null,
                strokeWidth: 0,
                fontSize: 52
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = false;
            text.customData.hasStroke = false;
            break;
        case 'pop-yellow':
            text.set({
                fill: '#000000', // 黒字に変更
                backgroundColor: '#fff9c4',
                fontWeight: 'bold',
                shadow: null,
                stroke: null,
                strokeWidth: 0,
                fontSize: 48
            });
            text.customData.bgTransparent = false;
            text.customData.hasShadow = false;
            text.customData.hasStroke = false;
            break;
        case 'elegant-white':
            text.set({
                fill: '#ffffff',
                backgroundColor: '#424242',
                fontWeight: 'normal',
                shadow: null,
                stroke: null,
                strokeWidth: 0,
                fontSize: 44
            });
            text.customData.bgTransparent = false;
            text.customData.hasShadow = false;
            text.customData.hasStroke = false;
            break;
        case 'cute-pink':
            text.set({
                fill: '#ec407a',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.3)',
                    blur: 6,
                    offsetX: 3,
                    offsetY: 3
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 50
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'simple-black':
            text.set({
                fill: '#000000',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: null,
                stroke: null,
                strokeWidth: 0,
                fontSize: 48
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = false;
            text.customData.hasStroke = false;
            break;
        case 'cute-badge':
            text.set({
                fill: '#ffffff',
                backgroundColor: '#ff6b9d',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.2)',
                    blur: 4,
                    offsetX: 2,
                    offsetY: 2
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 40
            });
            text.customData.bgTransparent = false;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'black-shadow':
            text.set({
                fill: '#000000',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.4)',
                    blur: 8,
                    offsetX: 3,
                    offsetY: 3
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 50
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'neon-blue':
            text.set({
                fill: '#00bfff',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,191,255,0.8)',
                    blur: 15,
                    offsetX: 0,
                    offsetY: 0
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 48
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'gold-luxury':
            text.set({
                fill: '#ffd700',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.5)',
                    blur: 6,
                    offsetX: 3,
                    offsetY: 3
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 50
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'green-badge':
            text.set({
                fill: '#ffffff',
                backgroundColor: '#4caf50',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.2)',
                    blur: 4,
                    offsetX: 2,
                    offsetY: 2
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 40
            });
            text.customData.bgTransparent = false;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'orange-pop':
            text.set({
                fill: '#ff6600',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: null,
                stroke: null,
                strokeWidth: 0,
                fontSize: 54
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = false;
            text.customData.hasStroke = false;
            break;
        case 'purple-elegant':
            text.set({
                fill: '#9c27b0',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.3)',
                    blur: 5,
                    offsetX: 2,
                    offsetY: 2
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 48
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'white-outline':
            text.set({
                fill: '#000000',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: null,
                stroke: '#ffffff',
                strokeWidth: 6,
                fontSize: 50
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = false;
            text.customData.hasStroke = true;
            break;
        case 'red-badge':
            text.set({
                fill: '#ffffff',
                backgroundColor: '#f44336',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.2)',
                    blur: 4,
                    offsetX: 2,
                    offsetY: 2
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 40
            });
            text.customData.bgTransparent = false;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'gradient-rainbow':
            // Fabric.jsはグラデーションテキストに制限があるため、レインボーカラーで代用
            text.set({
                fill: '#ff0080',
                backgroundColor: '',
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(64,224,208,0.5)',
                    blur: 10,
                    offsetX: 0,
                    offsetY: 0
                }),
                stroke: null,
                strokeWidth: 0,
                fontSize: 48
            });
            text.customData.bgTransparent = true;
            text.customData.hasShadow = true;
            text.customData.hasStroke = false;
            break;
        case 'navy-classic':
            text.set({
                fill: '#ffffff',
                backgroundColor: '#001f3f',
                fontWeight: 'bold',
                shadow: null,
                stroke: null,
                strokeWidth: 0,
                fontSize: 44
            });
            text.customData.bgTransparent = false;
            text.customData.hasShadow = false;
            text.customData.hasStroke = false;
            break;
    }

    text.set({
        fontSize: originalFontSize,
        scaleX: originalScaleX,
        scaleY: originalScaleY
    });

    getCanvas().renderAll();
    updateTextControlsUI(text);

    scheduleCanvasHistoryCapture();
}

// テキストコントロール表示
function showTextControls() {
    const panel = document.getElementById('textControlsPanel');
    const container = document.getElementById('canvasContainer');

    if (!panel) return;

    if (typeof hideImageControls === 'function') {
        hideImageControls();
    }

    panel.style.display = 'flex';
    panel.scrollTop = 0;
}

// テキストコントロール非表示
function hideTextControls() {
    const panel = document.getElementById('textControlsPanel');
    const container = document.getElementById('canvasContainer');

    if (panel) {
        panel.style.display = 'none';
    }
}

// テキストコントロールUI更新
function updateTextControlsUI(text) {
    if (!text || text.type !== 'i-text') return;
    
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    if (!fontSizeSlider || !fontSizeValue) return;

    const roundedFontSize = Math.round(text.fontSize);
    if (roundedFontSize > parseInt(fontSizeSlider.max, 10)) {
        fontSizeSlider.max = Math.ceil(roundedFontSize / 10) * 10;
    }

    document.getElementById('textContent').value = text.text;
    fontSizeSlider.value = roundedFontSize;
    fontSizeValue.textContent = roundedFontSize + 'px';
    document.getElementById('fontFamily').value = text.fontFamily;
    document.getElementById('textColor').value = text.fill;
    document.getElementById('textColorHex').value = text.fill;
    document.getElementById('textBgColor').value = text.backgroundColor || '#ffffff';
    document.getElementById('textBgColorHex').value = text.backgroundColor || '#ffffff';
    document.getElementById('textBgTransparent').checked = text.customData?.bgTransparent ?? !text.backgroundColor;
    document.getElementById('textShadow').checked = text.customData?.hasShadow ?? false;
    document.getElementById('textStroke').checked = text.customData?.hasStroke ?? false;
    
    // 回転
    document.getElementById('textRotation').value = text.angle || 0;
    document.getElementById('textRotationValue').textContent = (text.angle || 0) + '°';
    
    // 拡大縮小
    const scale = (text.scaleX || 1) * 100;
    document.getElementById('textScale').value = scale;
    document.getElementById('textScaleValue').textContent = scale.toFixed(0) + '%';
    
    // 不透明度
    const opacity = (text.opacity || 1) * 100;
    document.getElementById('textOpacity').value = opacity;
    document.getElementById('textOpacityValue').textContent = opacity.toFixed(0) + '%';
    
    // 揃え - 全てのボタンの状態を明示的に設定
    document.querySelectorAll('[data-align]').forEach(btn => {
        const isActive = btn.dataset.align === text.textAlign;
        btn.classList.toggle('active', isActive);
    });

    // スタイル - 各スタイルの状態を明示的に設定
    const boldBtn = document.querySelector('[data-style="bold"]');
    const italicBtn = document.querySelector('[data-style="italic"]');
    const underlineBtn = document.querySelector('[data-style="underline"]');

    if (boldBtn) boldBtn.classList.toggle('active', text.fontWeight === 'bold');
    if (italicBtn) italicBtn.classList.toggle('active', text.fontStyle === 'italic');
    if (underlineBtn) underlineBtn.classList.toggle('active', text.underline === true);
}

// 選択中のテキストを更新
function updateSelectedText() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.type !== 'i-text') return;
    
    const text = selectedObject;
    
    text.set({
        text: document.getElementById('textContent').value,
        fontSize: parseInt(document.getElementById('fontSize').value),
        fontFamily: document.getElementById('fontFamily').value,
        fill: document.getElementById('textColor').value
    });
    
    document.getElementById('fontSizeValue').textContent = text.fontSize + 'px';
    
    // 背景色
    const bgTransparent = document.getElementById('textBgTransparent').checked;
    text.customData.bgTransparent = bgTransparent;
    text.set({
        backgroundColor: bgTransparent ? '' : document.getElementById('textBgColor').value
    });
    
    // 揃え
    const activeAlign = document.querySelector('[data-align].active');
    if (activeAlign) {
        text.set({ textAlign: activeAlign.dataset.align });
    }
    
    // スタイル
    const isBold = document.querySelector('[data-style="bold"]').classList.contains('active');
    const isItalic = document.querySelector('[data-style="italic"]').classList.contains('active');
    const isUnderline = document.querySelector('[data-style="underline"]').classList.contains('active');
    
    text.set({
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        underline: isUnderline
    });
    
    // 影
    const hasShadow = document.getElementById('textShadow').checked;
    text.customData.hasShadow = hasShadow;
    text.set({
        shadow: hasShadow ? new fabric.Shadow({
            color: 'rgba(0,0,0,0.4)',
            blur: 6,
            offsetX: 3,
            offsetY: 3
        }) : null
    });
    
    // 枠線
    const hasStroke = document.getElementById('textStroke').checked;
    text.customData.hasStroke = hasStroke;
    text.set({
        stroke: hasStroke ? '#ffffff' : null,
        strokeWidth: hasStroke ? 4 : 0
    });
    
    // 回転
    const rotation = parseInt(document.getElementById('textRotation').value);
    text.set({ angle: rotation });
    document.getElementById('textRotationValue').textContent = rotation + '°';
    
    // 拡大縮小
    const scale = parseInt(document.getElementById('textScale').value) / 100;
    text.set({ scaleX: scale, scaleY: scale });
    document.getElementById('textScaleValue').textContent = (scale * 100).toFixed(0) + '%';
    
    // 不透明度
    const opacity = parseInt(document.getElementById('textOpacity').value) / 100;
    text.set({ opacity: opacity });
    document.getElementById('textOpacityValue').textContent = (opacity * 100).toFixed(0) + '%';
    
    getCanvas().renderAll();

    scheduleCanvasHistoryCapture();
}

// カラー変更ハンドラー
function handleColorChange(e) {
    document.getElementById('textColorHex').value = e.target.value;
    updateSelectedText();
}

function handleHexColorChange(e) {
    let value = e.target.value;
    if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
        document.getElementById('textColor').value = value;
        updateSelectedText();
    }
}

function handleBgColorChange(e) {
    document.getElementById('textBgColorHex').value = e.target.value;
    updateSelectedText();
}

function handleBgHexColorChange(e) {
    let value = e.target.value;
    if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
        document.getElementById('textBgColor').value = value;
        updateSelectedText();
    }
}

// 選択中のテキストを削除
function deleteSelectedText() {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    let textObjects = [];

    if (activeObjects.length > 0) {
        textObjects = activeObjects.filter(obj => obj.type === 'i-text');
    } else {
        const selectedObject = getSelectedObject();
        if (selectedObject && selectedObject.type === 'i-text') {
            textObjects = [selectedObject];
        }
    }

    if (textObjects.length === 0) return;

    const uniqueObjects = Array.from(new Set(textObjects));
    uniqueObjects.forEach(obj => {
        canvas.remove(obj);
    });

    canvas.discardActiveObject();
    setSelectedObject(null);
    hideTextControls();
    canvas.requestRenderAll();

    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
    }
}
