// admin-v2.js - WatchMate v2.0 管理画面

// ========== グローバル状態 ==========
let _dataCache = [];        // loadData() で取得した全データ
let _searchCache = null;    // manualSearch() の結果
let _keywordsCache = [];    // キーワード一覧キャッシュ

const SITE_NAMES = {
    '7net': 'セブンネット',
    'hmv': 'HMV',
    'animate': 'アニメイト',
    'rakuten': '楽天ブックス'
};

// ========== タブ切り替え ==========
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'keywords') loadKeywords();
    else if (tabName === 'data') loadData();
}

// ========== Worker URL (localStorage 永続化) ==========
function getWorkerUrl() {
    const url = document.getElementById('workerUrl').value.trim();
    if (!url || url.includes('YOUR_SUBDOMAIN')) {
        alert('Worker URLを正しく設定してください');
        throw new Error('Invalid worker URL');
    }
    localStorage.setItem('watchmate_worker_url', url);
    return url;
}

function restoreWorkerUrl() {
    const saved = localStorage.getItem('watchmate_worker_url');
    if (saved) {
        document.getElementById('workerUrl').value = saved;
    }
}

// ========== キーワード一覧 ==========
async function loadKeywords() {
    const loading = document.getElementById('keywordsLoading');
    const table = document.getElementById('keywordsTable');
    const tbody = document.getElementById('keywordsTableBody');
    loading.style.display = 'block';
    table.style.display = 'none';

    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/keywords`);
        if (!res.ok) throw new Error('キーワードの取得に失敗しました');
        const data = await res.json();
        const keywords = data.keywords || [];
        _keywordsCache = keywords;
        tbody.innerHTML = '';

        if (keywords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">登録されているキーワードがありません</td></tr>';
        } else {
            keywords.forEach(kw => {
                const row = createKeywordRow(kw);
                tbody.appendChild(row);
            });
        }
        loading.style.display = 'none';
        table.style.display = 'table';
    } catch (err) {
        console.error('Error loading keywords:', err);
        loading.innerHTML = `<div class="error">エラー: ${err.message}</div>`;
    }
}

function createKeywordRow(kw) {
    const row = document.createElement('tr');
    const statusClass = kw.enabled ? 'status-active' : 'status-inactive';
    const statusText = kw.enabled ? '有効' : '無効';
    const icons = { '7net': '📘', 'hmv': '🎵', 'animate': '⭐', 'rakuten': '📕' };
    const sitesDisplay = kw.sites.map(s => `${icons[s] || ''}${SITE_NAMES[s] || s}`).join(', ');
    const emailBadge = kw.emailNotification
        ? `<span class="email-badge">📧 ${kw.notifyEmail}</span>`
        : '<span style="color:#999;">なし</span>';
    const lastScraped = kw.lastScraped ? new Date(kw.lastScraped).toLocaleString('ja-JP') : '未実行';
    const maxR = kw.maxResults || 20;

    row.innerHTML = `
        <td>${escapeHtml(kw.keyword)}</td>
        <td>${sitesDisplay}</td>
        <td>${maxR}件</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${emailBadge}</td>
        <td>${lastScraped}</td>
        <td>
            <button class="btn btn-small btn-info" onclick="openEditModal('${kw.id}')">編集</button>
            <button class="btn btn-small btn-${kw.enabled ? 'danger' : 'success'}"
                    onclick="toggleKeyword('${kw.id}', ${!kw.enabled})">
                ${kw.enabled ? '無効化' : '有効化'}
            </button>
            <button class="btn btn-small btn-danger" onclick="deleteKeyword('${kw.id}')">削除</button>
        </td>
    `;
    return row;
}

// ========== キーワード追加 ==========
async function addKeyword() {
    const keyword = document.getElementById('newKeyword').value.trim();
    if (!keyword) { alert('キーワードを入力してください'); return; }

    const sites = [];
    if (document.getElementById('site7net').checked) sites.push('7net');
    if (document.getElementById('siteHmv').checked) sites.push('hmv');
    if (document.getElementById('siteAnimate').checked) sites.push('animate');
    if (document.getElementById('siteRakuten').checked) sites.push('rakuten');
    if (sites.length === 0) { alert('少なくとも1つのサイトを選択してください'); return; }

    const emailNotification = document.getElementById('emailNotification').checked;
    const notifyEmail = document.getElementById('notifyEmail').value.trim();
    if (emailNotification && !notifyEmail) { alert('通知先メールアドレスを入力してください'); return; }

    const maxResults = parseInt(document.getElementById('maxResults').value) || 20;

    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/keywords/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, sites, enabled: true, emailNotification, notifyEmail, maxResults })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'キーワードの追加に失敗しました');
        }
        document.getElementById('newKeyword').value = '';
        document.getElementById('emailNotification').checked = false;
        document.getElementById('notifyEmail').value = '';
        document.getElementById('emailGroup').style.display = 'none';
        document.getElementById('maxResults').value = '20';
        loadKeywords();
        showMessage('キーワードを追加しました', 'success');
    } catch (err) {
        console.error('Error adding keyword:', err);
        showMessage(`エラー: ${err.message}`, 'error');
    }
}

// ========== キーワード有効/無効切替 ==========
async function toggleKeyword(id, enabled) {
    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/keywords/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, enabled })
        });
        if (!res.ok) throw new Error('キーワードの更新に失敗しました');
        loadKeywords();
        showMessage('キーワードを更新しました', 'success');
    } catch (err) {
        console.error('Error toggling keyword:', err);
        showMessage(`エラー: ${err.message}`, 'error');
    }
}

// ========== キーワード削除 ==========
async function deleteKeyword(id) {
    if (!confirm('このキーワードを削除しますか？')) return;
    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/keywords/delete?id=${id}`, { method: 'POST' });
        if (!res.ok) throw new Error('キーワードの削除に失敗しました');
        loadKeywords();
        showMessage('キーワードを削除しました', 'success');
    } catch (err) {
        console.error('Error deleting keyword:', err);
        showMessage(`エラー: ${err.message}`, 'error');
    }
}

// ========== キーワード編集モーダル ==========
function openEditModal(id) {
    const kw = _keywordsCache.find(k => k.id === id);
    if (!kw) return;
    document.getElementById('editId').value = id;
    document.getElementById('editKeyword').value = kw.keyword;
    document.getElementById('editSite7net').checked = kw.sites.includes('7net');
    document.getElementById('editSiteHmv').checked = kw.sites.includes('hmv');
    document.getElementById('editSiteAnimate').checked = kw.sites.includes('animate');
    document.getElementById('editSiteRakuten').checked = kw.sites.includes('rakuten');
    document.getElementById('editMaxResults').value = kw.maxResults || 20;
    document.getElementById('editEmailNotification').checked = kw.emailNotification || false;
    document.getElementById('editNotifyEmail').value = kw.notifyEmail || '';
    document.getElementById('editEmailGroup').style.display = kw.emailNotification ? 'block' : 'none';
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

async function saveEditKeyword() {
    const id = document.getElementById('editId').value;
    const keyword = document.getElementById('editKeyword').value.trim();
    if (!keyword) { alert('キーワードを入力してください'); return; }

    const sites = [];
    if (document.getElementById('editSite7net').checked) sites.push('7net');
    if (document.getElementById('editSiteHmv').checked) sites.push('hmv');
    if (document.getElementById('editSiteAnimate').checked) sites.push('animate');
    if (document.getElementById('editSiteRakuten').checked) sites.push('rakuten');
    if (sites.length === 0) { alert('少なくとも1つのサイトを選択してください'); return; }

    const emailNotification = document.getElementById('editEmailNotification').checked;
    const notifyEmail = document.getElementById('editNotifyEmail').value.trim();
    const maxResults = parseInt(document.getElementById('editMaxResults').value) || 20;

    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/keywords/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, keyword, sites, emailNotification, notifyEmail, maxResults })
        });
        if (!res.ok) throw new Error('キーワードの更新に失敗しました');
        closeEditModal();
        loadKeywords();
        showMessage('キーワードを更新しました', 'success');
    } catch (err) {
        console.error('Error updating keyword:', err);
        showMessage(`エラー: ${err.message}`, 'error');
    }
}

// ========== データ可視化 ==========
async function loadData() {
    const loading = document.getElementById('dataLoading');
    const container = document.getElementById('dataProductsContainer');
    const filterBar = document.getElementById('dataFilterBar');
    const summary = document.getElementById('dataResultSummary');
    const stats = document.getElementById('dataSiteStats');

    loading.style.display = 'block';
    container.innerHTML = '';
    summary.style.display = 'none';
    stats.innerHTML = '';
    filterBar.style.display = 'none';

    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/data`);
        if (!res.ok) throw new Error('データの取得に失敗しました');
        const result = await res.json();
        _dataCache = result.data || [];
        loading.style.display = 'none';

        if (_dataCache.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">データがありません。キーワードを登録してCron実行を待つか、手動検索をお試しください。</p>';
            return;
        }

        // キーワードドロップダウンを構築
        const select = document.getElementById('dataKeywordSelect');
        select.innerHTML = '<option value="__all__">すべてのキーワード</option>';
        _dataCache.forEach((item, idx) => {
            const opt = document.createElement('option');
            opt.value = idx.toString();
            opt.textContent = item.keyword;
            select.appendChild(opt);
        });

        filterBar.style.display = 'block';
        renderDataView();
    } catch (err) {
        console.error('Error loading data:', err);
        loading.style.display = 'none';
        container.innerHTML = `<div class="error">エラー: ${err.message}</div>`;
    }
}

function renderDataView() {
    const filterText = (document.getElementById('dataProductFilter').value || '').toLowerCase();
    const selectedKeyword = document.getElementById('dataKeywordSelect').value;
    const enabledSites = Array.from(document.querySelectorAll('.dataFilterSite:checked')).map(c => c.value);

    // 対象データを選択
    let items = _dataCache;
    if (selectedKeyword !== '__all__') {
        const idx = parseInt(selectedKeyword);
        items = [_dataCache[idx]];
    }

    // 全商品をフラットに展開
    const allProducts = [];
    items.forEach(item => {
        for (const [site, products] of Object.entries(item.data || {})) {
            if (!enabledSites.includes(site)) continue;
            (products || []).forEach(p => {
                allProducts.push({ ...p, keyword: item.keyword, site: p.site || site });
            });
        }
    });

    // テキストフィルタ
    const filtered = filterText
        ? allProducts.filter(p => p.title && p.title.toLowerCase().includes(filterText))
        : allProducts;

    // サイト統計
    renderSiteStats('dataSiteStats', allProducts, filtered, filterText);

    // サマリー
    const summaryEl = document.getElementById('dataResultSummary');
    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = `
        <span class="result-count">全 ${allProducts.length} 件中 ${filtered.length} 件表示</span>
        <span style="color:var(--text-secondary);font-size:13px;">最終更新: ${items[0]?.timestamp ? new Date(items[0].timestamp).toLocaleString('ja-JP') : '-'}</span>
    `;

    // 商品テーブル
    renderProductTable('dataProductsContainer', filtered);
}

// ========== 手動検索 ==========
async function manualSearch() {
    const keyword = document.getElementById('manualKeyword').value.trim();
    if (!keyword) { alert('検索キーワードを入力してください'); return; }

    const sites = Array.from(document.querySelectorAll('.manualSite:checked')).map(c => c.value);
    if (sites.length === 0) { alert('少なくとも1つのサイトを選択してください'); return; }

    const maxResults = parseInt(document.getElementById('manualMaxResults').value) || 20;
    const btn = document.getElementById('manualSearchBtn');
    btn.disabled = true;
    btn.textContent = '検索中...';

    const container = document.getElementById('searchProductsContainer');
    const filterBar = document.getElementById('searchFilterBar');
    const summary = document.getElementById('searchResultSummary');
    const stats = document.getElementById('searchSiteStats');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>検索中... サイトからデータを取得しています</p></div>';
    filterBar.style.display = 'none';
    summary.style.display = 'none';
    stats.innerHTML = '';

    try {
        const workerUrl = getWorkerUrl();
        const params = new URLSearchParams({ keyword, sites: sites.join(','), maxResults: maxResults.toString() });
        const res = await fetch(`${workerUrl}/api/search/manual?${params}`);
        if (!res.ok) throw new Error('検索に失敗しました');
        _searchCache = await res.json();
        filterBar.style.display = 'block';
        renderSearchView();
    } catch (err) {
        console.error('Manual search error:', err);
        container.innerHTML = `<div class="error">エラー: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = '検索実行';
    }
}

function renderSearchView() {
    if (!_searchCache) return;
    const filterText = (document.getElementById('searchProductFilter').value || '').toLowerCase();
    const enabledSites = Array.from(document.querySelectorAll('.searchFilterSite:checked')).map(c => c.value);

    const allProducts = [];
    for (const [site, products] of Object.entries(_searchCache.data || {})) {
        if (!enabledSites.includes(site)) continue;
        (products || []).forEach(p => {
            allProducts.push({ ...p, keyword: _searchCache.keyword, site: p.site || site });
        });
    }

    const filtered = filterText
        ? allProducts.filter(p => p.title && p.title.toLowerCase().includes(filterText))
        : allProducts;

    renderSiteStats('searchSiteStats', allProducts, filtered, filterText);

    const summaryEl = document.getElementById('searchResultSummary');
    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = `
        <span class="result-count">全 ${allProducts.length} 件中 ${filtered.length} 件表示</span>
        <span style="color:var(--text-secondary);font-size:13px;">キーワード: "${escapeHtml(_searchCache.keyword)}" / ${new Date(_searchCache.timestamp).toLocaleString('ja-JP')}</span>
    `;

    renderProductTable('searchProductsContainer', filtered);
}

// ========== 共通: サイト統計レンダリング ==========
function renderSiteStats(containerId, allProducts, filtered, filterText) {
    const container = document.getElementById(containerId);
    const siteCounts = {};
    allProducts.forEach(p => { siteCounts[p.site] = (siteCounts[p.site] || 0) + 1; });

    let html = '<div class="site-stats-grid">';
    for (const [site, count] of Object.entries(siteCounts)) {
        const filteredCount = filtered.filter(p => p.site === site).length;
        const label = filterText ? `${filteredCount}/${count}` : `${count}`;
        html += `<div class="site-stat-card">
            <div class="count">${label}</div>
            <div class="label">${SITE_NAMES[site] || site}</div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ========== 共通: 商品テーブルレンダリング ==========
function renderProductTable(containerId, products) {
    const container = document.getElementById(containerId);
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:30px;color:#999;">該当する商品がありません</p>';
        return;
    }

    let html = '<div class="products-table-wrapper"><table class="products-table"><thead><tr>';
    html += '<th style="width:50px;">#</th>';
    html += '<th>商品名</th>';
    html += '<th style="width:130px;">価格</th>';
    html += '<th style="width:100px;">サイト</th>';
    html += '</tr></thead><tbody>';

    products.forEach((p, i) => {
        const siteClass = `site-${p.site}`;
        const siteName = SITE_NAMES[p.site] || p.site;
        const titleHtml = p.url
            ? `<a href="${escapeHtml(p.url)}" target="_blank" class="product-title-link">${escapeHtml(p.title)}</a>`
            : escapeHtml(p.title);
        html += `<tr>
            <td>${i + 1}</td>
            <td>${titleHtml}</td>
            <td><strong style="color:#e91e63;">${escapeHtml(p.price || '価格を確認')}</strong></td>
            <td><span class="site-badge ${siteClass}">${siteName}</span></td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ========== テストメール送信 ==========
async function sendTestEmail() {
    const email = document.getElementById('testEmail').value.trim();
    if (!email) { alert('メールアドレスを入力してください'); return; }
    if (!confirm(`${email} にテストメールを送信しますか？`)) return;
    try {
        const workerUrl = getWorkerUrl();
        const res = await fetch(`${workerUrl}/api/email/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'テストメール送信に失敗しました');
        }
        showMessage('テストメールを送信しました。受信トレイを確認してください。', 'success');
    } catch (err) {
        console.error('Error sending test email:', err);
        showMessage(`エラー: ${err.message}`, 'error');
    }
}

// ========== ユーティリティ ==========
function showMessage(message, type) {
    const container = document.querySelector('.tab-content.active');
    const div = document.createElement('div');
    div.className = type;
    div.textContent = message;
    container.insertBefore(div, container.firstChild);
    setTimeout(() => div.remove(), 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function refreshData() { loadData(); }

// ========== イベントリスナー ==========
document.addEventListener('DOMContentLoaded', () => {
    restoreWorkerUrl();

    // Worker URL変更時にlocalStorageへ自動保存
    document.getElementById('workerUrl').addEventListener('change', () => {
        const url = document.getElementById('workerUrl').value.trim();
        if (url && !url.includes('YOUR_SUBDOMAIN')) {
            localStorage.setItem('watchmate_worker_url', url);
        }
    });

    // データ可視化フィルター
    document.getElementById('dataProductFilter').addEventListener('input', renderDataView);
    document.getElementById('dataKeywordSelect').addEventListener('change', renderDataView);
    document.querySelectorAll('.dataFilterSite').forEach(cb => cb.addEventListener('change', renderDataView));

    // 手動検索フィルター
    document.getElementById('searchProductFilter').addEventListener('input', renderSearchView);
    document.querySelectorAll('.searchFilterSite').forEach(cb => cb.addEventListener('change', renderSearchView));

    // 手動検索: Enterキー
    document.getElementById('manualKeyword').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') manualSearch();
    });

    // 初回読み込み
    loadKeywords();
});
