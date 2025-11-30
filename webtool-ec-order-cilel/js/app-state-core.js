let allData = {};
let currentTab = 'all';
let fileOrder = [];
let draggingFile = null;
let productSortMode = 'default';
let summarySortMode = localStorage.getItem('CiLELViewerSummarySortMode') || 'default';
let mergeAllDuplicates = localStorage.getItem('CiLELViewerMergeAllDuplicates') === 'true';
// Remove global exchangeRate as we now calculate per-file

// LOCAL_CACHE_KEY is now in app-utils.js

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const tabs = document.getElementById('tabs');
const productSortModeSelect = document.getElementById('productSortMode');
const orderInfo = document.getElementById('orderInfo');
const stats = document.getElementById('stats');
const productGrid = document.getElementById('productGrid');
const SUMMARY_ROW_KEYWORDS = ['合計', '日本円', '参考', '商品あたり', '発送先住所', '納品指示'];
const STATUS_DETAILS = {
  '発送1': '中国倉庫から1便目の出荷が完了している状態です。国内倉庫への到着を待っています。',
  '次回発送': '次回便での出荷を予定しており、現在ピッキング／仕分け待ちの状態です。',
  '別途発送': '指定の別便や別住所で発送する予定のため、通常の出荷とは分けて保管されています。'
};
const statusPopup = document.getElementById('statusPopup');
// Note: handleActionClick and hideStatusPopup are defined in other files
// Event listeners will be attached after all scripts are loaded

// IndexedDB setup
const DB_NAME = 'CiLELViewer';
const DB_VERSION = 1;
const STORE_NAME = 'orderData';
let db = null;

// Initialize - moved to app-file-input.js to ensure all functions are loaded

// IndexedDB functions
function initDB() {
  if (!window.indexedDB) {
    console.warn('IndexedDB not supported');
    restoreFromLocalCache();
    return;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);
  
  request.onerror = () => {
    console.error('IndexedDB open error');
    restoreFromLocalCache();
  };
  
  request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexedDB opened successfully');
    loadDataFromDB();
  };
  
  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'fileName' });
      console.log('Object store created');
    }
  };
}

async function saveDataToDB(fileName, data) {
  if (!db) return;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put({ fileName, data, timestamp: Date.now() });
    
    request.onsuccess = () => {
      console.log(`Saved ${fileName} to IndexedDB`);
      resolve();
    };
    request.onerror = () => {
      console.error('Save error:', request.error);
      reject(request.error);
    };
  });
}

async function loadDataFromDB() {
  if (!db) { restoreFromLocalCache(); return; }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
      const records = request.result;
      console.log(`Loaded ${records.length} files from IndexedDB`);
      
      records.forEach(record => {
        allData[record.fileName] = record.data;
      });
      syncFileOrder();
      
      if (records.length > 0) {
        renderTabs();
        renderContent();
        persistLocalCache();
      } else {
        restoreFromLocalCache();
      }
      resolve();
    };
    request.onerror = () => {
      console.error('Load error:', request.error);
      reject(request.error);
    };
  });
}

async function deleteDataFromDB(fileName) {
  if (!db) return;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(fileName);
    
    request.onsuccess = () => {
      console.log(`Deleted ${fileName} from IndexedDB`);
      resolve();
    };
    request.onerror = () => {
      console.error('Delete error:', request.error);
      reject(request.error);
    };
  });
}

async function clearAllData() {
  if (!db) {
    allData = {};
    currentTab = 'all';
    fileOrder = [];
    renderTabs();
    renderContent();
    clearLocalCache();
    return;
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();
    
    request.onsuccess = () => {
      console.log('Cleared all data from IndexedDB');
      allData = {};
      currentTab = 'all';
      fileOrder = [];
      renderTabs();
      renderContent();
      clearLocalCache();
      resolve();
    };
    request.onerror = () => {
      console.error('Clear error:', request.error);
      reject(request.error);
    };
  });
}

// Prevent browser default file opening/download on drag&drop (global listeners)
// Only prevent default for events OUTSIDE the upload zone
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, preventDefaultDragBehavior, true);
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('dragover');
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
});
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('dragover');
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
});
dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragover');

  // Only process files, not other dragged content
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
// Tab drag&drop and product sort listeners are attached in app-state-extra.js and app-helpers.js

function handleFiles(files) {
  // Guard: Wait for DB initialization
  if (!db) {
    console.warn('DB not ready yet, waiting...');
    setTimeout(() => handleFiles(files), 100);
    return;
  }
  if (!files || files.length === 0) return;
  const normalizedFiles = Array.from(files);
  if (!document.body.classList.contains('files-loaded')) {
    document.body.classList.add('files-loaded');
    document.dispatchEvent(new CustomEvent('files-loaded'));
  }
  
  normalizedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      // Extract embedded images from xlsx
      const images = await extractImagesFromXlsx(data);
      
      await processData(file.name, json, images);
    };
    reader.readAsArrayBuffer(file);
  });
}

async function extractImagesFromXlsx(data) {
  const images = [];
  try {
    const JSZip = window.JSZip;
    if (!JSZip) {
      console.warn('JSZip not loaded');
      return images;
    }
    
    const zip = await JSZip.loadAsync(data);
    const drawingXml = await zip.file('xl/drawings/drawing1.xml')?.async('string');
    
    if (!drawingXml) {
      console.warn('No drawing1.xml found');
      return images;
    }
    
    // Parse drawing XML to find image positions
    const parser = new DOMParser();
    const doc = parser.parseFromString(drawingXml, 'text/xml');
    
    // Get relationship file to map embed IDs to image files
    const relsXml = await zip.file('xl/drawings/_rels/drawing1.xml.rels')?.async('string');
    if (!relsXml) {
      console.warn('No drawing1.xml.rels found');
      return images;
    }
    
    const relsDoc = parser.parseFromString(relsXml, 'text/xml');
    const relationships = {};
    relsDoc.querySelectorAll('Relationship').forEach(rel => {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) {
        relationships[id] = target.replace('../', 'xl/');
      }
    });
    
    // Find all anchors (both oneCellAnchor and twoCellAnchor)
    const anchors = doc.querySelectorAll('xdr\\:oneCellAnchor, oneCellAnchor, xdr\\:twoCellAnchor, twoCellAnchor');
    console.log(`Found ${anchors.length} image anchors`);
    
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      
      // Get row position from <xdr:from><xdr:row>
      const fromElement = anchor.querySelector('xdr\\:from, from');
      const rowElement = fromElement?.querySelector('xdr\\:row, row');
      const row = rowElement ? parseInt(rowElement.textContent) : null;
      
      // Get embed ID from <a:blip r:embed="rIdX">
      const blipElement = anchor.querySelector('a\\:blip, blip');
      const embedId = blipElement?.getAttribute('r:embed');
      
      if (row !== null && embedId && relationships[embedId]) {
        const imgPath = relationships[embedId];
        const imgFile = zip.file(imgPath);
        
        if (imgFile) {
          const imgBlob = await imgFile.async('blob');
          const imgUrl = await blobToDataUrl(imgBlob);
          images.push({ row, url: imgUrl });
          console.log(`Extracted image for row ${row}: ${imgPath}`);
        }
      }
    }
    
    console.log(`Total images extracted: ${images.length}`);
  } catch (err) {
    console.error('画像抽出エラー:', err);
  }
  return images;
}

function preventDefaultDragBehavior(event) {
  if (!event) return;

  // Allow normal drag&drop handling within upload zone
  if (event.target.closest && event.target.closest('.upload-zone')) {
    // Don't interfere with upload zone's own handlers
    return;
  }

  // Only prevent default OUTSIDE upload zone to stop unwanted downloads
  event.preventDefault();
  event.stopPropagation();

  // Set dropEffect to 'none' outside upload zone to prevent any drop action
  if (event.dataTransfer && event.type !== 'dragleave') {
    event.dataTransfer.dropEffect = 'none';
    event.dataTransfer.effectAllowed = 'none';
  }
}

function ensurePersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return;
  navigator.storage.persisted()
    .then(persisted => {
      if (!persisted) {
        return navigator.storage.persist();
      }
      return null;
    })
    .catch(err => console.warn('Storage persist request failed', err));
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (row && row.some(cell => String(cell).includes('サイトURL') || String(cell).includes('写真'))) {
      return i;
    }
  }
  return 11;
}

function extractOrderInfo(rows) {
  const info = {};
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const rowStr = row.join(' ');
    if (rowStr.includes('注文日')) { const m = rowStr.match(/注文日\s*(\d{4}\/\d{1,2}\/\d{1,2})/); if (m) info.orderDate = m[1]; }
    if (rowStr.includes('注文NO') || rowStr.includes('注文No')) { const m = rowStr.match(/注文N[Oo]\s*([A-Z0-9\-]+)/); if (m) info.orderNo = m[1]; }
    if (rowStr.includes('支払合計')) { const m = rowStr.match(/[¥￥]([\d,]+)/); if (m) info.totalPayment = m[1]; }
    if (rowStr.includes('出荷予定日')) { const m = rowStr.match(/出荷予定日\s*(\d{4}\/\d{1,2}\/\d{1,2})/); if (m) info.shippingDate = m[1]; }
  }
  
  // Extract cost breakdown (商品代合計、代行手数料、etc.)
  const costBreakdown = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Check if this row contains cost breakdown headers
    const rowStr = row.join(' ');
    if (rowStr.includes('商品代合計') && rowStr.includes('代行手数料')) {
      // Found the header row, get values from the next row
      const headerRow = row;
      const valueRow = rows[i + 1];
      
      if (valueRow) {
        headerRow.forEach((header, idx) => {
          const h = String(header).trim();
          const value = valueRow[idx];
          
          if (h.includes('商品代合計') && h.includes('A')) {
            costBreakdown.productTotal = value;
          } else if (h.includes('代行手数料') && h.includes('B')) {
            costBreakdown.agencyFee = value;
          } else if (h.includes('中国内送料') && h.includes('C')) {
            costBreakdown.domesticShipping = value;
          } else if (h.includes('国際送料') && h.includes('D')) {
            costBreakdown.internationalShipping = value;
          } else if (h.includes('検品作業費')) {
            costBreakdown.inspectionFee = value;
          } else if (h.includes('物流加工費')) {
            costBreakdown.logisticsFee = value;
          }
        });
        
        console.log('Cost breakdown found:', costBreakdown);
      }
      break; // Found it, no need to continue
    }
  }
  
  if (Object.keys(costBreakdown).length > 0) {
    info.costBreakdown = costBreakdown;
  }
  
  // Extract shipping information (発送1, 発送2, etc.)
  const shippingInfo = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Look for shipping patterns like "発送1", "発送2"
    const firstCell = String(row[0] || '').trim();
    if (firstCell.match(/^発送\d+$/)) {
      const shipData = {
        label: firstCell,
        method: row[1] || '',
        trackingNo: row[2] || '',
        weight: row[3] || '',
        unit: row[4] || '',
        amount: row[5] || '',
        currency: row[6] || ''
      };
      
      // Clean up data
      if (shipData.method || shipData.trackingNo) {
        shippingInfo.push(shipData);
      }
    }
  }
  
  if (shippingInfo.length > 0) {
    info.shippingInfo = shippingInfo;
  }
  
  return info;
}
