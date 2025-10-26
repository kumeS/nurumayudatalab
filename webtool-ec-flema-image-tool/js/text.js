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
    
    // テキストを中央に配置
    if (typeof centerObjectOnCanvas === 'function') {
        centerObjectOnCanvas(text);
    } else {
        canvas.centerObject(text);
        text.setCoords();
    }
    
    canvas.setActiveObject(text);
    canvas.requestRenderAll();

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

// カラーユーティリティ
function normalizeHexColor(hex) {
    if (!hex) return '000000';
    let sanitized = hex.replace('#', '').trim();
    if (sanitized.length === 3) {
        sanitized = sanitized.split('').map(ch => ch + ch).join('');
    }
    if (sanitized.length !== 6) {
        return '000000';
    }
    return sanitized.toLowerCase();
}

function hexToRgba(hex, alpha = 1) {
    const normalized = normalizeHexColor(hex);
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const clampedAlpha = Math.min(Math.max(alpha, 0), 1);
    return `rgba(${r},${g},${b},${clampedAlpha})`;
}

function colorToHexAlpha(color) {
    try {
        const fabricColor = new fabric.Color(color);
        const source = fabricColor.getSource();
        const [r, g, b, a = 1] = source;
        const hex = '#' + [r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('');
        const alpha = typeof a === 'number' ? Math.min(Math.max(a, 0), 1) : 1;
        return { hex, alpha };
    } catch (error) {
        return { hex: '#000000', alpha: 1 };
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function parseIntOr(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

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
    
    // アイコンを中央に配置
    if (typeof centerObjectOnCanvas === 'function') {
        centerObjectOnCanvas(iconText);
    } else {
        canvas.centerObject(iconText);
        iconText.setCoords();
    }
    
    canvas.setActiveObject(iconText);
    canvas.requestRenderAll();

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
    
    // テキストを中央に配置
    if (typeof centerObjectOnCanvas === 'function') {
        centerObjectOnCanvas(text);
    } else {
        canvas.centerObject(text);
        text.setCoords();
    }
    
    canvas.setActiveObject(text);
    
    // 最後に選択したスタイルがあれば適用
    if (lastSelectedStyle) {
        applyStyleTemplateToObject(text, lastSelectedStyle);
    }
    
    canvas.requestRenderAll();
    
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

    const textContentField = document.getElementById('textContent');
    const fontFamilySelect = document.getElementById('fontFamily');
    const textColorInput = document.getElementById('textColor');
    const textColorHexInput = document.getElementById('textColorHex');
    const textBgColorInput = document.getElementById('textBgColor');
    const textBgColorHexInput = document.getElementById('textBgColorHex');
    const textBgTransparentCheckbox = document.getElementById('textBgTransparent');
    const textShadowCheckbox = document.getElementById('textShadow');
    const textShadowControls = document.getElementById('textShadowControls');
    const textStrokeCheckbox = document.getElementById('textStroke');
    const textStrokeControls = document.getElementById('textStrokeControls');
    const textLetterSpacingSlider = document.getElementById('textLetterSpacing');
    const textLineHeightSlider = document.getElementById('textLineHeight');

    const roundedFontSize = Math.round(text.fontSize);
    if (roundedFontSize > parseInt(fontSizeSlider.max, 10)) {
        fontSizeSlider.max = Math.ceil(roundedFontSize / 10) * 10;
    }

    textContentField.value = text.text;
    fontSizeSlider.value = roundedFontSize;
    fontSizeValue.textContent = roundedFontSize + 'px';

    if (fontFamilySelect) {
        fontFamilySelect.value = text.fontFamily;
    }

    const fillInfo = typeof text.fill === 'string' ? colorToHexAlpha(text.fill) : { hex: '#333333', alpha: 1 };
    textColorInput.value = fillInfo.hex;
    textColorHexInput.value = fillInfo.hex;

    const storedBgColor = text.customData?.backgroundColor || '#ffffff';
    const backgroundColor = text.backgroundColor || (text.customData?.bgTransparent ? '' : storedBgColor);
    textBgColorInput.value = backgroundColor || storedBgColor;
    textBgColorHexInput.value = backgroundColor || storedBgColor;
    const isBgTransparent = text.customData?.bgTransparent ?? !backgroundColor;
    text.customData.backgroundColor = backgroundColor || storedBgColor;
    textBgTransparentCheckbox.checked = isBgTransparent;

    const defaultShadow = {
        color: '#000000',
        opacity: 0.4,
        blur: 6,
        distance: 3,
        angle: 45
    };
    const customShadow = text.customData?.shadowSettings || {};
    let resolvedShadow = { ...defaultShadow, ...customShadow };
    if (text.shadow) {
        const { hex, alpha } = colorToHexAlpha(text.shadow.color || defaultShadow.color);
        const offsetX = text.shadow.offsetX || 0;
        const offsetY = text.shadow.offsetY || 0;
        const distance = Math.round(Math.sqrt(offsetX * offsetX + offsetY * offsetY));
        const angle = Math.round((Math.atan2(offsetY, offsetX) * 180 / Math.PI + 360) % 360);
        resolvedShadow = {
            color: hex,
            opacity: alpha,
            blur: text.shadow.blur ?? defaultShadow.blur,
            distance,
            angle
        };
    }
    const hasShadow = !!text.shadow;
    text.customData = text.customData || {};
    text.customData.hasShadow = hasShadow;
    text.customData.shadowSettings = resolvedShadow;
    textShadowCheckbox.checked = hasShadow;
    if (textShadowControls) {
        textShadowControls.classList.toggle('is-disabled', !hasShadow);
        document.getElementById('textShadowColor').value = resolvedShadow.color;
        document.getElementById('textShadowOpacity').value = Math.round(resolvedShadow.opacity * 100);
        document.getElementById('textShadowBlur').value = resolvedShadow.blur;
        document.getElementById('textShadowOffset').value = resolvedShadow.distance;
        document.getElementById('textShadowAngle').value = resolvedShadow.angle;
        document.getElementById('textShadowOpacityValue').textContent = Math.round(resolvedShadow.opacity * 100) + '%';
        document.getElementById('textShadowBlurValue').textContent = resolvedShadow.blur + 'px';
        document.getElementById('textShadowOffsetValue').textContent = resolvedShadow.distance + 'px';
        document.getElementById('textShadowAngleValue').textContent = resolvedShadow.angle + '°';
    }

    const defaultStroke = { color: '#ffffff', width: 4 };
    const customStroke = text.customData?.strokeSettings || {};
    let resolvedStroke = { ...defaultStroke, ...customStroke };
    const hasStroke = !!text.stroke && text.strokeWidth > 0;
    if (hasStroke) {
        resolvedStroke.color = colorToHexAlpha(text.stroke).hex;
        resolvedStroke.width = parseIntOr(text.strokeWidth, defaultStroke.width);
    }
    text.customData.hasStroke = hasStroke;
    text.customData.strokeSettings = resolvedStroke;
    textStrokeCheckbox.checked = hasStroke;
    if (textStrokeControls) {
        textStrokeControls.classList.toggle('is-disabled', !hasStroke);
        document.getElementById('textStrokeColor').value = resolvedStroke.color;
        document.getElementById('textStrokeWidth').value = resolvedStroke.width;
        document.getElementById('textStrokeWidthValue').textContent = resolvedStroke.width + 'px';
    }

    if (textLetterSpacingSlider) {
        const charSpacing = typeof text.charSpacing === 'number' ? Math.round(text.charSpacing) : 0;
        if (charSpacing > parseInt(textLetterSpacingSlider.max, 10)) {
            textLetterSpacingSlider.max = charSpacing;
        }
        textLetterSpacingSlider.value = charSpacing;
        document.getElementById('textLetterSpacingValue').textContent = (charSpacing / 100).toFixed(2) + 'em';
        text.customData.typography = text.customData.typography || {};
        text.customData.typography.letterSpacing = charSpacing;
    }

    if (textLineHeightSlider) {
        const ratio = typeof text.lineHeight === 'number' ? text.lineHeight : 1;
        const percent = Math.round(ratio * 100);
        if (percent < parseInt(textLineHeightSlider.min, 10)) {
            textLineHeightSlider.min = percent;
        }
        if (percent > parseInt(textLineHeightSlider.max, 10)) {
            textLineHeightSlider.max = percent;
        }
        textLineHeightSlider.value = percent;
        document.getElementById('textLineHeightValue').textContent = percent + '%';
        text.customData.typography = text.customData.typography || {};
        text.customData.typography.lineHeight = percent;
    }

    const rotation = text.angle || 0;
    document.getElementById('textRotation').value = rotation;
    document.getElementById('textRotationValue').textContent = rotation + '°';

    const scalePercent = (text.scaleX || 1) * 100;
    document.getElementById('textScale').value = scalePercent;
    document.getElementById('textScaleValue').textContent = scalePercent.toFixed(0) + '%';

    const opacityPercent = (text.opacity ?? 1) * 100;
    document.getElementById('textOpacity').value = opacityPercent;
    document.getElementById('textOpacityValue').textContent = opacityPercent.toFixed(0) + '%';

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
    text.customData = text.customData || {};
    text.customData.typography = text.customData.typography || {};
    
    const content = document.getElementById('textContent').value;
    const fontSize = parseIntOr(document.getElementById('fontSize').value, text.fontSize);
    const fontFamily = document.getElementById('fontFamily').value;
    const fillColor = document.getElementById('textColor').value;

    text.set({
        text: content,
        fontSize,
        fontFamily,
        fill: fillColor
    });
    document.getElementById('fontSizeValue').textContent = fontSize + 'px';
    document.getElementById('textColorHex').value = fillColor;

    const bgColor = document.getElementById('textBgColor').value;
    const bgTransparent = document.getElementById('textBgTransparent').checked;
    text.customData.bgTransparent = bgTransparent;
    text.customData.backgroundColor = bgColor;
    document.getElementById('textBgColorHex').value = bgColor;
    text.set({
        backgroundColor: bgTransparent ? '' : bgColor
    });

    const boldBtn = document.querySelector('[data-style="bold"]');
    const italicBtn = document.querySelector('[data-style="italic"]');
    const underlineBtn = document.querySelector('[data-style="underline"]');

    text.set({
        fontWeight: boldBtn && boldBtn.classList.contains('active') ? 'bold' : 'normal',
        fontStyle: italicBtn && italicBtn.classList.contains('active') ? 'italic' : 'normal',
        underline: underlineBtn ? underlineBtn.classList.contains('active') : false
    });

    const shadowCheckbox = document.getElementById('textShadow');
    const shadowControls = document.getElementById('textShadowControls');
    const hasShadow = shadowCheckbox.checked;
    const shadowColor = document.getElementById('textShadowColor').value;
    const shadowOpacity = clamp(parseIntOr(document.getElementById('textShadowOpacity').value, 40) / 100, 0, 1);
    const shadowBlur = parseIntOr(document.getElementById('textShadowBlur').value, 6);
    const shadowDistance = parseIntOr(document.getElementById('textShadowOffset').value, 3);
    const shadowAngle = parseIntOr(document.getElementById('textShadowAngle').value, 45);

    text.customData.hasShadow = hasShadow;
    text.customData.shadowSettings = {
        color: shadowColor,
        opacity: shadowOpacity,
        blur: shadowBlur,
        distance: shadowDistance,
        angle: shadowAngle
    };

    document.getElementById('textShadowOpacityValue').textContent = Math.round(shadowOpacity * 100) + '%';
    document.getElementById('textShadowBlurValue').textContent = shadowBlur + 'px';
    document.getElementById('textShadowOffsetValue').textContent = shadowDistance + 'px';
    document.getElementById('textShadowAngleValue').textContent = shadowAngle + '°';
    if (shadowControls) {
        shadowControls.classList.toggle('is-disabled', !hasShadow);
    }

    if (hasShadow) {
        const radians = shadowAngle * Math.PI / 180;
        const offsetX = Number((shadowDistance * Math.cos(radians)).toFixed(2));
        const offsetY = Number((shadowDistance * Math.sin(radians)).toFixed(2));

        text.set({
            shadow: new fabric.Shadow({
                color: hexToRgba(shadowColor, shadowOpacity),
                blur: shadowBlur,
                offsetX,
                offsetY
            })
        });
    } else {
        text.set({ shadow: null });
    }

    const strokeCheckbox = document.getElementById('textStroke');
    const strokeControls = document.getElementById('textStrokeControls');
    const hasStroke = strokeCheckbox.checked;
    const strokeColor = document.getElementById('textStrokeColor').value;
    const strokeWidth = Math.max(parseIntOr(document.getElementById('textStrokeWidth').value, 4), 0);

    text.customData.hasStroke = hasStroke;
    text.customData.strokeSettings = {
        color: strokeColor,
        width: strokeWidth
    };

    document.getElementById('textStrokeWidthValue').textContent = strokeWidth + 'px';
    if (strokeControls) {
        strokeControls.classList.toggle('is-disabled', !hasStroke);
    }

    if (hasStroke) {
        text.set({
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            strokeUniform: true
        });
    } else {
        text.set({
            stroke: null,
            strokeWidth: 0
        });
    }

    const letterSpacingSlider = document.getElementById('textLetterSpacing');
    const letterSpacingValueLabel = document.getElementById('textLetterSpacingValue');
    if (letterSpacingSlider && letterSpacingValueLabel) {
        const letterSpacing = Math.max(parseIntOr(letterSpacingSlider.value, 0), 0);
        text.customData.typography.letterSpacing = letterSpacing;
        text.set({ charSpacing: letterSpacing });
        letterSpacingValueLabel.textContent = (letterSpacing / 100).toFixed(2) + 'em';
    }

    const lineHeightSlider = document.getElementById('textLineHeight');
    const lineHeightValueLabel = document.getElementById('textLineHeightValue');
    if (lineHeightSlider && lineHeightValueLabel) {
        const lineHeightPercent = clamp(
            parseIntOr(lineHeightSlider.value, 100),
            parseInt(lineHeightSlider.min, 10),
            parseInt(lineHeightSlider.max, 10)
        );
        const lineHeight = lineHeightPercent / 100;
        text.customData.typography.lineHeight = lineHeightPercent;
        text.set({ lineHeight });
        lineHeightValueLabel.textContent = lineHeightPercent + '%';
    }

    const rotation = parseIntOr(document.getElementById('textRotation').value, 0);
    text.set({ angle: rotation });
    document.getElementById('textRotationValue').textContent = rotation + '°';

    const scalePercent = Math.max(parseIntOr(document.getElementById('textScale').value, 100), 1);
    const scale = scalePercent / 100;
    text.set({ scaleX: scale, scaleY: scale });
    document.getElementById('textScaleValue').textContent = scalePercent + '%';

    const opacityPercent = clamp(parseIntOr(document.getElementById('textOpacity').value, 100), 0, 100);
    const opacity = opacityPercent / 100;
    text.set({ opacity });
    document.getElementById('textOpacityValue').textContent = Math.round(opacity * 100) + '%';

    text.setCoords();
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
