/**
 * LLMワークフローエディター アプリケーション初期化
 * 分割されたマネージャークラスを統合して動作させる
 */

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('LLMワークフローエディターを起動中...');
  
  try {
    // グローバルなワークフローエディターインスタンスを作成
    window.workflowEditor = new WorkflowEditor();
    
    console.log('LLMワークフローエディターが正常に起動しました');
    
    // デバッグ用のグローバル関数を追加
    window.debugWorkflow = () => {
      return window.workflowEditor.debug();
    };
    
    // パフォーマンス監視用
    window.getManagerStatus = () => {
      const editor = window.workflowEditor;
      try {
        return {
          nodes: editor.getNodeManager?.()?.getAllNodes?.()?.length || 0,
          connections: editor.getConnectionManager?.()?.getAllConnections?.()?.length || 0,
          viewport: {
            panX: editor.getViewportManager?.()?.panX || 0,
            panY: editor.getViewportManager?.()?.panY || 0,
            scale: editor.getViewportManager?.()?.scale || 1
          },
          executing: editor.getWorkflowExecutor?.()?.isExecuting || false
        };
      } catch (error) {
        console.error('マネージャー状態取得エラー:', error);
        return { error: error.message };
      }
    };
    
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    
    // エラーダイアログを表示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff6b6b;
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 500px;
      text-align: center;
      font-family: Arial, sans-serif;
    `;
    
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 15px 0;">アプリケーション起動エラー</h3>
      <p style="margin: 0 0 10px 0;">LLMワークフローエディターの初期化に失敗しました。</p>
      <p style="margin: 0 0 15px 0;"><strong>エラー:</strong> ${error.message}</p>
      <button onclick="location.reload()" style="
        background: white;
        color: #ff6b6b;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">ページを再読み込み</button>
    `;
    
    document.body.appendChild(errorDiv);
  }
});

// ページ離脱時の確認
window.addEventListener('beforeunload', (e) => {
  try {
    if (window.workflowEditor && 
        window.workflowEditor.getNodeManager?.()?.getAllNodes?.()?.length > 0) {
      e.preventDefault();
      e.returnValue = 'ワークフローが保存されていない可能性があります。ページを離れますか？';
      return e.returnValue;
    }
  } catch (error) {
    console.error('ページ離脱確認エラー:', error);
  }
});

// エラーハンドリング
window.addEventListener('error', (e) => {
  console.error('アプリケーションエラー:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('未処理のPromise拒否:', e.reason);
});

// 開発者向けのヘルパー関数
window.dev = {
  getEditor: () => window.workflowEditor,
  getNodes: () => window.workflowEditor?.getNodeManager?.()?.getAllNodes?.() || [],
  getConnections: () => window.workflowEditor?.getConnectionManager?.()?.getAllConnections?.() || [],
  exportData: () => window.workflowEditor?.getStorageManager?.()?.saveWorkflow?.(true),
  clearAll: () => window.workflowEditor?.getStorageManager?.()?.clearWorkflowSilent?.(),
  forceUpdateConnections: () => window.workflowEditor?.getConnectionManager?.()?.updateConnections?.()
};