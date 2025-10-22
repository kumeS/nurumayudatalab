// ========== 画像管理モジュール ==========
// 画像のアップロード、フィルター適用、削除

let images = []; // 追加された画像のリスト

// フィルター設定（選択中の画像用）
let currentFilters = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0
};

// 画像アップロード処理
function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const canvas = getCanvas();
    if (!canvas) {
        showNotification('キャンバスが初期化されていません', 'error');
        return;
    }

    // 複数ファイルアップロード時のパフォーマンス最適化
    const isMultipleFiles = files.length > 1;
    if (isMultipleFiles) {
        canvas.renderOnAddRemove = false;
    }

    let processedCount = 0;
    const totalFiles = files.length;

    Array.from(files).forEach((file, index) => {
        // ファイルタイプ検証
        if (!file.type.startsWith('image/')) {
            showNotification(`${file.name}は画像ファイルではありません`, 'error');
            return;
        }

        // ファイルサイズ検証（10MB制限）
        if (file.size > 10 * 1024 * 1024) {
            showNotification(`${file.name}は大きすぎます（最大10MB）`, 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = function(event) {
            fabric.Image.fromURL(event.target.result, function(img) {
                // 画像検証
                if (!img || !img.width || !img.height) {
                    showNotification('画像の読み込みに失敗しました', 'error');
                    return;
                }

                // 画像の初期スケール
                // これまで 70% に強制縮小していたため小さく見えていた。
                // キャンバスより大きい場合のみ縮小し、キャンバスより小さい場合は等倍のままにする。
                const fitScale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
                img.scale(fitScale < 1 ? fitScale : 1);
                img.set({
                    left: canvas.width / 2 + (index * 30),
                    top: canvas.height / 2 + (index * 30),
                    originX: 'center',
                    originY: 'center',
                    cornerStyle: 'circle',
                    cornerColor: '#ff9a5a',
                    cornerSize: 16, // スマホ用に大きめ
                    transparentCorners: false,
                    borderColor: '#ff9a5a',
                    centeredRotation: true,
                    objectType: 'uploaded-image'
                });

                // フィルター初期化
                img.filters = [];
                img.customFilters = {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    hue: 0
                };

                images.push(img);
                canvas.add(img);
                canvas.setActiveObject(img);

                // 処理完了カウント
                processedCount++;

                // 全ファイル処理完了時のみレンダリング
                if (processedCount === totalFiles) {
                    if (isMultipleFiles) {
                        canvas.renderOnAddRemove = true;
                    }
                    canvas.renderAll();
                }

                // 画像追加時の触覚フィードバック（対応デバイスのみ）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, {
                crossOrigin: 'anonymous',
                // Fabric.js エラーハンドリング
                onError: function(err) {
                    console.error('Fabric.js image load error:', err);
                    showNotification('画像の読み込みに失敗しました', 'error');

                    // エラー時もカウントして最終レンダリングを保証
                    processedCount++;
                    if (processedCount === totalFiles && isMultipleFiles) {
                        canvas.renderOnAddRemove = true;
                        canvas.renderAll();
                    }
                }
            });
        };

        // FileReader エラーハンドリング
        reader.onerror = function(error) {
            console.error('File read error:', error);
            showNotification(`${file.name}の読み込みに失敗しました`, 'error');

            // エラー時もカウントして最終レンダリングを保証
            processedCount++;
            if (processedCount === totalFiles && isMultipleFiles) {
                canvas.renderOnAddRemove = true;
                canvas.renderAll();
            }
        };

        reader.readAsDataURL(file);
    });

    // ファイル入力をリセット
    e.target.value = '';
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

            canvas.remove(selectedObject);
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
