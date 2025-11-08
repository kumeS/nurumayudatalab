function addLogoText(logoType) {
    const canvas = getCanvas();
    if (!canvas) {
        console.log('[DEBUG] addLogoText: Canvas not found');
        showNotification('キャンバスが初期化されていません', 'error');
        return;
    }

    console.log('[DEBUG] addLogoText called with logoType:', logoType);
    console.log('[DEBUG] Canvas dimensions:', canvas.width, canvas.height);

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

        console.log('[DEBUG] Loading SVG logo');

        fabric.loadSVGFromString(svgString, function(objects, options) {
            console.log('[DEBUG] SVG loaded, objects:', objects.length);

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

            console.log('[DEBUG] SVG logo positioned at:', logoGroup.left, logoGroup.top);

            canvas.add(logoGroup);
            console.log('[DEBUG] SVG logo added to canvas. Objects count:', canvas.getObjects().length);

            canvas.setActiveObject(logoGroup);
            canvas.renderAll();
            console.log('[DEBUG] SVG logo rendered');

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
        console.log('[DEBUG] addLogoText: Invalid logoType:', logoType);
        showNotification('選択したロゴは現在サポートされていません', 'error');
        return;
    }

    console.log('[DEBUG] Creating icon text for:', iconConfig.label);

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

    console.log('[DEBUG] Icon text object created:', iconText);

    suppressTabSwitchTemporarily(500);
    canvas.add(iconText);
    console.log('[DEBUG] Icon text added to canvas. Objects count:', canvas.getObjects().length);

    // アイコンを中央に配置
    if (typeof centerObjectOnCanvas === 'function') {
        centerObjectOnCanvas(iconText);
        console.log('[DEBUG] Used centerObjectOnCanvas for icon');
    } else {
        canvas.centerObject(iconText);
        console.log('[DEBUG] Used canvas.centerObject for icon');
    }

    // setCoords()を明示的に呼ぶ
    iconText.setCoords();
    console.log('[DEBUG] Icon position after centering - left:', iconText.left, 'top:', iconText.top);

    // ★重要: ロゴを最前面に移動（描画順序を保証）
    canvas.bringToFront(iconText);

    // アクティブオブジェクトに設定
    canvas.setActiveObject(iconText);
    console.log('[DEBUG] Set icon as active object');

    // ★簡素化: 1回の描画処理にまとめる
    requestAnimationFrame(() => {
        canvas.calcOffset();
        canvas.renderAll();
        console.log('[DEBUG] Icon added and rendered');
    });

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
    console.log('[DEBUG] addTemplateText called with:', templateText);

    const canvas = getCanvas();
    console.log('[DEBUG] Canvas object:', canvas);

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

    console.log('[DEBUG] Created template text object:', text);

    suppressTabSwitchTemporarily(500);
    canvas.add(text);
    console.log('[DEBUG] Template text added to canvas. Objects count:', canvas.getObjects().length);

    // テキストを中央に配置
    if (typeof centerObjectOnCanvas === 'function') {
        centerObjectOnCanvas(text);
        console.log('[DEBUG] Used centerObjectOnCanvas for template text');
    } else {
        canvas.centerObject(text);
        console.log('[DEBUG] Used canvas.centerObject for template text');
    }

    // setCoords()を明示的に呼ぶ
    text.setCoords();
    console.log('[DEBUG] Template text position after centering - left:', text.left, 'top:', text.top);

    // ★重要: テキストを最前面に移動（描画順序を保証）
    canvas.bringToFront(text);

    // アクティブオブジェクトに設定
    canvas.setActiveObject(text);
    console.log('[DEBUG] Set template text as active object');

    // 最後に選択したスタイルがあれば適用
    if (lastSelectedStyle) {
        console.log('[DEBUG] Applying last selected style:', lastSelectedStyle);
        applyStyleTemplateToObject(text, lastSelectedStyle);
    }

    // ★簡素化: 1回の描画処理にまとめる
    requestAnimationFrame(() => {
        canvas.calcOffset();
        canvas.renderAll();
        console.log('[DEBUG] Template text added and rendered');
    });

    showTextControls();
    updateTextControlsUI(text);

    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    console.log('[DEBUG] addTemplateText completed');
}

// スタイルテンプレート適用

function showTextControls() {
    const controlsSection = document.getElementById('textControlsSection');
    if (!controlsSection) {
        console.warn('[showTextControls] textControlsSection not found');
        return;
    }

    if (typeof hideImageControls === 'function') {
        hideImageControls();
    }

    controlsSection.classList.add('active');
    controlsSection.scrollTop = 0;

    const templatePanel = document.getElementById('templatePanel');
    if (templatePanel) {
        templatePanel.scrollTop = 0;
    }
}

// テキストコントロール非表示
function hideTextControls() {
    const controlsSection = document.getElementById('textControlsSection');
    if (controlsSection) {
        controlsSection.classList.remove('active');
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

    vibrateAndNotify('テキストを削除しました', 'success', [50, 50, 50]);
    saveCanvasState();
}
