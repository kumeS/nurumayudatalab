class ChildAsinManager {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.data = {}; // { parentAsin: { childAsin: { title: '', months: { '2026-01': { ... } } } } }
        this.months = new Set(); // '2026-01', '2026-02' ...
        this.loadedFiles = new Set(); // 読み込み済みファイル名の管理
        this.chart = null;
        
        this.sortState = {
            key: null, // 'parentAsin', 'childAsin', 'title', or monthKey
            direction: 'asc'
        };

        this.metricMap = {
            'sessions': { label: 'セッション数', key: 'セッション数 - 合計', type: 'number' },
            'sessionRate': { label: 'セッション率', key: 'セッション率 - 合計', type: 'percent' },
            'pageViews': { label: 'ページビュー数', key: 'ページビュー - 合計', type: 'number' },
            'pageViewRate': { label: 'ページビュー率', key: 'ページビュー率 - 合計', type: 'percent' },
            'unitSessionRate': { label: 'ユニットセッション率', key: 'ユニットセッション率', type: 'percent' },
            'orderedItems': { label: '注文商品点数', key: '注文された商品点数', type: 'number' },
            'orderedSales': { label: '注文売上', key: '注文商品の売上額', type: 'currency' }
        };

        this.initEventListeners();
    }

    initEventListeners() {
        const metricSelector = document.getElementById('childAsinMetricSelector');
        const alertSelector = document.getElementById('childAsinAlertThreshold');

        if (metricSelector) {
            metricSelector.addEventListener('change', () => {
                this.renderTable();
                this.renderChart();
            });
        }

        if (alertSelector) {
            alertSelector.addEventListener('change', () => {
                this.renderTable();
            });
        }
    }

    async processFile(file) {
        // 重複チェック
        if (this.loadedFiles.has(file.name)) {
            alert(`ファイル ${file.name} は既に読み込まれています。`);
            return { success: false };
        }

        // ファイル名から年と月を抽出
        // 例: 202601-子商品別.csv
        const match = file.name.match(/(\d{4})(\d{2})-子商品別\.csv/);
        if (!match) {
            console.warn(`ファイル名形式が一致しません: ${file.name}`);
            return { success: false };
        }

        const year = match[1];
        const month = match[2];
        const monthKey = `${year}-${month}`;

        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.mergeData(results.data, monthKey);
                    this.months.add(monthKey);
                    this.loadedFiles.add(file.name);
                    resolve({ success: true, rows: results.data, monthKey });
                },
                error: (error) => {
                    console.error('CSV Parse Error:', error);
                    reject(error);
                }
            });
        });
    }

    loadData(rows, fileName) {
        if (this.loadedFiles.has(fileName)) return;

        const match = fileName.match(/(\d{4})(\d{2})-子商品別\.csv/);
        if (!match) return;

        const year = match[1];
        const month = match[2];
        const monthKey = `${year}-${month}`;

        this.mergeData(rows, monthKey);
        this.months.add(monthKey);
        this.loadedFiles.add(fileName);
    }

    mergeData(rows, monthKey) {
        rows.forEach(row => {
            const parentAsin = row['（親）ASIN'];
            const childAsin = row['（子）ASIN'];
            const title = row['タイトル'];

            if (!parentAsin || !childAsin) return;

            if (!this.data[parentAsin]) {
                this.data[parentAsin] = {};
            }

            if (!this.data[parentAsin][childAsin]) {
                this.data[parentAsin][childAsin] = {
                    title: title,
                    months: {}
                };
            }

            // 数値データの整形
            const cleanRow = {};
            Object.keys(row).forEach(key => {
                let value = row[key];
                if (typeof value === 'string') {
                    // 通貨記号やパーセントを除去して数値化
                    if (value.includes('￥') || value.includes('¥')) {
                        value = parseFloat(value.replace(/[￥¥,]/g, ''));
                    } else if (value.includes('%')) {
                        value = parseFloat(value.replace(/[%]/g, '')); // パーセントはそのままの値(例: 3.5)で保持
                    } else if (!isNaN(value) && value.trim() !== '') {
                        value = parseFloat(value);
                    }
                }
                cleanRow[key] = value;
            });

            this.data[parentAsin][childAsin].months[monthKey] = cleanRow;
        });
    }

    updateUI() {
        this.renderTable();
        this.renderChart();
        
        // タブを表示状態にする（もし隠れていれば）
        const tabButton = document.querySelector('[data-tab="child-asin-detail"]');
        if (tabButton) {
            tabButton.style.display = 'inline-block';
        }
    }

    getSortedMonths() {
        return Array.from(this.months).sort((a, b) => {
            // 'YYYY-MM' 形式で辞書順ソートが年月順と一致する
            return a.localeCompare(b);
        });
    }

    getMonthInfo(month) {
        let season = '';
        let color = '';
        let icon = '';

        if (month >= 3 && month <= 5) {
            season = '春';
            color = '#e8f5e9'; // 薄い緑
            icon = '🌸';
        } else if (month >= 6 && month <= 8) {
            season = '夏';
            color = '#e3f2fd'; // 薄い青
            icon = '🌻';
        } else if (month >= 9 && month <= 11) {
            season = '秋';
            color = '#fff3e0'; // 薄いオレンジ
            icon = '🍁';
        } else {
            season = '冬';
            color = '#f3e5f5'; // 薄い紫
            icon = '❄️';
        }

        return { month, season, color, icon };
    }

    getSortedFlatData() {
        const metricKey = document.getElementById('childAsinMetricSelector').value;
        const metricInfo = this.metricMap[metricKey];
        const sortedMonths = this.getSortedMonths();

        // データのフラット化
        let flatData = [];
        Object.keys(this.data).forEach(parentAsin => {
            Object.keys(this.data[parentAsin]).forEach(childAsin => {
                flatData.push({
                    parentAsin,
                    childAsin,
                    ...this.data[parentAsin][childAsin]
                });
            });
        });

        // ソートロジック
        if (this.sortState.key) {
            flatData.sort((a, b) => {
                let valA, valB;
                
                if (['parentAsin', 'childAsin', 'title'].includes(this.sortState.key)) {
                    valA = a[this.sortState.key];
                    valB = b[this.sortState.key];
                } else {
                    // 月ごとのデータでのソート
                    const monthDataA = a.months[this.sortState.key];
                    const monthDataB = b.months[this.sortState.key];
                    valA = monthDataA ? monthDataA[metricInfo.key] : -Infinity;
                    valB = monthDataB ? monthDataB[metricInfo.key] : -Infinity;
                }

                if (valA < valB) return this.sortState.direction === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortState.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // デフォルトソート: 最新月の降順
            const latestMonth = sortedMonths[sortedMonths.length - 1];
            if (latestMonth) {
                flatData.sort((a, b) => {
                    const valA = (a.months[latestMonth] && a.months[latestMonth][metricInfo.key]) || 0;
                    const valB = (b.months[latestMonth] && b.months[latestMonth][metricInfo.key]) || 0;
                    return valB - valA;
                });
            }
        }

        return flatData;
    }

    renderTable() {
        const table = document.getElementById('childAsinTable');
        if (!table) return;

        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        const metricKey = document.getElementById('childAsinMetricSelector').value;
        const metricInfo = this.metricMap[metricKey];
        const alertThreshold = parseFloat(document.getElementById('childAsinAlertThreshold').value);

        // ヘッダーの更新
        thead.innerHTML = '';
        const headers = [
            { key: 'parentAsin', label: '親ASIN', width: '100px' },
            { key: 'childAsin', label: '子ASIN', width: '100px' },
            { key: 'title', label: '商品名', width: '300px' }
        ];
        
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h.label;
            th.style.cursor = 'pointer';
            th.style.position = 'relative';
            if (h.width) th.style.width = h.width;

            th.onclick = (e) => {
                if (e.target.classList.contains('resize-handle')) return;
                this.handleSort(h.key);
            };

            if (this.sortState.key === h.key) {
                th.textContent += this.sortState.direction === 'asc' ? ' ▲' : ' ▼';
            }
            
            this.addResizeHandle(th);
            thead.appendChild(th);
        });

        const sortedMonths = this.getSortedMonths();
        sortedMonths.forEach(monthKey => {
            const [yearStr, monthStr] = monthKey.split('-');
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            const info = this.getMonthInfo(month);

            const th = document.createElement('th');
            th.style.cursor = 'pointer';
            th.style.backgroundColor = info.color;
            th.style.position = 'relative';
            th.style.minWidth = '90px';

            th.onclick = (e) => {
                if (e.target.classList.contains('resize-handle')) return;
                this.handleSort(monthKey);
            };
            
            // ヘッダー内容の構築
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'center';
            div.style.fontSize = '0.9em';
            div.style.pointerEvents = 'none'; // クリックイベントをthに透過させる
            
            const monthSpan = document.createElement('span');
            let label = `${info.icon} ${year}年${month}月`;
            if (this.sortState.key === monthKey) {
                label += this.sortState.direction === 'asc' ? ' ▲' : ' ▼';
            }
            monthSpan.textContent = label;

            div.appendChild(monthSpan);
            th.appendChild(div);
            
            this.addResizeHandle(th);
            thead.appendChild(th);
        });

        // データの取得（ソート済み）
        const flatData = this.getSortedFlatData();

        // ボディの更新
        tbody.innerHTML = '';
        
        flatData.forEach(item => {
            const row = document.createElement('tr');

            // 基本情報
            row.innerHTML = `
                <td style="text-align: center;">${item.parentAsin}</td>
                <td style="text-align: center;">${item.childAsin}</td>
                <td title="${item.title}">${item.title}</td>
            `;

            // 月ごとのデータ
            sortedMonths.forEach((monthKey, index) => {
                const cell = document.createElement('td');
                const monthData = item.months[monthKey];
                
                if (monthData) {
                    const value = monthData[metricInfo.key];
                    const formattedValue = this.formatValue(value, metricInfo.type);
                    cell.textContent = formattedValue;
                    cell.style.textAlign = 'center';

                    // 履歴データの取得
                    const getVal = (idx) => {
                        if (idx < 0) return null;
                        const m = sortedMonths[idx];
                        const d = item.months[m];
                        return d ? d[metricInfo.key] : null;
                    };

                    const prev1 = getVal(index - 1);
                    const prev2 = getVal(index - 2);
                    const prev3 = getVal(index - 3);

                    // 減少判定関数 (閾値使用)
                    const isDec = (curr, prev) => {
                        if (curr === null || prev === null) return false;
                        if (curr >= prev) return false;
                        const rate = (prev - curr) / prev;
                        return rate >= alertThreshold;
                    };

                    // 増加判定関数 (単純増加)
                    const isInc = (curr, prev) => {
                        if (curr === null || prev === null) return false;
                        return curr > prev;
                    };

                    // 連続判定
                    if (isDec(value, prev1) && isDec(prev1, prev2) && isDec(prev2, prev3)) {
                        cell.className = 'trend-decrease-3';
                        cell.title = '3ヶ月連続で減少しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▼▼▼</span>';
                    }
                    else if (isDec(value, prev1) && isDec(prev1, prev2)) {
                        cell.className = 'trend-decrease-2';
                        cell.title = '2ヶ月連続で減少しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▼▼</span>';
                    }
                    else if (isDec(value, prev1)) {
                        cell.className = 'trend-decrease-1';
                        const rate = (prev1 - value) / prev1;
                        cell.title = `前月比 ${(rate * 100).toFixed(1)}% 減少`;
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▼</span>';
                    }
                    
                    else if (isInc(value, prev1) && isInc(prev1, prev2) && isInc(prev2, prev3)) {
                        cell.className = 'trend-increase-3';
                        cell.title = '3ヶ月連続で増加しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▲▲▲</span>';
                    }
                    else if (isInc(value, prev1) && isInc(prev1, prev2)) {
                        cell.className = 'trend-increase-2';
                        cell.title = '2ヶ月連続で増加しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▲▲</span>';
                    }
                    else if (isInc(value, prev1)) {
                        cell.className = 'trend-increase-1';
                        cell.title = '前月より増加';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▲</span>';
                    }

                } else {
                    cell.textContent = '-';
                    cell.style.textAlign = 'center';
                }
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    }

    addResizeHandle(th) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        
        handle.addEventListener('mousedown', (e) => this.initResize(e, th));
        handle.addEventListener('click', (e) => e.stopPropagation());

        th.appendChild(handle);
    }

    initResize(e, th) {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = th.offsetWidth;
        const handle = e.target;

        handle.classList.add('active');
        document.body.classList.add('resizing');

        const onMouseMove = (moveEvent) => {
            const width = startWidth + (moveEvent.pageX - startX);
            if (width > 30) {
                th.style.width = `${width}px`;
                th.style.minWidth = `${width}px`;
                th.style.maxWidth = `${width}px`;
            }
        };

        const onMouseUp = () => {
            handle.classList.remove('active');
            document.body.classList.remove('resizing');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    handleSort(key) {
        if (this.sortState.key === key) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.key = key;
            this.sortState.direction = 'desc'; // 数値が多いのでデフォルト降順が便利
        }
        this.renderTable();
        this.renderChart();
    }

    renderChart() {
        const ctx = document.getElementById('childAsinChart');
        if (!ctx) return;

        const container = document.getElementById('childAsinChartContainer');
        container.style.display = 'block';

        if (this.chart) {
            this.chart.destroy();
        }

        const metricKey = document.getElementById('childAsinMetricSelector').value;
        const metricInfo = this.metricMap[metricKey];
        const sortedMonths = this.getSortedMonths();

        // ソート済みのデータを取得し、上位10件を抽出
        const flatData = this.getSortedFlatData();
        const top10Data = flatData.slice(0, 10);

        const datasets = top10Data.map(item => {
            const data = sortedMonths.map(monthKey => {
                const monthData = item.months[monthKey];
                return monthData ? monthData[metricInfo.key] : null;
            });

            return {
                label: item.childAsin,
                fullTitle: item.title,
                data: data,
                fill: false,
                tension: 0.1
            };
        });

        // ラベルを YYYY年M月 形式に変換
        const chartLabels = sortedMonths.map(monthKey => {
            const [yearStr, monthStr] = monthKey.split('-');
            return `${yearStr}年${parseInt(monthStr, 10)}月`;
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${metricInfo.label}の推移 (上位10件)`
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        mode: 'nearest',
                        intersect: true,
                        callbacks: {
                            title: (context) => {
                                return context[0].label;
                            },
                            label: (context) => {
                                const dataset = context.dataset;
                                const val = context.parsed.y;
                                const formattedVal = this.formatValue(val, metricInfo.type);
                                return `${dataset.fullTitle || dataset.label}: ${formattedVal}`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: true
                }
            }
        });
    }

    truncateString(str, num) {
        if (!str) return '';
        if (str.length <= num) {
            return str;
        }
        return str.slice(0, num) + '...';
    }

    formatValue(value, type) {
        if (value === undefined || value === null) return '-';
        
        switch (type) {
            case 'percent':
                return value.toFixed(2) + '%';
            case 'currency':
                return '¥' + value.toLocaleString();
            case 'number':
                return value.toLocaleString();
            default:
                return value;
        }
    }
}
