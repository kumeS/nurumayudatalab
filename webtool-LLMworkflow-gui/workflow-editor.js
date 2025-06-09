class WorkflowEditor {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.connectionsLayer = document.getElementById('connections');
    
    if (!this.canvas || !this.connectionsLayer) {
      throw new Error('必要なDOM要素が見つかりません');
    }

    // 各マネージャーを初期化
    this.viewportManager = new ViewportManager(this.canvas, this.connectionsLayer);
    this.nodeManager = new NodeManager(this.canvas, this.viewportManager);
    this.connectionManager = new ConnectionManager(this.connectionsLayer, this.nodeManager, this.viewportManager);
    this.propertiesManager = new PropertiesManager();
    this.workflowExecutor = new WorkflowExecutor();
    this.storageManager = new StorageManager();

    this.initializeManagers();
    
    // DOM要素の準備ができてからイベントとパレットを初期化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.completeInitialization();
      });
    } else {
      // すでにDOMが読み込まれている場合
      setTimeout(() => {
        this.completeInitialization();
      }, 50);
    }
  }

  completeInitialization() {
    console.log('初期化完了処理を開始');
    
    // DOM要素が準備できてからイベントリスナーを設定
    this.initEventListeners();
    this.initZoomControls();
    this.initPalette();
    
    // ワークフローを読み込み
    this.storageManager.loadWorkflow();
    
    // 接続線を強制更新
    setTimeout(() => {
      this.connectionManager.updateConnections();
      console.log('初期化完了');
    }, 200);
  }

  initializeManagers() {
    // マネージャー間の参照を設定
    this.propertiesManager.setNodeManager(this.nodeManager);
    this.storageManager.setManagers(
      this.nodeManager, 
      this.connectionManager, 
      this.viewportManager, 
      this.propertiesManager
    );

    // コールバックを設定
    this.nodeManager.setCallbacks({
      onNodeSelected: (nodeId) => {
        if (nodeId) {
          this.propertiesManager.showNodeProperties(nodeId);
        } else {
          this.propertiesManager.hideProperties();
        }
      },
      onNodeMoved: () => {
        this.connectionManager.updateConnections();
        this.storageManager.saveWorkflow();
      },
      onNodeDeleted: (nodeId) => {
        this.connectionManager.deleteConnectionsByNode(nodeId);
        this.propertiesManager.hideProperties();
        this.storageManager.saveWorkflow();
      },
      onPortClick: (nodeId, portType, e) => {
        this.connectionManager.startConnection(nodeId, portType, e);
      }
    });

    this.connectionManager.setCallbacks({
      onConnectionCreated: () => {
        this.storageManager.saveWorkflow();
      },
      onConnectionDeleted: () => {
        this.storageManager.saveWorkflow();
      }
    });

    this.propertiesManager.setCallbacks({
      onPropertiesChanged: () => {
        this.storageManager.saveWorkflow();
      }
    });

    this.storageManager.setCallbacks({
      onWorkflowSaved: (workflow) => {
        this.updateTitle(workflow.name);
      },
      onWorkflowLoaded: (workflow) => {
        this.updateTitle(workflow.name);
      },
      onWorkflowImported: (workflow) => {
        this.updateTitle(workflow.name);
      },
      onWorkflowCleared: () => {
        this.updateTitle('');
      }
    });

    // ビューポート変更時に接続線も更新
    this.viewportManager.onViewportChanged = () => {
      this.connectionManager.updateConnections();
    };
  }

  initEventListeners() {
    console.log('イベントリスナーを初期化中...');
    
    // 実行ボタン
    const executeButton = document.getElementById('executeBtn');
    if (executeButton) {
      console.log('executeBtn が見つかりました');
      executeButton.addEventListener('click', () => {
        console.log('executeBtn がクリックされました');
        this.executeWorkflow();
      });
    } else {
      console.error('executeBtn が見つかりません');
    }



    // エクスポートボタン
    const exportButton = document.getElementById('exportBtn');
    if (exportButton) {
      console.log('exportBtn が見つかりました');
      exportButton.addEventListener('click', () => {
        console.log('exportBtn がクリックされました');
        this.storageManager.exportWorkflow();
      });
    } else {
      console.error('exportBtn が見つかりません');
    }

    // インポートボタン
    const importButton = document.getElementById('importBtn');
    if (importButton) {
      importButton.addEventListener('click', () => {
        this.storageManager.importWorkflow();
      });
    } else {
      console.error('importBtn が見つかりません');
    }

    // クリアボタン
    const clearButton = document.getElementById('clearBtn');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.storageManager.clearWorkflow();
      });
    } else {
      console.error('clearBtn が見つかりません');
    }

    // ワークフロー名の変更
    const nameField = document.getElementById('workflowName');
    if (nameField) {
      nameField.addEventListener('input', () => {
        this.storageManager.saveWorkflow();
      });
    }

    // 説明フィールドの変更
    const descField = document.getElementById('workflowDescription');
    if (descField) {
      descField.addEventListener('input', () => {
        this.storageManager.saveWorkflow();
      });
    }

    // 空白クリックで選択解除
    this.canvas.addEventListener('click', (e) => {
      if (e.target === this.canvas || e.target.classList.contains('canvas-grid')) {
        this.nodeManager.selectNode(null);
      }
    });
  }

  initPalette() {
    // 元のapp.jsスタイルでパレットを初期化（セレクタを包括的に）
    const nodeTemplates = document.querySelectorAll('.node-template, [data-node-type]');
    console.log(`パレット初期化: ${nodeTemplates.length}個のテンプレートを発見`);
    
    if (nodeTemplates.length === 0) {
      console.error('パレットの要素が見つかりません');
      // HTMLで直接定義されているパレットを検索
      const paletteElements = document.querySelectorAll('[draggable="true"]');
      console.log(`draggable要素: ${paletteElements.length}個発見`);
      return;
    }
    
    nodeTemplates.forEach((template, index) => {
      const nodeType = template.getAttribute('data-node-type') || template.dataset.nodeType;
      if (!nodeType) {
        console.warn(`ノードタイプが見つかりません:`, template);
        return;
      }
      
      console.log(`パレット項目 ${index}: ${nodeType}`);
      
      // 既存のイベントリスナーを削除（重複防止）
      if (template._dragStartHandler) {
        template.removeEventListener('dragstart', template._dragStartHandler);
      }
      
      // 新しいイベントリスナーを追加
      const dragStartHandler = (e) => {
        console.log(`ドラッグ開始: ${nodeType}`, e);
        e.dataTransfer.setData('text/plain', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
        
        // ドラッグ画像をカスタマイズ
        const dragImage = template.cloneNode(true);
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.opacity = '0.8';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 50, 25);
        setTimeout(() => document.body.removeChild(dragImage), 0);
      };
      
      template._dragStartHandler = dragStartHandler;
      template.addEventListener('dragstart', dragStartHandler);
      
      // draggable属性を確実に設定
      template.draggable = true;
      template.style.cursor = 'grab';
      
      // ドラッグ中のスタイル
      template.addEventListener('dragend', () => {
        template.style.cursor = 'grab';
        console.log(`ドラッグ終了: ${nodeType}`);
      });
      
      // マウスダウンでもドラッグを試す（フォールバック）
      template.addEventListener('mousedown', (e) => {
        console.log(`マウスダウン: ${nodeType}`);
        // プライマリボタンの場合のみ
        if (e.button === 0) {
          template.style.cursor = 'grabbing';
        }
      });
      
      template.addEventListener('mouseup', () => {
        template.style.cursor = 'grab';
      });
    });
    
    console.log('パレット初期化完了');
  }

  initZoomControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('resetZoomBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        this.viewportManager.zoomIn();
      });
    } else {
      console.error('zoomInBtn が見つかりません');
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        this.viewportManager.zoomOut();
      });
    } else {
      console.error('zoomOutBtn が見つかりません');
    }

    if (zoomResetBtn) {
      zoomResetBtn.addEventListener('click', () => {
        this.viewportManager.resetZoom();
      });
    } else {
      console.error('resetZoomBtn が見つかりません');
    }
  }

  async executeWorkflow() {
    console.log('executeWorkflow が呼び出されました');
    
    try {
      // マネージャーの存在確認
      if (!this.workflowExecutor) {
        throw new Error('WorkflowExecutor が初期化されていません');
      }
      if (!this.nodeManager) {
        throw new Error('NodeManager が初期化されていません');
      }
      if (!this.connectionManager) {
        throw new Error('ConnectionManager が初期化されていません');
      }
      
      console.log('すべてのマネージャーが利用可能です');
      
      // 入力ダイアログを表示
      const inputData = await this.getInputData();
      console.log('入力データを取得:', inputData);
      
      // 実行中の表示
      const executeButton = document.getElementById('executeBtn');
      
      if (executeButton) {
        executeButton.textContent = '実行中...';
        executeButton.disabled = true;
      }

      // ワークフロー実行
      console.log('ワークフロー実行を開始');
      const result = await this.workflowExecutor.executeWorkflow(
        this.nodeManager, 
        this.connectionManager, 
        inputData
      );

      // 結果表示
      console.log('実行結果:', result);
      this.showExecutionResult(result);

    } catch (error) {
      console.error('実行エラー:', error);
      alert(`実行エラー: ${error.message}`);
    } finally {
      // ボタンを元に戻す
      const executeButton = document.getElementById('executeBtn');
      
      if (executeButton) {
        executeButton.textContent = '実行';
        executeButton.disabled = false;
      }
    }
  }

  async getInputData() {
    const inputNodes = this.nodeManager.getAllNodes().filter(node => node.type === 'input');
    
    if (inputNodes.length === 0) {
      return {};
    }

    const inputData = {};
    
    for (const inputNode of inputNodes) {
      const inputKey = inputNode.data.name || inputNode.id;
      const defaultValue = inputNode.data.defaultValue || '';
      
      const value = prompt(`${inputKey}の値を入力してください:`, defaultValue);
      if (value !== null) {
        inputData[inputKey] = value;
      }
    }
    
    return inputData;
  }

  showExecutionResult(result) {
    // 結果ダイアログの作成
    const dialog = document.createElement('div');
    dialog.className = 'execution-result-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>実行結果</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="dialog-body">
          ${result.success ? this.formatSuccessResult(result) : this.formatErrorResult(result)}
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
      z-index: 1000;
    `;

    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 80%;
      max-height: 80%;
      overflow: auto;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    // 閉じるボタンのイベント
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

    document.body.appendChild(dialog);
  }

  formatSuccessResult(result) {
    let html = '<div class="success-result">';
    html += '<h4 style="color: green;">✓ 実行成功</h4>';
    
    // 結果表示
    html += '<h5>結果:</h5>';
    html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">';
    for (const [key, value] of Object.entries(result.results)) {
      html += `<div><strong>${key}:</strong></div>`;
      html += `<pre style="margin: 5px 0 15px 0; white-space: pre-wrap;">${JSON.stringify(value, null, 2)}</pre>`;
    }
    html += '</div>';
    
    // ログ表示
    if (result.log && result.log.length > 0) {
      html += '<h5>実行ログ:</h5>';
      html += '<div style="background: #f0f0f0; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">';
      result.log.forEach(logEntry => {
        html += `<div style="font-family: monospace; font-size: 12px; margin: 2px 0;">${logEntry}</div>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  formatErrorResult(result) {
    let html = '<div class="error-result">';
    html += '<h4 style="color: red;">✗ 実行失敗</h4>';
    html += `<p><strong>エラー:</strong> ${result.error}</p>`;
    
    // ログ表示
    if (result.log && result.log.length > 0) {
      html += '<h5>実行ログ:</h5>';
      html += '<div style="background: #f0f0f0; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">';
      result.log.forEach(logEntry => {
        html += `<div style="font-family: monospace; font-size: 12px; margin: 2px 0;">${logEntry}</div>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  updateTitle(workflowName) {
    const title = workflowName || '無題のワークフロー';
    document.title = `${title} - LLMワークフローエディター`;
    
    const headerTitle = document.querySelector('.header h1');
    if (headerTitle) {
      headerTitle.textContent = `LLMワークフローエディター${workflowName ? ` - ${workflowName}` : ''}`;
    }
  }

  // 公開API
  getNodeManager() {
    return this.nodeManager;
  }

  getConnectionManager() {
    return this.connectionManager;
  }

  getViewportManager() {
    return this.viewportManager;
  }

  getPropertiesManager() {
    return this.propertiesManager;
  }

  getWorkflowExecutor() {
    return this.workflowExecutor;
  }

  getStorageManager() {
    return this.storageManager;
  }

  // デバッグ用
  debug() {
    return {
      nodes: this.nodeManager.getAllNodes(),
      connections: this.connectionManager.getAllConnections(),
      viewport: {
        panX: this.viewportManager.panX,
        panY: this.viewportManager.panY,
        scale: this.viewportManager.scale
      }
    };
  }
} 