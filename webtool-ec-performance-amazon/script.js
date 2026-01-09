        // グローバル変数
        let amazonData = [];
        let uploadedFiles = new Map(); // ファイル名と週番号のマッピング
        let charts = {};
        let modalChart = null;
        
        // ASINごとの追跡データ
        let asinTracking = new Map();
        
        // IndexedDB関連
        let db = null;
        const DB_NAME = 'AmazonPerformanceDB';
        const DB_VERSION = 1;
        
        // IndexedDBの初期化
        async function initIndexedDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => {
                    console.error('IndexedDB初期化エラー:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    db = request.result;
                    console.log('IndexedDB初期化完了');
                    resolve(db);
                };
                
                request.onupgradeneeded = (event) => {
                    const database = event.target.result;
                    
                    // ファイルデータストア（ファイル内容とハッシュを保存）
                    if (!database.objectStoreNames.contains('fileData')) {
                        const fileStore = database.createObjectStore('fileData', { keyPath: 'id', autoIncrement: true });
                        fileStore.createIndex('hash', 'hash', { unique: true });
                        fileStore.createIndex('fileName', 'fileName', { unique: false });
                        fileStore.createIndex('uploadDate', 'uploadDate', { unique: false });
                    }
                    
                    // 処理済みAmazonデータストア
                    if (!database.objectStoreNames.contains('amazonData')) {
                        const dataStore = database.createObjectStore('amazonData', { keyPath: 'id', autoIncrement: true });
                        dataStore.createIndex('fileHash', 'fileHash', { unique: false });
                        dataStore.createIndex('asin', 'asin', { unique: false });
                        dataStore.createIndex('weekDate', 'weekDate', { unique: false });
                    }
                    
                    // アップロード履歴ストア
                    if (!database.objectStoreNames.contains('uploadHistory')) {
                        const historyStore = database.createObjectStore('uploadHistory', { keyPath: 'id', autoIncrement: true });
                        historyStore.createIndex('hash', 'hash', { unique: true });
                        historyStore.createIndex('uploadDate', 'uploadDate', { unique: false });
                    }
                    
                    console.log('IndexedDBスキーマ作成完了');
                };
            });
        }
        
        // ファイル内容のハッシュ化
        async function generateFileHash(file) {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        // IndexedDBにファイルデータを保存
        async function saveFileToIndexedDB(file, weekDate, hash, processedData) {
            if (!db) {
                throw new Error('IndexedDBが初期化されていません');
            }
            
            return new Promise(async (resolve, reject) => {
                try {
                    // ファイル内容を先に読み取り
                    const fileContent = await file.text();
                    
                    const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
                    let completedOperations = 0;
                    const totalOperations = 2 + processedData.length; // fileData + history + amazonData items
                    
                    transaction.oncomplete = () => {
                        console.log(`ファイル保存完了: ${file.name} (${processedData.length}件のデータ)`);
                        resolve();
                    };
                    
                    transaction.onerror = (event) => {
                        console.error('トランザクションエラー:', event.target.error);
                        reject(event.target.error);
                    };
                    
                    // ファイルデータを保存
                    const fileStore = transaction.objectStore('fileData');
                    const fileData = {
                        fileName: file.name,
                        size: file.size,
                        hash: hash,
                        weekDate: weekDate.toISOString(),
                        uploadDate: new Date().toISOString(),
                        content: fileContent
                    };
                    const fileRequest = fileStore.add(fileData);
                    fileRequest.onerror = () => reject(fileRequest.error);
                    
                    // 処理済みデータを保存
                    const dataStore = transaction.objectStore('amazonData');
                    for (const item of processedData) {
                        const dataEntry = {
                            ...item,
                            fileHash: hash,
                            weekDate: item.weekDate.toISOString()
                        };
                        const dataRequest = dataStore.add(dataEntry);
                        dataRequest.onerror = () => reject(dataRequest.error);
                    }
                    
                    // アップロード履歴を保存
                    const historyStore = transaction.objectStore('uploadHistory');
                    const historyData = {
                        fileName: file.name,
                        hash: hash,
                        weekDate: weekDate.toISOString(),
                        uploadDate: new Date().toISOString(),
                        recordCount: processedData.length
                    };
                    const historyRequest = historyStore.add(historyData);
                    historyRequest.onerror = () => reject(historyRequest.error);
                    
                } catch (error) {
                    console.error('ファイル保存エラー:', error);
                    reject(error);
                }
            });
        }
        
        // 重複ファイルをチェック
        async function checkDuplicateFile(hash) {
            if (!db) return false;
            
            const transaction = db.transaction(['fileData'], 'readonly');
            const store = transaction.objectStore('fileData');
            const index = store.index('hash');
            
            return new Promise((resolve, reject) => {
                const request = index.get(hash);
                request.onsuccess = () => {
                    resolve(request.result !== undefined);
                };
                request.onerror = () => reject(request.error);
            });
        }
        
        // IndexedDBからアップロード履歴を取得
        async function getUploadHistory() {
            if (!db) return [];
            
            const transaction = db.transaction(['uploadHistory'], 'readonly');
            const store = transaction.objectStore('uploadHistory');
            const index = store.index('uploadDate');
            
            return new Promise((resolve, reject) => {
                const request = index.getAll();
                request.onsuccess = () => {
                    const results = request.result || [];
                    // 新しい順でソート
                    results.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                    resolve(results);
                };
                request.onerror = () => reject(request.error);
            });
        }
        
        // IndexedDBから保存されたデータを読み込み
        async function loadDataFromIndexedDB() {
            if (!db) return;
            
            const transaction = db.transaction(['amazonData'], 'readonly');
            const store = transaction.objectStore('amazonData');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = request.result || [];
                    // データを復元（日付オブジェクトに変換）
                    const restoredData = results.map(item => ({
                        ...item,
                        weekDate: new Date(item.weekDate)
                    }));
                    resolve(restoredData);
                };
                request.onerror = () => reject(request.error);
            });
        }
        
        // IndexedDBから特定のハッシュのデータを削除
        async function deleteDataFromIndexedDB(hash) {
            if (!db) return;
            
            const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
            
            try {
                // ファイルデータを削除
                const fileStore = transaction.objectStore('fileData');
                const fileIndex = fileStore.index('hash');
                const fileRequest = fileIndex.getAll(hash);
                fileRequest.onsuccess = () => {
                    fileRequest.result.forEach(item => {
                        fileStore.delete(item.id);
                    });
                };
                
                // Amazonデータを削除
                const dataStore = transaction.objectStore('amazonData');
                const dataIndex = dataStore.index('fileHash');
                const dataRequest = dataIndex.getAll(hash);
                dataRequest.onsuccess = () => {
                    dataRequest.result.forEach(item => {
                        dataStore.delete(item.id);
                    });
                };
                
                // 履歴を削除
                const historyStore = transaction.objectStore('uploadHistory');
                const historyIndex = historyStore.index('hash');
                const historyRequest = historyIndex.getAll(hash);
                historyRequest.onsuccess = () => {
                    historyRequest.result.forEach(item => {
                        historyStore.delete(item.id);
                    });
                };
                
                console.log(`データ削除完了: ${hash}`);
                
            } catch (error) {
                console.error('データ削除エラー:', error);
                throw error;
            }
        }
        
        // 通知を表示する関数
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // 日付から週番号を推測する関数
        function inferWeekFromDate(dateString) {
            // ファイル名から日付を抽出 (BusinessReport-DD-MM-YY.csv 形式)
            const match = dateString.match(/(\d{2})-(\d{2})-(\d{2})/);
            if (match) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10);
                const year = 2000 + parseInt(match[3], 10);
                
                // 日付の妥当性チェック
                if (month < 1 || month > 12 || day < 1 || day > 31) {
                    console.warn(`Invalid date values: day=${day}, month=${month}, year=${year}`);
                    return null;
                }
                
                // 日付オブジェクトを作成
                const date = new Date(year, month - 1, day);
                
                // 日付が正しく作成されたかチェック
                if (isNaN(date.getTime())) {
                    console.warn(`Invalid date: ${dateString}`);
                    return null;
                }
                
                return date;
            }
            return null;
        }
        
        // CSVファイルを解析する関数
        async function parseCSVFile(file, weekDate) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        
                        // 空ファイルチェック
                        if (!content || content.trim().length === 0) {
                            console.warn(`Empty file: ${file.name}`);
                            resolve([]);
                            return;
                        }
                        
                        const parsed = Papa.parse(content, {
                            header: true,
                            dynamicTyping: false,
                            skipEmptyLines: true
                        });
                        
                        // パースエラーチェック
                        if (parsed.errors && parsed.errors.length > 0) {
                            console.warn(`CSV parse errors in ${file.name}:`, parsed.errors);
                        }
                        
                        // データのクリーンアップと変換（商品名がないものは除外）
                        const cleanedData = parsed.data
                            .filter(row => {
                                // 商品名（タイトル）が存在するデータのみを保持
                                const title = row['タイトル'] || row['商品名'] || '';
                                const asin = row['（親）ASIN'] || row['ASIN'] || '';
                                return title.trim() !== '' && asin.trim() !== '';
                            })
                            .map(row => {
                                try {
                                    // 売上額から￥と,を削除して数値に変換
                                    const salesStr = row['注文商品の売上額'] || '￥0';
                                    const sales = parseInt(salesStr.replace(/[￥,]/g, ''), 10) || 0;
                                    
                                    // パーセンテージから%を削除
                                    const convRateStr = row['ユニットセッション率'] || '0%';
                                    const convRate = parseFloat(convRateStr.replace('%', '')) || 0;
                                    
                                    return {
                                        asin: row['（親）ASIN'] || row['ASIN'] || '',
                                        title: row['タイトル'] || row['商品名'] || '',
                                        sessions: parseInt(row['セッション数 - 合計'] || row['セッション数'] || '0', 10) || 0,
                                        pageViews: parseInt(row['ページビュー - 合計'] || row['ページビュー'] || '0', 10) || 0,
                                        orders: parseInt(row['注文された商品点数'] || row['注文数'] || '0', 10) || 0,
                                        conversionRate: convRate,
                                        sales: sales,
                                        orderItems: parseInt(row['注文品目総数'] || row['注文アイテム数'] || '0', 10) || 0,
                                        weekDate: weekDate,
                                        fileName: file.name
                                    };
                                } catch (error) {
                                    console.warn(`Error processing row in ${file.name}:`, error, row);
                                    return null;
                                }
                            })
                            .filter(item => item !== null); // null値を除外
                        
                        resolve(cleanedData);
                    } catch (error) {
                        console.error(`Error parsing CSV file ${file.name}:`, error);
                        reject(error);
                    }
                };
                
                reader.onerror = (error) => {
                    console.error(`Error reading file ${file.name}:`, error);
                    reject(error);
                };
                
                reader.readAsText(file, 'UTF-8'); // 文字エンコーディングを明示的に指定
            });
        }
        
        // ASINの追跡データを更新
        function updateAsinTracking() {
            asinTracking.clear();
            
            // 週ごとにデータをグループ化
            const weeklyGrouped = _.groupBy(amazonData, d => d.weekDate.toISOString());
            const weeks = Object.keys(weeklyGrouped).sort();
            
            // 各ASINの時系列データを構築
            amazonData.forEach(item => {
                if (!asinTracking.has(item.asin)) {
                    asinTracking.set(item.asin, {
                        title: item.title,
                        asin: item.asin,
                        firstSeen: item.weekDate,
                        lastSeen: item.weekDate,
                        weeklyData: new Map(),
                        totalSessions: 0,
                        totalSales: 0,
                        maxSessions: 0,
                        minSessions: Infinity,
                        changes: []
                    });
                }
                
                const tracking = asinTracking.get(item.asin);
                tracking.weeklyData.set(item.weekDate.toISOString(), {
                    sessions: item.sessions,
                    sales: item.sales,
                    conversionRate: item.conversionRate,
                    pageViews: item.pageViews,
                    orders: item.orders
                });
                
                tracking.totalSessions += item.sessions;
                tracking.totalSales += item.sales;
                tracking.maxSessions = Math.max(tracking.maxSessions, item.sessions);
                tracking.minSessions = Math.min(tracking.minSessions, item.sessions);
                
                if (item.weekDate < tracking.firstSeen) tracking.firstSeen = item.weekDate;
                if (item.weekDate > tracking.lastSeen) tracking.lastSeen = item.weekDate;
            });
            
            // 変化率を計算
            asinTracking.forEach((tracking, asin) => {
                const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
                
                // 内部検証ログ - ASIN基本情報
                console.log(`変化率計算開始 [${asin}]:`, {
                    商品名: tracking.title.substring(0, 50) + '...',
                    追跡期間: `${tracking.firstSeen.toLocaleDateString('ja-JP')}～${tracking.lastSeen.toLocaleDateString('ja-JP')}`,
                    週数: sortedWeeks.length
                });
                
                for (let i = 1; i < sortedWeeks.length; i++) {
                    const prevWeek = tracking.weeklyData.get(sortedWeeks[i - 1]);
                    const currentWeek = tracking.weeklyData.get(sortedWeeks[i]);
                    
                    if (prevWeek.sessions > 0) {
                        const changeRate = ((currentWeek.sessions - prevWeek.sessions) / prevWeek.sessions) * 100;
                        const absoluteChange = currentWeek.sessions - prevWeek.sessions;
                        
                        // 内部検証ログ - 週次変化詳細
                        if (Math.abs(changeRate) > 20) { // 大きな変化のみログ出力
                            console.log(`大きな変化検出 [${asin}]:`, {
                                期間: `${new Date(sortedWeeks[i-1]).toLocaleDateString('ja-JP')}→${new Date(sortedWeeks[i]).toLocaleDateString('ja-JP')}`,
                                前週セッション: prevWeek.sessions,
                                当週セッション: currentWeek.sessions,
                                絶対変化: absoluteChange,
                                変化率: `${changeRate.toFixed(1)}%`
                            });
                        }
                        
                        tracking.changes.push({
                            week: sortedWeeks[i],
                            changeRate: changeRate,
                            absoluteChange: absoluteChange
                        });
                    }
                }
                
                // 平均変化率を計算
                if (tracking.changes.length > 0) {
                    tracking.avgChangeRate = _.meanBy(tracking.changes, 'changeRate');
                    tracking.volatility = Math.sqrt(_.meanBy(tracking.changes, c => Math.pow(c.changeRate - tracking.avgChangeRate, 2)));
                    
                    // 内部検証ログ - 統計サマリー
                    console.log(`統計計算完了 [${asin}]:`, {
                        平均変化率: `${tracking.avgChangeRate.toFixed(1)}%`,
                        ボラティリティ: tracking.volatility.toFixed(1),
                        変化回数: tracking.changes.length,
                        最大変化: tracking.changes.length > 0 ? `${Math.max(...tracking.changes.map(c => c.changeRate)).toFixed(1)}%` : 'N/A',
                        最小変化: tracking.changes.length > 0 ? `${Math.min(...tracking.changes.map(c => c.changeRate)).toFixed(1)}%` : 'N/A'
                    });
                } else {
                    tracking.avgChangeRate = 0;
                    tracking.volatility = 0;
                }
                
                // ステータスを判定
                tracking.status = determineAsinStatus(tracking, weeks);
            });
        }
        
        // ASINのステータスを判定
        function determineAsinStatus(tracking, allWeeks) {
            const lastWeek = allWeeks[allWeeks.length - 1];
            const firstWeekData = tracking.weeklyData.get(tracking.firstSeen.toISOString());
            const lastWeekData = tracking.weeklyData.get(lastWeek);
            
            // 新商品判定（初登場から3週間以内を新商品とする）
            const weeksFromFirstSeen = allWeeks.filter(week => week >= tracking.firstSeen).length;
            const isNewProduct = weeksFromFirstSeen <= 3;
            
            // 内部検証ログ - 新商品判定
            console.log(`新商品判定 [${tracking.asin}]:`, {
                初登場週: tracking.firstSeen.toLocaleDateString('ja-JP'),
                経過週数: weeksFromFirstSeen,
                新商品判定: isNewProduct
            });
            
            if (isNewProduct) {
                return 'new';
            }
            
            // 最新週のデータがない場合は非アクティブ
            if (!lastWeekData) {
                return 'inactive';
            }
            
            // 大きな変化の検出
            if (tracking.changes.length > 0) {
                const lastChange = tracking.changes[tracking.changes.length - 1];
                
                if (lastChange.changeRate > 50) {
                    return 'surging';  // 急上昇
                } else if (lastChange.changeRate < -30) {
                    return 'declining';  // 急落
                } else if (tracking.avgChangeRate > 20) {
                    return 'growing';  // 成長傾向
                } else if (tracking.avgChangeRate < -15) {
                    return 'shrinking';  // 縮小傾向
                }
            }
            
            // 高ボラティリティ
            if (tracking.volatility > 30) {
                return 'volatile';
            }
            
            return 'stable';
        }
        
        // アラートを生成
        function generateAlerts() {
            const alerts = [];
            const weeks = _.uniq(amazonData.map(d => d.weekDate)).sort((a, b) => a - b);
            
            if (weeks.length < 2) return alerts;
            
            const lastWeek = weeks[weeks.length - 1];
            const prevWeek = weeks[weeks.length - 2];
            
            // 内部検証用ログ
            console.log('アラート生成 - 対象週:', {
                当週: lastWeek.toLocaleDateString('ja-JP'),
                前週: prevWeek.toLocaleDateString('ja-JP')
            });
            
            asinTracking.forEach((tracking, asin) => {
                const status = tracking.status;
                
                if (status === 'new') {
                    const data = tracking.weeklyData.get(lastWeek.toISOString());
                    if (data && data.sessions > 50) {
                        alerts.push({
                            type: 'info',
                            icon: '🆕',
                            title: '新商品が好調なスタート',
                            content: `「${tracking.title}」が${data.sessions}セッション獲得（${lastWeek.toLocaleDateString('ja-JP')}週）`
                        });
                    }
                } else if (status === 'surging') {
                    const lastChange = tracking.changes[tracking.changes.length - 1];
                    alerts.push({
                        type: 'success',
                        icon: '🚀',
                        title: 'セッション急上昇',
                        content: `「${tracking.title}」が${prevWeek.toLocaleDateString('ja-JP')}→${lastWeek.toLocaleDateString('ja-JP')}で${lastChange.changeRate.toFixed(1)}%増加`
                    });
                } else if (status === 'declining') {
                    const lastChange = tracking.changes[tracking.changes.length - 1];
                    alerts.push({
                        type: 'warning',
                        icon: '📉',
                        title: 'セッション急落',
                        content: `「${tracking.title}」が${prevWeek.toLocaleDateString('ja-JP')}→${lastWeek.toLocaleDateString('ja-JP')}で${Math.abs(lastChange.changeRate).toFixed(1)}%減少`
                    });
                }
            });
            
            return alerts;
        }
        
        // ファイルリストを更新
        function updateFileList() {
            const fileListEl = document.getElementById('fileList');
            fileListEl.innerHTML = '';
            
            if (uploadedFiles.size === 0) {
                fileListEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5);">CSVファイルをアップロードしてください</div>';
                return;
            }
            
            const sortedFiles = Array.from(uploadedFiles.entries()).sort((a, b) => a[1] - b[1]);
            
            sortedFiles.forEach(([fileName, weekDate]) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const dataCount = amazonData.filter(d => d.fileName === fileName).length;
                const dateStr = weekDate.toLocaleDateString('ja-JP');
                
                fileItem.innerHTML = `
                    <span class="file-name">${fileName}</span>
                    <span class="file-date">${dateStr} (${dataCount}件)</span>
                    <button class="file-remove" onclick="removeFile('${fileName}')">削除</button>
                `;
                
                fileListEl.appendChild(fileItem);
            });
        }
        
        // ファイルを削除（IndexedDBからも削除）
        async function removeFile(fileName) {
            try {
                // メモリ内データからファイルハッシュを取得
                const fileData = amazonData.filter(d => d.fileName === fileName);
                if (fileData.length > 0 && fileData[0].fileHash) {
                    // IndexedDBからも削除
                    await deleteDataFromIndexedDB(fileData[0].fileHash);
                }
                
                // メモリ内データから削除
                amazonData = amazonData.filter(d => d.fileName !== fileName);
                uploadedFiles.delete(fileName);
                
                updateFileList();
                updateDashboard();
                updateHistoryList();
                
                showNotification(`${fileName} を削除しました`, 'info');
                
            } catch (error) {
                console.error('ファイル削除エラー:', error);
                showNotification('ファイルの削除に失敗しました', 'error');
            }
        }
        
        // すべてのデータをクリア（IndexedDBからも削除）
        async function clearAllData() {
            if (!confirm('すべてのデータを削除してもよろしいですか？\n\nIndexedDBに保存されたデータも含めて完全に削除されます。')) {
                return;
            }
            
            try {
                if (db) {
                    // IndexedDBからすべてのデータを削除
                    const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
                    
                    const clearPromises = ['fileData', 'amazonData', 'uploadHistory'].map(storeName => {
                        return new Promise((resolve, reject) => {
                            const store = transaction.objectStore(storeName);
                            const request = store.clear();
                            request.onsuccess = () => resolve();
                            request.onerror = () => reject(request.error);
                        });
                    });
                    
                    await Promise.all(clearPromises);
                    console.log('IndexedDBからすべてのデータを削除しました');
                }
                
                // メモリ内データをクリア
                amazonData = [];
                uploadedFiles.clear();
                asinTracking.clear();
                
                updateFileList();
                updateDashboard();
                updateHistoryList();
                
                showNotification('すべてのデータをクリアしました', 'info');
                
            } catch (error) {
                console.error('データクリアエラー:', error);
                
                // フォールバック: メモリ内データのみクリア
                amazonData = [];
                uploadedFiles.clear();
                asinTracking.clear();
                
                updateFileList();
                updateDashboard();
                
                showNotification('メモリ内データをクリアしました（データベースエラーが発生）', 'warning');
            }
        }
        
        // データをエクスポート
        function exportData() {
            if (amazonData.length === 0) {
                showNotification('エクスポートするデータがありません', 'error');
                return;
            }
            
            // 分析結果を含むデータを作成
            const exportData = [];
            
            asinTracking.forEach((tracking, asin) => {
                const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
                
                sortedWeeks.forEach(week => {
                    const data = tracking.weeklyData.get(week);
                    exportData.push({
                        ASIN: asin,
                        商品名: tracking.title,
                        週: new Date(week).toLocaleDateString('ja-JP'),
                        セッション数: data.sessions,
                        売上: data.sales,
                        コンバージョン率: data.conversionRate,
                        ステータス: tracking.status,
                        平均変化率: tracking.avgChangeRate?.toFixed(2) || '0'
                    });
                });
            });
            
            const csv = Papa.unparse(exportData);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `asin_analysis_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('分析結果をエクスポートしました', 'success');
        }
        
        // ダッシュボードを更新
        function updateDashboard() {
            if (amazonData.length === 0) {
                document.getElementById('totalRevenue').textContent = '￥0';
                document.getElementById('activeAsins').textContent = '0';
                document.getElementById('newAsins').textContent = '0';
                document.getElementById('avgGrowth').textContent = '0%';
                document.getElementById('alertsSection').style.display = 'none';
                return;
            }
            
            // ASINトラッキングを更新
            updateAsinTracking();
            
            // 統計を計算
            updateStats();
            
            // アラートを表示
            const alerts = generateAlerts();
            displayAlerts(alerts);
            
            // 現在のビューを更新
            const activeBtn = document.querySelector('.filter-btn.active');
            if (activeBtn) {
                const view = activeBtn.dataset.view;
                updateView(view);
            }
        }
        
        // 統計を更新
        function updateStats() {
            const weeks = _.uniq(amazonData.map(d => d.weekDate)).sort((a, b) => a - b);
            const lastWeek = weeks[weeks.length - 1];
            
            // 内部検証ログ - 統計計算開始
            console.log('統計計算開始:', {
                総週数: weeks.length,
                最新週: lastWeek.toLocaleDateString('ja-JP'),
                総データ数: amazonData.length,
                追跡ASIN数: asinTracking.size
            });
            
            // 総売上
            const totalRevenue = _.sumBy(amazonData, 'sales');
            document.getElementById('totalRevenue').textContent = `￥${totalRevenue.toLocaleString()}`;
            
            // アクティブASIN数（最新週）
            const lastWeekData = amazonData.filter(d => d.weekDate.getTime() === lastWeek.getTime());
            const activeAsins = _.uniqBy(lastWeekData, 'asin').length;
            document.getElementById('activeAsins').textContent = activeAsins;
            
            // 新規ASIN数
            let newAsins = 0;
            let newAsinsList = [];
            asinTracking.forEach((tracking, asin) => {
                if (tracking.status === 'new') {
                    newAsins++;
                    newAsinsList.push({
                        asin: asin,
                        title: tracking.title.substring(0, 30) + '...',
                        firstSeen: tracking.firstSeen.toLocaleDateString('ja-JP')
                    });
                }
            });
            document.getElementById('newAsins').textContent = newAsins;
            
            // 平均成長率
            let totalGrowth = 0;
            let growthCount = 0;
            let growthDetails = [];
            asinTracking.forEach((tracking, asin) => {
                if (tracking.avgChangeRate !== undefined && !isNaN(tracking.avgChangeRate)) {
                    totalGrowth += tracking.avgChangeRate;
                    growthCount++;
                    growthDetails.push({
                        asin: asin,
                        title: tracking.title.substring(0, 30) + '...',
                        avgChangeRate: tracking.avgChangeRate.toFixed(1)
                    });
                }
            });
            const avgGrowth = growthCount > 0 ? totalGrowth / growthCount : 0;
            document.getElementById('avgGrowth').textContent = `${avgGrowth.toFixed(1)}%`;
            
            // 内部検証ログ - 統計計算結果
            console.log('統計計算結果:', {
                総売上: `￥${totalRevenue.toLocaleString()}`,
                アクティブASIN数: activeAsins,
                新規ASIN数: newAsins,
                平均成長率: `${avgGrowth.toFixed(1)}%`,
                成長率計算対象ASIN数: growthCount
            });
            
            // 新規ASIN詳細ログ
            if (newAsinsList.length > 0) {
                console.log('新規ASIN一覧:', newAsinsList);
            }
            
            // 成長率上位5件ログ
            if (growthDetails.length > 0) {
                const topGrowth = growthDetails.sort((a, b) => parseFloat(b.avgChangeRate) - parseFloat(a.avgChangeRate)).slice(0, 5);
                console.log('成長率上位5件:', topGrowth);
            }
            
            // トレンド表示（週比較を明示）
            if (weeks.length >= 2) {
                const prevWeek = weeks[weeks.length - 2];
                const prevWeekData = amazonData.filter(d => d.weekDate.getTime() === prevWeek.getTime());
                const prevActiveAsins = _.uniqBy(prevWeekData, 'asin').length;
                
                const asinChange = ((activeAsins - prevActiveAsins) / prevActiveAsins * 100);
                
                // 内部検証用ログ
                console.log('ASIN数トレンド計算:', {
                    前週: `${prevWeek.toLocaleDateString('ja-JP')}(${prevActiveAsins}件)`,
                    当週: `${lastWeek.toLocaleDateString('ja-JP')}(${activeAsins}件)`,
                    変化率: `${asinChange.toFixed(1)}%`
                });
                
                const asinsTrend = document.getElementById('asinsTrend');
                if (asinChange !== 0) {
                    const trendText = asinChange > 0 
                        ? `<span class="trend-up">↑ ${Math.abs(asinChange).toFixed(1)}%</span>`
                        : `<span class="trend-down">↓ ${Math.abs(asinChange).toFixed(1)}%</span>`;
                    const weekInfo = `<div style="font-size: 0.7em; color: rgba(255,255,255,0.5); margin-top: 2px;">
                        ${prevWeek.toLocaleDateString('ja-JP')}→${lastWeek.toLocaleDateString('ja-JP')}
                    </div>`;
                    asinsTrend.innerHTML = trendText + weekInfo;
                }
            }
        }
        
        // アラートを表示
        function displayAlerts(alerts) {
            const alertsSection = document.getElementById('alertsSection');
            const alertsList = document.getElementById('alertsList');
            
            if (alerts.length === 0) {
                alertsSection.style.display = 'none';
                return;
            }
            
            alertsSection.style.display = 'block';
            alertsList.innerHTML = '';
            
            alerts.slice(0, 5).forEach((alert, index) => {
                const alertCard = document.createElement('div');
                alertCard.className = `alert-card ${alert.type}`;
                alertCard.style.animationDelay = `${index * 0.1}s`;
                
                alertCard.innerHTML = `
                    <div class="alert-title">
                        <span>${alert.icon}</span>
                        <span>${alert.title}</span>
                    </div>
                    <div class="alert-content">${alert.content}</div>
                `;
                
                alertsList.appendChild(alertCard);
            });
        }
        
        // ビューを更新
        function updateView(viewName) {
            // すべてのビューを非表示
            document.querySelectorAll('.view-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // 選択されたビューを表示
            document.getElementById(viewName + 'View').style.display = 'block';
            
            switch(viewName) {
                case 'monitoring':
                    displayAsinMonitoring();
                    break;
                case 'timeline':
                    createTimelineChart();
                    break;
                case 'anomaly':
                    displayAnomalyDetection();
                    break;
                case 'newproducts':
                    displayNewProducts();
                    break;
                case 'advanced':
                    displayAdvancedAnalysis();
                    break;
            }
        }
        
        // ASINモニタリングを表示
        function displayAsinMonitoring() {
            const grid = document.getElementById('asinTrackingGrid');
            grid.innerHTML = '';
            
            if (asinTracking.size === 0) {
                grid.innerHTML = '<div class="loading">データがありません</div>';
                return;
            }
            
            // ステータスごとにソート
            const sortedAsins = Array.from(asinTracking.entries())
                .sort((a, b) => {
                    const statusOrder = ['new', 'surging', 'declining', 'volatile', 'growing', 'shrinking', 'stable', 'inactive'];
                    return statusOrder.indexOf(a[1].status) - statusOrder.indexOf(b[1].status);
                })
                .slice(0, 12);  // 上位12件を表示
            
            sortedAsins.forEach(([asin, tracking], index) => {
                const card = createAsinCard(asin, tracking, index);
                grid.appendChild(card);
            });
        }
        
        // ASINカードを作成
        function createAsinCard(asin, tracking, index) {
            const card = document.createElement('div');
            card.className = 'asin-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            // ステータスに応じたクラスを追加
            if (tracking.status === 'new') card.classList.add('new-product');
            else if (tracking.status === 'declining' || tracking.status === 'shrinking') card.classList.add('declining');
            else if (tracking.status === 'surging' || tracking.status === 'growing') card.classList.add('growing');
            
            // 最新のデータを取得
            const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
            const latestData = tracking.weeklyData.get(sortedWeeks[sortedWeeks.length - 1]);
            
            // 変化率（前週との比較週を明示）
            let changeDisplay = '';
            if (tracking.changes.length > 0) {
                const lastChange = tracking.changes[tracking.changes.length - 1];
                const changeClass = lastChange.changeRate > 0 ? 'trend-up' : 'trend-down';
                const arrow = lastChange.changeRate > 0 ? '↑' : '↓';
                const changeWeek = new Date(lastChange.week);
                const weeks = _.uniq(amazonData.map(d => d.weekDate)).sort((a, b) => a - b);
                const weekIndex = weeks.findIndex(w => w.toISOString() === lastChange.week);
                const prevWeekDate = weekIndex > 0 ? weeks[weekIndex - 1] : null;
                
                if (prevWeekDate) {
                    changeDisplay = `<span class="${changeClass}">${arrow} ${Math.abs(lastChange.changeRate).toFixed(1)}%</span>
                    <div style="font-size: 0.7em; color: rgba(255,255,255,0.6); margin-top: 2px;">
                        ${prevWeekDate.toLocaleDateString('ja-JP')}→${changeWeek.toLocaleDateString('ja-JP')}
                    </div>`;
                } else {
                    changeDisplay = `<span class="${changeClass}">${arrow} ${Math.abs(lastChange.changeRate).toFixed(1)}%</span>`;
                }
            }
            
            // バッジを決定
            let badge = '';
            if (tracking.status === 'new') badge = '<span class="asin-badge badge-new">NEW</span>';
            else if (tracking.status === 'surging') badge = '<span class="asin-badge badge-hot">HOT</span>';
            else if (tracking.status === 'growing') badge = '<span class="asin-badge badge-growing">成長中</span>';
            
            // スパークラインデータを準備
            const sparklineData = sortedWeeks.map(week => tracking.weeklyData.get(week).sessions);
            
            card.innerHTML = `
                <div class="asin-header">
                    <div>
                        <div class="asin-title" title="${tracking.title}">${tracking.title.substring(0, 40)}...</div>
                        <div style="color: rgba(255,255,255,0.5); font-size: 0.9em;">${asin}</div>
                    </div>
                    ${badge}
                </div>
                <div class="asin-metrics">
                    <div class="metric">
                        <div class="metric-value">${latestData.sessions}</div>
                        <div class="metric-label">セッション</div>
                        <div class="metric-change">${changeDisplay}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">￥${latestData.sales.toLocaleString()}</div>
                        <div class="metric-label">売上</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${latestData.conversionRate.toFixed(1)}%</div>
                        <div class="metric-label">CVR</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${sortedWeeks.length}週</div>
                        <div class="metric-label">追跡期間</div>
                    </div>
                </div>
                <div class="sparkline-container" id="sparkline-${asin}"></div>
            `;
            
            // クリックで詳細モーダルを表示
            card.addEventListener('click', () => showDetailModal(asin, tracking));
            
            // スパークラインを描画（少し遅延させて）
            setTimeout(() => {
                drawSparkline(`sparkline-${asin}`, sparklineData);
            }, 100 + index * 50);
            
            return card;
        }
        
        // スパークラインを描画
        function drawSparkline(containerId, data) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Container not found: ${containerId}`);
                return;
            }
            
            // 既存のcanvasを削除
            const existingCanvas = container.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = container.offsetWidth || 300;
            canvas.height = 60;
            container.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.warn('Failed to get canvas context');
                return;
            }
            
            const padding = 5;
            const width = canvas.width - padding * 2;
            const height = canvas.height - padding * 2;
            
            if (data.length < 2) {
                // データが少ない場合、ダッシュラインを描画
                ctx.strokeStyle = '#7ee8fa';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(padding, height / 2 + padding);
                ctx.lineTo(width + padding, height / 2 + padding);
                ctx.stroke();
                ctx.setLineDash([]);
                return;
            }
            
            const max = Math.max(...data);
            const min = Math.min(...data);
            const range = max - min || 1;
            
            ctx.strokeStyle = '#7ee8fa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            data.forEach((value, index) => {
                const x = padding + (index / (data.length - 1)) * width;
                const y = padding + height - ((value - min) / range) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // 点を描画
            ctx.fillStyle = '#7ee8fa';
            data.forEach((value, index) => {
                const x = padding + (index / (data.length - 1)) * width;
                const y = padding + height - ((value - min) / range) * height;
                
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        // 時系列チャートを作成
        function createTimelineChart() {
            if (amazonData.length === 0) return;
            
            const ctx = document.getElementById('timelineChart').getContext('2d');
            
            // 売り上げベースで上位20%のASINを取得
            const asinArray = Array.from(asinTracking.entries())
                .sort((a, b) => b[1].totalSales - a[1].totalSales);
            
            const top20PercentCount = Math.max(1, Math.ceil(asinArray.length * 0.2));
            const topAsins = asinArray.slice(0, top20PercentCount);
            
            // 内部検証ログ - 時系列分析対象
            console.log('時系列分析 - 上位20%選択:', {
                "総ASIN数": asinArray.length,
                "上位20%件数": top20PercentCount,
                "売上上位ASIN": topAsins.slice(0, 5).map(([asin, tracking]) => ({
                    asin: asin,
                    title: tracking.title.substring(0, 30) + '...',
                    totalSales: `￥${tracking.totalSales.toLocaleString()}`
                }))
            });
            
            const weeks = _.uniq(amazonData.map(d => d.weekDate)).sort((a, b) => a - b);
            
            const datasets = topAsins.map(([asin, tracking], index) => {
                const data = weeks.map(week => {
                    const weekData = tracking.weeklyData.get(week.toISOString());
                    return weekData ? weekData.sessions : 0;
                });
                
                const colors = [
                    'rgb(255, 126, 95)',    // --primary: #ff7e5f  
                    'rgb(254, 180, 123)',   // --secondary: #feb47b
                    'rgb(126, 238, 250)',   // --accent: #7ee8fa
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 206, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)',
                    'rgb(255, 159, 64)',
                    'rgb(199, 99, 132)',
                    'rgb(154, 162, 235)',
                    'rgb(155, 206, 86)',
                    'rgb(175, 192, 192)'
                ];
                
                return {
                    label: tracking.title.substring(0, 30),
                    data: data,
                    borderColor: colors[index],
                    backgroundColor: colors[index].replace('rgb', 'rgba').replace(')', ', 0.2)'),
                    tension: 0.4
                };
            });
            
            if (charts.timeline) {
                charts.timeline.destroy();
            }
            
            charts.timeline = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: weeks.map(w => w.toLocaleDateString('ja-JP')),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y + ' セッション';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    }
                }
            });
        }
        
        // 異常検知を表示
        function displayAnomalyDetection() {
            const anomalies = [];
            
            asinTracking.forEach((tracking, asin) => {
                if (tracking.changes.length > 0) {
                    const lastChange = tracking.changes[tracking.changes.length - 1];
                    if (Math.abs(lastChange.changeRate) > 30) {
                        anomalies.push({
                            asin: asin,
                            title: tracking.title,
                            changeRate: lastChange.changeRate,
                            absoluteChange: lastChange.absoluteChange,
                            tracking: tracking
                        });
                    }
                }
            });
            
            // 変化率でソート
            anomalies.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
            
            // チャートを作成
            const ctx = document.getElementById('anomalyChart').getContext('2d');
            
            if (charts.anomaly) {
                charts.anomaly.destroy();
            }
            
            const chartData = anomalies.slice(0, 10);
            
            charts.anomaly = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.map(a => a.title.substring(0, 30) + '...'),
                    datasets: [{
                        label: '変化率 (%)',
                        data: chartData.map(a => a.changeRate),
                        backgroundColor: chartData.map(a => 
                            a.changeRate > 0 
                                ? 'rgba(0, 255, 136, 0.6)' 
                                : 'rgba(255, 71, 87, 0.6)'
                        ),
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            callbacks: {
                                label: function(context) {
                                    return '変化率: ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            
            // カードグリッドに表示
            const grid = document.getElementById('anomalyGrid');
            grid.innerHTML = '';
            
            anomalies.slice(0, 6).forEach((anomaly, index) => {
                const card = createAsinCard(anomaly.asin, anomaly.tracking, index);
                grid.appendChild(card);
            });
        }
        
        // 新商品分析を表示（登場週と翌週を比較）
        function displayNewProducts() {
            const newProducts = [];
            const weeks = _.uniq(amazonData.map(d => d.weekDate)).sort((a, b) => a - b);
            
            asinTracking.forEach((tracking, asin) => {
                if (tracking.status === 'new') {
                    const firstWeekData = tracking.weeklyData.get(tracking.firstSeen.toISOString());
                    
                    // 翌週のデータを取得
                    const firstWeekIndex = weeks.findIndex(w => w.toISOString() === tracking.firstSeen.toISOString());
                    const secondWeek = firstWeekIndex >= 0 && firstWeekIndex < weeks.length - 1 ? weeks[firstWeekIndex + 1] : null;
                    const secondWeekData = secondWeek ? tracking.weeklyData.get(secondWeek.toISOString()) : null;
                    
                    // 成長率を計算（翌週データがある場合）
                    let growthRate = null;
                    if (secondWeekData && firstWeekData.sessions > 0) {
                        growthRate = ((secondWeekData.sessions - firstWeekData.sessions) / firstWeekData.sessions) * 100;
                    }
                    
                    // 内部検証ログ - 新商品分析
                    console.log(`新商品分析 [${asin}]:`, {
                        初週: `${tracking.firstSeen.toLocaleDateString('ja-JP')} (${firstWeekData.sessions}セッション)`,
                        翌週: secondWeekData ? `${secondWeek.toLocaleDateString('ja-JP')} (${secondWeekData.sessions}セッション)` : 'データなし',
                        成長率: growthRate ? `${growthRate.toFixed(1)}%` : '計算不可'
                    });
                    
                    newProducts.push({
                        asin: asin,
                        title: tracking.title,
                        firstWeekSessions: firstWeekData.sessions,
                        firstWeekSales: firstWeekData.sales,
                        secondWeekSessions: secondWeekData ? secondWeekData.sessions : null,
                        secondWeekSales: secondWeekData ? secondWeekData.sales : null,
                        growthRate: growthRate,
                        firstWeek: tracking.firstSeen,
                        secondWeek: secondWeek,
                        tracking: tracking
                    });
                }
            });
            
            // 成長率でソート（成長率が高い順、次に初週セッション数順）
            newProducts.sort((a, b) => {
                if (a.growthRate !== null && b.growthRate !== null) {
                    return b.growthRate - a.growthRate;
                } else if (a.growthRate !== null) {
                    return -1;
                } else if (b.growthRate !== null) {
                    return 1;
                } else {
                    return b.firstWeekSessions - a.firstWeekSessions;
                }
            });
            
            // チャートを作成
            const ctx = document.getElementById('newProductsChart').getContext('2d');
            
            if (charts.newProducts) {
                charts.newProducts.destroy();
            }
            
            charts.newProducts = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: newProducts.map(p => p.title.substring(0, 30) + '...'),
                    datasets: [
                        {
                            label: '初週セッション数',
                            data: newProducts.map(p => p.firstWeekSessions),
                            backgroundColor: 'rgba(0, 210, 255, 0.6)',
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: '翌週セッション数',
                            data: newProducts.map(p => p.secondWeekSessions || 0),
                            backgroundColor: 'rgba(255, 126, 95, 0.6)',
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: '成長率 (%)',
                            data: newProducts.map(p => p.growthRate || 0),
                            backgroundColor: 'rgba(126, 238, 250, 0.6)',
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                            borderWidth: 1,
                            yAxisID: 'y2',
                            type: 'line',
                            tension: 0.4
                        },
                        {
                            label: '初週売上 (￥)',
                            data: newProducts.map(p => p.firstWeekSales),
                            backgroundColor: 'rgba(255, 206, 86, 0.6)',
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                            borderWidth: 1,
                            yAxisID: 'y1',
                            hidden: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)'
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) {
                                    return '￥' + value.toLocaleString();
                                }
                            }
                        },
                        y2: {
                            type: 'linear',
                            display: false,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            
            // カードグリッドに表示
            const grid = document.getElementById('newProductsGrid');
            grid.innerHTML = '';
            
            if (newProducts.length === 0) {
                grid.innerHTML = '<div class="loading">新商品が見つかりません</div>';
                return;
            }
            
            newProducts.slice(0, 6).forEach((product, index) => {
                const card = createAsinCard(product.asin, product.tracking, index);
                grid.appendChild(card);
            });
        }
        
        // 詳細モーダルを表示
        function showDetailModal(asin, tracking) {
            const modal = document.getElementById('detailModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            
            modalTitle.textContent = tracking.title;
            modal.style.display = 'block';
            
            // モーダル用のチャートを作成
            const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
            const weekLabels = sortedWeeks.map(w => new Date(w).toLocaleDateString('ja-JP'));
            
            const sessionsData = sortedWeeks.map(w => tracking.weeklyData.get(w).sessions);
            const salesData = sortedWeeks.map(w => tracking.weeklyData.get(w).sales);
            const conversionData = sortedWeeks.map(w => tracking.weeklyData.get(w).conversionRate);
            
            const ctx = document.getElementById('modalChart').getContext('2d');
            
            if (modalChart) {
                modalChart.destroy();
            }
            
            modalChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: weekLabels,
                    datasets: [
                        {
                            label: 'セッション数',
                            data: sessionsData,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: '売上 (￥)',
                            data: salesData,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'CVR (%)',
                            data: conversionData,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)'
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) {
                                    return '￥' + value.toLocaleString();
                                }
                            }
                        },
                        y2: {
                            type: 'linear',
                            display: false,
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // モーダルを閉じる
        function closeModal() {
            document.getElementById('detailModal').style.display = 'none';
            if (modalChart) {
                modalChart.destroy();
                modalChart = null;
            }
        }
        
        // ビュー切り替え
        function switchView(viewName) {
            // ボタンのアクティブ状態を更新
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
            
            // ビューを更新
            updateView(viewName);
        }
        
        // ドラッグ＆ドロップイベントの設定
        function setupDragAndDrop() {
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');
            
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                await handleFiles(files);
                fileInput.value = '';
            });
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', async (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                await handleFiles(files);
            });
        }
        
        // ファイル処理（重複検出とIndexedDB保存を統合）
        async function handleFiles(files) {
            const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
            
            if (csvFiles.length === 0) {
                showNotification('CSVファイルを選択してください', 'error');
                return;
            }
            
            // ファイルを日付順にソート
            csvFiles.sort((a, b) => {
                const dateA = inferWeekFromDate(a.name);
                const dateB = inferWeekFromDate(b.name);
                if (dateA && dateB) {
                    return dateA - dateB;
                }
                return 0;
            });
            
            let successCount = 0;
            let duplicateCount = 0;
            
            for (const file of csvFiles) {
                try {
                    // ファイルハッシュを生成
                    const fileHash = await generateFileHash(file);
                    console.log(`ファイルハッシュ生成: ${file.name} -> ${fileHash.substring(0, 8)}...`);
                    
                    // 重複チェック
                    const isDuplicate = await checkDuplicateFile(fileHash);
                    if (isDuplicate) {
                        duplicateCount++;
                        showNotification(`${file.name} は既にアップロード済みです（重複検出）`, 'warning');
                        continue;
                    }
                    
                    // 簡易重複チェック（ファイル名ベース）
                    if (uploadedFiles.has(file.name)) {
                        duplicateCount++;
                        showNotification(`${file.name} は既にアップロードされています`, 'warning');
                        continue;
                    }
                    
                    const weekDate = inferWeekFromDate(file.name);
                    if (!weekDate) {
                        showNotification(`${file.name} の日付を解析できませんでした（正しい形式: BusinessReport-DD-MM-YY.csv）`, 'error');
                        continue;
                    }
                    
                    // CSVファイルを解析
                    const data = await parseCSVFile(file, weekDate);
                    
                    if (data.length > 0) {
                        // IndexedDBに保存
                        await saveFileToIndexedDB(file, weekDate, fileHash, data);
                        
                        // メモリ内データを更新
                        amazonData.push(...data);
                        uploadedFiles.set(file.name, weekDate);
                        successCount++;
                        
                        console.log(`ファイル処理完了: ${file.name} (${data.length}件のデータ)`);
                        showNotification(`${file.name} をアップロードしました（${data.length}件）`, 'success');
                    } else {
                        console.warn(`No valid data found in ${file.name}`);
                        showNotification(`${file.name} に有効なデータが見つかりませんでした`, 'warning');
                    }
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    showNotification(`${file.name} の処理中にエラーが発生しました: ${error.message}`, 'error');
                }
            }
            
            // 結果サマリーを表示
            if (successCount > 0 || duplicateCount > 0) {
                let message = '';
                if (successCount > 0) {
                    message += `${successCount}個のファイルをアップロードしました`;
                }
                if (duplicateCount > 0) {
                    if (message) message += '、';
                    message += `${duplicateCount}個の重複ファイルをスキップしました`;
                }
                
                if (successCount > 0) {
                    updateFileList();
                    updateDashboard();
                }
                
                showNotification(message, successCount > 0 ? 'success' : 'info');
            }
        }
        
        // 初期化（IndexedDB初期化と保存データ復元を含む）
        async function init() {
            try {
                // IndexedDBを初期化
                await initIndexedDB();
                
                // 保存されたデータを復元
                await restoreDataFromIndexedDB();
                
                setupDragAndDrop();
                
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        switchView(btn.dataset.view);
                    });
                });
                
                // モーダルの外側クリックで閉じる
                document.getElementById('detailModal').addEventListener('click', (e) => {
                    if (e.target.id === 'detailModal') {
                        closeModal();
                    }
                });
                
                updateFileList();
                updateHistoryList();
                
                if (amazonData.length > 0) {
                    updateDashboard();
                    showNotification(`保存されたデータを復元しました（${amazonData.length}件）`, 'info');
                } else {
                    showNotification('CSVファイルをアップロードして分析を開始してください', 'info');
                }
                
            } catch (error) {
                console.error('初期化エラー:', error);
                showNotification('データベースの初期化に失敗しました', 'error');
                
                // フォールバック処理
                setupDragAndDrop();
                updateFileList();
                showNotification('CSVファイルをアップロードして分析を開始してください', 'info');
            }
        }
        
        // IndexedDBからデータを復元
        async function restoreDataFromIndexedDB() {
            try {
                const savedData = await loadDataFromIndexedDB();
                if (savedData && savedData.length > 0) {
                    amazonData = savedData;
                    
                    // uploadedFilesマップを復元
                    const fileGroups = _.groupBy(savedData, 'fileName');
                    Object.keys(fileGroups).forEach(fileName => {
                        const firstItem = fileGroups[fileName][0];
                        uploadedFiles.set(fileName, firstItem.weekDate);
                    });
                    
                    console.log(`データ復元完了: ${savedData.length}件 (${Object.keys(fileGroups).length}ファイル)`);
                }
            } catch (error) {
                console.error('データ復元エラー:', error);
                throw error;
            }
        }
        
        // 履歴表示の切り替え
        function toggleHistoryView() {
            const historySection = document.getElementById('historySection');
            const isVisible = historySection.style.display !== 'none';
            
            if (isVisible) {
                historySection.style.display = 'none';
            } else {
                historySection.style.display = 'block';
                updateHistoryList();
            }
        }
        
        // 履歴リストを更新
        async function updateHistoryList() {
            const historyList = document.getElementById('historyList');
            
            try {
                const history = await getUploadHistory();
                
                if (history.length === 0) {
                    historyList.innerHTML = '<div class="empty-history">アップロード履歴がありません</div>';
                    return;
                }
                
                historyList.innerHTML = '';
                
                history.forEach((item, index) => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    historyItem.style.animationDelay = `${index * 0.1}s`;
                    
                    const uploadDate = new Date(item.uploadDate);
                    const weekDate = new Date(item.weekDate);
                    
                    // 現在のメモリ内データにそのファイルが既にロードされているかチェック
                    const isCurrentlyLoaded = uploadedFiles.has(item.fileName);
                    
                    historyItem.innerHTML = `
                        <div class="history-info">
                            <div class="history-filename">${item.fileName}</div>
                            <div class="history-details">
                                <span>📅 ${weekDate.toLocaleDateString('ja-JP')}</span>
                                <span>📊 ${item.recordCount}件</span>
                                <span>⏰ ${uploadDate.toLocaleDateString('ja-JP')} ${uploadDate.toLocaleTimeString('ja-JP')}</span>
                                ${isCurrentlyLoaded ? '<span style="color: #7ee8fa;">✓ 読み込み済み</span>' : ''}
                            </div>
                        </div>
                        <div class="history-actions">
                            <button class="history-btn load" onclick="loadHistoryFile('${item.hash}')" ${isCurrentlyLoaded ? 'disabled' : ''}>
                                📂 読み込み
                            </button>
                            <button class="history-btn delete" onclick="deleteHistoryFile('${item.hash}', '${item.fileName}')">
                                🗑️ 削除
                            </button>
                        </div>
                    `;
                    
                    historyList.appendChild(historyItem);
                });
                
            } catch (error) {
                console.error('履歴取得エラー:', error);
                historyList.innerHTML = '<div class="empty-history">履歴の取得に失敗しました</div>';
            }
        }
        
        // 履歴から個別ファイルを読み込み
        async function loadHistoryFile(hash) {
            try {
                if (!db) {
                    throw new Error('データベースが初期化されていません');
                }
                
                // 該当するハッシュのAmazonデータを取得
                const transaction = db.transaction(['amazonData'], 'readonly');
                const store = transaction.objectStore('amazonData');
                const index = store.index('fileHash');
                
                const data = await new Promise((resolve, reject) => {
                    const request = index.getAll(hash);
                    request.onsuccess = () => {
                        const results = request.result || [];
                        // データを復元（日付オブジェクトに変換）
                        const restoredData = results.map(item => ({
                            ...item,
                            weekDate: new Date(item.weekDate)
                        }));
                        resolve(restoredData);
                    };
                    request.onerror = () => reject(request.error);
                });
                
                if (data.length === 0) {
                    showNotification('該当するデータが見つかりませんでした', 'warning');
                    return;
                }
                
                // メモリ内データに追加（重複を避ける）
                const existingHashes = new Set(amazonData.map(item => item.fileHash).filter(Boolean));
                
                if (!existingHashes.has(hash)) {
                    amazonData.push(...data);
                    
                    // uploadedFilesマップを更新
                    const fileGroups = _.groupBy(data, 'fileName');
                    Object.keys(fileGroups).forEach(fileName => {
                        const firstItem = fileGroups[fileName][0];
                        uploadedFiles.set(fileName, firstItem.weekDate);
                    });
                    
                    updateFileList();
                    updateDashboard();
                    updateHistoryList();
                    
                    const fileName = data[0].fileName;
                    showNotification(`${fileName} を読み込みました（${data.length}件）`, 'success');
                } else {
                    showNotification('そのファイルは既に読み込まれています', 'info');
                }
                
            } catch (error) {
                console.error('ファイル読み込みエラー:', error);
                showNotification('ファイルの読み込みに失敗しました', 'error');
            }
        }
        
        // 履歴から個別ファイルを削除
        async function deleteHistoryFile(hash, fileName) {
            if (!confirm(`「${fileName}」を完全に削除してもよろしいですか？\n\n削除されたデータは復元できません。`)) {
                return;
            }
            
            try {
                // IndexedDBから削除
                await deleteDataFromIndexedDB(hash);
                
                // メモリ内データからも削除
                amazonData = amazonData.filter(item => item.fileHash !== hash);
                
                // uploadedFilesマップからも削除
                if (uploadedFiles.has(fileName)) {
                    uploadedFiles.delete(fileName);
                }
                
                updateFileList();
                updateDashboard();
                updateHistoryList();
                
                showNotification(`${fileName} を削除しました`, 'info');
                
            } catch (error) {
                console.error('ファイル削除エラー:', error);
                showNotification('ファイルの削除に失敗しました', 'error');
            }
        }
        
        // 詳細解析を表示
        function displayAdvancedAnalysis() {
            if (asinTracking.size === 0) return;
            
            // 分析データを準備
            const analysisData = [];
            asinTracking.forEach((tracking, asin) => {
                const weeks = Array.from(tracking.weeklyData.keys()).sort();
                const latestWeek = weeks[weeks.length - 1];
                const latestData = tracking.weeklyData.get(latestWeek);
                
                if (latestData && latestData.sessions > 0) {
                    const efficiency = latestData.sales / latestData.sessions; // 売上効率
                    analysisData.push({
                        asin: asin,
                        title: tracking.title,
                        sessions: latestData.sessions,
                        sales: latestData.sales,
                        conversionRate: latestData.conversionRate,
                        efficiency: efficiency,
                        totalSales: tracking.totalSales,
                        totalSessions: tracking.totalSessions
                    });
                }
            });
            
            // 内部検証ログ - 詳細解析データ
            console.log('詳細解析データ準備:', {
                対象ASIN数: analysisData.length,
                効率上位3件: analysisData.sort((a, b) => b.efficiency - a.efficiency).slice(0, 3).map(d => ({
                    asin: d.asin,
                    title: d.title.substring(0, 30) + '...',
                    効率: `￥${d.efficiency.toFixed(0)}/セッション`
                }))
            });
            
            createConversionChart(analysisData);
            createEfficiencyChart(analysisData);
            createMatrixChart(analysisData);
        }
        
        // コンバージョン率分析チャート
        function createConversionChart(data) {
            const ctx = document.getElementById('conversionChart').getContext('2d');
            
            if (charts.conversion) {
                charts.conversion.destroy();
            }
            
            // コンバージョン率でソート
            const sortedData = data.sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 15);
            
            charts.conversion = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedData.map(d => d.title.substring(0, 25) + '...'),
                    datasets: [{
                        label: 'コンバージョン率 (%)',
                        data: sortedData.map(d => d.conversionRate),
                        backgroundColor: 'rgba(255, 126, 95, 0.6)',
                        borderColor: 'rgba(255, 126, 95, 0.8)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'rgba(255, 255, 255, 0.8)' }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            callbacks: {
                                label: function(context) {
                                    return `CVR: ${context.parsed.y.toFixed(2)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45
                            }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) { return value + '%'; }
                            }
                        }
                    }
                }
            });
        }
        
        // 売上効率分析チャート
        function createEfficiencyChart(data) {
            const ctx = document.getElementById('efficiencyChart').getContext('2d');
            
            if (charts.efficiency) {
                charts.efficiency.destroy();
            }
            
            // 売上効率でソート
            const sortedData = data.sort((a, b) => b.efficiency - a.efficiency).slice(0, 15);
            
            charts.efficiency = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedData.map(d => d.title.substring(0, 25) + '...'),
                    datasets: [{
                        label: '売上効率 (￥/セッション)',
                        data: sortedData.map(d => d.efficiency),
                        backgroundColor: 'rgba(254, 180, 123, 0.6)',
                        borderColor: 'rgba(254, 180, 123, 0.8)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'rgba(255, 255, 255, 0.8)' }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            callbacks: {
                                label: function(context) {
                                    return `効率: ￥${context.parsed.y.toFixed(0)}/セッション`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45
                            }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) { return '￥' + value.toFixed(0); }
                            }
                        }
                    }
                }
            });
        }
        
        // パフォーマンスマトリックスチャート
        function createMatrixChart(data) {
            const ctx = document.getElementById('matrixChart').getContext('2d');
            
            if (charts.matrix) {
                charts.matrix.destroy();
            }
            
            // バブルチャート用データ（上位20件）
            const bubbleData = data.sort((a, b) => b.totalSales - a.totalSales).slice(0, 20).map(d => ({
                x: d.sessions,           // セッション数（X軸）
                y: d.efficiency,         // 売上効率（Y軸）
                r: Math.sqrt(d.totalSales / 10000), // 総売上に比例したバブルサイズ
                label: d.title.substring(0, 30),
                asin: d.asin,
                totalSales: d.totalSales
            }));
            
            charts.matrix = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'セッション数 vs 売上効率',
                        data: bubbleData,
                        backgroundColor: 'rgba(126, 238, 250, 0.6)',
                        borderColor: 'rgba(126, 238, 250, 0.8)',
                        borderWidth: 1,
                        pointRadius: bubbleData.map(d => Math.max(3, Math.min(15, d.r)))
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'rgba(255, 255, 255, 0.8)' }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            callbacks: {
                                title: function(context) {
                                    return bubbleData[context[0].dataIndex].label;
                                },
                                label: function(context) {
                                    const point = bubbleData[context.dataIndex];
                                    return [
                                        `セッション数: ${point.x}`,
                                        `売上効率: ￥${point.y.toFixed(0)}/セッション`,
                                        `総売上: ￥${point.totalSales.toLocaleString()}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                            title: {
                                display: true,
                                text: 'セッション数',
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                callback: function(value) { return '￥' + value.toFixed(0); }
                            },
                            title: {
                                display: true,
                                text: '売上効率 (￥/セッション)',
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    }
                }
            });
        }
        
        // ページ読み込み時に初期化
        document.addEventListener('DOMContentLoaded', init);
