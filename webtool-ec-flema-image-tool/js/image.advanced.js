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
            saveCanvasState();
            
            hideLoadingNotification();
            vibrateAndNotify('ぼかしを適用しました', 'success');
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
        
        vibrateAndNotify('トリミングしました', 'success');
        saveCanvasState();
        
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

// 画像変形の共通処理
function transformSelectedImage(transformFn, errorMsg, successMsg) {
    const selectedObject = getSelectedObject();
    if (!selectedObject || selectedObject.objectType !== 'uploaded-image') {
        showNotification(errorMsg, 'error');
        return;
    }
    
    const canvas = getCanvas();
    transformFn(selectedObject);
    updateAndRender(selectedObject, canvas);
    vibrateAndNotify(successMsg, 'success');
    saveCanvasState();
}

// 画像を90度回転
function rotateSelectedImage90() {
    transformSelectedImage(
        (obj) => obj.set('angle', (obj.angle || 0) + 90),
        '回転する画像を選択してください',
        '90度回転しました'
    );
}

// 画像を水平反転（左右反転）
function flipSelectedImageHorizontal() {
    transformSelectedImage(
        (obj) => obj.set('flipX', !obj.flipX),
        '反転する画像を選択してください',
        '水平反転しました'
    );
}

// 画像を垂直反転（上下反転）
function flipSelectedImageVertical() {
    transformSelectedImage(
        (obj) => obj.set('flipY', !obj.flipY),
        '反転する画像を選択してください',
        '垂直反転しました'
    );
}

// ========== 画像履歴パネル ==========

// 画像履歴を表示
async function displayImageHistory() {
    const historyGrid = document.getElementById('imageHistoryGrid');
    if (!historyGrid) return;

    try {
        const images = await getAllImageHistory();

        if (!images || images.length === 0) {
            historyGrid.innerHTML = `
                <div class="image-history-empty">
                    <i class="fas fa-images"></i>
                    <p>まだ画像を追加していません</p>
                </div>
            `;
            return;
        }

        // 画像履歴アイテムを生成
        historyGrid.innerHTML = images.map(image => {
            const date = new Date(image.uploadedAt);
            const dateStr = date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="image-history-item" data-image-id="${image.id}">
                    <img src="${image.dataUrl}" alt="${image.fileName || '画像'}" loading="lazy">
                    <div class="image-history-item-overlay">
                        <div class="image-history-item-info" title="${image.fileName || dateStr}">
                            ${image.fileName || dateStr}
                        </div>
                    </div>
                    <button class="image-history-item-delete" data-image-id="${image.id}" title="削除" aria-label="画像を履歴から削除">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        // クリックイベントを追加
        attachImageHistoryEventListeners();

    } catch (error) {
        console.error('Failed to display image history:', error);
        historyGrid.innerHTML = `
            <div class="image-history-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <p>履歴の読み込みに失敗しました</p>
            </div>
        `;
    }
}

// 画像履歴のイベントリスナーを設定
function attachImageHistoryEventListeners() {
    const historyGrid = document.getElementById('imageHistoryGrid');
    if (!historyGrid) return;

    // 画像アイテムのクリック（キャンバスに追加）
    historyGrid.querySelectorAll('.image-history-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            // 削除ボタンのクリックは除外
            if (e.target.closest('.image-history-item-delete')) {
                return;
            }

            const imageId = parseInt(item.dataset.imageId);
            await addImageFromHistory(imageId);
        });
    });

    // 削除ボタンのクリック
    historyGrid.querySelectorAll('.image-history-item-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const imageId = parseInt(btn.dataset.imageId);
            await deleteImageFromHistoryUI(imageId);
        });
    });
}

// 画像履歴からキャンバスに追加
async function addImageFromHistory(imageId) {
    try {
        const images = await getAllImageHistory();
        const imageData = images.find(img => img.id === imageId);

        if (!imageData) {
            showNotification('画像が見つかりませんでした', 'error');
            return;
        }

        const canvas = getCanvas();
        if (!canvas) {
            showNotification('キャンバスがありません', 'error');
            return;
        }

        // Data URL から画像を追加
        fabric.Image.fromURL(imageData.dataUrl, (img) => {
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // 画像をキャンバスに収まるようにスケーリング
            const maxWidth = canvasWidth * 0.8;
            const maxHeight = canvasHeight * 0.8;
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

            img.scale(scale);
            img.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center',
                objectType: 'uploaded-image',
                cornerStyle: 'circle',
                cornerColor: '#ff9a5a',
                cornerSize: 16,
                transparentCorners: false,
                borderColor: '#ff9a5a'
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();

            scheduleCanvasHistoryCapture();
            triggerQuickSave();

            showNotification('画像を追加しました', 'success');

            // 触覚フィードバック
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
        }, { crossOrigin: 'anonymous' });

    } catch (error) {
        console.error('Failed to add image from history:', error);
        showNotification('画像の追加に失敗しました', 'error');
    }
}

// 画像履歴から削除（UI更新込み）
async function deleteImageFromHistoryUI(imageId) {
    try {
        await deleteImageFromHistory(imageId);
        await displayImageHistory(); // 履歴を再表示
        showNotification('履歴から削除しました', 'success');

        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    } catch (error) {
        console.error('Failed to delete image from history:', error);
        showNotification('削除に失敗しました', 'error');
    }
}

// 画像履歴を更新
function refreshImageHistory() {
    displayImageHistory();
    showNotification('履歴を更新しました', 'success');

    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}
