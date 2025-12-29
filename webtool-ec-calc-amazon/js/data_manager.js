class DataManager {
    constructor() {
        this.data = [];
        this.processedData = {};
        this.periods = new Map();
        this.loadedFiles = new Map();
        this.orderTypeMap = new Map();
        this.productSettings = {};
        this.dbName = 'AmazonDashboardDB';
        this.dbVersion = 2;
        this.db = null;
    }

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
                if (!db.objectStoreNames.contains('fileData')) {
                    const store = db.createObjectStore('fileData', { keyPath: 'fileName' });
                    store.createIndex('fileName', 'fileName', { unique: true });
                }
                if (db.objectStoreNames.contains('monthlyData')) {
                    db.deleteObjectStore('monthlyData');
                }
            };
        });
    }

    async loadDataFromDB() {
        try {
            const transaction = this.db.transaction(['fileData'], 'readonly');
            const store = transaction.objectStore('fileData');
            const request = store.getAll();
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const savedData = request.result;
                    this.loadedFiles.clear();
                    savedData.forEach(fileData => {
                        this.loadedFiles.set(fileData.fileName, {
                            data: fileData.data,
                            fileName: fileData.fileName,
                            fileSize: fileData.fileSize,
                            timestamp: fileData.timestamp,
                            sourceType: fileData.sourceType || this.inferSourceType(fileData.data)
                        });
                    });
                    
                    if (savedData.length > 0) {
                        this.rebuildAllData();
                    }
                    resolve(savedData.length > 0);
                };
            });
        } catch (error) {
            console.log('IndexedDBからのデータ読み込みに失敗:', error);
            return false;
        }
    }

    async saveDataToDB(fileName, data, fileSize, sourceType) {
        try {
            const transaction = this.db.transaction(['fileData'], 'readwrite');
            const store = transaction.objectStore('fileData');
            
            const fileData = {
                fileName: fileName,
                data: data,
                fileSize: fileSize,
                timestamp: new Date().toISOString(),
                sourceType: sourceType
            };
            
            await store.put(fileData);
            console.log(`${fileName}のデータを保存しました`);
        } catch (error) {
            console.error('データベースへの保存に失敗:', error);
        }
    }

    async removeFileFromDB(fileName) {
        try {
            const transaction = this.db.transaction(['fileData'], 'readwrite');
            const store = transaction.objectStore('fileData');
            await store.delete(fileName);
            console.log(`${fileName}のデータを削除しました`);
        } catch (error) {
            console.error('データベースからの削除に失敗:', error);
        }
    }

    async getFileFromDB(fileName) {
        const transaction = this.db.transaction(['fileData'], 'readonly');
        const store = transaction.objectStore('fileData');
        const request = store.get(fileName);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    rebuildAllData() {
        console.log('データ再構築開始 - loadedFiles:', this.loadedFiles.size);
        
        this.data = [];
        this.processedData = {};
        this.periods.clear();
        this.orderTypeMap = new Map();
        
        this.loadedFiles.forEach((fileData) => {
            // 子ASINデータは通常の集計には含めない
            if (fileData.sourceType === 'child-asin') return;
            this.data.push(...fileData.data);
        });
        
        console.log(`統合完了 - 総データ数: ${this.data.length}件`);
        this.processData();
    }

    processData() {
        console.log('データ処理開始 - 入力データ数:', this.data.length);
        
        this.processedData = this.aggregateData(this.data);
        
        const monthlyRows = new Map();
        this.data.forEach(row => {
            if (!row['日付']) return;
            const dateObj = new Date(row['日付']);
            const month = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月`;
            if (!monthlyRows.has(month)) monthlyRows.set(month, []);
            monthlyRows.get(month).push(row);
        });

        this.periods.clear();
        monthlyRows.forEach((rows, month) => {
            const periodData = this.aggregateData(rows);
            periodData.rawData = rows;
            this.periods.set(month, periodData);
            console.log(`${month}: ${periodData.transactionCount}件のトランザクション`);
        });
    }

    aggregateData(rows) {
        const result = this.getEmptyData();
        result.transactionCount = rows.length;
        
        const orderTypeMap = new Map();

        rows.forEach(row => {
            if (row.__source === 'selmon') {
                this.processSelmonRow(row, result, orderTypeMap);
                return;
            }
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
            
            if (transactionType === 'Amazonに支払う額 | 出品者からの返済額') {
                return;
            }
            
            const isMultiChannel = transactionType === '注文に対する支払い' && 
                                   productPrice === 0 && 
                                   promotionDiscount === 0 && 
                                   amazonFees < 0;

            if (date) {
                if (!result.dailyData[date]) {
                    result.dailyData[date] = {
                        sales: 0,
                        fees: 0,
                        profit: 0,
                        orders: new Set(),
                        refunds: 0
                    };
                }

                let effectiveTransactionType = transactionType;
                
                if (isMultiChannel && transactionType === '注文に対する支払い') {
                    effectiveTransactionType = 'マルチチャネル取引';
                }
                
                if (transactionType === '注文に対する支払い' && !isMultiChannel) {
                    if (productPrice > 0) {
                        const type = '注文に対する支払い（商品価格合計）';
                        if (!result.transactionTypes[type]) result.transactionTypes[type] = { count: 0, amount: 0 };
                        result.transactionTypes[type].count++;
                        result.transactionTypes[type].amount += productPrice;
                    }
                    if (other > 0) {
                        const type = '注文に対する支払い（その他）';
                        if (!result.transactionTypes[type]) result.transactionTypes[type] = { count: 0, amount: 0 };
                        result.transactionTypes[type].count++;
                        result.transactionTypes[type].amount += other;
                    }
                } else {
                    if (!result.transactionTypes[effectiveTransactionType]) {
                        result.transactionTypes[effectiveTransactionType] = { count: 0, amount: 0 };
                    }
                    result.transactionTypes[effectiveTransactionType].count++;
                    result.transactionTypes[effectiveTransactionType].amount += total;
                }

                if (productDetail && productDetail !== '不明') {
                    if (!result.productData[productDetail]) {
                        result.productData[productDetail] = { sales: 0, fees: 0, profit: 0, count: 0 };
                    }
                    if (!result.productFeeData[productDetail]) {
                        result.productFeeData[productDetail] = { normalFees: [], multiChannelFees: [] };
                    }
                }

                if (isMultiChannel && transactionType === '注文に対する支払い') {
                    const multiChannelFee = Math.abs(amazonFees);
                    result.multiChannelData.count++;
                    result.multiChannelData.totalAmount += multiChannelFee;
                    result.multiChannelData.orders.push({
                        date: date,
                        orderNumber: orderNumber,
                        product: productDetail,
                        amount: multiChannelFee,
                        seller: seller
                    });
                }

                if (transactionType === '注文に対する支払い') {
                    const sales = productPrice + other;
                    const salesFees = Math.abs(amazonFees) + Math.abs(promotionDiscount);
                    
                    result.salesBreakdown.productPrice += productPrice;
                    result.salesBreakdown.otherAmount += other;

                    const promotionDiscountAbs = Math.abs(promotionDiscount);
                    const amazonFeesAbs = Math.abs(amazonFees);

                    const isVineProduct = productPrice > 0 && Math.abs(productPrice - promotionDiscountAbs) < 0.01;
                    
                    if (isVineProduct) {
                        result.vineData.count++;
                        result.vineData.totalAmount += productPrice;
                        result.vineData.products.push({
                            date: date,
                            product: productDetail,
                            amount: productPrice,
                            orderNumber: orderNumber
                        });
                    }

                    result.salesFeeBreakdown.promotionDiscount += promotionDiscountAbs;
                    if (isMultiChannel) {
                        result.salesFeeBreakdown.multiChannelFees += amazonFeesAbs;
                    } else {
                        result.salesFeeBreakdown.amazonFees += amazonFeesAbs;
                    }

                    result.totalSales += sales;
                    result.totalSalesFees += salesFees;
                    result.totalOrderSalesFees += salesFees;
                    result.totalFees += salesFees;

                    result.dailyData[date].sales += sales;
                    result.dailyData[date].fees += salesFees;

                    const orderId = orderNumber || `${date}_${productDetail}_${Math.abs(total)}`;
                    result.dailyData[date].orders.add(orderId);
                    orderTypeMap.set(orderId, isMultiChannel ? 'multiChannel' : 'amazon');

                    if (productDetail && productDetail !== '不明') {
                        result.productData[productDetail].sales += sales;
                        result.productData[productDetail].fees += salesFees;
                        result.productData[productDetail].count++;
                        
                        const feeAmount = Math.abs(amazonFees);
                        if (isMultiChannel) {
                            result.productFeeData[productDetail].multiChannelFees.push(feeAmount);
                        } else {
                            result.productFeeData[productDetail].normalFees.push(feeAmount);
                        }
                    }
                } else if (transactionType === '返金') {
                    const refundAmount = Math.abs(total);
                    result.totalRefunds += refundAmount;
                    result.refundCount += 1;
                    result.dailyData[date].refunds += refundAmount;
                    result.totalRefundAmount += total;
                    result.fbaFeeBreakdown.refundFees += refundAmount;
                } else if (transactionType === '在庫の払い戻し') {
                    result.totalInventoryRefund += total;
                } else {
                    this.processFbaFees(row, result.fbaFeeBreakdown);
                }
            }
        });

        const allUniqueOrders = new Set();
        Object.values(result.dailyData).forEach(day => {
            day.orders.forEach(orderId => allUniqueOrders.add(orderId));
        });
        
        const amazonUniqueOrders = new Set();
        const selmonOrders = new Set();
        allUniqueOrders.forEach(orderId => {
            const orderType = orderTypeMap.get(orderId);
            if (orderType === 'multiChannel') return;
            if (orderType === 'selmon') {
                selmonOrders.add(orderId);
            } else {
                amazonUniqueOrders.add(orderId);
            }
        });
        
        result.orderBreakdown = { 
            amazonOrders: amazonUniqueOrders.size,
            multiChannelOrders: result.multiChannelData.count,
            selmonOrders: selmonOrders.size
        };
        
        result.orderCount = result.orderBreakdown.amazonOrders + 
                           result.orderBreakdown.multiChannelOrders + 
                           result.orderBreakdown.selmonOrders;
        
        result.totalFbaFees = Object.entries(result.fbaFeeBreakdown)
            .reduce((sum, [, fee]) => sum + fee, 0);
        
        result.totalSales += result.selmonSummary.totalSales;
        result.totalExpenses = result.totalSalesFees + result.totalFbaFees + result.selmonSummary.totalExpenses;
        
        const grossProfit = result.totalSales - (result.totalSalesFees + result.selmonSummary.totalExpenses);
        result.totalProfit = grossProfit - result.totalFbaFees + result.totalInventoryRefund;
        
        Object.keys(result.dailyData).forEach(date => {
            const dayData = result.dailyData[date];
            dayData.profit = dayData.sales - dayData.fees;
        });
        
        Object.keys(result.productData).forEach(product => {
            const productData = result.productData[product];
            productData.profit = productData.sales - productData.fees;
        });

        return result;
    }

    getEmptyData() {
        return {
            totalSales: 0,
            totalSalesFees: 0,
            totalOrderSalesFees: 0,
            totalFees: 0,
            totalFbaFees: 0,
            totalExpenses: 0,
            totalProfit: 0,
            totalRefunds: 0,
            totalRefundAmount: 0,
            totalInventoryRefund: 0,
            refundCount: 0,
            orderCount: 0,
            transactionCount: 0,
            dailyData: {},
            transactionTypes: {},
            productData: {},
            fbaFeeBreakdown: {
                returnFees: 0, shippingFees: 0, marketplaceFees: 0, storageFees: 0,
                monthlyFees: 0, advertisingFees: 0, couponFees: 0, refundFees: 0, otherFees: 0
            },
            salesFeeBreakdown: { promotionDiscount: 0, amazonFees: 0, multiChannelFees: 0 },
            vineData: { count: 0, totalAmount: 0, products: [] },
            multiChannelData: { count: 0, totalAmount: 0, orders: [] },
            salesBreakdown: { productPrice: 0, otherAmount: 0 },
            orderBreakdown: { amazonOrders: 0, multiChannelOrders: 0, selmonOrders: 0 },
            productFeeData: {},
            selmonSummary: {
                totalSales: 0,
                totalExpenses: 0,
                categoryTotals: {
                    sales: 0,
                    advertising: 0,
                    other: 0
                },
                mallSales: {}
            },
            selmonDailyData: {}
        };
    }

    processFbaFees(row, breakdown) {
        const transactionType = row['トランザクションの種類'];
        const productDetail = row['商品の詳細'] || '';
        const amazonFees = parseFloat(row['Amazon手数料']) || 0;
        const other = parseFloat(row['その他']) || 0;
        const productPrice = parseFloat(row['商品価格合計']) || 0;

        if (transactionType === 'サービス料金' && productDetail === 'FBA在庫の返送手数料') {
            breakdown.returnFees += Math.abs(amazonFees);
        } else if (transactionType === 'サービス料金' && productDetail === '納品時の輸送手数料') {
            breakdown.shippingFees += Math.abs(other);
        } else if (transactionType === 'マーケットプレイス配送サービス' && productDetail === '請求') {
            breakdown.marketplaceFees += Math.abs(productPrice) + Math.abs(other);
        } else if (transactionType === 'サービス料金' && productDetail === 'FBA保管手数料：') {
            breakdown.storageFees += Math.abs(other);
        } else if (transactionType === 'サービス料金' && productDetail === '月額登録料：') {
            breakdown.monthlyFees += Math.abs(amazonFees);
        } else if (transactionType === 'サービス料金' && productDetail === '広告費用') {
            breakdown.advertisingFees += Math.abs(amazonFees);
        } else if (transactionType === 'サービス料金' && productDetail.includes('クーポン')) {
            breakdown.couponFees += Math.abs(amazonFees);
        } else {
            const fee = Math.abs(amazonFees) + Math.abs(other);
            if (fee > 0) {
                breakdown.otherFees += fee;
            }
        }
    }

    processSelmonRow(row, result, orderTypeMap) {
        const date = row['日付'] || row['売上日時'];
        if (!date) return;
        const normalizedDate = this.normalizeDateKey(date);

        if (!result.dailyData[date]) {
            result.dailyData[date] = {
                sales: 0,
                fees: 0,
                profit: 0,
                orders: new Set(),
                refunds: 0
            };
        }
        if (normalizedDate && !result.selmonDailyData[normalizedDate]) {
            result.selmonDailyData[normalizedDate] = { sales: 0, expenses: 0 };
        }

        const category = (row['セルモン_売上区分名'] || row['売上区分名'] || '').trim() || '不明';
        const detail = row['セルモン_明細'] || row['明細'] || row['商品の詳細'] || 'セルモン商品';
        const amount = parseFloat(row['セルモン_金額']) || parseFloat(row['税込合計金額(円)']) || parseFloat(row['合計 (JPY)']) || 0;
        const mall = row['セルモン_モール名'] || row['モール名'] || 'モール不明';
        const orderNumber = row['注文番号'] || row['マルチチャネル出荷明細番号'] || row['明細ID'] || `${date}_${detail}`;
        const quantityValue = Number(row['セルモン_個数'] || row['個数'] || 1);
        const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1;

        const transactionKey = `セルモン / ${category}`;
        if (!result.transactionTypes[transactionKey]) {
            result.transactionTypes[transactionKey] = { count: 0, amount: 0 };
        }
        result.transactionTypes[transactionKey].count++;
        result.transactionTypes[transactionKey].amount += amount;

        if (category === '販売売上') {
            const saleAmount = amount;
            result.selmonSummary.totalSales += saleAmount;
            result.selmonSummary.categoryTotals.sales += saleAmount;
            if (!result.selmonSummary.mallSales[mall]) {
                result.selmonSummary.mallSales[mall] = { amount: 0, quantity: 0 };
            }
            result.selmonSummary.mallSales[mall].amount += saleAmount;
            result.selmonSummary.mallSales[mall].quantity += quantity;
            if (normalizedDate) {
                result.selmonDailyData[normalizedDate].sales += saleAmount;
            }
        
            result.dailyData[date].sales += saleAmount;
            result.dailyData[date].profit += saleAmount;
            const productName = row['商品の詳細'] || `[セルモン] ${detail}`;
            if (!result.productData[productName]) {
                result.productData[productName] = { sales: 0, fees: 0, profit: 0, count: 0 };
            }
            result.productData[productName].sales += saleAmount;
            result.productData[productName].profit += saleAmount;
            result.productData[productName].count += quantity;

            const orderId = `selmon_${orderNumber}`;
            result.dailyData[date].orders.add(orderId);
            orderTypeMap.set(orderId, 'selmon');
        } else {
            const expenseAmount = Math.abs(amount);
            result.selmonSummary.totalExpenses += expenseAmount;
            if (category === '広告費') {
                result.selmonSummary.categoryTotals.advertising += expenseAmount;
            } else {
                result.selmonSummary.categoryTotals.other += expenseAmount;
            }
            result.dailyData[date].fees += expenseAmount;
            result.dailyData[date].profit -= expenseAmount;
            if (normalizedDate) {
                result.selmonDailyData[normalizedDate].expenses += expenseAmount;
            }
        }
    }

    normalizeDateKey(value) {
        if (!value) return '';
        const dateObj = new Date(value);
        if (!isNaN(dateObj)) {
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            return `${year}/${month}/${day}`;
        }
        return value;
    }

    async parseCSVToArray(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    const fields = (results.meta && results.meta.fields) ? results.meta.fields : [];
                    if (this.isSelmonCsv(fields)) {
                        const rows = this.normalizeSelmonRows(results.data);
                        resolve({ rows, type: 'selmon' });
                        return;
                    }
                    if (this.isAmazonCsv(fields)) {
                        const rows = this.normalizeAmazonRows(results.data);
                        resolve({ rows, type: 'amazon' });
                        return;
                    }
                    console.warn('認識できないCSVフォーマットのため読み込みをスキップしました:', file.name);
                    resolve({ rows: [], type: 'unknown' });
                },
                error: (error) => {
                    console.error('CSV解析エラー:', error);
                    resolve({ rows: [], type: 'unknown' });
                }
            });
        });
    }

    isAmazonCsv(fields) {
        return fields.includes('日付') && fields.includes('トランザクションの種類');
    }

    isSelmonCsv(fields) {
        return fields.includes('売上日時') && fields.includes('売上区分名') && fields.includes('税込合計金額(円)');
    }

    normalizeAmazonRows(rows) {
        return rows
            .filter(row => row['日付'] && row['トランザクションの種類'])
            .map(row => ({ ...row, __source: 'amazon' }));
    }

    normalizeSelmonRows(rows) {
        return rows
            .filter(row => row['売上日時'] && row['売上区分名'] && row['税込合計金額(円)'])
            .map(row => {
                const amount = parseFloat(row['税込合計金額(円)']) || 0;
                const detail = row['明細'] || '不明';
                const normalized = { ...row };
                normalized.__source = 'selmon';
                normalized['日付'] = this.normalizeDateKey(row['売上日時']);
                normalized['トランザクションの種類'] = `セルモン/${row['売上区分名']}`;
                normalized['商品の詳細'] = `[セルモン] ${detail}`;
                normalized['注文番号'] = row['マルチチャネル出荷明細番号'] || row['明細ID'] || `SEL-${row['売上日時']}-${row['売上区分名']}`;
                normalized['合計 (JPY)'] = amount;
                normalized['セルモン_売上区分名'] = row['売上区分名'];
                normalized['セルモン_明細'] = detail;
                normalized['セルモン_モール名'] = row['モール名'] || '';
                normalized['セルモン_金額'] = amount;
                normalized['セルモン_個数'] = row['個数'] ? Number(row['個数']) : null;
                return normalized;
            });
    }

    inferSourceType(rows) {
        if (!rows || rows.length === 0) return 'amazon';
        if (rows[0].__source) return rows[0].__source;
        if (rows[0]['売上日時'] || rows[0]['売上区分名']) return 'selmon';
        return 'amazon';
    }

    loadProductSettings() {
        try {
            const settings = localStorage.getItem('amazon_dashboard_product_settings');
            if (settings) {
                this.productSettings = JSON.parse(settings);
            }
        } catch (e) {
            console.error('設定の読み込みに失敗しました', e);
        }
    }

    saveProductSettings(newSettings) {
        this.productSettings = newSettings;
        localStorage.setItem('amazon_dashboard_product_settings', JSON.stringify(this.productSettings));
    }

    getCurrentData(currentPeriod, currentSubPeriod) {
        if (currentPeriod === 'all' || !currentPeriod) {
            if (!this.processedData || Object.keys(this.processedData).length === 0) {
                this.rebuildAllData();
            }
            return this.processedData;
        }
        
        const periodData = this.periods.get(currentPeriod);
        if (!periodData) {
            return this.getEmptyData();
        }
        
        if (currentSubPeriod !== 'all' && periodData.rawData) {
            const filteredRows = periodData.rawData.filter(row => {
                if (!row['日付']) return false;
                const date = new Date(row['日付']);
                const day = date.getDate();
                
                if (currentSubPeriod === 'early') return day >= 1 && day <= 10;
                if (currentSubPeriod === 'middle') return day >= 11 && day <= 20;
                if (currentSubPeriod === 'late') return day >= 21;
                return true;
            });
            return this.aggregateData(filteredRows);
        }
        
        if (!periodData.hasOwnProperty('transactionCount')) {
            periodData.transactionCount = 0;
        }
        return periodData;
    }

    calculateFeeStats(fees) {
        if (fees.length === 0) {
            return { count: '-', avg: '-', max: '-', min: '-', cv: '-', cvValue: 0 };
        }
        
        const count = fees.length;
        const sum = fees.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        const max = Math.max(...fees);
        const min = Math.min(...fees);
        
        const variance = fees.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
        const stdDev = Math.sqrt(variance);
        const cv = avg > 0 ? stdDev / avg : 0;
        
        return {
            count: count.toString(),
            avg: avg, // Raw number for formatting later
            max: max,
            min: min,
            cv: (cv * 100).toFixed(1) + '%',
            cvValue: cv
        };
    }

    calculateFeeStatsForCSV(fees) {
        if (fees.length === 0) {
            return { count: 0, avg: 0, max: 0, min: 0, cv: 0 };
        }
        
        const count = fees.length;
        const sum = fees.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        const max = Math.max(...fees);
        const min = Math.min(...fees);
        
        const variance = fees.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
        const stdDev = Math.sqrt(variance);
        const cv = avg > 0 ? (stdDev / avg * 100).toFixed(1) : 0;
        
        return {
            count: count,
            avg: Math.round(avg),
            max: Math.round(max),
            min: Math.round(min),
            cv: cv
        };
    }

    // CSV Generation Methods
    generateDailyCSV(data) {
        let csv = '日付,売上,売上手数料,利益,利益率,注文数\n';
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
            return !(dayData.sales === 0 && dayData.fees === 0 && dayData.profit === 0 && dayData.orders === 0);
        });
        
        // Sort by date asc
        dailyDataArray.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        dailyDataArray.forEach(dayData => {
            csv += `${dayData.date},${dayData.sales},${dayData.fees},${dayData.profit},${dayData.margin.toFixed(1)}%,${dayData.orders}\n`;
        });
        return csv;
    }

    generateTransactionCSV(data) {
        let csv = '取引種別,件数,金額,構成比\n';
        const totalAmount = Object.values(data.transactionTypes).reduce((sum, type) => sum + Math.abs(type.amount), 0);
        
        Object.entries(data.transactionTypes)
            .sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount))
            .forEach(([type, typeData]) => {
                const displayType = type === 'サービス料金' ? 'サービス料金（月額登録料、FBA保管手数料、納品時の輸送手数料など）' : type;
                const percent = totalAmount > 0 ? (Math.abs(typeData.amount) / totalAmount * 100).toFixed(1) : 0;
                csv += `"${displayType}",${typeData.count},${typeData.amount},${percent}%\n`;
            });
        return csv;
    }

    generateProductCSV(data) {
        let csv = '商品,売上,売上手数料,利益,利益率,販売個数\n';
        Object.entries(data.productData)
            .sort((a, b) => b[1].sales - a[1].sales)
            .forEach(([product, productData]) => {
                const setting = this.productSettings[product] || {};
                const displayName = setting.fullName || product;
                const margin = productData.sales > 0 ? (productData.profit / productData.sales * 100).toFixed(1) : 0;
                csv += `"${displayName}",${productData.sales},${productData.fees},${productData.profit},${margin}%,${productData.count}\n`;
            });
        return csv;
    }

    generateProductFeeCSV(data) {
        let csv = '商品,通常注文_件数,通常注文_平均手数料,通常注文_最大手数料,通常注文_最小手数料,通常注文_CV値,マルチチャネル_件数,マルチチャネル_平均手数料,マルチチャネル_最大手数料,マルチチャネル_最小手数料,マルチチャネル_CV値\n';
        Object.entries(data.productFeeData || {})
            .filter(([product, feeData]) => feeData.normalFees.length > 0 || feeData.multiChannelFees.length > 0)
            .sort((a, b) => b[1].normalFees.length - a[1].normalFees.length)
            .forEach(([product, feeData]) => {
                const setting = this.productSettings[product] || {};
                const displayName = setting.fullName || product;
                const normalStats = this.calculateFeeStatsForCSV(feeData.normalFees);
                const multiStats = this.calculateFeeStatsForCSV(feeData.multiChannelFees);
                csv += `"${displayName}",${normalStats.count},${normalStats.avg},${normalStats.max},${normalStats.min},${normalStats.cv},${multiStats.count},${multiStats.avg},${multiStats.max},${multiStats.min},${multiStats.cv}\n`;
            });
        return csv;
    }

    generateFbaCSV(data) {
        let csv = 'その他手数料項目,金額,構成比\n';
        const fbaFeeItems = [
            { key: 'shippingFees', label: '納品時の輸送手数料' },
            { key: 'storageFees', label: 'FBA保管手数料' },
            { key: 'advertisingFees', label: '広告費用' },
            { key: 'couponFees', label: 'クーポンパフォーマンスに基づく料金' },
            { key: 'marketplaceFees', label: 'マーケットプレイス配送サービス（請求）' },
            { key: 'refundFees', label: '返金' },
            { key: 'otherFees', label: 'その他手数料合計' }
        ];
        
        const totalFbaFeesForDisplay = Object.values(data.fbaFeeBreakdown).reduce((sum, fee) => sum + fee, 0);
        const totalExpenses = Object.entries(data.fbaFeeBreakdown)
            .filter(([key]) => key !== 'refundFees')
            .reduce((sum, [, fee]) => sum + fee, 0);
        
        fbaFeeItems.forEach(item => {
            const fee = data.fbaFeeBreakdown[item.key];
            if (fee > 0) {
                const percent = totalFbaFeesForDisplay > 0 ? (fee / totalFbaFeesForDisplay * 100).toFixed(1) : 0;
                csv += `${item.label},${fee},${percent}%\n`;
            }
        });
        
        if (totalExpenses > 0) {
            csv += `合計経費（返金除く）,${totalExpenses},100.0%\n`;
        }
        return csv;
    }

    generateMultiChannelCSV(data) {
        let csv = '日付,注文番号,商品,金額,出品サービス\n';
        if (data.multiChannelData && data.multiChannelData.orders && data.multiChannelData.orders.length > 0) {
            data.multiChannelData.orders
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach(order => {
                    csv += `${order.date},"${order.orderNumber || '-'}","${order.product || '-'}",${order.amount},"${order.seller}"\n`;
                });
        }
        return csv;
    }

    generateProductNetProfitCSV(data) {
        let csv = '商品,親ASIN,売上,売上手数料,原価・諸費用合計,純利益,純利益率,販売個数\n';
        Object.entries(data.productData)
            .sort((a, b) => b[1].sales - a[1].sales)
            .forEach(([product, productData]) => {
                const setting = this.productSettings[product] || {};
                const costPrice = parseFloat(setting.costPrice);
                const expense = parseFloat(setting.expense);
                const hasSettings = !isNaN(costPrice) && !isNaN(expense);
                const displayName = setting.fullName || product;

                let totalCost = 0;
                let netProfit = 0;
                let netMargin = 0;

                if (hasSettings) {
                    const count = productData.count;
                    totalCost = (costPrice + expense) * count;
                    netProfit = productData.profit - totalCost;
                    netMargin = productData.sales > 0 ? (netProfit / productData.sales * 100) : 0;
                }

                const parentAsin = setting.parentAsin || '';
                const costStr = hasSettings ? totalCost : '';
                const profitStr = hasSettings ? netProfit : '';
                const marginStr = hasSettings ? netMargin.toFixed(1) + '%' : '';

                csv += `"${displayName}","${parentAsin}",${productData.sales},${productData.fees},${costStr},${profitStr},${marginStr},${productData.count}\n`;
            });
        return csv;
    }

    generateInventoryForecastData() {
        const allData = this.data;
        const productMonthlyStats = {};

        // 1. 商品・月ごとの販売数を集計
        allData.forEach(row => {
            if (!row['日付'] || row.__source === 'selmon' || row['トランザクションの種類'] !== '注文に対する支払い') return;
            
            const date = new Date(row['日付']);
            const month = date.getMonth(); // 0-11
            const year = date.getFullYear();
            const product = row['商品の詳細'];
            
            if (!product || product === '不明') return;

            if (!productMonthlyStats[product]) {
                productMonthlyStats[product] = Array(12).fill(0).map(() => ({ total: 0, years: new Set() }));
            }

            productMonthlyStats[product][month].total++;
            productMonthlyStats[product][month].years.add(year);
        });

        // 2. 平均販売数を計算し、仕入れ推奨月（1ヶ月前）にマッピング
        const result = {};

        Object.keys(productMonthlyStats).forEach(product => {
            const forecast = Array(12).fill(0);
            const forecastDetails = Array(12).fill(null);
            
            // 各月の予測販売数を計算（平均）
            const monthlyForecast = productMonthlyStats[product].map(stat => {
                const yearCount = stat.years.size;
                return yearCount > 0 ? Math.ceil(stat.total / yearCount) : 0;
            });

            // 仕入れ推奨月にマッピング
            // 仕入れ月 M の推奨数 = 販売月 M+1 の予測数
            for (let i = 0; i < 12; i++) {
                const salesMonth = (i + 1) % 12; // 0(1月) -> 1(2月), 11(12月) -> 0(1月)
                forecast[i] = monthlyForecast[salesMonth];
                
                // 詳細データを保存
                forecastDetails[i] = {
                    salesMonth: salesMonth + 1, // 表示用月 (1-12)
                    avgSales: monthlyForecast[salesMonth], // 平均販売数（=推奨仕入数）
                    yearCount: productMonthlyStats[product][salesMonth].years.size // データ年数
                };
            }

            // シーズン判定 (販売月ベース)
            // forecast[i] は i+1月の仕入れ数 = i+2月の販売予測
            // 春(3-5月販売) = 2-4月仕入れ = forecast[1], forecast[2], forecast[3]
            // 夏(6-8月販売) = 5-7月仕入れ = forecast[4], forecast[5], forecast[6]
            // 秋(9-11月販売) = 8-10月仕入れ = forecast[7], forecast[8], forecast[9]
            // 冬(12-2月販売) = 11-1月仕入れ = forecast[10], forecast[11], forecast[0]

            const seasonCounts = {
                spring: forecast[1] + forecast[2] + forecast[3],
                summer: forecast[4] + forecast[5] + forecast[6],
                autumn: forecast[7] + forecast[8] + forecast[9],
                winter: forecast[10] + forecast[11] + forecast[0]
            };

            const total = Object.values(seasonCounts).reduce((a, b) => a + b, 0);
            let season = 'all';

            if (total > 0) {
                const maxSeason = Object.entries(seasonCounts).reduce((a, b) => a[1] > b[1] ? a : b);
                // 特定のシーズンが45%以上を占める場合はそのシーズンとする
                if (maxSeason[1] / total >= 0.45) {
                    season = maxSeason[0];
                }
            }

            result[product] = {
                counts: forecast,
                details: forecastDetails,
                season: season
            };
        });

        return result;
    }

    generateInventoryForecastCSV(forecastData) {
        let csv = '商品,1月仕入,2月仕入,3月仕入,4月仕入,5月仕入,6月仕入,7月仕入,8月仕入,9月仕入,10月仕入,11月仕入,12月仕入,年間合計,シーズン\n';
        
        Object.entries(forecastData).forEach(([product, data]) => {
            const counts = data.counts;
            const season = data.season;
            const setting = this.productSettings[product] || {};
            const displayName = setting.fullName || product;
            const total = counts.reduce((a, b) => a + b, 0);
            
            const seasonName = {
                'spring': '春',
                'summer': '夏',
                'autumn': '秋',
                'winter': '冬',
                'all': '通年'
            }[season] || '通年';

            csv += `"${displayName}",${counts.join(',')},${total},${seasonName}\n`;
        });
        
        return csv;
    }
}
