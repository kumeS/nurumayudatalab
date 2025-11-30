async function processData(fileName, rows, images = []) {
  if (rows.length < 5) return;
  const headerRowIdx = findHeaderRow(rows);
  const headers = rows[headerRowIdx] || [];
  const orderMeta = extractOrderInfo(rows);
  
  // Create image map by row number
  const imageMap = {};
  images.forEach(img => {
    if (!imageMap[img.row]) imageMap[img.row] = [];
    imageMap[img.row].push(img.url);
  });
  
  const colMap = {};
  headers.forEach((h, idx) => {
    const header = String(h || '').trim();
    const normalized = normalizeHeaderText(header);
    if (header.includes('サイトURL')) colMap.siteUrl = idx;
    if (header.includes('写真')) colMap.photo = idx;
    if (header.includes('サイズ') || header.includes('カラー')) colMap.variant = idx;
    if (normalized.includes('発注数量')) colMap.orderQty = idx;
    if (normalized.includes('入庫数量') || normalized.includes('入荷数量')) colMap.stockQty = idx;
    if (normalized.includes('出荷数量')) colMap.shipQty = idx;
    if (header.includes('単価') && header.includes('元')) colMap.unitPriceCny = idx;
    if (header === '日本円') colMap.unitPriceJpy = idx;
    if (header.includes('小計')) colMap.subtotal = idx;
    if (header.includes('中国内送料')) colMap.domesticShip = idx;
    if (header === '状態') colMap.status = idx;
    if (header === '状況') colMap.situation = idx;
    if (header.includes('ショップ発注')) colMap.shopOrder = idx;
    if (header.includes('到着予定日')) colMap.arrivalDate = idx;
    if (header.includes('検品ﾌﾟﾗﾝ') || header.includes('検品プラン')) colMap.inspectionPlan = idx;
  });
  
  console.log('Column mapping:', colMap);
  console.log('Header row index:', headerRowIdx);
  console.log('Total rows:', rows.length);
  
  const items = [];
  const exchangeRateSamples = []; // For calculating average exchange rate
  
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const hasUrl = row[colMap.siteUrl] && String(row[colMap.siteUrl]).includes('http');
    const variantText = String(row[colMap.variant] || '').trim();
    const variantNormalized = variantText.replace(/\s+/g, '');
    const siteText = String(row[colMap.siteUrl] || '').trim();
    const orderQtyValue = parseNumeric(row[colMap.orderQty]);
    const shipQtyValue = parseNumeric(row[colMap.shipQty]);
    const hasOrderQty = !isNaN(orderQtyValue) && orderQtyValue > 0;
    const hasShipQty = !isNaN(shipQtyValue) && shipQtyValue > 0;
    const hasMeaningfulQty = hasOrderQty || hasShipQty;
    const isSummaryRow = SUMMARY_ROW_KEYWORDS.some(keyword => siteText.includes(keyword) || variantText.includes(keyword));
    const hasVariantInfo = variantNormalized.length > 0;
    const isDetailMissingRow = !hasVariantInfo || variantNormalized === '詳細なし';
    const shouldSkip = isDetailMissingRow || (!hasUrl && !hasMeaningfulQty) || (!hasUrl && isSummaryRow);

    console.log(`Row ${i}: hasUrl=${hasUrl}, hasQty=${hasOrderQty}, orderQty=${row[colMap.orderQty]}, shipQty=${row[colMap.shipQty]}, isSummary=${isSummaryRow}`);

    if (shouldSkip) continue;
    
    // Get embedded image for this row
    const embeddedImage = imageMap[i] ? imageMap[i][0] : null;
    
    // Calculate exchange rate from this row
    const cnyPrice = parseFloat(String(row[colMap.unitPriceCny] || '').replace(/[^\d.]/g, ''));
    const jpyPrice = parseFloat(String(row[colMap.unitPriceJpy] || '').replace(/[^\d.]/g, ''));
    if (!isNaN(cnyPrice) && !isNaN(jpyPrice) && cnyPrice > 0) {
      exchangeRateSamples.push(jpyPrice / cnyPrice);
    }
    
    items.push({
      no: row[0] || '', siteUrl: row[colMap.siteUrl] || '', photo: row[colMap.photo] || '',
      variant: row[colMap.variant] || '', orderQty: row[colMap.orderQty] || '',
      stockQty: row[colMap.stockQty] || '', shipQty: row[colMap.shipQty] || '',
      unitPriceCny: row[colMap.unitPriceCny] || '', unitPriceJpy: row[colMap.unitPriceJpy] || '',
      subtotal: row[colMap.subtotal] || '', domesticShip: row[colMap.domesticShip] || '',
      status: row[colMap.status] || '', situation: row[colMap.situation] || '',
      shopOrder: row[colMap.shopOrder] || '', arrivalDate: row[colMap.arrivalDate] || '',
      inspectionPlan: row[colMap.inspectionPlan] || '',
      _fileName: fileName, _orderMeta: orderMeta,
      _embeddedImage: embeddedImage
    });
  }
  
  // Calculate average exchange rate for this file
  let calculatedExchangeRate = null;
  if (exchangeRateSamples.length > 0) {
    const sum = exchangeRateSamples.reduce((acc, rate) => acc + rate, 0);
    calculatedExchangeRate = sum / exchangeRateSamples.length;
    console.log(`${fileName}: 計算された為替レート = ${calculatedExchangeRate.toFixed(2)} JPY/CNY (${exchangeRateSamples.length}件のサンプル)`);
  }
  
  allData[fileName] = { items, orderMeta, exchangeRate: calculatedExchangeRate };
  if (!fileOrder.includes(fileName)) {
    fileOrder.push(fileName);
  }
  
  console.log(`Processed ${items.length} items from ${fileName}`);
  console.log('Sample item:', items[0]);
  
  // Save to IndexedDB
  await saveDataToDB(fileName, { items, orderMeta, exchangeRate: calculatedExchangeRate });
  
  renderTabs();
  renderContent();
  persistLocalCache();
}

async function handleActionClick(event) {
  // Priority 1: Check if delete button was clicked (highest priority)
  if (event.target.closest('.tab-close')) {
    event.preventDefault();
    event.stopPropagation();
    const deleteBtn = event.target.closest('.tab-close');
    const fileName = decodeTabValue(deleteBtn.dataset.file);
    if (fileName) {
      await removeFile(fileName);
    }
    return;
  }

  // Priority 2: Status popup
  const statusTrigger = event.target.closest('[data-status-key]');
  if (statusTrigger) {
    event.preventDefault();
    const key = statusTrigger.dataset.statusKey;
    showStatusPopup(statusTrigger, key);
    return;
  } else {
    hideStatusPopup();
  }

  // Priority 3: Tab switching
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'switch-tab') {
    const tabValue = decodeTabValue(target.dataset.tab);
    if (tabValue && tabValue !== currentTab) {
      switchTab(tabValue);
    }
  }
}

function handleTabDragStart(event) {
  // Prevent drag when clicking on close button or summary tab
  if (event.target.closest('.tab-close')) {
    event.preventDefault();
    return;
  }
  const tab = event.target.closest('[data-action="switch-tab"][data-tab]');
  if (!tab) return;
  const tabValue = decodeTabValue(tab.dataset.tab);
  if (!tabValue || tabValue === 'all' || tabValue === 'summary') {
    event.preventDefault();
    return;
  }
  draggingFile = tabValue;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tabValue);
  }
}

function handleTabDragOver(event) {
  if (!draggingFile) return;
  const target = event.target.closest('[data-action="switch-tab"][data-tab]');
  if (!target) return;
  const targetValue = decodeTabValue(target.dataset.tab);
  if (!targetValue || targetValue === 'all' || targetValue === draggingFile) return;
  event.preventDefault();
  const targetRect = target.getBoundingClientRect();
  const midpoint = targetRect.left + targetRect.width / 2;
  const insertBefore = event.clientX < midpoint;
  document.querySelectorAll('.tab.drop-before, .tab.drop-after').forEach(tab => {
    tab.classList.remove('drop-before', 'drop-after');
  });
  target.classList.add(insertBefore ? 'drop-before' : 'drop-after');
}

function handleTabDrop(event) {
  if (!draggingFile) return;
  const target = event.target.closest('[data-action="switch-tab"][data-tab]');
  if (!target) return;
  const targetValue = decodeTabValue(target.dataset.tab);
  if (!targetValue || targetValue === 'all' || targetValue === draggingFile) return;
  event.preventDefault();
  const targetRect = target.getBoundingClientRect();
  const insertBefore = event.clientX < targetRect.left + targetRect.width / 2;
  reorderFileOrder(draggingFile, targetValue, insertBefore);
  draggingFile = null;
  document.querySelectorAll('.tab.drop-before, .tab.drop-after').forEach(tab => {
    tab.classList.remove('drop-before', 'drop-after');
  });
}

function handleTabDragEnd() {
  draggingFile = null;
  document.querySelectorAll('.tab.drop-before, .tab.drop-after').forEach(tab => {
    tab.classList.remove('drop-before', 'drop-after');
  });
}

function decodeTabValue(value) {
  if (!value) return null;
  if (value === 'all') return 'all';
  try {
    return decodeURIComponent(value);
  } catch (err) {
    console.warn('Failed to decode tab value', value, err);
    return null;
  }
}

function renderTabs() {
  syncFileOrder(); // Consolidate file ordering logic
  const orderedNames = fileOrder.filter(name => allData[name]);
  if (orderedNames.length === 0) { tabs.innerHTML = ''; return; }

  // Add fixed tabs (全体まとめ and 全体集計)
  let html = `<div class="tab ${currentTab === 'all' ? 'active' : ''}" data-action="switch-tab" data-tab="all">全体まとめ</div>`;
  html += `<div class="tab ${currentTab === 'summary' ? 'active' : ''}" data-action="switch-tab" data-tab="summary">全体集計</div>`;

  // Add file tabs
  orderedNames.forEach(name => {
    const shortName = name.replace('.xlsx', '').substring(0, 20);
    const encodedName = encodeURIComponent(name);
    html += `<div class="tab ${currentTab === name ? 'active' : ''}" data-action="switch-tab" data-tab="${encodedName}" draggable="true">
      ${escapeHtml(shortName)}
      <button type="button" class="tab-close" data-file="${encodedName}" title="削除" aria-label="削除">✕</button>
    </div>`;
  });
  tabs.innerHTML = html;
}

async function removeFile(fileName) {
  if (confirm(`${fileName} を削除しますか？`)) {
    delete allData[fileName];
    try {
      await deleteDataFromDB(fileName);
    } catch (e) {
      console.warn('Failed to delete from DB:', e);
    }
    fileOrder = fileOrder.filter(name => name !== fileName);
    if (currentTab === fileName) {
      currentTab = 'all';
    }
    renderTabs();
    renderContent();
    persistLocalCache();
  }
}

async function confirmClearAll() {
  if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
    await clearAllData();
  }
}

function switchTab(tab) {
  currentTab = tab;
  renderTabs();
  renderContent();
  persistLocalCache();
}

// Attach click event listener for action handling
// This must be after handleActionClick is defined
document.addEventListener('click', handleActionClick);

// Attach tab drag&drop event listeners
if (tabs) {
  tabs.addEventListener('dragstart', handleTabDragStart);
  tabs.addEventListener('dragover', handleTabDragOver);
  tabs.addEventListener('drop', handleTabDrop);
  tabs.addEventListener('dragend', handleTabDragEnd);
}

// Attach merge duplicates checkbox change listener
document.addEventListener('change', (event) => {
  if (event.target.id === 'mergeDuplicatesCheckbox') {
    mergeAllDuplicates = event.target.checked;
    localStorage.setItem('CiLELViewerMergeAllDuplicates', mergeAllDuplicates.toString());
    renderContent();
  }
});
