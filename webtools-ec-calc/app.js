class ECCalculator {
    constructor() {
        this.currentPlatform = 'amazon';
        this.processedData = null;
        this.salesChart = null;
        this.profitChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Platform selector
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPlatform = e.target.dataset.platform;
                this.clearResults();
            });
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processFile(e.target.files[0]);
            }
        });

        // Upload area click
        document.getElementById('uploadArea').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'text/csv') {
                this.processFile(files[0]);
            } else {
                this.showError('CSVファイルをドロップしてください。');
            }
        });
    }

    async processFile(file) {
        this.showLoading(true);
        this.clearError();

        try {
            const text = await this.readFile(file);
            const data = this.parseCSV(text);
            
            if (this.currentPlatform === 'amazon') {
                this.processedData = this.processAmazonData(data);
            } else {
                this.processedData = this.processEbayData(data);
            }

            this.displayResults();
        } catch (error) {
            this.showError(`ファイル処理エラー: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSVファイルが空または無効です。');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return { headers, data };
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim().replace(/"/g, ''));
        return result;
    }

    processAmazonData(csvData) {
        const processed = {
            platform: 'Amazon',
            totalSales: 0,
            totalFees: 0,
            totalProfit: 0,
            itemCount: 0,
            monthlyData: {},
            detailData: []
        };

        csvData.data.forEach(row => {
            try {
                // Amazon特有のフィールドを処理
                const date = this.parseDate(row['date/time'] || row['Date'] || row['注文日']);
                const sales = this.parseAmount(row['total'] || row['Total'] || row['売上金額'] || '0');
                const fees = this.parseAmount(row['fees'] || row['Fees'] || row['手数料'] || '0');
                const quantity = parseInt(row['quantity'] || row['Quantity'] || row['数量'] || '1');

                if (date) {
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    
                    if (!processed.monthlyData[monthKey]) {
                        processed.monthlyData[monthKey] = {
                            sales: 0,
                            fees: 0,
                            profit: 0,
                            count: 0
                        };
                    }

                    processed.monthlyData[monthKey].sales += sales;
                    processed.monthlyData[monthKey].fees += fees;
                    processed.monthlyData[monthKey].profit += (sales - fees);
                    processed.monthlyData[monthKey].count += quantity;

                    processed.totalSales += sales;
                    processed.totalFees += fees;
                    processed.totalProfit += (sales - fees);
                    processed.itemCount += quantity;

                    processed.detailData.push({
                        date: date.toLocaleDateString('ja-JP'),
                        product: row['sku'] || row['SKU'] || row['商品名'] || 'N/A',
                        sales: sales,
                        fees: fees,
                        profit: sales - fees,
                        quantity: quantity
                    });
                }
            } catch (error) {
                console.warn('行の処理をスキップ:', error);
            }
        });

        return processed;
    }

    processEbayData(csvData) {
        const processed = {
            platform: 'eBay',
            totalSales: 0,
            totalFees: 0,
            totalProfit: 0,
            itemCount: 0,
            monthlyData: {},
            detailData: []
        };

        csvData.data.forEach(row => {
            try {
                // eBay特有のフィールドを処理
                const date = this.parseDate(row['Sale Date'] || row['販売日'] || row['Date']);
                const sales = this.parseAmount(row['Total Price'] || row['売上金額'] || row['Sales'] || '0');
                const fees = this.parseAmount(row['eBay Fee'] || row['Final Value Fee'] || row['手数料'] || '0');
                const quantity = parseInt(row['Quantity'] || row['数量'] || '1');

                if (date) {
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    
                    if (!processed.monthlyData[monthKey]) {
                        processed.monthlyData[monthKey] = {
                            sales: 0,
                            fees: 0,
                            profit: 0,
                            count: 0
                        };
                    }

                    processed.monthlyData[monthKey].sales += sales;
                    processed.monthlyData[monthKey].fees += fees;
                    processed.monthlyData[monthKey].profit += (sales - fees);
                    processed.monthlyData[monthKey].count += quantity;

                    processed.totalSales += sales;
                    processed.totalFees += fees;
                    processed.totalProfit += (sales - fees);
                    processed.itemCount += quantity;

                    processed.detailData.push({
                        date: date.toLocaleDateString('ja-JP'),
                        product: row['Title'] || row['Item Title'] || row['商品名'] || 'N/A',
                        sales: sales,
                        fees: fees,
                        profit: sales - fees,
                        quantity: quantity
                    });
                }
            } catch (error) {
                console.warn('行の処理をスキップ:', error);
            }
        });

        return processed;
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date;
        }

        // 日本語形式の日付も試す
        const jpDateMatch = dateString.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
        if (jpDateMatch) {
            return new Date(jpDateMatch[1], jpDateMatch[2] - 1, jpDateMatch[3]);
        }

        return null;
    }

    parseAmount(amountString) {
        if (!amountString) return 0;
        
        // 通貨記号と不要な文字を除去
        const cleaned = amountString.toString()
            .replace(/[¥$€£,]/g, '')
            .replace(/[^\d.-]/g, '');
        
        const amount = parseFloat(cleaned);
        return isNaN(amount) ? 0 : Math.abs(amount);
    }

    displayResults() {
        if (!this.processedData) return;

        document.getElementById('resultsSection').style.display = 'block';
        
        this.createSummaryCards();
        this.createCharts();
        this.createDataTable();
    }

    createSummaryCards() {
        const container = document.getElementById('summaryCards');
        const data = this.processedData;

        container.innerHTML = `
            <div class="summary-card">
                <h3>総売上</h3>
                <div class="value">¥${data.totalSales.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>総手数料</h3>
                <div class="value">¥${data.totalFees.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>純利益</h3>
                <div class="value">¥${data.totalProfit.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>販売点数</h3>
                <div class="value">${data.itemCount.toLocaleString()}点</div>
            </div>
        `;
    }

    createCharts() {
        this.createSalesChart();
        this.createProfitChart();
    }

    createSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        const monthlyData = this.processedData.monthlyData;
        
        const labels = Object.keys(monthlyData).sort();
        const salesData = labels.map(month => monthlyData[month].sales);

        if (this.salesChart) {
            this.salesChart.destroy();
        }

        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(label => {
                    const [year, month] = label.split('-');
                    return `${year}年${month}月`;
                }),
                datasets: [{
                    label: '月次売上',
                    data: salesData,
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createProfitChart() {
        const ctx = document.getElementById('profitChart').getContext('2d');
        const monthlyData = this.processedData.monthlyData;
        
        const labels = Object.keys(monthlyData).sort();
        const salesData = labels.map(month => monthlyData[month].sales);
        const feesData = labels.map(month => monthlyData[month].fees);
        const profitData = labels.map(month => monthlyData[month].profit);

        if (this.profitChart) {
            this.profitChart.destroy();
        }

        this.profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(label => {
                    const [year, month] = label.split('-');
                    return `${year}年${month}月`;
                }),
                datasets: [
                    {
                        label: '売上',
                        data: salesData,
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    },
                    {
                        label: '手数料',
                        data: feesData,
                        backgroundColor: 'rgba(255, 107, 107, 0.8)',
                    },
                    {
                        label: '利益',
                        data: profitData,
                        backgroundColor: 'rgba(78, 205, 196, 0.8)',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createDataTable() {
        const header = document.getElementById('tableHeader');
        const body = document.getElementById('tableBody');
        
        header.innerHTML = `
            <tr>
                <th>日付</th>
                <th>商品</th>
                <th>売上</th>
                <th>手数料</th>
                <th>利益</th>
                <th>数量</th>
            </tr>
        `;

        body.innerHTML = this.processedData.detailData
            .slice(0, 100) // 最初の100件のみ表示
            .map(row => `
                <tr>
                    <td>${row.date}</td>
                    <td>${row.product}</td>
                    <td>¥${row.sales.toLocaleString()}</td>
                    <td>¥${row.fees.toLocaleString()}</td>
                    <td>¥${row.profit.toLocaleString()}</td>
                    <td>${row.quantity}</td>
                </tr>
            `).join('');
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    clearResults() {
        document.getElementById('resultsSection').style.display = 'none';
        this.processedData = null;
        if (this.salesChart) {
            this.salesChart.destroy();
            this.salesChart = null;
        }
        if (this.profitChart) {
            this.profitChart.destroy();
            this.profitChart = null;
        }
    }
}

// エクスポート機能
function exportToCSV() {
    if (!window.ecCalculator || !window.ecCalculator.processedData) {
        alert('データがありません');
        return;
    }

    const data = window.ecCalculator.processedData.detailData;
    const headers = ['日付', '商品', '売上', '手数料', '利益', '数量'];
    
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
        csv += [
            row.date,
            `"${row.product}"`,
            row.sales,
            row.fees,
            row.profit,
            row.quantity
        ].join(',') + '\n';
    });

    downloadFile(csv, 'ec-analysis.csv', 'text/csv');
}

function exportToJSON() {
    if (!window.ecCalculator || !window.ecCalculator.processedData) {
        alert('データがありません');
        return;
    }

    const json = JSON.stringify(window.ecCalculator.processedData, null, 2);
    downloadFile(json, 'ec-analysis.json', 'application/json');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.ecCalculator = new ECCalculator();
});