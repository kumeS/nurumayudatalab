class AmazonDashboard {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager(this.dataManager, this);
        this.chartManager = new ChartManager(this.dataManager, this.uiManager);

        this.currentPeriod = null;
        this.currentSubPeriod = 'all';

        // グローバルなドラッグ＆ドロップ防止を最初に設定
        // これにより、データの読み込みを待たずにブラウザのデフォルト挙動を抑止できる
        this.setupGlobalDragDropPrevention();

        this.init();
    }

    async init() {
        await this.dataManager.initIndexedDB();

        // IndexedDB初期化完了後にファイル処理リスナーを設定
        // IMPORTANT: これによりhandleFiles→saveDataToDBが呼ばれた際に
        // this.dataManager.dbがnullにならないことを保証
        this.setupFileAndUIHandlers();

        this.dataManager.loadProductSettings();
        const hasData = await this.dataManager.loadDataFromDB();

        this.currentPeriod = localStorage.getItem('amazon_dashboard_current_period');
        this.currentSubPeriod = localStorage.getItem('amazon_dashboard_current_sub_period') || 'all';
        const savedTab = localStorage.getItem('amazon_dashboard_active_tab') || 'daily';

        if (hasData) {
            this.updateDashboard();
            this.uiManager.displayLoadedFiles();
            document.getElementById('dashboard').classList.add('active');
            this.switchTab(savedTab);
        }
    }

    setupGlobalDragDropPrevention() {
        const uploadZone = document.getElementById('uploadZone');

        // ---------------------------------------------------------
        // Window/Document全体でのドラッグ＆ドロップ無効化 (Global Prevention)
        // ---------------------------------------------------------
        // ブラウザのデフォルト動作（ファイルを開く/ダウンロード）を阻止
        // IMPORTANT: keep these listeners in the bubbling phase. Moving them
        // to capture=true will re-enable the browser's native file open/download
        // behavior (see bug_report.txt) even if preventDefault is called.
        const preventGlobal = (e) => {
            e.preventDefault();
            const isInsideUploadZone = uploadZone && (e.target === uploadZone || uploadZone.contains(e.target));

            if (!isInsideUploadZone) {
                e.stopPropagation();
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'none';
                }
            }
        };

        // windowとdocumentの両方に設定
        const globalDragOptions = { capture: false, passive: false };
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            window.addEventListener(eventName, preventGlobal, globalDragOptions);
            document.addEventListener(eventName, preventGlobal, globalDragOptions);
        });
    }

    setupFileAndUIHandlers() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        // ---------------------------------------------------------
        // UploadZoneでのドラッグ＆ドロップ有効化とファイル処理 (Local Handling)
        // ---------------------------------------------------------
        // IMPORTANT: このメソッドはIndexedDB初期化後に呼ばれるため、
        // handleFiles→saveDataToDBが安全に実行できる
        uploadZone.addEventListener('click', () => fileInput.click());

        uploadZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation(); // バブリングを止めてGlobalに行かせない
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation(); // バブリングを止めてGlobalに行かせない
            e.dataTransfer.dropEffect = 'copy'; // ドロップ可能（コピー）
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation(); // バブリングを止めてGlobalに行かせない

            // relatedTargetがuploadZoneの内部にある場合はクラスを削除しない
            if (e.relatedTarget && uploadZone.contains(e.relatedTarget)) {
                return;
            }
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // バブリングを止めてGlobalに行かせない

            uploadZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.handleFiles(files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            // ファイル選択後にinputをリセット（同じファイルを再度選択できるように）
            fileInput.value = '';
        });

        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        const dailyTableHeaders = document.querySelectorAll('#dailyTable th');
        dailyTableHeaders.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.addEventListener('click', () => {
                this.uiManager.sortDailyTableByColumn(index);
            });
        });
    }

    async handleFiles(files) {
        // CRITICAL: IndexedDB初期化完了を待つ
        // this.dataManager.dbがnullの状態でsaveDataToDBを呼ばないようにする
        if (!this.dataManager.db) {
            console.log('IndexedDB初期化を待機中...');
            // DB初期化が完了するまで最大10秒待機
            let waitCount = 0;
            while (!this.dataManager.db && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }

            if (!this.dataManager.db) {
                alert('データベースの初期化に失敗しました。ページをリロードしてください。');
                return;
            }
        }

        const csvFiles = Array.from(files).filter(file =>
            file.type === 'text/csv' || file.name.endsWith('.csv')
        );

        if (csvFiles.length === 0) {
            alert('CSVファイルを選択してください。');
            return;
        }

        document.getElementById('loading').classList.add('active');

        for (const file of csvFiles) {
            await this.processFileWithDuplicateCheck(file);
        }

        this.dataManager.rebuildAllData();
        this.updateDashboard();
        this.uiManager.displayLoadedFiles();

        document.getElementById('loading').classList.remove('active');
        document.getElementById('dashboard').classList.add('active');
    }

    async processFileWithDuplicateCheck(file) {
        const { rows, type } = await this.dataManager.parseCSVToArray(file);
        if (!rows || rows.length === 0) return;

        const sourceType = type || this.dataManager.inferSourceType(rows);

        if (this.dataManager.loadedFiles.has(file.name)) {
            const shouldReplace = await this.uiManager.showDuplicateConfirmation(file.name);
            if (!shouldReplace) {
                console.log(`${file.name}の読み込みをキャンセルしました`);
                return;
            }
        }

        this.dataManager.loadedFiles.set(file.name, {
            data: rows,
            fileName: file.name,
            fileSize: file.size,
            timestamp: new Date().toISOString(),
            sourceType
        });

        // CRITICAL: saveDataToDB呼び出し前にDB初期化を確認
        // 通常はhandleFiles()で既にチェック済みだが、念のため二重チェック
        if (!this.dataManager.db) {
            console.error('DB未初期化エラー: saveDataToDBをスキップします');
            return;
        }

        await this.dataManager.saveDataToDB(file.name, rows, file.size, sourceType);
        console.log(`${file.name}を読み込みました (${rows.length}件)`);
    }

    updateDashboard() {
        // Check if currentPeriod is valid
        if (this.currentPeriod && this.currentPeriod !== 'all' && !this.dataManager.periods.has(this.currentPeriod)) {
            this.currentPeriod = null;
        }

        // If currentPeriod is null but we have periods, set to latest
        if (!this.currentPeriod && this.dataManager.periods.size > 0) {
            const periodEntries = Array.from(this.dataManager.periods.keys()).sort((a, b) => {
                const parseDate = (period) => {
                    const match = period.match(/(\d+)年(\d+)月/);
                    if (!match) return 0;
                    return parseInt(match[1]) * 100 + parseInt(match[2]);
                };
                return parseDate(a) - parseDate(b);
            });
            this.currentPeriod = periodEntries[periodEntries.length - 1];
            localStorage.setItem('amazon_dashboard_current_period', this.currentPeriod);
        }

        this.uiManager.updateUI(this.currentPeriod, this.currentSubPeriod);
        this.chartManager.updateCharts(this.currentPeriod, this.currentSubPeriod);
    }

    switchPeriod(period) {
        this.currentPeriod = period;
        this.currentSubPeriod = 'all';
        localStorage.setItem('amazon_dashboard_current_period', period);
        localStorage.setItem('amazon_dashboard_current_sub_period', 'all');
        this.updateDashboard();
    }

    switchSubPeriod(subPeriod) {
        this.currentSubPeriod = subPeriod;
        localStorage.setItem('amazon_dashboard_current_sub_period', subPeriod);
        this.updateDashboard();
    }

    switchTab(tab) {
        this.uiManager.switchTab(tab);
    }

    async removeFile(fileName) {
        if (confirm(`ファイル「${fileName}」を削除しますか？`)) {
            this.dataManager.loadedFiles.delete(fileName);
            await this.dataManager.removeFileFromDB(fileName);

            if (this.dataManager.loadedFiles.size > 0) {
                this.dataManager.rebuildAllData();
                this.updateDashboard();
                this.uiManager.displayLoadedFiles();
            } else {
                this.dataManager.data = [];
                this.dataManager.processedData = {};
                this.dataManager.periods.clear();
                
                if (this.chartManager.charts.sales) {
                    this.chartManager.charts.sales.destroy();
                    this.chartManager.charts.sales = null;
                }
                if (this.chartManager.charts.profit) {
                    this.chartManager.charts.profit.destroy();
                    this.chartManager.charts.profit = null;
                }

                document.getElementById('dashboard').classList.remove('active');
                document.getElementById('fileList').classList.remove('active');
                document.getElementById('fileList').innerHTML = '';
                
                this.uiManager.resetUI();
            }
        }
    }

    exportTableToCSV(tableType) {
        const data = this.dataManager.getCurrentData(this.currentPeriod, this.currentSubPeriod);
        let csvContent = '';
        let filename = '';
        
        const period = this.currentPeriod === 'all' ? '全期間' : this.currentPeriod;
        
        switch(tableType) {
            case 'daily':
                csvContent = this.dataManager.generateDailyCSV(data);
                filename = `日次集計_${period}.csv`;
                break;
            case 'transaction':
                csvContent = this.dataManager.generateTransactionCSV(data);
                filename = `取引種別_${period}.csv`;
                break;
            case 'product':
                csvContent = this.dataManager.generateProductCSV(data);
                filename = `商品別_${period}.csv`;
                break;
            case 'product-net-profit':
                csvContent = this.dataManager.generateProductNetProfitCSV(data);
                filename = `商品別純利益_${period}.csv`;
                break;
            case 'productfee':
                csvContent = this.dataManager.generateProductFeeCSV(data);
                filename = `商品ごとの手数料_${period}.csv`;
                break;
            case 'fba':
                csvContent = this.dataManager.generateFbaCSV(data);
                filename = `その他手数料_${period}.csv`;
                break;
            case 'multichannel':
                csvContent = this.dataManager.generateMultiChannelCSV(data);
                filename = `マルチチャネル_${period}.csv`;
                break;
            case 'inventory-forecast':
                const forecastData = this.dataManager.generateInventoryForecastData();
                csvContent = this.dataManager.generateInventoryForecastCSV(forecastData);
                filename = `仕入予測_${period}.csv`;
                break;
        }
        
        this.downloadCSV(csvContent, filename);
    }

    exportProductSettingsCSV() {
        let csv = '商品名,商品フルネーム,親ASIN,原価,諸費用\n';
        
        let sourceData = this.dataManager.processedData;
        if (!sourceData || !sourceData.productData || Object.keys(sourceData.productData).length === 0) {
            if (this.dataManager.data && this.dataManager.data.length > 0) {
                sourceData = this.dataManager.aggregateData(this.dataManager.data);
            } else {
                sourceData = { productData: {} };
            }
        }

        const excludeList = [
            'FBA保管手数料：',
            'クーポンパフォーマンスに基づく料金',
            'クーポン参加料金',
            '広告費用',
            '月額登録料：',
            '納品時の輸送手数料',
            '請求',
            'FBA在庫の返金',
            'FBA在庫の返送手数料'
        ];

        const allProducts = new Set([
            ...Object.keys(sourceData.productData || {}),
            ...Object.keys(this.dataManager.productSettings)
        ]);

        const products = Array.from(allProducts)
            .filter(product => !excludeList.includes(product))
            .sort();

        products.forEach(product => {
            const setting = this.dataManager.productSettings[product] || { parentAsin: '', costPrice: '', expense: '', fullName: '' };
            const escapedName = product.replace(/"/g, '""');
            const escapedFullName = (setting.fullName || '').replace(/"/g, '""');
            csv += `"${escapedName}","${escapedFullName}",${setting.parentAsin || ''},${setting.costPrice || ''},${setting.expense || ''}\n`;
        });

        this.downloadCSV(csv, '商品別設定_テンプレート.csv');
    }

    downloadCSV(csvContent, filename) {
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    openProductSettingsModal() {
        this.uiManager.openProductSettingsModal();
    }

    closeProductSettingsModal() {
        this.uiManager.closeProductSettingsModal();
    }

    saveProductSettings() {
        const inputs = document.querySelectorAll('#productSettingsTable input');
        const newSettings = { ...this.dataManager.productSettings };

        inputs.forEach(input => {
            const product = input.dataset.product;
            const field = input.dataset.field;
            
            if (!newSettings[product]) {
                newSettings[product] = {};
            }
            
            newSettings[product][field] = input.value;
        });

        this.dataManager.saveProductSettings(newSettings);
        
        this.uiManager.closeProductSettingsModal();
        this.uiManager.updateTables(this.currentPeriod, this.currentSubPeriod);
        alert('設定を保存しました');
    }

    importProductSettingsCSV(file) {
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                let count = 0;
                const newSettings = { ...this.dataManager.productSettings };

                results.data.forEach(row => {
                    const productName = row['商品名'];
                    if (productName) {
                        if (!newSettings[productName]) {
                            newSettings[productName] = {};
                        }
                        if (row['親ASIN'] !== undefined) newSettings[productName].parentAsin = row['親ASIN'];
                        if (row['原価'] !== undefined) newSettings[productName].costPrice = row['原価'];
                        if (row['諸費用'] !== undefined) newSettings[productName].expense = row['諸費用'];
                        if (row['商品フルネーム'] !== undefined) newSettings[productName].fullName = row['商品フルネーム'];
                        count++;
                    }
                });

                this.dataManager.saveProductSettings(newSettings);
                
                if (document.getElementById('productSettingsModal').classList.contains('active')) {
                    this.uiManager.openProductSettingsModal();
                }
                
                this.uiManager.updateProductNetProfitTable(this.dataManager.getCurrentData(this.currentPeriod, this.currentSubPeriod));
                alert(`${count}件の商品設定を読み込みました。`);
                
                document.getElementById('settingsFileInput').value = '';
            },
            error: (error) => {
                console.error('CSV解析エラー:', error);
                alert('CSVファイルの読み込みに失敗しました。');
            }
        });
    }

    toggleUsageInfo(btn) {
        this.uiManager.toggleUsageInfo(btn);
    }

    toggleFileList(btn) {
        this.uiManager.toggleFileList(btn);
    }

    showExpenseInfo(event) {
        this.uiManager.showExpenseInfo(event);
    }
}

// DOMContentLoadedを待ってから初期化し、グローバル変数に代入
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new AmazonDashboard();
    // HTML内のonclick属性からアクセスできるようにwindowオブジェクトに登録
    window.dashboard = dashboard;
});
