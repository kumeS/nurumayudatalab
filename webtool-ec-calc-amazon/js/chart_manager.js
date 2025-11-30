class ChartManager {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.charts = {};
    }

    updateCharts(currentPeriod, currentSubPeriod) {
        this.updateSalesChart(currentPeriod, currentSubPeriod);
        this.updateProfitChart(currentPeriod, currentSubPeriod);
    }

    updateSalesChart(currentPeriod, currentSubPeriod) {
        const data = this.dataManager.getCurrentData(currentPeriod, currentSubPeriod);
        const ctx = document.getElementById('salesChart').getContext('2d');
        
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        let labels, salesData, profitData, selmonData, selmonNetSeries;

        if (currentPeriod === 'all') {
            const monthlyData = new Map();
            
            this.dataManager.periods.forEach((periodData, period) => {
                let totalSales = 0;
                let totalProfit = 0;
                let selmonSales = 0;
                let selmonNet = 0;
                
                Object.values(periodData.dailyData).forEach(dayData => {
                    totalSales += dayData.sales || 0;
                    totalProfit += dayData.profit || 0;
                });
                Object.values(periodData.selmonDailyData || {}).forEach(entry => {
                    if (!entry) return;
                    selmonSales += entry.sales || 0;
                    selmonNet += (entry.sales || 0) - (entry.expenses || 0);
                });
                
                monthlyData.set(period, {
                    amazonSales: totalSales - selmonSales,
                    profit: totalProfit,
                    selmonSales: selmonSales,
                    selmonNet: selmonNet
                });
            });
            
            const sortedMonths = Array.from(monthlyData.keys()).sort((a, b) => {
                const [yearA, monthA] = a.replace('年', '/').replace('月', '').split('/').map(Number);
                const [yearB, monthB] = b.replace('年', '/').replace('月', '').split('/').map(Number);
                return yearA !== yearB ? yearA - yearB : monthA - monthB;
            });
            
            labels = sortedMonths;
            salesData = sortedMonths.map(month => {
                const item = monthlyData.get(month);
                return item ? item.amazonSales : 0;
            });
            profitData = sortedMonths.map(month => monthlyData.get(month).profit);
            selmonData = sortedMonths.map(month => monthlyData.get(month).selmonSales || 0);
            selmonNetSeries = sortedMonths.map(month => monthlyData.get(month).selmonNet || 0);
        } else {
            const allDates = this.uiManager.generateContinuousDates(data.dailyData, currentPeriod);
            const selmonDaily = data.selmonDailyData || {};
            salesData = allDates.map(date => {
                const total = data.dailyData[date] ? data.dailyData[date].sales : 0;
                const selmon = selmonDaily[date] ? (selmonDaily[date].sales || 0) : 0;
                return total - selmon;
            });
            profitData = allDates.map(date => data.dailyData[date] ? data.dailyData[date].profit : 0);
            selmonData = allDates.map(date => selmonDaily[date] ? (selmonDaily[date].sales || 0) : 0);
            selmonNetSeries = allDates.map(date => {
                const entry = selmonDaily[date];
                if (!entry) return 0;
                return (entry.sales || 0) - (entry.expenses || 0);
            });
            
            labels = allDates.map(date => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            });
        }

        let combinedProfitData = profitData;
        if (Array.isArray(selmonNetSeries) && selmonNetSeries.length === profitData.length) {
            combinedProfitData = profitData.map((value, index) => {
                const selmonNet = selmonNetSeries[index] || 0;
                const amazonOnly = value - selmonNet;
                return amazonOnly + selmonNet;
            });
        }

        const datasets = [{
            label: 'Amazon販売売上',
            data: salesData,
            borderColor: '#FF9900',
            backgroundColor: 'rgba(255, 153, 0, 0.1)',
            tension: 0.4,
            fill: true
        }];

        const hasSelmonData = Array.isArray(selmonData) && selmonData.some(value => value !== 0);
        if (hasSelmonData) {
            datasets.push({
                label: 'セルモン売上',
                data: selmonData,
                borderColor: '#7F7FD5',
                backgroundColor: 'rgba(127, 127, 213, 0.15)',
                tension: 0.3,
                fill: false,
                borderDash: [6, 4],
                pointRadius: 3
            });
        }

        datasets.push({
            label: '粗利',
            data: combinedProfitData,
            borderColor: '#00A862',
            backgroundColor: 'rgba(0, 168, 98, 0.1)',
            tension: 0.4,
            fill: true
        });

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
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
                                       this.uiManager.formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.uiManager.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    updateProfitChart(currentPeriod, currentSubPeriod) {
        const data = this.dataManager.getCurrentData(currentPeriod, currentSubPeriod);
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
                                return this.uiManager.formatCurrency(Math.abs(context.parsed.y));
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => this.uiManager.formatCurrency(Math.abs(value))
                        }
                    }
                }
            }
        });
    }
}
