function getDisplayData() {
  if (currentTab === 'all') {
    const merged = Object.values(allData).filter(d => d.fileType !== 'wjft').flatMap(d => d.items);

    // 重複をまとめるモードが有効な場合
    if (mergeAllDuplicates) {
      const uniqueMap = new Map();
      merged.forEach(item => {
        const url = (item.siteUrl || '').trim();
        const unitPrice = String(item.unitPriceCny || '').trim();

        // URL or unitPrice がない場合のフォールバックキー
        if (!url && !unitPrice) {
          const fallbackKey = JSON.stringify({
            variant: (item.variant || '').trim(),
            subtotal: (item.subtotal || '').toString().replace(/[^\d.]/g, '')
          });

          if (!uniqueMap.has(fallbackKey)) {
            uniqueMap.set(fallbackKey, {
              ...item,
              _files: [item._fileName],
              _situations: collectSituationEntries(item),
              _variants: [item.variant || ''],
              _arrivalDates: item.arrivalDate ? [item.arrivalDate] : [],
              _orderDates: item._orderMeta?.orderDate ? [item._orderMeta.orderDate] : [],
              _totalOrderQty: parseFloat(item.orderQty) || 0,
              _totalShipQty: parseFloat(item.shipQty) || 0
            });
          } else {
            const existing = uniqueMap.get(fallbackKey);
            existing._files.push(item._fileName);
            appendSituationEntries(existing, collectSituationEntries(item));

            // Collect unique variants
            if (item.variant && !existing._variants.includes(item.variant)) {
              existing._variants.push(item.variant);
            }

            // Collect unique arrival dates
            if (item.arrivalDate && !existing._arrivalDates.includes(item.arrivalDate)) {
              existing._arrivalDates.push(item.arrivalDate);
            }

            // Collect unique order dates
            if (item._orderMeta?.orderDate && !existing._orderDates.includes(item._orderMeta.orderDate)) {
              existing._orderDates.push(item._orderMeta.orderDate);
            }

            console.log(`[Fallback] Merging item. Current situations:`, existing._situations);

            // 数量を合計（加重平均計算用）
            const itemOrderQty = parseFloat(item.orderQty) || 0;
            const itemShipQty = parseFloat(item.shipQty) || 0;
            existing._totalOrderQty += itemOrderQty;
            existing._totalShipQty += itemShipQty;

            // 金額を合計
            const existingSubtotal = parseFloat(String(existing.subtotal).replace(/[¥,]/g, '')) || 0;
            const itemSubtotal = parseFloat(String(item.subtotal).replace(/[¥,]/g, '')) || 0;
            existing.subtotal = existingSubtotal + itemSubtotal;

            // 数量を合計
            existing.orderQty = existing._totalOrderQty;
            existing.shipQty = existing._totalShipQty;

            // 中国内送料を合計
            const existingDomestic = parseFloat(String(existing.domesticShip || '').replace(/[^\d.]/g, '')) || 0;
            const itemDomestic = parseFloat(String(item.domesticShip || '').replace(/[^\d.]/g, '')) || 0;
            if (existingDomestic > 0 || itemDomestic > 0) {
              existing.domesticShip = existingDomestic + itemDomestic;
            }

            // 加重平均で単価を再計算
            if (existing._totalOrderQty > 0 && existing.subtotal > 0) {
              const avgPriceJpy = existing.subtotal / existing._totalOrderQty;
              existing.unitPriceJpy = avgPriceJpy;

              // CNY単価も再計算（為替レート逆算）
              const existingCnyPrice = parseFloat(String(existing.unitPriceCny || '').replace(/[^\d.]/g, '')) || 0;
              const itemCnyPrice = parseFloat(String(item.unitPriceCny || '').replace(/[^\d.]/g, '')) || 0;
              if (existingCnyPrice > 0 || itemCnyPrice > 0) {
                existing.unitPriceCny = ((existingCnyPrice * (existing._totalOrderQty - itemOrderQty)) + (itemCnyPrice * itemOrderQty)) / existing._totalOrderQty;
              }
            }
          }
          return;
        }

        const key = `${url}|${unitPrice}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            ...item,
            _files: [item._fileName],
            _situations: collectSituationEntries(item),
            _variants: [item.variant || ''],
            _arrivalDates: item.arrivalDate ? [item.arrivalDate] : [],
            _orderDates: item._orderMeta?.orderDate ? [item._orderMeta.orderDate] : [],
            _totalOrderQty: parseFloat(item.orderQty) || 0,
            _totalShipQty: parseFloat(item.shipQty) || 0
          });
        } else {
          const existing = uniqueMap.get(key);
          existing._files.push(item._fileName);
          appendSituationEntries(existing, collectSituationEntries(item));

          // Collect unique variants
          if (item.variant && !existing._variants.includes(item.variant)) {
            existing._variants.push(item.variant);
          }

          // Collect unique arrival dates
          if (item.arrivalDate && !existing._arrivalDates.includes(item.arrivalDate)) {
            existing._arrivalDates.push(item.arrivalDate);
          }

          // Collect unique order dates
          if (item._orderMeta?.orderDate && !existing._orderDates.includes(item._orderMeta.orderDate)) {
            existing._orderDates.push(item._orderMeta.orderDate);
          }

          console.log(`[URL/Price] Merging item. Current situations:`, existing._situations);

          // 数量を合計（加重平均計算用）
          const itemOrderQty = parseFloat(item.orderQty) || 0;
          const itemShipQty = parseFloat(item.shipQty) || 0;
          existing._totalOrderQty += itemOrderQty;
          existing._totalShipQty += itemShipQty;

          // 金額を合計
          const existingSubtotal = parseFloat(String(existing.subtotal).replace(/[¥,]/g, '')) || 0;
          const itemSubtotal = parseFloat(String(item.subtotal).replace(/[¥,]/g, '')) || 0;
          existing.subtotal = existingSubtotal + itemSubtotal;

          // 数量を合計
          existing.orderQty = existing._totalOrderQty;
          existing.shipQty = existing._totalShipQty;

          // 中国内送料を合計
          const existingDomestic = parseFloat(String(existing.domesticShip || '').replace(/[^\d.]/g, '')) || 0;
          const itemDomestic = parseFloat(String(item.domesticShip || '').replace(/[^\d.]/g, '')) || 0;
          if (existingDomestic > 0 || itemDomestic > 0) {
            existing.domesticShip = existingDomestic + itemDomestic;
          }

          // 加重平均で単価を再計算
          if (existing._totalOrderQty > 0 && existing.subtotal > 0) {
            const avgPriceJpy = existing.subtotal / existing._totalOrderQty;
            existing.unitPriceJpy = avgPriceJpy;

            // CNY単価も再計算（為替レート逆算）
            const existingCnyPrice = parseFloat(String(existing.unitPriceCny || '').replace(/[^\d.]/g, '')) || 0;
            const itemCnyPrice = parseFloat(String(item.unitPriceCny || '').replace(/[^\d.]/g, '')) || 0;
            if (existingCnyPrice > 0 || itemCnyPrice > 0) {
              existing.unitPriceCny = ((existingCnyPrice * (existing._totalOrderQty - itemOrderQty)) + (itemCnyPrice * itemOrderQty)) / existing._totalOrderQty;
            }
          }
        }
      });
      return Array.from(uniqueMap.values());
    }

    // 重複をまとめないモード: すべての商品を表示
    return merged.map(item => ({
      ...item,
      _files: [item._fileName]
    }));
  }
  return allData[currentTab]?.items || [];
}

function renderContent() {
  // Handle summary tab separately
  if (currentTab === 'summary') {
    renderSummaryContent();
    return;
  }

  // Handle WJFT tab separately
  if (currentTab !== 'all' && allData[currentTab]?.fileType === 'wjft') {
    renderWjftContent(currentTab);
    return;
  }

  // Show product sort controls and merge duplicates button for 'all' tab
  const tabControls = document.querySelector('.tab-controls');
  if (tabControls) {
    tabControls.style.display = ''; // Restore display property managed by CSS classes

    // Add merge duplicates button for 'all' tab only
    if (currentTab === 'all') {
      const existingMergeBtn = tabControls.querySelector('.merge-duplicates-control');
      if (!existingMergeBtn) {
        const mergeControl = document.createElement('label');
        mergeControl.className = 'merge-duplicates-control';
        mergeControl.innerHTML = `
          <input type="checkbox" id="mergeDuplicatesCheckbox" ${mergeAllDuplicates ? 'checked' : ''}>
          重複をまとめる
        `;
        tabControls.appendChild(mergeControl);
      }
    } else {
      // Remove merge duplicates button for other tabs
      const existingMergeBtn = tabControls.querySelector('.merge-duplicates-control');
      if (existingMergeBtn) {
        existingMergeBtn.remove();
      }
    }
  }

  const data = getDisplayData();
  const displayData = sortProducts(data);
  const hasData = displayData.length > 0;
  document.body.classList.toggle('has-data', hasData);
  // Add class to hide situation text when merging duplicates
  document.body.classList.toggle('merge-duplicates-mode', currentTab === 'all' && mergeAllDuplicates);
  if (!hasData) {
    productGrid.innerHTML = '';
    stats.innerHTML = ''; orderInfo.innerHTML = ''; return;
  }

  // Get exchange rate for current tab
  let currentExchangeRate = null;
  if (currentTab !== 'all' && allData[currentTab]?.exchangeRate) {
    currentExchangeRate = allData[currentTab].exchangeRate;
  } else if (currentTab === 'all') {
    // Calculate weighted average exchange rate from all files
    // Weight by total product cost (subtotal sum) for each file
    let totalWeightedRate = 0;
    let totalWeight = 0;

    Object.values(allData).forEach(fileData => {
      if (fileData.exchangeRate && fileData.items) {
        // Calculate total product cost for this file (sum of subtotals)
        const fileTotalCost = fileData.items.reduce((sum, item) => {
          const subtotal = parseFloat(String(item.subtotal).replace(/[¥,]/g, '')) || 0;
          return sum + subtotal;
        }, 0);

        if (fileTotalCost > 0) {
          totalWeightedRate += fileData.exchangeRate * fileTotalCost;
          totalWeight += fileTotalCost;
        }
      }
    });

    if (totalWeight > 0) {
      currentExchangeRate = totalWeightedRate / totalWeight;
    }
  }

  if (currentTab !== 'all' && allData[currentTab]?.orderMeta) {
    const meta = allData[currentTab].orderMeta;
    
    // Build cost breakdown HTML
    let costBreakdownHtml = '';
    if (meta.costBreakdown) {
      const cb = meta.costBreakdown;
      costBreakdownHtml = '<div class="cost-breakdown-section"><h3>費用内訳</h3><div class="cost-breakdown-grid">';
      
      if (cb.productTotal) {
        costBreakdownHtml += `<div class="cost-item"><label>商品代合計 (A)</label><span>¥${formatNumber(cb.productTotal)}</span></div>`;
      }
      if (cb.agencyFee) {
        costBreakdownHtml += `<div class="cost-item"><label>代行手数料 (B)</label><span>¥${formatNumber(cb.agencyFee)}</span></div>`;
      }
      if (cb.domesticShipping) {
        costBreakdownHtml += `<div class="cost-item"><label>中国内送料 (C)</label><span>¥${formatNumber(cb.domesticShipping)}</span></div>`;
      }
      if (cb.internationalShipping) {
        costBreakdownHtml += `<div class="cost-item"><label>国際送料 (D)</label><span>¥${formatNumber(cb.internationalShipping)}</span></div>`;
      }
      if (cb.inspectionFee) {
        costBreakdownHtml += `<div class="cost-item"><label>検品作業費</label><span>¥${formatNumber(cb.inspectionFee)}</span></div>`;
      }
      if (cb.logisticsFee) {
        costBreakdownHtml += `<div class="cost-item"><label>物流加工費</label><span>¥${formatNumber(cb.logisticsFee)}</span></div>`;
      }
      
      costBreakdownHtml += '</div></div>';
    }
    
    // Build shipping info HTML
    let shippingInfoHtml = '';
    if (meta.shippingInfo && meta.shippingInfo.length > 0) {
      shippingInfoHtml = '<div class="shipping-section"><h3>配送情報</h3>';
      meta.shippingInfo.forEach(ship => {
        shippingInfoHtml += `
          <div class="shipping-item">
            <div class="shipping-label">${ship.label}</div>
            <div class="shipping-details">
              ${ship.method ? `<span>${ship.method}</span>` : ''}
              ${ship.trackingNo ? `<span>${ship.trackingNo}</span>` : ''}
              ${ship.weight && ship.unit ? `<span>${ship.weight} ${ship.unit}</span>` : ''}
              ${ship.amount && ship.currency ? `<span>${ship.amount} ${ship.currency}</span>` : ''}
            </div>
          </div>`;
      });
      shippingInfoHtml += '</div>';
    }
    
    orderInfo.innerHTML = `
      <div class="order-info">
        <h2>注文情報</h2>
        <div class="order-info-grid">
          ${meta.orderNo ? `<div class="order-info-item"><label>注文番号</label><span>${meta.orderNo}</span></div>` : ''}
          ${meta.orderDate ? `<div class="order-info-item"><label>注文日</label><span>${meta.orderDate}</span></div>` : ''}
          ${meta.shippingDate ? `<div class="order-info-item"><label>出荷予定日</label><span>${meta.shippingDate}</span></div>` : ''}
          ${meta.totalPayment ? `<div class="order-info-item"><label>支払合計</label><span class="price">¥${meta.totalPayment}</span></div>` : ''}
        </div>
        ${costBreakdownHtml}
        ${shippingInfoHtml}
      </div>`;
  } else { orderInfo.innerHTML = ''; }

  const totalItems = displayData.length;
  const totalShipQty = displayData.reduce((sum, item) => sum + (parseFloat(item.shipQty) || 0), 0);
  const totalOrderQty = displayData.reduce((sum, item) => sum + (parseFloat(item.orderQty) || 0), 0);
  const totalPrice = displayData.reduce((sum, item) => sum + (parseFloat(String(item.subtotal).replace(/[¥,]/g, '')) || 0), 0);
  const shippedCount = displayData.filter(item => String(item.status).includes('発送')).length;
  
  console.log('Statistics:', { totalItems, totalShipQty, totalOrderQty, totalPrice, shippedCount });
  console.log('Sample quantities from first 3 items:', data.slice(0, 3).map(item => ({
    orderQty: item.orderQty,
    shipQty: item.shipQty,
    orderQtyParsed: parseFloat(item.orderQty),
    shipQtyParsed: parseFloat(item.shipQty)
  })));
  
  const exchangeInfo = currentExchangeRate ? `<div class="stat-card"><h3>為替レート (CiLEL手数料込)</h3><div class="value" style="font-size: 18px;">1元 = ¥${currentExchangeRate.toFixed(2)}</div></div>` : '';
  
  // Check for linked WJFT work cost for FT tab stats
  let workCostInfo = '';
  if (currentTab !== 'all') {
    const wjftPreCheck = findLinkedWjftData(currentTab);
    if (wjftPreCheck && wjftPreCheck.data) {
      const totalWorkCost = wjftPreCheck.data.workMeta?.totalWorkAmount || 0;
      workCostInfo = `<div class="stat-card wjft-stat"><h3>作業費合計</h3><div class="value" style="color:#9b59b6;">¥${totalWorkCost.toLocaleString()}</div></div>`;
    }
  }
  
  stats.innerHTML = `
    <div class="stat-card"><h3>商品種類</h3><div class="value">${totalItems}</div></div>
    <div class="stat-card"><h3>総発注数</h3><div class="value">${totalShipQty}</div></div>
    <div class="stat-card"><h3>発注数量合計</h3><div class="value">${totalOrderQty}</div></div>
    <div class="stat-card"><h3>小計合計</h3><div class="value">¥${totalPrice.toLocaleString()}</div></div>
    <div class="stat-card"><h3>発送済み</h3><div class="value">${shippedCount}/${totalItems}</div></div>
    ${exchangeInfo}
    ${workCostInfo}`;
  let html = '';
  
  // Find linked WJFT data for FT cards
  let linkedWjft = null;
  const linkedWjftCache = {}; // Cache for 'all' tab, keyed by FT filename
  if (currentTab !== 'all' && allData[currentTab] && allData[currentTab].fileType !== 'wjft') {
    const wjftResult = findLinkedWjftData(currentTab);
    if (wjftResult) linkedWjft = wjftResult;
  } else if (currentTab === 'all') {
    // Pre-compute linked WJFT for all FT files
    Object.keys(allData).forEach(fileName => {
      if (allData[fileName].fileType !== 'wjft') {
        const wjftResult = findLinkedWjftData(fileName);
        if (wjftResult) linkedWjftCache[fileName] = wjftResult;
      }
    });
  }
  
  displayData.forEach(item => {
    const imageUrl = item._embeddedImage || extractImageUrl(item.photo) || extractImageUrl(item.siteUrl);
    const statusClass = String(item.status).includes('発送') ? 'status-shipped' : 'status-pending';
    const statusKey = getStatusDetailKey(item.status);
    const statusDetail = statusKey ? STATUS_DETAILS[statusKey] : null;
    const statusContent = statusDetail
      ? `<button type="button" class="status-info ${statusClass}" data-status-key="${statusKey}">${escapeHtml(item.status || '-')}</button>`
      : `<span class="${statusClass}">${escapeHtml(item.status || '-')}</span>`;
    
    // Use file-specific exchange rate for domestic shipping
    const fileExchangeRate = allData[item._fileName]?.exchangeRate || currentExchangeRate;
    
    // Display variant(s) - show all if consolidated with tags
    let variantDisplay;
    if (item._variants && item._variants.length > 0) {
      // Use tags for all consolidated items (1 or more)
      variantDisplay = `<div class="tag-container">${item._variants.map(v => {
        const variantText = escapeHtml(v || '');
        const isLong = variantText.length > 30;
        return `<span class="variant-tag${isLong ? ' variant-tag-long' : ''}">${variantText}</span>`;
      }).join('')}</div>`;
    } else if (item.variant && item.variant.length > 50) {
      // Long single variant text - allow wrapping
      variantDisplay = `<div class="tag-container"><span class="variant-tag variant-tag-long">${escapeHtml(item.variant)}</span></div>`;
    } else {
      // Short single variant - display as text
      variantDisplay = escapeHtml(item.variant) || '詳細なし';
    }

    // Display arrival date(s) - show all if consolidated with tags
    const arrivalDateDisplay = item._arrivalDates && item._arrivalDates.length > 0
      ? `<div class="tag-container">${item._arrivalDates.map(d => `<span class="date-tag">${escapeHtml(d)}</span>`).join('')}</div>`
      : item.arrivalDate ? escapeHtml(item.arrivalDate) : null;

    // Display order date(s) - show all if consolidated with tags, or single date if available
    const orderDateDisplay = item._orderDates && item._orderDates.length > 0
      ? `<div class="detail-item"><label>注文日</label><div class="tag-container">${item._orderDates.map(d => `<span class="date-tag">${escapeHtml(d)}</span>`).join('')}</div></div>`
      : item._orderMeta?.orderDate
        ? `<div class="detail-item"><label>注文日</label><span>${escapeHtml(item._orderMeta.orderDate)}</span></div>`
        : '';

    html += `
      <div class="product-card">
        <div class="product-header">
          ${imageUrl ? `<img class="product-image" src="${imageUrl}" alt="商品" onerror="this.style.display='none'">` : ''}
          <div class="product-main">
            <div class="product-variant">${variantDisplay}</div>
            <div class="product-price">¥${formatNumber(item.subtotal)}</div>
            <div class="product-price-detail">単価: ¥${formatNumber(item.unitPriceJpy)} × ${item.orderQty || '-'}個</div>
          </div>
        </div>
        <div class="product-details">
          <div class="detail-grid">
            ${orderDateDisplay}
            ${item.orderQty ? `<div class="detail-item"><label>発注数量</label><span>${item.orderQty}</span></div>` : ''}
            ${item.shipQty !== undefined && item.shipQty !== null && item.shipQty !== '' ? `<div class="detail-item"><label>出荷数量</label><span>${formatShipmentValue(item.shipQty)}</span></div>` : ''}
            <div class="detail-item"><label>状態</label>${statusContent}</div>
            <div class="detail-item"><label>中国内送料</label><span>${formatDomesticShipping(item.domesticShip, fileExchangeRate)}</span></div>
            ${item.shopOrder ? `<div class="detail-item"><label>ショップ発注</label><span>${escapeHtml(item.shopOrder)}</span></div>` : ''}
            ${arrivalDateDisplay ? `<div class="detail-item"><label>到着予定日</label><span>${arrivalDateDisplay}</span></div>` : ''}
            ${item.inspectionPlan ? `<div class="detail-item"><label>検品ﾌﾟﾗﾝ</label><span>${escapeHtml(item.inspectionPlan)}</span></div>` : ''}
          </div>
          ${item._situations && item._situations.length > 0 ? (console.log('Rendering situations for item:', item._situations), renderSituations(item._situations)) : item.situation ? `<div class="situation-note">📝 ${escapeHtml(item.situation)}</div>` : ''}
          ${renderWorkSummaryForFtItem(item, currentTab === 'all' ? linkedWjftCache[item._fileName] : linkedWjft)}
          ${renderProductLinks(item.siteUrl)}
          ${currentTab === 'all' ? renderFileTags(item._files || [item._fileName]) : ''}
        </div>
      </div>`;
  });
  productGrid.innerHTML = html;
}

function extractImageUrl(text) {
  if (!text) return null;
  const str = String(text);
  const imgMatch = str.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/i);
  if (imgMatch) return imgMatch[0];
  const aliMatch = str.match(/https?:\/\/cbu01\.alicdn\.com[^\s"'<>]+/i);
  if (aliMatch) return aliMatch[0];
  return null;
}

// Build a highlight key for thumbnails; keep search params to avoid over-grouping
function buildImageKey(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:')) {
    return imageUrl.slice(0, 200); // keep it short for data URIs
  }
  try {
    const urlObj = new URL(imageUrl, window.location.href);
    // Keep search params to avoid過剰マージ; hashは無視
    urlObj.hash = '';
    return urlObj.toString();
  } catch (e) {
    return imageUrl;
  }
}

function collectSituationEntries(item) {
  if (!item) return [];
  if (Array.isArray(item._situations) && item._situations.length > 0) {
    return item._situations
      .map(entry => normalizeSituationEntry(entry, item._fileName))
      .filter(Boolean);
  }
  const normalized = normalizeSituationEntry(item.situation, item._fileName);
  return normalized ? [normalized] : [];
}

function appendSituationEntries(targetItem, entries) {
  if (!targetItem) return;
  if (!Array.isArray(entries) || entries.length === 0) return;
  if (!Array.isArray(targetItem._situations)) {
    targetItem._situations = [];
  }
  
  entries.forEach(newEntry => {
    if (!newEntry || !newEntry.text) return;
    
    // Find existing entry with same text
    const existingEntry = targetItem._situations.find(e => e.text === newEntry.text);
    
    if (existingEntry) {
      // Merge file info if different
      if (newEntry.file) {
        if (!existingEntry.file) {
          existingEntry.file = newEntry.file;
        } else {
          const currentFiles = existingEntry.file.split(', ');
          if (!currentFiles.includes(newEntry.file)) {
            existingEntry.file += `, ${newEntry.file}`;
          }
        }
      }
    } else {
      targetItem._situations.push(newEntry);
    }
  });
}

function normalizeSituationEntry(rawEntry, fallbackFile) {
  if (!rawEntry) return null;
  if (typeof rawEntry === 'string') {
    const trimmed = rawEntry.trim();
    if (!trimmed) return null;
    return { text: trimmed, file: fallbackFile || null };
  }
  if (typeof rawEntry === 'object') {
    const rawText = rawEntry.text ?? rawEntry.situation ?? rawEntry.value ?? rawEntry.note;
    const trimmed = rawText !== undefined && rawText !== null
      ? String(rawText).trim()
      : '';
    if (!trimmed) return null;
    return {
      text: trimmed,
      file: rawEntry.file || rawEntry.source || rawEntry._fileName || fallbackFile || null
    };
  }
  const fallback = String(rawEntry).trim();
  if (!fallback) return null;
  return { text: fallback, file: fallbackFile || null };
}

// formatNumber is now in app-utils.js

function renderSituations(situations) {
  if (!Array.isArray(situations) || situations.length === 0) {
    return '';
  }
  
  // Filter out empty entries - entries should already be normalized objects
  const validEntries = situations.filter(entry => {
    if (!entry) return false;
    // Handle both object format {text, file} and legacy string format
    if (typeof entry === 'object' && entry.text) return true;
    if (typeof entry === 'string' && entry.trim()) return true;
    return false;
  });
  
  if (validEntries.length === 0) {
    return '';
  }

  const colors = [
    'rgba(0, 201, 255, 0.15)',
    'rgba(146, 254, 157, 0.15)',
    'rgba(255, 153, 102, 0.15)',
    'rgba(255, 94, 98, 0.15)',
    'rgba(253, 203, 110, 0.15)',
    'rgba(155, 89, 182, 0.15)'
  ];

  return `<div class="situation-panels">
    ${validEntries.map((entry, idx) => {
      const bgColor = colors[idx % colors.length];
      // Handle both object format and legacy string format
      const text = typeof entry === 'object' ? entry.text : String(entry).trim();
      const file = typeof entry === 'object' ? entry.file : null;
      const sourceTag = file ? `<span class="situation-source">${escapeHtml(file)}</span>` : '';
      return `<div class="situation-panel" style="background: ${bgColor};">
        <span class="situation-icon">📝</span>
        <span class="situation-text">${escapeHtml(text)}</span>
        ${sourceTag}
      </div>`;
    }).join('')}
  </div>`;
}

function formatDomesticShipping(val, exchangeRate) {
  if (!val || val === '-') return '-';
  const numStr = String(val).replace(/[^\d.]/g, '');
  const num = parseFloat(numStr);
  if (isNaN(num)) return val;
  
  const jpyAmount = exchangeRate ? (num * exchangeRate).toFixed(0) : '?';
  return `${num} 元 (≈¥${Number(jpyAmount).toLocaleString()})`;
}

// escapeHtml and normalizeHeaderText are now in app-utils.js

function renderSummaryContent() {
  document.body.classList.add('has-data');
  orderInfo.innerHTML = '';

  // Hide product sort controls for summary tab
  const tabControls = document.querySelector('.tab-controls');
  if (tabControls) {
    tabControls.style.display = 'none';
  }

  const fileNames = Object.keys(allData);
  if (fileNames.length === 0) {
    stats.innerHTML = '';
    productGrid.innerHTML = '<div class="empty-state"><p>集計可能なデータがありません。ファイルを読み込んでください。</p></div>';
    return;
  }

  // Calculate overall totals
  let totalFiles = fileNames.length;
  let totalItems = 0;
  let totalOrderQty = 0;
  let totalShipQty = 0;
  let totalSubtotal = 0;
  let totalInternationalShipping = 0;

  let fileData = fileNames.map(fileName => {
    const data = allData[fileName];
    const isWjft = data.fileType === 'wjft';
    const items = data.items || [];
    const orderMeta = isWjft ? (data.workMeta || {}) : (data.orderMeta || {});

    // Collect all images (allow duplicates; grouping is done by highlight key = raw URL)
    const images = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const imageUrl = item._embeddedImage || extractImageUrl(item.photo) || extractImageUrl(item.siteUrl);
      if (!imageUrl) continue;
      const imageKey = String(imageUrl);
      images.push({
        imageUrl,
        imageKey
      });
    }

    // Parse international shipping
    let intlShipping = 0;
    if (orderMeta.costBreakdown && orderMeta.costBreakdown.internationalShipping) {
       intlShipping = parseNumeric(orderMeta.costBreakdown.internationalShipping);
       if (isNaN(intlShipping)) intlShipping = 0;
    }

    const fileTotal = {
      fileName,
      isWjft,
      itemCount: items.length,
      orderQty: sumField(items, 'orderQty'),
      shipQty: sumField(items, 'shipQty'),
      subtotal: isWjft ? 0 : sumField(items, 'subtotal'),
      workTotalAmount: isWjft ? items.reduce((sum, item) => sum + (item.workTotalAmount || 0), 0) : 0,
      internationalShipping: intlShipping,
      orderDate: orderMeta.orderDate || '-',
      orderNo: isWjft ? (orderMeta.ftNumber || '-') : (orderMeta.orderNo || '-'),
      shippingDate: isWjft ? (orderMeta.workDate || '-') : (orderMeta.shippingDate || '-'),
      totalPayment: orderMeta.totalPayment || '-',
      costBreakdown: orderMeta.costBreakdown || null,
      shippingInfo: orderMeta.shippingInfo || null,
      images: images
    };

    totalItems += fileTotal.itemCount;
    totalOrderQty += fileTotal.orderQty;
    totalShipQty += fileTotal.shipQty;
    totalSubtotal += fileTotal.subtotal;
    totalInternationalShipping += fileTotal.internationalShipping;

    return fileTotal;
  });

  // Sort file data based on summarySortMode
  if (summarySortMode === 'ship-desc') {
    fileData.sort((a, b) => b.shipQty - a.shipQty);
  } else if (summarySortMode === 'ship-asc') {
    fileData.sort((a, b) => a.shipQty - b.shipQty);
  } else if (summarySortMode === 'date-desc') {
    fileData.sort((a, b) => {
      if (a.orderDate === '-') return 1;
      if (b.orderDate === '-') return -1;
      return b.orderDate.localeCompare(a.orderDate);
    });
  } else if (summarySortMode === 'date-asc') {
    fileData.sort((a, b) => {
      if (a.orderDate === '-') return 1;
      if (b.orderDate === '-') return -1;
      return a.orderDate.localeCompare(b.orderDate);
    });
  } else if (summarySortMode === 'name-asc') {
    fileData.sort((a, b) => a.fileName.localeCompare(b.fileName));
  } else if (summarySortMode === 'name-desc') {
    fileData.sort((a, b) => b.fileName.localeCompare(a.fileName));
  }
  // default: keep original order

  // Render overall stats
  stats.innerHTML = `
    <div class="stat-card"><h3>集計ファイル数</h3><div class="value">${totalFiles}</div></div>
    <div class="stat-card"><h3>商品種類合計</h3><div class="value">${totalItems}</div></div>
    <div class="stat-card"><h3>発注数量合計</h3><div class="value">${totalOrderQty}</div></div>
    <div class="stat-card"><h3>出荷数量合計</h3><div class="value">${totalShipQty}</div></div>
    <div class="stat-card"><h3>商品代合計</h3><div class="value">¥${totalSubtotal.toLocaleString()}</div></div>
    <div class="stat-card"><h3>国際送料合計</h3><div class="value">¥${totalInternationalShipping.toLocaleString()}</div></div>`;

  // Render file summary table with sort control
  let html = '<div class="summary-table-container">';
  html += '<div class="summary-header">';
  html += '<h2>📊 ファイル別集計</h2>';
  html += '<div class="summary-sort-control">';
  html += '<label>表示順:';
  html += '<select id="summarySortMode">';
  html += '<option value="default"' + (summarySortMode === 'default' ? ' selected' : '') + '>デフォルト順</option>';
  html += '<option value="name-asc"' + (summarySortMode === 'name-asc' ? ' selected' : '') + '>ファイル名（昇順）</option>';
  html += '<option value="name-desc"' + (summarySortMode === 'name-desc' ? ' selected' : '') + '>ファイル名（降順）</option>';
  html += '<option value="ship-desc"' + (summarySortMode === 'ship-desc' ? ' selected' : '') + '>出荷数量が多い順</option>';
  html += '<option value="ship-asc"' + (summarySortMode === 'ship-asc' ? ' selected' : '') + '>出荷数量が少ない順</option>';
  html += '<option value="date-desc"' + (summarySortMode === 'date-desc' ? ' selected' : '') + '>注文日が新しい順</option>';
  html += '<option value="date-asc"' + (summarySortMode === 'date-asc' ? ' selected' : '') + '>注文日が古い順</option>';
  html += '</select>';
  html += '</label>';
  html += '</div>';
  html += '</div>';
  html += '<table class="summary-table">';
  html += '<thead><tr><th>ファイル名</th><th>商品画像</th><th>注文日</th><th>商品種類</th><th>発注数量</th><th>出荷数量</th><th>商品代(小計)</th><th>国際送料</th></tr></thead><tbody>';

  fileData.forEach(file => {
    // Render image thumbnails
    let imageThumbnails = '<div class="image-thumbnails">';
    if (file.images.length > 0) {
      file.images.forEach(imageInfo => {
        const imageUrl = imageInfo.imageUrl;
        const imageKey = (imageInfo.imageKey || buildImageKey(imageUrl) || '').trim();
        const highlightKey = (imageInfo.imageUrl || imageKey || '').trim();
        imageThumbnails += `<img src="${escapeHtml(imageUrl)}" alt="商品" class="thumbnail-img" data-image-url="${escapeHtml(imageUrl)}" data-image-key="${escapeHtml(imageKey)}" data-highlight-key="${escapeHtml(highlightKey)}" onerror="this.style.display='none'">`;
      });
    }
    imageThumbnails += '</div>';

    html += `<tr class="${file.isWjft ? 'wjft-summary-row' : ''}">
      <td class="file-name">${escapeHtml(file.fileName)}</td>
      <td class="images">${imageThumbnails}</td>
      <td class="order-date">${escapeHtml(file.orderDate)}</td>
      <td class="number">${file.itemCount}</td>
      <td class="number">${file.orderQty}</td>
      <td class="number">${file.shipQty}</td>
      <td class="price">${file.isWjft ? '<span class="wjft-amount">作業費 ¥' + file.workTotalAmount.toLocaleString() + '</span>' : '¥' + file.subtotal.toLocaleString()}</td>
      <td class="price">${file.isWjft ? '-' : '¥' + file.internationalShipping.toLocaleString()}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  productGrid.innerHTML = html;

  // Attach sort event listener
  const summarySortModeSelect = document.getElementById('summarySortMode');
  if (summarySortModeSelect) {
    summarySortModeSelect.addEventListener('change', (e) => {
      summarySortMode = e.target.value;
      localStorage.setItem('CiLELViewerSummarySortMode', summarySortMode);
      renderSummaryContent();
    });
  }

  attachSummaryThumbnailHover();
}

// ============================================================
// WJFT (作業明細) レンダリング
// ============================================================

/**
 * WJFTタブの専用レンダリング
 */
function renderWjftContent(fileName) {
  document.body.classList.add('has-data');
  
  const data = allData[fileName];
  if (!data || data.fileType !== 'wjft') return;
  
  const meta = data.workMeta || {};
  const items = data.items || [];
  
  // Hide product sort controls
  const tabControls = document.querySelector('.tab-controls');
  if (tabControls) {
    tabControls.style.display = 'none';
  }
  
  // Get exchange rate from linked FT file
  let exchangeRate = null;
  let linkedFtInfo = '';
  if (meta.ftNumber) {
    // Check if the corresponding FT file is loaded
    const ftFileName = Object.keys(allData).find(name => {
      const match = name.match(/^(FT[\d\-]+)/i);
      return match && match[1] === meta.ftNumber;
    });
    
    if (ftFileName) {
      const ftMeta = allData[ftFileName]?.orderMeta || {};
      exchangeRate = allData[ftFileName]?.exchangeRate || null;
      linkedFtInfo = `
        <div class="wjft-linked-ft">
          <h3>対応する注文</h3>
          <div class="order-info-grid">
            <div class="order-info-item"><label>注文ファイル</label>
              <span class="link-to-ft" data-action="switch-tab" data-tab="${encodeURIComponent(ftFileName)}" style="cursor:pointer;color:var(--accent);text-decoration:underline;">${escapeHtml(ftFileName)}</span>
            </div>
            ${ftMeta.orderNo ? `<div class="order-info-item"><label>注文番号</label><span>${ftMeta.orderNo}</span></div>` : ''}
            ${ftMeta.totalPayment ? `<div class="order-info-item"><label>支払合計</label><span class="price">¥${ftMeta.totalPayment}</span></div>` : ''}
            ${exchangeRate ? `<div class="order-info-item"><label>為替レート</label><span>1元 = ¥${exchangeRate.toFixed(2)}</span></div>` : ''}
          </div>
        </div>`;
    }
  }
  
  // Convert CNY amounts to JPY if exchange rate is available
  // 作業内容（検品作業費）は元なのでレート換算する
  const inspectionFeeJpy = exchangeRate && !isNaN(meta.inspectionFee) ? meta.inspectionFee * exchangeRate : meta.inspectionFee;
  
  // 物流加工費は日本円なのでレート換算しない
  const logisticsFeeJpy = !isNaN(meta.logisticsFee) ? meta.logisticsFee : undefined;
  
  // 作業費合計を計算 (検品作業費(円) + 物流加工費(円))
  let totalWorkAmountMetaJpy = undefined;
  if (inspectionFeeJpy !== undefined || logisticsFeeJpy !== undefined) {
    totalWorkAmountMetaJpy = (inspectionFeeJpy || 0) + (logisticsFeeJpy || 0);
  } else if (meta.totalWorkAmount !== undefined) {
    // 個別の値がない場合のフォールバック（全体を元として換算）
    totalWorkAmountMetaJpy = exchangeRate ? meta.totalWorkAmount * exchangeRate : meta.totalWorkAmount;
  }
  
  orderInfo.innerHTML = `
    <div class="order-info wjft-order-info">
      <h2>検品作業明細</h2>
      <div class="order-info-grid">
        ${meta.ftNumber ? `<div class="order-info-item"><label>注文番号</label><span>${escapeHtml(meta.ftNumber)}</span></div>` : ''}
        ${meta.customerName ? `<div class="order-info-item"><label>顧客名</label><span>${escapeHtml(meta.customerName)}</span></div>` : ''}
        ${meta.orderDate ? `<div class="order-info-item"><label>注文日</label><span>${escapeHtml(meta.orderDate)}</span></div>` : ''}
        ${meta.workDate ? `<div class="order-info-item"><label>作業日</label><span>${escapeHtml(meta.workDate)}</span></div>` : ''}
      </div>
      <div class="wjft-cost-summary">
        ${!isNaN(inspectionFeeJpy) ? `<div class="cost-item"><label>検品作業費</label><span>¥${formatNumber(inspectionFeeJpy.toFixed(0))}</span></div>` : ''}
        ${logisticsFeeJpy !== undefined ? `<div class="cost-item"><label>物流加工費</label><span>¥${formatNumber(logisticsFeeJpy.toFixed(0))}</span></div>` : ''}
        ${totalWorkAmountMetaJpy !== undefined ? `<div class="cost-item cost-total"><label>作業費合計</label><span>¥${formatNumber(totalWorkAmountMetaJpy.toFixed(0))}</span></div>` : ''}
      </div>
      ${meta.comment ? `<div class="wjft-comment"><span class="comment-label">コメント</span> ${escapeHtml(meta.comment)}</div>` : ''}
      ${linkedFtInfo}
    </div>`;
  
  // Stats
  const totalItems = items.length;
  const totalShipQty = items.reduce((sum, item) => sum + (parseFloat(item.shipQty) || 0), 0);
  const totalWorkAmount = items.reduce((sum, item) => sum + item.workTotalAmount, 0);
  // 商品ごとの作業費（検品費）を円換算
  const totalWorkAmountJpy = exchangeRate ? totalWorkAmount * exchangeRate : totalWorkAmount;
  // 統計表示用の総合計（検品費(円) + 物流加工費(円)）
  const finalTotalStatAmountJpy = totalWorkAmountJpy + (logisticsFeeJpy || 0);
  const totalWorkItems = items.reduce((sum, item) => sum + item.workItems.length, 0);
  
  stats.innerHTML = `
    <div class="stat-card"><h3>商品数</h3><div class="value">${totalItems}</div></div>
    <div class="stat-card"><h3>出荷数量合計</h3><div class="value">${totalShipQty}</div></div>
    <div class="stat-card"><h3>作業項目数</h3><div class="value">${totalWorkItems}</div></div>
    <div class="stat-card"><h3>作業費合計</h3><div class="value">¥${formatNumber(finalTotalStatAmountJpy.toFixed(0))}</div></div>`;
  
  // Render product cards with work breakdown
  let html = '';
  items.forEach((item, itemIndex) => {
    const imageUrl = item._embeddedImage || extractImageUrl(item.photo) || extractImageUrl(item.siteUrl);
    
    // Work items table
    let workTableHtml = '';
    if (item.workItems && item.workItems.length > 0) {
      const workItemsHtml = item.workItems.map((w, wIndex) => {
        const rowId = `work-row-${itemIndex}-${wIndex}`;
        // Convert CNY to JPY if exchange rate is available
        const unitPriceJpy = exchangeRate && w.unitPrice ? w.unitPrice * exchangeRate : w.unitPrice;
        const amountJpy = exchangeRate && w.amount ? w.amount * exchangeRate : w.amount;
        
        return `
          <tr class="${w.amount > 0 ? 'has-cost' : 'no-cost'} work-row" data-row-id="${rowId}" data-file="${encodeURIComponent(fileName)}">
            <td class="work-name">
              ${escapeHtml(w.name)}
              <div class="work-row-comment" data-row-id="${rowId}"></div>
            </td>
            <td class="number">${w.sets || '-'}</td>
            <td class="number">${w.qty || '-'}</td>
            <td class="number">${unitPriceJpy ? '¥' + formatNumber(unitPriceJpy.toFixed(0)) : '-'}</td>
            <td class="number amount">${amountJpy ? '¥' + formatNumber(amountJpy.toFixed(0)) : '-'}</td>
          </tr>`;
      }).join('');
      
      // Calculate total in JPY
      const totalJpy = exchangeRate ? item.workTotalAmount * exchangeRate : item.workTotalAmount;
      
      workTableHtml = `
        <div class="wjft-work-table-wrapper">
          <table class="wjft-work-table">
            <thead>
              <tr>
                <th>作業名</th>
                <th>セット数</th>
                <th>個数</th>
                <th>単価 ${exchangeRate ? '(円)' : ''}</th>
                <th>金額 ${exchangeRate ? '(円)' : ''}</th>
              </tr>
            </thead>
            <tbody>
              ${workItemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="total-label">作業費小計</td>
                <td class="number amount total">¥${formatNumber(totalJpy.toFixed(0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>`;
    }
    
    // Variant display (hide if empty)
    const variantText = item.variant || '';
    let variantDisplay = '';
    if (variantText.trim()) {
      variantDisplay = variantText.length > 30
        ? `<div class="tag-container"><span class="variant-tag variant-tag-long">${escapeHtml(variantText)}</span></div>`
        : escapeHtml(variantText);
    }
    
    // Calculate work total in JPY if exchange rate is available
    const workTotalJpy = exchangeRate ? item.workTotalAmount * exchangeRate : item.workTotalAmount;
    
    // Check fields for visibility toggling
    const hasOrderQty = item.orderQty !== undefined && item.orderQty !== null && item.orderQty !== '';
    const hasStockQty = item.stockQty !== undefined && item.stockQty !== null && item.stockQty !== '';
    const hasShipQty = item.shipQty !== undefined && item.shipQty !== null && item.shipQty !== '';
    const hasInspectionPlan = item.inspectionPlan !== undefined && item.inspectionPlan !== null && item.inspectionPlan !== '';
    
    html += `
      <div class="product-card wjft-card">
        <div class="product-header">
          ${imageUrl ? `<img class="product-image" src="${imageUrl}" alt="商品" onerror="this.style.display='none'">` : ''}
          <div class="product-main">
            ${variantDisplay ? `<div class="product-variant">${variantDisplay}</div>` : ''}
            ${workTotalJpy > 0 ? `<div class="product-price wjft-work-amount">作業費: ¥${formatNumber(workTotalJpy.toFixed(0))}</div>` : ''}
            ${hasShipQty ? `<div class="product-price-detail">出荷数量: ${item.shipQty}個</div>` : ''}
          </div>
        </div>
        <div class="product-details">
          ${workTableHtml}
          <div class="detail-grid">
            ${hasOrderQty ? `<div class="detail-item"><label>発注数量</label><span>${item.orderQty}</span></div>` : ''}
            ${hasStockQty ? `<div class="detail-item"><label>入荷数量</label><span>${item.stockQty}</span></div>` : ''}
            ${hasShipQty ? `<div class="detail-item"><label>出荷数量</label><span>${formatShipmentValue(item.shipQty)}</span></div>` : ''}
            ${hasInspectionPlan ? `<div class="detail-item"><label>検品ﾌﾟﾗﾝ</label><span>${escapeHtml(item.inspectionPlan)}</span></div>` : ''}
          </div>
          ${item.deliveryAddress ? `<div class="wjft-delivery-info"><label>発送先住所</label><span>${escapeHtml(item.deliveryAddress).replace(/\n/g, '<br>')}</span></div>` : ''}
          ${item.deliveryInstructions ? `<div class="wjft-delivery-instructions"><label>納品指示</label><span>${escapeHtml(item.deliveryInstructions).replace(/\n/g, '<br>')}</span></div>` : ''}
          ${renderProductLinks(item.siteUrl)}
        </div>
      </div>`;
  });
  productGrid.innerHTML = html;
  
  // Attach event listeners for work row interactions
  attachWorkRowListeners();
}

/**
 * Attach click listeners to work rows for highlighting and commenting
 */
function attachWorkRowListeners() {
  const workRows = document.querySelectorAll('.work-row');
  
  workRows.forEach(row => {
    const rowId = row.dataset.rowId;
    const fileName = decodeURIComponent(row.dataset.file);
    
    // Toggle highlight on click (anywhere except comment area)
    row.addEventListener('click', (e) => {
      // Skip if clicking on comment area or button
      if (e.target.closest('.work-row-comment') || e.target.closest('.work-comment-btn')) return;
      
      row.classList.toggle('highlighted');
      
      // Save highlight state
      const highlightKey = `wjft-highlight-${fileName}-${rowId}`;
      if (row.classList.contains('highlighted')) {
        localStorage.setItem(highlightKey, 'true');
      } else {
        localStorage.removeItem(highlightKey);
      }
    });
    
    // Add comment button to work name cell
    const workNameCell = row.querySelector('.work-name');
    const commentDiv = workNameCell.querySelector('.work-row-comment');
    
    // Create comment button
    const commentBtn = document.createElement('button');
    commentBtn.className = 'work-comment-btn';
    commentBtn.textContent = 'コメント';
    commentBtn.title = 'この作業にコメントを追加';
    
    commentBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent row click
      const commentKey = `wjft-comment-${fileName}-${rowId}`;
      const currentComment = localStorage.getItem(commentKey) || '';
      
      const newComment = prompt('コメントを入力してください:', currentComment);
      if (newComment !== null) {
        if (newComment.trim()) {
          localStorage.setItem(commentKey, newComment.trim());
          commentDiv.textContent = newComment.trim();
          commentDiv.style.display = 'block';
        } else {
          localStorage.removeItem(commentKey);
          commentDiv.textContent = '';
          commentDiv.style.display = 'none';
        }
      }
    });
    
    workNameCell.insertBefore(commentBtn, commentDiv);
    
    // Restore highlight state
    const highlightKey = `wjft-highlight-${fileName}-${rowId}`;
    if (localStorage.getItem(highlightKey)) {
      row.classList.add('highlighted');
    }
    
    // Restore comment
    const commentKey = `wjft-comment-${fileName}-${rowId}`;
    const savedComment = localStorage.getItem(commentKey);
    if (savedComment) {
      commentDiv.textContent = savedComment;
      commentDiv.style.display = 'block';
    }
  });
}

/**
 * FT商品カードに対応するWJFT作業サマリーを表示する
 * @param {Object} ftItem - FT商品アイテム
 * @param {Object|null} wjftResult - { fileName, data } のWJFTデータ
 * @returns {string} HTML文字列
 */
function renderWorkSummaryForFtItem(ftItem, wjftResult) {
  if (!wjftResult || !wjftResult.data) return '';
  
  const wjftItems = wjftResult.data.items || [];
  const linkedWork = findLinkedWorkItem(ftItem, wjftItems);
  if (!linkedWork) return '';
  
  const workItems = linkedWork.workItems || [];
  if (workItems.length === 0) return '';
  
  let workListHtml = workItems.map(w => {
    if (w.amount > 0) {
      return `<span class="work-tag has-cost">${escapeHtml(w.name)} (${w.qty}個 × ¥${formatNumber(w.unitPrice)} = ¥${formatNumber(w.amount)})</span>`;
    }
    return `<span class="work-tag no-cost">${escapeHtml(w.name)} (${w.qty}個)</span>`;
  }).join('');
  
  return `
    <div class="wjft-work-summary">
      <div class="work-summary-header">
        <span class="work-summary-title">作業内容</span>
        <span class="work-summary-total">合計: ¥${formatNumber(linkedWork.workTotalAmount)}</span>
      </div>
      <div class="work-tags">${workListHtml}</div>
    </div>`;
}

// Highlight identical thumbnails across the summary table on hover/focus
function attachSummaryThumbnailHover() {
  const thumbnails = Array.from(document.querySelectorAll('.thumbnail-img'));
  if (thumbnails.length === 0) return;

  const syncHighlight = (key, shouldHighlight) => {
    if (!key) return;
    thumbnails.forEach(img => {
      if (img.dataset.highlightKey === key) {
        img.classList.toggle('highlighted', shouldHighlight);
      }
    });
  };

  thumbnails.forEach(thumbnail => {
    const key = thumbnail.dataset.highlightKey;
    if (!key) return; // skip thumbnails without product key (URL + unit price)
    thumbnail.addEventListener('mouseenter', () => syncHighlight(key, true));
    thumbnail.addEventListener('mouseleave', () => syncHighlight(key, false));
    thumbnail.addEventListener('focus', () => syncHighlight(key, true));
    thumbnail.addEventListener('blur', () => syncHighlight(key, false));
  });
}
