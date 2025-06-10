/**
 * ワークフロー履歴管理システム
 * ワークフローの変更履歴を管理し、Undo/Redo機能を提供
 */
class WorkflowHistory {
  constructor(maxHistorySize = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistorySize = maxHistorySize;
    this.isRestoring = false;
    this.lastSaveTime = Date.now();
    this.autoSaveInterval = 5000; // 5秒
  }

  /**
   * 現在の状態を履歴に追加
   */
  pushState(state, description = '') {
    // 復元中は履歴に追加しない
    if (this.isRestoring) return;

    // 自動保存の間隔チェック（頻繁な保存を防ぐ）
    const now = Date.now();
    if (now - this.lastSaveTime < 1000 && !description) {
      return; // 1秒以内の変更は無視（明示的な説明がない場合）
    }
    this.lastSaveTime = now;

    // 現在位置より後の履歴を削除（新しい分岐を作成）
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 新しい状態を追加
    const historyEntry = {
      state: this.cloneState(state),
      timestamp: new Date().toISOString(),
      description: description || this.generateDescription(state),
      id: this.generateId()
    };

    this.history.push(historyEntry);
    this.currentIndex++;

    // 最大履歴数を超えた場合、古い履歴を削除
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    // 履歴変更を通知
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }
  }

  /**
   * 一つ前の状態に戻る（Undo）
   */
  undo() {
    if (!this.canUndo()) return null;

    this.currentIndex--;
    const entry = this.history[this.currentIndex];
    
    this.isRestoring = true;
    
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }

    return entry.state;
  }

  /**
   * 一つ後の状態に進む（Redo）
   */
  redo() {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    
    this.isRestoring = true;
    
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }

    return entry.state;
  }

  /**
   * 特定の履歴エントリに移動
   */
  goToEntry(entryId) {
    const index = this.history.findIndex(entry => entry.id === entryId);
    if (index === -1) return null;

    this.currentIndex = index;
    const entry = this.history[this.currentIndex];
    
    this.isRestoring = true;
    
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }

    return entry.state;
  }

  /**
   * Undoが可能か
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * Redoが可能か
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 復元完了を通知
   */
  finishRestoring() {
    this.isRestoring = false;
  }

  /**
   * 履歴をクリア
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }
  }

  /**
   * 現在の履歴リストを取得
   */
  getHistory() {
    return this.history.map((entry, index) => ({
      ...entry,
      isCurrent: index === this.currentIndex
    }));
  }

  /**
   * 現在の履歴エントリを取得
   */
  getCurrentEntry() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * 履歴の統計情報を取得
   */
  getStats() {
    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      oldestEntry: this.history[0]?.timestamp,
      newestEntry: this.history[this.history.length - 1]?.timestamp
    };
  }

  /**
   * 状態をディープクローン
   */
  cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * 履歴エントリの説明を生成
   */
  generateDescription(state) {
    const nodeCount = state.nodes?.length || 0;
    const connectionCount = state.connections?.length || 0;
    
    // 変更の種類を推測
    const currentEntry = this.getCurrentEntry();
    if (currentEntry) {
      const prevNodeCount = currentEntry.state.nodes?.length || 0;
      const prevConnectionCount = currentEntry.state.connections?.length || 0;
      
      if (nodeCount > prevNodeCount) {
        return `ノードを追加 (${nodeCount}個)`;
      } else if (nodeCount < prevNodeCount) {
        return `ノードを削除 (${nodeCount}個)`;
      } else if (connectionCount > prevConnectionCount) {
        return `接続を追加 (${connectionCount}個)`;
      } else if (connectionCount < prevConnectionCount) {
        return `接続を削除 (${connectionCount}個)`;
      } else {
        return 'プロパティを変更';
      }
    }
    
    return `初期状態 (ノード: ${nodeCount}, 接続: ${connectionCount})`;
  }

  /**
   * ユニークIDを生成
   */
  generateId() {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 履歴をエクスポート
   */
  exportHistory() {
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      history: this.history,
      currentIndex: this.currentIndex
    };
  }

  /**
   * 履歴をインポート
   */
  importHistory(data) {
    if (!data || data.version !== '1.0') {
      throw new Error('無効な履歴データです');
    }

    this.history = data.history || [];
    this.currentIndex = data.currentIndex || -1;
    
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }
  }

  /**
   * 差分を計算（将来の拡張用）
   */
  calculateDiff(state1, state2) {
    // シンプルな差分計算
    const diff = {
      nodes: {
        added: [],
        removed: [],
        modified: []
      },
      connections: {
        added: [],
        removed: []
      }
    };

    // ノードの差分
    const nodeMap1 = new Map(state1.nodes.map(n => [n.id, n]));
    const nodeMap2 = new Map(state2.nodes.map(n => [n.id, n]));

    // 追加されたノード
    for (const [id, node] of nodeMap2) {
      if (!nodeMap1.has(id)) {
        diff.nodes.added.push(node);
      } else {
        // プロパティが変更されたかチェック
        const oldNode = nodeMap1.get(id);
        if (JSON.stringify(oldNode) !== JSON.stringify(node)) {
          diff.nodes.modified.push({ old: oldNode, new: node });
        }
      }
    }

    // 削除されたノード
    for (const [id, node] of nodeMap1) {
      if (!nodeMap2.has(id)) {
        diff.nodes.removed.push(node);
      }
    }

    // 接続の差分
    const connSet1 = new Set(state1.connections.map(c => `${c.from}-${c.to}`));
    const connSet2 = new Set(state2.connections.map(c => `${c.from}-${c.to}`));

    // 追加された接続
    state2.connections.forEach(conn => {
      const key = `${conn.from}-${conn.to}`;
      if (!connSet1.has(key)) {
        diff.connections.added.push(conn);
      }
    });

    // 削除された接続
    state1.connections.forEach(conn => {
      const key = `${conn.from}-${conn.to}`;
      if (!connSet2.has(key)) {
        diff.connections.removed.push(conn);
      }
    });

    return diff;
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.WorkflowHistory = WorkflowHistory;
}