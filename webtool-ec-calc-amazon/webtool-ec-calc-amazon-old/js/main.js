class AmazonDashboard {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager(this.dataManager, this);
        this.chartManager = new ChartManager(this.dataManager, this.uiManager);
        
        this.currentPeriod = null;
        this.currentSubPeriod = 'all';
        
        this.init();
    }

    async init() {
        await this.dataManager.initIndexedDB();
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
        
        this.setupEventListeners();
        this.setupScrollPositionRestore();
    }

    setupScrollPositionRestore() {
        // ページ離脱前にスクロール位置を保存
        window.addEventListener('beforeunload', () => {
            sessionStorage.setItem('amazon_dashboard_scroll_y', window.scrollY.toString());
        });

        // スクロール位置を復元（DOMContentLoadedまたはloadイベント後）
        const savedScrollY = sessionStorage.getItem('amazon_dashboard_scroll_y');
        if (savedScrollY !== null) {
            // 少し遅延させて確実にコンテンツがレンダリングされた後にスクロール
            requestAnimationFrame(() => {
                window.scrollTo(0, parseInt(savedScrollY, 10));
            });
        }
    }

    setupEventListeners() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        window.addEventListener('dragover', (e) => e.preventDefault(), false);
        window.addEventListener('drop', (e) => e.preventDefault(), false);

        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploadZone.contains(e.relatedTarget)) {
                uploadZone.classList.remove('drag-over');
            }
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
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
        const tempData = await this.dataManager.parseCSVToArray(file);
        if (tempData.length === 0) return;

        if (this.dataManager.loadedFiles.has(file.name)) {
            const shouldReplace = await this.uiManager.showDuplicateConfirmation(file.name);
            if (!shouldReplace) {
                console.log(`${file.name}の読み込みをキャンセルしました`);
                return;
            }
        }

        this.dataManager.loadedFiles.set(file.name, {
            data: tempData,
            fileName: file.name,
            fileSize: file.size,
            timestamp: new Date().toISOString()
        });

        await this.dataManager.saveDataToDB(file.name, tempData, file.size);
        console.log(`${file.name}を読み込みました (${tempData.length}件)`);
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

const dashboard = new AmazonDashboard();
