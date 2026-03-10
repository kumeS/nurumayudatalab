/**
 * FbaInventoryManager: FBA在庫レポートと月別子ASINデータを組み合わせ、
 * 在庫不足を検知し仕入推奨数を計算する。
 */
class FbaInventoryManager {
    constructor(dataManager, childAsinManager, onFbaFileLoaded) {
        this.dataManager = dataManager;
        this.childAsinManager = childAsinManager;
        this.onFbaFileLoaded = onFbaFileLoaded;
        /** @type {Object.<string, { availableQty: number, name: string, snapshotDate: string }>} asin -> FBA row summary */
        this.fbaByAsin = {};
        /** 表示用のファイル名（1つのみ登録、上書き） */
        this.fbaFileName = null;
        /** 選択された月（1〜3ヶ月） */
        this.selectedMonths = [];
        /** テーブルソート用: 現在の行データ・ソートキー・昇降順 */
        this.fbaTableRows = [];
        this.fbaSortKey = 'avgMonthly';
        this.fbaSortDir = 'desc';
        this.fbaPriorityView = false;  // 優先上位表示モード（販売数合計で親ASINグループを上位表示）
        this._fbaSortBound = false;
        this._fbaTooltipBound = false;
        this._fbaPriorityBound = false;

        this.ORDERED_ITEMS_KEY = '注文された商品点数';

        this.initEventListeners();
    }

    initEventListeners() {
        const uploadBtn = document.getElementById('fbaReportUploadBtn');
        const fileInput = document.getElementById('fbaReportFileInput');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
                fileInput.value = '';
            });
        }
    }

    /**
     * FBAレポートCSVを解析し、既存データを上書き保存する。
     * @param {File} file
     * @returns {Promise<{ success: boolean }>}
     */
    async processFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.mergeFbaData(results.data);
                    this.fbaFileName = file.name;
                    resolve({ success: true });
                },
                error: (err) => {
                    console.error('FBA CSV Parse Error:', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * 既存のFBA登録を削除してから新規保存する（1ファイルのみのため上書き）。
     */
    async handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('CSVファイルを選択してください。');
            return;
        }
        if (!this.dataManager.db) {
            alert('データベースの初期化に失敗しています。ページをリロードしてください。');
            return;
        }

        if (this.fbaFileName) {
            this.dataManager.loadedFiles.delete(this.fbaFileName);
            await this.dataManager.removeFileFromDB(this.fbaFileName);
        }

        try {
            const { rows } = await this.parseFbaCSV(file);
            this.mergeFbaData(rows);
            this.fbaFileName = file.name;
            await this.dataManager.saveDataToDB(file.name, rows, file.size, 'fba-inventory');
            this.dataManager.loadedFiles.set(file.name, {
                data: rows,
                fileName: file.name,
                fileSize: file.size,
                timestamp: new Date().toISOString(),
                sourceType: 'fba-inventory'
            });
            this.renderUI();
            if (document.getElementById('fbaReportFileName')) {
                document.getElementById('fbaReportFileName').textContent = `${file.name}（登録済み）`;
            }
            if (this.onFbaFileLoaded) this.onFbaFileLoaded();
        } catch (e) {
            console.error('FBAレポートの処理に失敗しました:', e);
            alert(`ファイル ${file.name} の処理に失敗しました。`);
        }
    }

    parseFbaCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => resolve({ rows: res.data }),
                error: reject
            });
        });
    }

    /**
     * FBAレポートの行から asin -> { availableQty, name, snapshotDate } を構築。
     * 同一ASINが複数行ある場合は在庫数を合算する。
     */
    mergeFbaData(rows) {
        const map = {};
        const colDate = 'スナップショットの日付';
        const colAsin = 'asin';
        const colName = '商品名';
        const colQty = '在庫あり';

        rows.forEach(row => {
            const asin = (row[colAsin] || '').toString().trim();
            if (!asin) return;

            const qty = parseInt(row[colQty], 10) || 0;
            const name = (row[colName] || '').toString().trim();
            const snapshotDate = (row[colDate] || '').toString().trim();

            if (!map[asin]) {
                map[asin] = { availableQty: 0, name, snapshotDate };
            }
            map[asin].availableQty += qty;
        });
        this.fbaByAsin = map;
    }

    /**
     * IndexedDB復元時に呼ばれる。
     * @param {Array<Object>} rows - FBA CSVのパース結果
     * @param {string} fileName
     */
    loadData(rows, fileName) {
        this.mergeFbaData(rows);
        this.fbaFileName = fileName;
    }

    /**
     * タブ切り替え時・データ変更時に呼ばれる。
     */
    renderUI() {
        this.renderFileStatus();
        this.renderMonthSelector();
        this.calculateAndRenderTable();
    }

    renderFileStatus() {
        const el = document.getElementById('fbaReportFileName');
        if (!el) return;
        if (this.fbaFileName) {
            el.textContent = `${this.fbaFileName}（登録済み）`;
        } else {
            el.textContent = '未登録';
        }
    }

    /**
     * childAsinManager.months から月選択用のチェックボックスを生成（最大3ヶ月）。
     */
    renderMonthSelector() {
        const container = document.getElementById('fbaMonthSelector');
        if (!container) return;

        const sortedMonths = this.childAsinManager.getSortedMonths();
        if (sortedMonths.length === 0) {
            container.innerHTML = '<span style="color:#6c757d;">月別子ASINデータをアップロードすると選択できます。</span>';
            return;
        }

        const maxSelect = 3;
        let html = '';
        sortedMonths.forEach(monthKey => {
            const [y, m] = monthKey.split('-');
            const label = `${y}年${m}月`;
            const checked = this.selectedMonths.includes(monthKey) ? ' checked' : '';
            html += `<label style="margin-right: 16px;"><input type="checkbox" class="fba-month-check" data-month="${monthKey}"${checked}> ${label}</label>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.fba-month-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = container.querySelectorAll('.fba-month-check:checked');
                if (allChecked.length > maxSelect) {
                    const list = Array.from(allChecked);
                    const toUncheck = list.find(c => c !== cb) || list[0];
                    toUncheck.checked = false;
                    return;
                }
                this.selectedMonths = Array.from(allChecked).map(c => c.dataset.month).sort();
                this.calculateAndRenderTable();
            });
        });

        this.selectedMonths = Array.from(container.querySelectorAll('.fba-month-check:checked')).map(c => c.dataset.month).sort();
    }

    /**
     * 選択月から月平均販売数を算出し、必要在庫・仕入推奨数を計算してテーブルを描画する。
     */
    calculateAndRenderTable() {
        const tbody = document.querySelector('#fbaForecastTable tbody');
        const exportBtn = document.getElementById('fbaForecastExportBtn');
        if (!tbody) return;

        const hasFba = Object.keys(this.fbaByAsin).length > 0;
        const hasMonths = this.selectedMonths.length >= 1 && this.selectedMonths.length <= 3;
        if (!hasFba || !hasMonths) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#6c757d;">FBAレポートをアップロードし、1〜3ヶ月を選択してください。</td></tr>';
            if (exportBtn) exportBtn.style.display = 'none';
            const priorityBtn = document.getElementById('fbaForecastPriorityBtn');
            if (priorityBtn) priorityBtn.style.display = 'none';
            return;
        }

        const orderedItemsKey = this.ORDERED_ITEMS_KEY;
        const rows = [];

        this.childAsinManager.getSortedMonths();
        const data = this.childAsinManager.data;

        Object.keys(data).forEach(parentAsin => {
            Object.keys(data[parentAsin]).forEach(childAsin => {
                const node = data[parentAsin][childAsin];
                const months = node.months || {};
                let totalUnits = 0;
                this.selectedMonths.forEach(m => {
                    const val = months[m] && months[m][orderedItemsKey];
                    totalUnits += (typeof val === 'number' && !isNaN(val)) ? val : 0;
                });
                const avgMonthly = this.selectedMonths.length === 0 ? 0 : totalUnits / this.selectedMonths.length;
                const fba = this.fbaByAsin[childAsin];
                const currentStock = fba ? fba.availableQty : 0;
                const title = (node.title || '').toString().trim();

                let minStock, maxStock, monthsLabel;
                if (avgMonthly >= 10) {
                    minStock = Math.ceil(avgMonthly * 1.5);
                    maxStock = Math.ceil(avgMonthly * 2.0);
                    monthsLabel = '1.5〜2';
                } else {
                    minStock = Math.ceil(avgMonthly * 1.0);
                    maxStock = Math.max(minStock, Math.ceil(avgMonthly * 1.5));
                    monthsLabel = '1';
                }
                const restockQty = Math.max(0, minStock - currentStock);
                const restockMonths = avgMonthly > 0 ? restockQty / avgMonthly : null;
                let statusKey, statusLabel;
                if (currentStock < minStock) {
                    statusKey = 'short';
                    statusLabel = '在庫不足';
                } else if (currentStock <= maxStock) {
                    statusKey = 'ok';
                    statusLabel = '適正';
                } else {
                    statusKey = 'excess';
                    statusLabel = '過剰在庫';
                }

                rows.push({
                    childAsin,
                    title: title || (fba ? fba.name : ''),
                    periodSales: totalUnits,
                    avgMonthly,
                    currentStock,
                    minStock,
                    maxStock,
                    monthsLabel,
                    restockQty,
                    restockMonths,
                    statusKey,
                    statusLabel
                });
            });
        });

        this.fbaTableRows = rows;
        this.applyFbaSort();
        this.renderFbaTableBody();
        this.bindFbaTableSortOnce();
        this.bindFbaPriorityBtnOnce();
        if (exportBtn) exportBtn.style.display = 'inline-block';
        const priorityBtn = document.getElementById('fbaForecastPriorityBtn');
        if (priorityBtn) priorityBtn.style.display = 'inline-block';
    }

    applyFbaSort() {
        if (this.fbaPriorityView) {
            this.applyFbaPrioritySort();
            return;
        }
        const key = this.fbaSortKey;
        const dir = this.fbaSortDir === 'asc' ? 1 : -1;
        this.fbaTableRows.sort((a, b) => {
            const va = a[key];
            const vb = b[key];
            if (typeof va === 'number' && typeof vb === 'number') return dir * (va - vb);
            const sa = String(va ?? '');
            const sb = String(vb ?? '');
            return dir * sa.localeCompare(sb, undefined, { numeric: true });
        });
    }

    /**
     * 親ASIN（商品名先頭20文字）ごとにグループ化し、販売数合計の多いグループを上から表示。
     */
    applyFbaPrioritySort() {
        const groups = new Map(); // prefix -> { totalSales, rows }
        for (const r of this.fbaTableRows) {
            const prefix = getTitlePrefixForGroup(r.title);
            if (!groups.has(prefix)) groups.set(prefix, { totalSales: 0, rows: [] });
            const g = groups.get(prefix);
            g.totalSales += (r.periodSales || 0);
            g.rows.push(r);
        }
        const sortedGroups = Array.from(groups.entries())
            .map(([prefix, g]) => g)
            .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));
        this.fbaTableRows = sortedGroups.flatMap(g => g.rows);
    }

    bindFbaPriorityBtnOnce() {
        if (this._fbaPriorityBound) return;
        this._fbaPriorityBound = true;
        const btn = document.getElementById('fbaForecastPriorityBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            this.fbaPriorityView = !this.fbaPriorityView;
            btn.textContent = this.fbaPriorityView ? '📊 通常表示' : '📊 優先上位表示';
            this.applyFbaSort();
            this.renderFbaTableBody();
        });
    }

    renderFbaTableBody() {
        const tbody = document.querySelector('#fbaForecastTable tbody');
        if (!tbody || this.fbaTableRows.length === 0) return;
        const prefixOrder = [];
        const seen = new Set();
        for (const r of this.fbaTableRows) {
            const p = getTitlePrefixForGroup(r.title);
            if (!seen.has(p)) { seen.add(p); prefixOrder.push(p); }
        }
        const prefixToIndex = {};
        prefixOrder.forEach((p, i) => { prefixToIndex[p] = i; });
        const numColors = FBA_ROW_GROUP_COLORS.length;
        tbody.innerHTML = this.fbaTableRows.map(r => {
            const statusClass = r.statusKey === 'short' ? 'fba-status-short' : r.statusKey === 'ok' ? 'fba-status-ok' : 'fba-status-excess';
            const restockMonthsTip = r.restockMonths != null ? (Number(r.restockMonths) === Math.round(r.restockMonths * 10) / 10 ? r.restockMonths.toFixed(1) : r.restockMonths.toFixed(2)) : '−';
            const restockTooltipText = `仕入推奨（ヶ月分）: ${restockMonthsTip}`;
            const productNameTooltipText = (r.title || '').replace(/\r?\n/g, ' ');
            const groupIndex = prefixToIndex[getTitlePrefixForGroup(r.title)] ?? 0;
            const bgColor = FBA_ROW_GROUP_COLORS[groupIndex % numColors];
            return `<tr class="fba-row-group" style="--fba-row-bg:${escapeAttr(bgColor)}">
                <td>${escapeHtml(r.childAsin)}</td>
                <td class="fba-product-name" data-tooltip="${escapeAttr(productNameTooltipText)}"><div class="fba-product-name-inner">${escapeHtml(r.title)}</div></td>
                <td>${formatNum(r.periodSales)}</td>
                <td>${formatNum(r.avgMonthly)}</td>
                <td>${formatNum(r.currentStock)}</td>
                <td>${formatNum(r.minStock)}</td>
                <td>${formatNum(r.maxStock)}</td>
                <td class="fba-restock-cell" data-tooltip="${escapeAttr(restockTooltipText)}"><strong>${formatNum(r.restockQty)}</strong></td>
                <td><span class="fba-status-badge ${statusClass}">${escapeHtml(r.statusLabel)}</span></td>
            </tr>`;
        }).join('');
        this.updateFbaSortHeaders();
        this.bindFbaTooltipOnce();
    }

    bindFbaTooltipOnce() {
        if (this._fbaTooltipBound) return;
        this._fbaTooltipBound = true;
        let tipEl = document.getElementById('fbaTooltip');
        if (!tipEl) {
            tipEl = document.createElement('div');
            tipEl.id = 'fbaTooltip';
            tipEl.className = 'fba-custom-tooltip';
            tipEl.setAttribute('role', 'tooltip');
            tipEl.setAttribute('aria-hidden', 'true');
            document.body.appendChild(tipEl);
        }
        const table = document.getElementById('fbaForecastTable');
        if (!table) return;
        const positionTip = (x, y) => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const tw = tipEl.offsetWidth || 320;
            const th = tipEl.offsetHeight || 60;
            const left = (x + 14 + tw > vw) ? Math.max(0, x - tw - 4) : x + 14;
            const top  = (y + 14 + th > vh) ? Math.max(0, y - th - 4) : y + 14;
            tipEl.style.left = left + 'px';
            tipEl.style.top  = top  + 'px';
        };
        const show = (text, x, y) => {
            if (!text) return;
            tipEl.textContent = text;
            tipEl.style.display = 'block';
            positionTip(x, y);
            tipEl.setAttribute('aria-hidden', 'false');
        };
        const hide = () => {
            tipEl.style.display = 'none';
            tipEl.setAttribute('aria-hidden', 'true');
        };
        table.addEventListener('mouseover', (e) => {
            const td = e.target.closest('td[data-tooltip]');
            if (td) {
                show(td.getAttribute('data-tooltip'), e.clientX, e.clientY);
            } else {
                hide();
            }
        });
        table.addEventListener('mouseout', (e) => {
            const leaving = e.target.closest('td[data-tooltip]');
            const entering = e.relatedTarget ? e.relatedTarget.closest('td[data-tooltip]') : null;
            if (leaving && leaving !== entering) hide();
        });
        table.addEventListener('mousemove', (e) => {
            if (tipEl.style.display === 'block') positionTip(e.clientX, e.clientY);
        });
    }

    updateFbaSortHeaders() {
        const thead = document.querySelector('#fbaForecastTable thead');
        if (!thead) return;
        thead.querySelectorAll('th[data-sort]').forEach(th => {
            const key = th.dataset.sort;
            const active = key === this.fbaSortKey;
            th.classList.toggle('fba-sort-active', active);
            th.classList.toggle('fba-sort-asc', active && this.fbaSortDir === 'asc');
            th.classList.toggle('fba-sort-desc', active && this.fbaSortDir === 'desc');
            th.setAttribute('aria-sort', active ? (this.fbaSortDir === 'asc' ? 'ascending' : 'descending') : 'none');
        });
    }

    bindFbaTableSortOnce() {
        if (this._fbaSortBound) return;
        this._fbaSortBound = true;
        const table = document.getElementById('fbaForecastTable');
        if (!table) return;
        table.querySelectorAll('thead th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                if (key === this.fbaSortKey) this.fbaSortDir = this.fbaSortDir === 'asc' ? 'desc' : 'asc';
                else { this.fbaSortKey = key; this.fbaSortDir = 'asc'; }
                this.applyFbaSort();
                this.renderFbaTableBody();
            });
        });
    }

    /**
     * 現在の計算結果を行列として返す（CSVエクスポート用）。
     * @returns {Array<Object>}
     */
    getTableData() {
        const hasFba = Object.keys(this.fbaByAsin).length > 0;
        const hasMonths = this.selectedMonths.length >= 1 && this.selectedMonths.length <= 3;
        if (!hasFba || !hasMonths) return [];

        const orderedItemsKey = this.ORDERED_ITEMS_KEY;
        const data = this.childAsinManager.data;
        const rows = [];

        Object.keys(data).forEach(parentAsin => {
            Object.keys(data[parentAsin]).forEach(childAsin => {
                const node = data[parentAsin][childAsin];
                const months = node.months || {};
                let totalUnits = 0;
                this.selectedMonths.forEach(m => {
                    const val = months[m] && months[m][orderedItemsKey];
                    totalUnits += (typeof val === 'number' && !isNaN(val)) ? val : 0;
                });
                const avgMonthly = this.selectedMonths.length === 0 ? 0 : totalUnits / this.selectedMonths.length;
                const fba = this.fbaByAsin[childAsin];
                const currentStock = fba ? fba.availableQty : 0;
                const title = (node.title || '').toString().trim();

                let minStock, maxStock, monthsLabel;
                if (avgMonthly >= 10) {
                    minStock = Math.ceil(avgMonthly * 1.5);
                    maxStock = Math.ceil(avgMonthly * 2.0);
                    monthsLabel = '1.5〜2';
                } else {
                    minStock = Math.ceil(avgMonthly * 1.0);
                    maxStock = Math.max(minStock, Math.ceil(avgMonthly * 1.5));
                    monthsLabel = '1';
                }
                const restockQty = Math.max(0, minStock - currentStock);
                const restockMonths = avgMonthly > 0 ? restockQty / avgMonthly : null;
                let statusLabel;
                if (currentStock < minStock) statusLabel = '在庫不足';
                else if (currentStock <= maxStock) statusLabel = '適正';
                else statusLabel = '過剰在庫';

                rows.push({
                    childAsin,
                    title: title || (fba ? fba.name : ''),
                    periodSales: totalUnits,
                    avgMonthly,
                    currentStock,
                    minStock,
                    maxStock,
                    monthsLabel,
                    restockQty,
                    restockMonths,
                    statusLabel
                });
            });
        });

        rows.sort((a, b) => b.avgMonthly - a.avgMonthly);
        return rows;
    }

    getCurrentFbaFileName() {
        return this.fbaFileName;
    }

    /**
     * FBAレポートデータをクリア（ファイル削除時など）。
     */
    clearFbaData() {
        this.fbaByAsin = {};
        this.fbaFileName = null;
        this.selectedMonths = [];
        this.renderUI();
    }
}

function escapeHtml(str) {
    if (str == null) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** HTML属性値用（data-tooltip など） */
function escapeAttr(str) {
    if (str == null) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatNum(n) {
    if (typeof n !== 'number' || isNaN(n)) return '0';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** 商品名の先頭20文字程度で同一親ASIN推定用のグループキーを返す */
function getTitlePrefixForGroup(title) {
    if (title == null) return '';
    const s = String(title).trim().replace(/\s+/g, ' ');
    return s.slice(0, 20);
}

/** グループ別行背景用の薄い色（インデックスで参照） */
const FBA_ROW_GROUP_COLORS = [
    '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5',
    '#e0f2f1', '#fff8e1', '#efe0f5', '#e8eaf6', '#fbe9e7',
    '#e5e5e5', '#ffecb3'
];
