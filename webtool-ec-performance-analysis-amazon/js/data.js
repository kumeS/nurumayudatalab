import { CONFIG } from './config.js';
import { determineSeasonality, isSeasonOff } from './utils.js';

export let amazonData = [];
export let uploadedFiles = new Map();
export let asinTracking = new Map();
export let auxiliaryData = new Map();

export function setAmazonData(data) {
    amazonData = data;
}

export function setUploadedFiles(files) {
    uploadedFiles = files;
}

export function setAuxiliaryData(data) {
    auxiliaryData = data;
}

export function clearData() {
    amazonData = [];
    uploadedFiles.clear();
    asinTracking.clear();
    auxiliaryData.clear();
}

export async function parseCSVFile(file, weekInfo) {
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

export function updateAsinTracking() {
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
