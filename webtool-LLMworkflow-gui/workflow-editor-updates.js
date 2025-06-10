// workflow-editor.js に追加する更新内容

// 1. constructor内に追加（他のマネージャーの初期化後）
constructor() {
    // ... 既存のコード ...
    
    // コードジェネレーターを初期化
    this.codeGenerator = new CodeGenerator();
    
    // ... 残りのコード ...
}

// 2. initEventListeners() メソッドの最後に追加
initEventListeners() {
    // ... 既存のイベントリスナー ...
    
    // JSコード生成ボタン
    const generateJSButton = document.getElementById('generateJSBtn');
    if (generateJSButton) {
      generateJSButton.addEventListener('click', () => {
        this.generateJavaScriptCode();
      });
    }

    // APIサーバーコード生成ボタン
    const generateAPIButton = document.getElementById('generateAPIBtn');
    if (generateAPIButton) {
      generateAPIButton.addEventListener('click', () => {
        this.generateAPIServerCode();
      });
    }

    // 実行パネルのボタン
    const executeWorkflowBtn = document.getElementById('executeWorkflowBtn');
    if (executeWorkflowBtn) {
      executeWorkflowBtn.addEventListener('click', () => {
        this.executeWorkflowFromPanel();
      });
    }
}

// 3. 新しいメソッドを追加（クラスの最後に追加）

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
    
    // ワークフロー名を取得
    const workflowName = document.getElementById('workflowName')?.value || 'workflow';
    const filename = `${workflowName.replace(/[^a-zA-Z0-9]/g, '_')}.js`;
    
    // コード生成
    const code = this.codeGenerator.generateCode(nodes, connections);
    
    // コードプレビューダイアログを表示
    this.showCodePreviewDialog(code, 'JavaScriptコード', filename);
    
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
    this.showCodePreviewDialog(code, 'Express.js APIサーバー', 'server.js');
    
  } catch (error) {
    console.error('APIコード生成エラー:', error);
    alert(`APIコード生成に失敗しました: ${error.message}`);
  }
}

/**
 * 実行パネルからワークフローを実行
 */
async executeWorkflowFromPanel() {
  try {
    const inputTextarea = document.getElementById('executionInput');
    const resultsDiv = document.getElementById('executionResults');
    const panelDiv = document.getElementById('executionPanel');
    
    // 入力データをパース
    let inputData = {};
    try {
      const inputText = inputTextarea.value.trim();
      if (inputText) {
        inputData = JSON.parse(inputText);
      }
    } catch (e) {
      alert('入力データが正しいJSON形式ではありません');
      return;
    }
    
    // 実行パネルを表示
    panelDiv.style.display = 'block';
    resultsDiv.innerHTML = '<div class="execution-log-entry info">ワークフローを実行中...</div>';
    
    // ワークフロー実行
    const result = await this.workflowExecutor.executeWorkflow(
      this.nodeManager,
      this.connectionManager,
      inputData
    );
    
    // 結果を表示
    this.displayExecutionResults(result, resultsDiv);
    
  } catch (error) {
    console.error('実行エラー:', error);
    const resultsDiv = document.getElementById('executionResults');
    resultsDiv.innerHTML = `<div class="execution-log-entry error">エラー: ${error.message}</div>`;
  }
}

/**
 * 実行結果を表示
 */
displayExecutionResults(result, resultsDiv) {
  let html = '';
  
  if (result.success) {
    html += '<div class="execution-log-entry success">✓ 実行成功</div>';
    
    // 結果を表示
    Object.entries(result.results).forEach(([key, value]) => {
      html += `<div class="execution-log-entry info"><strong>${key}:</strong></div>`;
      html += `<div style="margin-left: 20px; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 10px;">`;
      
      if (typeof value === 'object') {
        html += `<pre>${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        html += `<pre>${value}</pre>`;
      }
      
      html += '</div>';
    });
    
    // 実行ログを表示
    if (result.log && result.log.length > 0) {
      html += '<div class="execution-log-entry info" style="margin-top: 20px;"><strong>実行ログ:</strong></div>';
      result.log.forEach(logEntry => {
        html += `<div style="margin-left: 20px; font-family: monospace; font-size: 12px; color: #666;">${logEntry}</div>`;
      });
    }
  } else {
    html += `<div class="execution-log-entry error">✗ 実行失敗: ${result.error}</div>`;
    
    // エラーログを表示
    if (result.log && result.log.length > 0) {
      html += '<div style="margin-top: 10px;">';
      result.log.forEach(logEntry => {
        html += `<div style="margin-left: 20px; font-family: monospace; font-size: 12px; color: #666;">${logEntry}</div>`;
      });
      html += '</div>';
    }
  }
  
  resultsDiv.innerHTML = html;
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

  // スタイル設定
  const dialogStyles = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2000'
  };
  
  Object.assign(dialog.style, dialogStyles);

  const content = dialog.querySelector('.dialog-content');
  const contentStyles = {
    background: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '1000px',
    height: '90%',
    maxHeight: '800px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
  };
  
  Object.assign(content.style, contentStyles);

  // ヘッダースタイル
  const header = dialog.querySelector('.dialog-header');
  Object.assign(header.style, {
    padding: '20px',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    color: 'white',
    borderRadius: '12px 12px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  });

  // ボディスタイル
  const body = dialog.querySelector('.dialog-body');
  Object.assign(body.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '20px'
  });

  // コードプレビューエリア
  const previewWrapper = dialog.querySelector('.code-preview-wrapper');
  Object.assign(previewWrapper.style, {
    flex: '1',
    overflow: 'auto',
    background: '#f5f5f5',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  });

  const codePreview = dialog.querySelector('.code-preview');
  Object.assign(codePreview.style, {
    margin: '0',
    padding: '20px',
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#333',
    whiteSpace: 'pre',
    overflowX: 'auto'
  });

  // シンタックスハイライト（簡易版）
  this.applySyntaxHighlighting(dialog.querySelector('code'), code);

  // イベントハンドラ設定
  this.setupCodeDialogEvents(dialog, code, filename);

  document.body.appendChild(dialog);
}

/**
 * シンタックスハイライトを適用
 */
applySyntaxHighlighting(codeElement, code) {
  let highlightedCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '<span style="color: #008000;">$&</span>') // 複数行コメント
    .replace(/\/\/.*/g, '<span style="color: #008000;">$&</span>') // 単行コメント
    .replace(/\b(const|let|var|function|async|await|return|if|else|try|catch|throw|new|class|extends|import|export|from|require|module)\b/g, 
      '<span style="color: #0000ff;">$1</span>') // キーワード
    .replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, '<span style="color: #a31515;">$&</span>') // 文字列
    .replace(/\b\d+\b/g, '<span style="color: #098658;">$&</span>'); // 数値

  codeElement.innerHTML = highlightedCode;
}

/**
 * コードダイアログのイベントを設定
 */
setupCodeDialogEvents(dialog, code, filename) {
  // コピーボタン
  const copyBtn = dialog.querySelector('#copyCodeBtn');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code);
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー完了';
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
      }, 2000);
    } catch (error) {
      console.error('コピーエラー:', error);
      alert('クリップボードへのコピーに失敗しました');
    }
  });

  // ダウンロードボタン
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
  const closeBtn = dialog.querySelector('.close-btn');
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
    if (e.key === 'Escape' && document.body.contains(dialog)) {
      document.body.removeChild(dialog);
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

/**
 * HTMLエスケープ
 */
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}