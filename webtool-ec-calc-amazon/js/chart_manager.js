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

        let labels, salesData, profitData;

        if (currentPeriod === 'all') {
            const monthlyData = new Map();
            
            this.dataManager.periods.forEach((periodData, period) => {
                let totalSales = 0;
                let totalProfit = 0;
                
                Object.values(periodData.dailyData).forEach(dayData => {
                    totalSales += dayData.sales || 0;
                    totalProfit += dayData.profit || 0;
                });
                
                monthlyData.set(period, {
                    sales: totalSales,
                    profit: totalProfit
                });
            });
            
            const sortedMonths = Array.from(monthlyData.keys()).sort((a, b) => {
                const [yearA, monthA] = a.replace('年', '/').replace('月', '').split('/').map(Number);
                const [yearB, monthB] = b.replace('年', '/').replace('月', '').split('/').map(Number);
                return yearA !== yearB ? yearA - yearB : monthA - monthB;
            });
            
            labels = sortedMonths;
            salesData = sortedMonths.map(month => monthlyData.get(month).sales);
            profitData = sortedMonths.map(month => monthlyData.get(month).profit);
        } else {
            const allDates = this.uiManager.generateContinuousDates(data.dailyData, currentPeriod);
            salesData = allDates.map(date => data.dailyData[date] ? data.dailyData[date].sales : 0);
            profitData = allDates.map(date => data.dailyData[date] ? data.dailyData[date].profit : 0);
            
            labels = allDates.map(date => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            });
        }

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
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
