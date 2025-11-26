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
                            timestamp: fileData.timestamp
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

    async saveDataToDB(fileName, data, fileSize) {
        try {
            const transaction = this.db.transaction(['fileData'], 'readwrite');
            const store = transaction.objectStore('fileData');
            
            const fileData = {
                fileName: fileName,
                data: data,
                fileSize: fileSize,
                timestamp: new Date().toISOString()
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
        allUniqueOrders.forEach(orderId => {
            const orderType = orderTypeMap.get(orderId);
            if (orderType !== 'multiChannel') {
                amazonUniqueOrders.add(orderId);
            }
        });
        
        result.orderBreakdown = { 
            amazonOrders: amazonUniqueOrders.size,
            multiChannelOrders: result.multiChannelData.count
        };
        
        result.orderCount = result.orderBreakdown.amazonOrders + result.orderBreakdown.multiChannelOrders;
        
        result.totalFbaFees = Object.entries(result.fbaFeeBreakdown)
            .filter(([key]) => key !== 'refundFees')
            .reduce((sum, [, fee]) => sum + fee, 0);
        
        result.totalExpenses = result.totalSalesFees + result.totalFbaFees;
        
        const grossProfit = result.totalSales - result.totalSalesFees;
        result.totalProfit = grossProfit - result.totalFbaFees + result.totalRefundAmount + result.totalInventoryRefund;
        
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
            orderBreakdown: { amazonOrders: 0, multiChannelOrders: 0 },
            productFeeData: {}
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
}
