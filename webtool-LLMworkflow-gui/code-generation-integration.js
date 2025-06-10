/**
 * workflow-editor.js に追加するコード生成機能
 * 
 * このコードを workflow-editor.js の initEventListeners() メソッド内に追加してください
 */

// === 1. workflow-editor.js の constructor に以下を追加 ===
// this.codeGenerator = new CodeGenerator();

// === 2. initEventListeners() メソッドに以下を追加 ===

// JSコード生成ボタン
const generateJSButton = document.getElementById('generateJSBtn');
if (generateJSButton) {
  generateJSButton.addEventListener('click', () => {
    this.generateJavaScriptCode();
  });
} else {
  console.error('generateJSBtn が見つかりません');
}

// APIサーバーコード生成ボタン
const generateAPIButton = document.getElementById('generateAPIBtn');
if (generateAPIButton) {
  generateAPIButton.addEventListener('click', () => {
    this.generateAPIServerCode();
  });
} else {
  console.error('generateAPIBtn が見つかりません');
}

// === 3. WorkflowEditor クラスに以下のメソッドを追加 ===

/**
 * JavaScriptコードを生成してダウンロード
 */
generateJavaScriptCode() {
  try {
    const nodes = this.nodeManager.getAllNodes();
    const connections = this.connectionManager.getAllConnections();
    
    if (nodes.length === 0) {
      alert('ワークフローが空です。ノードを追加してください。');
      return;
    }
    
    // コード生成
    const code = this.codeGenerator.generateCode(nodes, connections);
    
    // コードプレビューダイアログを表示
    this.showCodePreviewDialog(code, 'JavaScript', 'workflow.js');
    
  } catch (error) {
    console.error('コード生成エラー:', error);
    alert(`コード生成に失敗しました: ${error.message}`);
  }
}

/**
 * APIサーバーコードを生成してダウンロード
 */
generateAPIServerCode() {
  try {
    const nodes = this.nodeManager.getAllNodes();
    const connections = this.connectionManager.getAllConnections();
    
    if (nodes.length === 0) {
      alert('ワークフローが空です。ノードを追加してください。');
      return;
    }
    
    // APIサーバーコード生成
    const code = this.codeGenerator.generateAPIServerCode(nodes, connections);
    
    // コードプレビューダイアログを表示
    this.showCodePreviewDialog(code, 'Express.js API Server', 'server.js');
    
  } catch (error) {
    console.error('APIコード生成エラー:', error);
    alert(`APIコード生成に失敗しました: ${error.message}`);
  }
}

/**
 * コードプレビューダイアログを表示
 */
showCodePreviewDialog(code, title, filename) {
  // ダイアログ作成
  const dialog = document.createElement('div');
  dialog.className = 'code-preview-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <div class="dialog-header">
        <h3><i class="fas fa-code"></i> ${title}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="code-actions">
          <button class="button secondary" id="copyCodeBtn">
            <i class="fas fa-copy"></i> コピー
          </button>
          <button class="button" id="downloadCodeBtn">
            <i class="fas fa-download"></i> ダウンロード
          </button>
          <span class="code-info">
            ${code.split('\n').length}行 | ${(new Blob([code]).size / 1024).toFixed(1)}KB
          </span>
        </div>
        <div class="code-preview-wrapper">
          <pre class="code-preview"><code>${this.escapeHtml(code)}</code></pre>
        </div>
      </div>
    </div>
  `;

  // スタイル追加
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `;

  const content = dialog.querySelector('.dialog-content');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 1000px;
    height: 90%;
    max-height: 800px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  `;

  const header = dialog.querySelector('.dialog-header');
  header.style.cssText = `
    padding: 20px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const closeBtn = dialog.querySelector('.close-btn');
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.3s;
  `;

  const body = dialog.querySelector('.dialog-body');
  body.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 20px;
  `;

  const codeActions = dialog.querySelector('.code-actions');
  codeActions.style.cssText = `
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    align-items: center;
  `;

  const codeInfo = dialog.querySelector('.code-info');
  codeInfo.style.cssText = `
    margin-left: auto;
    color: #666;
    font-size: 14px;
  `;

  const previewWrapper = dialog.querySelector('.code-preview-wrapper');
  previewWrapper.style.cssText = `
    flex: 1;
    overflow: auto;
    background: #f5f5f5;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  `;

  const codePreview = dialog.querySelector('.code-preview');
  codePreview.style.cssText = `
    margin: 0;
    padding: 20px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #333;
    white-space: pre;
    overflow-x: auto;
  `;

  // シンタックスハイライト（簡易版）
  let highlightedCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '<span style="color: #008000;">$&</span>') // コメント
    .replace(/\/\/.*/g, '<span style="color: #008000;">$&</span>') // 単行コメント
    .replace(/\b(const|let|var|function|async|await|return|if|else|try|catch|throw|new|class|extends|import|export|from|require)\b/g, 
      '<span style="color: #0000ff;">$1</span>') // キーワード
    .replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, '<span style="color: #a31515;">$&</span>') // 文字列
    .replace(/\b\d+\b/g, '<span style="color: #098658;">$&</span>'); // 数値

  dialog.querySelector('code').innerHTML = highlightedCode;

  // イベントハンドラ
  const copyBtn = dialog.querySelector('#copyCodeBtn');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー完了';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> コピー';
      }, 2000);
    } catch (error) {
      console.error('コピーエラー:', error);
      alert('クリップボードへのコピーに失敗しました');
    }
  });

  const downloadBtn = dialog.querySelector('#downloadCodeBtn');
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // 閉じるボタン
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });

  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });

  // ESCキーで閉じる
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(dialog);
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  document.body.appendChild(dialog);
}

/**
 * HTMLエスケープ
 */
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === 4. index.html の <head> セクションに以下のスタイルを追加 ===
/*
.code-preview-dialog .button {
  font-size: 14px;
  padding: 8px 16px;
}

.code-preview-dialog h3 {
  margin: 0;
  font-size: 20px;
}

.code-preview-dialog .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.code-preview-wrapper::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.code-preview-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 5px;
}

.code-preview-wrapper::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.code-preview-wrapper::-webkit-scrollbar-thumb:hover {
  background: #555;
}
*/

// === 5. index.html の header-controls に以下のボタンを追加 ===
/*
<div class="toolbar" style="margin-left: 10px;">
  <button class="button" id="generateJSBtn" title="JavaScriptコードを生成">
    <i class="fas fa-code"></i> JSコード
  </button>
  <button class="button" id="generateAPIBtn" title="APIサーバーコードを生成">
    <i class="fas fa-server"></i> API生成
  </button>
</div>
*/

// === 6. index.html の JavaScript読み込み部分に以下を追加 ===
/*
<script src="code-generator.js"></script>
*/