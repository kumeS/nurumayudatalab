/**
 * app.js - DIYアシスタント メインアプリケーション（改善版）
 * 
 * 主な改善点：
 * - より堅牢な初期化処理
 * - エラーハンドリングの強化
 * - パフォーマンス最適化
 */

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function() {
  // Three.js読み込み完了を待つ
  if (typeof THREE !== 'undefined' && typeof THREE.OBJLoader !== 'undefined') {
    // すでに読み込み済み
    initializeApp();
  } else {
    // Three.js読み込み完了イベントを待つ
    window.addEventListener('threejs-ready', initializeApp);
    
    // 5秒後にタイムアウト
    setTimeout(() => {
      if (typeof THREE === 'undefined') {
        console.error('Three.js読み込みタイムアウト - フォールバック初期化を実行');
        initializeApp();
      }
    }, 5000);
  }
});

// グローバル変数
let app = null;

/**
 * アプリケーション初期化
 */
async function initializeApp() {
  try {
    console.log('DIYアシスタント初期化開始...');
    
    // ブラウザ互換性チェック
    if (!checkBrowserCompatibility()) {
      showBrowserCompatibilityWarning();
      return;
    }
    
    // Three.jsライブラリの準備を待つ
    await waitForThreeJS();
    
    // アプリケーションインスタンス作成
    app = new DIYAssistant();
    
    // グローバルアクセス用（デバッグ目的）
    window.diyAssistant = app;
    
    // 初期化成功メッセージ
    console.log('DIYアシスタント初期化完了');
    
    // パフォーマンス監視開始
    if (app.debugMode) {
      startPerformanceMonitoring();
    }
    
    // サービスワーカー登録（PWA対応準備）
    registerServiceWorker();
    
  } catch (error) {
    console.error('アプリケーション初期化エラー:', error);
    showInitializationError(error);
  }
}

/**
 * ブラウザ互換性チェック
 */
function checkBrowserCompatibility() {
  const requiredFeatures = [
    'WebGL',
    'LocalStorage',
    'Fetch API',
    'ES6'
  ];
  
  const checks = {
    'WebGL': () => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    },
    'LocalStorage': () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    },
    'Fetch API': () => 'fetch' in window,
    'ES6': () => {
      try {
        eval('const test = () => {}; class Test {}');
        return true;
      } catch (e) {
        return false;
      }
    }
  };
  
  const missingFeatures = [];
  
  for (const [feature, check] of Object.entries(checks)) {
    if (!check()) {
      missingFeatures.push(feature);
    }
  }
  
  if (missingFeatures.length > 0) {
    console.error('必要な機能が不足しています:', missingFeatures);
    return false;
  }
  
  return true;
}

/**
 * Three.jsライブラリの読み込みを待つ（改善版）
 */
async function waitForThreeJS() {
  const maxWaitTime = 20000; // 20秒に延長
  const checkInterval = 200; // 200msに調整
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkLibraries = () => {
      const threeLoaded = typeof THREE !== 'undefined';
      const objLoaderLoaded = threeLoaded && typeof THREE.OBJLoader !== 'undefined';
      const orbitControlsLoaded = threeLoaded && typeof THREE.OrbitControls !== 'undefined';
      
      console.log('Three.js library check:', {
        THREE: threeLoaded,
        OBJLoader: objLoaderLoaded,
        OrbitControls: orbitControlsLoaded,
        revision: threeLoaded ? THREE.REVISION : 'N/A'
      });
      
      if (threeLoaded && objLoaderLoaded && orbitControlsLoaded) {
        console.log('✅ All Three.js libraries loaded successfully');
        resolve();
      } else if (Date.now() - startTime > maxWaitTime) {
        const missingLibs = [];
        if (!threeLoaded) missingLibs.push('THREE');
        if (!objLoaderLoaded) missingLibs.push('OBJLoader');
        if (!orbitControlsLoaded) missingLibs.push('OrbitControls');
        
        reject(new Error(`Three.jsライブラリの読み込みタイムアウト (不足: ${missingLibs.join(', ')})`));
      } else {
        setTimeout(checkLibraries, checkInterval);
      }
    };
    
    checkLibraries();
  });
}

/**
 * ブラウザ互換性警告表示
 */
function showBrowserCompatibilityWarning() {
  const container = document.querySelector('.container');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem; background: #ffebee; border-radius: 8px; margin: 2rem auto; max-width: 600px;">
      <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 1rem; display: block;"></i>
      <h2 style="color: #d32f2f; margin-bottom: 1rem;">ブラウザ互換性エラー</h2>
      <p style="color: #666; margin-bottom: 2rem;">
        お使いのブラウザは、このアプリケーションに必要な機能をサポートしていません。
      </p>
      <div style="text-align: left; background: white; padding: 1rem; border-radius: 4px; margin-bottom: 2rem;">
        <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">推奨ブラウザ：</h3>
        <ul style="margin: 0; padding-left: 1.5rem;">
          <li>Google Chrome (最新版)</li>
          <li>Mozilla Firefox (最新版)</li>
          <li>Microsoft Edge (最新版)</li>
          <li>Safari (最新版)</li>
        </ul>
      </div>
      <button onclick="location.reload()" style="padding: 0.5rem 2rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
        再読み込み
      </button>
    </div>
  `;
}

/**
 * 初期化エラー表示
 */
function showInitializationError(error) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 600px;
    padding: 1rem 2rem;
    background: #ffebee;
    color: #c62828;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 1rem;
  `;
  
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-circle" style="font-size: 1.5rem;"></i>
    <div>
      <strong>アプリケーションの初期化に失敗しました</strong><br>
      <span style="font-size: 0.9rem; opacity: 0.9;">${error.message}</span><br>
      <button onclick="location.reload()" style="margin-top: 0.5rem; padding: 0.25rem 1rem; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
        ページを再読み込み
      </button>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
}

/**
 * パフォーマンス監視
 */
function startPerformanceMonitoring() {
  if (!window.performance || !window.performance.memory) {
    console.log('パフォーマンス監視は利用できません');
    return;
  }
  
  setInterval(() => {
    const memory = window.performance.memory;
    const used = Math.round(memory.usedJSHeapSize / 1048576);
    const total = Math.round(memory.totalJSHeapSize / 1048576);
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
    
    console.log(`メモリ使用状況: ${used}MB / ${total}MB (上限: ${limit}MB)`);
    
    // メモリ使用率が80%を超えた場合の警告
    if (used / limit > 0.8) {
      console.warn('メモリ使用率が高くなっています。不要なプロジェクトを削除することを推奨します。');
    }
  }, 30000); // 30秒ごと
}

/**
 * サービスワーカー登録（将来のPWA対応用）
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // 現在はサービスワーカーファイルが存在しないため、コメントアウト
    // navigator.serviceWorker.register('/sw.js')
    //   .then(registration => console.log('ServiceWorker登録成功:', registration.scope))
    //   .catch(error => console.log('ServiceWorker登録失敗:', error));
  }
}

/**
 * モジュール読み込み確認
 */
window.addEventListener('load', function() {
  console.log('=== モジュール読み込み状態 ===');
  console.log('DIYAssistant:', typeof DIYAssistant !== 'undefined' ? '✅' : '❌');
  console.log('SceneManager:', typeof SceneManager !== 'undefined' ? '✅' : '❌');
  console.log('AIManager:', typeof AIManager !== 'undefined' ? '✅' : '❌');
  console.log('ProcessingManager:', typeof ProcessingManager !== 'undefined' ? '✅' : '❌');
  console.log('Three.js:', typeof THREE !== 'undefined' ? '✅' : '❌');
  
  if (typeof THREE !== 'undefined') {
    console.log('Three.js version:', THREE.REVISION);
  }
});

/**
 * エラーハンドリング
 */
window.addEventListener('error', function(event) {
  console.error('グローバルエラー検出:', event.error);
  
  // 重大なエラーの場合はユーザーに通知
  if (event.error && event.error.message && 
      (event.error.message.includes('THREE') || 
       event.error.message.includes('undefined') ||
       event.error.message.includes('null'))) {
    
    if (app && app.showError) {
      app.showError('予期しないエラーが発生しました。ページを再読み込みしてください。', true);
    }
  }
});

/**
 * 未処理のPromiseエラーハンドリング
 */
window.addEventListener('unhandledrejection', function(event) {
  console.error('未処理のPromiseエラー:', event.reason);
  
  if (app && app.showError) {
    app.showError('非同期処理でエラーが発生しました。', false);
  }
});

/**
 * ページ離脱時の確認
 */
window.addEventListener('beforeunload', function(event) {
  // 未保存の作業がある場合の警告
  if (app && app.currentObjData && !app.projects.some(p => p.objData === app.currentObjData)) {
    event.preventDefault();
    event.returnValue = '作成した3Dモデルが保存されていません。本当にページを離れますか？';
    return event.returnValue;
  }
});

/**
 * オンライン/オフライン状態の監視
 */
window.addEventListener('online', function() {
  console.log('オンラインに復帰しました');
  if (app && app.showSuccess) {
    app.showSuccess('インターネット接続が復旧しました');
  }
});

window.addEventListener('offline', function() {
  console.log('オフラインになりました');
  if (app && app.showError) {
    app.showError('インターネット接続が失われました。一部の機能が制限される可能性があります。', true);
  }
});

/**
 * デバッグ用ユーティリティ関数
 */
window.DIYDebug = {
  // メモリ使用状況を取得
  getMemoryUsage() {
    if (!performance.memory) {
      return 'メモリ情報は利用できません';
    }
    
    const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
    const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
    const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
    
    return {
      used: `${used} MB`,
      total: `${total} MB`,
      limit: `${limit} MB`,
      percentage: `${((used / limit) * 100).toFixed(1)}%`
    };
  },
  
  // LocalStorageの使用状況を取得
  getStorageUsage() {
    let totalSize = 0;
    const items = {};
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = new Blob([localStorage[key]]).size;
        totalSize += size;
        items[key] = `${(size / 1024).toFixed(2)} KB`;
      }
    }
    
    return {
      total: `${(totalSize / 1024).toFixed(2)} KB`,
      items: items
    };
  },
  
  // アプリケーション状態をエクスポート
  exportAppState() {
    if (!app) {
      console.error('アプリケーションが初期化されていません');
      return;
    }
    
    const state = {
      timestamp: new Date().toISOString(),
      debugMode: app.debugMode,
      currentObjData: app.currentObjData ? app.currentObjData.length : 0,
      projectCount: app.projects.length,
      sceneInitialized: app.sceneManager.isInitialized,
      stage1Data: !!app.processingManager.stagePipeline?.context?.stage1Output,
      stage2Data: !!app.processingManager.stage2Data,
      memoryUsage: this.getMemoryUsage(),
      storageUsage: this.getStorageUsage()
    };
    
    console.log('アプリケーション状態:', state);
    return state;
  },
  
  // テストデータを生成
  generateTestOBJ() {
    return `# Test Cube
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8`;
  }
};

// アプリケーション情報
console.log(`
%cDIYアシスタント v1.0
%cAI活用3D家具設計ツール
%c開発: 2024

デバッグコマンド:
- DIYDebug.getMemoryUsage() : メモリ使用状況
- DIYDebug.getStorageUsage() : ストレージ使用状況  
- DIYDebug.exportAppState() : アプリケーション状態
- diyAssistant.toggleDebugMode() : デバッグモード切替
`, 
  'color: #2196f3; font-size: 20px; font-weight: bold;',
  'color: #666; font-size: 14px;',
  'color: #999; font-size: 12px;'
);

