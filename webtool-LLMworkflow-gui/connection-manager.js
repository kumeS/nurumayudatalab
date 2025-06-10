class ConnectionManager {
  constructor(connectionsLayer, nodeManager, viewportManager) {
    this.connectionsLayer = connectionsLayer;
    this.nodeManager = nodeManager;
    this.viewportManager = viewportManager;
    this.connections = [];
    this.currentConnection = null;
    this.tempLine = null;
    
    this.initEventListeners();
  }

  initEventListeners() {
    // マウス移動とマウスアップのイベントリスナー
    const handleMouseMove = (e) => {
      if (this.currentConnection && this.tempLine) {
        const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY);
        
        const path = this.createConnectionPath(
          this.currentConnection.startX, 
          this.currentConnection.startY, 
          worldPos.x, 
          worldPos.y
        );
        this.tempLine.setAttribute('d', path);
      }
    };

    const handleMouseUp = (e) => {
      if (this.currentConnection) {
        // 接続先のノードを検索
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetPort = targetElement?.closest('.port');
        const targetNode = targetElement?.closest('.workflow-node');
        
        if (targetPort && targetNode && targetPort.dataset.port === 'input') {
          const targetNodeId = targetNode.id;
          
          if (this.isValidConnection(this.currentConnection.fromNode, targetNodeId)) {
            this.createConnection(this.currentConnection.fromNode, targetNodeId);
          }
        }
        
        // 一時的な接続線を削除
        if (this.tempLine) {
          this.tempLine.remove();
          this.tempLine = null;
        }
        
        // ポートハイライトをクリア
        this.clearPortHighlights();
        
        this.currentConnection = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  startConnection(nodeId, portType, e) {
    // 出力ポートからのみ接続開始
    if (portType !== 'output') return;
    
    // 開始ポートをハイライト
    const startPortElement = e.target;
    startPortElement.classList.add('port-active');
    
    const node = this.nodeManager.getNode(nodeId);
    const nodePos = this.nodeManager.getNodePosition(nodeId);
    
    // ポートの正確な位置を計算（ビューポート変換を考慮）
    const nodeElement = document.getElementById(nodeId);
    const portElement = nodeElement.querySelector('.port.output');
    
    if (!portElement) {
      console.warn('出力ポートが見つかりません:', nodeId);
      return;
    }
    
    // ワールド座標での計算（ビューポート変換前の座標）
    const nodeWidth = 160;
    const nodeHeight = 90;
    const startX = node.x + nodeWidth - 12; // 出力ポートの位置
    const startY = node.y + nodeHeight / 2;
    
    this.currentConnection = {
      fromNode: nodeId,
      fromPort: portType,
      startX: startX,
      startY: startY,
      startPortElement: startPortElement
    };
    
    // 一時的な接続線を作成
    this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempLine.setAttribute('stroke', '#ff7e5f');
    this.tempLine.setAttribute('stroke-width', '3');
    this.tempLine.setAttribute('fill', 'none');
    this.tempLine.setAttribute('stroke-dasharray', '8,4');
    this.tempLine.setAttribute('opacity', '0.8');
    this.connectionsLayer.appendChild(this.tempLine);
    
    // 接続可能なポートをハイライト
    this.highlightCompatiblePorts(nodeId);
  }

  highlightCompatiblePorts(fromNodeId) {
    const allNodes = this.nodeManager.getAllNodes();
    
    allNodes.forEach(node => {
      if (node.id !== fromNodeId && node.type !== 'input') {
        const nodeElement = document.getElementById(node.id);
        const inputPort = nodeElement?.querySelector('.port.input');
        
        if (inputPort && this.isValidConnection(fromNodeId, node.id)) {
          inputPort.classList.add('port-compatible');
        } else if (inputPort) {
          inputPort.classList.add('port-invalid');
        }
      }
    });
  }

  clearPortHighlights() {
    document.querySelectorAll('.port').forEach(port => {
      port.classList.remove('port-active', 'port-compatible', 'port-invalid');
    });
  }

  createConnectionPath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const controlOffset = Math.max(50, Math.abs(dx) * 0.5);
    
    return `M ${x1},${y1} C ${x1 + controlOffset},${y1} ${x2 - controlOffset},${y2} ${x2},${y2}`;
  }

  createConnection(fromNodeId, toNodeId) {
    // 重複チェック
    const existingConnection = this.connections.find(
      conn => conn.from === fromNodeId && conn.to === toNodeId
    );
    
    if (existingConnection) {
      console.log('既存の接続が存在します');
      return null;
    }

    const connection = {
      id: `connection_${Date.now()}`,
      from: fromNodeId,
      to: toNodeId,
      type: 'data'
    };
    
    this.connections.push(connection);
    console.log('新しい接続を追加:', connection);
    
    // 接続追加後に即座に更新
    this.updateConnections();
    
    // 念のため少し遅延して再更新
    setTimeout(() => {
      this.updateConnections();
    }, 50);
    
    if (this.onConnectionCreated) {
      this.onConnectionCreated(connection);
    }
    
    return connection;
  }

  isValidConnection(fromNodeId, toNodeId) {
    // 自分自身への接続は無効
    if (fromNodeId === toNodeId) return false;
    
    const fromNode = this.nodeManager.getNode(fromNodeId);
    const toNode = this.nodeManager.getNode(toNodeId);
    
    if (!fromNode || !toNode) return false;
    
    // 入力ノードは出力できない
    if (fromNode.type === 'input' && toNode.type === 'output') return false;
    
    // 出力ノードは入力できない
    if (fromNode.type === 'output') return false;
    if (toNode.type === 'input') return false;
    
    // 既存の接続チェック
    const existingConnection = this.connections.find(
      conn => conn.from === fromNodeId && conn.to === toNodeId
    );
    
    return !existingConnection;
  }

  updateConnections() {
    if (!this.connectionsLayer) {
      console.error('connectionsLayer が見つかりません');
      return;
    }
    
    // 既存の接続線をクリア（一時的な線は除外）
    const existingPaths = this.connectionsLayer.querySelectorAll('path:not([stroke-dasharray])');
    existingPaths.forEach(path => path.remove());
    
    console.log(`接続線を更新中: ${this.connections.length}個の接続`);
    
    // 接続線を再描画
    this.connections.forEach((connection, index) => {
      const fromNode = this.nodeManager.getNode(connection.from);
      const toNode = this.nodeManager.getNode(connection.to);
      
      console.log(`接続 ${index}: ${connection.from} -> ${connection.to}`, {
        fromNode: fromNode ? 'あり' : 'なし',
        toNode: toNode ? 'あり' : 'なし'
      });
      
      if (fromNode && toNode) {
        const fromElement = document.getElementById(connection.from);
        const toElement = document.getElementById(connection.to);
        
        console.log(`DOM要素: ${connection.from}=${fromElement ? 'あり' : 'なし'}, ${connection.to}=${toElement ? 'あり' : 'なし'}`);
        
        if (fromElement && toElement) {
          // ノードの絶対座標を使用して接続線の座標を計算
          const nodeWidth = 160; // ノードの幅
          const nodeHeight = 90; // 固定の高さ
          const portOffset = 12; // ポートの位置調整
          
          // 出力ポート（右端）と入力ポート（左端）の座標
          const x1 = fromNode.x + nodeWidth - portOffset;
          const y1 = fromNode.y + nodeHeight / 2;
          const x2 = toNode.x + portOffset;
          const y2 = toNode.y + nodeHeight / 2;
          
          console.log(`座標: (${x1}, ${y1}) -> (${x2}, ${y2})`);
          
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', this.createConnectionPath(x1, y1, x2, y2));
          path.setAttribute('stroke', '#ff7e5f');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('fill', 'none');
          path.setAttribute('data-connection-id', connection.id);
          path.setAttribute('class', 'connection-line');
          path.style.cursor = 'pointer';
          path.style.zIndex = '15';
          
          // 接続線クリックで削除
          path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('この接続を削除しますか？')) {
              this.deleteConnection(connection.id);
            }
          });
          
          this.connectionsLayer.appendChild(path);
          console.log(`接続線を描画: ${connection.id}`);
        } else {
          console.warn(`DOM要素が見つからないため接続線をスキップ: ${connection.from} -> ${connection.to}`);
        }
      } else {
        console.warn(`ノードが見つからないため接続線をスキップ: ${connection.from} -> ${connection.to}`);
      }
    });
    
    console.log(`接続線更新完了: ${this.connectionsLayer.children.length}個の線を描画`);
  }

  deleteConnection(connectionId) {
    this.connections = this.connections.filter(conn => conn.id !== connectionId);
    this.updateConnections();
    
    if (this.onConnectionDeleted) {
      this.onConnectionDeleted(connectionId);
    }
  }

  deleteConnectionsByNode(nodeId) {
    const deletedConnections = this.connections.filter(
      conn => conn.from === nodeId || conn.to === nodeId
    );
    
    this.connections = this.connections.filter(
      conn => conn.from !== nodeId && conn.to !== nodeId
    );
    
    this.updateConnections();
    
    return deletedConnections;
  }

  getAllConnections() {
    return [...this.connections];
  }

  getConnectionsFromNode(nodeId) {
    return this.connections.filter(conn => conn.from === nodeId);
  }

  getConnectionsToNode(nodeId) {
    return this.connections.filter(conn => conn.to === nodeId);
  }

  clearAllConnections() {
    this.connections = [];
    if (this.connectionsLayer) {
      this.connectionsLayer.innerHTML = '';
    }
  }

  restoreConnections(connectionData) {
    this.connections = connectionData || [];
    console.log('接続を復元中:', this.connections);
    
    // DOM要素の準備を待って接続線を描画
    const updateConnectionsWithRetry = (attempts = 0) => {
      const maxAttempts = 10;
      
      // 全ノードのDOM要素が準備できているかチェック
      const allNodesReady = this.connections.every(conn => {
        return document.getElementById(conn.from) && document.getElementById(conn.to);
      });
      
      if (allNodesReady || attempts >= maxAttempts) {
        console.log(`接続線更新実行 (試行回数: ${attempts + 1})`);
        this.updateConnections();
      } else {
        console.log(`DOM要素の準備待ち (試行回数: ${attempts + 1})`);
        setTimeout(() => updateConnectionsWithRetry(attempts + 1), 50);
      }
    };
    
    // 最初の試行
    setTimeout(() => updateConnectionsWithRetry(), 10);
  }

  // トポロジカルソート用のメソッド
  calculateExecutionOrder(nodeManager) {
    const visited = new Set();
    const visiting = new Set();
    const order = [];
    
    const visit = (nodeId) => {
      if (visiting.has(nodeId)) {
        throw new Error('循環依存が検出されました');
      }
      if (visited.has(nodeId)) return;
      
      visiting.add(nodeId);
      
      // 依存関係（入力）を先に実行
      const dependencies = this.connections
        .filter(conn => conn.to === nodeId)
        .map(conn => conn.from);
      
      for (const depId of dependencies) {
        visit(depId);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };
    
    // 入力ノードから開始
    const inputNodes = nodeManager.getAllNodes()
      .filter(node => node.type === 'input');
    
    for (const inputNode of inputNodes) {
      visit(inputNode.id);
    }
    
    // 接続されていない他のノードも追加
    for (const node of nodeManager.getAllNodes()) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }
    
    return order;
  }

  // コールバック設定
  setCallbacks(callbacks) {
    this.onConnectionCreated = callbacks.onConnectionCreated;
    this.onConnectionDeleted = callbacks.onConnectionDeleted;
  }
} 