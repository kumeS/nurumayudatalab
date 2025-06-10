class NodeManager {
  constructor(canvas, viewportManager) {
    this.canvas = canvas;
    this.viewportManager = viewportManager;
    this.nodes = new Map();
    this.selectedNode = null;
    this.draggedNode = null;
    this.isNodeDragging = false;
    this.nodeIdCounter = 0;
    
    this.initNodeContainer();
    this.initEventListeners();
  }

  initNodeContainer() {
    // ノードコンテナを作成
    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'node-container';
    nodeContainer.style.position = 'absolute';
    nodeContainer.style.top = '0';
    nodeContainer.style.left = '0';
    nodeContainer.style.width = '100%';
    nodeContainer.style.height = '100%';
    nodeContainer.style.transformOrigin = '0 0';
    this.canvas.appendChild(nodeContainer);
  }

  initEventListeners() {
    // キャンバスへのドロップ
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      // console.log('ドラッグオーバー:', e.target.tagName, e.target.className);
    });
    
    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('text/plain');
      console.log('ドロップイベント:', nodeType, '座標:', e.clientX, e.clientY);
      
      if (!nodeType) {
        console.error('ノードタイプが取得できませんでした');
        return;
      }
      
      const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY);
      console.log('ワールド座標:', worldPos);
      
      const node = this.createNode(nodeType, worldPos.x, worldPos.y);
      console.log('ノード作成完了:', node);
    });

    // キャンバス空白部分クリックでパン
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && 
          (e.target === this.canvas || e.target.classList.contains('canvas-grid')) &&
          !this.isNodeDragging) {
        e.preventDefault();
        this.viewportManager.startPanningExternal(e);
      }
    });

    // Delete キー
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' && this.selectedNode) {
        this.deleteNode(this.selectedNode);
      }
    });
  }

  createNode(type, x, y) {
    // 既存ノードとの重複チェック
    const minDistance = 180; // ノード間最小距離
    let adjustedX = x;
    let adjustedY = y;
    
    for (const [nodeId, node] of this.nodes) {
      const distance = Math.sqrt(
        Math.pow(node.x - adjustedX, 2) + 
        Math.pow(node.y - adjustedY, 2)
      );
      
      if (distance < minDistance) {
        // 重複回避: 右下にずらす
        adjustedX += minDistance;
        adjustedY += 50;
      }
    }
    
    const nodeId = `node_${this.nodeIdCounter++}`;
    const node = {
      id: nodeId,
      type: type,
      x: adjustedX,
      y: adjustedY,
      data: this.getDefaultNodeData(type)
    };

    this.nodes.set(nodeId, node);
    this.renderNode(node);
    
    // 自動接続の試行
    setTimeout(() => {
      this.attemptAutoConnection(nodeId, type);
    }, 100);
    
    return node;
  }

  getDefaultNodeData(type) {
    const defaults = {
      input: {
        name: '入力ノード',
        description: 'ワークフローの入力データ',
        inputType: 'text',
        defaultValue: ''
      },
      llm: {
        name: 'LLM処理',
        description: 'LLMによるテキスト処理',
        prompt: 'あなたは優秀なAIアシスタントです。与えられたテキストを処理してください。\n\n入力: {input}\n\n出力:',
        temperature: 0.7,
        maxTokens: 2000
      },
      branch: {
        name: '分岐ノード',
        description: '条件に基づく分岐処理',
        condition: '',
        trueOutput: 'true',
        falseOutput: 'false'
      },
      merge: {
        name: '統合ノード',
        description: '複数の入力を統合',
        mergeType: 'concat',
        separator: '\n\n---\n\n'
      },
      transform: {
        name: '変換ノード',
        description: 'データの変換処理',
        transformType: 'text',
        transformFunction: 'return input.toUpperCase();'
      },
      output: {
        name: '出力ノード',
        description: 'ワークフローの最終出力',
        outputFormat: 'text'
      },
      filter: {
        name: 'フィルタノード',
        description: 'データのフィルタリング処理',
        filterType: 'condition',
        condition: 'return input.length > 0;',
        pattern: ''
      },
      sort: {
        name: 'ソートノード',
        description: 'データのソート処理',
        sortType: 'alphabetical',
        sortOrder: 'asc',
        sortKey: ''
      },
      aggregate: {
        name: '集約ノード',
        description: 'データの集約処理',
        aggregateType: 'count',
        groupBy: '',
        operation: 'sum'
      },
      split: {
        name: '分割ノード',
        description: 'データの分割処理',
        splitType: 'delimiter',
        delimiter: ',',
        chunkSize: 100
      }
    };

    return defaults[type] || {
      name: `${type}ノード`,
      description: `${type}の処理を行います`
    };
  }

  renderNode(node) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'workflow-node';
    nodeElement.id = node.id;
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;

    const iconMap = {
      input: 'fas fa-sign-in-alt',
      llm: 'fas fa-brain',
      branch: 'fas fa-code-branch',
      merge: 'fas fa-compress-arrows-alt',
      transform: 'fas fa-exchange-alt',
      filter: 'fas fa-filter',
      sort: 'fas fa-sort',
      aggregate: 'fas fa-calculator',
      split: 'fas fa-cut',
      output: 'fas fa-sign-out-alt'
    };

    nodeElement.innerHTML = `
      <div class="node-header">
        <span class="node-icon"><i class="${iconMap[node.type] || 'fas fa-circle'}"></i></span>
        <span class="node-title">${node.data.name}</span>
      </div>
      <div class="node-content">${node.data.description}</div>
      <div class="node-ports">
        ${node.type !== 'input' ? '<div class="port input" data-port="input"></div>' : '<div class="port-placeholder"></div>'}
        ${node.type !== 'output' ? '<div class="port output" data-port="output"></div>' : ''}
      </div>
    `;

    // イベントリスナー
    nodeElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // 左クリック
        e.stopPropagation();
        this.startNodeDrag(node.id, e);
      }
    });

    // ポートイベント
    const ports = nodeElement.querySelectorAll('.port');
    ports.forEach(port => {
      port.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const portType = port.dataset.port;
        if (this.onPortClick) {
          this.onPortClick(node.id, portType, e);
        }
      });
    });

    // ノードコンテナに追加
    const nodeContainer = this.canvas.querySelector('.node-container');
    nodeContainer.appendChild(nodeElement);
  }

  startNodeDrag(nodeId, e) {
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    
    this.draggedNode = {
      id: nodeId,
      offsetX: e.offsetX,
      offsetY: e.offsetY
    };

    const handleMouseMove = (e) => {
      if (this.draggedNode) {
        const moveThreshold = 3;
        if (!hasMoved && (Math.abs(e.clientX - startX) > moveThreshold || Math.abs(e.clientY - startY) > moveThreshold)) {
          hasMoved = true;
          this.isNodeDragging = true;
        }
        
        if (this.isNodeDragging) {
          const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY);
          this.moveNode(this.draggedNode.id, 
            worldPos.x - this.draggedNode.offsetX / this.viewportManager.scale, 
            worldPos.y - this.draggedNode.offsetY / this.viewportManager.scale);
        }
      }
    };

    const handleMouseUp = () => {
      if (!hasMoved) {
        this.selectNode(nodeId);
      }
      
      this.isNodeDragging = false;
      this.draggedNode = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (hasMoved && this.onNodeMoved) {
        this.onNodeMoved();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  moveNode(nodeId, x, y) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.x = Math.max(0, x);
      node.y = Math.max(0, y);
      const element = document.getElementById(nodeId);
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      
      if (this.onNodeMoved) {
        this.onNodeMoved();
      }
    }
  }

  selectNode(nodeId) {
    // 前の選択を解除
    if (this.selectedNode) {
      const prevElement = document.getElementById(this.selectedNode);
      if (prevElement) prevElement.classList.remove('selected');
    }

    // 新しいノードを選択
    this.selectedNode = nodeId;
    const element = document.getElementById(nodeId);
    element.classList.add('selected');

    if (this.onNodeSelected) {
      this.onNodeSelected(nodeId);
    }
  }

  deleteNode(nodeId) {
    if (this.nodes.has(nodeId)) {
      // DOM要素を削除
      const element = document.getElementById(nodeId);
      if (element) element.remove();
      
      // データを削除
      this.nodes.delete(nodeId);
      
      // 選択状態をクリア
      if (this.selectedNode === nodeId) {
        this.selectedNode = null;
        if (this.onNodeSelected) {
          this.onNodeSelected(null);
        }
      }
      
      if (this.onNodeDeleted) {
        this.onNodeDeleted(nodeId);
      }
    }
  }

  updateNodeData(nodeId, data) {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node.data, data);
      // ノード表示を更新
      const element = document.getElementById(nodeId);
      const titleElement = element.querySelector('.node-title');
      const contentElement = element.querySelector('.node-content');
      
      if (titleElement) titleElement.textContent = node.data.name;
      if (contentElement) contentElement.textContent = node.data.description;
    }
  }

  clearAllNodes() {
    const nodeContainer = this.canvas.querySelector('.node-container');
    if (nodeContainer) {
      nodeContainer.innerHTML = '';
    }
    this.nodes.clear();
    this.selectedNode = null;
    this.nodeIdCounter = 0;
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  getNodePosition(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) {
      return { x: node.x, y: node.y };
    }
    return null;
  }

  restoreNodes(nodeData) {
    // 全ノードを先にMapに追加
    nodeData.forEach(node => {
      this.nodes.set(node.id, node);
    });
    
    // 次にDOM要素を作成
    nodeData.forEach(node => {
      this.renderNode(node);
    });
    
    // カウンターを更新
    if (nodeData.length > 0) {
      this.nodeIdCounter = Math.max(...nodeData.map(n => parseInt(n.id.split('_')[1]))) + 1;
    }
  }

  // コールバック設定
  setCallbacks(callbacks) {
    this.onNodeSelected = callbacks.onNodeSelected;
    this.onNodeMoved = callbacks.onNodeMoved;
    this.onNodeDeleted = callbacks.onNodeDeleted;
    this.onPortClick = callbacks.onPortClick;
    this.onAutoConnect = callbacks.onAutoConnect;
  }

  // 新しいメソッド: 自動接続の試行
  attemptAutoConnection(newNodeId, newNodeType) {
    if (!this.onAutoConnect) return;
    
    const allNodes = Array.from(this.nodes.values());
    const newNode = this.nodes.get(newNodeId);
    
    // 接続可能なノードを探す
    let candidateFrom = null;
    let candidateTo = null;
    let minFromDistance = Infinity;
    let minToDistance = Infinity;
    
    for (const existingNode of allNodes) {
      if (existingNode.id === newNodeId) continue;
      
      const distance = Math.sqrt(
        Math.pow(existingNode.x - newNode.x, 2) + 
        Math.pow(existingNode.y - newNode.y, 2)
      );
      
      // 新しいノードへの入力候補（左側のノード）
      if (this.canConnect(existingNode.type, newNodeType) && 
          existingNode.x < newNode.x && 
          distance < minFromDistance) {
        candidateFrom = existingNode;
        minFromDistance = distance;
      }
      
      // 新しいノードからの出力候補（右側のノード）
      if (this.canConnect(newNodeType, existingNode.type) && 
          existingNode.x > newNode.x && 
          distance < minToDistance) {
        candidateTo = existingNode;
        minToDistance = distance;
      }
    }
    
    // 自動接続を実行
    if (candidateFrom && minFromDistance < 300) { // 距離制限
      console.log(`自動接続: ${candidateFrom.id} -> ${newNodeId}`);
      this.onAutoConnect(candidateFrom.id, newNodeId);
    }
    
    if (candidateTo && minToDistance < 300) { // 距離制限
      console.log(`自動接続: ${newNodeId} -> ${candidateTo.id}`);
      this.onAutoConnect(newNodeId, candidateTo.id);
    }
  }

  // 新しいメソッド: ノード間の接続可能性チェック
  canConnect(fromType, toType) {
    // 入力ノードは出力のみ
    if (fromType === 'input' && toType !== 'input') return true;
    
    // 出力ノードは入力のみ
    if (toType === 'output' && fromType !== 'output') return true;
    
    // LLMノードは入力と出力の両方可能
    if (fromType === 'llm' && toType !== 'input') return true;
    if (toType === 'llm' && fromType !== 'output') return true;
    
    // その他の処理ノード
    if (fromType !== 'output' && toType !== 'input' && fromType !== toType) return true;
    
    return false;
  }
} 