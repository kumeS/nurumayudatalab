class ChildAsinManager {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.data = {}; // { parentAsin: { childAsin: { title: '', weeks: { '2025-46': { ... } } } } }
        this.weeks = new Set(); // '2025-46', '2025-47' ...
        this.loadedFiles = new Set(); // 読み込み済みファイル名の管理
        this.chart = null;
        
        this.sortState = {
            key: null, // 'parentAsin', 'childAsin', 'title', or weekKey
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

        // ファイル名から年と週を抽出
        // 例: 2025-week46-子商品別.csv
        const match = file.name.match(/(\d{4})-week(\d+)/);
        if (!match) {
            console.warn(`ファイル名形式が一致しません: ${file.name}`);
            return { success: false };
        }

        const year = match[1];
        const week = match[2];
        const weekKey = `${year}-${week}`;

        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.mergeData(results.data, weekKey);
                    this.weeks.add(weekKey);
                    this.loadedFiles.add(file.name);
                    resolve({ success: true, rows: results.data, weekKey });
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

        const match = fileName.match(/(\d{4})-week(\d+)/);
        if (!match) return;

        const year = match[1];
        const week = match[2];
        const weekKey = `${year}-${week}`;

        this.mergeData(rows, weekKey);
        this.weeks.add(weekKey);
        this.loadedFiles.add(fileName);
    }

    mergeData(rows, weekKey) {
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
                    weeks: {}
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

            this.data[parentAsin][childAsin].weeks[weekKey] = cleanRow;
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

    getSortedWeeks() {
        return Array.from(this.weeks).sort((a, b) => {
            const [y1, w1] = a.split('-').map(Number);
            const [y2, w2] = b.split('-').map(Number);
            if (y1 !== y2) return y1 - y2;
            return w1 - w2;
        });
    }

    getWeekInfo(year, week) {
        // ISO週番号から日付を計算
        // 1月4日を含む週が第1週
        const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
        const month = simpleDate.getMonth() + 1;
        
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
        const sortedWeeks = this.getSortedWeeks();

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
                    // 週ごとのデータでのソート
                    const weekDataA = a.weeks[this.sortState.key];
                    const weekDataB = b.weeks[this.sortState.key];
                    // データがない場合は -Infinity として扱う（昇順なら先頭、降順なら末尾...いや、データなしは常に下にしたいか？）
                    // ここでは単純に比較
                    valA = weekDataA ? weekDataA[metricInfo.key] : -Infinity;
                    valB = weekDataB ? weekDataB[metricInfo.key] : -Infinity;
                }

                if (valA < valB) return this.sortState.direction === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortState.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // デフォルトソート: 最新週の降順
            const latestWeek = sortedWeeks[sortedWeeks.length - 1];
            if (latestWeek) {
                flatData.sort((a, b) => {
                    const valA = (a.weeks[latestWeek] && a.weeks[latestWeek][metricInfo.key]) || 0;
                    const valB = (b.weeks[latestWeek] && b.weeks[latestWeek][metricInfo.key]) || 0;
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

        const sortedWeeks = this.getSortedWeeks();
        sortedWeeks.forEach(week => {
            const [year, weekNum] = week.split('-').map(Number);
            const info = this.getWeekInfo(year, weekNum);

            const th = document.createElement('th');
            th.style.cursor = 'pointer';
            th.style.backgroundColor = info.color;
            th.style.position = 'relative';
            th.style.minWidth = '80px'; // 週カラムの最小幅

            th.onclick = (e) => {
                if (e.target.classList.contains('resize-handle')) return;
                this.handleSort(week);
            };
            
            // ヘッダー内容の構築
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'center';
            div.style.fontSize = '0.9em';
            div.style.pointerEvents = 'none'; // クリックイベントをthに透過させる
            
            const weekSpan = document.createElement('span');
            weekSpan.textContent = week;
            if (this.sortState.key === week) {
                weekSpan.textContent += this.sortState.direction === 'asc' ? ' ▲' : ' ▼';
            }
            
            const infoSpan = document.createElement('span');
            infoSpan.textContent = `${info.icon} ${info.month}月`;
            infoSpan.style.fontSize = '0.85em';
            infoSpan.style.marginTop = '2px';

            div.appendChild(weekSpan);
            div.appendChild(infoSpan);
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

            // 週ごとのデータ
            sortedWeeks.forEach((week, index) => {
                const cell = document.createElement('td');
                const weekData = item.weeks[week];
                
                if (weekData) {
                    const value = weekData[metricInfo.key];
                    const formattedValue = this.formatValue(value, metricInfo.type);
                    cell.textContent = formattedValue;
                    cell.style.textAlign = 'center';

                    // 履歴データの取得
                    const getVal = (idx) => {
                        if (idx < 0) return null;
                        const w = sortedWeeks[idx];
                        const d = item.weeks[w];
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
                    // 3週連続減少: 今回減、前回減、前々回減
                    if (isDec(value, prev1) && isDec(prev1, prev2) && isDec(prev2, prev3)) {
                        cell.className = 'trend-decrease-3';
                        cell.title = '3週連続で減少しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▼▼▼</span>';
                    }
                    // 2週連続減少
                    else if (isDec(value, prev1) && isDec(prev1, prev2)) {
                        cell.className = 'trend-decrease-2';
                        cell.title = '2週連続で減少しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▼▼</span>';
                    }
                    // 1週減少
                    else if (isDec(value, prev1)) {
                        cell.className = 'trend-decrease-1';
                        const rate = (prev1 - value) / prev1;
                        cell.title = `前週比 ${(rate * 100).toFixed(1)}% 減少`;
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▼</span>';
                    }
                    
                    // 3週連続増加
                    else if (isInc(value, prev1) && isInc(prev1, prev2) && isInc(prev2, prev3)) {
                        cell.className = 'trend-increase-3';
                        cell.title = '3週連続で増加しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▲▲▲</span>';
                    }
                    // 2週連続増加
                    else if (isInc(value, prev1) && isInc(prev1, prev2)) {
                        cell.className = 'trend-increase-2';
                        cell.title = '2週連続で増加しています';
                        cell.innerHTML += ' <span style="font-size: 0.8em;">▲▲</span>';
                    }
                    // 1週増加
                    else if (isInc(value, prev1)) {
                        cell.className = 'trend-increase-1';
                        cell.title = '前週より増加';
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
        const sortedWeeks = this.getSortedWeeks();

        // ソート済みのデータを取得し、上位10件を抽出
        const flatData = this.getSortedFlatData();
        const top10Data = flatData.slice(0, 10);

        const datasets = top10Data.map(item => {
            const data = sortedWeeks.map(week => {
                const weekData = item.weeks[week];
                return weekData ? weekData[metricInfo.key] : null;
            });

            return {
                label: item.childAsin, // レジェンドはASINのみですっきりさせる
                fullTitle: item.title, // ツールチップ用に完全なタイトルを保持
                data: data,
                fill: false,
                tension: 0.1
            };
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedWeeks,
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
                                // ツールチップのタイトルには週を表示
                                return context[0].label;
                            },
                            label: (context) => {
                                const dataset = context.dataset;
                                const val = context.parsed.y;
                                const formattedVal = this.formatValue(val, metricInfo.type);
                                // 商品名と値を表示
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
