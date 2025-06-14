// UI Manager Module
// Handles all user interface elements including property panels, node palette, and modals

class UIManager {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
    }

    renderNodePalette() {
        const container = document.getElementById('node-types');
        container.innerHTML = '';
        
        this.editor.nodeTypes.forEach(nodeType => {
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
            
            // Add event listeners
            item.addEventListener('dragstart', (e) => this.editor.handleDragStart(e, nodeType.type));
            item.addEventListener('click', () => this.editor.addNode(nodeType.type, { x: 100, y: 100 }));
            
            container.appendChild(item);
        });
    }

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
            
            // Update content based on node type
            content.innerHTML = this.getPropertyPanelContent(this.editor.selectedNode);
            
            // Add timeout to ensure DOM is updated before setting up events
            setTimeout(() => {
                this.setupPropertyPanelEvents();
            }, 0);
        } else {
            panel.classList.add('hidden');
            this.editor.showProperties = false;
        }
        
        this.updateUI();
    }
    
    getPropertyPanelContent(node) {
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        const outputConnections = this.editor.workflow.connections.filter(conn => conn.from === node.id);
        
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
                                    .filter(n => n.id !== node.id && this.editor.connectionManager.canConnect(node.id, n.id, 'output', 'input'))
                                    .map(n => `<option value="${n.id}">${n.data.label || n.type} (${n.id.substring(0, 8)}...)</option>`)
                                    .join('')}
                            </select>
                        </div>
                        
                        <button
                            id="connect-nodes-btn"
                            class="btn btn-primary w-full"
                            style="background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;"
                        >
                            Create Connection
                        </button>
                        
                        <!-- Connection Status -->
                        <div class="text-sm" style="color: var(--text-secondary);">
                            <div class="flex justify-between">
                                <span>Input connections:</span>
                                <span class="font-medium">${inputConnections.length}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Output connections:</span>
                                <span class="font-medium">${outputConnections.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Node Actions -->
                <div class="bg-gray-700 rounded-lg p-4" style="background: #fff1f1; border-radius: 8px;">
                    <h3 class="font-medium mb-4" style="color: var(--text-primary);">Node Actions</h3>
                    
                    <div class="space-y-3">
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
                            Or press <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">Delete</kbd> key
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
                                    class="form-range"
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
    
    setupPropertyPanelEvents() {
        // Clear any existing event listeners by cloning elements
        const content = document.getElementById('property-content');
        if (content) {
            const newContent = content.cloneNode(true);
            content.parentNode.replaceChild(newContent, content);
        }
        
        // Delete node button
        const deleteNodeBtn = document.getElementById('delete-node-btn');
        if (deleteNodeBtn) {
            deleteNodeBtn.addEventListener('click', () => {
                this.editor.deleteSelectedNode();
            });
        }
        
        // Node label input
        const labelInput = document.getElementById('node-label');
        if (labelInput) {
            labelInput.addEventListener('input', (e) => {
                this.editor.updateNodeData(this.editor.selectedNode.id, 'label', e.target.value);
            });
        }
        
        // Connection dropdown and button
        const connectBtn = document.getElementById('connect-nodes-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.editor.handleConnectNodesFromPanel();
            });
        }
        
        // LLM-specific events
        if (this.editor.selectedNode.type === 'llm') {
            const modelSelect = document.getElementById('llm-model');
            const tempSlider = document.getElementById('llm-temperature');
            const tempValue = document.getElementById('temperature-value');
            const maxTokensInput = document.getElementById('llm-max-tokens');
            const systemPromptInput = document.getElementById('llm-system-prompt');
            const userPromptInput = document.getElementById('llm-user-prompt');
            const testApiBtn = document.getElementById('test-api-btn');
            
            if (modelSelect) {
                modelSelect.addEventListener('change', (e) => {
                    this.editor.updateNodeData(this.editor.selectedNode.id, 'model', e.target.value);
                });
            }
            
            if (tempSlider && tempValue) {
                tempSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    tempValue.textContent = value;
                    this.editor.updateNodeData(this.editor.selectedNode.id, 'temperature', value);
                });
            }
            
            if (maxTokensInput) {
                maxTokensInput.addEventListener('input', (e) => {
                    this.editor.updateNodeData(this.editor.selectedNode.id, 'maxTokens', parseInt(e.target.value));
                });
            }
            
            if (systemPromptInput) {
                systemPromptInput.addEventListener('input', (e) => {
                    this.editor.updateNodeData(this.editor.selectedNode.id, 'systemPrompt', e.target.value);
                });
            }
            
            if (userPromptInput) {
                userPromptInput.addEventListener('input', (e) => {
                    this.editor.updateNodeData(this.editor.selectedNode.id, 'userPrompt', e.target.value);
                });
            }
            
            if (testApiBtn) {
                testApiBtn.addEventListener('click', () => {
                    this.editor.testAPIConnection();
                });
            }
        }
        
        // Input-specific events
        if (this.editor.selectedNode.type === 'input') {
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
        
        // Branch-specific events
        if (this.editor.selectedNode.type === 'branch') {
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
        
        // Filter-specific events
        if (this.editor.selectedNode.type === 'filter') {
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
        
        // Custom-specific events
        if (this.editor.selectedNode.type === 'custom') {
            const customCodeInput = document.getElementById('custom-code');
            
            if (customCodeInput) {
                customCodeInput.addEventListener('input', (e) => {
                    this.editor.updateNodeData(this.editor.selectedNode.id, 'customCode', e.target.value);
                });
            }
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
        // Update toolbar button states
        const paletteToggle = document.getElementById('toggle-palette');
        const propertiesToggle = document.getElementById('toggle-properties');
        
        if (paletteToggle) {
            paletteToggle.classList.toggle('active', this.editor.showPalette);
        }
        
        if (propertiesToggle) {
            propertiesToggle.classList.toggle('active', this.editor.showProperties);
        }
        
        // Update panel visibility
        const palette = document.getElementById('node-palette');
        const properties = document.getElementById('property-panel');
        
        if (palette) {
            palette.classList.toggle('hidden', !this.editor.showPalette);
        }
        
        if (properties) {
            properties.classList.toggle('hidden', !this.editor.showProperties);
        }
        
        // Update execution button state
        const executeBtn = document.getElementById('execute-btn');
        if (executeBtn) {
            executeBtn.disabled = this.editor.isExecuting;
            executeBtn.textContent = this.editor.isExecuting ? 'Executing...' : 'Execute Workflow';
        }
        
        // Update workflow status
        const workflowName = document.getElementById('workflow-name');
        if (workflowName) {
            workflowName.textContent = this.editor.workflow.name;
        }
        
        // Update node and connection counts
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
        const modal = document.getElementById('connection-modal');
        const nodeSelect = document.getElementById('connection-target');
        const currentNode = this.editor.workflow.nodes.find(node => node.id === nodeId);
        
        if (!modal || !nodeSelect || !currentNode) return;
        
        // Clear existing options
        nodeSelect.innerHTML = '<option value="">Select target node...</option>';
        
        // Add available nodes as options
        this.editor.workflow.nodes
            .filter(node => node.id !== nodeId) // Exclude current node
            .forEach(node => {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = `${node.data.label || node.type} (${node.id.substring(0, 8)}...)`;
                nodeSelect.appendChild(option);
            });
        
        // Store the source node ID
        modal.dataset.sourceNodeId = nodeId;
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('visible');
        
        // Set up close handlers
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-connection');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('visible');
        };
        
        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;
        if (backdrop) backdrop.onclick = closeModal;
        
        // Set up confirm handler
        const confirmBtn = modal.querySelector('.confirm-connection');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmConnection(nodeId);
        }
    }
    
    hideConnectionModal() {
        const modal = document.getElementById('connection-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('visible');
        }
    }
    
    confirmConnection(sourceNodeId) {
        const nodeSelect = document.getElementById('connection-target');
        const targetNodeId = nodeSelect?.value;
        
        if (!targetNodeId) {
            alert('Please select a target node.');
            return;
        }
        
        // Create the connection
        const success = this.editor.connectNodes(sourceNodeId, targetNodeId);
        
        if (success) {
            this.hideConnectionModal();
            // Optionally show success message
            // alert('Connection created successfully!');
        } else {
            alert('Failed to create connection. Connection may already exist.');
        }
    }
}

// Export for use in main workflow editor
window.UIManager = UIManager; 