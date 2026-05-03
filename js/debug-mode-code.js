/**
 * DIYアシスタント - Debug Mode 機能
 * 
 * デバッグモード、ログシステム、データ管理機能を含む
 * 
 * 使用方法:
 * - Ctrl+Shift+D: デバッグモード切り替え
 * - Ctrl+Shift+L: ログエクスポート
 * - Ctrl+Shift+C: 全データクリア
 */

// ========== ログシステム ==========
function initializeLogging() {
  this.logHistory = [];
  this.maxLogHistory = 1000;
  
  // デバッグモードでのみコンソールに出力
  this.log = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      stage: this.currentStage || 'general'
    };
    
    // ログ履歴に追加
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxLogHistory) {
      this.logHistory.shift();
    }
    
    // コンソール出力（デバッグモードまたはエラーレベル）
    if (this.debugMode || level === 'error') {
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${logEntry.stage}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, data || '');
          break;
        case 'warn':
          console.warn(prefix, message, data || '');
          break;
        case 'info':
          console.log(prefix, message, data || '');
          break;
        case 'debug':
          if (this.debugMode) {
            console.debug(prefix, message, data || '');
          }
          break;
      }
    }
    
    // エラーの場合はLocalStorageにも保存（トラブルシューティング用）
    if (level === 'error') {
      this.saveErrorLog(logEntry);
    }
  };
}

function saveErrorLog(logEntry) {
  try {
    const errorLogs = JSON.parse(localStorage.getItem('diy_error_logs') || '[]');
    errorLogs.push(logEntry);
    // 最新50件のエラーのみ保持
    if (errorLogs.length > 50) {
      errorLogs.splice(0, errorLogs.length - 50);
    }
    localStorage.setItem('diy_error_logs', JSON.stringify(errorLogs));
  } catch (e) {
    console.error('エラーログ保存失敗:', e);
  }
}

function exportLogs() {
  const logs = {
    generated: new Date().toISOString(),
    debugMode: this.debugMode,
    sessionInfo: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    },
    logs: this.logHistory,
    errorLogs: JSON.parse(localStorage.getItem('diy_error_logs') || '[]')
  };
  
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diy-assistant-logs-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  this.log('info', 'ログファイルをエクスポートしました');
}

// ========== デバッグ機能 ==========
function toggleDebugMode() {
  this.debugMode = !this.debugMode;
  localStorage.setItem('diy_debug_mode', this.debugMode.toString());
  
  this.log('info', 'デバッグモード切り替え', { debugMode: this.debugMode });
  
  // デバッグモード表示の更新
  this.updateDebugModeDisplay();
  
  this.showSuccess(`デバッグモード: ${this.debugMode ? 'ON' : 'OFF'}`);
}

function updateDebugModeDisplay() {
  // デバッグ情報パネルの表示/非表示
  let debugPanel = document.getElementById('debugPanel');
  if (!debugPanel && this.debugMode) {
    debugPanel = this.createDebugPanel();
    document.body.appendChild(debugPanel);
  } else if (debugPanel && !this.debugMode) {
    debugPanel.remove();
  }
}

function createDebugPanel() {
  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
    max-height: 200px;
    overflow-y: auto;
  `;
  
  panel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">🐛 Debug Mode</div>
    <div>Stage: <span id="debugCurrentStage">${this.currentStage || 'none'}</span></div>
    <div>Logs: <span id="debugLogCount">${this.logHistory.length}</span></div>
    <div style="margin-top: 5px;">
      <button onclick="window.diyAssistant.exportLogs()" style="font-size: 10px; margin-right: 5px;">Export Logs</button>
      <button onclick="window.diyAssistant.clearAllData()" style="font-size: 10px;">Clear Data</button>
    </div>
  `;
  
  return panel;
}

function updateDebugPanel() {
  if (this.debugMode) {
    const debugCurrentStage = document.getElementById('debugCurrentStage');
    const debugLogCount = document.getElementById('debugLogCount');
    
    if (debugCurrentStage) {
      debugCurrentStage.textContent = this.currentStage || 'none';
    }
    if (debugLogCount) {
      debugLogCount.textContent = this.logHistory.length;
    }
  }
}

function clearAllData() {
  if (confirm('全てのデータ（プロジェクト、セッション、ログ）をクリアしますか？')) {
    localStorage.clear();
    this.logHistory = [];
    this.log('info', '全データクリア実行');
    this.showSuccess('全データがクリアされました。ページを再読み込みしてください。');
    setTimeout(() => window.location.reload(), 1000);
  }
}

// ========== キーボードショートカット設定 ==========
function setupDebugKeyboardShortcuts() {
  // デバッグ用キーボードショートカット
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+D でデバッグモード切り替え
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      this.toggleDebugMode();
    }
    // Ctrl+Shift+L でログエクスポート
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      this.exportLogs();
    }
    // Ctrl+Shift+C でLocalStorageクリア
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      this.clearAllData();
    }
  });
}

// ========== デバッグモード初期化 ==========
function initializeDebugMode() {
  // デバッグモード設定（URLパラメータまたはローカルストレージから）
  this.debugMode = localStorage.getItem('diy_debug_mode') === 'true' || 
                   new URLSearchParams(window.location.search).get('debug') === 'true';
  
  // ログシステム初期化
  this.initializeLogging();
  
  // キーボードショートカット設定
  this.setupDebugKeyboardShortcuts();
  
  // デバッグモード表示の初期化
  this.updateDebugModeDisplay();
  
  this.log('info', 'デバッグモード初期化完了', { debugMode: this.debugMode });
}

// ========== HTML内でのデバッグパネル表示用CSS ==========
const debugPanelCSS = `
  .project-highlighted {
    background-color: #e3f2fd !important;
    border: 2px solid #2196f3 !important;
    transition: all 0.3s ease;
  }
  
  #debugPanel {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  #debugPanel button {
    background: #333;
    color: white;
    border: 1px solid #555;
    padding: 2px 5px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
  }
  
  #debugPanel button:hover {
    background: #555;
  }
`;

// ========== 使用例 ==========
/*
// DIYAssistantクラスのコンストラクタ内で呼び出す
constructor() {
  // 他の初期化処理...
  
  // デバッグモード初期化
  this.initializeDebugMode();
  
  // 他の処理...
}

// ログの使用例
this.log('info', '処理開始', { param1: 'value1' });
this.log('warn', '警告メッセージ');
this.log('error', 'エラーが発生', { error: error.message });
this.log('debug', 'デバッグ情報', { data: someData });

// デバッグパネルの更新（ステージ変更時など）
this.currentStage = 'processing';
this.updateDebugPanel();
*/ 