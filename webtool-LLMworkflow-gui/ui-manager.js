// UI Manager Module - Bug Fixes
// 修正点: プロパティパネルの更新タイミング、複数出力ポート設定、接続数表示

class UIManager {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
        this.updateQueue = [];
        this.isUpdating = false;
    }

    renderNodePalette() {
        try {
            window.debugMonitor?.logUI('Starting renderNodePalette...');
            
        const container = document.getElementById('node-types');
            if (!container) {
                throw new Error('node-types container not found');
            }
            
            if (!this.editor.nodeTypes) {
                throw new Error('this.editor.nodeTypes is undefined');
            }
            
            if (!Array.isArray(this.editor.nodeTypes)) {
                throw new Error('this.editor.nodeTypes is not an array');
            }
            
            window.debugMonitor?.logUI(`Found ${this.editor.nodeTypes.length} node types to render`);
            
        container.innerHTML = '';
        
            this.editor.nodeTypes.forEach((nodeType, index) => {
                try {
                    window.debugMonitor?.logUI(`Rendering node type ${index}: ${nodeType.type}`);
                    
            const item = document.createElement('div');
            item.className = 'node-palette-item';
            item.draggable = true;
            item.dataset.nodeType = nodeType.type;
            
            item.innerHTML = `
                <div class="flex items-start space-x-3">
                    <div class="node-icon ${nodeType.color}">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${nodeType.icon}
                        </svg>
                    </div>
                    <div class="flex-1">
                        <h3 class="node-label text-white font-medium transition-colors">
                            ${nodeType.label}
                        </h3>
                        <p class="text-xs text-gray-400 mt-1 leading-relaxed">
                            ${nodeType.description}
                        </p>
                    </div>
                </div>
            `;
            
            item.addEventListener('dragstart', (e) => this.editor.handleDragStart(e, nodeType.type));
                    item.addEventListener('click', () => {
                        if (this.editor.connectionState.isConnecting) {
                            window.debugMonitor?.logUI('Canceling connection due to palette click', {
                                nodeType: nodeType.type,
                                previousConnectionState: this.editor.connectionState
                            });
                            this.editor.connectionManager.cancelConnection();
                        }
                        
                        this.editor.addNode(nodeType.type, { x: 100, y: 100 });
                        
                        window.debugMonitor?.logUI('Palette item clicked', { nodeType: nodeType.type });
                    });
            
            container.appendChild(item);
                    
                } catch (nodeError) {
                    window.debugMonitor?.logError(`Failed to render node type ${nodeType.type}`, { 
                        error: nodeError.message,
                        nodeType: nodeType
                    });
                }
            });
            
            window.debugMonitor?.logSuccess(`Successfully rendered ${this.editor.nodeTypes.length} node types`);
            
        } catch (error) {
            window.debugMonitor?.logError('Failed to render node palette', { 
                error: error.message,
                stack: error.stack,
                editorExists: !!this.editor,
                nodeTypesExists: !!this.editor?.nodeTypes,
                nodeTypesLength: this.editor?.nodeTypes?.length
            });
            
            // Show fallback error message in the palette
            const container = document.getElementById('node-types');
            if (container) {
                container.innerHTML = `
                    <div class="p-4 text-center">
                        <div class="text-red-500 mb-2">⚠️ Palette Error</div>
                        <div class="text-sm text-gray-600">${error.message}</div>
                    </div>
                `;
            }
        }
    }

    // Debounced update mechanism
    queuePropertyPanelUpdate(nodeId) {
        this.updateQueue.push(nodeId);
        
        if (!this.isUpdating) {
            this.isUpdating = true;
            requestAnimationFrame(() => {
                this.processUpdateQueue();
            });
        }
    }

    processUpdateQueue() {
        const uniqueNodes = [...new Set(this.updateQueue)];
        this.updateQueue = [];
        
        uniqueNodes.forEach(nodeId => {
            this.updatePropertyPanelImmediate(nodeId);
        });
        
        this.isUpdating = false;
    }

    updatePropertyPanelImmediate(nodeId) {
        const node = this.editor.workflow.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Count actual connections (not just internal data)
        const inputConnections = this.editor.workflow.connections.filter(
            conn => conn.to === nodeId
        );
        const outputConnections = this.editor.workflow.connections.filter(
            conn => conn.from === nodeId
        );

        // Update UI elements if property panel is open for this node
        if (this.editor.selectedNode && this.editor.selectedNode.id === nodeId) {
            const panel = document.getElementById('property-panel');
            if (panel && !panel.classList.contains('hidden')) {
                // Update connection counts in real-time
                const inputCountElement = panel.querySelector('.input-count');
                const outputCountElement = panel.querySelector('.output-count');
                const totalConnectionsElement = panel.querySelector('.total-connections');
                
                if (inputCountElement) inputCountElement.textContent = inputConnections.length;
                if (outputCountElement) outputCountElement.textContent = outputConnections.length;
                if (totalConnectionsElement) {
                    totalConnectionsElement.textContent = inputConnections.length + outputConnections.length;
                }
                
                // Update connection status badges
                this.updateConnectionStatusBadges(inputConnections.length, outputConnections.length);
            }
        }

        window.debugMonitor?.logUI(`Node ${nodeId} connections: ${inputConnections.length + outputConnections.length}`);
    }

    updateConnectionStatusBadges(inputCount, outputCount) {
        const panel = document.getElementById('property-panel');
        if (!panel) return;
        
        // Update input connections badge
        const inputBadge = panel.querySelector('.input-connections-badge');
        if (inputBadge) {
            inputBadge.textContent = inputCount;
            inputBadge.className = `font-medium px-2 py-1 ${inputCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'} rounded-full text-xs`;
        }
        
        // Update output connections badge
        const outputBadge = panel.querySelector('.output-connections-badge');
        if (outputBadge) {
            outputBadge.textContent = outputCount;
            outputBadge.className = `font-medium px-2 py-1 ${outputCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} rounded-full text-xs`;
        }
    }

    // **修正**: Enhanced updatePropertyPanel with proper timing and connection count accuracy
    updatePropertyPanel() {
        const panel = document.getElementById('property-panel');
        const badge = document.getElementById('node-type-badge');
        const content = document.getElementById('property-content');
        
        if (this.editor.selectedNode) {
            this.editor.showProperties = true;
            panel.classList.remove('hidden');
            
            // Update badge
            badge.innerHTML = `
                <div class="bg-gray-700 rounded-lg p-3">
                    <div class="text-sm font-medium text-white mb-1">
                        ${this.editor.selectedNode.type.charAt(0).toUpperCase() + this.editor.selectedNode.type.slice(1)} Node
                    </div>
                    <div class="text-xs text-gray-400">
                        ID: ${this.editor.selectedNode.id.substring(0, 8)}...
                    </div>
                </div>
            `;
            
            // **修正**: Use requestAnimationFrame for proper DOM timing
            requestAnimationFrame(() => {
                content.innerHTML = this.getPropertyPanelContent(this.editor.selectedNode);
                
                // **修正**: Double requestAnimationFrame for better reliability
                requestAnimationFrame(() => {
                    this.setupPropertyPanelEvents();
                });
            });
        } else {
            panel.classList.add('hidden');
            this.editor.showProperties = false;
        }
        
        this.updateUI();
    }
    
    // **修正**: Enhanced connection counting and UI generation
    getPropertyPanelContent(node) {
        // **修正**: More accurate connection counting
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        const outputConnections = this.editor.workflow.connections.filter(conn => conn.from === node.id);
        
        window.debugMonitor?.logUI(`Property panel for ${node.id}: ${inputConnections.length} inputs, ${outputConnections.length} outputs`);
        
        return `
            <div class="p-4 space-y-4">
                <!-- Basic Configuration -->
                <div class="bg-gray-700 rounded-lg p-4" style="background: #f8f9fa; border-radius: 8px;">
                    <h3 class="font-medium mb-4" style="color: var(--text-primary);">Basic Configuration</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">
                                Node Label
                            </label>
                            <input
                                type="text"
                                id="node-label"
                                value="${node.data.label || ''}"
                                class="form-input"
                                placeholder="Enter node label..."
                            />
                        </div>
                        
                        <!-- **修正**: Enhanced Output Ports Configuration -->
                        ${this.getOutputPortsConfiguration(node)}
                        
                        <!-- Connection Configuration -->
                        <div>
                            <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">
                                Connect to Node
                            </label>
                            <select
                                id="node-connect-to"
                                class="form-select"
                                style="width: 100%;"
                            >
                                <option value="">Select a node to connect...</option>
                                ${this.editor.workflow.nodes
                                    .filter(n => {
                                        // 自分自身を除外
                                        if (n.id === node.id) return false;
                                        
                                        // **修正**: ノードタイプに応じた接続可能性をチェック
                                        const sourcePortConfig = this.getNodePortConfiguration(node.type);
                                        const targetPortConfig = this.getNodePortConfiguration(n.type);
                                        
                                        // ソースノードに出力ポートがない場合は接続不可
                                        if (!sourcePortConfig.hasOutput) return false;
                                        
                                        // ターゲットノードに入力ポートがない場合は接続不可
                                        if (!targetPortConfig.hasInput) return false;
                                        
                                        // 既存の接続を除外
                                        const connectionExists = this.editor.workflow.connections.some(conn => 
                                            conn.from === node.id && conn.to === n.id);
                                        
                                        return !connectionExists;
                                    })
                                    .map(n => `<option value="${n.id}">${n.data.label || n.type} (${n.id.substring(0, 8)}...)</option>`)
                                    .join('')}
                            </select>
                        </div>
                        
                        <button
                            id="connect-nodes-btn"
                            class="btn-primary w-full"
                            style="background: var(--primary-gradient); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;"
                        >
                            Create Connection
                        </button>
                        
                        <!-- **修正**: Enhanced Connection Status with real-time updates -->
                        <div class="bg-gray-50 rounded-lg p-3" style="background: #f8f9fa; border: 1px solid #e9ecef;">
                            <h4 class="text-sm font-medium mb-2" style="color: var(--text-primary);">Connection Status</h4>
                            <div class="text-sm space-y-1" style="color: var(--text-secondary);">
                                <div class="flex justify-between items-center">
                                    <span>Input connections:</span>
                                    <span class="input-connections-badge font-medium px-2 py-1 ${inputConnections.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'} rounded-full text-xs">
                                        ${inputConnections.length}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span>Output connections:</span>
                                    <span class="output-connections-badge font-medium px-2 py-1 ${outputConnections.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} rounded-full text-xs">
                                        ${outputConnections.length}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span>Available output ports:</span>
                                    <span class="font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                                        ${node.data.outputPorts || 1}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- **修正**: Connection Details -->
                        ${this.getConnectionDetails(node, inputConnections, outputConnections)}
                    </div>
                </div>
                
                <!-- Node Actions -->
                <div class="bg-gray-700 rounded-lg p-4" style="background: #fff1f1; border-radius: 8px;">
                    <h3 class="font-medium mb-4" style="color: var(--text-primary);">Node Actions</h3>
                    
                    <div class="space-y-3">
                        <button
                            id="duplicate-node-btn"
                            class="btn w-full flex items-center justify-center space-x-2"
                            style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: background-color 0.2s;"
                            onmouseover="this.style.backgroundColor='#218838'"
                            onmouseout="this.style.backgroundColor='#28a745'"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            <span>Duplicate Node</span>
                        </button>
                        
                        <button
                            id="delete-node-btn"
                            class="btn btn-danger w-full flex items-center justify-center space-x-2"
                            style="background: #dc3545; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; transition: background-color 0.2s;"
                            onmouseover="this.style.backgroundColor='#c82333'"
                            onmouseout="this.style.backgroundColor='#dc3545'"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            <span>Delete Node</span>
                        </button>
                        
                        <div class="text-xs text-gray-500 text-center">
                            Keyboard: <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">Delete</kbd> to delete, 
                            <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">Ctrl+C</kbd> to duplicate
                        </div>
                    </div>
                </div>
                
                <!-- Node-specific fields -->
                ${this.getNodeSpecificFields(node)}
                
                <!-- API Test Section (for LLM nodes) -->
                ${node.type === 'llm' ? `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #f0f9ff; border-radius: 8px;">
                        <h3 class="font-medium mb-3" style="color: var(--text-primary);">API Connection Test</h3>
                        <button
                            id="test-api-btn"
                            class="btn btn-secondary w-full"
                            style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;"
                        >
                            Test API Connection
                        </button>
                        <div id="api-test-result" class="mt-2 text-sm" style="color: var(--text-secondary);"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // **修正**: New method for output ports configuration
    getOutputPortsConfiguration(node) {
        // Only show output ports configuration for relevant node types
        if (['branch', 'custom'].includes(node.type)) {
            const maxPorts = node.type === 'branch' ? 2 : 3;
            const currentPorts = node.data.outputPorts || 1;
            
            return `
                <div>
                    <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">
                        Output Ports (Max: ${maxPorts})
                    </label>
                    <select
                        id="output-ports-count"
                        class="form-select"
                        data-max-ports="${maxPorts}"
                    >
                        ${Array.from({length: maxPorts}, (_, i) => i + 1).map(num => 
                            `<option value="${num}" ${currentPorts === num ? 'selected' : ''}>${num} port${num > 1 ? 's' : ''}</option>`
                        ).join('')}
                    </select>
                    <div class="text-xs text-gray-500 mt-1">
                        ${node.type === 'branch' ? 'Branch nodes can have 1-2 outputs (true/false)' : 'Custom nodes can have 1-3 outputs'}
                    </div>
                </div>
            `;
        }
        return '';
    }
    
    // **修正**: New method for connection details
    getConnectionDetails(node, inputConnections, outputConnections) {
        if (inputConnections.length === 0 && outputConnections.length === 0) {
            return `
                <div class="text-xs text-center py-2" style="color: var(--text-secondary);">
                    <em>No connections yet</em>
                </div>
            `;
        }
        
        let html = '<div class="mt-3"><h5 class="text-xs font-medium mb-2" style="color: var(--text-primary);">Connection Details</h5>';
        
        if (inputConnections.length > 0) {
            html += '<div class="text-xs mb-2"><strong>Inputs:</strong></div>';
            inputConnections.forEach(conn => {
                const sourceNode = this.editor.workflow.nodes.find(n => n.id === conn.from);
                if (sourceNode) {
                    html += `
                        <div class="flex items-center justify-between text-xs py-1 px-2 bg-blue-50 rounded mb-1">
                            <span>${sourceNode.data.label || sourceNode.type}</span>
                            <button class="text-red-500 hover:text-red-700" onclick="window.workflowEditor.connectionManager.deleteConnection('${conn.id}')" title="Delete connection">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                }
            });
        }
        
        if (outputConnections.length > 0) {
            html += '<div class="text-xs mb-2 mt-2"><strong>Outputs:</strong></div>';
            outputConnections.forEach(conn => {
                const targetNode = this.editor.workflow.nodes.find(n => n.id === conn.to);
                if (targetNode) {
                    const portIndex = conn.fromPort || 0;
                    html += `
                        <div class="flex items-center justify-between text-xs py-1 px-2 bg-green-50 rounded mb-1">
                            <span>${targetNode.data.label || targetNode.type} (Port ${portIndex + 1})</span>
                            <button class="text-red-500 hover:text-red-700" onclick="window.workflowEditor.connectionManager.deleteConnection('${conn.id}')" title="Delete connection">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                }
            });
        }
        
        html += '</div>';
        return html;
    }
    
    getNodeSpecificFields(node) {
        switch (node.type) {
            case 'input':
                return `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #f0f9ff; border-radius: 8px;">
                        <h3 class="font-medium mb-4" style="color: var(--text-primary);">Input Configuration</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Input Type</label>
                                <select id="input-type" class="form-select">
                                    <option value="text" ${node.data.inputType === 'text' ? 'selected' : ''}>Text</option>
                                    <option value="number" ${node.data.inputType === 'number' ? 'selected' : ''}>Number</option>
                                    <option value="file" ${node.data.inputType === 'file' ? 'selected' : ''}>File</option>
                                    <option value="json" ${node.data.inputType === 'json' ? 'selected' : ''}>JSON</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Placeholder</label>
                                <input
                                    type="text"
                                    id="input-placeholder"
                                    value="${node.data.placeholder || ''}"
                                    class="form-input"
                                    placeholder="Enter placeholder text..."
                                />
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Default Value</label>
                                <textarea
                                    id="input-default-value"
                                    class="form-textarea"
                                    placeholder="Enter default value..."
                                    rows="3"
                                >${node.data.defaultValue || ''}</textarea>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'llm':
                return `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #f0f9ff; border-radius: 8px;">
                        <h3 class="font-medium mb-4" style="color: var(--text-primary);">LLM Configuration</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Model</label>
                                <select id="llm-model" class="form-select">
                                    <option value="gpt-3.5-turbo" ${node.data.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                                    <option value="gpt-4" ${node.data.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                                    <option value="claude-3-sonnet" ${node.data.model === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
                                    <option value="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8" ${node.data.model === 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8' ? 'selected' : ''}>Llama 4 Maverick</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Temperature</label>
                                <input
                                    type="range"
                                    id="llm-temperature"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value="${node.data.temperature || 0.7}"
                                    class="form-range w-full"
                                />
                                <div class="text-xs text-gray-500 mt-1">Current: <span id="temperature-value">${node.data.temperature || 0.7}</span></div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Max Tokens</label>
                                <input
                                    type="number"
                                    id="llm-max-tokens"
                                    value="${node.data.maxTokens || 2000}"
                                    class="form-input"
                                    min="1"
                                    max="8000"
                                />
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">System Prompt</label>
                                <textarea
                                    id="llm-system-prompt"
                                    class="form-textarea"
                                    placeholder="Enter system prompt..."
                                    rows="3"
                                >${node.data.systemPrompt || ''}</textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">User Prompt</label>
                                <textarea
                                    id="llm-user-prompt"
                                    class="form-textarea"
                                    placeholder="Enter user prompt template (use {{input}} for input data)..."
                                    rows="4"
                                >${node.data.userPrompt || ''}</textarea>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'branch':
                return `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #fef3c7; border-radius: 8px;">
                        <h3 class="font-medium mb-4" style="color: var(--text-primary);">Branch Configuration</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Condition Type</label>
                                <select id="branch-condition" class="form-select">
                                    <option value="contains" ${node.data.condition === 'contains' ? 'selected' : ''}>Contains</option>
                                    <option value="equals" ${node.data.condition === 'equals' ? 'selected' : ''}>Equals</option>
                                    <option value="startsWith" ${node.data.condition === 'startsWith' ? 'selected' : ''}>Starts With</option>
                                    <option value="endsWith" ${node.data.condition === 'endsWith' ? 'selected' : ''}>Ends With</option>
                                    <option value="regex" ${node.data.condition === 'regex' ? 'selected' : ''}>Regular Expression</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Condition Value</label>
                                <input
                                    type="text"
                                    id="branch-value"
                                    value="${node.data.value || ''}"
                                    class="form-input"
                                    placeholder="Enter condition value..."
                                />
                            </div>
                            
                            <div class="flex items-center">
                                <input
                                    type="checkbox"
                                    id="branch-case-sensitive"
                                    ${node.data.caseSensitive ? 'checked' : ''}
                                    class="form-checkbox"
                                />
                                <label for="branch-case-sensitive" class="ml-2 text-sm" style="color: var(--text-primary);">Case Sensitive</label>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'filter':
                return `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #f3e8ff; border-radius: 8px;">
                        <h3 class="font-medium mb-4" style="color: var(--text-primary);">Filter Configuration</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Filter Type</label>
                                <select id="filter-type" class="form-select">
                                    <option value="contains" ${node.data.filterType === 'contains' ? 'selected' : ''}>Contains</option>
                                    <option value="excludes" ${node.data.filterType === 'excludes' ? 'selected' : ''}>Excludes</option>
                                    <option value="length" ${node.data.filterType === 'length' ? 'selected' : ''}>Length</option>
                                    <option value="regex" ${node.data.filterType === 'regex' ? 'selected' : ''}>Regular Expression</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Filter Value</label>
                                <input
                                    type="text"
                                    id="filter-value"
                                    value="${node.data.filterValue || ''}"
                                    class="form-input"
                                    placeholder="Enter filter value..."
                                />
                            </div>
                            
                            <div class="flex items-center">
                                <input
                                    type="checkbox"
                                    id="filter-case-sensitive"
                                    ${node.data.caseSensitive ? 'checked' : ''}
                                    class="form-checkbox"
                                />
                                <label for="filter-case-sensitive" class="ml-2 text-sm" style="color: var(--text-primary);">Case Sensitive</label>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'custom':
                return `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #fdf4ff; border-radius: 8px;">
                        <h3 class="font-medium mb-4" style="color: var(--text-primary);">Custom Logic Configuration</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Custom Code</label>
                                <textarea
                                    id="custom-code"
                                    class="form-textarea font-mono text-sm"
                                    placeholder="// Enter your custom JavaScript code here
// The input data is available as 'input' variable
// Return the processed result
return input;"
                                    rows="8"
                                    style="font-family: 'Courier New', monospace;"
                                >${node.data.customCode || ''}</textarea>
                            </div>
                            
                            <div class="text-xs text-gray-500">
                                <p><strong>Available variables:</strong> input, Math, String, Array</p>
                                <p><strong>Note:</strong> Your code should return a value</p>
                            </div>
                        </div>
                    </div>
                `;
                
            default:
                return `
                    <div class="bg-gray-700 rounded-lg p-4" style="background: #f9fafb; border-radius: 8px;">
                        <h3 class="font-medium mb-4" style="color: var(--text-primary);">Node Configuration</h3>
                        <p class="text-sm text-gray-500">No specific configuration available for this node type.</p>
                    </div>
                `;
        }
    }
    
    // **修正**: Enhanced event setup with proper timing and error handling
    setupPropertyPanelEvents() {
        try {
            // **修正**: More robust element cleanup
            const existingElements = ['node-label', 'connect-nodes-btn', 'delete-node-btn', 'duplicate-node-btn', 'output-ports-count'];
            existingElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    // Clone to remove existing event listeners
                    const newElement = element.cloneNode(true);
                    element.parentNode.replaceChild(newElement, element);
                }
            });
            
            // Basic events
            this.setupBasicEvents();
            
            // Node type specific events
            if (this.editor.selectedNode) {
                this.setupNodeTypeSpecificEvents(this.editor.selectedNode.type);
            }
            
        } catch (error) {
            window.debugMonitor?.logError('Error setting up property panel events', { error: error.message, stack: error.stack });
        }
    }
    
    // **修正**: Separate basic events setup
    setupBasicEvents() {
        // Node label input
        const labelInput = document.getElementById('node-label');
        if (labelInput) {
            labelInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'label', e.target.value);
            });
        }
        
        // **修正**: Output ports configuration
        const outputPortsSelect = document.getElementById('output-ports-count');
        if (outputPortsSelect) {
            outputPortsSelect.addEventListener('change', (e) => {
                const newCount = parseInt(e.target.value);
                this.editor.updateNodeData(this.editor.selectedNode.id, 'outputPorts', newCount);
                // **修正**: Force property panel refresh to show updated port count
                setTimeout(() => {
                    this.updatePropertyPanel();
                }, 100);
            });
        }
        
        // Connection button
        const connectBtn = document.getElementById('connect-nodes-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.editor.handleConnectNodesFromPanel();
            });
        }
        
        // **修正**: Duplicate node button
        const duplicateBtn = document.getElementById('duplicate-node-btn');
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => {
                if (this.editor.selectedNode) {
                    this.editor.duplicateNode(this.editor.selectedNode);
                }
            });
        }
        
        // Delete node button
        const deleteNodeBtn = document.getElementById('delete-node-btn');
        if (deleteNodeBtn) {
            deleteNodeBtn.addEventListener('click', () => {
                this.editor.deleteSelectedNode();
            });
        }
    }
    
    // **修正**: Separate node-type specific events
    setupNodeTypeSpecificEvents(nodeType) {
        switch (nodeType) {
            case 'llm':
                this.setupLLMEvents();
                break;
            case 'input':
                this.setupInputEvents();
                break;
            case 'branch':
                this.setupBranchEvents();
                break;
            case 'filter':
                this.setupFilterEvents();
                break;
            case 'custom':
                this.setupCustomEvents();
                break;
        }
    }
    
    setupLLMEvents() {
        const elements = {
            modelSelect: document.getElementById('llm-model'),
            tempSlider: document.getElementById('llm-temperature'),
            tempValue: document.getElementById('temperature-value'),
            maxTokensInput: document.getElementById('llm-max-tokens'),
            systemPromptInput: document.getElementById('llm-system-prompt'),
            userPromptInput: document.getElementById('llm-user-prompt'),
            testApiBtn: document.getElementById('test-api-btn')
        };
        
        if (elements.modelSelect) {
            elements.modelSelect.addEventListener('change', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'model', e.target.value);
            });
        }
        
        if (elements.tempSlider && elements.tempValue) {
            elements.tempSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                elements.tempValue.textContent = value;
                this.editor.updateNodeData(this.editor.selectedNode.id, 'temperature', value);
            });
        }
        
        if (elements.maxTokensInput) {
            elements.maxTokensInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'maxTokens', parseInt(e.target.value));
            });
        }
        
        if (elements.systemPromptInput) {
            elements.systemPromptInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'systemPrompt', e.target.value);
            });
        }
        
        if (elements.userPromptInput) {
            elements.userPromptInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'userPrompt', e.target.value);
            });
        }
        
        if (elements.testApiBtn) {
            elements.testApiBtn.addEventListener('click', () => {
                this.editor.testAPIConnection();
            });
        }
    }
    
    setupInputEvents() {
        const inputTypeSelect = document.getElementById('input-type');
        const placeholderInput = document.getElementById('input-placeholder');
        const defaultValueInput = document.getElementById('input-default-value');
        
        if (inputTypeSelect) {
            inputTypeSelect.addEventListener('change', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'inputType', e.target.value);
            });
        }
        
        if (placeholderInput) {
            placeholderInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'placeholder', e.target.value);
            });
        }
        
        if (defaultValueInput) {
            defaultValueInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'defaultValue', e.target.value);
            });
        }
    }
    
    setupBranchEvents() {
        const conditionSelect = document.getElementById('branch-condition');
        const valueInput = document.getElementById('branch-value');
        const caseSensitiveCheck = document.getElementById('branch-case-sensitive');
        
        if (conditionSelect) {
            conditionSelect.addEventListener('change', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'condition', e.target.value);
            });
        }
        
        if (valueInput) {
            valueInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'value', e.target.value);
            });
        }
        
        if (caseSensitiveCheck) {
            caseSensitiveCheck.addEventListener('change', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'caseSensitive', e.target.checked);
            });
        }
    }
    
    setupFilterEvents() {
        const filterTypeSelect = document.getElementById('filter-type');
        const filterValueInput = document.getElementById('filter-value');
        const caseSensitiveCheck = document.getElementById('filter-case-sensitive');
        
        if (filterTypeSelect) {
            filterTypeSelect.addEventListener('change', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'filterType', e.target.value);
            });
        }
        
        if (filterValueInput) {
            filterValueInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'filterValue', e.target.value);
            });
        }
        
        if (caseSensitiveCheck) {
            caseSensitiveCheck.addEventListener('change', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'caseSensitive', e.target.checked);
            });
        }
    }
    
    setupCustomEvents() {
        const customCodeInput = document.getElementById('custom-code');
        
        if (customCodeInput) {
            customCodeInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'customCode', e.target.value);
            });
        }
    }

    updateWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcome-message');
        if (this.editor.workflow.nodes.length === 0) {
            welcomeMessage.style.display = 'block';
        } else {
            welcomeMessage.style.display = 'none';
        }
    }
    
    updateUI() {
        const paletteToggle = document.getElementById('toggle-palette');
        const propertiesToggle = document.getElementById('toggle-properties');
        
        if (paletteToggle) {
            paletteToggle.classList.toggle('active', this.editor.showPalette);
        }
        
        if (propertiesToggle) {
            propertiesToggle.classList.toggle('active', this.editor.showProperties);
        }
        
        const palette = document.getElementById('node-palette');
        const properties = document.getElementById('property-panel');
        
        if (palette) {
            palette.classList.toggle('hidden', !this.editor.showPalette);
        }
        
        if (properties) {
            properties.classList.toggle('hidden', !this.editor.showProperties);
        }
        
        const executeBtn = document.getElementById('execute-btn');
        if (executeBtn) {
            executeBtn.disabled = this.editor.isExecuting;
            executeBtn.textContent = this.editor.isExecuting ? 'Executing...' : 'Execute Workflow';
        }
        
        // **修正**: Update workflow stats
        const nodeCount = document.getElementById('node-count');
        const connectionCount = document.getElementById('connection-count');
        
        if (nodeCount) {
            nodeCount.textContent = this.editor.workflow.nodes.length;
        }
        
        if (connectionCount) {
            connectionCount.textContent = this.editor.workflow.connections.length;
        }
    }
    
    togglePalette() {
        this.editor.showPalette = !this.editor.showPalette;
        this.updateUI();
    }
    
    toggleProperties() {
        this.editor.showProperties = !this.editor.showProperties;
        this.updateUI();
    }
    
    closeProperties() {
        this.editor.showProperties = false;
        this.editor.selectedNode = null;
        this.updatePropertyPanel();
    }

    showConnectionModal(nodeId) {
        // Modal functionality (if needed in future)
        window.debugMonitor?.logUI('Show connection modal for node', { nodeId });
    }
    
    hideConnectionModal() {
        // Modal functionality (if needed in future)
        window.debugMonitor?.logUI('Hide connection modal');
    }
    
    confirmConnection(nodeId) {
        // Modal functionality (if needed in future)
        window.debugMonitor?.logUI('Confirm connection for node', { nodeId });
    }
    
    // **新機能**: ノードタイプに応じたポート設定を取得（他のクラスと同期）
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

    setupUIEventHandlers() {
        // Toggle palette button
        const togglePaletteBtn = document.getElementById('toggle-palette');
        if (togglePaletteBtn) {
            togglePaletteBtn.addEventListener('click', () => {
                this.editor.showPalette = !this.editor.showPalette;
                this.updateUI();
            });
        }

        // Toggle properties button
        const togglePropertiesBtn = document.getElementById('toggle-properties');
        if (togglePropertiesBtn) {
            togglePropertiesBtn.addEventListener('click', () => {
                this.editor.showProperties = !this.editor.showProperties;
                this.updateUI();
            });
        }

        // Close properties button
        const closePropertiesBtn = document.getElementById('close-properties');
        if (closePropertiesBtn) {
            closePropertiesBtn.addEventListener('click', () => {
                this.editor.showProperties = false;
                this.updateUI();
            });
        }

        // Execute workflow button
        const executeBtn = document.getElementById('execute-workflow');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.editor.executeWorkflow();
            });
        }
        
        // **新機能**: 保存・コピー・読み込み・クリア機能のイベントハンドラー
        
        // Manual save button
        const saveBtn = document.getElementById('save-workflow');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                window.debugMonitor?.logUI('Manual save button clicked');
                const success = this.editor.manualSave();
                if (success) {
                    this.showSaveIndicator();
                }
            });
        }
        
        // Copy workflow button
        const copyBtn = document.getElementById('copy-workflow');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                window.debugMonitor?.logUI('Copy workflow button clicked');
                this.editor.copyWorkflowToClipboard();
            });
        }
        
        // Manual load button
        const loadBtn = document.getElementById('load-workflow');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                window.debugMonitor?.logUI('Manual load button clicked');
                this.editor.loadFromJSONFile();
            });
        }
        
        // Clear workflow button
        const clearBtn = document.getElementById('clear-workflow');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.confirmAndClearWorkflow();
            });
        }

        window.debugMonitor?.logUI('UI event handlers set up successfully');
    }
    
    // **新機能**: ワークフロークリア確認ダイアログ
    confirmAndClearWorkflow() {
        const nodeCount = this.editor.workflow.nodes.length;
        const connectionCount = this.editor.workflow.connections.length;
        
        if (nodeCount === 0 && connectionCount === 0) {
            this.editor.showNotification('Workflow is already empty', 'info');
            return;
        }
        
        const confirmMessage = `Are you sure you want to clear the entire workflow?\n\nThis will delete:\n• ${nodeCount} nodes\n• ${connectionCount} connections\n\nThis action cannot be undone.`;
        
        if (confirm(confirmMessage)) {
            window.debugMonitor?.logUI('User confirmed workflow clear');
            this.clearWorkflow();
        } else {
            window.debugMonitor?.logUI('User cancelled workflow clear');
        }
    }
    
    clearWorkflow() {
        try {
            // Clear workflow data
            this.editor.workflow.nodes = [];
            this.editor.workflow.connections = [];
            this.editor.workflow.metadata.updatedAt = new Date();
            this.editor.selectedNode = null;
            this.editor.showProperties = false;
            
            // Clear UI
            this.editor.nodeManager.renderNodes();
            this.editor.connectionManager.renderConnections();
            this.updateWelcomeMessage();
            this.updateUI();
            
            // Clear from storage
            this.editor.clearWorkflowStorage();
            
            // Reset auto-save state
            this.editor.hasUnsavedChanges = false;
            
            window.debugMonitor?.logSuccess('Workflow cleared successfully');
            this.editor.showNotification('Workflow cleared successfully', 'success');
            
        } catch (error) {
            window.debugMonitor?.logError('Failed to clear workflow', { 
                error: error.message,
                stack: error.stack
            });
            this.editor.showNotification('Failed to clear workflow', 'error');
        }
    }
    
    // **新機能**: セーブインジケーター表示
    showSaveIndicator() {
        const saveBtn = document.getElementById('save-workflow');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            
            // Change to checkmark temporarily
            saveBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>Saved!</span>
            `;
            saveBtn.style.background = '#059669'; // Darker green
            
            // Revert after 2 seconds
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.style.background = '#10B981'; // Original green
            }, 2000);
        }
    }
}

window.UIManager = UIManager;