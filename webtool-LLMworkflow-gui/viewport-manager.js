class ViewportManager {
  constructor(canvas, connectionsLayer) {
    this.canvas = canvas;
    this.connectionsLayer = connectionsLayer;
    
    // パン・ズーム設定
    this.panX = 0;
    this.panY = 0;
    this.scale = 1;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    
    this.initEventListeners();
    this.loadViewportState();
  }

  initEventListeners() {
    // マウスホイールでズーム
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(3, this.scale * zoomFactor));
      
      // マウス位置を中心にズーム
      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      
      this.updateCanvasTransform();
    });

    // パン操作の設定
    this.canvas.addEventListener('mousedown', (e) => {
      // 中ボタン、右ボタン、またはCtrl+左ボタンでパン
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault();
        this.startPanning(e);
        return;
      }
    });

    // 右クリックメニューを無効化
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.updateCanvasTransform();
      }, 100);
    });

    // ページ離脱時に確実に保存
    window.addEventListener('beforeunload', () => {
      this.saveViewportState();
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      if (e.key === '0' && e.ctrlKey) {
        e.preventDefault();
        this.resetZoom();
      } else if (e.key === '+' && e.ctrlKey) {
        e.preventDefault();
        this.zoomIn();
      } else if (e.key === '-' && e.ctrlKey) {
        e.preventDefault();
        this.zoomOut();
      }
    });
  }

  startPanning(e) {
    this.isPanning = true;
    this.panStartX = e.clientX - this.panX;
    this.panStartY = e.clientY - this.panY;
    
    this.canvas.classList.add('panning');
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this.updateCanvasTransform();
      }
    };

    const handleMouseUp = () => {
      this.isPanning = false;
      
      this.canvas.classList.remove('panning');
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  updateCanvasTransform() {
    const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    
    // ノードコンテナ全体にtransformを適用
    const nodeContainer = this.canvas.querySelector('.node-container');
    if (nodeContainer) {
      nodeContainer.style.transform = transform;
      nodeContainer.style.transformOrigin = '0 0';
    }

    // SVG接続線にはtransformを適用しない（座標計算でビューポート変換を処理）
    // if (this.connectionsLayer) {
    //   this.connectionsLayer.style.transform = transform;
    //   this.connectionsLayer.style.transformOrigin = '0 0';
    // }

    // グリッドも変形
    const grid = this.canvas.querySelector('.canvas-grid');
    if (grid) {
      grid.style.transform = transform;
      grid.style.transformOrigin = '0 0';
    }

    // ビューポート状態を自動保存
    this.saveViewportState();
    
    // 接続線更新のコールバックがあれば呼び出し
    if (this.onViewportChanged) {
      this.onViewportChanged();
    }
  }

  zoomIn() {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const oldScale = this.scale;
    this.scale = Math.min(3, this.scale * 1.2);
    
    // 中心点を基準にズーム
    this.panX = centerX - (centerX - this.panX) * (this.scale / oldScale);
    this.panY = centerY - (centerY - this.panY) * (this.scale / oldScale);
    
    this.updateCanvasTransform();
  }

  zoomOut() {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const oldScale = this.scale;
    this.scale = Math.max(0.1, this.scale / 1.2);
    
    // 中心点を基準にズーム
    this.panX = centerX - (centerX - this.panX) * (this.scale / oldScale);
    this.panY = centerY - (centerY - this.panY) * (this.scale / oldScale);
    
    this.updateCanvasTransform();
  }

  resetZoom() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateCanvasTransform();
  }

  saveViewportState() {
    const viewportState = {
      panX: this.panX,
      panY: this.panY,
      scale: this.scale,
      timestamp: Date.now()
    };
    localStorage.setItem('workflowViewport', JSON.stringify(viewportState));
    console.log('ビューポート状態を保存:', viewportState);
  }

  loadViewportState() {
    try {
      const saved = localStorage.getItem('workflowViewport');
      if (saved) {
        const viewportState = JSON.parse(saved);
        this.panX = viewportState.panX || 0;
        this.panY = viewportState.panY || 0;
        this.scale = viewportState.scale || 1;
        
        this.scale = Math.max(0.1, Math.min(3, this.scale));
        
        console.log('ビューポート状態を復元:', { 
          panX: this.panX, 
          panY: this.panY, 
          scale: this.scale,
          rawData: viewportState
        });
        return true;
      } else {
        console.log('保存されたビューポート状態が見つかりません');
      }
    } catch (error) {
      console.error('ビューポート状態の復元に失敗:', error);
    }
    return false;
  }

  // 外部から呼び出し用のパン開始メソッド
  startPanningExternal(e) {
    if (!this.isNodeDragging && !this.currentConnection) {
      this.startPanning(e);
    }
  }

  // 座標変換ユーティリティ
  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    
    // パンとスケール補正を正しく適用
    const worldX = (canvasX / this.scale) - (this.panX / this.scale);
    const worldY = (canvasY / this.scale) - (this.panY / this.scale);
    
    // ノード重複を避けるためのグリッドスナップ機能追加
    const gridSize = 20;
    const snappedX = Math.round(worldX / gridSize) * gridSize;
    const snappedY = Math.round(worldY / gridSize) * gridSize;
    
    return { 
      x: Math.max(0, snappedX), 
      y: Math.max(0, snappedY) 
    };
  }

  worldToScreen(worldX, worldY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: worldX * this.scale + this.panX + rect.left,
      y: worldY * this.scale + this.panY + rect.top
    };
  }
} 