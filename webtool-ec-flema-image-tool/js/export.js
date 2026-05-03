// ========== エクスポートモジュール ==========
// 画像の保存とエクスポート処理

// エクスポート設定
const EXPORT_PRESETS = {
    'standard': { name: '標準画質 (1x)', multiplier: 1, quality: 0.9 },
    'high': { name: '高画質 (2x)', multiplier: 2, quality: 0.95 },
    '2k': { name: '2K (2560px)', targetWidth: 2560, quality: 0.95 },
    '4k': { name: '4K (3840px)', targetWidth: 3840, quality: 1.0 }
};

const EXPORT_FORMATS = {
    'png': { name: 'PNG（高品質・透明対応）', extension: 'png', mimeType: 'image/png' },
    'jpeg': { name: 'JPEG（小容量）', extension: 'jpg', mimeType: 'image/jpeg' }
};

// エクスポートダイアログを表示
function showExportDialog() {
    const canvas = getCanvas();
    if (!canvas) return;
    
    // オブジェクトがない場合は警告
    const objects = canvas.getObjects();
    if (objects.length === 0) {
        showNotification('エクスポートする画像がありません', 'error');
        return;
    }
    
    // ダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'export-dialog-overlay';

    // DOMPurifyでサニタイズしてXSS対策
    // ADD_ATTR オプションで id 属性を明示的に許可
    dialog.innerHTML = DOMPurify.sanitize(`
        <div class="export-dialog">
            <div class="export-dialog-header">
                <h3><i class="fas fa-download"></i> 画像をエクスポート</h3>
                <button class="btn-close" id="closeExportBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="export-dialog-body">
                <div class="export-preview">
                    <canvas id="exportPreviewCanvas"></canvas>
                    <div class="export-info" id="exportInfo"></div>
                </div>
                <div class="export-options">
                    <h4>フォーマットを選択</h4>
                    <div class="quality-options">
                        <label class="quality-option">
                            <input type="radio" name="format" value="png" checked>
                            <div class="quality-label">
                                <strong>${escapeHtml(EXPORT_FORMATS.png.name)}</strong>
                                <small>透明背景に対応</small>
                            </div>
                        </label>
                        <label class="quality-option">
                            <input type="radio" name="format" value="jpeg">
                            <div class="quality-label">
                                <strong>${escapeHtml(EXPORT_FORMATS.jpeg.name)}</strong>
                                <small>ファイルサイズが小さい</small>
                            </div>
                        </label>
                    </div>
                    <h4 style="margin-top: 20px;">画質を選択</h4>
                    <div class="quality-options">
                        <label class="quality-option">
                            <input type="radio" name="quality" value="standard" checked>
                            <div class="quality-label">
                                <strong>${escapeHtml(EXPORT_PRESETS.standard.name)}</strong>
                                <small>ファイルサイズ: 小</small>
                            </div>
                        </label>
                        <label class="quality-option">
                            <input type="radio" name="quality" value="high">
                            <div class="quality-label">
                                <strong>${escapeHtml(EXPORT_PRESETS.high.name)}</strong>
                                <small>ファイルサイズ: 中</small>
                            </div>
                        </label>
                        <label class="quality-option">
                            <input type="radio" name="quality" value="2k">
                            <div class="quality-label">
                                <strong>${escapeHtml(EXPORT_PRESETS['2k'].name)}</strong>
                                <small>ファイルサイズ: 大</small>
                            </div>
                        </label>
                        <label class="quality-option">
                            <input type="radio" name="quality" value="4k">
                            <div class="quality-label">
                                <strong>${escapeHtml(EXPORT_PRESETS['4k'].name)}</strong>
                                <small>ファイルサイズ: 特大</small>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            <div class="export-dialog-footer">
                <button class="btn-secondary" id="cancelExportBtn">
                    キャンセル
                </button>
                <button class="btn-primary" id="executeExportBtn">
                    <i class="fas fa-download"></i> ダウンロード
                </button>
            </div>
        </div>
    `, { ADD_ATTR: ['id'] });

    document.body.appendChild(dialog);

    // イベントリスナーをアタッチ（DOMPurifyがonclick属性を削除するため、プログラム的に追加）
    const closeBtn = dialog.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeExportDialog);
    }

    const cancelBtn = dialog.querySelector('.btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeExportDialog);
    }

    const executeBtn = dialog.querySelector('.btn-primary');
    if (executeBtn) {
        executeBtn.addEventListener('click', executeExport);
    }

    // プレビューを生成
    updateExportPreview();

    // ラジオボタンのイベントリスナー
    dialog.querySelectorAll('input[name="quality"], input[name="format"]').forEach(radio => {
        radio.addEventListener('change', updateExportPreview);
    });
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// エクスポートダイアログを閉じる
function closeExportDialog() {
    const dialog = document.querySelector('.export-dialog-overlay');
    if (dialog) {
        document.body.removeChild(dialog);
    }
}

// エクスポートプレビューを更新
function updateExportPreview() {
    const canvas = getCanvas();
    const previewCanvas = document.getElementById('exportPreviewCanvas');
    const infoDiv = document.getElementById('exportInfo');
    
    if (!previewCanvas || !canvas) return;
    
    // 選択されている画質を取得
    const selectedQuality = document.querySelector('input[name="quality"]:checked').value;
    const preset = EXPORT_PRESETS[selectedQuality];
    
    // プレビュー用に小さく表示
    const maxPreviewSize = 300;
    const scale = Math.min(maxPreviewSize / canvas.width, maxPreviewSize / canvas.height);
    
    previewCanvas.width = canvas.width * scale;
    previewCanvas.height = canvas.height * scale;
    
    const ctx = previewCanvas.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // 選択を解除して描画
    canvas.discardActiveObject();
    canvas.renderAll();
    
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
    };
    img.src = dataURL;
    
    // 出力サイズを計算
    let outputWidth, outputHeight;
    if (preset.multiplier) {
        outputWidth = Math.round(canvas.width * preset.multiplier);
        outputHeight = Math.round(canvas.height * preset.multiplier);
    } else if (preset.targetWidth) {
        const ratio = preset.targetWidth / canvas.width;
        outputWidth = preset.targetWidth;
        outputHeight = Math.round(canvas.height * ratio);
    }
    
    // 情報を表示 - DOMPurifyでサニタイズしてXSS対策
    infoDiv.innerHTML = DOMPurify.sanitize(`
        <div><strong>出力サイズ:</strong> ${escapeHtml(outputWidth.toString())} × ${escapeHtml(outputHeight.toString())}px</div>
        <div><strong>品質:</strong> ${escapeHtml(Math.round(preset.quality * 100).toString())}%</div>
    `, { ADD_ATTR: ['id'] });
}

// エクスポートを実行
function executeExport() {
    const canvas = getCanvas();
    const selectedQuality = document.querySelector('input[name="quality"]:checked').value;
    const selectedFormat = document.querySelector('input[name="format"]:checked').value;
    const preset = EXPORT_PRESETS[selectedQuality];
    const format = EXPORT_FORMATS[selectedFormat];
    
    // ダイアログを閉じる
    closeExportDialog();
    
    // ローディング表示
    showNotification('画像を生成中...', 'info');
    
    // 選択を解除
    canvas.discardActiveObject();
    canvas.renderAll();
    
    setTimeout(() => {
        let multiplier, quality;
        
        if (preset.multiplier) {
            // 標準・高画質モード
            multiplier = preset.multiplier;
            quality = preset.quality;
        } else if (preset.targetWidth) {
            // 2K/4Kモード
            multiplier = preset.targetWidth / canvas.width;
            quality = preset.quality;
        }
        
        canvas.toBlob(function(blob) {
            if (!blob) {
                showNotification('画像の保存に失敗しました', 'error');
                return;
            }
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `flema-${selectedQuality}-${timestamp}.${format.extension}`;
            saveAs(blob, filename);
            
            showNotification('画像を保存しました', 'success');
            
            // 触覚フィードバック
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        }, {
            format: selectedFormat,
            quality: quality,
            multiplier: multiplier
        });
    }, 100);
}

// 旧関数（互換性のため残す）
function exportImage() {
    showExportDialog();
}

// プレビュー生成（将来の拡張用）
function generatePreview() {
    const canvas = getCanvas();
    canvas.discardActiveObject();
    canvas.renderAll();
    
    return canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 1
    });
}

// キャンバスクリア（新規作成）
function clearCanvas() {
    if (!confirm('キャンバスをクリアしますか？\n（すべての画像とテキストが削除されます）')) {
        return;
    }
    
    const canvas = getCanvas();
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    
    // グローバル変数をリセット
    const images = getImages();
    images.length = 0;
    
    hideTextControls();
    hideImageControls();
    
    // 触覚フィードバック
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50, 50, 50]);
    }
}
