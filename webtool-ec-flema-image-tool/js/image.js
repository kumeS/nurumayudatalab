// ========== 画像管理モジュール ==========
// 画像のアップロード、フィルター適用、削除

const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

let images = []; // 追加された画像のリスト

// フィルター設定（選択中の画像用）
let currentFilters = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0
};

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function loadFabricImage(source, options = {}) {
    return new Promise((resolve, reject) => {
        fabric.Image.fromURL(source, (img) => {
            if (!img || !img.width || !img.height) {
                console.error('Failed to load image:', source);
                reject(new Error('Invalid image source'));
                return;
            }
            resolve(img);
        }, {
            ...options,
            crossOrigin: 'anonymous'
        });
    });
}

function positionImageOnCanvas(img, options = {}) {
    const canvas = getCanvas();
    if (!canvas) {
        showNotification('キャンバスが初期化されていません', 'error');
        throw new Error('Canvas not initialized');
    }

    const {
        offsetIndex = 0,
        deferRender = false
    } = options;

    const zoom = canvas.getZoom ? canvas.getZoom() : 1;
    const maxW = (canvas.width * 0.85) / zoom;
    const maxH = (canvas.height * 0.85) / zoom;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    if (isFinite(scale) && scale > 0) {
        img.scale(scale);
    }

    img.set({
        originX: 'center',
        originY: 'center',
        cornerStyle: 'circle',
        cornerColor: '#ff9a5a',
        cornerSize: 16,
        transparentCorners: false,
        borderColor: '#ff9a5a',
        centeredRotation: true,
        objectType: 'uploaded-image'
    });

    img.filters = [];
    img.customFilters = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0
    };

    images.push(img);
    canvas.add(img);

    if (canvas.getObjects().length === 1) {
        if (typeof zoomToFitObject === 'function') {
            zoomToFitObject(img, 32);
        }
    } else {
        if (typeof centerObjectOnCanvas === 'function') {
            centerObjectOnCanvas(img);
        } else {
            img.set({
                left: canvas.width / 2,
                top: canvas.height / 2
            });
        }
        if (offsetIndex > 0) {
            const offsetAmount = offsetIndex * 30;
            img.left += offsetAmount;
            img.top += offsetAmount;
            img.setCoords();
        }
    }

    canvas.setActiveObject(img);

    if (!deferRender) {
        canvas.renderAll();
    }

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    scheduleCanvasHistoryCapture();
    if (typeof triggerQuickSave === 'function') {
        triggerQuickSave();
    }

    return img;
}

async function addImageFromDataUrl(imageDataUrl, options = {}) {
    const { fileName = '', skipHistory = false, offsetIndex = 0, deferRender = false } = options;

    if (!skipHistory) {
        try {
            await saveImageToHistory(imageDataUrl, fileName);
        } catch (error) {
            console.error('Failed to save image to history:', error);
        }
    }

    try {
        const img = await loadFabricImage(imageDataUrl);
        return positionImageOnCanvas(img, { offsetIndex, deferRender });
    } catch (error) {
        console.error('Failed to add image from data URL:', error);
        showNotification('画像の読み込みに失敗しました', 'error');
        throw error;
    }
}

// 画像アップロード処理
async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const canvas = getCanvas();
    if (!canvas) {
        showNotification('キャンバスが初期化されていません', 'error');
        return;
    }

    const validFiles = [];
    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showNotification(`${file.name}は画像ファイルではありません`, 'error');
            return;
        }
        if (file.size > IMAGE_SIZE_LIMIT) {
            showNotification(`${file.name}は大きすぎます（最大10MB）`, 'error');
            return;
        }
        validFiles.push(file);
    });

    if (!validFiles.length) {
        e.target.value = '';
        return;
    }

    const isMultipleFiles = validFiles.length > 1;
    if (isMultipleFiles) {
        canvas.renderOnAddRemove = false;
    }

    let offsetIndex = 0;

    for (const file of validFiles) {
        try {
            const imageDataUrl = await fileToDataUrl(file);
            await addImageFromDataUrl(imageDataUrl, {
                fileName: file.name,
                offsetIndex,
                deferRender: isMultipleFiles
            });
            offsetIndex += 1;
        } catch (error) {
            console.error('Image upload failed:', error);
        }
    }

    if (isMultipleFiles) {
        canvas.renderOnAddRemove = true;
        canvas.renderAll();
    }

    e.target.value = '';
}

async function handleImageUrlImport() {
    const input = document.getElementById('imageUrlInput');
    const importBtn = document.getElementById('importImageUrlBtn');
    const container = importBtn ? importBtn.closest('.image-url-import') : null;

    if (!input || !importBtn) return;

    const rawUrl = input.value.trim();
    if (!rawUrl) {
        showNotification('画像のURLを入力してください', 'warning');
        return;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl);
    } catch (error) {
        showNotification('URLの形式が正しくありません', 'error');
        return;
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        showNotification('HTTPまたはHTTPSの画像URLを入力してください', 'error');
        return;
    }

    importBtn.disabled = true;
    if (container) {
        container.classList.add('is-loading');
    }

    try {
        const response = await fetch(parsedUrl.href, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            showNotification('画像ファイルではありません', 'error');
            return;
        }

        if (blob.size > IMAGE_SIZE_LIMIT) {
            showNotification('画像が大きすぎます（最大10MB）', 'error');
            return;
        }

        const imageDataUrl = await blobToDataUrl(blob);
        const fileName = decodeURIComponent(parsedUrl.pathname.split('/').pop() || '') || 'imported-image';

        await addImageFromDataUrl(imageDataUrl, {
            fileName,
            offsetIndex: 0,
            deferRender: false
        });

        showNotification('URLから画像を追加しました', 'success');
        input.value = '';
    } catch (error) {
        console.error('Image URL import error:', error);
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            showNotification('画像を取得できませんでした（CORS制限の可能性）', 'error');
        } else {
            showNotification('画像の読み込みに失敗しました', 'error');
        }
    } finally {
        importBtn.disabled = false;
        if (container) {
            container.classList.remove('is-loading');
        }
    }
}

// フィルター変更処理
function handleFilterChange(e) {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') return;
    
    const id = e.target.id;
    const value = parseFloat(e.target.value);
    
    currentFilters[id] = value;
    
    let displayValue = value;
    let unit = '';
    
    if (id === 'hue') {
        unit = '°';
    } else if (id === 'contrast' || id === 'saturation') {
        unit = '%';
    }
    
    document.getElementById(id + 'Value').textContent = displayValue + unit;
    
    applyFiltersToSelectedImage();
}

// フィルターリセット
function resetFilters() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') return;
    
    currentFilters = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0
    };
    
    document.getElementById('brightness').value = 0;
    document.getElementById('contrast').value = 0;
    document.getElementById('saturation').value = 0;
    document.getElementById('hue').value = 0;
    
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationValue').textContent = '0';
    document.getElementById('hueValue').textContent = '0';
    
    applyFiltersToSelectedImage();
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// 選択中の画像にフィルターを適用
function applyFiltersToSelectedImage() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') return;
    
    const canvas = getCanvas();
    
    // Fabric.jsのフィルターをクリア
    selectedObject.filters = [];
    
    // 輝度
    if (currentFilters.brightness !== 0) {
        selectedObject.filters.push(new fabric.Image.filters.Brightness({
            brightness: currentFilters.brightness / 100
        }));
    }
    
    // コントラスト
    if (currentFilters.contrast !== 0) {
        selectedObject.filters.push(new fabric.Image.filters.Contrast({
            contrast: currentFilters.contrast / 100
        }));
    }
    
    // 彩度
    if (currentFilters.saturation !== 0) {
        selectedObject.filters.push(new fabric.Image.filters.Saturation({
            saturation: currentFilters.saturation / 100
        }));
    }
    
    // 色相
    if (currentFilters.hue !== 0) {
        selectedObject.filters.push(new fabric.Image.filters.HueRotation({
            rotation: currentFilters.hue / 360
        }));
    }
    
    // フィルター設定を保存
    selectedObject.customFilters = { ...currentFilters };
    
    selectedObject.applyFilters();
    canvas.renderAll();

    scheduleCanvasHistoryCapture();
}

// 選択中の画像を削除
function deleteSelectedImage() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') return;
    
    const canvas = getCanvas();
    
    const index = images.indexOf(selectedObject);
    if (index > -1) {
        images.splice(index, 1);
    }
    
    canvas.remove(selectedObject);
    setSelectedObject(null);
    hideImageControls();
    canvas.renderAll();
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
    }
}

// 画像コントロール表示
function showImageControls() {
    const controlsPanel = document.getElementById('imageControlsPanel');
    const container = document.getElementById('canvasContainer');

    if (typeof hideTextControls === 'function') {
        hideTextControls();
    }

    if (controlsPanel) {
        controlsPanel.style.display = 'flex';
        controlsPanel.scrollTop = 0;
    }
}

// 画像コントロール非表示
function hideImageControls() {
    const controlsPanel = document.getElementById('imageControlsPanel');
    const container = document.getElementById('canvasContainer');

    if (controlsPanel) {
        controlsPanel.style.display = 'none';
    }
}

function fitImageToCanvasHeight() {
    const canvas = getCanvas();
    const selectedObject = getSelectedObject();

    if (!canvas) return;
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('調整する画像を選択してください', 'error');
        return;
    }

    // キャンバスの論理サイズ（ズーム非依存）
    const baseCanvasHeight = typeof canvas.getHeight === 'function'
        ? canvas.getHeight()
        : (typeof canvas.height === 'number' ? canvas.height : null);

    if (!baseCanvasHeight) {
        showNotification('キャンバスサイズを取得できませんでした', 'error');
        return;
    }

    // 元画像のピクセルサイズ（Fabricのwidth/heightは元画像に対応）
    const rawWidth = (selectedObject.width || selectedObject._originalElement?.naturalWidth || 0);
    const rawHeight = (selectedObject.height || selectedObject._originalElement?.naturalHeight || 0);

    if (!rawWidth || !rawHeight) {
        showNotification('画像サイズを取得できませんでした', 'error');
        return;
    }

    // 角度による外接矩形の高さ（現在のスケールを考慮して拡大率を“相対的”に計算）
    const angleInRadians = ((selectedObject.angle || 0) % 360) * Math.PI / 180;
    const sin = Math.abs(Math.sin(angleInRadians));
    const cos = Math.abs(Math.cos(angleInRadians));

    // 現在スケール後の幅・高さ
    const curScaledW = Math.abs((selectedObject.getScaledWidth ? selectedObject.getScaledWidth() : rawWidth * (selectedObject.scaleX || 1)) || 0);
    const curScaledH = Math.abs((selectedObject.getScaledHeight ? selectedObject.getScaledHeight() : rawHeight * (selectedObject.scaleY || 1)) || 0);

    const curBoundingHeight = (curScaledH * cos) + (curScaledW * sin);
    if (!curBoundingHeight) {
        showNotification('画像サイズの計算に失敗しました', 'error');
        return;
    }

    // 必要倍率（相対）: 現在の論理高さに合わせる
    const scaleFactor = baseCanvasHeight / curBoundingHeight;
    if (!isFinite(scaleFactor) || scaleFactor <= 0) {
        showNotification('画像サイズの計算に失敗しました', 'error');
        return;
    }

    const originalOriginX = selectedObject.originX;
    const originalOriginY = selectedObject.originY;

    selectedObject.set({
        originX: 'center',
        originY: 'center',
        scaleX: (selectedObject.scaleX || 1) * scaleFactor,
        scaleY: (selectedObject.scaleY || 1) * scaleFactor
    });

    if (typeof canvas.centerObject === 'function') {
        canvas.centerObject(selectedObject);
    }

    if (typeof originalOriginX !== 'undefined') {
        selectedObject.originX = originalOriginX;
    }
    if (typeof originalOriginY !== 'undefined') {
        selectedObject.originY = originalOriginY;
    }
    selectedObject.setCoords();

    // 誤差補正（1ステップで最終高さをキャンバス高さに一致させる）
    try {
        const afterW = Math.abs(selectedObject.getScaledWidth ? selectedObject.getScaledWidth() : rawWidth * Math.abs(selectedObject.scaleX || 1));
        const afterH = Math.abs(selectedObject.getScaledHeight ? selectedObject.getScaledHeight() : rawHeight * Math.abs(selectedObject.scaleY || 1));
        const afterBoundingH = (afterH * cos) + (afterW * sin);
        if (afterBoundingH && Math.abs(afterBoundingH - baseCanvasHeight) / baseCanvasHeight > 0.01) {
            const correction = baseCanvasHeight / afterBoundingH;
            selectedObject.set({
                scaleX: selectedObject.scaleX * correction,
                scaleY: selectedObject.scaleY * correction
            });
            selectedObject.setCoords();
        }
    } catch (e) {
        // ignore
    }

    canvas.requestRenderAll();
    
    // 視覚的な齟齬を避けるため、キャンバスをコンテナにフィット（表示倍率）
    // 論理スケールは上で適用済み。
    if (typeof window.fitCanvasToContainer === 'function') {
        window.fitCanvasToContainer();
    }

    triggerQuickSave();
    scheduleCanvasHistoryCapture();
    showNotification('画像を縦方向にフィットしました', 'success');
}

function removeImageBackgroundQuick() {
    const canvas = getCanvas();
    const selectedObject = getSelectedObject();

    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('背景を削除する画像を選択してください', 'error');
        return;
    }

    const sourceImage = selectedObject._originalElement;
    if (!sourceImage) {
        showNotification('元画像を読み込めませんでした', 'error');
        return;
    }

    // ローディング表示開始
    showNotification('背景を削除中...', 'info', { duration: Infinity, loading: true });

    const naturalWidth = sourceImage.naturalWidth || sourceImage.width;
    const naturalHeight = sourceImage.naturalHeight || sourceImage.height;

    if (!naturalWidth || !naturalHeight) {
        showNotification('画像サイズが確認できませんでした', 'error');
        return;
    }

    // 大きい画像の警告
    if (naturalWidth * naturalHeight > 4000 * 4000) {
        showNotification('画像が大きいため処理に時間がかかる場合があります', 'info');
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = naturalWidth;
    tempCanvas.height = naturalHeight;
    const ctx = tempCanvas.getContext('2d');

    if (!ctx) {
        showNotification('Canvas contextの取得に失敗しました', 'error');
        return;
    }

    try {
        ctx.drawImage(sourceImage, 0, 0, naturalWidth, naturalHeight);
        const imageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
        const data = imageData.data;

        const samples = [];
        const stepX = Math.max(1, Math.floor(naturalWidth / 60));
        const stepY = Math.max(1, Math.floor(naturalHeight / 60));

        function addSample(x, y) {
            const idx = (y * naturalWidth + x) * 4;
            samples.push([
                data[idx],
                data[idx + 1],
                data[idx + 2]
            ]);
        }

        for (let x = 0; x < naturalWidth; x += stepX) {
            addSample(x, 0);
            addSample(x, naturalHeight - 1);
        }

        for (let y = 0; y < naturalHeight; y += stepY) {
            addSample(0, y);
            addSample(naturalWidth - 1, y);
        }

        const avg = samples.reduce((acc, sample) => {
            acc[0] += sample[0];
            acc[1] += sample[1];
            acc[2] += sample[2];
            return acc;
        }, [0, 0, 0]).map(value => value / samples.length || 0);

        const avgDistances = samples.map(sample => {
            const dr = sample[0] - avg[0];
            const dg = sample[1] - avg[1];
            const db = sample[2] - avg[2];
            return Math.sqrt(dr * dr + dg * dg + db * db);
        });

        const meanDistance = avgDistances.reduce((sum, d) => sum + d, 0) / (avgDistances.length || 1);

        // ユーザー指定の許容値を取得（10-150、デフォルト: 50）
        const userTolerance = parseInt(document.getElementById('bgRemovalTolerance')?.value || 50);

        // meanDistanceを基準に、ユーザー許容値で調整
        const baseTolerance = meanDistance * 1.8 + 12;
        const adjustmentFactor = userTolerance / 50; // 50が基準値（1.0倍）
        const threshold = Math.min(200, Math.max(10, baseTolerance * adjustmentFactor));
        const softThreshold = threshold * 1.4;

        for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - avg[0];
            const dg = data[i + 1] - avg[1];
            const db = data[i + 2] - avg[2];
            const distance = Math.sqrt(dr * dr + dg * dg + db * db);

            if (distance <= threshold) {
                data[i + 3] = 0;
            } else if (distance < softThreshold) {
                const ratio = (distance - threshold) / (softThreshold - threshold);
                data[i + 3] = Math.max(0, data[i + 3] * ratio);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const processedDataUrl = tempCanvas.toDataURL('image/png');

        const objectIndex = canvas.getObjects().indexOf(selectedObject);
        const preserveProps = {
            left: selectedObject.left,
            top: selectedObject.top,
            originX: selectedObject.originX,
            originY: selectedObject.originY,
            angle: selectedObject.angle,
            scaleX: selectedObject.scaleX,
            scaleY: selectedObject.scaleY,
            flipX: selectedObject.flipX,
            flipY: selectedObject.flipY,
            skewX: selectedObject.skewX,
            skewY: selectedObject.skewY,
            customFilters: { ...(selectedObject.customFilters || currentFilters) }
        };

        const filtersSnapshot = (selectedObject.filters || []).slice();
        const shadowSnapshot = selectedObject.shadow || null;

        fabric.Image.fromURL(processedDataUrl, (newImg) => {
            if (!newImg) {
                hideLoadingNotification();
                showNotification('処理済み画像の読み込みに失敗しました', 'error');
                return;
            }

            newImg.set({
                ...preserveProps,
                objectType: 'uploaded-image'
            });

            newImg.filters = filtersSnapshot;
            if (filtersSnapshot.length > 0) {
                newImg.applyFilters();
            }

            if (shadowSnapshot) {
                newImg.shadow = shadowSnapshot;
            }

            canvas.remove(selectedImage);
            if (objectIndex >= 0) {
                canvas.insertAt(newImg, objectIndex, false);
            } else {
                canvas.add(newImg);
            }
            canvas.setActiveObject(newImg);
            updateImageControlsUI(newImg);
            showImageControls();
            canvas.requestRenderAll();
            scheduleCanvasHistoryCapture();

            // ローディング非表示 → 成功メッセージ表示
            hideLoadingNotification();
            showNotification('背景を透過しました (β)', 'success');
        }, { crossOrigin: 'anonymous' });

    } catch (error) {
        console.error('Background removal error:', error);
        // ローディング非表示 → エラーメッセージ表示
        hideLoadingNotification();
        showNotification('背景削除に失敗しました', 'error');
    }
}

// 画像コントロールUI更新
function updateImageControlsUI(img) {
    if (!img || img.objectType !== 'uploaded-image') return;
    
    const filters = img.customFilters || {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0
    };
    
    currentFilters = { ...filters };
    
    document.getElementById('brightness').value = filters.brightness;
    document.getElementById('contrast').value = filters.contrast;
    document.getElementById('saturation').value = filters.saturation;
    document.getElementById('hue').value = filters.hue;
    
    document.getElementById('brightnessValue').textContent = filters.brightness;
    document.getElementById('contrastValue').textContent = filters.contrast;
    document.getElementById('saturationValue').textContent = filters.saturation;
    document.getElementById('hueValue').textContent = filters.hue + '°';
}

// 画像リスト取得
function getImages() {
    return images;
}

// ========== 画像の一部ぼかし機能 ==========

// ぼかし状態管理
let blurState = {
    isActive: false,
    targetImage: null,
    overlayRect: null,
    radius: 8,
    listeners: []
};

// 一部ぼかしモードを開始
function startPartialBlur() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('ぼかしを適用する画像を選択してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    
    // 既にモードがアクティブな場合は終了
    if (blurState.isActive) {
        showNotification('既にぼかしモードがアクティブです', 'info');
        return;
    }
    
    blurState.isActive = true;
    blurState.targetImage = selectedObject;
    
    // キャンバスの選択を一時的に無効化
    canvas.selection = false;
    selectedObject.selectable = false;
    
    // 画像の範囲内に矩形を作成
    const imgBounds = selectedObject.getBoundingRect();
    const rectWidth = Math.min(imgBounds.width * 0.6, imgBounds.width - 40);
    const rectHeight = Math.min(imgBounds.height * 0.6, imgBounds.height - 40);
    
    blurState.overlayRect = new fabric.Rect({
        left: imgBounds.left + (imgBounds.width - rectWidth) / 2,
        top: imgBounds.top + (imgBounds.height - rectHeight) / 2,
        width: rectWidth,
        height: rectHeight,
        fill: 'rgba(100, 100, 255, 0.2)',
        stroke: '#ff9a5a',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        cornerStyle: 'circle',
        cornerColor: '#ff9a5a',
        cornerSize: 12,
        transparentCorners: false,
        objectType: 'blur-helper'
    });
    
    canvas.add(blurState.overlayRect);
    canvas.setActiveObject(blurState.overlayRect);
    canvas.renderAll();
    
    // UIボタンの表示切り替え
    const startBtn = document.getElementById('startPartialBlurBtn');
    const applyBtn = document.getElementById('applyPartialBlurBtn');
    const cancelBtn = document.getElementById('cancelPartialBlurBtn');
    
    if (startBtn) startBtn.style.display = 'none';
    if (applyBtn) applyBtn.style.display = 'inline-block';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    
    showNotification('ぼかし範囲を選択して「適用」をクリック', 'info');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// 一部ぼかしを適用
function applyPartialBlur() {
    if (!blurState.isActive || !blurState.overlayRect || !blurState.targetImage) {
        showNotification('ぼかしモードを開始してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    const selectedImage = blurState.targetImage;
    const blurRect = blurState.overlayRect;
    
    // 処理開始通知
    showNotification('ぼかしを適用中...', 'info', { duration: Infinity, loading: true });
    
    try {
        const sourceImage = selectedImage._originalElement || selectedImage.getElement();
        if (!sourceImage) {
            throw new Error('元画像を取得できませんでした');
        }
        
        const naturalWidth = sourceImage.naturalWidth || sourceImage.width;
        const naturalHeight = sourceImage.naturalHeight || sourceImage.height;
        
        if (!naturalWidth || !naturalHeight) {
            throw new Error('画像サイズを取得できませんでした');
        }
        
        // オフスクリーンキャンバス作成（ベース画像）
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = naturalWidth;
        baseCanvas.height = naturalHeight;
        const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
        
        if (!baseCtx) {
            throw new Error('Canvas contextの取得に失敗しました');
        }
        
        // 元画像を描画
        baseCtx.drawImage(sourceImage, 0, 0, naturalWidth, naturalHeight);
        
        // ぼかし用キャンバス作成
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = naturalWidth;
        blurCanvas.height = naturalHeight;
        const blurCtx = blurCanvas.getContext('2d');
        
        if (!blurCtx) {
            throw new Error('Blur canvas contextの取得に失敗しました');
        }
        
        // ぼかし半径を取得
        const blurRadius = blurState.radius || 8;
        blurCtx.filter = `blur(${blurRadius}px)`;
        blurCtx.drawImage(sourceImage, 0, 0, naturalWidth, naturalHeight);
        
        // 矩形範囲をローカル座標系に変換
        const blurRectBounds = blurRect.getBoundingRect();
        const imgBounds = selectedImage.getBoundingRect();
        
        // 画像の変換行列を取得して逆変換
        const transform = selectedImage.calcTransformMatrix();
        const invTransform = fabric.util.invertTransform(transform);
        
        // 矩形の4隅をローカル座標に変換
        const corners = [
            { x: blurRectBounds.left, y: blurRectBounds.top },
            { x: blurRectBounds.left + blurRectBounds.width, y: blurRectBounds.top },
            { x: blurRectBounds.left + blurRectBounds.width, y: blurRectBounds.top + blurRectBounds.height },
            { x: blurRectBounds.left, y: blurRectBounds.top + blurRectBounds.height }
        ];
        
        const localCorners = corners.map(corner => 
            fabric.util.transformPoint(corner, invTransform)
        );
        
        // 境界ボックスを計算
        const xs = localCorners.map(p => p.x);
        const ys = localCorners.map(p => p.y);
        const minX = Math.max(0, Math.floor(Math.min(...xs)));
        const minY = Math.max(0, Math.floor(Math.min(...ys)));
        const maxX = Math.min(naturalWidth, Math.ceil(Math.max(...xs)));
        const maxY = Math.min(naturalHeight, Math.ceil(Math.max(...ys)));
        
        const blurWidth = maxX - minX;
        const blurHeight = maxY - minY;
        
        if (blurWidth <= 0 || blurHeight <= 0) {
            throw new Error('ぼかし範囲が無効です');
        }
        
        // ぼかし範囲を転写
        baseCtx.drawImage(
            blurCanvas,
            minX, minY, blurWidth, blurHeight,
            minX, minY, blurWidth, blurHeight
        );
        
        // 新しい画像を生成
        const processedDataUrl = baseCanvas.toDataURL('image/png');
        
        // 元画像のプロパティを保存
        const objectIndex = canvas.getObjects().indexOf(selectedImage);
        const preserveProps = {
            left: selectedImage.left,
            top: selectedImage.top,
            originX: selectedImage.originX,
            originY: selectedImage.originY,
            angle: selectedImage.angle,
            scaleX: selectedImage.scaleX,
            scaleY: selectedImage.scaleY,
            flipX: selectedImage.flipX,
            flipY: selectedImage.flipY,
            opacity: selectedImage.opacity,
            customFilters: { ...(selectedImage.customFilters || currentFilters) }
        };
        
        const filtersSnapshot = (selectedImage.filters || []).slice();
        
        // 新しい画像を作成
        fabric.Image.fromURL(processedDataUrl, (newImg) => {
            if (!newImg) {
                hideLoadingNotification();
                showNotification('処理済み画像の読み込みに失敗しました', 'error');
                cancelPartialBlur();
                return;
            }

            newImg.set({
                ...preserveProps,
                objectType: 'uploaded-image'
            });
            
            newImg.filters = filtersSnapshot;
            if (filtersSnapshot.length > 0) {
                newImg.applyFilters();
            }
            
            canvas.remove(selectedImage);
            if (objectIndex >= 0) {
                canvas.insertAt(newImg, objectIndex, false);
            } else {
                canvas.add(newImg);
            }
            
            canvas.setActiveObject(newImg);
            updateImageControlsUI(newImg);
            showImageControls();
            
            // ぼかしモードを終了
            cancelPartialBlur();
            
            canvas.requestRenderAll();
            scheduleCanvasHistoryCapture();
            triggerQuickSave();
            
            hideLoadingNotification();
            showNotification('ぼかしを適用しました', 'success');
            
            // 触覚フィードバック
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
        }, { crossOrigin: 'anonymous' });
        
    } catch (error) {
        console.error('Partial blur error:', error);
        hideLoadingNotification();
        showNotification('ぼかしの適用に失敗しました: ' + error.message, 'error');
        cancelPartialBlur();
    }
}

// 一部ぼかしをキャンセル
function cancelPartialBlur() {
    if (!blurState.isActive) return;
    
    const canvas = getCanvas();
    
    // オーバーレイ矩形を削除
    if (blurState.overlayRect) {
        canvas.remove(blurState.overlayRect);
        blurState.overlayRect = null;
    }
    
    // ターゲット画像の選択を復元
    if (blurState.targetImage) {
        blurState.targetImage.selectable = true;
    }
    
    // キャンバスの選択を復元
    canvas.selection = true;
    canvas.discardActiveObject();
    canvas.renderAll();
    
    // 状態をリセット
    blurState.isActive = false;
    blurState.targetImage = null;
    blurState.overlayRect = null;
    
    // UIボタンの表示切り替え
    const startBtn = document.getElementById('startPartialBlurBtn');
    const applyBtn = document.getElementById('applyPartialBlurBtn');
    const cancelBtn = document.getElementById('cancelPartialBlurBtn');
    
    if (startBtn) startBtn.style.display = 'inline-block';
    if (applyBtn) applyBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    showNotification('ぼかしモードを終了しました', 'info');
}

// ========== 画像トリミング機能 ==========

// トリミング状態管理
let cropState = {
    isActive: false,
    targetImage: null,
    overlayRect: null,
    originalClipPath: null
};

// トリミングモードを開始
function startCropping() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('トリミングする画像を選択してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    
    // 既にモードがアクティブな場合は終了
    if (cropState.isActive) {
        showNotification('既にトリミングモードがアクティブです', 'info');
        return;
    }
    
    cropState.isActive = true;
    cropState.targetImage = selectedObject;
    cropState.originalClipPath = selectedObject.clipPath;
    
    // キャンバスの選択を一時的に無効化
    canvas.selection = false;
    selectedObject.selectable = false;
    
    // 画像の範囲内に矩形を作成
    const imgBounds = selectedObject.getBoundingRect();
    const rectWidth = Math.min(imgBounds.width * 0.8, imgBounds.width - 40);
    const rectHeight = Math.min(imgBounds.height * 0.8, imgBounds.height - 40);
    
    cropState.overlayRect = new fabric.Rect({
        left: imgBounds.left + (imgBounds.width - rectWidth) / 2,
        top: imgBounds.top + (imgBounds.height - rectHeight) / 2,
        width: rectWidth,
        height: rectHeight,
        fill: 'rgba(255, 154, 90, 0.2)',
        stroke: '#ff9a5a',
        strokeWidth: 3,
        strokeDashArray: [8, 4],
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        cornerStyle: 'circle',
        cornerColor: '#ff9a5a',
        cornerSize: 14,
        transparentCorners: false,
        objectType: 'crop-helper'
    });
    
    canvas.add(cropState.overlayRect);
    canvas.setActiveObject(cropState.overlayRect);
    
    // プレビュー用のclipPathを設定
    updateCropPreview();
    
    // 矩形の移動・リサイズ時にプレビュー更新
    const updateHandler = () => updateCropPreview();
    cropState.overlayRect.on('moving', updateHandler);
    cropState.overlayRect.on('scaling', updateHandler);
    cropState.overlayRect.on('modified', updateHandler);
    
    canvas.renderAll();
    
    // UIボタンの表示切り替え
    const startBtn = document.getElementById('startCroppingBtn');
    const applyBtn = document.getElementById('applyCroppingBtn');
    const cancelBtn = document.getElementById('cancelCroppingBtn');
    
    if (startBtn) startBtn.style.display = 'none';
    if (applyBtn) applyBtn.style.display = 'inline-block';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    
    showNotification('トリミング範囲を選択して「適用」をクリック', 'info');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// トリミングプレビューを更新
function updateCropPreview() {
    if (!cropState.isActive || !cropState.overlayRect || !cropState.targetImage) return;
    
    const canvas = getCanvas();
    const rect = cropState.overlayRect;
    const image = cropState.targetImage;
    
    // overlayRectの境界をキャンバス座標で取得
    const rectBounds = rect.getBoundingRect();
    
    // clipPathを作成（absolutePositionedでキャンバス座標系でクリップ）
    const clipRect = new fabric.Rect({
        left: rectBounds.left,
        top: rectBounds.top,
        width: rectBounds.width,
        height: rectBounds.height,
        absolutePositioned: true
    });
    
    image.clipPath = clipRect;
    canvas.renderAll();
}

// トリミングを適用
function applyCropping() {
    if (!cropState.isActive || !cropState.overlayRect || !cropState.targetImage) {
        showNotification('トリミングモードを開始してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    const selectedImage = cropState.targetImage;
    const cropRect = cropState.overlayRect;
    
    try {
        // 矩形範囲をローカル座標系に変換
        const cropRectBounds = cropRect.getBoundingRect();
        
        // 画像の変換行列を取得して逆変換
        const transform = selectedImage.calcTransformMatrix();
        const invTransform = fabric.util.invertTransform(transform);
        
        // 矩形の4隅をローカル座標に変換
        const corners = [
            { x: cropRectBounds.left, y: cropRectBounds.top },
            { x: cropRectBounds.left + cropRectBounds.width, y: cropRectBounds.top },
            { x: cropRectBounds.left + cropRectBounds.width, y: cropRectBounds.top + cropRectBounds.height },
            { x: cropRectBounds.left, y: cropRectBounds.top + cropRectBounds.height }
        ];
        
        const localCorners = corners.map(corner => 
            fabric.util.transformPoint(corner, invTransform)
        );
        
        // 境界ボックスを計算
        const xs = localCorners.map(p => p.x);
        const ys = localCorners.map(p => p.y);
        
        const sourceImage = selectedImage._originalElement || selectedImage.getElement();
        const naturalWidth = sourceImage.naturalWidth || sourceImage.width;
        const naturalHeight = sourceImage.naturalHeight || sourceImage.height;
        
        const cropX = Math.max(0, Math.round(Math.min(...xs)));
        const cropY = Math.max(0, Math.round(Math.min(...ys)));
        const cropW = Math.min(naturalWidth - cropX, Math.round(Math.max(...xs) - Math.min(...xs)));
        const cropH = Math.min(naturalHeight - cropY, Math.round(Math.max(...ys) - Math.min(...ys)));
        
        if (cropW <= 0 || cropH <= 0) {
            throw new Error('トリミング範囲が無効です');
        }
        
        // トリミング領域の中心座標を保存（位置補正用）
        const centerX = (cropRectBounds.left + cropRectBounds.width / 2);
        const centerY = (cropRectBounds.top + cropRectBounds.height / 2);
        
        // cropX, cropY, width, heightを設定
        selectedImage.set({
            cropX: cropX,
            cropY: cropY,
            width: cropW,
            height: cropH
        });
        
        // 位置を補正（中心位置を維持）
        selectedImage.setPositionByOrigin(
            { x: centerX, y: centerY },
            'center',
            'center'
        );
        
        selectedImage.setCoords();
        
        // clipPathを解除
        selectedImage.clipPath = cropState.originalClipPath;
        
        // トリミングモードを終了
        cancelCropping();
        
        canvas.setActiveObject(selectedImage);
        selectedImage.selectable = true;
        canvas.renderAll();
        
        scheduleCanvasHistoryCapture();
        triggerQuickSave();
        
        showNotification('トリミングしました', 'success');
        
        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
    } catch (error) {
        console.error('Cropping error:', error);
        showNotification('トリミングに失敗しました: ' + error.message, 'error');
        cancelCropping();
    }
}

// トリミングをキャンセル
function cancelCropping() {
    if (!cropState.isActive) return;
    
    const canvas = getCanvas();
    
    // オーバーレイ矩形を削除
    if (cropState.overlayRect) {
        cropState.overlayRect.off('moving');
        cropState.overlayRect.off('scaling');
        cropState.overlayRect.off('modified');
        canvas.remove(cropState.overlayRect);
        cropState.overlayRect = null;
    }
    
    // clipPathを復元
    if (cropState.targetImage) {
        cropState.targetImage.clipPath = cropState.originalClipPath;
        cropState.targetImage.selectable = true;
    }
    
    // キャンバスの選択を復元
    canvas.selection = true;
    canvas.discardActiveObject();
    canvas.renderAll();
    
    // 状態をリセット
    cropState.isActive = false;
    cropState.targetImage = null;
    cropState.overlayRect = null;
    cropState.originalClipPath = null;
    
    // UIボタンの表示切り替え
    const startBtn = document.getElementById('startCroppingBtn');
    const applyBtn = document.getElementById('applyCroppingBtn');
    const cancelBtn = document.getElementById('cancelCroppingBtn');
    
    if (startBtn) startBtn.style.display = 'inline-block';
    if (applyBtn) applyBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    showNotification('トリミングモードを終了しました', 'info');
}

// ========== 画像回転・反転機能 ==========

// 画像を90度回転
function rotateSelectedImage90() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('回転する画像を選択してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    const currentAngle = selectedObject.angle || 0;
    selectedObject.set('angle', currentAngle + 90);
    selectedObject.setCoords();
    
    canvas.renderAll();
    scheduleCanvasHistoryCapture();
    triggerQuickSave();
    
    showNotification('90度回転しました', 'success');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// 画像を水平反転（左右反転）
function flipSelectedImageHorizontal() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('反転する画像を選択してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    selectedObject.set('flipX', !selectedObject.flipX);
    selectedObject.setCoords();
    
    canvas.renderAll();
    scheduleCanvasHistoryCapture();
    triggerQuickSave();
    
    showNotification('水平反転しました', 'success');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// 画像を垂直反転（上下反転）
function flipSelectedImageVertical() {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification('反転する画像を選択してください', 'error');
        return;
    }
    
    const canvas = getCanvas();
    selectedObject.set('flipY', !selectedObject.flipY);
    selectedObject.setCoords();
    
    canvas.renderAll();
    scheduleCanvasHistoryCapture();
    triggerQuickSave();
    
    showNotification('垂直反転しました', 'success');
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}
