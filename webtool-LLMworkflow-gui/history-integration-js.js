// workflow-editor.js に追加する履歴管理機能のコード

// 1. constructor内に追加
constructor() {
    // ... 既存のコード ...
    
    // 履歴マネージャーを初期化
    this.historyManager = new WorkflowHistory();
    this.isHistoryPanelOpen = false;
    
    // ... 残りのコード ...
}

// 2. initializeManagers() メソッドに追加（コールバック設定部分）
initializeManagers() {
    // ... 既存のコード ...
    
    // 履歴マネージャーのコールバック設定
    this.historyManager.onHistoryChanged = () => {
      this.updateHistoryUI();
    };

    // 既存のコールバックに履歴保存を追加
    const originalNodeCallbacks = this.nodeManager.setCallbacks.bind(this.nodeManager);
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
        this.saveToHistory('ノードを移動');
        this.storageManager.saveWorkflow();
      },
      onNodeDeleted: (nodeId) => {
        this.connectionManager.deleteConnectionsByNode(nodeId);
        this.propertiesManager.hideProperties();
        this.saveToHistory('ノードを削除');
        this.storageManager.saveWorkflow();
      },
      onPortClick: (nodeId, portType, e) => {
        this.connectionManager.startConnection(nodeId, portType, e);
      }
    });

    this.connectionManager.setCallbacks({
      onConnectionCreated: () => {
        this.saveToHistory('接続を作成');
        this.storageManager.saveWorkflow();
      },
      onConnectionDeleted: () => {
        this.saveToHistory('接続を削除');
        this.storageManager.saveWorkflow();
      }
    });

    this.propertiesManager.setCallbacks({
      onPropertiesChanged: () => {
        this.saveToHistory('プロパティを変更');
        this.storageManager.saveWorkflow();
      }
    });
}

// 3. initEventListeners() メソッドに追加
initEventListeners() {
    // ... 既存のコード ...
    
    // Undo/Redoボタン
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }

    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }

    // 履歴パネルトグル
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => this.toggleHistoryPanel());
    }

    const historyToggle = document.getElementById('historyToggle');
    if (historyToggle) {
      historyToggle.addEventListener('click', () => this.toggleHistoryPanel());
    }

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.redo();
        }
      }
    });
}

// 4. 新しいメソッドを追加

/**
 * 現在の状態を履歴に保存
 */
saveToHistory(description = '') {
  // 復元中は保存しない
  if (this.historyManager.isRestoring) return;

  const state = {
    nodes: this.nodeManager.getAllNodes(),
    connections: this.connectionManager.getAllConnections(),
    viewport: {
      panX: this.viewportManager.panX,
      panY: this.viewportManager.panY,
      scale: this.viewportManager.scale
    }
  };

  this.historyManager.pushState(state, description);
}

/**
 * 元に戻す（Undo）
 */
undo() {
  const state = this.historyManager.undo();
  if (state) {
    this.restoreState(state);
    this.showNotification('操作を元に戻しました', 'info');
  }
}

/**
 * やり直し（Redo）
 */
redo() {
  const state = this.historyManager.redo();
  if (state) {
    this.restoreState(state);
    this.showNotification('操作をやり直しました', 'info');
  }
}

/**
 * 状態を復元
 */
restoreState(state) {
  // ノードをクリア
  this.nodeManager.clearAllNodes();
  this.connectionManager.clearAllConnections();

  // ビューポートを復元
  if (state.viewport) {
    this.viewportManager.panX = state.viewport.panX;
    this.viewportManager.panY = state.viewport.panY;
    this.viewportManager.scale = state.viewport.scale;
    this.viewportManager.updateCanvasTransform();
  }

  // ノードを復元
  this.nodeManager.restoreNodes(state.nodes);

  // 接続を復元
  setTimeout(() => {
    this.connectionManager.restoreConnections(state.connections);
    this.historyManager.finishRestoring();
  }, 100);
}

/**
 * 履歴パネルの表示/非表示を切り替え
 */
toggleHistoryPanel() {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  this.isHistoryPanelOpen = !this.isHistoryPanelOpen;
  
  if (this.isHistoryPanelOpen) {
    panel.classList.remove('collapsed');
    this.updateHistoryList();
  } else {
    panel.classList.add('collapsed');
  }
}

/**
 * 履歴UIを更新
 */
updateHistoryUI() {
  // Undo/Redoボタンの有効/無効を更新
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  
  if (undoBtn) {
    undoBtn.disabled = !this.historyManager.canUndo();
  }
  
  if (redoBtn) {
    redoBtn.disabled = !this.historyManager.canRedo();
  }

  // 履歴カウントを更新
  const historyCount = document.getElementById('historyCount');
  if (historyCount) {
    historyCount.textContent = this.historyManager.history.length;
  }

  // 履歴リストを更新（パネルが開いている場合のみ）
  if (this.isHistoryPanelOpen) {
    this.updateHistoryList();
  }
}

/**
 * 履歴リストを更新
 */
updateHistoryList() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  const history = this.historyManager.getHistory();
  
  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <i class="fas fa-history"></i>
        <p>履歴がありません</p>
      </div>
    `;
    return;
  }

  // 履歴エントリを新しい順に表示
  const entriesHTML = history.reverse().map((entry, index) => {
    const time = new Date(entry.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
    
    const nodeCount = entry.state.nodes?.length || 0;
    const connectionCount = entry.state.connections?.length || 0;
    
    return `
      <div class="history-entry ${entry.isCurrent ? 'current' : ''}" data-entry-id="${entry.id}">
        <div class="history-indicator"></div>
        <div class="history-entry-time">${timeStr}</div>
        <div class="history-entry-description">${entry.description}</div>
        <div class="history-entry-details">
          <div class="history-entry-detail">
            <i class="fas fa-circle-nodes"></i>
            <span>${nodeCount}</span>
          </div>
          <div class="history-entry-detail">
            <i class="fas fa-arrow-right"></i>
            <span>${connectionCount}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  historyList.innerHTML = entriesHTML;

  // クリックイベントを設定
  historyList.querySelectorAll('.history-entry').forEach(entry => {
    entry.addEventListener('click', () => {
      const entryId = entry.dataset.entryId;
      const state = this.historyManager.goToEntry(entryId);
      if (state) {
        this.restoreState(state);
        this.showNotification('履歴を復元しました', 'info');
      }
    });
  });
}

// 5. completeInitialization() メソッドに追加（最初の履歴を保存）
completeInitialization() {
    // ... 既存のコード ...
    
    // 初期状態を履歴に保存
    setTimeout(() => {
      this.saveToHistory('初期状態');
    }, 500);
}

// 6. ノード作成時に履歴を保存（createNode メソッドを修正）
// NodeManager の createNode メソッドをオーバーライド
initializeNodeCreation() {
  const originalCreateNode = this.nodeManager.createNode.bind(this.nodeManager);
  
  this.nodeManager.createNode = (type, x, y) => {
    const node = originalCreateNode(type, x, y);
    
    // 少し遅延させて他の初期化が完了するのを待つ
    setTimeout(() => {
      this.saveToHistory(`${type}ノードを追加`);
    }, 100);
    
    return node;
  };
}

// 7. clearWorkflow を修正して履歴もクリア
clearWorkflow() {
    if (!confirm('ワークフローをクリアしますか？')) return false;
    
    this.clearWorkflowSilent();
    this.historyManager.clear();
    this.saveToHistory('初期状態');
    return true;
}