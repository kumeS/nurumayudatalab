// parseNumeric is now in app-utils.js

function syncFileOrder() {
  const existing = fileOrder.filter(name => allData[name]);
  const missing = Object.keys(allData).filter(name => !existing.includes(name));
  fileOrder = [...existing, ...missing];
}

function reorderFileOrder(source, target, beforeTarget = true) {
  if (source === target) return;
  const currentIndex = fileOrder.indexOf(source);
  if (currentIndex === -1) return;
  fileOrder.splice(currentIndex, 1);
  let targetIndex = fileOrder.indexOf(target);
  if (targetIndex === -1) {
    fileOrder.push(source);
  } else {
    if (!beforeTarget) {
      targetIndex += 1;
    }
    fileOrder.splice(targetIndex, 0, source);
  }
  persistLocalCache();
  renderTabs();
}

function persistLocalCache() {
  const snapshot = {
    allData,
    currentTab,
    fileOrder,
    productSortMode
  };
  saveCache(snapshot); // Use utility function from app-utils.js
}

function restoreFromLocalCache() {
  const parsed = loadCache(); // Use utility function from app-utils.js
  try {
    if (!parsed) return false;
    if (parsed && typeof parsed.allData === 'object') {
      allData = parsed.allData || {};
      currentTab = parsed.currentTab || 'all';
      fileOrder = Array.isArray(parsed.fileOrder) ? parsed.fileOrder : Object.keys(allData);
      productSortMode = parsed.productSortMode || 'default';
      if (productSortModeSelect) {
        productSortModeSelect.value = productSortMode;
      }
      syncFileOrder();
      if (Object.keys(allData).length > 0) {
        renderTabs();
        renderContent();
      }
      return true;
    }
  } catch (err) {
    console.warn('Failed to restore local cache', err);
  }
  return false;
}

function clearLocalCache() {
  removeCache(); // Use utility function from app-utils.js
}

// blobToDataUrl is now in app-utils.js

function formatShipmentValue(value) {
  if (value === undefined || value === null || value === '') {
    return '出荷無し';
  }
  return value;
}

function getFirstUrl(siteUrlText) {
  if (!siteUrlText) return '';
  const matches = String(siteUrlText).match(/https?:\/\/[^\s]+/g);
  if (!matches || matches.length === 0) return '';
  return matches[0];
}

function renderProductLinks(siteUrlText) {
  if (!siteUrlText) return '';
  const matches = String(siteUrlText).match(/https?:\/\/[^\s]+/g);
  if (!matches) return '';
  return matches.map((url, idx) => {
    const safeUrl = url.replace(/"/g, '&quot;');
    return `<a href="${safeUrl}" target="_blank" rel="noreferrer noopener" class="product-link">商品ページ${matches.length > 1 ? ` (${idx + 1})` : ''}</a>`;
  }).join('');
}

function renderFileTags(files) {
  if (!files || files.length === 0) return '';
  const uniqueFiles = [...new Set(files)];
  return uniqueFiles.map(name => `<div class="file-tag">${escapeHtml(name)}</div>`).join('');
}

function handleProductSortChange(event) {
  productSortMode = event.target.value || 'default';
  persistLocalCache();
  renderContent();
}

function sortProducts(items) {
  if (!Array.isArray(items)) return [];
  if (productSortMode === 'default') return items;
  const sorted = [...items];
  const isAsc = productSortMode.endsWith('-asc');

  // URL順の場合は文字列ソート
  if (productSortMode === 'url-asc') {
    sorted.sort((a, b) => {
      const urlA = getFirstUrl(a.siteUrl) || '';
      const urlB = getFirstUrl(b.siteUrl) || '';
      if (!urlA && !urlB) return 0;
      if (!urlA) return 1;
      if (!urlB) return -1;
      return urlA.localeCompare(urlB);
    });
    return sorted;
  }

  // 数値ソート
  sorted.sort((a, b) => {
    const valA = getSortMetric(a, productSortMode);
    const valB = getSortMetric(b, productSortMode);
    const aInvalid = valA === null || isNaN(valA);
    const bInvalid = valB === null || isNaN(valB);
    if (aInvalid && bInvalid) return 0;
    if (aInvalid) return 1;
    if (bInvalid) return -1;
    return isAsc ? valA - valB : valB - valA;
  });
  return sorted;
}

function getSortMetric(item, mode) {
  switch (mode) {
    case 'subtotal-desc':
    case 'subtotal-asc':
      return parseNumeric(item.subtotal);
    case 'ship-desc':
    case 'ship-asc':
      return parseNumeric(item.shipQty);
    case 'domestic-desc':
      return parseNumeric(item.domesticShip);
    default:
      return parseNumeric(item.subtotal);
  }
}

function getStatusDetailKey(text) {
  if (!text) return null;
  return Object.keys(STATUS_DETAILS).find(key => String(text).includes(key)) || null;
}

function showStatusPopup(trigger, key) {
  if (!statusPopup || !key) return;
  const detail = STATUS_DETAILS[key];
  if (!detail) return;
  statusPopup.textContent = detail;
  statusPopup.classList.remove('hidden');
  const rect = trigger.getBoundingClientRect();
  const popupRect = statusPopup.getBoundingClientRect();
  let left = window.scrollX + rect.left;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - popupRect.width - 16;
  if (left > maxLeft) left = maxLeft;
  const top = window.scrollY + rect.bottom + 8;
  statusPopup.style.left = `${Math.max(window.scrollX + 8, left)}px`;
  statusPopup.style.top = `${top}px`;
}

function hideStatusPopup() {
  if (!statusPopup) return;
  statusPopup.classList.add('hidden');
}

// Attach event listeners after all functions are defined
window.addEventListener('scroll', () => hideStatusPopup(), true);
window.addEventListener('resize', hideStatusPopup);
window.addEventListener('beforeunload', persistLocalCache);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    persistLocalCache();
  }
});

// Attach product sort change listener
if (productSortModeSelect) {
  productSortModeSelect.addEventListener('change', handleProductSortChange);
}
