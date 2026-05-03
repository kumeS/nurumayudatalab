// Connection Management Module
// Handles connection creation, deletion, rendering, and connection-specific operations

class ConnectionManager {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
        this.resizeObserver = null;
        this.setupLayoutChangeDetection();
    }

    // **新機能**: レイアウト変更検知システム
    setupLayoutChangeDetection() {
        // ResizeObserverでCanvas要素のサイズ変更を監視
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.target.id === 'canvas') {
                        window.debugMonitor?.logConnection('Canvas resized, rerendering connections', {
                            newSize: { width: entry.contentRect.width, height: entry.contentRect.height }
                        });
                        // 短い遅延後に接続線を再描画
                        setTimeout(() => {
                            this.renderConnections();
                        }, 100);
                    }
                }
            });
            
            // Canvas要素の監視を開始
            const canvas = document.getElementById('canvas');
            if (canvas) {
                this.resizeObserver.observe(canvas);
            }
        }
        
        // サイドバートグルボタンの監視
        const paletteToggle = document.getElementById('toggle-palette');
        const propertiesToggle = document.getElementById('toggle-properties');
        
        if (paletteToggle) {
            paletteToggle.addEventListener('click', () => {
                setTimeout(() => {
                    this.handleLayoutChange('palette toggle');
                }, 200); // アニメーション後に実行
            });
        }
        
        if (propertiesToggle) {
            propertiesToggle.addEventListener('click', () => {
                setTimeout(() => {
                    this.handleLayoutChange('properties toggle');
                }, 200); // アニメーション後に実行
            });
        }
        
        // ウィンドウリサイズの監視（バックアップ）
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.handleLayoutChange('window resize');
            }, 150);
        });
    }
    
    // **新機能**: レイアウト変更時の処理
    handleLayoutChange(trigger) {
        window.debugMonitor?.logConnection(`Layout change detected: ${trigger}`, {
            trigger,
            timestamp: new Date().toISOString()
        });
        
        // SVG座標系を更新
        this.updateSVGCoordinateSystem();
        
        // 接続線を再描画
        this.renderConnections();
    }
    
    // **新機能**: SVG座標系の更新
    updateSVGCoordinateSystem() {
        const svg = document.getElementById('connections-svg');
        const canvas = document.getElementById('canvas');
        
        if (svg && canvas) {
            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;
            
            svg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            
            window.debugMonitor?.logConnection('SVG coordinate system updated', {
                canvasWidth, canvasHeight,
                newViewBox: `0 0 ${canvasWidth} ${canvasHeight}`
            });
        }
    }
    
    // **改善**: クリーンアップ処理の追加
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    // Critical fix: Create SVG with proper viewport and coordinate system
    createConnectionSVG() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        // **修正**: Canvas要素のサイズに合わせたviewBoxを設定
        const canvas = document.getElementById('canvas');
        const canvasWidth = canvas ? canvas.offsetWidth : 1200;
        const canvasHeight = canvas ? canvas.offsetHeight : 800;
        
        svg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.pointerEvents = "none"; // Allow clicks through to nodes
        
        window.debugMonitor?.logConnection('SVG created', {
            canvasWidth,
            canvasHeight,
            viewBox: `0 0 ${canvasWidth} ${canvasHeight}`
        });
        
        return svg;
    }

    async renderConnections() {
        let svg = document.getElementById('connections-svg');
        if (!svg) {
            // Create SVG if it doesn't exist
            svg = this.createConnectionSVG();
            svg.id = 'connections-svg';
            const canvas = document.getElementById('canvas');
            if (canvas) {
                canvas.appendChild(svg);
            } else {
                console.error('Canvas not found when creating connections SVG');
                return;
            }
        }
        
        // Ensure SVG has proper attributes
        const canvas = document.getElementById('canvas');
        const canvasWidth = canvas ? canvas.offsetWidth : 1200;
        const canvasHeight = canvas ? canvas.offsetHeight : 800;
        
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.pointerEvents = "none";
        
        // Clear existing connections
        svg.innerHTML = '';
        
        // Add arrow markers with improved definitions
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 8 3, 0 6" fill="#374151" stroke="none"/>
            </marker>
            <marker id="arrowhead-temp" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 8 3, 0 6" fill="#6366f1" stroke="none"/>
            </marker>
        `;
        svg.appendChild(defs);
        
        // Render existing connections with improved error handling
        const renderPromises = this.editor.workflow.connections.map(async (connection) => {
            try {
                const fromNode = this.editor.workflow.nodes.find(n => n.id === connection.from);
                const toNode = this.editor.workflow.nodes.find(n => n.id === connection.to);
                
                if (fromNode && toNode) {
                    await this.renderSingleConnection(svg, fromNode, toNode, connection.id);
                } else {
                    console.warn('Connection nodes not found:', { 
                        from: connection.from, 
                        to: connection.to,
                        fromNode: !!fromNode,
                        toNode: !!toNode
                    });
                }
            } catch (error) {
                console.error('Error rendering connection:', error, connection);
            }
        });
        
        // Wait for all connections to render
        await Promise.allSettled(renderPromises);
        
        // Render temporary connection if connecting
        if (this.editor.connectionState.isConnecting) {
            const sourceNode = this.editor.workflow.nodes.find(n => n.id === this.editor.connectionState.sourceNode);
            if (sourceNode && this.editor.dragState.mousePosition) {
                try {
                    const fromPort = await this.getPortPosition(sourceNode, this.editor.connectionState.sourcePort);
                    if (fromPort) {
                        const path = this.createConnectionPath(fromPort, this.editor.dragState.mousePosition, true);
                        svg.appendChild(path);
                    }
                } catch (error) {
                    console.warn('Temporary connection render failed:', error);
                }
            }
        }
        
        console.log(`✅ Rendered ${this.editor.workflow.connections.length} connections`);
    }
    
    async renderSingleConnection(svg, fromNode, toNode, connectionId) {
        try {
            const fromPort = await this.getPortPosition(fromNode, 'output');
            const toPort = await this.getPortPosition(toNode, 'input');
            
            if (fromPort && toPort) {
                const path = this.createConnectionPath(fromPort, toPort, false, connectionId);
                svg.appendChild(path);
            } else {
                // Retry with delay if positions not available
                setTimeout(async () => {
                    try {
                        const retryFromPort = await this.getPortPosition(fromNode, 'output');
                        const retryToPort = await this.getPortPosition(toNode, 'input');
                        if (retryFromPort && retryToPort) {
                            const retryPath = this.createConnectionPath(retryFromPort, retryToPort, false, connectionId);
                            svg.appendChild(retryPath);
                        }
                    } catch (error) {
                        console.warn('Retry connection render failed:', error);
                    }
                }, 50);
            }
        } catch (error) {
            console.warn('Connection render failed:', error);
        }
    }
    
    // Enhanced path creation with visibility checks
    createConnectionPath(startPos, endPos, temporary = false, connectionId = null) {
        // Generate bezier curve path
        const dx = endPos.x - startPos.x;
        const offsetX = Math.abs(dx) * 0.3; // より控えめなカーブ
        const cp1x = startPos.x + offsetX;
        const cp1y = startPos.y;
        const cp2x = endPos.x - offsetX;
        const cp2y = endPos.y;
        
        const pathData = `M ${startPos.x} ${startPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endPos.x} ${endPos.y}`;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connection');
        g.setAttribute('data-connection-id', connectionId || 'temp');
        
        // **シンプル化**: 影を削除、シンプルなメインラインのみ
        const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainPath.setAttribute('d', pathData);
        mainPath.setAttribute('stroke', temporary ? '#6366f1' : '#374151');
        mainPath.setAttribute('stroke-width', temporary ? '3' : '2');
        mainPath.setAttribute('fill', 'none');
        mainPath.setAttribute('marker-end', temporary ? 'url(#arrowhead-temp)' : 'url(#arrowhead)');
        mainPath.setAttribute('opacity', '0.8');
        
        if (temporary) {
            mainPath.setAttribute('stroke-dasharray', '5,5');
            mainPath.setAttribute('class', 'temporary-connection-line');
        } else {
            mainPath.style.cursor = 'pointer';
            mainPath.style.transition = 'stroke-width 0.2s ease';
            
            // **シンプル化**: 控えめなホバー効果のみ
            mainPath.addEventListener('mouseenter', () => {
                mainPath.setAttribute('stroke-width', '3');
                mainPath.setAttribute('stroke', '#1f2937');
            });
            
            mainPath.addEventListener('mouseleave', () => {
                mainPath.setAttribute('stroke-width', '2');
                mainPath.setAttribute('stroke', '#374151');
            });
            
            // Add connection deletion on click
            if (connectionId) {
                mainPath.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const confirmDelete = confirm('この接続を削除しますか？');
                    if (confirmDelete) {
                        this.deleteConnection(connectionId);
                    }
                });
            }
        }
        
        g.appendChild(mainPath);
        
        window.debugMonitor?.logConnection('Connection path created', {
            startPos, endPos, temporary, pathData
        });
        
        return g;
    }

    getPortPosition(node, portType) {
        return new Promise((resolve) => {
            // Wait for DOM layout to complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
                    if (!nodeElement) {
                        // Fallback to node position data when DOM element not available
                        const nodeWidth = 200; // Standard node width
                        const nodeHeight = 100; // Standard node height
                        
                        resolve({
                            x: portType === 'output' ? node.position.x + nodeWidth : node.position.x,
                            y: node.position.y + nodeHeight / 2
                        });
                        return;
                    }
                    
                    const canvas = document.getElementById('canvas');
                    if (!canvas) {
                        resolve(null);
                        return;
                    }
                    
                    // **修正**: より正確な座標計算を実装
                    const nodeRect = nodeElement.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();
                    
                    // Canvas内での相対位置を取得
                    const relativeX = nodeRect.left - canvasRect.left;
                    const relativeY = nodeRect.top - canvasRect.top;
                    
                    // ポートの位置を計算
                    const nodeWidth = nodeRect.width;
                    const nodeHeight = nodeRect.height;
                    
                    let portX, portY;
                    
                    if (portType === 'output') {
                        // 出力ポートは右端の中央
                        portX = relativeX + nodeWidth;
                        portY = relativeY + nodeHeight / 2;
                    } else {
                        // 入力ポートは左端の中央
                        portX = relativeX;
                        portY = relativeY + nodeHeight / 2;
                    }
                    
                    // **修正**: Canvas transformを適切に処理
                    const canvasState = this.editor.canvasState || { scale: 1, translateX: 0, translateY: 0 };
                    
                    // Canvas transformが適用されている場合の座標調整
                    const finalX = portX;
                    const finalY = portY;
                    
                    window.debugMonitor?.logConnection(`Port position calculated: ${portType} port for node ${node.id}`, {
                        nodeRect: { x: nodeRect.left, y: nodeRect.top, width: nodeRect.width, height: nodeRect.height },
                        canvasRect: { x: canvasRect.left, y: canvasRect.top },
                        relativePosition: { x: relativeX, y: relativeY },
                        finalPosition: { x: finalX, y: finalY },
                        canvasState
                    });
                    
                    resolve({
                        x: finalX,
                        y: finalY
                    });
                });
            });
        });
    }

    deleteConnection(connectionId) {
        const connection = this.editor.workflow.connections.find(conn => conn.id === connectionId);
        if (connection) {
            // Store node IDs before deletion for property panel updates
            const fromNodeId = connection.from;
            const toNodeId = connection.to;
            
            this.editor.workflow.connections = this.editor.workflow.connections.filter(conn => conn.id !== connectionId);
            this.editor.workflow.metadata.updatedAt = new Date();
            
            // **新機能**: 自動保存をトリガー
            this.editor.markAsChanged();
            
            this.renderConnections();
            
            // Queue property panel updates for both affected nodes
            this.editor.uiManager.queuePropertyPanelUpdate(fromNodeId);
            this.editor.uiManager.queuePropertyPanelUpdate(toNodeId);
        }
    }
    
    startConnection(nodeId, portType) {
        this.editor.connectionState.isConnecting = true;
        this.editor.connectionState.sourceNode = nodeId;
        this.editor.connectionState.sourcePort = portType;
        
        // Add visual feedback
        const port = document.querySelector(`[data-node-id="${nodeId}"][data-port="${portType}"]`);
        if (port) {
            port.classList.add('connecting');
        }
        
        this.updatePortStates();
    }
    
    completeConnection(targetNodeId, targetPortType, customSourceNodeId = null, customSourcePortType = null) {
        const sourceNodeId = customSourceNodeId || this.editor.connectionState.sourceNode;
        const sourcePortType = customSourcePortType || this.editor.connectionState.sourcePort;
        
        // Validate connection
        if (this.canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType)) {
            this.connectNodes(sourceNodeId, targetNodeId);
        }
        
        this.cancelConnection();
    }

    cancelConnection() {
        if (this.editor.connectionState.isConnecting) {
            // Remove visual feedback
            const port = document.querySelector(`[data-node-id="${this.editor.connectionState.sourceNode}"][data-port="${this.editor.connectionState.sourcePort}"]`);
            if (port) {
                port.classList.remove('connecting');
            }
        }
        
        this.editor.connectionState.isConnecting = false;
        this.editor.connectionState.sourceNode = null;
        this.editor.connectionState.sourcePort = null;
        this.editor.dragState.hoveredPort = null;
        
        // Clear all port states
        document.querySelectorAll('.connection-port').forEach(port => {
            port.classList.remove('connecting', 'can-connect');
        });
        
        this.renderConnections();
    }

    canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType) {
        // Prevent self-connection
        if (sourceNodeId === targetNodeId) return false;
        
        // Get source and target nodes
        const sourceNode = this.editor.workflow.nodes.find(n => n.id === sourceNodeId);
        const targetNode = this.editor.workflow.nodes.find(n => n.id === targetNodeId);
        
        if (!sourceNode || !targetNode) return false;
        
        // **修正**: ノードタイプに応じたポート検証
        const sourcePortConfig = this.getNodePortConfiguration(sourceNode.type);
        const targetPortConfig = this.getNodePortConfiguration(targetNode.type);
        
        // ソースノードに出力ポートがあるかチェック
        if (sourcePortType === 'output' && !sourcePortConfig.hasOutput) {
            window.debugMonitor?.logWarning(`Source node ${sourceNode.type} has no output ports`, {
                sourceNodeId, sourceNodeType: sourceNode.type
            });
            return false;
        }
        
        // ターゲットノードに入力ポートがあるかチェック
        if (targetPortType === 'input' && !targetPortConfig.hasInput) {
            window.debugMonitor?.logWarning(`Target node ${targetNode.type} has no input ports`, {
                targetNodeId, targetNodeType: targetNode.type
            });
            return false;
        }
        
        // Only allow output to input connections
        if (sourcePortType !== 'output' || targetPortType !== 'input') {
            window.debugMonitor?.logWarning('Invalid port types for connection', {
                sourcePortType, targetPortType
            });
            return false;
        }
        
        // Check for duplicate connections
        const connectionExists = this.editor.workflow.connections.some(
            conn => conn.from === sourceNodeId && conn.to === targetNodeId
        );
        
        if (connectionExists) {
            window.debugMonitor?.logWarning('Connection already exists', {
                sourceNodeId, targetNodeId
            });
            return false;
        }
        
        window.debugMonitor?.logSuccess('Connection validation passed', {
            sourceNode: `${sourceNode.type} (${sourceNodeId.substring(0, 8)}...)`,
            targetNode: `${targetNode.type} (${targetNodeId.substring(0, 8)}...)`,
            sourcePortType, targetPortType
        });
        
        return true;
    }

    // **新機能**: ノードタイプに応じたポート設定を取得（NodeManagerと同期）
    getNodePortConfiguration(nodeType) {
        const portConfigurations = {
            'input': { hasInput: false, hasOutput: true },
            'llm': { hasInput: true, hasOutput: true },
            'branch': { hasInput: true, hasOutput: true },
            'merge': { hasInput: true, hasOutput: true },
            'filter': { hasInput: true, hasOutput: true },
            'loop': { hasInput: true, hasOutput: true },
            'custom': { hasInput: true, hasOutput: true },
            'output': { hasInput: true, hasOutput: false }
        };
        
        return portConfigurations[nodeType] || {
            hasInput: true,
            hasOutput: true
        };
    }

    updatePortStates() {
        // Update port visual states based on current connection state
        document.querySelectorAll('.connection-port').forEach(port => {
            const nodeId = port.dataset.nodeId;
            const portType = port.dataset.port;
            
            if (this.editor.connectionState.isConnecting) {
                if (nodeId === this.editor.connectionState.sourceNode && portType === this.editor.connectionState.sourcePort) {
                    port.classList.add('connecting');
                } else if (this.canConnect(this.editor.connectionState.sourceNode, nodeId, this.editor.connectionState.sourcePort, portType)) {
                    // Visual hint for connectable ports
                    port.style.opacity = '1';
                } else {
                    port.style.opacity = '0.3';
                }
            } else {
                port.classList.remove('connecting', 'can-connect');
                port.style.opacity = '1';
            }
        });
    }
    
    connectNodes(fromId, toId) {
        console.log('connectNodes called:', { fromId, toId });
        
        // Check if connection already exists
        const connectionExists = this.editor.workflow.connections.some(
            conn => conn.from === fromId && conn.to === toId
        );
        
        if (connectionExists) {
            console.log('Connection already exists');
            return false;
        }
        
        const newConnection = {
            id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            from: fromId,
            to: toId,
            type: 'data'
        };
        
        this.editor.workflow.connections.push(newConnection);
        this.editor.workflow.metadata.updatedAt = new Date();
        
        // **新機能**: 自動保存をトリガー
        this.editor.markAsChanged();
        
        console.log('New connection created:', newConnection);
        console.log('Total connections:', this.editor.workflow.connections.length);
        
        // Force multiple renders to ensure connection lines appear
        this.renderConnections();
        
        // Use requestAnimationFrame for proper DOM timing
        requestAnimationFrame(() => {
            this.renderConnections();
            // Queue property panel updates for both connected nodes
            this.editor.uiManager.queuePropertyPanelUpdate(fromId);
            this.editor.uiManager.queuePropertyPanelUpdate(toId);
        });
        
        // Also add a delayed render as backup
        setTimeout(() => {
            this.renderConnections();
            this.editor.uiManager.queuePropertyPanelUpdate(fromId);
            this.editor.uiManager.queuePropertyPanelUpdate(toId);
        }, 50);
        
        return true;
    }

    handleConnectNodesFromPanel() {
        const selectedNodeId = document.getElementById('node-connect-to')?.value;
        
        console.log('Connection attempt:', {
            selectedNodeId,
            currentNode: this.editor.selectedNode?.id,
            currentNodeType: this.editor.selectedNode?.type
        });
        
        if (!selectedNodeId || selectedNodeId === 'Select a node to connect...' || !this.editor.selectedNode) {
            alert('Please select a node to connect to');
            return;
        }
        
        const success = this.connectNodes(this.editor.selectedNode.id, selectedNodeId);
        
        if (success) {
            // Clear the selection
            const selectElement = document.getElementById('node-connect-to');
            if (selectElement) {
                selectElement.value = '';
            }
            
            // Show success feedback
            const button = document.getElementById('connect-nodes-btn');
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ Connected!';
                button.style.backgroundColor = '#22c55e';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 2000);
            }
            
            // Update property panel to reflect changes
            this.editor.uiManager.updatePropertyPanel();
            
            console.log('Connection created successfully');
        } else {
            alert('Connection failed. Already connected or invalid connection.');
            console.log('Connection failed');
        }
    }

    addConnection(sourceNodeId, sourcePort, targetNodeId, targetPort) {
        const connection = {
            id: 'conn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            from: sourceNodeId,
            to: targetNodeId,
            fromPort: sourcePort,
            toPort: targetPort,
            metadata: {
                createdAt: new Date()
            }
        };
        
        this.editor.workflow.connections.push(connection);
        this.editor.workflow.metadata.updatedAt = new Date();
        
        // **新機能**: 自動保存をトリガー
        this.editor.markAsChanged();
        
        this.renderConnections();
        
        window.debugMonitor?.logConnection('Added connection', {
            connectionId: connection.id,
            from: sourceNodeId,
            to: targetNodeId,
            fromPort: sourcePort,
            toPort: targetPort
        });
        
        return connection;
    }
}

// Export for use in main workflow editor
window.ConnectionManager = ConnectionManager; 