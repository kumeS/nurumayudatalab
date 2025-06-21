/**
 * ログイン管理システム JavaScript
 * AI料理提案システム用認証機能
 */

// ログイン管理クラス
class AuthManager {
  constructor() {
    this.credentials = {
      username: 'nurumayu',
      password: 'mokumoku'
    };
    this.sessionDuration = 30 * 60 * 1000; // 30分（ミリ秒）
    this.sessionTimer = null;
  }

  // ログイン処理
  login(username, password) {
    if (username === this.credentials.username && password === this.credentials.password) {
      const loginTime = Date.now();
      const sessionData = {
        username: username,
        loginTime: loginTime,
        expiresAt: loginTime + this.sessionDuration
      };
      
      localStorage.setItem('aiCookingSession', JSON.stringify(sessionData));
      this.startSessionTimer();
      return true;
    }
    return false;
  }

  // ログアウト処理
  logout() {
    localStorage.removeItem('aiCookingSession');
    this.clearSessionTimer();
    this.showLogin();
  }

  // セッション確認
  checkSession() {
    const sessionData = JSON.parse(localStorage.getItem('aiCookingSession'));
    if (!sessionData) {
      return false;
    }

    const now = Date.now();
    if (now > sessionData.expiresAt) {
      this.logout();
      return false;
    }

    // セッション延長
    sessionData.expiresAt = now + this.sessionDuration;
    localStorage.setItem('aiCookingSession', JSON.stringify(sessionData));
    this.startSessionTimer();
    return sessionData;
  }

  // セッション自動タイムアウト設定
  startSessionTimer() {
    this.clearSessionTimer();
    this.sessionTimer = setTimeout(() => {
      alert('セッションがタイムアウトしました。再度ログインしてください。');
      this.logout();
    }, this.sessionDuration);
  }

  // タイマークリア
  clearSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  // ログイン画面表示
  showLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('sessionInfo').style.display = 'none';
  }

  // メインアプリ表示
  showMainApp(sessionData) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('sessionInfo').style.display = 'block';
    document.getElementById('sessionUser').textContent = `ようこそ、${sessionData.username}さん`;
  }
}

// グローバルな認証マネージャー
const authManager = new AuthManager();

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('ログインシステム初期化中...');
  
  // 最初にログイン状態をチェック
  const sessionData = authManager.checkSession();
  if (sessionData) {
    console.log('既存セッション発見:', sessionData.username);
    authManager.showMainApp(sessionData);
    initializeMainApp();
  } else {
    console.log('ログインが必要です');
    authManager.showLogin();
  }

  // ログインフォーム処理
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('ログイン試行中...');
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (authManager.login(username, password)) {
      console.log('ログイン成功:', username);
      loginError.style.display = 'none';
      const sessionData = authManager.checkSession();
      authManager.showMainApp(sessionData);
      initializeMainApp();
      
      // フォームをリセット
      loginForm.reset();
    } else {
      console.log('ログイン失敗: 認証情報が正しくありません');
      loginError.style.display = 'block';
      // パスワードフィールドをクリア
      document.getElementById('password').value = '';
    }
  });

  logoutBtn.addEventListener('click', () => {
    if (confirm('ログアウトしますか？')) {
      console.log('ログアウト実行');
      authManager.logout();
    }
  });

  // ページのフォーカス時にセッションチェック
  window.addEventListener('focus', () => {
    const sessionData = authManager.checkSession();
    if (!sessionData) {
      console.log('セッション期限切れ - ログイン画面表示');
      authManager.showLogin();
    }
  });

  // ユーザーアクティビティによるセッション延長
  initializeActivityMonitoring();
});

// メインアプリケーションの初期化（ログイン後に実行される）
function initializeMainApp() {
  console.log('メインアプリケーション初期化');
  // ここに実際のアプリケーションの初期化コードを追加
  // 例: 料理提案システムの機能を有効化
}

// ユーザーアクティビティ監視の初期化
function initializeActivityMonitoring() {
  const activityEvents = ['click', 'keypress', 'scroll', 'mousemove'];
  let lastActivityTime = Date.now();
  
  activityEvents.forEach(eventType => {
    document.addEventListener(eventType, () => {
      const now = Date.now();
      // 5分間隔でセッションチェック・延長
      if (now - lastActivityTime > 5 * 60 * 1000) {
        const sessionData = authManager.checkSession();
        if (!sessionData) {
          console.log('アクティビティ中にセッション期限切れ検出');
          authManager.showLogin();
          return;
        }
        console.log('ユーザーアクティビティでセッション延長');
        lastActivityTime = now;
      }
    }, { passive: true });
  });
}

// デバッグ用: コンソールからログイン情報を確認
window.getLoginInfo = function() {
  console.log('=== ログイン情報 ===');
  console.log('ユーザー名:', authManager.credentials.username);
  console.log('パスワード:', authManager.credentials.password);
  console.log('セッション時間:', authManager.sessionDuration / 1000 / 60, '分');
  console.log('==================');
}; 