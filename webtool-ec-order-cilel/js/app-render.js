function getDisplayData() {
  if (currentTab === 'all') {
    const merged = Object.values(allData).flatMap(d => d.items);
    const uniqueMap = new Map();
    merged.forEach(item => {
      const url = (item.siteUrl || '').trim();
      const unitPrice = String(item.unitPriceCny || '').trim();
      if (!url && !unitPrice) {
        const fallbackKey = JSON.stringify({
          variant: (item.variant || '').trim(),
          subtotal: (item.subtotal || '').toString().replace(/[^\d.]/g, '')
        });
        if (!uniqueMap.has(fallbackKey)) {
          uniqueMap.set(fallbackKey, { ...item, _files: [item._fileName] });
        } else {
          uniqueMap.get(fallbackKey)._files.push(item._fileName);
        }
        return;
      }
      const key = `${url}|${unitPrice}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { ...item, _files: [item._fileName] });
      } else {
        uniqueMap.get(key)._files.push(item._fileName);
      }
    });
    return Array.from(uniqueMap.values());
  }
  return allData[currentTab]?.items || [];
}

function renderContent() {
  // Handle summary tab separately
  if (currentTab === 'summary') {
    renderSummaryContent();
    return;
  }

  // Show product sort controls for non-summary tabs
  const tabControls = document.querySelector('.tab-controls');
  if (tabControls) {
    tabControls.style.display = '';
  }

  const data = getDisplayData();
  const displayData = sortProducts(data);
  const hasData = displayData.length > 0;
  document.body.classList.toggle('has-data', hasData);
  if (!hasData) {
    productGrid.innerHTML = '';
    stats.innerHTML = ''; orderInfo.innerHTML = ''; return;
  }

  // Get exchange rate for current tab
  let currentExchangeRate = null;
  if (currentTab !== 'all' && allData[currentTab]?.exchangeRate) {
    currentExchangeRate = allData[currentTab].exchangeRate;
  } else if (currentTab === 'all') {
    // Calculate average exchange rate from all files
    const rates = Object.values(allData)
      .map(d => d.exchangeRate)
      .filter(r => r !== null && r !== undefined);
    if (rates.length > 0) {
      currentExchangeRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
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
  
  stats.innerHTML = `
    <div class="stat-card"><h3>商品種類</h3><div class="value">${totalItems}</div></div>
    <div class="stat-card"><h3>総発注数</h3><div class="value">${totalShipQty}</div></div>
    <div class="stat-card"><h3>発注数量合計</h3><div class="value">${totalOrderQty}</div></div>
    <div class="stat-card"><h3>小計合計</h3><div class="value">¥${totalPrice.toLocaleString()}</div></div>
    <div class="stat-card"><h3>発送済み</h3><div class="value">${shippedCount}/${totalItems}</div></div>
    ${exchangeInfo}`;
  let html = '';
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
    
    html += `
      <div class="product-card">
        <div class="product-header">
          ${imageUrl ? 
            `<img class="product-image" src="${imageUrl}" alt="商品" onerror="this.outerHTML='<div class=\\'product-image error\\'>画像なし</div>'">` : 
            `<div class="product-image error">画像なし</div>`}
          <div class="product-main">
            <div class="product-variant">${escapeHtml(item.variant) || '詳細なし'}</div>
            <div class="product-price">¥${formatNumber(item.subtotal)}</div>
            <div class="product-price-detail">単価: ¥${formatNumber(item.unitPriceJpy)} × ${item.orderQty || '-'}個</div>
          </div>
        </div>
        <div class="product-details">
          <div class="detail-grid">
            <div class="detail-item"><label>発注数量</label><span>${item.orderQty || '-'}</span></div>
            <div class="detail-item"><label>出荷数量</label><span>${formatShipmentValue(item.shipQty)}</span></div>
            <div class="detail-item"><label>状態</label>${statusContent}</div>
            <div class="detail-item"><label>中国内送料</label><span>${formatDomesticShipping(item.domesticShip, fileExchangeRate)}</span></div>
            ${item.shopOrder ? `<div class="detail-item"><label>ショップ発注</label><span>${escapeHtml(item.shopOrder)}</span></div>` : ''}
            ${item.arrivalDate ? `<div class="detail-item"><label>到着予定日</label><span>${escapeHtml(item.arrivalDate)}</span></div>` : ''}
            ${item.inspectionPlan ? `<div class="detail-item"><label>検品ﾌﾟﾗﾝ</label><span>${escapeHtml(item.inspectionPlan)}</span></div>` : ''}
          </div>
          ${item.situation ? `<div class="situation-note">📝 ${escapeHtml(item.situation)}</div>` : ''}
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

// formatNumber is now in app-utils.js

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

  let fileData = fileNames.map(fileName => {
    const data = allData[fileName];
    const items = data.items || [];
    const orderMeta = data.orderMeta || {};

    // Collect all unique images from items
    const images = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const imageUrl = item._embeddedImage || extractImageUrl(item.photo) || extractImageUrl(item.siteUrl);
      if (imageUrl && !images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    }

    const fileTotal = {
      fileName,
      itemCount: items.length,
      orderQty: sumField(items, 'orderQty'),
      shipQty: sumField(items, 'shipQty'),
      subtotal: sumSubtotal(items),
      orderDate: orderMeta.orderDate || '-',
      images: images
    };

    totalItems += fileTotal.itemCount;
    totalOrderQty += fileTotal.orderQty;
    totalShipQty += fileTotal.shipQty;
    totalSubtotal += fileTotal.subtotal;

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
    <div class="stat-card"><h3>小計合計</h3><div class="value">¥${totalSubtotal.toLocaleString()}</div></div>`;

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
  html += '<thead><tr><th>ファイル名</th><th>商品画像</th><th>注文日</th><th>商品種類</th><th>発注数量</th><th>出荷数量</th><th>小計</th></tr></thead><tbody>';

  fileData.forEach(file => {
    // Render image thumbnails
    let imageThumbnails = '<div class="image-thumbnails">';
    if (file.images.length > 0) {
      file.images.forEach(imageUrl => {
        imageThumbnails += `<img src="${imageUrl}" alt="商品" class="thumbnail-img" onerror="this.style.display='none'">`;
      });
    } else {
      imageThumbnails += '<span class="no-images">画像なし</span>';
    }
    imageThumbnails += '</div>';

    html += `<tr>
      <td class="file-name">${escapeHtml(file.fileName)}</td>
      <td class="images">${imageThumbnails}</td>
      <td class="order-date">${escapeHtml(file.orderDate)}</td>
      <td class="number">${file.itemCount}</td>
      <td class="number">${file.orderQty}</td>
      <td class="number">${file.shipQty}</td>
      <td class="price">¥${file.subtotal.toLocaleString()}</td>
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
}
