// ========================================
// 静的環境対応バンドルファイル
// Generated: 2026-01-02T02:18:21.145Z
// ========================================

(function() {
    'use strict';
    

// ========== CONFIG.JS ==========
const CONFIG = {
    DB_NAME: 'AmazonPerformanceDB',
    DB_VERSION: 1,
    THRESHOLDS: {
        SESSIONS_GOOD: 200,
        SESSIONS_OK: 100,
        CVR_EXCELLENT: 5,
        CVR_GOOD: 3,
        CVR_CRITICAL: 1,
        ORDERS_MIN: 10,
        NEW_PRODUCT_DAYS: 30,
        DROP_ALERT_PCT: 30
    },
    CATEGORIES: {
        I: { name: '急落警戒（トレンド悪化）', priority: 1, color: '#e17055' },
        D: { name: '改善困難（低CVR商品）', priority: 2, color: '#ff7675' },
        G: { name: '高単価・機会損失（要CVR改善）', priority: 3, color: '#fdcb6e' },
        C: { name: '広告強化推奨（高CVR商品）', priority: 4, color: '#ffeaa7' },
        A: { name: '広告投入推奨（新規商品）', priority: 5, color: '#fab1a0' },
        H: { name: '合わせ買い推奨（薄利多売傾向）', priority: 6, color: '#81ecec' },
        B: { name: '自力成長期待（安定商品）', priority: 7, color: '#55efc4' },
        K: { name: '販売継続（基準クリア）', priority: 8, color: '#00b894' }, // New Category K
        E: { name: 'セッション不足（露出不足）', priority: 9, color: '#74b9ff' },
        F: { name: '注文不足', priority: 9, color: '#a29bfe' },
        J: { name: '標準', priority: 10, color: '#dfe6e9' }
    },
    SEASONALITY: {
        SS: { keywords: ['春', '夏', 'SS', '半袖', 'サマー'], label: '春夏', months: [2, 3, 4, 5, 6, 7] }, // Mar-Aug (0-indexed: 2-7)
        AW: { keywords: ['秋', '冬', 'AW', '長袖', 'ウインター'], label: '秋冬', months: [8, 9, 10, 11, 0, 1] }, // Sep-Feb
        ALL: { keywords: ['通年', 'オールシーズン'], label: '通年', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
    }
};


// ========== UTILS.JS ==========
// import { CONFIG } from './config.js';

function isSeasonOff(date, seasonalityType) {
    if (!seasonalityType || seasonalityType === 'ALL') return false;
    
    const month = date.getMonth(); // 0-11
    const config = CONFIG.SEASONALITY[seasonalityType];
    
    if (!config || !config.months) return false;
    
    // If the current month is NOT in the active months, it's season off
    return !config.months.includes(month);
}

function inferWeekFromDate(dateString) {
    // Pattern 1: YYMMDD-YYMMDD-BusinessReport.csv (Use end date)
    const rangeMatch = dateString.match(/(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
    if (rangeMatch) {
        const startYear = 2000 + parseInt(rangeMatch[1], 10);
        const startMonth = parseInt(rangeMatch[2], 10) - 1;
        const startDay = parseInt(rangeMatch[3], 10);
        
        const endYear = 2000 + parseInt(rangeMatch[4], 10);
        const endMonth = parseInt(rangeMatch[5], 10) - 1;
        const endDay = parseInt(rangeMatch[6], 10);
        
        const startDate = new Date(startYear, startMonth, startDay);
        const endDate = new Date(endYear, endMonth, endDay);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            return { date: endDate, startDate, duration };
        }
    }

    // Pattern 2: BusinessReport-DD-MM-YY.csv
    const match = dateString.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = 2000 + parseInt(match[3], 10);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                // Default to 7 days if only end date is known, or 1 day?
                // For safety in this specific project context where files are likely monthly/weekly ranges:
                return { date: date, startDate: new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000), duration: 7 };
            }
        }
    }
    return null;
}

async function generateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function determineSeasonality(title) {
    if (!title) return 'ALL';
    
    // Check for SS keywords
    for (const keyword of CONFIG.SEASONALITY.SS.keywords) {
        if (title.includes(keyword)) return 'SS';
    }
    
    // Check for AW keywords
    for (const keyword of CONFIG.SEASONALITY.AW.keywords) {
        if (title.includes(keyword)) return 'AW';
    }
    
    // Check for ALL keywords (explicit)
    for (const keyword of CONFIG.SEASONALITY.ALL.keywords) {
        if (title.includes(keyword)) return 'ALL';
    }
    
    return 'ALL'; // Default
}

function formatCurrency(value) {
    return '￥' + Math.round(value).toLocaleString();
}

function formatPercent(value) {
    return value.toFixed(1) + '%';
}


// ========== DB.JS ==========
// import { CONFIG } from './config.js';

let db = null;

async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB initialization error:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            if (!database.objectStoreNames.contains('fileData')) {
                const fileStore = database.createObjectStore('fileData', { keyPath: 'id', autoIncrement: true });
                fileStore.createIndex('hash', 'hash', { unique: true });
                fileStore.createIndex('fileName', 'fileName', { unique: false });
                fileStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('amazonData')) {
                const dataStore = database.createObjectStore('amazonData', { keyPath: 'id', autoIncrement: true });
                dataStore.createIndex('fileHash', 'fileHash', { unique: false });
                dataStore.createIndex('asin', 'asin', { unique: false });
                dataStore.createIndex('weekDate', 'weekDate', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('uploadHistory')) {
                const historyStore = database.createObjectStore('uploadHistory', { keyPath: 'id', autoIncrement: true });
                historyStore.createIndex('hash', 'hash', { unique: true });
                historyStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            }
        };
    });
}

async function saveFileToIndexedDB(file, weekDate, hash, processedData) {
    if (!db) throw new Error('IndexedDB not initialized');
    
    return new Promise(async (resolve, reject) => {
        try {
            const fileContent = await file.text();
            const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
            
            const fileStore = transaction.objectStore('fileData');
            fileStore.add({
                fileName: file.name,
                size: file.size,
                hash: hash,
                weekDate: weekDate.toISOString(),
                uploadDate: new Date().toISOString(),
                content: fileContent
            });
            
            const dataStore = transaction.objectStore('amazonData');
            for (const item of processedData) {
                dataStore.add({
                    ...item,
                    fileHash: hash,
                    weekDate: item.weekDate.toISOString()
                });
            }
            
            const historyStore = transaction.objectStore('uploadHistory');
            historyStore.add({
                fileName: file.name,
                hash: hash,
                weekDate: weekDate.toISOString(),
                uploadDate: new Date().toISOString(),
                recordCount: processedData.length
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

async function checkDuplicateFile(hash) {
    if (!db) return false;
    const transaction = db.transaction(['fileData'], 'readonly');
    const store = transaction.objectStore('fileData');
    const index = store.index('hash');
    
    return new Promise((resolve, reject) => {
        const request = index.get(hash);
        request.onsuccess = () => resolve(request.result !== undefined);
        request.onerror = () => reject(request.error);
    });
}

async function getUploadHistory() {
    if (!db) return [];
    const transaction = db.transaction(['uploadHistory'], 'readonly');
    const store = transaction.objectStore('uploadHistory');
    const index = store.index('uploadDate');
    
    return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            results.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

async function loadDataFromIndexedDB() {
    if (!db) return [];
    const transaction = db.transaction(['amazonData'], 'readonly');
    const store = transaction.objectStore('amazonData');
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            resolve(results.map(item => ({
                ...item,
                weekDate: new Date(item.weekDate)
            })));
        };
        request.onerror = () => reject(request.error);
    });
}

async function deleteDataFromIndexedDB(hash) {
    if (!db) return;
    const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
    
    const deleteFromStore = (storeName, indexName) => {
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(hash);
        request.onsuccess = () => {
            request.result.forEach(item => store.delete(item.id));
        };
    };
    
    deleteFromStore('fileData', 'hash');
    deleteFromStore('amazonData', 'fileHash');
    deleteFromStore('uploadHistory', 'hash');
}

async function clearAllData() {
    if (!db) return;
    const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
    
    await Promise.all(['fileData', 'amazonData', 'uploadHistory'].map(storeName => {
        return new Promise((resolve, reject) => {
            const request = transaction.objectStore(storeName).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }));
}

async function loadHistoryFile(hash) {
    if (!db) throw new Error('Database not initialized');
    const transaction = db.transaction(['amazonData'], 'readonly');
    const store = transaction.objectStore('amazonData');
    const index = store.index('fileHash');
    
    return new Promise((resolve, reject) => {
        const request = index.getAll(hash);
        request.onsuccess = () => {
            const results = request.result || [];
            resolve(results.map(item => ({
                ...item,
                weekDate: new Date(item.weekDate)
            })));
        };
        request.onerror = () => reject(request.error);
    });
}


// ========== DATA.JS ==========
// import { CONFIG } from './config.js';
// import { determineSeasonality, isSeasonOff } from './utils.js';

let amazonData = [];
let uploadedFiles = new Map();
let asinTracking = new Map();
let auxiliaryData = new Map();

function setAmazonData(data) {
    amazonData = data;
}

function setUploadedFiles(files) {
    uploadedFiles = files;
}

function setAuxiliaryData(data) {
    auxiliaryData = data;
}

function clearData() {
    amazonData = [];
    uploadedFiles.clear();
    asinTracking.clear();
    auxiliaryData.clear();
}

async function parseCSVFile(file, weekInfo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                if (!content || content.trim().length === 0) {
                    resolve([]);
                    return;
                }
                
                const parsed = Papa.parse(content, {
                    header: true,
                    dynamicTyping: false,
                    skipEmptyLines: true,
                    transformHeader: (h) => h.replace(/[\r\n]+/g, '').trim()
                });
                
                const cleanedData = parsed.data
                    .filter(row => {
                        const title = row['タイトル'] || row['商品名'] || '';
                        const asin = row['（親）ASIN'] || row['ASIN'] || '';
                        return title.trim() !== '' && asin.trim() !== '';
                    })
                    .map(row => {
                        const salesStr = row['注文商品の売上額'] || '￥0';
                        const sales = parseInt(salesStr.replace(/[￥,]/g, ''), 10) || 0;
                        const convRateStr = row['ユニットセッション率'] || '0%';
                        const convRate = parseFloat(convRateStr.replace('%', '')) || 0;
                        
                        // Helper to parse numbers with commas
                        const parseNum = (val) => parseInt((val || '0').toString().replace(/,/g, ''), 10) || 0;

                        return {
                            asin: row['（親）ASIN'] || row['ASIN'] || '',
                            title: row['タイトル'] || row['商品名'] || '',
                            sessions: parseNum(row['セッション数 - 合計'] || row['セッション数']),
                            pageViews: parseNum(row['ページビュー - 合計'] || row['ページビュー']),
                            orders: parseNum(row['注文された商品点数'] || row['注文数']),
                            conversionRate: convRate,
                            sales: sales,
                            orderItems: parseNum(row['注文品目総数'] || row['注文アイテム数']),
                            weekDate: weekInfo.date,
                            duration: weekInfo.duration,
                            fileName: file.name
                        };
                    });
                
                resolve(cleanedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsText(file, 'UTF-8');
    });
}

function updateAsinTracking() {
    asinTracking.clear();
    
    // Group by ASIN
    const rawDataByAsin = _.groupBy(amazonData, 'asin');
    
    Object.keys(rawDataByAsin).forEach(asin => {
        const items = rawDataByAsin[asin];
        const firstItem = items[0];
        
        // 1. Build Daily Series (Overlap Resolution)
        const dailyMap = new Map(); // YYYY-MM-DD -> Data
        
        items.forEach(item => {
            const duration = item.duration || 7;
            const endDate = new Date(item.weekDate);
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - duration + 1);
            
            const dailySessions = item.sessions / duration;
            const dailySales = item.sales / duration;
            const dailyOrders = item.orders / duration;
            const dailyPV = item.pageViews / duration;
            
            for (let i = 0; i < duration; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                
                const existing = dailyMap.get(dateStr);
                if (!existing) {
                    dailyMap.set(dateStr, {
                        sessions: dailySessions,
                        sales: dailySales,
                        orders: dailyOrders,
                        pageViews: dailyPV,
                        duration: duration,
                        count: 1
                    });
                } else {
                    // Overlap Resolution
                    if (duration < existing.duration) {
                        // Priority: Shorter duration
                        dailyMap.set(dateStr, {
                            sessions: dailySessions,
                            sales: dailySales,
                            orders: dailyOrders,
                            pageViews: dailyPV,
                            duration: duration,
                            count: 1
                        });
                    } else if (duration === existing.duration) {
                        // Average
                        existing.sessions = (existing.sessions * existing.count + dailySessions) / (existing.count + 1);
                        existing.sales = (existing.sales * existing.count + dailySales) / (existing.count + 1);
                        existing.orders = (existing.orders * existing.count + dailyOrders) / (existing.count + 1);
                        existing.pageViews = (existing.pageViews * existing.count + dailyPV) / (existing.count + 1);
                        existing.count += 1;
                    }
                }
            }
        });
        
        // Convert to sorted array
        let dailyData = Array.from(dailyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));
            
        // 2. Interpolation (Linear) for gaps <= 7 days
        if (dailyData.length > 1) {
            const interpolated = [];
            for (let i = 0; i < dailyData.length - 1; i++) {
                interpolated.push(dailyData[i]);
                
                const curr = dailyData[i];
                const next = dailyData[i+1];
                const currDate = new Date(curr.date);
                const nextDate = new Date(next.date);
                const diffTime = Math.abs(nextDate - currDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays > 1 && diffDays <= 8) { // Gap exists and <= 7 days gap
                    for (let j = 1; j < diffDays; j++) {
                        const interpDate = new Date(currDate);
                        interpDate.setDate(currDate.getDate() + j);
                        const dateStr = interpDate.toISOString().split('T')[0];
                        
                        const ratio = j / diffDays;
                        interpolated.push({
                            date: dateStr,
                            sessions: curr.sessions + (next.sessions - curr.sessions) * ratio,
                            sales: curr.sales + (next.sales - curr.sales) * ratio,
                            orders: curr.orders + (next.orders - curr.orders) * ratio,
                            pageViews: curr.pageViews + (next.pageViews - curr.pageViews) * ratio,
                            duration: 0, // Mark as interpolated
                            isInterpolated: true
                        });
                    }
                }
            }
            interpolated.push(dailyData[dailyData.length - 1]);
            dailyData = interpolated;
        }
        
        // Determine Seasonality & Aux Data
        let seasonality = determineSeasonality(firstItem.title);
        let firstSeen = new Date(dailyData[0].date);
        const aux = auxiliaryData.get(asin);
        if (aux) {
            if (aux.listingDate) {
                const d = new Date(aux.listingDate);
                if (!isNaN(d.getTime())) firstSeen = d;
            }
            if (aux.category && ['SS', 'AW', 'ALL'].includes(aux.category)) {
                seasonality = aux.category;
            }
        }

        // Calculate Stats
        const totalSessions = _.sumBy(dailyData, 'sessions');
        const totalSales = _.sumBy(dailyData, 'sales');
        const maxSessions = _.maxBy(dailyData, 'sessions')?.sessions || 0;
        
        // Map for UI/Charts (Daily)
        const trackingMap = new Map();
        dailyData.forEach(d => {
            trackingMap.set(d.date, {
                sessions: d.sessions,
                sales: d.sales,
                orders: d.orders,
                pageViews: d.pageViews,
                conversionRate: d.sessions > 0 ? (d.orders / d.sessions) * 100 : 0,
                aov: d.orders > 0 ? d.sales / d.orders : 0,
                rps: d.sessions > 0 ? d.sales / d.sessions : 0,
                duration: 1
            });
        });

        asinTracking.set(asin, {
            title: firstItem.title,
            asin: asin,
            firstSeen: firstSeen,
            lastSeen: new Date(dailyData[dailyData.length - 1].date),
            weeklyData: trackingMap, // Now holds daily data
            dailyData: dailyData,
            totalSessions,
            totalSales,
            maxSessions,
            minSessions: 0,
            changes: [], 
            seasonality
        });
        
        const tracking = asinTracking.get(asin);
        
        // Calculate Changes (Weekly aggregation for status)
        const changes = [];
        if (dailyData.length >= 14) {
            // Analyze in 7-day chunks from the end
            let i = dailyData.length;
            while (i >= 14) {
                const currChunk = dailyData.slice(i - 7, i);
                const prevChunk = dailyData.slice(i - 14, i - 7);
                
                const currSessions = _.sumBy(currChunk, 'sessions');
                const prevSessions = _.sumBy(prevChunk, 'sessions');
                
                if (prevSessions > 0) {
                    const changeRate = ((currSessions - prevSessions) / prevSessions) * 100;
                    changes.unshift({
                        week: currChunk[0].date,
                        changeRate: changeRate,
                        absoluteChange: currSessions - prevSessions
                    });
                }
                i -= 7;
            }
        }
        tracking.changes = changes;
        
        if (tracking.changes.length > 0) {
            tracking.avgChangeRate = _.meanBy(tracking.changes, 'changeRate');
            tracking.volatility = Math.sqrt(_.meanBy(tracking.changes, c => Math.pow(c.changeRate - tracking.avgChangeRate, 2)));
        } else {
            tracking.avgChangeRate = 0;
            tracking.volatility = 0;
        }
        
        tracking.status = determineAsinStatus(tracking);
    });
    
    // Calculate Global Stats (using last 30 days of each ASIN)
    const globalStats = calculateGlobalStats();
    
    // Classify
    asinTracking.forEach((tracking, asin) => {
        tracking.classification = classifyProduct(tracking, globalStats);
    });
}

function determineAsinStatus(tracking) {
    const dailyData = tracking.dailyData;
    if (!dailyData || dailyData.length === 0) return 'inactive';
    
    const lastDate = new Date(dailyData[dailyData.length - 1].date);
    const weeksFromFirstSeen = (lastDate - tracking.firstSeen) / (1000 * 60 * 60 * 24 * 7);
    const isNewProduct = weeksFromFirstSeen <= 4;
    
    if (isNewProduct) return 'new';
    
    if (tracking.changes.length > 0) {
        const lastChange = tracking.changes[tracking.changes.length - 1];
        if (lastChange.changeRate > 50) return 'surging';
        if (lastChange.changeRate < -30) return 'declining';
        if (tracking.avgChangeRate > 20) return 'growing';
        if (tracking.avgChangeRate < -15) return 'shrinking';
    }
    
    if (tracking.volatility > 30) return 'volatile';
    return 'stable';
}

function calculateGlobalStats() {
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalSessions = 0;
    let aovList = [];
    
    asinTracking.forEach((tracking) => {
        const dailyData = tracking.dailyData;
        if (dailyData.length > 0) {
            // Sum last 30 days
            const lastDate = new Date(dailyData[dailyData.length - 1].date);
            const cutoffDate = new Date(lastDate);
            cutoffDate.setDate(lastDate.getDate() - 30);
            
            const recentData = dailyData.filter(d => new Date(d.date) > cutoffDate);
            
            const revenue = _.sumBy(recentData, 'sales');
            const orders = _.sumBy(recentData, 'orders');
            const sessions = _.sumBy(recentData, 'sessions');
            
            totalRevenue += revenue;
            totalOrders += orders;
            totalSessions += sessions;
            
            if (orders > 0) {
                aovList.push(revenue / orders);
            }
        }
    });
    
    const avgAov = aovList.length > 0 ? _.mean(aovList) : 0;
    return { totalRevenue, totalOrders, totalSessions, avgAov };
}

function classifyProduct(tracking, globalStats) {
    const dailyData = tracking.dailyData;
    if (!dailyData || dailyData.length === 0) {
        return {
            category: 'J',
            name: CONFIG.CATEGORIES.J.name,
            action: 'データがありません',
            priority: 99,
            reason: 'データなし'
        };
    }

    // Aggregate Last 30 Days
    const lastDate = new Date(dailyData[dailyData.length - 1].date);
    const cutoffDate = new Date(lastDate);
    cutoffDate.setDate(lastDate.getDate() - 30);
    
    const recentData = dailyData.filter(d => new Date(d.date) > cutoffDate);
    
    const sessions = _.sumBy(recentData, 'sessions');
    const orders = _.sumBy(recentData, 'orders');
    const sales = _.sumBy(recentData, 'sales');
    
    // CVR = Total Orders / Total Sessions (Weighted Average)
    const unitSessionRate = sessions > 0 ? (orders / sessions) * 100 : 0;
    const aov = orders > 0 ? sales / orders : 0;
    const avgAov = globalStats.avgAov;
    
    // New Product Check
    const weeksFromFirstSeen = (lastDate - tracking.firstSeen) / (1000 * 60 * 60 * 24 * 7);
    const isNewProduct = weeksFromFirstSeen <= 4;
    
    // Trend Analysis (Compare last 30 days vs previous 30 days)
    let revenueChangeRate = 0;
    let sessionChangeRate = 0;
    
    const prevCutoffDate = new Date(cutoffDate);
    prevCutoffDate.setDate(cutoffDate.getDate() - 30);
    const prevData = dailyData.filter(d => new Date(d.date) > prevCutoffDate && new Date(d.date) <= cutoffDate);
    
    if (prevData.length > 0) {
        const prevSales = _.sumBy(prevData, 'sales');
        const prevSessions = _.sumBy(prevData, 'sessions');
        
        // Normalize if duration differs (though we use 30 days window, data might be missing)
        // Let's just compare sums for now, assuming roughly equal data availability
        if (prevSales > 0) revenueChangeRate = ((sales - prevSales) / prevSales) * 100;
        if (prevSessions > 0) sessionChangeRate = ((sessions - prevSessions) / prevSessions) * 100;
    }

    // Category I: Sudden Drop
    const isOffSeason = isSeasonOff(lastDate, tracking.seasonality);
    
    if (!isOffSeason && (revenueChangeRate <= -CONFIG.THRESHOLDS.DROP_ALERT_PCT || sessionChangeRate <= -CONFIG.THRESHOLDS.DROP_ALERT_PCT)) {
        const dropType = revenueChangeRate <= -CONFIG.THRESHOLDS.DROP_ALERT_PCT ? '売上' : 'セッション';
        const dropRate = revenueChangeRate <= -CONFIG.THRESHOLDS.DROP_ALERT_PCT ? revenueChangeRate : sessionChangeRate;
        return {
            category: 'I',
            ...CONFIG.CATEGORIES.I,
            action: '要因の早期特定と対策（競合・在庫・検索順位）',
            reason: `${dropType}が前期間比${Math.abs(dropRate).toFixed(1)}%減少`
        };
    }

    // Category D: Hard to Improve
    if (sessions >= 300 && unitSessionRate <= CONFIG.THRESHOLDS.CVR_CRITICAL) {
        return {
            category: 'D',
            ...CONFIG.CATEGORIES.D,
            action: '広告停止を推奨、撤退検討',
            reason: `セッション${Math.round(sessions)} (>=300), CVR ${unitSessionRate.toFixed(1)}% (<=1%)`
        };
    }
    
    // Category G: High Price / Opportunity Loss
    if (avgAov > 0 && aov > avgAov * 1.5 && unitSessionRate < 1 && sessions > CONFIG.THRESHOLDS.SESSIONS_GOOD) {
        return {
            category: 'G',
            ...CONFIG.CATEGORIES.G,
            action: 'クリエイティブ改善で利益最大化',
            reason: `客単価￥${Math.round(aov).toLocaleString()} (平均の${(aov/avgAov).toFixed(1)}倍), CVR ${unitSessionRate.toFixed(1)}%`
        };
    }

    // Category C: Ad Boost (High CVR)
    if (sessions > CONFIG.THRESHOLDS.SESSIONS_GOOD && unitSessionRate >= CONFIG.THRESHOLDS.CVR_EXCELLENT) {
        return {
            category: 'C',
            ...CONFIG.CATEGORIES.C,
            action: '広告をかけてさらに伸ばす',
            reason: `セッション${Math.round(sessions)} (>200), CVR ${unitSessionRate.toFixed(1)}% (>=5%)`
        };
    }
    
    // Category A: New Product
    if (isNewProduct) {
        return {
            category: 'A',
            ...CONFIG.CATEGORIES.A,
            action: '広告をかけてセッション数を伸ばす',
            reason: `出品後${Math.round(weeksFromFirstSeen)}週間 (新規)`
        };
    }
    
    // Category H: Bundle Buy
    if (avgAov > 0 && aov < avgAov * 0.5 && unitSessionRate > CONFIG.THRESHOLDS.CVR_EXCELLENT) {
        return {
            category: 'H',
            ...CONFIG.CATEGORIES.H,
            action: 'まとめ買いキャンペーン、バンドル販売',
            reason: `客単価￥${Math.round(aov).toLocaleString()} (平均の${(aov/avgAov).toFixed(1)}倍), CVR ${unitSessionRate.toFixed(1)}%`
        };
    }
    
    // Category B: Self-growth (Stable)
    if (sessions > CONFIG.THRESHOLDS.SESSIONS_GOOD && unitSessionRate >= CONFIG.THRESHOLDS.CVR_GOOD && unitSessionRate < CONFIG.THRESHOLDS.CVR_EXCELLENT) {
        return {
            category: 'B',
            ...CONFIG.CATEGORIES.B,
            action: '広告を変えずに自力成長を見守る',
            reason: `セッション${Math.round(sessions)} (>200), CVR ${unitSessionRate.toFixed(1)}% (3-5%)`
        };
    }

    // Category K: Sales Continuation (New Category)
    if (sessions > CONFIG.THRESHOLDS.SESSIONS_OK && unitSessionRate >= CONFIG.THRESHOLDS.CVR_GOOD) {
        return {
            category: 'K',
            ...CONFIG.CATEGORIES.K,
            action: '在庫維持、安定運用',
            reason: `セッション${Math.round(sessions)} (>100), CVR ${unitSessionRate.toFixed(1)}% (>=3%)`
        };
    }
    
    // Category E: Low Sessions
    if (sessions < CONFIG.THRESHOLDS.SESSIONS_OK) {
        return {
            category: 'E',
            ...CONFIG.CATEGORIES.E,
            action: 'SEO改善、広告によるテスト露出',
            reason: `セッション${Math.round(sessions)} (<100)`
        };
    }
    
    // Category F: Low Orders
    if (orders < CONFIG.THRESHOLDS.ORDERS_MIN) {
        return {
            category: 'F',
            ...CONFIG.CATEGORIES.F,
            action: 'リスティング最適化、価格見直し',
            reason: `注文数${Math.round(orders)} (<10)`
        };
    }
    
    // Category J: Standard
    return {
        category: 'J',
        ...CONFIG.CATEGORIES.J,
        action: '継続モニタリング',
        reason: '特定のカテゴリ条件に該当せず'
    };
}


// ========== CHARTS.JS ==========
// import { amazonData, asinTracking } from './data.js';

const charts = {};
let modalChart = null;

function createTimelineChart() {
    if (amazonData.length === 0) return;
    
    const ctx = document.getElementById('timelineChart').getContext('2d');
    
    const asinArray = Array.from(asinTracking.entries())
        .sort((a, b) => b[1].totalSales - a[1].totalSales);
    
    const top20PercentCount = Math.max(1, Math.ceil(asinArray.length * 0.2));
    const topAsins = asinArray.slice(0, top20PercentCount);
    
    // Collect all unique dates from the top ASINs to form the X-axis
    let allDates = new Set();
    topAsins.forEach(([asin, tracking]) => {
        tracking.dailyData.forEach(d => allDates.add(d.date));
    });
    const dates = Array.from(allDates).sort();
    
    const datasets = topAsins.map(([asin, tracking], index) => {
        const data = dates.map(date => {
            const dayData = tracking.weeklyData.get(date); // weeklyData is actually daily map
            return dayData ? dayData.sessions : 0;
        });
        
        const colors = [
            'rgb(255, 126, 95)', 'rgb(254, 180, 123)', 'rgb(126, 238, 250)',
            'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)',
            'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)',
            'rgb(199, 99, 132)', 'rgb(154, 162, 235)', 'rgb(155, 206, 86)',
            'rgb(175, 192, 192)'
        ];
        
        return {
            label: tracking.title.substring(0, 30),
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: 0.4
        };
    });
    
    if (charts.timeline) {
        charts.timeline.destroy();
    }
    
    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => {
                const date = new Date(d);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } },
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
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } }
            }
        }
    });
}

function createMatrixChart(data) {
    const ctx = document.getElementById('matrixChart').getContext('2d');
    
    if (charts.matrix) {
        charts.matrix.destroy();
    }
    
    const bubbleData = data.sort((a, b) => b.totalSales - a.totalSales).slice(0, 20).map(d => ({
        x: d.sessions,
        y: d.efficiency,
        r: Math.sqrt(d.totalSales / 10000),
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
                legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        title: function(context) { return bubbleData[context[0].dataIndex].label; },
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
                    title: { display: true, text: 'セッション数', color: 'rgba(255, 255, 255, 0.8)' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) { return '￥' + value.toFixed(0); }
                    },
                    title: { display: true, text: '売上効率 (￥/セッション)', color: 'rgba(255, 255, 255, 0.8)' }
                }
            }
        }
    });
}

function drawSparkline(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) existingCanvas.remove();
    
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 300;
    canvas.height = 60;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const padding = 5;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    if (data.length < 2) {
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
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    ctx.fillStyle = '#7ee8fa';
    data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1)) * width;
        const y = padding + height - ((value - min) / range) * height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function createConversionChart(data) {
    const ctx = document.getElementById('conversionChart').getContext('2d');
    if (charts.conversion) charts.conversion.destroy();
    
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
                legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: { label: function(context) { return `CVR: ${context.parsed.y.toFixed(2)}%`; } }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', maxRotation: 45 } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: function(value) { return value + '%'; } } }
            }
        }
    });
}

function createEfficiencyChart(data) {
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    if (charts.efficiency) charts.efficiency.destroy();
    
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
                legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: { label: function(context) { return `効率: ￥${context.parsed.y.toFixed(0)}/セッション`; } }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', maxRotation: 45 } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: function(value) { return '￥' + value.toFixed(0); } } }
            }
        }
    });
}

function createNewProductsChart(newProducts) {
    const ctx = document.getElementById('newProductsChart').getContext('2d');
    if (charts.newProducts) charts.newProducts.destroy();
    
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
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } },
                tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', maxRotation: 45 } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } },
                y2: { type: 'linear', display: false, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: function(value) { return value + '%'; } } }
            }
        }
    });
}

function createAnomalyChart(anomalies) {
    const ctx = document.getElementById('anomalyChart').getContext('2d');
    if (charts.anomaly) charts.anomaly.destroy();
    
    const chartData = anomalies.slice(0, 10);
    
    charts.anomaly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(a => a.title.substring(0, 30) + '...'),
            datasets: [{
                label: '変化率 (%)',
                data: chartData.map(a => a.changeRate),
                backgroundColor: chartData.map(a => a.changeRate > 0 ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 71, 87, 0.6)'),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: { label: function(context) { return '変化率: ' + context.parsed.y.toFixed(1) + '%'; } }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', maxRotation: 45 } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: function(value) { return value + '%'; } } }
            }
        }
    });
}

function showDetailModalChart(tracking) {
    const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
    const weekLabels = sortedWeeks.map(w => new Date(w).toLocaleDateString('ja-JP'));
    
    const sessionsData = sortedWeeks.map(w => tracking.weeklyData.get(w).sessions);
    const salesData = sortedWeeks.map(w => tracking.weeklyData.get(w).sales);
    const conversionData = sortedWeeks.map(w => tracking.weeklyData.get(w).conversionRate);
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    
    if (modalChart) modalChart.destroy();
    
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
                legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } },
                tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: function(value) { return '￥' + value.toLocaleString(); } } },
                y2: { type: 'linear', display: false, position: 'right' }
            }
        }
    });
    return modalChart;
}

function destroyModalChart() {
    if (modalChart) {
        modalChart.destroy();
        modalChart = null;
    }
}


// ========== UI.JS ==========
// import { amazonData, asinTracking, uploadedFiles, setAmazonData, updateAsinTracking, clearData } from './data.js';
// import { CONFIG } from './config.js';
// import * as Charts from './charts.js';
// import { deleteDataFromIndexedDB, getUploadHistory, loadHistoryFile } from './db.js';

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
        
        fileItem.innerHTML = `
            <span class="file-name">${fileName}</span>
            <span class="file-date">${weekDate.toLocaleDateString('ja-JP')} (${dataCount}件)</span>
            <button class="file-remove" data-filename="${fileName}">削除</button>
        `;
        
        fileItem.querySelector('.file-remove').addEventListener('click', () => removeFile(fileName));
        fileListEl.appendChild(fileItem);
    });
}

async function removeFile(fileName) {
    try {
        const fileData = amazonData.filter(d => d.fileName === fileName);
        if (fileData.length > 0 && fileData[0].fileHash) {
            await deleteDataFromIndexedDB(fileData[0].fileHash);
        }
        
        const newAmazonData = amazonData.filter(d => d.fileName !== fileName);
        setAmazonData(newAmazonData);
        uploadedFiles.delete(fileName);
        
        updateFileList();
        updateDashboard();
        updateHistoryList();
        
        showNotification(`${fileName} を削除しました`, 'info');
    } catch (error) {
        console.error('File removal error:', error);
        showNotification('ファイルの削除に失敗しました', 'error');
    }
}

function updateDashboard() {
    if (amazonData.length === 0) {
        document.getElementById('totalRevenue').textContent = '￥0';
        document.getElementById('activeAsins').textContent = '0';
        document.getElementById('newAsins').textContent = '0';
        document.getElementById('avgGrowth').textContent = '0%';
        document.getElementById('alertsSection').style.display = 'none';
        return;
    }
    
    updateAsinTracking();
    updateStats();
    
    const alerts = generateAlerts();
    displayAlerts(alerts);
    
    const activeBtn = document.querySelector('.filter-btn.active');
    if (activeBtn) {
        updateView(activeBtn.dataset.view);
    }
}

function updateStats() {
    const weeks = _.uniq(amazonData.map(d => d.weekDate)).sort((a, b) => a - b);
    const lastWeek = weeks[weeks.length - 1];
    
    const totalRevenue = _.sumBy(amazonData, 'sales');
    document.getElementById('totalRevenue').textContent = `￥${totalRevenue.toLocaleString()}`;
    
    const lastWeekData = amazonData.filter(d => d.weekDate.getTime() === lastWeek.getTime());
    const activeAsins = _.uniqBy(lastWeekData, 'asin').length;
    document.getElementById('activeAsins').textContent = activeAsins;
    
    let newAsins = 0;
    asinTracking.forEach((tracking) => {
        if (tracking.status === 'new') newAsins++;
    });
    document.getElementById('newAsins').textContent = newAsins;
    
    let totalGrowth = 0;
    let growthCount = 0;
    asinTracking.forEach((tracking) => {
        if (tracking.avgChangeRate !== undefined && !isNaN(tracking.avgChangeRate)) {
            totalGrowth += tracking.avgChangeRate;
            growthCount++;
        }
    });
    const avgGrowth = growthCount > 0 ? totalGrowth / growthCount : 0;
    document.getElementById('avgGrowth').textContent = `${avgGrowth.toFixed(1)}%`;
    
    if (weeks.length >= 2) {
        const prevWeek = weeks[weeks.length - 2];
        const prevWeekData = amazonData.filter(d => d.weekDate.getTime() === prevWeek.getTime());
        const prevActiveAsins = _.uniqBy(prevWeekData, 'asin').length;
        
        const asinChange = prevActiveAsins > 0 ? ((activeAsins - prevActiveAsins) / prevActiveAsins * 100) : 0;
        
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

function generateAlerts() {
    const alerts = [];
    
    asinTracking.forEach((tracking) => {
        const status = tracking.status;
        const dailyData = tracking.dailyData;
        if (!dailyData || dailyData.length === 0) return;

        const lastDayData = dailyData[dailyData.length - 1];
        
        if (status === 'new') {
            // Check last 7 days sum
            const last7Days = dailyData.slice(-7);
            const sessionsSum = _.sumBy(last7Days, 'sessions');
            
            if (sessionsSum > 50) {
                alerts.push({
                    type: 'info',
                    icon: '🆕',
                    title: '新商品が好調なスタート',
                    content: `「${tracking.title.substring(0, 20)}...」が直近7日で${sessionsSum}セッション獲得`
                });
            }
        } else if (status === 'surging') {
            const lastChange = tracking.changes[tracking.changes.length - 1];
            alerts.push({
                type: 'success',
                icon: '🚀',
                title: 'セッション急上昇',
                content: `「${tracking.title}」が${lastChange.changeRate.toFixed(1)}%増加`
            });
        } else if (status === 'declining') {
            const lastChange = tracking.changes[tracking.changes.length - 1];
            alerts.push({
                type: 'warning',
                icon: '📉',
                title: 'セッション急落',
                content: `「${tracking.title}」が${Math.abs(lastChange.changeRate).toFixed(1)}%減少`
            });
        }
    });
    
    return alerts;
}

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

function updateView(viewName) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const viewEl = document.getElementById(viewName + 'View');
    if (viewEl) viewEl.style.display = 'block';
    
    switch(viewName) {
        case 'monitoring': displayAsinMonitoring(); break;
        case 'timeline': Charts.createTimelineChart(); break;
        case 'anomaly': displayAnomalyDetection(); break;
        case 'newproducts': displayNewProducts(); break;
        case 'classification': displayClassification(); break;
        case 'effect': displayEffectAnalysis(); break;
        case 'advanced': displayAdvancedAnalysis(); break;
    }
}

function displayAsinMonitoring() {
    const grid = document.getElementById('asinTrackingGrid');
    grid.innerHTML = '';
    
    if (asinTracking.size === 0) {
        grid.innerHTML = '<div class="loading">データがありません</div>';
        return;
    }
    
    const sortedAsins = Array.from(asinTracking.entries())
        .sort((a, b) => {
            const statusOrder = ['new', 'surging', 'declining', 'volatile', 'growing', 'shrinking', 'stable', 'inactive'];
            return statusOrder.indexOf(a[1].status) - statusOrder.indexOf(b[1].status);
        })
        .slice(0, 12);
    
    sortedAsins.forEach(([asin, tracking], index) => {
        const card = createAsinCard(asin, tracking, index);
        grid.appendChild(card);
    });
}

function createAsinCard(asin, tracking, index) {
    const card = document.createElement('div');
    card.className = 'asin-card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    if (tracking.status === 'new') card.classList.add('new-product');
    else if (tracking.status === 'declining' || tracking.status === 'shrinking') card.classList.add('declining');
    else if (tracking.status === 'surging' || tracking.status === 'growing') card.classList.add('growing');
    
    const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
    const latestData = tracking.weeklyData.get(sortedWeeks[sortedWeeks.length - 1]);
    
    let changeDisplay = '';
    if (tracking.changes.length > 0) {
        const lastChange = tracking.changes[tracking.changes.length - 1];
        const changeClass = lastChange.changeRate > 0 ? 'trend-up' : 'trend-down';
        const arrow = lastChange.changeRate > 0 ? '↑' : '↓';
        changeDisplay = `<span class="${changeClass}">${arrow} ${Math.abs(lastChange.changeRate).toFixed(1)}%</span>`;
    }
    
    let badge = '';
    if (tracking.status === 'new') badge = '<span class="asin-badge badge-new">NEW</span>';
    else if (tracking.status === 'surging') badge = '<span class="asin-badge badge-hot">HOT</span>';
    else if (tracking.status === 'growing') badge = '<span class="asin-badge badge-growing">成長中</span>';
    
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
                <div class="metric-value">${sortedWeeks.length}日</div>
                <div class="metric-label">追跡期間</div>
            </div>
        </div>
        <div class="sparkline-container" id="sparkline-${asin}"></div>
    `;
    
    card.addEventListener('click', () => showDetailModal(asin, tracking));
    
    setTimeout(() => {
        Charts.drawSparkline(`sparkline-${asin}`, sparklineData);
    }, 100 + index * 50);
    
    return card;
}

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
    
    anomalies.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
    Charts.createAnomalyChart(anomalies);
    
    const grid = document.getElementById('anomalyGrid');
    grid.innerHTML = '';
    anomalies.slice(0, 6).forEach((anomaly, index) => {
        const card = createAsinCard(anomaly.asin, anomaly.tracking, index);
        grid.appendChild(card);
    });
}

function displayNewProducts() {
    const newProducts = [];
    
    asinTracking.forEach((tracking, asin) => {
        if (tracking.status === 'new') {
            const dailyData = tracking.dailyData;
            if (!dailyData || dailyData.length === 0) return;

            // Calculate first 7 days stats
            const first7Days = dailyData.slice(0, 7);
            const firstPeriodSessions = _.sumBy(first7Days, 'sessions');
            const firstPeriodSales = _.sumBy(first7Days, 'sales');
            
            // Calculate next 7 days stats (if available)
            let secondPeriodSessions = null;
            let secondPeriodSales = null;
            let growthRate = null;

            if (dailyData.length >= 14) {
                const next7Days = dailyData.slice(7, 14);
                secondPeriodSessions = _.sumBy(next7Days, 'sessions');
                secondPeriodSales = _.sumBy(next7Days, 'sales');
                
                if (firstPeriodSessions > 0) {
                    growthRate = ((secondPeriodSessions - firstPeriodSessions) / firstPeriodSessions) * 100;
                }
            }
            
            newProducts.push({
                asin: asin,
                title: tracking.title,
                firstWeekSessions: Math.round(firstPeriodSessions),
                firstWeekSales: firstPeriodSales,
                secondWeekSessions: secondPeriodSessions !== null ? Math.round(secondPeriodSessions) : null,
                secondWeekSales: secondPeriodSales,
                growthRate: growthRate,
                tracking: tracking
            });
        }
    });
    
    newProducts.sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0));
    Charts.createNewProductsChart(newProducts);
    
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

function displayClassification() {
    const grid = document.getElementById('classificationGrid');
    const summaryEl = document.getElementById('classificationSummary');
    grid.innerHTML = '';
    
    if (asinTracking.size === 0) {
        grid.innerHTML = '<div class="loading">データがありません</div>';
        summaryEl.innerHTML = '';
        return;
    }
    
    const categoryCounts = {};
    Object.keys(CONFIG.CATEGORIES).forEach(cat => categoryCounts[cat] = 0);
    
    asinTracking.forEach((tracking) => {
        if (tracking.classification) {
            const cat = tracking.classification.category;
            if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
        }
    });
    
    let summaryHtml = '<div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">';
    summaryHtml += '<span style="color: rgba(255,255,255,0.7); margin-right: 10px;">📊 分類サマリー:</span>';
    
    const sortedCats = Object.keys(CONFIG.CATEGORIES).sort((a, b) => CONFIG.CATEGORIES[a].priority - CONFIG.CATEGORIES[b].priority);
    
    sortedCats.forEach(cat => {
        if (categoryCounts[cat] > 0) {
            const color = CONFIG.CATEGORIES[cat].color;
            summaryHtml += `<span style="background: ${color}; color: #000; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">${cat}: ${categoryCounts[cat]}件</span>`;
        }
    });
    summaryHtml += '</div>';
    summaryEl.innerHTML = summaryHtml;
    
    const activeFilter = document.querySelector('.filter-chip.active');
    const filterCode = activeFilter ? activeFilter.dataset.category : 'all';

    const filteredAsins = Array.from(asinTracking.entries())
        .filter(([asin, tracking]) => {
            if (filterCode === 'all') return true;
            return tracking.classification && tracking.classification.category === filterCode;
        })
        .sort((a, b) => {
            const priorityA = a[1].classification ? a[1].classification.priority : 99;
            const priorityB = b[1].classification ? b[1].classification.priority : 99;
            return priorityA - priorityB;
        });

    if (filteredAsins.length === 0) {
        grid.innerHTML = '<div class="no-data" style="text-align:center; padding:20px; color:rgba(255,255,255,0.5);">該当する商品はありません</div>';
        return;
    }

    filteredAsins.forEach(([asin, tracking], index) => {
        const card = createClassificationCard(asin, tracking, index);
        grid.appendChild(card);
    });
}

function createClassificationCard(asin, tracking, index) {
    const card = document.createElement('div');
    card.className = 'asin-card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    const cls = tracking.classification;
    const categoryColor = CONFIG.CATEGORIES[cls.category].color;
    
    const sortedWeeks = Array.from(tracking.weeklyData.keys()).sort();
    const latestData = tracking.weeklyData.get(sortedWeeks[sortedWeeks.length - 1]);
    
    card.innerHTML = `
        <div class="asin-header" style="border-bottom: 2px solid ${categoryColor}; padding-bottom: 10px; margin-bottom: 10px;">
            <div>
                <div class="asin-title" title="${tracking.title}">${tracking.title.substring(0, 40)}...</div>
                <div style="color: rgba(255,255,255,0.5); font-size: 0.9em;">${asin}</div>
            </div>
            <span class="asin-badge" style="background: ${categoryColor}; color: #000; font-weight: bold;">${cls.category}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
            <div style="font-size: 0.9em; color: ${categoryColor}; font-weight: bold; margin-bottom: 5px;">${cls.name}</div>
            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                💡 ${cls.action}
            </div>
            <div style="font-size: 0.75em; color: rgba(255,255,255,0.5); margin-top: 5px; text-align: right;">
                判定理由: ${cls.reason}
            </div>
        </div>

        <div class="asin-metrics">
            <div class="metric">
                <div class="metric-value">${latestData.sessions}</div>
                <div class="metric-label">セッション</div>
            </div>
            <div class="metric">
                <div class="metric-value">${latestData.conversionRate.toFixed(1)}%</div>
                <div class="metric-label">CVR</div>
            </div>
            <div class="metric">
                <div class="metric-value">￥${Math.round(latestData.rps).toLocaleString()}</div>
                <div class="metric-label">RPS</div>
            </div>
            <div class="metric">
                <div class="metric-value">￥${Math.round(latestData.aov).toLocaleString()}</div>
                <div class="metric-label">客単価</div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showDetailModal(asin, tracking));
    return card;
}

function displayEffectAnalysis() {
    // Placeholder for effect analysis logic if needed
}

function displayAdvancedAnalysis() {
    if (asinTracking.size === 0) return;
    
    const analysisData = [];
    asinTracking.forEach((tracking, asin) => {
        const weeks = Array.from(tracking.weeklyData.keys()).sort();
        const latestWeek = weeks[weeks.length - 1];
        const latestData = tracking.weeklyData.get(latestWeek);
        
        if (latestData && latestData.sessions > 0) {
            analysisData.push({
                asin: asin,
                title: tracking.title,
                sessions: latestData.sessions,
                sales: latestData.sales,
                conversionRate: latestData.conversionRate,
                efficiency: latestData.sales / latestData.sessions,
                totalSales: tracking.totalSales,
                totalSessions: tracking.totalSessions
            });
        }
    });
    
    Charts.createConversionChart(analysisData);
    Charts.createEfficiencyChart(analysisData);
    Charts.createMatrixChart(analysisData);
}

function showDetailModal(asin, tracking) {
    const modal = document.getElementById('detailModal');
    document.getElementById('modalTitle').textContent = tracking.title;
    modal.style.display = 'block';
    Charts.showDetailModalChart(tracking);
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    Charts.destroyModalChart();
}

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
            
            const isCurrentlyLoaded = uploadedFiles.has(item.fileName);
            
            historyItem.innerHTML = `
                <div class="history-info">
                    <div class="history-filename">${item.fileName}</div>
                    <div class="history-details">
                        <span>📅 ${new Date(item.weekDate).toLocaleDateString('ja-JP')}</span>
                        <span>📊 ${item.recordCount}件</span>
                        <span>⏰ ${new Date(item.uploadDate).toLocaleDateString('ja-JP')}</span>
                        ${isCurrentlyLoaded ? '<span style="color: #7ee8fa;">✓ 読み込み済み</span>' : ''}
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn load" data-hash="${item.hash}" ${isCurrentlyLoaded ? 'disabled' : ''}>📂 読み込み</button>
                    <button class="history-btn delete" data-hash="${item.hash}" data-filename="${item.fileName}">🗑️ 削除</button>
                </div>
            `;
            
            historyItem.querySelector('.load').addEventListener('click', async () => {
                try {
                    const data = await loadHistoryFile(item.hash);
                    if (data.length > 0) {
                        const newAmazonData = [...amazonData, ...data];
                        setAmazonData(newAmazonData);
                        uploadedFiles.set(item.fileName, new Date(item.weekDate));
                        updateFileList();
                        updateDashboard();
                        updateHistoryList();
                        showNotification(`${item.fileName} を読み込みました`, 'success');
                    }
                } catch (e) {
                    console.error(e);
                    showNotification('読み込みエラー', 'error');
                }
            });
            
            historyItem.querySelector('.delete').addEventListener('click', async () => {
                if (confirm('削除しますか？')) {
                    await deleteDataFromIndexedDB(item.hash);
                    updateHistoryList();
                }
            });
            
            historyList.appendChild(historyItem);
        });
    } catch (error) {
        console.error(error);
    }
}

function exportData() {
    if (amazonData.length === 0) {
        showNotification('エクスポートするデータがありません', 'error');
        return;
    }
    
    const exportData = [];
    
    asinTracking.forEach((tracking, asin) => {
        const sortedDays = Array.from(tracking.weeklyData.keys()).sort();
        
        sortedDays.forEach(day => {
            const data = tracking.weeklyData.get(day);
            exportData.push({
                ASIN: asin,
                商品名: tracking.title,
                日付: new Date(day).toLocaleDateString('ja-JP'),
                セッション数: data.sessions,
                売上: data.sales,
                コンバージョン率: data.conversionRate,
                ステータス: tracking.status,
                平均変化率: tracking.avgChangeRate?.toFixed(2) || '0',
                カテゴリ: tracking.classification ? tracking.classification.category : '',
                カテゴリ名: tracking.classification ? tracking.classification.name : '',
                季節性: tracking.seasonality,
                推定値: data.duration === 0 ? 'Yes' : 'No' // Add interpolation flag
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


// ========== MAIN.JS ==========
// import { initIndexedDB, loadDataFromIndexedDB, checkDuplicateFile, saveFileToIndexedDB } from './db.js';
// import { amazonData, setAmazonData, uploadedFiles, setUploadedFiles, parseCSVFile, clearData } from './data.js';
// import { updateDashboard, updateFileList, updateHistoryList, showNotification, updateView, closeModal, exportData } from './ui.js';
// import { inferWeekFromDate, generateFileHash } from './utils.js';

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


})();

console.log('✅ Bundle loaded successfully');
