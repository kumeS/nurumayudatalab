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

    console.log('[DEBUG] addNewText called with options:', options);

    const canvas = getCanvas();
    console.log('[DEBUG] Canvas object:', canvas);
    console.log('[DEBUG] Canvas width/height:', canvas?.width, canvas?.height);

    const resolvedPosition = position || {
        left: canvas.width / 2,
        top: canvas.height / 2
    };

    console.log('[DEBUG] Resolved position:', resolvedPosition);

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

    console.log('[DEBUG] Created text object:', text);
    console.log('[DEBUG] Text object properties - left:', text.left, 'top:', text.top, 'fontSize:', text.fontSize);

    canvas.add(text);
    console.log('[DEBUG] Text added to canvas. Canvas objects count:', canvas.getObjects().length);

    // テキストを中央に配置
    if (typeof centerObjectOnCanvas === 'function') {
        centerObjectOnCanvas(text);
        console.log('[DEBUG] Used centerObjectOnCanvas function');
    } else {
        canvas.centerObject(text);
        console.log('[DEBUG] Used canvas.centerObject');
    }

    // setCoords()を明示的に呼ぶ
    text.setCoords();
    console.log('[DEBUG] After centering - left:', text.left, 'top:', text.top);

    // ★重要: テキストを最前面に移動（描画順序を保証）
    canvas.bringToFront(text);

    // アクティブオブジェクトに設定
    canvas.setActiveObject(text);
    console.log('[DEBUG] Set text as active object');

    // ★簡素化: 1回の描画処理にまとめる
    requestAnimationFrame(() => {
        canvas.calcOffset();
        canvas.renderAll();
        console.log('[DEBUG] Text added and rendered');
    });

    if (switchToTextTab) {
        switchTab(document.querySelector('[data-tab="template"]'));
    }
    showTextControls();
    updateTextControlsUI(text);

    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    console.log('[DEBUG] addNewText completed');
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
