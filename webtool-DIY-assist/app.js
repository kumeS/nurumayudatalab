/**
 * app.js - DIYアシスタント メインアプリケーション
 * 
 * アプリケーションの初期化とモジュール統合
 */

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function() {
  try {
    console.log('DIYアシスタント開始...');
    
    // アプリケーションインスタンス作成
    const app = new DIYAssistant();
    
    // グローバルアクセス用（デバッグ目的）
    window.diyAssistant = app;
    
    console.log('DIYアシスタント初期化完了');
    
  } catch (error) {
    console.error('アプリケーション初期化エラー:', error);
    
    // エラーメッセージを表示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.display = 'block';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.zIndex = '1000';
    errorDiv.textContent = `アプリケーションの初期化に失敗しました: ${error.message}`;
    
    document.body.appendChild(errorDiv);
  }
});

// モジュール読み込み確認
window.addEventListener('load', function() {
  console.log('ES6モジュールとして正常に読み込まれました');
  console.log('DIYAssistantクラス:', DIYAssistant);
}); 