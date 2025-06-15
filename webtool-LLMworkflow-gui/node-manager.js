// Node Management Module
// Handles node creation, rendering, positioning, and node-specific operations

class NodeManager {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
    }

    // より堅牢なID生成関数
    generateNodeId(nodeType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const counter = this.editor.workflow.nodes.length;
        const uniqueId = `${timestamp}${random}${counter}`.replace(/[^\w]/g, '');
        return `node_${nodeType}_${uniqueId}`;
    }
    
    async addNode(nodeType, position) {
        // **修正**: 新しいノード追加時に接続モードを解除
        if (this.editor.connectionState.isConnecting) {
            window.debugMonitor?.logNode('Canceling connection due to new node creation', {
                nodeType,
                previousConnectionState: this.editor.connectionState
            });
            this.editor.connectionManager.cancelConnection();
        }
        
        // Auto-adjust position to prevent overlapping if position is default
        const adjustedPosition = this.getNextAvailablePosition(position);
        
        // Use enhanced node creation with proper port positioning
        const newNode = await this.createNodeWithPorts({
            type: nodeType,
            position: adjustedPosition
        });
        
        this.editor.workflow.nodes.push(newNode);
        this.editor.workflow.metadata.updatedAt = new Date();
        
        // **新機能**: 自動保存をトリガー
        this.editor.markAsChanged();
        
        // Auto-select the new node
        this.editor.selectNode(newNode);
        this.editor.updateWelcomeMessage();
        
        // Render connections after port positions are calculated
        setTimeout(() => {
            this.editor.renderConnections();
        }, 50);
        
        window.debugMonitor?.logNode(`Added ${nodeType} node`, {
            nodeId: newNode.id,
            position: adjustedPosition,
            wasConnecting: this.editor.connectionState.isConnecting
        });
        
        return newNode;
    }
    
    getNextAvailablePosition(desiredPosition) {
        const existingPositions = this.editor.workflow.nodes.map(node => node.position);
        let position = { ...desiredPosition };
        
        // Check if position is occupied and adjust if necessary
        while (this.isPositionOccupied(position, existingPositions)) {
            position.x += 220; // Width of node + margin
            if (position.x > 800) { // If too far right, move to next row
                position.x = 100;
                position.y += 120; // Height of node + margin
            }
        }
        
        return position;
    }
    
    isPositionOccupied(position, existingPositions) {
        const tolerance = 50; // Pixels tolerance for overlap detection
        return existingPositions.some(existing => 
            Math.abs(existing.x - position.x) < tolerance && 
            Math.abs(existing.y - position.y) < tolerance
        );
    }
    
    getDefaultNodeData(nodeType) {
        const commonData = {
            label: '',
            description: '',
            enabled: true,
            outputPorts: 1
        };
        
        switch (nodeType) {
            case 'input':
                return {
                    ...commonData,
                    label: 'Input Node',
                    inputType: 'text',
                    placeholder: 'Enter your input...',
                    defaultValue: '',
                    outputPorts: 1
                };
                
            case 'llm':
                return {
                    ...commonData,
                    label: 'LLM Process',
                    model: 'gpt-3.5-turbo',
                    temperature: 0.7,
                    maxTokens: 2000,
                    systemPrompt: 'You are a helpful assistant.',
                    userPrompt: '{{input}}',
                    apiProvider: 'openai',
                    outputPorts: 1
                };
                
            case 'branch':
                return {
                    ...commonData,
                    label: 'Branch Logic',
                    condition: 'contains',
                    value: '',
                    caseSensitive: false,
                    outputPorts: 2
                };
                
            case 'merge':
                return {
                    ...commonData,
                    label: 'Merge Streams',
                    mergeType: 'concat',
                    separator: '\n',
                    outputPorts: 1
                };
                
            case 'filter':
                return {
                    ...commonData,
                    label: 'Filter Data',
                    filterType: 'contains',
                    filterValue: '',
                    caseSensitive: false,
                    outputPorts: 1
                };
                
            case 'loop':
                return {
                    ...commonData,
                    label: 'Loop Process',
                    loopType: 'forEach',
                    maxIterations: 10,
                    breakCondition: '',
                    outputPorts: 1
                };
                
            case 'custom':
                return {
                    ...commonData,
                    label: 'Custom Logic',
                    customCode: '// Enter your custom JavaScript code here\nreturn input;',
                    allowedFunctions: ['console.log', 'Math', 'String', 'Array'],
                    outputPorts: 3
                };
                
            case 'output':
                return {
                    ...commonData,
                    label: 'Output Result',
                    outputFormat: 'text',
                    destination: 'console',
                    outputPorts: 0
                };
                
            default:
                return commonData;
        }
    }
    
    renderNodes() {
        const nodesContainer = document.getElementById('nodes-container');
        if (!nodesContainer) {
            console.error('nodes-container not found');
            return;
        }
        
        const existingNodes = nodesContainer.querySelectorAll('.workflow-node');
        existingNodes.forEach(node => node.remove());
        
        this.editor.workflow.nodes.forEach(node => {
            const nodeElement = this.createNodeElement(node);
            nodesContainer.appendChild(nodeElement);
        });
        
        this.editor.renderConnections();
    }
    
    // Method to update node selection state without full re-render
    updateNodeSelection() {
        const allNodes = document.querySelectorAll('.workflow-node');
        allNodes.forEach(nodeElement => {
            const nodeId = nodeElement.dataset.nodeId;
            const isSelected = this.editor.selectedNode?.id === nodeId;
            
            if (isSelected) {
                nodeElement.classList.add('selected');
            } else {
                nodeElement.classList.remove('selected');
            }
        });
    }
    
    createNodeElement(node) {
        const element = document.createElement('div');
        element.className = `workflow-node node-${node.type}`;
        element.dataset.nodeId = node.id;
        element.style.left = `${node.position.x}px`;
        element.style.top = `${node.position.y}px`;
        
        const isSelected = this.editor.selectedNode?.id === node.id;
        if (isSelected) {
            element.classList.add('selected');
        }
        
        // **修正**: ノードタイプに応じたポート配置の決定
        const nodePortConfig = this.getNodePortConfiguration(node.type);
        
        // Input portのHTML生成（必要な場合のみ）
        let inputPortHtml = '';
        if (nodePortConfig.hasInput) {
            inputPortHtml = `
                <div class="connection-port input-port" 
                     data-node-id="${node.id}" 
                     data-port="input"
                     title="Input port - click to connect">
                </div>
            `;
        }
        
        // Output portsのHTML生成（必要な場合のみ）
        let outputPortsHtml = '';
        if (nodePortConfig.hasOutput) {
            const outputPortCount = Math.min(node.data.outputPorts || 1, 3);
            
            for (let i = 0; i < outputPortCount; i++) {
                const portTop = outputPortCount === 1 ? '50%' : 
                               outputPortCount === 2 ? (i === 0 ? '33%' : '67%') :
                               (i === 0 ? '25%' : i === 1 ? '50%' : '75%');
                
                outputPortsHtml += `
                    <div class="connection-port output-port" 
                         data-node-id="${node.id}" 
                         data-port="output"
                         data-port-index="${i}"
                         style="top: ${portTop}; transform: translateY(-50%);"
                         title="Output port ${i + 1} - click to connect">
                    </div>
                `;
            }
        }
        
        element.innerHTML = `
            <!-- Input Connection Port (条件付き表示) -->
            ${inputPortHtml}
            
            <!-- Node Header -->
            <div class="node-header">
                <div class="node-icon ${this.getNodeIconClass(node.type)}">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${this.editor.getIcon(node.type)}
                    </svg>
                </div>
                <div class="node-title">
                    <h3 class="text-sm font-semibold text-white">
                        ${node.data.label || this.getNodeDescription(node.type)}
                    </h3>
                    <p class="text-xs text-gray-300 opacity-75">
                        ${node.type.charAt(0).toUpperCase() + node.type.slice(1)}
                    </p>
                </div>
            </div>
            
            <!-- Node Content -->
            <div class="node-content">
                ${this.getNodeContent(node)}
            </div>
            
            <!-- Output Connection Ports (条件付き表示) -->
            ${outputPortsHtml}
        `;
        
        // Add event listeners for node interaction
        element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.editor.eventHandlers.handleNodeMouseDown(e, node);
        });
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editor.eventHandlers.handleNodeClick(e, node);
        });
        
        // Add event listeners for connection ports
        const ports = element.querySelectorAll('.connection-port');
        ports.forEach(port => {
            port.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = port.dataset.nodeId;
                const portType = port.dataset.port;
                const portIndex = port.dataset.portIndex || 0;
                this.editor.handlePortClick(e, nodeId, portType, portIndex);
            });
            
            port.addEventListener('mouseenter', (e) => {
                const nodeId = port.dataset.nodeId;
                const portType = port.dataset.port;
                this.editor.handlePortHover(e, nodeId, portType, true);
            });
            
            port.addEventListener('mouseleave', (e) => {
                const nodeId = port.dataset.nodeId;
                const portType = port.dataset.port;
                this.editor.handlePortHover(e, nodeId, portType, false);
            });
        });
        
        window.debugMonitor?.logNode(`Created ${node.type} node with ports`, {
            nodeId: node.id,
            hasInput: nodePortConfig.hasInput,
            hasOutput: nodePortConfig.hasOutput,
            outputPorts: nodePortConfig.hasOutput ? (node.data.outputPorts || 1) : 0
        });
        
        return element;
    }
    
    getNodeIconClass(type) {
        const iconClasses = {
            input: 'icon-input',
            llm: 'icon-llm',
            branch: 'icon-branch',
            merge: 'icon-merge',
            filter: 'icon-filter',
            loop: 'icon-loop',
            custom: 'icon-custom',
            output: 'icon-output'
        };
        return iconClasses[type] || 'icon-custom';
    }
    
    getNodeDescription(type) {
        const descriptions = {
            input: 'Input Node',
            llm: 'LLM Process',
            branch: 'Branch Logic',
            merge: 'Merge Data',
            filter: 'Filter Data',
            loop: 'Loop Process',
            custom: 'Custom Logic',
            output: 'Output Result'
        };
        return descriptions[type] || 'Unknown Node';
    }
    
    getNodeContent(node) {
        switch (node.type) {
            case 'input':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Type:</span> ${node.data.inputType || 'text'}
                        </div>
                        ${node.data.defaultValue ? `
                            <div class="mb-1">
                                <span class="font-medium">Default:</span> 
                                <span style="color: var(--primary);">${node.data.defaultValue.substring(0, 30)}${node.data.defaultValue.length > 30 ? '...' : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'llm':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Model:</span> ${node.data.model || 'Default'}
                        </div>
                        <div class="mb-1">
                            <span class="font-medium">Temp:</span> ${node.data.temperature || 0.7}
                        </div>
                        ${node.data.systemPrompt ? `
                            <div class="mb-1">
                                <span class="font-medium">System:</span> 
                                <span style="color: var(--primary);">${node.data.systemPrompt.substring(0, 25)}${node.data.systemPrompt.length > 25 ? '...' : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'branch':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Condition:</span> ${node.data.condition || 'contains'}
                        </div>
                        ${node.data.value ? `
                            <div class="mb-1">
                                <span class="font-medium">Value:</span> 
                                <span style="color: var(--primary);">${node.data.value.substring(0, 20)}${node.data.value.length > 20 ? '...' : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'filter':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Filter:</span> ${node.data.filterType || 'contains'}
                        </div>
                        ${node.data.filterValue ? `
                            <div class="mb-1">
                                <span class="font-medium">Value:</span> 
                                <span style="color: var(--primary);">${node.data.filterValue.substring(0, 20)}${node.data.filterValue.length > 20 ? '...' : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'loop':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Type:</span> ${node.data.loopType || 'forEach'}
                        </div>
                        <div class="mb-1">
                            <span class="font-medium">Max:</span> ${node.data.maxIterations || 10}
                        </div>
                    </div>
                `;
                
            case 'merge':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Type:</span> ${node.data.mergeType || 'concat'}
                        </div>
                        ${node.data.separator ? `
                            <div class="mb-1">
                                <span class="font-medium">Sep:</span> 
                                <span style="color: var(--primary);">"${node.data.separator}"</span>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'custom':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Custom Logic</span>
                        </div>
                        ${node.data.customCode ? `
                            <div class="mb-1">
                                <span class="font-mono text-xs" style="color: var(--primary);">
                                    ${node.data.customCode.substring(0, 30).replace(/\n/g, ' ')}${node.data.customCode.length > 30 ? '...' : ''}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'output':
                return `
                    <div class="text-xs" style="color: var(--text-primary);">
                        <div class="mb-1">
                            <span class="font-medium">Format:</span> ${node.data.outputFormat || 'text'}
                        </div>
                        <div class="mb-1">
                            <span class="font-medium">Dest:</span> ${node.data.destination || 'console'}
                        </div>
                    </div>
                `;
                
            default:
                return `<div class="text-xs" style="color: var(--text-primary);">Node ready</div>`;
        }
    }
    
    // Enhanced port position calculation with timing fixes
    calculatePortPositions(node) {
        return new Promise((resolve) => {
            // Wait for DOM layout to complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
                    if (!nodeElement) {
                        resolve({ inputs: [], outputs: [] });
                        return;
                    }

                    const rect = nodeElement.getBoundingClientRect();
                    const canvas = document.getElementById('canvas');
                    const containerRect = canvas ? canvas.getBoundingClientRect() : rect;
                    
                    // Calculate relative positions for proper SVG coordinates
                    const nodeX = rect.left - containerRect.left;
                    const nodeY = rect.top - containerRect.top;
                    const nodeWidth = rect.width;
                    const nodeHeight = rect.height;

                    // Input ports (left side, centered)
                    const inputPorts = [{
                        id: `${node.id}-input-0`,
                        x: nodeX, // Left edge
                        y: nodeY + nodeHeight / 2,
                        type: 'input',
                        dataType: 'any'
                    }];

                    // Output ports (right side, up to 3 ports)
                    const outputCount = Math.min(3, node.data.outputPorts || 1);
                    const outputPorts = [];
                    
                    for (let index = 0; index < outputCount; index++) {
                        const yOffset = outputCount === 1 ? 
                            nodeHeight / 2 : 
                            (nodeHeight / (outputCount + 1)) * (index + 1);
                        
                        outputPorts.push({
                            id: `${node.id}-output-${index}`,
                            x: nodeX + nodeWidth, // Right edge
                            y: nodeY + yOffset,
                            type: 'output',
                            dataType: 'any'
                        });
                    }

                    resolve({ inputs: inputPorts, outputs: outputPorts });
                });
            });
        });
    }
    
    // Enhanced node creation with proper port positioning
    async createNodeWithPorts(nodeData) {
        const node = {
            id: this.generateNodeId(nodeData.type),
            type: nodeData.type,
            position: nodeData.position || { x: 100, y: 100 },
            data: this.getDefaultNodeData(nodeData.type)
        };

        // Create DOM element first
        const nodeElement = this.createNodeElement(node);
        const nodesContainer = document.getElementById('nodes-container');
        if (nodesContainer) {
            nodesContainer.appendChild(nodeElement);
        }

        // Wait for layout and calculate port positions
        const ports = await this.calculatePortPositions(node);
        node.ports = ports;

        return node;
    }
    
    updateNodePosition(nodeId, position) {
        const node = this.editor.workflow.nodes.find(n => n.id === nodeId);
        if (node) {
            node.position = position;
            
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.style.left = `${position.x}px`;
                nodeElement.style.top = `${position.y}px`;
            }
            
            this.editor.renderConnections();
        }
    }
    
    deleteSelectedNode() {
        if (!this.editor.selectedNode) return;
        
        const node = this.editor.selectedNode;
        const nodeId = node.id;
        const nodeLabel = node.data.label || node.type;
        
        // Count connections for user information
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === nodeId);
        const outputConnections = this.editor.workflow.connections.filter(conn => conn.from === nodeId);
        const totalConnections = inputConnections.length + outputConnections.length;
        
        // Confirmation dialog
        let confirmMessage = `Are you sure you want to delete the "${nodeLabel}" node?`;
        if (totalConnections > 0) {
            confirmMessage += `\n\nThis will also delete ${totalConnections} connection(s):`;
            if (inputConnections.length > 0) {
                confirmMessage += `\n• ${inputConnections.length} input connection(s)`;
            }
            if (outputConnections.length > 0) {
                confirmMessage += `\n• ${outputConnections.length} output connection(s)`;
            }
        }
        
        const confirmDelete = confirm(confirmMessage);
        if (!confirmDelete) {
            return; // User cancelled deletion
        }
        
        // Log deletion for debugging
        console.log(`Deleting node: ${nodeLabel} (${nodeId.substring(0, 8)}...) with ${totalConnections} connections`);
        
        // Remove node from workflow
        this.editor.workflow.nodes = this.editor.workflow.nodes.filter(n => n.id !== nodeId);
        
        // Remove all connections involving this node
        this.editor.workflow.connections = this.editor.workflow.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );
        
        // Remove node element from DOM
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.remove();
        }
        
        // Clear selection
        this.editor.selectedNode = null;
        this.editor.showProperties = false;
        
        // Update UI
        this.editor.workflow.metadata.updatedAt = new Date();
        
        // **新機能**: 自動保存をトリガー
        this.editor.markAsChanged();
        
        this.editor.renderConnections();
        this.editor.updatePropertyPanel();
        this.editor.updateWelcomeMessage();
        
        console.log(`✅ Node "${nodeLabel}" deleted successfully`);
    }
    
    updateNodeData(nodeId, field, value) {
        const node = this.editor.workflow.nodes.find(n => n.id === nodeId);
        if (node) {
            node.data[field] = value;
            this.editor.workflow.metadata.updatedAt = new Date();
            
            // **新機能**: 自動保存をトリガー
            this.editor.markAsChanged();
            
            this.updateSingleNode(nodeId);
        }
    }
    
    // Method to update a single node without full re-render
    updateSingleNode(nodeId) {
        const node = this.editor.workflow.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        const existingElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (existingElement) {
            const newElement = this.createNodeElement(node);
            existingElement.parentNode.replaceChild(newElement, existingElement);
        } else {
            // If element doesn't exist, add it to nodes container
            const nodesContainer = document.getElementById('nodes-container');
            if (nodesContainer) {
                const newElement = this.createNodeElement(node);
                nodesContainer.appendChild(newElement);
            }
        }
    }
    
    duplicateNode(node) {
        if (!node) return null;
        
        // Create a new node with same data
        const newNode = {
            id: this.generateNodeId(node.type),
            type: node.type,
            position: {
                x: node.position.x + 100, // Offset by 100px to the right
                y: node.position.y + 50   // Offset by 50px down
            },
            data: { ...node.data } // Deep copy of data
        };
        
        // Add label suffix to distinguish from original
        if (newNode.data.label) {
            newNode.data.label += ' (Copy)';
        } else {
            newNode.data.label = `${node.type} (Copy)`;
        }
        
        // Add to workflow
        this.editor.workflow.nodes.push(newNode);
        this.editor.workflow.metadata.updatedAt = new Date();
        
        // Render the new node
        this.renderNodes();
        
        // Select the new node
        this.editor.selectNode(newNode);
        
        console.log(`✅ Node "${newNode.data.label}" duplicated from "${node.data.label || node.type}"`);
        
        return newNode;
    }
    
    // **新機能**: ノードタイプに応じたポート設定を返す
    getNodePortConfiguration(nodeType) {
        const portConfigurations = {
            // Input node: 出力のみ（右側のみ）
            'input': {
                hasInput: false,
                hasOutput: true,
                description: 'データを生成し、他のノードに送信'
            },
            
            // LLM node: 入力と出力（左右両方）
            'llm': {
                hasInput: true,
                hasOutput: true,
                description: 'データを受信し、処理して出力'
            },
            
            // Branch node: 入力と複数出力（左側と右側）
            'branch': {
                hasInput: true,
                hasOutput: true,
                description: '条件に基づいて分岐'
            },
            
            // Merge node: 複数入力と出力（左側と右側）
            'merge': {
                hasInput: true,
                hasOutput: true,
                description: '複数の入力をマージして出力'
            },
            
            // Filter node: 入力と出力（左右両方）
            'filter': {
                hasInput: true,
                hasOutput: true,
                description: 'データをフィルタリングして出力'
            },
            
            // Loop node: 入力と出力（左右両方）
            'loop': {
                hasInput: true,
                hasOutput: true,
                description: 'ループ処理を実行'
            },
            
            // Custom node: 入力と出力（左右両方）
            'custom': {
                hasInput: true,
                hasOutput: true,
                description: 'カスタムロジックを実行'
            },
            
            // Output node: 入力のみ（左側のみ）
            'output': {
                hasInput: true,
                hasOutput: false,
                description: '最終結果を受信'
            }
        };
        
        return portConfigurations[nodeType] || {
            hasInput: true,
            hasOutput: true,
            description: 'デフォルト設定'
        };
    }
}

// Export for use in main workflow editor
window.NodeManager = NodeManager; 