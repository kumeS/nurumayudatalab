import { initIndexedDB, loadDataFromIndexedDB, checkDuplicateFile, saveFileToIndexedDB } from './db.js';
import { amazonData, setAmazonData, uploadedFiles, setUploadedFiles, parseCSVFile, clearData } from './data.js';
import { updateDashboard, updateFileList, updateHistoryList, showNotification, updateView, closeModal, exportData } from './ui.js';
import { inferWeekFromDate, generateFileHash } from './utils.js';

// ---------------------------------------------------------
// Window/Document全体でのドラッグ＆ドロップ無効化 (Global Prevention)
// ---------------------------------------------------------
// ブラウザのデフォルト動作（ファイルを開く/ダウンロード）を阻止。
// IMPORTANT: 参照元プロジェクト同様、バブリングフェーズ(capture:false)で維持する。
function setupGlobalDragDropPrevention() {
    const globalDragOptions = { capture: false, passive: false };

    const preventGlobal = (e) => {
        e.preventDefault();

        const uploadArea = document.getElementById('uploadArea');
        const isInsideUploadArea = uploadArea && (e.target === uploadArea || uploadArea.contains(e.target));

        // アップロードエリア外へのドロップ/ドラッグはブラウザ既定動作を確実に止める
        if (!isInsideUploadArea) {
            e.stopPropagation();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'none';
            }
        }
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        window.addEventListener(eventName, preventGlobal, globalDragOptions);
        document.addEventListener(eventName, preventGlobal, globalDragOptions);
    });
}

// モジュールが読み込まれた時点で設定（index.htmlでscriptがbody末尾のため要素は存在する想定）
setupGlobalDragDropPrevention();

console.log('========================================');
console.log('main.js モジュール読み込み開始');
console.log('現在時刻:', new Date().toISOString());
console.log('document.readyState:', document.readyState);
console.log('========================================');

let dbInitialized = false;

async function init() {
    console.log('Initializing application...');
    console.log('Document ready state:', document.readyState);
    
    try {
        // DB初期化にタイムアウトを設定 (3秒)
        const dbInitPromise = initIndexedDB();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DB Init Timeout')), 3000)
        );
        
        await Promise.race([dbInitPromise, timeoutPromise]);

        dbInitialized = true; // DB初期化完了フラグ
        console.log('Database initialized');
        
        await restoreDataFromIndexedDB();
        
        setupDragAndDrop(); // DB初期化後に安全にセットアップ
        setupEventListeners();
        
        updateFileList();
        updateHistoryList();
        
        if (amazonData.length > 0) {
            updateDashboard();
            showNotification(`保存されたデータを復元しました（${amazonData.length}件）`, 'info');
        } else {
            showNotification('CSVファイルをアップロードして分析を開始してください', 'info');
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('データベースの初期化に失敗しました（またはタイムアウト）', 'error');
        dbInitialized = true; // エラー時も処理を進める
        setupDragAndDrop();
        setupEventListeners();
    }
    
    console.log('Initialization complete');
}

async function restoreDataFromIndexedDB() {
    try {
        const savedData = await loadDataFromIndexedDB();
        if (savedData && savedData.length > 0) {
            setAmazonData(savedData);
            
            const fileGroups = _.groupBy(savedData, 'fileName');
            const filesMap = new Map();
            Object.keys(fileGroups).forEach(fileName => {
                const firstItem = fileGroups[fileName][0];
                filesMap.set(fileName, firstItem.weekDate);
            });
            setUploadedFiles(filesMap);
            
            console.log(`Data restored: ${savedData.length} items`);
        }
    } catch (error) {
        console.error('Data restoration error:', error);
        throw error;
    }
}

function setupEventListeners() {
    console.log('========================================');
    console.log('setupEventListeners() 開始');
    console.log('========================================');
    
    // Filter buttons with retry mechanism
    const setupFilterButtons = () => {
        console.log('setupFilterButtons() 実行');
        const filterButtons = document.querySelectorAll('.filter-btn');
        console.log(`検出されたフィルターボタン数: ${filterButtons.length}`);
        
        if (filterButtons.length === 0) {
            console.warn('⚠️ フィルターボタンが見つかりません。100ms後に再試行します...');
            setTimeout(setupFilterButtons, 100);
            return;
        }
        
        filterButtons.forEach((btn, index) => {
            const view = btn.dataset.view;
            const text = btn.textContent.trim();
            console.log(`ボタン[${index}]: view="${view}", text="${text}"`);
            
            // 既存のリスナーを削除（重複防止）
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                console.log('========================================');
                console.log('✅ フィルターボタンがクリックされました！');
                console.log('  view:', view);
                console.log('  text:', text);
                console.log('  event:', e);
                console.log('========================================');
                
                e.preventDefault();
                e.stopPropagation();
                
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                newBtn.classList.add('active');
                
                console.log('updateView() を呼び出します:', view);
                try {
                    updateView(view);
                    console.log('updateView() 呼び出し成功');
                } catch (error) {
                    console.error('updateView() でエラー発生:', error);
                }
            });
            
            console.log(`  → イベントリスナー登録完了`);
        });
        
        console.log('========================================');
        console.log('✅ すべてのフィルターボタンのセットアップ完了');
        console.log('========================================');
    };
    
    setupFilterButtons();
    
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') {
            closeModal();
        }
    });

    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        closeModal();
    });

    document.getElementById('clearDataBtn').addEventListener('click', async () => {
        if (confirm('すべてのデータを削除してもよろしいですか？')) {
            const { clearAllData } = await import('./db.js');
            await clearAllData();
            clearData();
            updateFileList();
            updateDashboard();
            updateHistoryList();
            showNotification('すべてのデータをクリアしました', 'info');
        }
    });

    document.getElementById('historyBtn').addEventListener('click', () => {
        const historySection = document.getElementById('historySection');
        if (historySection.style.display === 'none' || !historySection.style.display) {
            historySection.style.display = 'block';
            updateHistoryList();
        } else {
            historySection.style.display = 'none';
        }
    });

    // Auxiliary File Upload
    const auxFileInput = document.getElementById('auxFileInput');
    if (auxFileInput) {
        auxFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const content = await file.text();
                const parsed = Papa.parse(content, {
                    header: true,
                    skipEmptyLines: true
                });
                
                const auxData = new Map();
                parsed.data.forEach(row => {
                    const asin = row['parentAsin'] || row['ASIN'] || row['asin'];
                    const listingDate = row['listingDate'] || row['releaseDate'] || row['date'];
                    const category = row['category'] || row['Category'];
                    
                    if (asin) {
                        auxData.set(asin, {
                            listingDate: listingDate,
                            category: category
                        });
                    }
                });
                
                const { setAuxiliaryData } = await import('./data.js');
                setAuxiliaryData(auxData);
                
                showNotification(`補助マスタを読み込みました (${auxData.size}件)`, 'success');
                
                if (amazonData.length > 0) {
                    updateDashboard();
                }
            } catch (error) {
                console.error('Auxiliary file error:', error);
                showNotification('補助マスタの読み込みに失敗しました', 'error');
            }
            auxFileInput.value = '';
        });
    }

    // Classification filters
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            updateView('classification');
        });
    });

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (amazonData && amazonData.length > 0) {
                exportData(amazonData);
            } else {
                showNotification('エクスポートするデータがありません', 'warning');
            }
        });
    }
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) {
        console.error('Upload area or file input not found');
        return;
    }
    
    // UploadAreaでのドラッグ＆ドロップ有効化とファイル処理 (Local Handling)
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation(); // バブリングを止めてGlobalに行かせない
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation(); // バブリングを止めてGlobalに行かせない
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation(); // バブリングを止めてGlobalに行かせない

        // relatedTargetがuploadAreaの内部にある場合はクラスを削除しない
        if (e.relatedTarget && uploadArea.contains(e.relatedTarget)) {
            return;
        }
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // バブリングを止めてGlobalに行かせない

        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
        if (files.length > 0) {
            await handleFiles(files);
        }
    });

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        await handleFiles(files);
        fileInput.value = '';
    });
}

async function handleFiles(files) {
    // DB初期化完了を待機（最大10秒）
    if (!dbInitialized) {
        console.log('Waiting for database initialization...');
        let waitCount = 0;
        while (!dbInitialized && waitCount < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        if (!dbInitialized) {
            showNotification('データベースの初期化を待機中です。しばらくお待ちください。', 'warning');
            return;
        }
    }
    
    const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length === 0) {
        showNotification('CSVファイルを選択してください', 'error');
        return;
    }
    
    csvFiles.sort((a, b) => {
        const infoA = inferWeekFromDate(a.name);
        const infoB = inferWeekFromDate(b.name);
        if (infoA && infoB) return infoA.date - infoB.date;
        return 0;
    });
    
    let successCount = 0;
    let duplicateCount = 0;
    
    for (const file of csvFiles) {
        try {
            const fileHash = await generateFileHash(file);
            
            const isDuplicate = await checkDuplicateFile(fileHash);
            if (isDuplicate || uploadedFiles.has(file.name)) {
                duplicateCount++;
                showNotification(`${file.name} は既にアップロード済みです`, 'warning');
                continue;
            }
            
            const weekInfo = inferWeekFromDate(file.name);
            if (!weekInfo) {
                showNotification(`${file.name} の日付を解析できませんでした`, 'error');
                continue;
            }
            
            const data = await parseCSVFile(file, weekInfo);
            
            if (data.length > 0) {
                await saveFileToIndexedDB(file, weekInfo.date, fileHash, data);
                
                amazonData.push(...data);
                uploadedFiles.set(file.name, weekInfo.date);
                successCount++;
                
                showNotification(`${file.name} をアップロードしました`, 'success');
            } else {
                showNotification(`${file.name} に有効なデータが見つかりませんでした`, 'warning');
            }
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            showNotification(`${file.name} の処理中にエラーが発生しました`, 'error');
        }
    }
    
    if (successCount > 0) {
        updateFileList();
        updateDashboard();
    }
}

// グローバル関数の公開（HTMLから呼び出せるように）
window.filterClassification = function(category) {
    console.log('Filter classification:', category);
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    updateView('classification');
};

window.runEffectAnalysis = function() {
    console.log('Running effect analysis');
    updateView('effect');
};

// 初期化の確実な実行
console.log('========================================');
console.log('初期化処理の準備');
console.log('document.readyState:', document.readyState);
console.log('========================================');

function startInit() {
    console.log('========================================');
    console.log('startInit() 実行');
    console.log('========================================');
    
    // requestAnimationFrameを使ってDOMが確実に準備されるようにする
    requestAnimationFrame(() => {
        console.log('requestAnimationFrame 1回目');
        requestAnimationFrame(() => {
            console.log('requestAnimationFrame 2回目 - init()を呼び出します');
            init().catch(err => {
                console.error('❌ init()でエラー発生:', err);
                console.error('スタックトレース:', err.stack);
            });
        });
    });
}

if (document.readyState === 'loading') {
    console.log('📋 DOMはまだ読み込み中です。DOMContentLoadedイベントを待機します...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOMContentLoaded イベント発火！');
        startInit();
    });
} else {
    console.log('✅ DOMは既に読み込まれています。即座に初期化を開始します。');
    startInit();
}
