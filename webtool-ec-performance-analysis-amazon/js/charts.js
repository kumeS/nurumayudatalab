import { amazonData, asinTracking } from './data.js';

export const charts = {};
export let modalChart = null;

export function createTimelineChart() {
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

export function createMatrixChart(data) {
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

export function drawSparkline(containerId, data) {
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

export function createConversionChart(data) {
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

export function createEfficiencyChart(data) {
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

export function createNewProductsChart(newProducts) {
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

export function createAnomalyChart(anomalies) {
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

export function showDetailModalChart(tracking) {
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

export function destroyModalChart() {
    if (modalChart) {
        modalChart.destroy();
        modalChart = null;
    }
}
