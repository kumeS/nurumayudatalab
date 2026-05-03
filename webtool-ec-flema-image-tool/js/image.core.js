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

    console.log('=== DEBUG: Position Image on Canvas ===');
    console.log('Image object:', img);
    console.log('Canvas available:', !!canvas);
    console.log('Canvas dimensions:', [canvas.width, canvas.height]);

    const {
        offsetIndex = 0,
        deferRender = false
    } = options;

    const zoom = typeof getCanvasZoom === 'function' ? getCanvasZoom() : 1;
    const maxW = (canvas.width * 0.85) / zoom;
    const maxH = (canvas.height * 0.85) / zoom;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    if (isFinite(scale) && scale > 0) {
        img.scale(scale);
    }

    console.log('Image scaling applied, scale:', scale);

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

    console.log('Image added to canvas, total objects:', canvas.getObjects().length);

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

    // setCoords()は必ず呼ぶ
    img.setCoords();

    console.log('Image positioned at:', { left: img.left, top: img.top });

    // 描画処理を最適化
    if (!deferRender) {
        // 描画前にサイズ同期と座標計算を確実に実行
        if (typeof ensureCanvasSizeSync === 'function') {
            ensureCanvasSizeSync();
        }

        // z-indexと背景色を再設定（画像追加時に確実に表示するため）
        if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.zIndex = '11';
            canvas.upperCanvasEl.style.pointerEvents = 'auto';
            canvas.upperCanvasEl.style.backgroundColor = 'transparent';
        }
        if (canvas.lowerCanvasEl) {
            canvas.lowerCanvasEl.style.zIndex = '10';
            canvas.lowerCanvasEl.style.backgroundColor = '#ffffff';
        }

        canvas.calcOffset();

        // requestAnimationFrame内で描画を実行
        requestAnimationFrame(() => {
            canvas.renderAll();
            console.log('Canvas rendered via requestAnimationFrame');

            // 念のため2回目の描画（タイミング問題の保険）
            requestAnimationFrame(() => {
                canvas.renderAll();
                console.log('Canvas second render completed');
            });
        });
    }

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    scheduleCanvasHistoryCapture();
    if (typeof triggerQuickSave === 'function') {
        triggerQuickSave();
    }

    console.log('Image positioning completed');

    return img;
}

async function addImageFromDataUrl(imageDataUrl, options = {}) {
    const { fileName = '', skipHistory = false, offsetIndex = 0, deferRender = false } = options;

    if (!skipHistory) {
        try {
            await saveImageToHistory(imageDataUrl, fileName);
            // 画像履歴を更新（非同期で実行、エラーは無視）
            displayImageHistory().catch(err => console.error('Failed to update image history UI:', err));
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
        // 最初は直接fetch、CORSエラーの場合はプロキシ経由で再試行
        let response;
        try {
            response = await fetch(parsedUrl.href, { mode: 'cors' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (corsError) {
            // CORSエラーの場合、cors-anywhereプロキシ経由で再試行
            // 注: 本番環境では独自のプロキシサーバーを使用することを推奨
            console.warn('Direct fetch failed, trying with CORS proxy:', corsError);
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${parsedUrl.href}`;
            response = await fetch(proxyUrl, { mode: 'cors' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        }

        const blob = await response.blob();
        
        // MIME判定を緩和: application/octet-streamなども画像として試行
        const isImageMime = blob.type.startsWith('image/');
        const isGenericBinary = !blob.type || blob.type === 'application/octet-stream';
        
        if (!isImageMime && !isGenericBinary) {
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
            showNotification('画像を取得できませんでした。CORS制限により、一部の外部URLから直接画像を読み込めません。代わりに、画像をダウンロードしてファイルとしてアップロードしてください。', 'error');
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
    const controlsSection = document.getElementById('imageControlsSection');
    if (!controlsSection) {
        console.warn('[showImageControls] imageControlsSection not found');
        return;
    }

    if (typeof hideTextControls === 'function') {
        hideTextControls();
    }

    controlsSection.classList.add('active');
    controlsSection.scrollTop = 0;

    const imagePanel = document.getElementById('imagePanel');
    if (imagePanel) {
        imagePanel.scrollTop = 0;
    }
}

// 画像コントロール非表示
function hideImageControls() {
    const controlsSection = document.getElementById('imageControlsSection');
    if (controlsSection) {
        controlsSection.classList.remove('active');
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

    // ★Bug10修正: 現在のズームを取得
    let currentZoom = typeof getCanvasZoom === 'function' ? getCanvasZoom() : 1;
    
    // ★Bug10修正: エッジケース - ズームが0または無効
    if (!isFinite(currentZoom) || currentZoom === 0) {
        console.warn('[Bug10 FitImageHeight] Invalid zoom, falling back to 1.0');
        currentZoom = 1.0;
    }

    // キャンバスの論理サイズ（ズーム考慮なし）
    const canvasHeight = canvas.getHeight();
    if (!canvasHeight) {
        showNotification('キャンバスサイズを取得できませんでした', 'error');
        return;
    }

    console.log('[Bug10 FitImageHeight] Current zoom:', currentZoom);
    console.log('[Bug10 FitImageHeight] Canvas logical height:', canvasHeight);

    // ★Bug_report5対応: getBoundingRect(false, false) は論理座標を返すため、
    // ズームで割る必要はない（以前のバグ修正が誤っていた）
    const boundingRect = selectedObject.getBoundingRect(false, false);

    // getBoundingRect は既に論理サイズなのでそのまま使用
    let actualHeight = boundingRect.height;

    console.log('[Bug_report5 FitImageHeight] BoundingRect height (logical):', boundingRect.height);
    console.log('[Bug_report5 FitImageHeight] Using height directly:', actualHeight);
    
    // ★Bug10修正: エッジケース - 正規化後の高さが異常
    if (actualHeight < 0 || actualHeight > canvasHeight * 10) {
        console.error('[Bug10 FitImageHeight] Normalized height is abnormal:', actualHeight);
        console.error('[Bug10 FitImageHeight] Falling back to direct calculation');
        
        // フォールバック: 直接計算
        const objectWidth = selectedObject.width;
        const objectHeight = selectedObject.height;
        const currentScaleX = selectedObject.scaleX || 1;
        const currentScaleY = selectedObject.scaleY || 1;
        const rotation = selectedObject.angle || 0;
        
        const scaledWidth = objectWidth * currentScaleX;
        const scaledHeight = objectHeight * currentScaleY;
        
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        actualHeight = scaledHeight * cos + scaledWidth * sin;
        
        console.log('[Bug10 FitImageHeight] Fallback calculated height:', actualHeight);
    }
    
    if (!actualHeight || actualHeight === 0) {
        showNotification('画像サイズを取得できませんでした', 'error');
        return;
    }

    // キャンバスの高さに対するスケールファクターを計算
    const scaleFactor = canvasHeight / actualHeight;
    
    console.log('[Bug10 FitImageHeight] Current scaleX:', selectedObject.scaleX);
    console.log('[Bug10 FitImageHeight] Current scaleY:', selectedObject.scaleY);
    console.log('[Bug10 FitImageHeight] Scale factor:', scaleFactor);

    // 既存のスケールに scaleFactor を乗算（相対調整）
    selectedObject.set({
        scaleX: selectedObject.scaleX * scaleFactor,
        scaleY: selectedObject.scaleY * scaleFactor
    });

    // 座標を更新
    selectedObject.setCoords();

    // キャンバス中央に配置
    canvas.centerObject(selectedObject);
    selectedObject.setCoords();

    // 描画
    canvas.requestRenderAll();
    
    // ★Bug_report5対応: 検証用ログ（論理座標で比較）
    const verifyRect = selectedObject.getBoundingRect(false, false);
    const verifyHeight = verifyRect.height;
    console.log('[Bug_report5 FitImageHeight] After adjustment:');
    console.log('  - BoundingRect height (logical):', verifyRect.height);
    console.log('  - Target height:', canvasHeight);
    console.log('  - Difference:', Math.abs(verifyHeight - canvasHeight).toFixed(2), 'px');
    console.log('  - Percentage:', ((verifyHeight / canvasHeight) * 100).toFixed(2) + '%');

    vibrateAndNotify('画像を縦いっぱいにフィットしました', 'success');
    saveCanvasState();
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
