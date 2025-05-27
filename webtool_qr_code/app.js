/**
 * QRコード参加管理システム JavaScript
 * 一時的な参加者管理とQRコード生成機能
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const mainTabs = document.querySelectorAll('.main-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // 設定関連要素
  const fieldCheckboxes = document.querySelectorAll('.field-option input[type="checkbox"]');
  const customFieldInputs = document.querySelectorAll('.custom-field-input');
  
  // QR生成関連要素
  const generateQRBtn = document.getElementById('generateQR');
  const qrDisplay = document.getElementById('qrDisplay');
  const qrCanvas = document.getElementById('qrcode');
  const openQRBtn = document.getElementById('openQR');
  const copyQRUrlBtn = document.getElementById('copyQRUrl');
  
  // 参加者一覧関連要素
  const totalAttendeesEl = document.getElementById('totalAttendees');
  const todayAttendeesEl = document.getElementById('todayAttendees');
  const lastHourAttendeesEl = document.getElementById('lastHourAttendees');
  const searchInput = document.getElementById('searchAttendees');
  const attendeeList = document.getElementById('attendeeList');
  
  // データ管理関連要素
  const clearAllDataBtn = document.getElementById('clearAllData');
  const confirmModal = document.getElementById('confirmModal');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  const cancelDeleteBtn = document.getElementById('cancelDelete');
  
  // アプリケーション状態
  let currentConfig = {
    fields: {
      name: true,
      organization: false,
      contact: false,
      custom1: false,
      custom2: false,
      custom3: false
    },
    customFieldNames: {
      custom1: '',
      custom2: '',
      custom3: ''
    }
  };
  
  let attendeesData = [];
  let currentQRUrl = '';
  
  // 初期化
  init();
  
  function init() {
    setupTabNavigation();
    loadSavedData();
    setupEventListeners();
    updateAttendeeStats();
    renderAttendeeList();
  }
  
  // タブナビゲーション設定
  function setupTabNavigation() {
    mainTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // アクティブタブの切り替え
        mainTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // タブコンテンツの切り替え
        tabPanes.forEach(pane => {
          pane.classList.remove('active');
          if (pane.id === targetTab) {
            pane.classList.add('active');
          }
        });
        
        // 参加者一覧タブが開かれた時は統計とリストを更新
        if (targetTab === 'attendees') {
          updateAttendeeStats();
          renderAttendeeList();
        }
      });
    });
  }
  
  // イベントリスナー設定
  function setupEventListeners() {
    // 設定フィールドの変更
    fieldCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', handleFieldConfigChange);
    });
    
    // カスタムフィールド名の変更
    customFieldInputs.forEach(input => {
      input.addEventListener('input', handleCustomFieldNameChange);
    });
    
    // QR生成
    generateQRBtn.addEventListener('click', generateQRCode);
    
    // QR関連アクション
    openQRBtn.addEventListener('click', openQRPage);
    copyQRUrlBtn.addEventListener('click', copyQRUrl);
    
    // 検索
    searchInput.addEventListener('input', handleSearch);
    
    // データクリア
    clearAllDataBtn.addEventListener('click', showClearConfirmation);
    confirmDeleteBtn.addEventListener('click', clearAllData);
    cancelDeleteBtn.addEventListener('click', hideClearConfirmation);
    
    // モーダル外クリックで閉じる
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        hideClearConfirmation();
      }
    });
  }
  
  // フィールド設定変更ハンドラ
  function handleFieldConfigChange(e) {
    const fieldId = e.target.id.replace('field-', '');
    currentConfig.fields[fieldId] = e.target.checked;
    
    // カスタムフィールドのチェックボックスが外れた場合、名前もクリア
    if (!e.target.checked && fieldId.startsWith('custom')) {
      const nameInput = document.getElementById(`${fieldId}-name`);
      if (nameInput) {
        nameInput.value = '';
        currentConfig.customFieldNames[fieldId] = '';
      }
    }
    
    saveConfiguration();
  }
  
  // カスタムフィールド名変更ハンドラ
  function handleCustomFieldNameChange(e) {
    const fieldId = e.target.id.replace('-name', '');
    currentConfig.customFieldNames[fieldId] = e.target.value;
    saveConfiguration();
  }
  
  // QRコード生成
  function generateQRCode() {
    try {
      // 設定の検証
      if (!validateConfiguration()) {
        alert('カスタムフィールドを有効にした場合は、項目名を入力してください。');
        return;
      }
      
      // QRコードに含めるURL（参加者入力ページ）
      const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
      const inputUrl = baseUrl + 'input.html';
      currentQRUrl = inputUrl;
      
      // QRコード生成
      QRCode.toCanvas(qrCanvas, inputUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          console.error('QRコード生成エラー:', error);
          alert('QRコードの生成に失敗しました。');
        } else {
          qrDisplay.style.display = 'block';
          
          // 生成成功のフィードバック
          generateQRBtn.style.background = 'linear-gradient(135deg, #4CAF50, #81c784)';
          generateQRBtn.innerHTML = '<i class="fas fa-check"></i> QRコード生成完了';
          
          setTimeout(() => {
            generateQRBtn.style.background = '';
            generateQRBtn.innerHTML = '<i class="fas fa-magic"></i> QRコードを生成';
          }, 2000);
        }
      });
      
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      alert('QRコードの生成に失敗しました。');
    }
  }
  
  // 設定の検証
  function validateConfiguration() {
    // カスタムフィールドがチェックされているが名前が空の場合はエラー
    for (let i = 1; i <= 3; i++) {
      const fieldKey = `custom${i}`;
      if (currentConfig.fields[fieldKey] && !currentConfig.customFieldNames[fieldKey].trim()) {
        return false;
      }
    }
    return true;
  }
  
  // QRページを開く
  function openQRPage() {
    if (currentQRUrl) {
      window.open('qr.html', '_blank');
    }
  }
  
  // QR URLをコピー
  function copyQRUrl() {
    if (currentQRUrl) {
      navigator.clipboard.writeText(currentQRUrl).then(() => {
        copyQRUrlBtn.style.background = '#4CAF50';
        copyQRUrlBtn.innerHTML = '<i class="fas fa-check"></i> コピー完了';
        
        setTimeout(() => {
          copyQRUrlBtn.style.background = '';
          copyQRUrlBtn.innerHTML = '<i class="fas fa-copy"></i> URLをコピー';
        }, 2000);
      }).catch(err => {
        console.error('コピーエラー:', err);
        alert('URLのコピーに失敗しました。');
      });
    }
  }
  
  // 参加者検索
  function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    renderAttendeeList(searchTerm);
  }
  
  // 参加者統計更新
  function updateAttendeeStats() {
    const total = attendeesData.length;
    const today = getTodayAttendeesCount();
    const lastHour = getLastHourAttendeesCount();
    
    totalAttendeesEl.textContent = total;
    todayAttendeesEl.textContent = today;
    lastHourAttendeesEl.textContent = lastHour;
  }
  
  // 本日の参加者数を取得
  function getTodayAttendeesCount() {
    const today = new Date().toDateString();
    return attendeesData.filter(attendee => 
      new Date(attendee.timestamp).toDateString() === today
    ).length;
  }
  
  // 直近1時間の参加者数を取得
  function getLastHourAttendeesCount() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return attendeesData.filter(attendee => 
      new Date(attendee.timestamp) > oneHourAgo
    ).length;
  }
  
  // 参加者一覧表示
  function renderAttendeeList(searchTerm = '') {
    const filteredAttendees = attendeesData.filter(attendee => 
      attendee.name.toLowerCase().includes(searchTerm)
    );
    
    if (filteredAttendees.length === 0) {
      attendeeList.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #666;">
          ${searchTerm ? '該当する参加者が見つかりません' : '参加者がまだいません'}
        </div>
      `;
      return;
    }
    
    attendeeList.innerHTML = filteredAttendees.map(attendee => `
      <div class="attendee-item">
        <div class="attendee-info">
          <div class="attendee-name">${escapeHtml(attendee.name)}</div>
          <div class="attendee-details">
            ${attendee.organization ? escapeHtml(attendee.organization) + ' | ' : ''}
            ${attendee.contact ? escapeHtml(attendee.contact) + ' | ' : ''}
            ${Object.keys(attendee.customFields || {}).map(key => 
              attendee.customFields[key] ? escapeHtml(attendee.customFields[key]) : ''
            ).filter(Boolean).join(' | ')}
          </div>
        </div>
        <div class="attendee-time">
          ${formatTimestamp(attendee.timestamp)}
        </div>
      </div>
    `).join('');
  }
  
  // HTMLエスケープ
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // タイムスタンプフォーマット
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
    
    if (date.toDateString() === today) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) + ' 受付';
    } else if (date.toDateString() === yesterday) {
      return '昨日 ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) + ' ' +
             date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
  }
  
  // データクリア確認表示
  function showClearConfirmation() {
    confirmModal.style.display = 'block';
  }
  
  // データクリア確認非表示
  function hideClearConfirmation() {
    confirmModal.style.display = 'none';
  }
  
  // 全データクリア
  function clearAllData() {
    attendeesData = [];
    localStorage.removeItem('qr_attendees');
    localStorage.removeItem('qr_config');
    
    // UI更新
    updateAttendeeStats();
    renderAttendeeList();
    hideClearConfirmation();
    
    // 成功メッセージ
    clearAllDataBtn.style.background = '#4CAF50';
    clearAllDataBtn.innerHTML = '<i class="fas fa-check"></i> データを削除しました';
    
    setTimeout(() => {
      clearAllDataBtn.style.background = '';
      clearAllDataBtn.innerHTML = '<i class="fas fa-trash-alt"></i> 全データを削除';
    }, 3000);
  }
  
  // 設定保存
  function saveConfiguration() {
    localStorage.setItem('qr_config', JSON.stringify(currentConfig));
  }
  
  // 保存されたデータ読み込み
  function loadSavedData() {
    // 設定読み込み
    const savedConfig = localStorage.getItem('qr_config');
    if (savedConfig) {
      currentConfig = JSON.parse(savedConfig);
      
      // UI反映
      Object.keys(currentConfig.fields).forEach(fieldKey => {
        const checkbox = document.getElementById(`field-${fieldKey}`);
        if (checkbox) {
          checkbox.checked = currentConfig.fields[fieldKey];
        }
      });
      
      Object.keys(currentConfig.customFieldNames).forEach(fieldKey => {
        const input = document.getElementById(`${fieldKey}-name`);
        if (input) {
          input.value = currentConfig.customFieldNames[fieldKey];
        }
      });
    }
    
    // 参加者データ読み込み
    const savedAttendees = localStorage.getItem('qr_attendees');
    if (savedAttendees) {
      attendeesData = JSON.parse(savedAttendees);
    }
  }
  
  // 参加者データ保存
  function saveAttendeesData() {
    localStorage.setItem('qr_attendees', JSON.stringify(attendeesData));
  }
  
  // 新しい参加者を追加（input.htmlから呼び出される）
  window.addNewAttendee = function(attendeeData) {
    const newAttendee = {
      ...attendeeData,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    attendeesData.unshift(newAttendee); // 最新を先頭に
    saveAttendeesData();
    updateAttendeeStats();
    renderAttendeeList();
  };
  
  // 設定取得（input.htmlから呼び出される）
  window.getCurrentConfig = function() {
    return currentConfig;
  };
  
  // 定期的なデータ更新（他のタブで追加された参加者を反映）
  setInterval(() => {
    const savedAttendees = localStorage.getItem('qr_attendees');
    if (savedAttendees) {
      const newData = JSON.parse(savedAttendees);
      if (JSON.stringify(newData) !== JSON.stringify(attendeesData)) {
        attendeesData = newData;
        updateAttendeeStats();
        renderAttendeeList();
      }
    }
  }, 2000);
}); 