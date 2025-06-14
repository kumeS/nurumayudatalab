// Connection Management Module
// Handles connection creation, deletion, rendering, and connection-specific operations

class ConnectionManager {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
    }

    renderConnections() {
        const svg = document.getElementById('connections-svg');
        if (!svg) {
            return;
        }
        
        // Clear existing connections
        svg.innerHTML = '';
        
        // Add arrow markers
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="arrowhead" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 12 4.5, 0 9" fill="#dc2626" stroke="#dc2626" stroke-width="1"/>
            </marker>
            <marker id="arrowhead-temp" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 12 4.5, 0 9" fill="#ef4444" stroke="#ef4444" opacity="0.8" stroke-width="1"/>
            </marker>
        `;
        svg.appendChild(defs);
        
        // Render existing connections with retry mechanism
        this.editor.workflow.connections.forEach((connection, index) => {
            const fromNode = this.editor.workflow.nodes.find(n => n.id === connection.from);
            const toNode = this.editor.workflow.nodes.find(n => n.id === connection.to);
            
            if (fromNode && toNode) {
                this.renderSingleConnection(svg, fromNode, toNode, connection.id);
            }
        });
        
        // Render temporary connection if connecting
        if (this.editor.connectionState.isConnecting) {
            const sourceNode = this.editor.workflow.nodes.find(n => n.id === this.editor.connectionState.sourceNode);
            if (sourceNode && this.editor.dragState.mousePosition) {
                const fromPort = this.getPortPosition(sourceNode, this.editor.connectionState.sourcePort);
                if (fromPort) {
                    const path = this.createConnectionPath(fromPort, this.editor.dragState.mousePosition, true);
                    svg.appendChild(path);
                }
            }
        }
    }
    
    renderSingleConnection(svg, fromNode, toNode, connectionId) {
        const fromPort = this.getPortPosition(fromNode, 'output');
        const toPort = this.getPortPosition(toNode, 'input');
        
        if (fromPort && toPort) {
            const path = this.createConnectionPath(fromPort, toPort, false, connectionId);
            svg.appendChild(path);
        } else {
            // Retry with delay if positions not available
            setTimeout(() => {
                const retryFromPort = this.getPortPosition(fromNode, 'output');
                const retryToPort = this.getPortPosition(toNode, 'input');
                if (retryFromPort && retryToPort) {
                    const retryPath = this.createConnectionPath(retryFromPort, retryToPort, false, connectionId);
                    svg.appendChild(retryPath);
                }
            }, 50);
        }
    }
    
    createConnectionPath(from, to, temporary = false, connectionId = null) {
        const dx = to.x - from.x;
        const controlPointOffset = Math.max(Math.abs(dx) * 0.5, 50);
        const controlPoint1 = { x: from.x + controlPointOffset, y: from.y };
        const controlPoint2 = { x: to.x - controlPointOffset, y: to.y };
        
        const pathData = `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${to.x} ${to.y}`;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.className = 'connection';
        g.setAttribute('data-connection-id', connectionId || 'temp');
        
        // Shadow line (temporarily simplified)
        const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shadowPath.setAttribute('d', pathData);
        shadowPath.setAttribute('stroke', '#000000');
        shadowPath.setAttribute('stroke-width', '8');
        shadowPath.setAttribute('fill', 'none');
        shadowPath.setAttribute('opacity', '0.3');
        shadowPath.className = 'pointer-events-none';
        
        // Main line
        const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainPath.setAttribute('d', pathData);
        mainPath.setAttribute('stroke', temporary ? '#ef4444' : '#dc2626');
        mainPath.setAttribute('stroke-width', temporary ? '6' : '5');
        mainPath.setAttribute('fill', 'none');
        mainPath.setAttribute('marker-end', temporary ? 'url(#arrowhead-temp)' : 'url(#arrowhead)');
        mainPath.setAttribute('opacity', temporary ? '0.8' : '1');
        mainPath.style.filter = temporary ? 'drop-shadow(0 2px 4px rgba(96, 165, 250, 0.4))' : 'drop-shadow(0 1px 3px rgba(37, 99, 235, 0.3))';
        
        if (temporary) {
            mainPath.className = 'temporary-connection-line';
        } else {
            mainPath.style.cursor = 'pointer';
            mainPath.style.transition = 'all 0.3s ease';
            
            // Add hover effects for permanent connections
            mainPath.addEventListener('mouseenter', () => {
                mainPath.setAttribute('stroke-width', '7');
                mainPath.setAttribute('stroke', '#b91c1c');
                mainPath.style.filter = 'drop-shadow(0 2px 10px rgba(185, 28, 28, 0.6))';
            });
            
            mainPath.addEventListener('mouseleave', () => {
                mainPath.setAttribute('stroke-width', '5');
                mainPath.setAttribute('stroke', '#dc2626');
                mainPath.style.filter = 'drop-shadow(0 1px 3px rgba(220, 38, 38, 0.4))';
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
        
        g.appendChild(shadowPath);
        g.appendChild(mainPath);
        
        return g;
    }

    getPortPosition(node, portType) {
        const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
        if (!nodeElement) {
            // Fallback to node position data when DOM element not available
            const nodeWidth = 200; // Standard node width
            const nodeHeight = 100; // Standard node height
            
            return {
                x: portType === 'output' ? node.position.x + nodeWidth : node.position.x,
                y: node.position.y + nodeHeight / 2
            };
        }
        
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            return null;
        }
        
        const nodeRect = nodeElement.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate position relative to the SVG coordinate system
        // SVG coordinates need to account for canvas transforms
        const canvasState = this.editor.canvasState || { scale: 1, translateX: 0, translateY: 0 };
        
        // Get position relative to canvas
        const rawX = nodeRect.left - canvasRect.left;
        const rawY = nodeRect.top - canvasRect.top;
        
        // Convert to SVG coordinate system (inverse of canvas transform)
        const nodeX = (rawX - canvasState.translateX) / canvasState.scale;
        const nodeY = (rawY - canvasState.translateY) / canvasState.scale;
        const nodeWidth = nodeRect.width / canvasState.scale;
        const nodeHeight = nodeRect.height / canvasState.scale;
        
        const portPosition = {
            x: portType === 'output' ? nodeX + nodeWidth : nodeX,
            y: nodeY + nodeHeight / 2
        };
        
        return portPosition;
    }

    deleteConnection(connectionId) {
        this.editor.workflow.connections = this.editor.workflow.connections.filter(conn => conn.id !== connectionId);
        this.editor.workflow.metadata.updatedAt = new Date();
        this.renderConnections();
        this.editor.uiManager.updatePropertyPanel();
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
        
        // Only allow output to input connections
        if (sourcePortType !== 'output' || targetPortType !== 'input') return false;
        
        // Check for duplicate connections
        const connectionExists = this.editor.workflow.connections.some(
            conn => conn.from === sourceNodeId && conn.to === targetNodeId
        );
        
        return !connectionExists;
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
        
        console.log('New connection created:', newConnection);
        console.log('Total connections:', this.editor.workflow.connections.length);
        
        // Force multiple renders to ensure connection lines appear
        this.renderConnections();
        
        // Use requestAnimationFrame for proper DOM timing
        requestAnimationFrame(() => {
            this.renderConnections();
            // Update property panel after rendering
            this.editor.uiManager.updatePropertyPanel();
        });
        
        // Also add a delayed render as backup
        setTimeout(() => {
            this.renderConnections();
            this.editor.uiManager.updatePropertyPanel();
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
}

// Export for use in main workflow editor
window.ConnectionManager = ConnectionManager; 