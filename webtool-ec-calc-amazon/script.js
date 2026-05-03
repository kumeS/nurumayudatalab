class AmazonDashboard {
    constructor() {
        this.data = [];
        this.processedData = {};
        this.charts = {};
        this.currentPeriod = null; // 初期化時は未設定、データ読み込み後に最新月を設定
        this.periods = new Map();
        this.monthlyDataFiles = new Map(); // 月ごとのファイルデータ管理
        this.orderTypeMap = new Map(); // 注文番号とタイプのマッピング
        this.dbName = 'AmazonDashboardDB';
        this.dbVersion = 1;
        this.sortState = {
            column: 'date',
            direction: 'asc' // デフォルトは昇順（過去から現在）
        };
        this.init();
    }

    async init() {
        await this.initIndexedDB();
        await this.loadDataFromDB();
        this.setupEventListeners();
    }

    // IndexedDBの初期化
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('monthlyData')) {
                    const store = db.createObjectStore('monthlyData', { keyPath: 'month' });
                    store.createIndex('month', 'month', { unique: true });
                }
            };
        });
    }

    // データベースからデータを読み込み
    async loadDataFromDB() {
        try {
            const transaction = this.db.transaction(['monthlyData'], 'readonly');
            const store = transaction.objectStore('monthlyData');
            const request = store.getAll();
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const savedData = request.result;
                    savedData.forEach(monthData => {
                        this.monthlyDataFiles.set(monthData.month, {
                            data: monthData.data,
                            fileName: monthData.fileName,
                            fileSize: monthData.fileSize
                        });
                    });
                    
                    if (savedData.length > 0) {
                        this.rebuildAllData();
                        this.updateDashboard();
                        this.displayLoadedFiles();
                        const dashboardEl = document.getElementById('dashboard');
                        if (dashboardEl) {
                            dashboardEl.classList.add('active');
                        }
                    } else {
                        // 保存データが無い場合はUIを初期化
                        const fileList = document.getElementById('fileList');
                        if (fileList) {
                            fileList.classList.remove('active');
                            fileList.innerHTML = '';
                        }
                        const dashboardEl = document.getElementById('dashboard');
                        if (dashboardEl) dashboardEl.classList.remove('active');
                    }
                    resolve();
                };
            });
        } catch (error) {
            console.log('IndexedDBからのデータ読み込みに失敗:', error);
        }
    }

    // データベースにデータを保存
    async saveDataToDB(month, data, fileName, fileSize) {
        try {
            const transaction = this.db.transaction(['monthlyData'], 'readwrite');
            const store = transaction.objectStore('monthlyData');
            
            const monthData = {
                month: month,
                data: data,
                fileName: fileName,
                fileSize: fileSize,
                timestamp: new Date().toISOString()
            };
            
            await store.put(monthData);
            console.log(`${month}のデータを保存しました`);
        } catch (error) {
            console.error('データベースへの保存に失敗:', error);
        }
    }

    // 全データを再構築
    rebuildAllData() {
        console.log('データ再構築開始 - monthlyDataFiles:', this.monthlyDataFiles.size);
        
        // データと期間情報を完全にクリア
        this.data = [];
        this.processedData = {};
        this.periods.clear();
        this.orderTypeMap = new Map();
        
        // 月別データからデータを統合
        this.monthlyDataFiles.forEach((monthData, month) => {
            console.log(`${month}のデータを統合中: ${monthData.data.length}件`);
            this.data.push(...monthData.data);
        });
        
        console.log(`統合完了 - 総データ数: ${this.data.length}件`);
        this.processData();
    }

    setupEventListeners() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });



        // Daily table sort functionality
        this.setupTableSortListeners();
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

        this.rebuildAllData();
        this.updateDashboard();
        this.displayLoadedFiles();

        document.getElementById('loading').classList.remove('active');
        document.getElementById('dashboard').classList.add('active');
    }

    async processFileWithDuplicateCheck(file) {
        const tempData = await this.parseCSVToArray(file);
        if (tempData.length === 0) return;

        // 月情報を抽出
        const month = this.extractMonthFromData(tempData);
        
        // 重複チェック
        if (this.monthlyDataFiles.has(month)) {
            const shouldReplace = await this.showDuplicateConfirmation(month, file.name);
            if (!shouldReplace) {
                console.log(`${month}のデータ追加をキャンセルしました`);
                return;
            }
        }

        // データを保存
        this.monthlyDataFiles.set(month, {
            data: tempData,
            fileName: file.name,
            fileSize: file.size
        });

        // IndexedDBに保存
        await this.saveDataToDB(month, tempData, file.name, file.size);
        
        console.log(`${month}のデータを追加/更新しました (${tempData.length}件)`);
    }

    // CSVを配列として解析
    async parseCSVToArray(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    const data = results.data.filter(row => {
                        return row['日付'] && row['トランザクションの種類'];
                    });
                    resolve(data);
                },
                error: (error) => {
                    console.error('CSV解析エラー:', error);
                    resolve([]);
                }
            });
        });
    }

    // データから月情報を抽出
    extractMonthFromData(data) {
        if (data.length === 0) return null;
        
        const firstDate = data[0]['日付'];
        if (!firstDate) return null;
        
        const dateObj = new Date(firstDate);
        return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月`;
    }

    // 重複確認ダイアログ
    async showDuplicateConfirmation(month, fileName) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;

            dialog.innerHTML = `
                <h3 style="margin-bottom: 20px; color: var(--text-primary);">⚠️ データ重複の確認</h3>
                <p style="margin-bottom: 20px; color: var(--text-secondary); line-height: 1.5;">
                    <strong>${month}</strong> のデータが既に存在します。<br>
                    新しいファイル「<strong>${fileName}</strong>」で置き換えますか？
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="confirmReplace" class="btn-primary">置き換える</button>
                    <button id="cancelReplace" style="padding: 0.6rem 1.2rem; border: 2px solid var(--text-secondary); background: white; color: var(--text-secondary); border-radius: 8px; cursor: pointer;">キャンセル</button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            document.getElementById('confirmReplace').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            document.getElementById('cancelReplace').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
        });
    }

    // 読み込み済みファイル一覧を表示
    displayLoadedFiles() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div style="font-weight: 600; margin-bottom: 10px; color: #333;">📊 読み込み済みデータ</div>';
        fileList.classList.add('active');

        this.monthlyDataFiles.forEach((monthData, month) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileSize = (monthData.fileSize / 1024).toFixed(1) + ' KB';
            
            fileItem.innerHTML = `
                <div class="file-item-name">
                    📄 ${monthData.fileName}
                </div>
                <div class="file-item-info">
                    <span>${month}</span>
                    <span>${fileSize}</span>
                    <span>${monthData.data.length}件</span>
                    <div class="file-item-buttons">
                        <button onclick="dashboard.reloadSingleMonth('${month}')" style="background: var(--primary); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 5px;">読み込み</button>
                        <button onclick="dashboard.removeMonth('${month}')" style="background: var(--danger-color); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">削除</button>
                    </div>
                </div>
            `;
            
            fileList.appendChild(fileItem);
        });


    }







    // 単一月データの再読み込み
    async reloadSingleMonth(month) {
        try {
            console.log(`${month}のデータを再読み込み中...`);
            
            // IndexedDBから該当月のデータを取得
            const transaction = this.db.transaction(['monthlyData'], 'readonly');
            const store = transaction.objectStore('monthlyData');
            const request = store.get(month);
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const monthData = request.result;
                    if (monthData) {
                        // データを更新
                        this.monthlyDataFiles.set(month, {
                            data: monthData.data,
                            fileName: monthData.fileName,
                            fileSize: monthData.fileSize
                        });
                        
                        // 全データを再構築
                        this.rebuildAllData();
                        this.updateDashboard();
                        this.displayLoadedFiles();
                        
                        // ダッシュボードを表示
                        document.getElementById('dashboard').classList.add('active');
                        
                        console.log(`${month}のデータを再読み込みしました`);
                        
                        // 成功メッセージを表示
                        this.showTemporaryMessage(`${month}のデータを再読み込みしました`, 'success');
                    } else {
                        console.error(`${month}のデータが見つかりません`);
                        this.showTemporaryMessage(`${month}のデータが見つかりません`, 'error');
                    }
                    resolve();
                };
                
                request.onerror = () => {
                    console.error(`${month}のデータ読み込みエラー:`, request.error);
                    this.showTemporaryMessage(`${month}の読み込みに失敗しました`, 'error');
                    resolve();
                };
            });
        } catch (error) {
            console.error('単一月データ再読み込みエラー:', error);
            this.showTemporaryMessage('データの読み込みに失敗しました', 'error');
        }
    }

    // 一時メッセージを表示
    showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 2000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        // タイプに応じて色を設定
        if (type === 'success') {
            messageDiv.style.background = 'linear-gradient(135deg, var(--success-color), #27ae60)';
        } else if (type === 'error') {
            messageDiv.style.background = 'linear-gradient(135deg, var(--danger-color), #e74c3c)';
        } else {
            messageDiv.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
        }
        
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        // アニメーションで表示
        setTimeout(() => {
            messageDiv.style.transform = 'translateX(0)';
        }, 100);
        
        // 3秒後に非表示
        setTimeout(() => {
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // 月データを削除
    async removeMonth(month) {
        if (confirm(`${month}のデータを削除しますか？`)) {
            this.monthlyDataFiles.delete(month);
            
            // IndexedDBからも削除
            try {
                const transaction = this.db.transaction(['monthlyData'], 'readwrite');
                const store = transaction.objectStore('monthlyData');
                await store.delete(month);
                console.log(`${month}のデータを削除しました`);
            } catch (error) {
                console.error('データベースからの削除に失敗:', error);
            }

            if (this.monthlyDataFiles.size > 0) {
                this.rebuildAllData();
                this.updateDashboard();
                this.displayLoadedFiles();
            } else {
                // 全てのデータが削除された場合
                // 表示データをクリア
                this.data = [];
                this.processedData = {};
                this.periods.clear();
                
                // チャートを破棄
                if (this.charts.sales) {
                    this.charts.sales.destroy();
                    this.charts.sales = null;
                }
                if (this.charts.profit) {
                    this.charts.profit.destroy();
                    this.charts.profit = null;
                }

                // UI要素をリセット
                document.getElementById('dashboard').classList.remove('active');
                document.getElementById('fileList').classList.remove('active');
                document.getElementById('fileList').innerHTML = '';

                // サマリーカードをリセット
                document.getElementById('totalSales').textContent = '¥0';
                document.getElementById('totalSalesFees').textContent = '¥0';
                document.getElementById('totalExpenses').textContent = '¥0';
                document.getElementById('totalProfit').textContent = '¥0';
                document.getElementById('profitMargin').textContent = '0%';
                const grossProfitEl = document.getElementById('grossProfit');
                if (grossProfitEl) grossProfitEl.textContent = '¥0';
                const grossMarginEl = document.getElementById('grossMargin');
                if (grossMarginEl) grossMarginEl.textContent = '0%';
                document.getElementById('orderCount').textContent = '0';
                const refundCountEl = document.getElementById('refundCount');
                if (refundCountEl) refundCountEl.textContent = '0';
                document.getElementById('totalRefunds').textContent = '¥0';
                const refundRateEl = document.getElementById('refundRate');
                if (refundRateEl) refundRateEl.textContent = '0%';
                document.getElementById('transactionCount').textContent = '0';

                // VINE商品カードをリセット
                const vineCountEl = document.getElementById('vineCount');
                if (vineCountEl) vineCountEl.textContent = '0';
                const vineTotalAmountEl = document.getElementById('vineTotalAmount');
                if (vineTotalAmountEl) vineTotalAmountEl.textContent = '¥0';

                // マルチチャネル配送カードをリセット
                const multiChannelCountEl = document.getElementById('multiChannelCount');
                if (multiChannelCountEl) multiChannelCountEl.textContent = '0';
                const multiChannelAmountEl = document.getElementById('multiChannelAmount');
                if (multiChannelAmountEl) multiChannelAmountEl.textContent = '¥0';

                // テーブルをクリア
                document.querySelector('#dailyTable tbody').innerHTML = '';
                document.querySelector('#transactionTable tbody').innerHTML = '';
                document.querySelector('#productTable tbody').innerHTML = '';
                document.querySelector('#fbaTable tbody').innerHTML = '';
                document.querySelector('#multiChannelTable tbody').innerHTML = '';

                // 期間セレクターをクリア
                document.getElementById('periodSelector').innerHTML = '';
            }
        }
    }



    parseCSV(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    // Amazon CSVの特殊な処理（最初の7行をスキップする場合もある）
                    const data = results.data.filter(row => {
                        // 有効なデータ行のみをフィルタ
                        return row['日付'] && row['トランザクションの種類'];
                    });
                    
                    // 期間を抽出してログ出力
                    if (data.length > 0) {
                        const dates = data.map(row => row['日付']).filter(d => d);
                        const startDate = dates[0];
                        const endDate = dates[dates.length - 1];
                        console.log(`${file.name}: ${startDate} ～ ${endDate} (${data.length}件)`);
                    }
                    
                    this.data.push(...data);
                    resolve(data.length);
                },
                error: (error) => {
                    console.error('CSV解析エラー:', error);
                    this.updateFileStatus(file.name, 'error', 'エラー');
                    resolve(0);
                }
            });
        });
    }

    processData() {
        console.log('データ処理開始 - 入力データ数:', this.data.length);
        
        // 注文番号とタイプのマッピングを初期化
        this.orderTypeMap = new Map();
        
        // データ構造を完全に初期化
        this.processedData = {
            totalSales: 0,
            totalSalesFees: 0,        // 売上手数料（注文に対する支払いの手数料のみ）
            totalFees: 0,             // 売上手数料（後方互換性のため残す）
            totalFbaFees: 0,          // その他手数料合計
            totalExpenses: 0,         // 合計経費（売上手数料 + その他手数料）
            totalProfit: 0,
            totalRefunds: 0,
            refundCount: 0,
            orderCount: 0,
            transactionCount: 0,
            dailyData: {},
            transactionTypes: {},
            productData: {},
            periods: {},
            fbaFeeBreakdown: {
                returnFees: 0,        // FBA在庫の返送手数料
                shippingFees: 0,      // 納品時の輸送手数料
                marketplaceFees: 0,   // マーケットプレイス配送サービス
                storageFees: 0,       // FBA保管手数料
                monthlyFees: 0,       // 月額登録料
                advertisingFees: 0    // 広告費用
            },
            salesFeeBreakdown: {
                promotionDiscount: 0, // プロモーション割引合計
                amazonFees: 0,        // Amazon手数料
                otherFees: 0          // その他
            },
            vineData: {
                count: 0,             // VINE商品数
                totalAmount: 0,       // VINE商品の合計金額
                products: []          // VINE商品リスト
            },
            multiChannelData: {
                count: 0,             // マルチチャネル配送数
                totalAmount: 0,       // マルチチャネル配送の合計金額
                orders: []            // マルチチャネル注文リスト
            },
            salesBreakdown: {
                productPrice: 0,      // 商品価格合計
                otherAmount: 0        // その他の金額
            },
            orderBreakdown: {
                amazonOrders: 0,      // Amazon販売の注文数
                multiChannelOrders: 0 // マルチチャネル配送の注文数
            }
        };
        
        // periods Mapも確実にクリア
        this.periods.clear();

        this.processedData.transactionCount = this.data.length;

        this.data.forEach(row => {
            const date = row['日付'];
            const transactionType = row['トランザクションの種類'];
            const orderNumber = row['注文番号'];
            const productDetail = row['商品の詳細'] || '不明';
            const productPrice = parseFloat(row['商品価格合計']) || 0;
            const promotionDiscount = parseFloat(row['プロモーション割引合計']) || 0;
            const amazonFees = parseFloat(row['Amazon手数料']) || 0;
            const other = parseFloat(row['その他']) || 0;
            const total = parseFloat(row['合計 (JPY)']) || 0;
            const seller = row['出品サービス'] || row['出品者'] || '';
            
            // マルチチャネル配送の判定
            // 注文に対する支払いで、商品価格合計=0、プロモーション割引合計=0、Amazon手数料<0の場合
            const isMultiChannel = transactionType === '注文に対する支払い' && 
                                   productPrice === 0 && 
                                   promotionDiscount === 0 && 
                                   amazonFees < 0;

            // 期間の抽出
            if (date) {
                const dateObj = new Date(date);
                const yearMonth = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月`;
                if (!this.periods.has(yearMonth)) {
                    this.periods.set(yearMonth, {
                        totalSales: 0,
                        totalSalesFees: 0,        // 売上手数料（注文に対する支払いの手数料のみ）
                        totalFees: 0,             // 売上手数料（後方互換性のため残す）
                        totalFbaFees: 0,          // その他手数料合計
                        totalExpenses: 0,         // 合計経費（売上手数料 + その他手数料）
                        totalProfit: 0,
                        totalRefunds: 0,
                        refundCount: 0,
                        orderCount: 0,
                        transactionCount: 0,
                        dailyData: {},
                        transactionTypes: {},
                        productData: {},
                        fbaFeeBreakdown: {
                            returnFees: 0,        // FBA在庫の返送手数料
                            shippingFees: 0,      // 納品時の輸送手数料
                            marketplaceFees: 0,   // マーケットプレイス配送サービス
                            storageFees: 0,       // FBA保管手数料
                            monthlyFees: 0,       // 月額登録料
                            advertisingFees: 0    // 広告費用
                        },
                        salesFeeBreakdown: {
                            promotionDiscount: 0, // プロモーション割引合計
                            amazonFees: 0,        // Amazon手数料
                            otherFees: 0          // その他
                        },
                        vineData: {
                            count: 0,             // VINE商品数
                            totalAmount: 0,       // VINE商品の合計金額
                            products: []          // VINE商品リスト
                        },
                        multiChannelData: {
                            count: 0,             // マルチチャネル配送数
                            totalAmount: 0,       // マルチチャネル配送の合計金額
                            orders: []            // マルチチャネル注文リスト
                        },
                        salesBreakdown: {
                            productPrice: 0,      // 商品価格合計
                            otherAmount: 0        // その他の金額
                        },
                        orderBreakdown: {
                            amazonOrders: 0,      // Amazon販売の注文数
                            multiChannelOrders: 0 // マルチチャネル配送の注文数
                        }
                    });
                }
                const periodData = this.periods.get(yearMonth);
                periodData.transactionCount++;

                // 日次データの処理
                if (!this.processedData.dailyData[date]) {
                    this.processedData.dailyData[date] = {
                        sales: 0,
                        fees: 0,
                        profit: 0,
                        orders: new Set(),
                        refunds: 0
                    };
                }
                if (!periodData.dailyData[date]) {
                    periodData.dailyData[date] = {
                        sales: 0,
                        fees: 0,
                        profit: 0,
                        orders: new Set(),
                        refunds: 0
                    };
                }

                // トランザクションタイプ別処理（マルチチャネルを分離）
                let effectiveTransactionType = transactionType;
                
                // マルチチャネル取引の場合は別の取引種別として扱う
                if (isMultiChannel && transactionType === '注文に対する支払い') {
                    effectiveTransactionType = 'マルチチャネル取引';
                }
                
                // 注文に対する支払いの場合、商品価格合計とその他に分離（マルチチャネル以外）
                if (transactionType === '注文に対する支払い' && !isMultiChannel) {
                    // 商品価格合計の処理
                    if (productPrice > 0) {
                        const productPriceType = '注文に対する支払い（商品価格合計）';
                        if (!this.processedData.transactionTypes[productPriceType]) {
                            this.processedData.transactionTypes[productPriceType] = {
                                count: 0,
                                amount: 0
                            };
                        }
                        if (!periodData.transactionTypes[productPriceType]) {
                            periodData.transactionTypes[productPriceType] = {
                                count: 0,
                                amount: 0
                            };
                        }
                        this.processedData.transactionTypes[productPriceType].count++;
                        this.processedData.transactionTypes[productPriceType].amount += productPrice;
                        periodData.transactionTypes[productPriceType].count++;
                        periodData.transactionTypes[productPriceType].amount += productPrice;
                    }
                    
                    // その他の処理
                    if (other > 0) {
                        const otherType = '注文に対する支払い（その他）';
                        if (!this.processedData.transactionTypes[otherType]) {
                            this.processedData.transactionTypes[otherType] = {
                                count: 0,
                                amount: 0
                            };
                        }
                        if (!periodData.transactionTypes[otherType]) {
                            periodData.transactionTypes[otherType] = {
                                count: 0,
                                amount: 0
                            };
                        }
                        this.processedData.transactionTypes[otherType].count++;
                        this.processedData.transactionTypes[otherType].amount += other;
                        periodData.transactionTypes[otherType].count++;
                        periodData.transactionTypes[otherType].amount += other;
                    }
                } else {
                    // 従来の処理（マルチチャネル取引、その他の取引種別）
                    if (!this.processedData.transactionTypes[effectiveTransactionType]) {
                        this.processedData.transactionTypes[effectiveTransactionType] = {
                            count: 0,
                            amount: 0
                        };
                    }
                    if (!periodData.transactionTypes[effectiveTransactionType]) {
                        periodData.transactionTypes[effectiveTransactionType] = {
                            count: 0,
                            amount: 0
                        };
                    }

                    this.processedData.transactionTypes[effectiveTransactionType].count++;
                    this.processedData.transactionTypes[effectiveTransactionType].amount += total;
                    periodData.transactionTypes[effectiveTransactionType].count++;
                    periodData.transactionTypes[effectiveTransactionType].amount += total;
                }

                // 商品別データ
                if (productDetail && productDetail !== '不明') {
                    if (!this.processedData.productData[productDetail]) {
                        this.processedData.productData[productDetail] = {
                            sales: 0,
                            fees: 0,
                            profit: 0,
                            count: 0
                        };
                    }
                    if (!periodData.productData[productDetail]) {
                        periodData.productData[productDetail] = {
                            sales: 0,
                            fees: 0,
                            profit: 0,
                            count: 0
                        };
                    }
                }

                // マルチチャネル配送の記録
                if (isMultiChannel && transactionType === '注文に対する支払い') {
                    this.processedData.multiChannelData.count++;
                    this.processedData.multiChannelData.totalAmount += Math.abs(amazonFees);
                    this.processedData.multiChannelData.orders.push({
                        date: date,
                        orderNumber: orderNumber,
                        product: productDetail,
                        amount: Math.abs(amazonFees),
                        seller: seller
                    });
                    
                    periodData.multiChannelData.count++;
                    periodData.multiChannelData.totalAmount += Math.abs(amazonFees);
                    periodData.multiChannelData.orders.push({
                        date: date,
                        orderNumber: orderNumber,
                        product: productDetail,
                        amount: Math.abs(amazonFees),
                        seller: seller
                    });
                }

                // 売上・売上手数料の計算
                if (transactionType === '注文に対する支払い') {
                    // 総売上は商品価格合計とその他の合計
                    const sales = productPrice + other;
                    // 売上手数料はプロモーション割引合計とAmazon手数料のみ（マルチチャネルは除外）
                    const salesFees = isMultiChannel ? 0 : Math.abs(amazonFees) + Math.abs(promotionDiscount);
                    
                    // 総売上の内訳を記録
                    this.processedData.salesBreakdown.productPrice += productPrice;
                    this.processedData.salesBreakdown.otherAmount += other;
                    
                    periodData.salesBreakdown.productPrice += productPrice;
                    periodData.salesBreakdown.otherAmount += other;

                    // 売上手数料の内訳を計算（マルチチャネルは除外）
                    const promotionDiscountAbs = isMultiChannel ? 0 : Math.abs(promotionDiscount);
                    const amazonFeesAbs = isMultiChannel ? 0 : Math.abs(amazonFees);
                    const otherFeesAbs = 0; // 「その他」は売上手数料ではなく売上に含まれる

                    // VINE商品の識別（商品価格とプロモーション割引が同額で相殺される場合）
                    const isVineProduct = productPrice > 0 && Math.abs(productPrice - promotionDiscountAbs) < 0.01;
                    
                    if (isVineProduct) {
                        this.processedData.vineData.count++;
                        this.processedData.vineData.totalAmount += productPrice;
                        this.processedData.vineData.products.push({
                            date: date,
                            product: productDetail,
                            amount: productPrice,
                            orderNumber: orderNumber
                        });
                        
                        periodData.vineData.count++;
                        periodData.vineData.totalAmount += productPrice;
                        periodData.vineData.products.push({
                            date: date,
                            product: productDetail,
                            amount: productPrice,
                            orderNumber: orderNumber
                        });
                    }

                    // 売上手数料の内訳を累計
                    this.processedData.salesFeeBreakdown.promotionDiscount += promotionDiscountAbs;
                    this.processedData.salesFeeBreakdown.amazonFees += amazonFeesAbs;
                    this.processedData.salesFeeBreakdown.otherFees += otherFeesAbs;
                    
                    periodData.salesFeeBreakdown.promotionDiscount += promotionDiscountAbs;
                    periodData.salesFeeBreakdown.amazonFees += amazonFeesAbs;
                    periodData.salesFeeBreakdown.otherFees += otherFeesAbs;

                    this.processedData.totalSales += sales;
                    this.processedData.totalSalesFees += salesFees;
                    this.processedData.totalFees += salesFees;  // 後方互換性のため
                    
                    periodData.totalSales += sales;
                    periodData.totalSalesFees += salesFees;
                    periodData.totalFees += salesFees;  // 後方互換性のため

                    this.processedData.dailyData[date].sales += sales;
                    this.processedData.dailyData[date].fees += salesFees;
                    
                    periodData.dailyData[date].sales += sales;
                    periodData.dailyData[date].fees += salesFees;

                    // 注文番号が空でも代替IDでカウント
                    const orderId = orderNumber || `${date}_${productDetail}_${Math.abs(total)}`;
                    this.processedData.dailyData[date].orders.add(orderId);
                    periodData.dailyData[date].orders.add(orderId);
                    
                    // 注文番号とタイプのマッピングを保存（重複対策）
                    this.orderTypeMap.set(orderId, isMultiChannel ? 'multiChannel' : 'amazon');

                    if (productDetail && productDetail !== '不明') {
                        this.processedData.productData[productDetail].sales += sales;
                        this.processedData.productData[productDetail].fees += salesFees;
                        this.processedData.productData[productDetail].count++;
                        
                        periodData.productData[productDetail].sales += sales;
                        periodData.productData[productDetail].fees += salesFees;
                        periodData.productData[productDetail].count++;
                    }
                } else if (transactionType === '返金') {
                    const refundAmount = Math.abs(total);
                    
                    // 返金額を統計として記録
                    this.processedData.totalRefunds += refundAmount;
                    this.processedData.refundCount += 1;
                    this.processedData.dailyData[date].refunds += refundAmount;
                    
                    periodData.totalRefunds += refundAmount;
                    periodData.refundCount += 1;
                    periodData.dailyData[date].refunds += refundAmount;
                    
                    // 返金額を売上手数料として加算（売上と相殺せず手数料として計算）
                    this.processedData.totalSalesFees += refundAmount;
                    this.processedData.totalFees += refundAmount;  // 後方互換性のため
                    this.processedData.dailyData[date].fees += refundAmount;
                    
                    periodData.totalSalesFees += refundAmount;
                    periodData.totalFees += refundAmount;  // 後方互換性のため
                    periodData.dailyData[date].fees += refundAmount;
                }

                // その他手数料（FBA関連）細目の処理
                this.processFbaFees(row, this.processedData.fbaFeeBreakdown, periodData.fbaFeeBreakdown);
            }
        });

        // 注文数の計算（Amazon販売は一意な注文番号、マルチチャネルは配送回数）
        const allUniqueOrders = new Set();
        Object.values(this.processedData.dailyData).forEach(day => {
            day.orders.forEach(orderId => allUniqueOrders.add(orderId));
        });
        
        // Amazon販売の一意な注文数
        const amazonUniqueOrders = new Set();
        allUniqueOrders.forEach(orderId => {
            const orderType = this.orderTypeMap.get(orderId);
            if (orderType !== 'multiChannel') {
                amazonUniqueOrders.add(orderId);
            }
        });
        
        // 注文内訳の計算
        this.processedData.orderBreakdown = { 
            amazonOrders: amazonUniqueOrders.size,
            multiChannelOrders: this.processedData.multiChannelData.count  // 配送回数
        };
        
        // 総注文数 = Amazon販売の一意な注文数 + マルチチャネル配送回数
        this.processedData.orderCount = this.processedData.orderBreakdown.amazonOrders + this.processedData.orderBreakdown.multiChannelOrders;
        
        // その他手数料合計の計算
        this.processedData.totalFbaFees = Object.values(this.processedData.fbaFeeBreakdown).reduce((sum, fee) => sum + fee, 0);
        
        // 合計経費の計算（売上手数料 + その他手数料）
        this.processedData.totalExpenses = this.processedData.totalSalesFees + this.processedData.totalFbaFees;
        
        // 利益の再計算（売上 - 合計経費）
        // 純利益 = 総売上 - 合計経費
        this.processedData.totalProfit = this.processedData.totalSales - this.processedData.totalExpenses;
        
        // 日次データの利益計算
        Object.keys(this.processedData.dailyData).forEach(date => {
            const dayData = this.processedData.dailyData[date];
            dayData.profit = dayData.sales - dayData.fees; // 日次は売上手数料のみで計算
        });
        
        // 商品別データの利益計算
        Object.keys(this.processedData.productData).forEach(product => {
            const productData = this.processedData.productData[product];
            productData.profit = productData.sales - productData.fees; // 商品別は売上手数料のみで計算
        });
        
        this.periods.forEach((periodData, period) => {
            // 期間別注文数の計算（Amazon販売は一意な注文番号、マルチチャネルは配送回数）
            const periodUniqueOrders = new Set();
            Object.values(periodData.dailyData).forEach(day => {
                day.orders.forEach(orderId => periodUniqueOrders.add(orderId));
            });
            
            // 期間別Amazon販売の一意な注文数
            const periodAmazonUniqueOrders = new Set();
            periodUniqueOrders.forEach(orderId => {
                const orderType = this.orderTypeMap.get(orderId);
                if (orderType !== 'multiChannel') {
                    periodAmazonUniqueOrders.add(orderId);
                }
            });
            
            // 期間別注文内訳の計算
            periodData.orderBreakdown = { 
                amazonOrders: periodAmazonUniqueOrders.size,
                multiChannelOrders: periodData.multiChannelData.count  // 配送回数
            };
            
            // 期間別総注文数 = Amazon販売の一意な注文数 + マルチチャネル配送回数
            periodData.orderCount = periodData.orderBreakdown.amazonOrders + periodData.orderBreakdown.multiChannelOrders;
            
            // 期間別その他手数料合計の計算
            periodData.totalFbaFees = Object.values(periodData.fbaFeeBreakdown).reduce((sum, fee) => sum + fee, 0);
            
            // 期間別合計経費の計算（売上手数料 + その他手数料）
            periodData.totalExpenses = periodData.totalSalesFees + periodData.totalFbaFees;
            
            // 期間別利益の再計算
            periodData.totalProfit = periodData.totalSales - periodData.totalExpenses;
            
            // 期間別日次データの利益計算
            Object.keys(periodData.dailyData).forEach(date => {
                const dayData = periodData.dailyData[date];
                dayData.profit = dayData.sales - dayData.fees; // 日次は売上手数料のみで計算
            });
            
            // 期間別商品データの利益計算
            Object.keys(periodData.productData).forEach(product => {
                const productData = periodData.productData[product];
                productData.profit = productData.sales - productData.fees; // 商品別は売上手数料のみで計算
            });
            
            // 各期間のトランザクション数を確認
            console.log(`${period}: ${periodData.transactionCount}件のトランザクション`);
        });
    }

    // その他手数料（FBA関連）細目の処理
    processFbaFees(row, globalBreakdown, periodBreakdown) {
        const transactionType = row['トランザクションの種類'];
        const productDetail = row['商品の詳細'] || '';
        const amazonFees = parseFloat(row['Amazon手数料']) || 0;
        const other = parseFloat(row['その他']) || 0;
        const productPrice = parseFloat(row['商品価格合計']) || 0;

        // FBA在庫の返送手数料
        if (transactionType === 'サービス料金' && productDetail === 'FBA在庫の返送手数料') {
            const fee = Math.abs(amazonFees);
            globalBreakdown.returnFees += fee;
            periodBreakdown.returnFees += fee;
        }
        // 納品時の輸送手数料
        else if (transactionType === 'サービス料金' && productDetail === '納品時の輸送手数料') {
            const fee = Math.abs(other);
            globalBreakdown.shippingFees += fee;
            periodBreakdown.shippingFees += fee;
        }
        // マーケットプレイス配送サービス
        else if (transactionType === 'マーケットプレイス配送サービス' && productDetail === '請求') {
            const fee = Math.abs(productPrice) + Math.abs(other);
            globalBreakdown.marketplaceFees += fee;
            periodBreakdown.marketplaceFees += fee;
        }
        // FBA保管手数料
        else if (transactionType === 'サービス料金' && productDetail === 'FBA保管手数料：') {
            const fee = Math.abs(other);
            globalBreakdown.storageFees += fee;
            periodBreakdown.storageFees += fee;
        }
        // 月額登録料
        else if (transactionType === 'サービス料金' && productDetail === '月額登録料：') {
            const fee = Math.abs(amazonFees);
            globalBreakdown.monthlyFees += fee;
            periodBreakdown.monthlyFees += fee;
        }
        // 広告費用
        else if (transactionType === 'サービス料金' && productDetail === '広告費用') {
            const fee = Math.abs(amazonFees);
            globalBreakdown.advertisingFees += fee;
            periodBreakdown.advertisingFees += fee;
        }
    }

    updateDashboard() {
        this.updatePeriodSelector();
        this.updateSummaryCards();
        this.updateCharts();
        this.updateTables();
    }

    updatePeriodSelector() {
        const selector = document.getElementById('periodSelector');
        selector.innerHTML = '';

        // 各月のボタン（時系列順）
        const periodEntries = Array.from(this.periods.entries()).sort();
        let latestPeriod = null;
        
        periodEntries.forEach(([period, data], index) => {
            const button = document.createElement('button');
            button.className = 'period-button';
            button.textContent = period;
            button.onclick = () => this.switchPeriod(period);
            
            // 最後の期間（最新月）をデフォルトのアクティブにする
            if (index === periodEntries.length - 1) {
                button.classList.add('active');
                latestPeriod = period;
            }
            
            selector.appendChild(button);
        });

        // 全期間ボタンを最後に追加
        const allButton = document.createElement('button');
        allButton.className = 'period-button';
        allButton.textContent = '全期間';
        allButton.onclick = () => this.switchPeriod('all');
        selector.appendChild(allButton);

        // デフォルトで最新月を選択
        if (latestPeriod) {
            this.currentPeriod = latestPeriod;
        }
    }

    switchPeriod(period) {
        this.currentPeriod = period;
        
        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.period-button').forEach(btn => {
            btn.classList.remove('active');
            if ((period === 'all' && btn.textContent === '全期間') || 
                btn.textContent === period) {
                btn.classList.add('active');
            }
        });

        this.updateSummaryCards();
        this.updateCharts();
        this.updateTables();
    }

    getCurrentData() {
        if (this.currentPeriod === 'all') {
            // 全期間のデータ整合性チェック
            if (!this.processedData || Object.keys(this.processedData).length === 0) {
                console.warn('全期間データが空です。データを再構築します。');
                this.rebuildAllData();
            }
            return this.processedData;
        }
        
        const data = this.periods.get(this.currentPeriod);
        if (!data) {
            console.warn(`期間データが見つかりません: ${this.currentPeriod}`);
            // 空のデータ構造を返す
            return {
                totalSales: 0,
                totalSalesFees: 0,
                totalFees: 0,
                totalFbaFees: 0,
                totalExpenses: 0,
                totalProfit: 0,
                totalRefunds: 0,
                refundCount: 0,
                orderCount: 0,
                transactionCount: 0,
                dailyData: {},
                transactionTypes: {},
                productData: {},
                fbaFeeBreakdown: {},
                multiChannelData: {
                    count: 0,
                    totalAmount: 0,
                    orders: []
                },
                salesBreakdown: {
                    productPrice: 0,
                    otherAmount: 0
                },
                orderBreakdown: {
                    amazonOrders: 0,
                    multiChannelOrders: 0
                }
            };
        }
        
        // transactionCountがない場合のデフォルト値を設定
        if (!data.hasOwnProperty('transactionCount')) {
            data.transactionCount = 0;
        }
        return data;
    }

    updateSummaryCards() {
        const data = this.getCurrentData();
        
        document.getElementById('totalSales').textContent = 
            this.formatCurrency(data.totalSales);
        document.getElementById('totalSalesFees').textContent = 
            this.formatCurrency(data.totalSalesFees || data.totalFees);
        // 粗利 = 総売上 - 売上手数料
        const gross = (data.totalSales || 0) - (data.totalSalesFees || data.totalFees || 0);
        const grossEl = document.getElementById('grossProfit');
        if (grossEl) grossEl.textContent = this.formatCurrency(gross);
        // 粗利率 = 粗利 / 総売上
        const gm = (data.totalSales || 0) > 0 ? (gross / data.totalSales * 100).toFixed(1) : 0;
        const gmEl = document.getElementById('grossMargin');
        if (gmEl) gmEl.textContent = gm + '%';
        document.getElementById('totalExpenses').textContent = 
            this.formatCurrency(data.totalExpenses || data.totalFees);
        document.getElementById('totalProfit').textContent = 
            this.formatCurrency(data.totalProfit);
        
        // 利益率 = 純利益 / 総売上
        const profitMarginRate = (data.totalSales || 0) > 0 ? (data.totalProfit / data.totalSales * 100).toFixed(1) : 0;
        const profitMarginEl = document.getElementById('profitMargin');
        if (profitMarginEl) profitMarginEl.textContent = profitMarginRate + '%';
        
        // 返金率 = 返金額 / 総売上
        const refundRate = (data.totalSales || 0) > 0 ? (data.totalRefunds / data.totalSales * 100).toFixed(1) : 0;
        const refundRateEl = document.getElementById('refundRate');
        if (refundRateEl) refundRateEl.textContent = refundRate + '%';
        
        document.getElementById('orderCount').textContent = 
            data.orderCount.toLocaleString();
        const refundCountEl = document.getElementById('refundCount');
        if (refundCountEl) {
            refundCountEl.textContent = (data.refundCount || 0).toLocaleString();
        }
        document.getElementById('totalRefunds').textContent = 
            this.formatCurrency(data.totalRefunds);
        document.getElementById('transactionCount').textContent = 
            data.transactionCount.toLocaleString() + '件';

        // VINE商品データの表示
        const vineCountEl = document.getElementById('vineCount');
        if (vineCountEl) {
            vineCountEl.textContent = (data.vineData ? data.vineData.count : 0).toLocaleString();
        }
        const vineTotalAmountEl = document.getElementById('vineTotalAmount');
        if (vineTotalAmountEl) {
            vineTotalAmountEl.textContent = this.formatCurrency(data.vineData ? data.vineData.totalAmount : 0);
        }

        // マルチチャネル配送データの表示
        const multiChannelCountEl = document.getElementById('multiChannelCount');
        if (multiChannelCountEl) {
            multiChannelCountEl.textContent = (data.multiChannelData ? data.multiChannelData.count : 0).toLocaleString();
        }
        const multiChannelAmountEl = document.getElementById('multiChannelAmount');
        if (multiChannelAmountEl) {
            multiChannelAmountEl.textContent = this.formatCurrency(data.multiChannelData ? data.multiChannelData.totalAmount : 0);
            // マルチチャネル配送は経費なので赤文字で表示
            multiChannelAmountEl.style.color = 'var(--danger-color)';
            multiChannelAmountEl.style.fontWeight = '600';
        }

        // 利益の状態に応じて色を変更
        const profitElement = document.getElementById('totalProfit');
        const profitChangeElement = document.getElementById('profitChange');
        if (data.totalProfit >= 0) {
            profitElement.style.color = 'var(--success-color)';
            profitChangeElement.className = 'card-change positive';
        } else {
            profitElement.style.color = 'var(--danger-color)';
            profitChangeElement.className = 'card-change negative';
        }

        // ツールチップ（総売上・売上手数料・合計経費・注文数）
        const salesBreakdown = data.salesBreakdown || { productPrice: 0, otherAmount: 0 };
        this.attachSummaryTooltip('totalSales', [
            { label: '商品価格合計', value: salesBreakdown.productPrice },
            { label: 'その他', value: salesBreakdown.otherAmount }
        ]);
        
        const salesFeeBreakdown = data.salesFeeBreakdown || { promotionDiscount: 0, amazonFees: 0, otherFees: 0 };
        this.attachSummaryTooltip('totalSalesFees', [
            { label: 'プロモーション割引合計', value: salesFeeBreakdown.promotionDiscount },
            { label: 'Amazon手数料', value: salesFeeBreakdown.amazonFees }
        ]);
        this.attachSummaryTooltip('totalExpenses', [
            { label: '売上手数料', value: data.totalSalesFees || data.totalFees },
            { label: 'その他手数料合計', value: data.totalFbaFees || 0 }
        ]);
        
        const orderBreakdown = data.orderBreakdown || { amazonOrders: 0, multiChannelOrders: 0 };
        this.attachOrderTooltip('orderCount', [
            { label: 'Amazon販売', value: orderBreakdown.amazonOrders },
            { label: 'マルチチャネル配送', value: orderBreakdown.multiChannelOrders }
        ]);
    }

    // サマリーカードにツールチップを添付（CSSホバー制御に一本化）
    attachSummaryTooltip(valueElementId, items) {
        const el = document.getElementById(valueElementId);
        if (!el) return;
        const card = el.closest('.card');
        if (!card) return;

        // 既存ツールチップ削除
        const old = card.querySelector('.summary-tooltip');
        if (old) old.remove();

        // ツールチップ要素を作成（インラインstyleは一切設定しない）
        const tip = document.createElement('div');
        tip.className = 'summary-tooltip';
        tip.innerHTML = items
            .map(i => `${i.label}: <strong>${this.formatCurrency(i.value || 0)}</strong>`) 
            .join('<br>');
        card.appendChild(tip);

        // カードにホバー用のクラスを付与（CSSで表示制御）
        card.classList.add('has-tooltip');
    }

    // 注文数カードにツールチップを添付
    attachOrderTooltip(valueElementId, items) {
        const el = document.getElementById(valueElementId);
        if (!el) return;
        const card = el.closest('.card');
        if (!card) return;

        // 既存ツールチップ削除
        const old = card.querySelector('.summary-tooltip');
        if (old) old.remove();

        // ツールチップ要素を作成（注文数は数字のみ）
        const tip = document.createElement('div');
        tip.className = 'summary-tooltip';
        tip.innerHTML = items
            .map(i => `${i.label}: <strong>${(i.value || 0).toLocaleString()}件</strong>`) 
            .join('<br>');
        card.appendChild(tip);

        // カードにホバー用のクラスを付与
        card.classList.add('has-tooltip');
    }

    // 連続した日付配列を生成するヘルパーメソッド
    generateContinuousDates(dailyData) {
        const existingDates = Object.keys(dailyData).sort();
        if (existingDates.length === 0) return [];

        let startDate, endDate;

        // 月毎表示の場合は、その月の1日から末日まで表示
        if (this.currentPeriod !== 'all' && this.currentPeriod.includes('年') && this.currentPeriod.includes('月')) {
            // "2025年6月" -> 2025年6月1日から2025年6月30日
            const [year, monthStr] = this.currentPeriod.split('年');
            const month = parseInt(monthStr.replace('月', ''));
            
            startDate = new Date(parseInt(year), month - 1, 1); // 月は0ベース
            endDate = new Date(parseInt(year), month, 0); // 翌月の0日 = 当月末日
        } else {
            // 全期間表示の場合は既存のロジック
            startDate = new Date(existingDates[0]);
            endDate = new Date(existingDates[existingDates.length - 1]);
        }

        const dates = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.getFullYear() + '/' + 
                           (d.getMonth() + 1) + '/' + 
                           d.getDate();
            dates.push(dateStr);
        }

        return dates;
    }

    updateCharts() {
        this.updateSalesChart();
        this.updateProfitChart();
    }

    updateSalesChart() {
        const data = this.getCurrentData();
        const ctx = document.getElementById('salesChart').getContext('2d');
        
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        // 連続した日付配列を生成
        const allDates = this.generateContinuousDates(data.dailyData);
        const salesData = allDates.map(date => data.dailyData[date] ? data.dailyData[date].sales : 0);
        const profitData = allDates.map(date => data.dailyData[date] ? data.dailyData[date].profit : 0);

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allDates.map(date => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                }),
                datasets: [{
                    label: '売上',
                    data: salesData,
                    borderColor: '#FF9900',
                    backgroundColor: 'rgba(255, 153, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: '利益',
                    data: profitData,
                    borderColor: '#00A862',
                    backgroundColor: 'rgba(0, 168, 98, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return context.dataset.label + ': ' + 
                                       this.formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    updateProfitChart() {
        const data = this.getCurrentData();
        const ctx = document.getElementById('profitChart').getContext('2d');
        
        if (this.charts.profit) {
            this.charts.profit.destroy();
        }

        this.charts.profit = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['売上', '売上手数料', 'その他手数料', '純利益'],
                datasets: [{
                    data: [
                        data.totalSales,
                        -(data.totalSalesFees || data.totalFees),
                        -(data.totalFbaFees || 0),
                        data.totalProfit
                    ],
                    backgroundColor: [
                        '#00A862',
                        '#CC0C39',
                        '#FF6B35',
                        data.totalProfit >= 0 ? '#00A862' : '#CC0C39'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return this.formatCurrency(Math.abs(context.parsed.y));
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => this.formatCurrency(Math.abs(value))
                        }
                    }
                }
            }
        });
    }

    updateTables() {
        this.updateDailyTable();
        this.updateTransactionTable();
        this.updateProductTable();
        this.updateFbaTable();
        this.updateMultiChannelTable();
    }

    updateDailyTable() {
        const data = this.getCurrentData();
        const tbody = document.querySelector('#dailyTable tbody');
        tbody.innerHTML = '';

        // データを配列に変換してソート
        const dailyDataArray = Object.keys(data.dailyData).map(date => {
            const dayData = data.dailyData[date];
            return {
                date: date,
                sales: dayData.sales,
                fees: dayData.fees,
                profit: dayData.profit,
                margin: dayData.sales > 0 ? (dayData.profit / dayData.sales * 100) : 0,
                orders: dayData.orders.size
            };
        }).filter(dayData => {
            // 全てゼロの行を除外（売上、手数料、利益、注文数がすべて0の場合）
            return !(dayData.sales === 0 && dayData.fees === 0 && dayData.profit === 0 && dayData.orders === 0);
        });

        // ソート適用
        this.sortDailyData(dailyDataArray);

        // テーブル行を作成
        dailyDataArray.forEach(dayData => {
            const row = tbody.insertRow();
            
            row.insertCell(0).textContent = dayData.date;
            row.insertCell(1).textContent = this.formatCurrency(dayData.sales);
            row.insertCell(2).textContent = this.formatCurrency(dayData.fees);
            
            const profitCell = row.insertCell(3);
            profitCell.textContent = this.formatCurrency(dayData.profit);
            profitCell.className = dayData.profit >= 0 ? 'profit-positive' : 'profit-negative';
            
            const marginCell = row.insertCell(4);
            marginCell.textContent = dayData.margin.toFixed(1) + '%';
            
            row.insertCell(5).textContent = dayData.orders;
        });

        // ソートインジケーターを更新
        this.updateSortIndicators();
    }

    updateTransactionTable() {
        const data = this.getCurrentData();
        const tbody = document.querySelector('#transactionTable tbody');
        tbody.innerHTML = '';

        const totalAmount = Object.values(data.transactionTypes)
            .reduce((sum, type) => sum + Math.abs(type.amount), 0);

        Object.entries(data.transactionTypes)
            .sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount))
            .forEach(([type, typeData]) => {
                const row = tbody.insertRow();
                
                // サービス料金の場合は詳細説明付きの名称に変更
                const displayType = type === 'サービス料金' ? 
                    'サービス料金（月額登録料、FBA保管手数料、納品時の輸送手数料など）' : type;
                row.insertCell(0).textContent = displayType;
                row.insertCell(1).textContent = typeData.count;
                
                const amountCell = row.insertCell(2);
                amountCell.textContent = this.formatCurrency(typeData.amount);
                // 金額の色分け設定
                if (type === 'マルチチャネル取引' || type === 'マーケットプレイス配送サービス') {
                    // 経費なので赤文字
                    amountCell.className = 'profit-negative';
                } else if (type === '注文に対する支払い（商品価格合計）' || type === '注文に対する支払い（その他）') {
                    // 売上なので緑文字
                    amountCell.className = 'profit-positive';
                } else {
                    // その他は従来の判定
                    amountCell.className = typeData.amount >= 0 ? 'profit-positive' : 'profit-negative';
                }
                
                const percentCell = row.insertCell(3);
                const percent = totalAmount > 0 ? 
                    (Math.abs(typeData.amount) / totalAmount * 100).toFixed(1) : 0;
                percentCell.textContent = percent + '%';
            });
    }

    updateProductTable() {
        const data = this.getCurrentData();
        const tbody = document.querySelector('#productTable tbody');
        tbody.innerHTML = '';

        Object.entries(data.productData)
            .sort((a, b) => b[1].sales - a[1].sales)
            .slice(0, 20) // 上位20商品を表示
            .forEach(([product, productData]) => {
                const row = tbody.insertRow();
                
                const productName = product.length > 50 ? 
                    product.substring(0, 50) + '...' : product;
                row.insertCell(0).textContent = productName;
                row.insertCell(1).textContent = this.formatCurrency(productData.sales);
                row.insertCell(2).textContent = this.formatCurrency(productData.fees);
                
                const profitCell = row.insertCell(3);
                profitCell.textContent = this.formatCurrency(productData.profit);
                profitCell.className = productData.profit >= 0 ? 'profit-positive' : 'profit-negative';
                
                const marginCell = row.insertCell(4);
                const margin = productData.sales > 0 ? 
                    (productData.profit / productData.sales * 100).toFixed(1) : 0;
                marginCell.textContent = margin + '%';
                
                const countCell = row.insertCell(5);
                countCell.textContent = productData.count.toLocaleString();
            });
    }

    updateFbaTable() {
        const data = this.getCurrentData();
        const tbody = document.querySelector('#fbaTable tbody');
        tbody.innerHTML = '';

        // その他手数料（FBA関連）項目のリスト
        const fbaFeeItems = [
            { key: 'returnFees', label: 'FBA在庫の返送手数料', icon: '📦' },
            { key: 'shippingFees', label: '納品時の輸送手数料', icon: '🚛' },
            { key: 'marketplaceFees', label: 'マーケットプレイス配送サービス', icon: '📫' },
            { key: 'storageFees', label: 'FBA保管手数料', icon: '🏠' },
            { key: 'monthlyFees', label: '月額登録料', icon: '📅' },
            { key: 'advertisingFees', label: '広告費用', icon: '📢' }
        ];

        // 全その他手数料の合計を計算
        const totalFbaFees = Object.values(data.fbaFeeBreakdown).reduce((sum, fee) => sum + fee, 0);

        fbaFeeItems.forEach(item => {
            const fee = data.fbaFeeBreakdown[item.key];
            if (fee > 0) { // 0より大きい項目のみ表示
                const row = tbody.insertRow();
                
                // 項目名（アイコン付き）
                const itemCell = row.insertCell(0);
                itemCell.innerHTML = `${item.icon} ${item.label}`;
                
                // 金額
                const amountCell = row.insertCell(1);
                amountCell.textContent = this.formatCurrency(fee);
                amountCell.className = 'profit-negative'; // 手数料なので赤色表示
                
                // 構成比
                const percentCell = row.insertCell(2);
                const percent = totalFbaFees > 0 ? (fee / totalFbaFees * 100).toFixed(1) : 0;
                percentCell.textContent = percent + '%';
            }
        });

        // 合計行を追加
        if (totalFbaFees > 0) {
            const totalRow = tbody.insertRow();
            totalRow.style.borderTop = '2px solid #ddd';
            totalRow.style.fontWeight = 'bold';
            
            const totalItemCell = totalRow.insertCell(0);
            totalItemCell.innerHTML = '💰 <strong>その他手数料合計</strong>';
            
            const totalAmountCell = totalRow.insertCell(1);
            totalAmountCell.innerHTML = `<strong>${this.formatCurrency(totalFbaFees)}</strong>`;
            totalAmountCell.className = 'profit-negative';
            
            const totalPercentCell = totalRow.insertCell(2);
            totalPercentCell.innerHTML = '<strong>100.0%</strong>';
        }

        // データがない場合のメッセージ
        if (totalFbaFees === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = 'その他手数料データがありません';
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
            cell.style.fontStyle = 'italic';
        }
    }

    updateMultiChannelTable() {
        const data = this.getCurrentData();
        const tbody = document.querySelector('#multiChannelTable tbody');
        tbody.innerHTML = '';

        // マルチチャネル配送データの表示
        if (data.multiChannelData && data.multiChannelData.orders && data.multiChannelData.orders.length > 0) {
            data.multiChannelData.orders
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // 日付降順
                .forEach(order => {
                    const row = tbody.insertRow();
                    
                    // 日付
                    row.insertCell(0).textContent = order.date;
                    
                    // 注文番号
                    const orderCell = row.insertCell(1);
                    orderCell.textContent = order.orderNumber || '-';
                    orderCell.style.fontFamily = 'monospace';
                    
                    // 商品
                    const productCell = row.insertCell(2);
                    const productName = order.product && order.product.length > 50 ? 
                        order.product.substring(0, 50) + '...' : (order.product || '-');
                    productCell.textContent = productName;
                    productCell.style.maxWidth = '300px';
                    productCell.style.overflow = 'hidden';
                    productCell.style.textOverflow = 'ellipsis';
                    
                    // 金額
                    const amountCell = row.insertCell(3);
                    amountCell.textContent = this.formatCurrency(order.amount);
                    amountCell.className = 'profit-negative';
                    
                    // 出品サービス
                    const sellerCell = row.insertCell(4);
                    sellerCell.textContent = order.seller;
                    sellerCell.style.fontSize = '12px';
                    sellerCell.style.color = '#666';
                });
        } else {
            // データがない場合のメッセージ
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 5;
            cell.textContent = 'マルチチャネル配送データがありません';
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
            cell.style.fontStyle = 'italic';
            cell.style.padding = '40px';
        }
    }

    // テーブルソート機能のセットアップ
    setupTableSortListeners() {
        const dailyTableHeaders = document.querySelectorAll('#dailyTable th');
        dailyTableHeaders.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.addEventListener('click', () => {
                this.sortDailyTableByColumn(index);
            });
        });
    }

    // 日次テーブルの列でソート
    sortDailyTableByColumn(columnIndex) {
        const columns = ['date', 'sales', 'fees', 'profit', 'margin', 'orders'];
        const column = columns[columnIndex];
        
        if (this.sortState.column === column) {
            // 同じ列をクリックした場合は方向を反転
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // 異なる列をクリックした場合は昇順でリセット
            this.sortState.column = column;
            this.sortState.direction = 'asc';
        }
        
        this.updateDailyTable();
    }

    // 日次データをソート
    sortDailyData(dataArray) {
        const { column, direction } = this.sortState;
        
        dataArray.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            // 日付の場合は Date オブジェクトに変換
            if (column === 'date') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }
            
            // ソート方向に応じて比較
            if (direction === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
    }

    // ソートインジケーターを更新
    updateSortIndicators() {
        const dailyTableHeaders = document.querySelectorAll('#dailyTable th');
        const columns = ['date', 'sales', 'fees', 'profit', 'margin', 'orders'];
        
        dailyTableHeaders.forEach((header, index) => {
            // 既存のソートインジケーターを削除
            header.textContent = header.textContent.replace(/\s*[↑↓]$/, '');
            
            // 現在のソート列にインジケーターを追加
            if (columns[index] === this.sortState.column) {
                const indicator = this.sortState.direction === 'asc' ? ' ↑' : ' ↓';
                header.textContent += indicator;
            }
        });
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelectorAll('.table-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// ダッシュボードの初期化
const dashboard = new AmazonDashboard();
