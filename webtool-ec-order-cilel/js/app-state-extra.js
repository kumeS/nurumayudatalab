async function processData(fileName, rows, images = []) {
  if (rows.length < 5) return;
  
  // Detect WJFT file format
  if (isWjftFile(fileName, rows)) {
    await processWjftData(fileName, rows, images);
    return;
  }
  
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
    const isWjft = allData[name]?.fileType === 'wjft';
    const tabClass = `tab ${currentTab === name ? 'active' : ''} ${isWjft ? 'wjft-tab' : ''}`;
    const prefix = isWjft ? '🔧 ' : '';
    html += `<div class="${tabClass}" data-action="switch-tab" data-tab="${encodedName}" draggable="true">
      ${prefix}${escapeHtml(shortName)}
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

// ============================================================
// WJFT (作業明細) ファイル処理
// ============================================================

/**
 * WJFTファイルかどうかを判定する
 * ファイル名が WJFT で始まるか、ヘッダー行に「作業内容」が含まれているかで判定
 */
function isWjftFile(fileName, rows) {
  // Check filename pattern
  if (/^WJFT/i.test(fileName)) return true;
  
  // Check for WJFT-specific header keywords in first 20 rows
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c || '')).join(' ');
    if (rowStr.includes('作業内容') && rowStr.includes('番号') && rowStr.includes('URL')) return true;
    if (rowStr.includes('検品作業明細書')) return true;
  }
  return false;
}

/**
 * WJFTファイル名から対応するFT番号を抽出する
 * WJFT6705-00017.xlsx → FT6705-00017
 */
function extractFtNumberFromWjft(fileName) {
  const match = fileName.match(/^WJFT(.+)\.xlsx?$/i);
  if (match) return 'FT' + match[1];
  return null;
}

/**
 * WJFTファイルのメタ情報を抽出する
 */
function extractWjftMeta(rows) {
  const meta = {};
  
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Row 1: 注文日, 作業日
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').trim();
      if (cell === '注文日' && row[j + 1] !== undefined) {
        // Value is in the next row, same column area
      }
      if (cell === '作業日' && row[j + 1] !== undefined) {
        // Value is in the next row, same column area
      }
    }
  }
  
  // Row 1-2: 注文日, 作業日
  if (rows[0]) {
    for (let j = 0; j < (rows[0] || []).length; j++) {
      const label = String(rows[0][j] || '').trim();
      if (label === '注文日' && rows[1]) {
        meta.orderDate = String(rows[1][j] || '').trim();
      }
      if (label === '作業日' && rows[1]) {
        meta.workDate = String(rows[1][j] || '').trim();
      }
    }
    // Extract comment from K column area
    const commentCell = rows[0];
    for (let j = 0; j < commentCell.length; j++) {
      if (String(commentCell[j] || '').includes('会員→FT')) {
        if (rows[1] && rows[1][j]) {
          meta.comment = String(rows[1][j] || '').trim();
        }
      }
    }
  }
  
  // Row 3: FT番号 + 顧客名
  if (rows[2]) {
    for (let j = 0; j < (rows[2] || []).length; j++) {
      const cell = String(rows[2][j] || '').trim();
      const ftMatch = cell.match(/(FT[\d\-]+)/);
      if (ftMatch) {
        meta.ftNumber = ftMatch[1];
        const nameMatch = cell.match(/\s+(.+?)\s*様/);
        if (nameMatch) meta.customerName = nameMatch[1].trim() + ' 様';
      }
    }
  }
  
  // Rows 5-8: 検品情報
  if (rows[4]) {
    for (let j = 0; j < (rows[4] || []).length; j++) {
      const cell = String(rows[4][j] || '').trim();
      if (cell === '検品数量' && rows[5]) {
        meta.inspectionQty = parseNumeric(rows[5][j]);
      }
      if (cell === '検品単価' && rows[5]) {
        meta.inspectionUnitPrice = parseNumeric(rows[5][j]);
      }
    }
  }
  
  // 検品作業費, 物流加工費
  if (rows[6]) {
    for (let j = 0; j < (rows[6] || []).length; j++) {
      const cell = String(rows[6][j] || '').trim();
      if (cell === '検品作業費' && rows[7]) {
        meta.inspectionFee = parseNumeric(rows[7][j]);
      }
      if (cell === '物流加工費' && rows[7]) {
        meta.logisticsFee = parseNumeric(rows[7][j]);
      }
    }
  }
  
  return meta;
}

/**
 * WJFTファイルのヘッダー行を検出する
 * 「作業内容」「番号」を含む行を探す
 */
function findWjftHeaderRow(rows) {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const hasWorkContent = row.some(cell => String(cell || '').includes('作業内容'));
    const hasNumber = row.some(cell => String(cell || '').trim() === '番号');
    if (hasWorkContent && hasNumber) return i;
  }
  return 12; // default fallback (row 13, 0-indexed = 12)
}

/**
 * WJFTファイルのサブヘッダー行（作業名, セット数, 個数, 単価, 金額）を検出する
 */
function findWjftSubHeaderRow(rows, headerRowIdx) {
  // Usually the row right after the main header
  const nextRow = rows[headerRowIdx + 1];
  if (nextRow) {
    const hasWorkName = nextRow.some(cell => String(cell || '').includes('作業名'));
    if (hasWorkName) return headerRowIdx + 1;
  }
  return headerRowIdx + 1;
}

/**
 * WJFTファイルのデータをパースして保存する
 */
async function processWjftData(fileName, rows, images = []) {
  const workMeta = extractWjftMeta(rows);
  const headerRowIdx = findWjftHeaderRow(rows);
  const subHeaderRowIdx = findWjftSubHeaderRow(rows, headerRowIdx);
  const headers = rows[headerRowIdx] || [];
  
  // Create image map by row number
  const imageMap = {};
  images.forEach(img => {
    if (!imageMap[img.row]) imageMap[img.row] = [];
    imageMap[img.row].push(img.url);
  });
  
  // Map main header columns
  const colMap = {};
  headers.forEach((h, idx) => {
    const header = String(h || '').trim();
    const normalized = normalizeHeaderText(header);
    if (header === '番号') colMap.no = idx;
    if (header.includes('URL')) colMap.url = idx;
    if (header.includes('写真')) colMap.photo = idx;
    if (header.includes('サイズ') || header.includes('カラー') || header.includes('各個数')) colMap.variant = idx;
    if (normalized.includes('発注数量')) colMap.orderQty = idx;
    if (normalized.includes('入荷数量') || normalized.includes('入庫数量')) colMap.stockQty = idx;
    if (normalized.includes('出荷数量')) colMap.shipQty = idx;
    if (header.includes('検品') && (header.includes('ﾌﾟﾗﾝ') || header.includes('プラン'))) colMap.inspectionPlan = idx;
    if (header.includes('作業内容')) colMap.workContent = idx;
    if (header.includes('発送先住所')) colMap.deliveryAddress = idx;
    if (header.includes('納品指示')) colMap.deliveryInstructions = idx;
  });
  
  // Map sub-header columns (作業名, セット数, 個数, 単価, 金額)
  const subHeaders = rows[subHeaderRowIdx] || [];
  const workColMap = {};
  subHeaders.forEach((h, idx) => {
    const header = String(h || '').trim();
    if (header === '作業名') workColMap.workName = idx;
    if (header === 'セット数') workColMap.sets = idx;
    if (header === '個数') workColMap.qty = idx;
    if (header === '単価') workColMap.unitPrice = idx;
    if (header === '金額') workColMap.amount = idx;
  });
  
  // If sub-header mapping failed, try to detect from position relative to workContent
  if (workColMap.workName === undefined && colMap.workContent !== undefined) {
    workColMap.workName = colMap.workContent;
    workColMap.sets = colMap.workContent + 2;
    workColMap.qty = colMap.workContent + 3;
    workColMap.unitPrice = colMap.workContent + 4;
    workColMap.amount = colMap.workContent + 5;
  }
  
  console.log('WJFT Column mapping:', colMap);
  console.log('WJFT Work column mapping:', workColMap);
  console.log('WJFT Header row index:', headerRowIdx);
  console.log('WJFT Sub-header row index:', subHeaderRowIdx);
  
  // Parse products (multi-row per product)
  const items = [];
  let currentItem = null;
  
  for (let i = subHeaderRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => cell === '' || cell === undefined || cell === null)) continue;
    
    const noValue = row[colMap.no];
    const hasNo = noValue !== undefined && noValue !== null && noValue !== '' && !isNaN(parseFloat(noValue));
    
    // Check if this is a summary/total row
    const rowStr = row.map(c => String(c || '')).join(' ');
    if (rowStr.includes('合計') || rowStr.includes('日本円')) continue;
    
    // Check if this is the last row with totals (only qty columns have values, no 番号)
    const isFooterRow = !hasNo && (row[colMap.orderQty] || row[colMap.stockQty] || row[colMap.shipQty]) && !row[colMap.url];
    if (isFooterRow && i > rows.length - 5) continue; // Skip the total row near the end
    
    if (hasNo) {
      // New product row
      if (currentItem) {
        items.push(currentItem);
      }
      
      // Find embedded image for this row
      const embeddedImage = imageMap[i] ? imageMap[i][0] : null;
      
      // Extract work item from this row
      const workItems = [];
      const workName = String(row[workColMap.workName] || '').trim();
      if (workName) {
        workItems.push({
          name: workName,
          sets: parseNumeric(row[workColMap.sets]) || 0,
          qty: parseNumeric(row[workColMap.qty]) || 0,
          unitPrice: parseNumeric(row[workColMap.unitPrice]) || 0,
          amount: parseNumeric(row[workColMap.amount]) || 0
        });
      }
      
      currentItem = {
        no: noValue,
        siteUrl: String(row[colMap.url] || '').trim(),
        photo: String(row[colMap.photo] || '').trim(),
        variant: String(row[colMap.variant] || '').trim(),
        orderQty: row[colMap.orderQty] || '',
        stockQty: row[colMap.stockQty] || '',
        shipQty: row[colMap.shipQty] || '',
        inspectionPlan: String(row[colMap.inspectionPlan] || '').trim(),
        deliveryAddress: String(row[colMap.deliveryAddress] || '').trim(),
        deliveryInstructions: String(row[colMap.deliveryInstructions] || '').trim(),
        workItems: workItems,
        workTotalAmount: 0,
        _fileName: fileName,
        _embeddedImage: embeddedImage
      };
    } else {
      // Sub-row: additional work item for current product
      if (currentItem) {
        const workName = String(row[workColMap.workName] || '').trim();
        if (workName) {
          currentItem.workItems.push({
            name: workName,
            sets: parseNumeric(row[workColMap.sets]) || 0,
            qty: parseNumeric(row[workColMap.qty]) || 0,
            unitPrice: parseNumeric(row[workColMap.unitPrice]) || 0,
            amount: parseNumeric(row[workColMap.amount]) || 0
          });
        }
      }
    }
  }
  
  // Don't forget the last product
  if (currentItem) {
    items.push(currentItem);
  }
  
  // Calculate total amounts for each product
  items.forEach(item => {
    item.workTotalAmount = item.workItems.reduce((sum, w) => sum + (w.amount || 0), 0);
  });
  
  // Derive FT number from filename or meta
  const ftNumberFromFile = extractFtNumberFromWjft(fileName);
  const ftNumber = workMeta.ftNumber || ftNumberFromFile;
  
  const totalWorkAmount = items.reduce((sum, item) => sum + item.workTotalAmount, 0);
  
  allData[fileName] = {
    fileType: 'wjft',
    items,
    workMeta: {
      ...workMeta,
      ftNumber: ftNumber,
      totalWorkAmount
    }
  };
  
  if (!fileOrder.includes(fileName)) {
    fileOrder.push(fileName);
  }
  
  console.log(`WJFT: Processed ${items.length} products from ${fileName}`);
  console.log('WJFT Meta:', workMeta);
  console.log('WJFT Sample item:', items[0]);
  
  // Save to IndexedDB
  await saveDataToDB(fileName, {
    fileType: 'wjft',
    items,
    workMeta: allData[fileName].workMeta
  });
  
  renderTabs();
  renderContent();
  persistLocalCache();
}

/**
 * 指定されたFT番号に紐づくWJFTデータを検索する
 * @param {string} ftFileName - FTファイル名 (例: "FT6705-00017.xlsx")
 * @returns {Object|null} WJFTデータまたはnull
 */
function findLinkedWjftData(ftFileName) {
  // Extract FT number from filename
  const ftMatch = ftFileName.match(/^(FT[\d\-]+)/i);
  if (!ftMatch) return null;
  const ftNumber = ftMatch[1];
  
  // Search through all loaded WJFT files
  for (const [fileName, data] of Object.entries(allData)) {
    if (data.fileType !== 'wjft') continue;
    if (data.workMeta && data.workMeta.ftNumber === ftNumber) {
      return { fileName, data };
    }
  }
  return null;
}

/**
 * FTの商品アイテムに紐づくWJFT作業情報を検索する
 * URLの一致で対応付ける
 * @param {Object} ftItem - FTの商品アイテム
 * @param {Array} wjftItems - WJFTの商品アイテム配列
 * @returns {Object|null} 対応するWJFT作業アイテムまたはnull
 */
function findLinkedWorkItem(ftItem, wjftItems) {
  if (!ftItem || !wjftItems || wjftItems.length === 0) return null;
  
  // Extract first URL from FT item for matching
  const ftUrls = String(ftItem.siteUrl || '').match(/https?:\/\/[^\s]+/g) || [];
  if (ftUrls.length === 0) return null;
  
  for (const wjftItem of wjftItems) {
    const wjftUrls = String(wjftItem.siteUrl || '').match(/https?:\/\/[^\s]+/g) || [];
    // Check if any URL matches (compare base URLs without query params/trackers)
    for (const ftUrl of ftUrls) {
      const ftBase = extractBaseUrl(ftUrl);
      for (const wjftUrl of wjftUrls) {
        const wjftBase = extractBaseUrl(wjftUrl);
        if (ftBase && wjftBase && ftBase === wjftBase) {
          return wjftItem;
        }
      }
    }
  }
  return null;
}

/**
 * URLからベースURL（ドメイン+パス）を抽出する（クエリパラメータ除去）
 */
function extractBaseUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    // Fallback: remove query string manually
    return url.split('?')[0].split('#')[0];
  }
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
