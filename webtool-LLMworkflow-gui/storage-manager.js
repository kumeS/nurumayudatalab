class StorageManager {
  constructor() {
    this.autoSaveEnabled = true;
    this.autoSaveInterval = 30000; // 30秒
    this.autoSaveTimer = null;
    
    this.initEventListeners();
    this.startAutoSave();
  }

  initEventListeners() {
    // エクスポートボタン
    const exportButton = document.getElementById('exportWorkflow');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        this.exportWorkflow();
      });
    }

    // インポートボタン（現在は workflow-editor.js で処理される）
    // ここではイベントリスナーを設定しない

    // ページ離脱時の保存
    window.addEventListener('beforeunload', () => {
      this.saveWorkflow(true); // 強制保存
    });

    // 定期的な自動保存
    window.addEventListener('focus', () => {
      this.startAutoSave();
    });

    window.addEventListener('blur', () => {
      this.saveWorkflow();
    });
  }

  saveWorkflow(force = false) {
    if (!this.nodeManager || !this.connectionManager) {
      console.warn('NodeManager または ConnectionManager が設定されていません');
      return;
    }

    try {
      const workflowName = document.getElementById('workflowName')?.value || '無題のワークフロー';
      
      const workflow = {
        name: workflowName,
        description: document.getElementById('workflowDescription')?.value || '',
        version: '1.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        nodes: this.nodeManager.getAllNodes(),
        connections: this.connectionManager.getAllConnections(),
        viewport: this.viewportManager ? {
          panX: this.viewportManager.panX,
          panY: this.viewportManager.panY,
          scale: this.viewportManager.scale
        } : {}
      };

      localStorage.setItem('currentWorkflow', JSON.stringify(workflow));
      
      if (force) {
        console.log('ワークフローを強制保存しました');
      } else {
        console.log('ワークフローを自動保存しました');
      }
      
      if (this.onWorkflowSaved) {
        this.onWorkflowSaved(workflow);
      }
      
      return workflow;
    } catch (error) {
      console.error('ワークフローの保存に失敗:', error);
      return null;
    }
  }

  loadWorkflow() {
    try {
      const saved = localStorage.getItem('currentWorkflow');
      if (!saved) {
        console.log('保存されたワークフローが見つかりません');
        return null;
      }

      const workflow = JSON.parse(saved);
      console.log('保存されたワークフローを検出:', workflow.name || '無題');
      
      // 自動的にワークフローを復元（確認ダイアログなし）
      console.log('ワークフローを自動復元しています...');
      this.loadWorkflowData(workflow);
      
      if (this.onWorkflowLoaded) {
        this.onWorkflowLoaded(workflow);
      }
      
      return workflow;
    } catch (error) {
      console.error('ワークフローの読み込みに失敗:', error);
      return null;
    }
  }

  loadWorkflowData(workflow) {
    if (!this.nodeManager || !this.connectionManager) {
      console.error('NodeManager または ConnectionManager が設定されていません');
      return;
    }

    // フォームの更新
    if (workflow.name) {
      const nameField = document.getElementById('workflowName');
      if (nameField) nameField.value = workflow.name;
    }
    
    if (workflow.description) {
      const descField = document.getElementById('workflowDescription');
      if (descField) descField.value = workflow.description;
    }

    // ビューポート設定を先に復元
    if (workflow.viewport && this.viewportManager) {
      this.viewportManager.panX = workflow.viewport.panX || 0;
      this.viewportManager.panY = workflow.viewport.panY || 0;
      this.viewportManager.scale = workflow.viewport.scale || 1;
      
      // 遅延してtransformを適用
      setTimeout(() => {
        this.viewportManager.updateCanvasTransform();
      }, 200);
    }

    // ノードを復元
    if (workflow.nodes) {
      this.nodeManager.restoreNodes(workflow.nodes);
    }

    // 接続を復元
    if (workflow.connections) {
      this.connectionManager.restoreConnections(workflow.connections);
    }
  }

  exportWorkflow() {
    const workflow = this.saveWorkflow(true);
    if (!workflow) {
      alert('エクスポートするワークフローがありません');
      return;
    }

    try {
      const dataStr = JSON.stringify(workflow, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflow.name || 'workflow'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('ワークフローをエクスポートしました:', workflow.name);
      
      if (this.onWorkflowExported) {
        this.onWorkflowExported(workflow);
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
  }

  importWorkflow() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target.result);
          
          if (!this.validateWorkflowFormat(workflow)) {
            alert('無効なワークフローファイルです');
            return;
          }
          
          if (confirm('現在のワークフローを置き換えますか？')) {
            this.clearWorkflow();
            this.loadWorkflowData(workflow);
            
            console.log('ワークフローをインポートしました:', workflow.name);
            
            if (this.onWorkflowImported) {
              this.onWorkflowImported(workflow);
            }
          }
        } catch (error) {
          console.error('インポートエラー:', error);
          alert('ファイルの読み込みに失敗しました');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  validateWorkflowFormat(workflow) {
    if (!workflow || typeof workflow !== 'object') return false;
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) return false;
    if (!workflow.connections || !Array.isArray(workflow.connections)) return false;
    
    // ノードの基本構造チェック
    for (const node of workflow.nodes) {
      if (!node.id || !node.type || !node.data) return false;
      if (typeof node.x !== 'number' || typeof node.y !== 'number') return false;
    }
    
    // 接続の基本構造チェック
    for (const connection of workflow.connections) {
      if (!connection.id || !connection.from || !connection.to) return false;
    }
    
    return true;
  }

  clearWorkflow() {
    // テスト環境では確認なしでクリア
    if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.navigator.webdriver)) {
      console.log('テスト環境: 確認なしでワークフローをクリアします');
      this.clearWorkflowSilent();
      return true;
    }
    
    // 通常環境では確認ダイアログを表示
    try {
      const confirmed = confirm('ワークフローをクリアしますか？');
      if (!confirmed) {
        console.log('ワークフロークリアをキャンセルしました');
        return false;
      }
      
      this.clearWorkflowSilent();
      return true;
    } catch (error) {
      console.error('ダイアログエラー:', error);
      // エラーが発生した場合はそのままクリア
      this.clearWorkflowSilent();
      return true;
    }
  }

  clearWorkflowSilent() {
    // マネージャーのクリア
    if (this.nodeManager) {
      this.nodeManager.clearAllNodes();
    }
    
    if (this.connectionManager) {
      this.connectionManager.clearAllConnections();
    }
    
    if (this.propertiesManager) {
      this.propertiesManager.hideProperties();
    }
    
    // フォームのクリア
    const nameField = document.getElementById('workflowName');
    if (nameField) nameField.value = '';
    
    const descField = document.getElementById('workflowDescription');
    if (descField) descField.value = '';
    
    // ローカルストレージのクリア
    localStorage.removeItem('currentWorkflow');
    
    console.log('ワークフローをクリアしました');
    
    if (this.onWorkflowCleared) {
      this.onWorkflowCleared();
    }
  }

  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    if (this.autoSaveEnabled) {
      this.autoSaveTimer = setInterval(() => {
        this.saveWorkflow();
      }, this.autoSaveInterval);
    }
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  setAutoSaveEnabled(enabled) {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  setAutoSaveInterval(interval) {
    this.autoSaveInterval = Math.max(5000, interval); // 最小5秒
    if (this.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  // ワークフロー履歴管理
  saveToHistory(workflow) {
    try {
      const history = this.getWorkflowHistory();
      
      // 最新のワークフローを追加
      history.unshift({
        ...workflow,
        savedAt: new Date().toISOString()
      });
      
      // 最大10個まで保持
      const limitedHistory = history.slice(0, 10);
      
      localStorage.setItem('workflowHistory', JSON.stringify(limitedHistory));
      return true;
    } catch (error) {
      console.error('履歴保存エラー:', error);
      return false;
    }
  }

  getWorkflowHistory() {
    try {
      const history = localStorage.getItem('workflowHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('履歴読み込みエラー:', error);
      return [];
    }
  }

  loadFromHistory(index) {
    const history = this.getWorkflowHistory();
    if (index >= 0 && index < history.length) {
      const workflow = history[index];
      this.loadWorkflowData(workflow);
      return workflow;
    }
    return null;
  }

  // 設定管理
  setManagers(nodeManager, connectionManager, viewportManager, propertiesManager) {
    this.nodeManager = nodeManager;
    this.connectionManager = connectionManager;
    this.viewportManager = viewportManager;
    this.propertiesManager = propertiesManager;
  }

  setCallbacks(callbacks) {
    this.onWorkflowSaved = callbacks.onWorkflowSaved;
    this.onWorkflowLoaded = callbacks.onWorkflowLoaded;
    this.onWorkflowExported = callbacks.onWorkflowExported;
    this.onWorkflowImported = callbacks.onWorkflowImported;
    this.onWorkflowCleared = callbacks.onWorkflowCleared;
  }
} 