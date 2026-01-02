import { amazonData, asinTracking, uploadedFiles, setAmazonData, updateAsinTracking, clearData } from './data.js';
import { CONFIG } from './config.js';
import * as Charts from './charts.js';
import { deleteDataFromIndexedDB, getUploadHistory, loadHistoryFile } from './db.js';

export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export function updateFileList() {
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

export async function removeFile(fileName) {
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

export function updateDashboard() {
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

export function updateView(viewName) {
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

export function displayClassification() {
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

export function showDetailModal(asin, tracking) {
    const modal = document.getElementById('detailModal');
    document.getElementById('modalTitle').textContent = tracking.title;
    modal.style.display = 'block';
    Charts.showDetailModalChart(tracking);
}

export function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    Charts.destroyModalChart();
}

export async function updateHistoryList() {
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

export function exportData() {
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
