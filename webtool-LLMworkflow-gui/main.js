// LLM Workflow Editor - Vanilla JavaScript Implementation
// Converted from React to static HTML/JS

class WorkflowEditor {
    constructor() {
        this.workflow = {
            id: 'default',
            name: 'New Workflow',
            nodes: [],
            connections: [],
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                version: '1.0.0'
            }
        };
        
        this.selectedNode = null;
        this.isExecuting = false;
        this.executionResults = {};
        this.showPalette = true;
        this.showProperties = false;
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            draggedNode: null,
            dragOffset: { x: 0, y: 0 },
            connecting: null,
            mousePosition: { x: 0, y: 0 }
        };
        
        this.nodeTypes = [
            {
                type: 'input',
                label: 'Input',
                description: 'Starting point for data input',
                color: 'icon-input',
                icon: this.getIcon('input')
            },
            {
                type: 'llm',
                label: 'LLM Process',
                description: 'AI language model processing',
                color: 'icon-llm',
                icon: this.getIcon('llm')
            },
            {
                type: 'branch',
                label: 'Branch',
                description: 'Conditional logic branching',
                color: 'icon-branch',
                icon: this.getIcon('branch')
            },
            {
                type: 'merge',
                label: 'Merge',
                description: 'Combine multiple inputs',
                color: 'icon-merge',
                icon: this.getIcon('merge')
            },
            {
                type: 'filter',
                label: 'Filter',
                description: 'Filter and transform data',
                color: 'icon-filter',
                icon: this.getIcon('filter')
            },
            {
                type: 'loop',
                label: 'Loop',
                description: 'Repeat operations',
                color: 'icon-loop',
                icon: this.getIcon('loop')
            },
            {
                type: 'custom',
                label: 'Custom',
                description: 'Custom processing logic',
                color: 'icon-custom',
                icon: this.getIcon('custom')
            },
            {
                type: 'output',
                label: 'Output',
                description: 'Final output destination',
                color: 'icon-output',
                icon: this.getIcon('output')
            }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.renderNodePalette();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Toolbar events
        document.getElementById('execute-btn').addEventListener('click', () => this.executeWorkflow());
        document.getElementById('save-btn').addEventListener('click', () => this.saveWorkflow());
        document.getElementById('load-input').addEventListener('change', (e) => this.loadWorkflow(e));
        document.getElementById('export-btn').addEventListener('click', () => this.toggleExportMenu());
        document.getElementById('toggle-palette').addEventListener('click', () => this.togglePalette());
        document.getElementById('toggle-properties').addEventListener('click', () => this.toggleProperties());
        document.getElementById('close-properties').addEventListener('click', () => this.closeProperties());
        
        // Export menu events
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportWorkflow(format);
                this.hideExportMenu();
            });
        });
        
        // Canvas events
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('drop', (e) => this.handleDrop(e));
        canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
        document.addEventListener('mouseup', () => this.handleGlobalMouseUp());
        
        // Hide export menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#export-btn') && !e.target.closest('#export-menu')) {
                this.hideExportMenu();
            }
        });
    }
    
    getIcon(type) {
        const icons = {
            input: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>',
            llm: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
            branch: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
            merge: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
            filter: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>',
            loop: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
            custom: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>',
            output: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>'
        };
        return icons[type] || icons.custom;
    }
    
    renderNodePalette() {
        const container = document.getElementById('node-types');
        container.innerHTML = '';
        
        this.nodeTypes.forEach(nodeType => {
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
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, nodeType.type));
            item.addEventListener('click', () => this.addNode(nodeType.type, { x: 100, y: 100 }));
            
            container.appendChild(item);
        });
    }
    
    addNode(nodeType, position) {
        const newNode = {
            id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: nodeType,
            position: position,
            data: this.getDefaultNodeData(nodeType)
        };
        
        this.workflow.nodes.push(newNode);
        this.workflow.metadata.updatedAt = new Date();
        
        this.renderNodes();
        this.updateWelcomeMessage();
    }
    
    getDefaultNodeData(nodeType) {
        const defaults = {
            input: {
                label: 'Input Node',
                inputType: 'text',
                defaultValue: '',
                required: true
            },
            llm: {
                label: 'LLM Process',
                model: 'gpt-3.5-turbo',
                prompt: '',
                temperature: 0.7,
                maxTokens: 1000,
                retryCount: 1
            },
            branch: {
                label: 'Branch Node',
                conditionType: 'simple',
                condition: '',
                trueLabel: 'True',
                falseLabel: 'False'
            },
            merge: {
                label: 'Merge Node',
                mergeStrategy: 'concat',
                separator: '\n'
            },
            filter: {
                label: 'Filter Node',
                filterType: 'contains',
                filterValue: ''
            },
            loop: {
                label: 'Loop Node',
                maxIterations: 10,
                breakCondition: ''
            },
            output: {
                label: 'Output Node',
                outputFormat: 'json',
                destination: 'display'
            },
            custom: {
                label: 'Custom Node',
                customLogic: '',
                parameters: '{}',
                executionMode: 'sync',
                retryCount: 1,
                timeout: 5000
            }
        };
        
        return defaults[nodeType] || { label: 'Unknown Node' };
    }
    
    renderNodes() {
        const container = document.getElementById('nodes-container');
        container.innerHTML = '';
        
        this.workflow.nodes.forEach(node => {
            const nodeElement = this.createNodeElement(node);
            container.appendChild(nodeElement);
        });
        
        this.renderConnections();
    }
    
    createNodeElement(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `workflow-node node-${node.type} ${this.selectedNode?.id === node.id ? 'selected' : ''}`;
        nodeElement.style.left = `${node.position.x}px`;
        nodeElement.style.top = `${node.position.y}px`;
        nodeElement.dataset.nodeId = node.id;
        
        const nodeType = this.nodeTypes.find(t => t.type === node.type);
        const iconColorClass = {
            input: 'text-green-400',
            llm: 'text-blue-400',
            branch: 'text-yellow-400',
            merge: 'text-purple-400',
            filter: 'text-orange-400',
            loop: 'text-cyan-400',
            custom: 'text-gray-400',
            output: 'text-red-400'
        };
        
        nodeElement.innerHTML = `
            <!-- Header -->
            <div class="p-3 border-b border-gray-700">
                <div class="flex items-center space-x-3">
                    <div class="p-2 rounded-lg bg-gray-700 ${iconColorClass[node.type]}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${nodeType.icon}
                        </svg>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-white font-medium text-sm">
                            ${node.data.label || node.type.charAt(0).toUpperCase() + node.type.slice(1)}
                        </h3>
                        <p class="text-gray-400 text-xs">
                            ${this.getNodeDescription(node.type)}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="p-3">
                ${this.getNodeContent(node)}
            </div>

            <!-- Connection Ports -->
            ${node.type !== 'input' ? `
                <div class="connection-port input" data-node-id="${node.id}" data-port="input">
                    <svg class="w-2 h-2 text-transparent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                </div>
            ` : ''}
            
            ${node.type !== 'output' ? `
                <div class="connection-port output" data-node-id="${node.id}" data-port="output">
                    <svg class="w-2 h-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            ` : ''}
            
            <!-- Status Indicator -->
            ${node.data.status ? `
                <div class="status-indicator status-${node.data.status}"></div>
            ` : ''}
        `;
        
        // Add event listeners
        nodeElement.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, node));
        nodeElement.addEventListener('click', (e) => this.handleNodeClick(e, node));
        
        // Connection port events
        const inputPort = nodeElement.querySelector('.connection-port.input');
        const outputPort = nodeElement.querySelector('.connection-port.output');
        
        if (inputPort) {
            inputPort.addEventListener('click', (e) => this.handlePortClick(e, node.id, 'input'));
        }
        
        if (outputPort) {
            outputPort.addEventListener('click', (e) => this.handlePortClick(e, node.id, 'output'));
        }
        
        return nodeElement;
    }
    
    getNodeDescription(type) {
        const descriptions = {
            input: 'Data Input',
            llm: 'AI Processing',
            branch: 'Conditional Logic',
            merge: 'Data Merge',
            filter: 'Data Filter',
            loop: 'Loop Operation',
            custom: 'Custom Logic',
            output: 'Data Output'
        };
        return descriptions[type] || 'Unknown';
    }
    
    getNodeContent(node) {
        switch (node.type) {
            case 'llm':
                return `
                    <div class="text-xs text-gray-300">
                        <div class="mb-1">Model: ${node.data.model || 'gpt-3.5-turbo'}</div>
                        <div class="text-gray-400 truncate">
                            ${node.data.prompt ? `"${node.data.prompt.substring(0, 30)}..."` : 'No prompt set'}
                        </div>
                    </div>
                `;
            case 'input':
                return `
                    <div class="text-xs text-gray-300">
                        Input: ${node.data.inputType || 'text'}
                    </div>
                `;
            case 'output':
                return `
                    <div class="text-xs text-gray-300">
                        Format: ${node.data.outputFormat || 'json'}
                    </div>
                `;
            case 'branch':
                return `
                    <div class="text-xs text-gray-300">
                        Condition: ${node.data.condition || 'Not set'}
                    </div>
                `;
            default:
                return `
                    <div class="text-xs text-gray-300">
                        ${node.data.description || 'No description'}
                    </div>
                `;
        }
    }
    
    renderConnections() {
        const svg = document.getElementById('connections-svg');
        svg.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6"/>
                </marker>
            </defs>
        `;
        
        this.workflow.connections.forEach((connection, index) => {
            const fromNode = this.workflow.nodes.find(n => n.id === connection.from);
            const toNode = this.workflow.nodes.find(n => n.id === connection.to);
            
            if (fromNode && toNode) {
                const path = this.createConnectionPath(
                    { x: fromNode.position.x + 200, y: fromNode.position.y + 40 },
                    { x: toNode.position.x, y: toNode.position.y + 40 }
                );
                svg.appendChild(path);
            }
        });
        
        // Render temporary connection if connecting
        if (this.dragState.connecting) {
            const fromNode = this.workflow.nodes.find(n => n.id === this.dragState.connecting.fromNodeId);
            if (fromNode) {
                const path = this.createConnectionPath(
                    { x: fromNode.position.x + 200, y: fromNode.position.y + 40 },
                    this.dragState.mousePosition,
                    true
                );
                svg.appendChild(path);
            }
        }
    }
    
    createConnectionPath(from, to, temporary = false) {
        const dx = to.x - from.x;
        const controlPointOffset = Math.max(Math.abs(dx) * 0.5, 50);
        const controlPoint1 = { x: from.x + controlPointOffset, y: from.y };
        const controlPoint2 = { x: to.x - controlPointOffset, y: to.y };
        
        const pathData = `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${to.x} ${to.y}`;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.className = 'connection';
        
        // Shadow line
        const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shadowPath.setAttribute('d', pathData);
        shadowPath.setAttribute('stroke', 'rgba(0, 0, 0, 0.3)');
        shadowPath.setAttribute('stroke-width', '4');
        shadowPath.setAttribute('fill', 'none');
        shadowPath.className = 'pointer-events-none';
        
        // Main line
        const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainPath.setAttribute('d', pathData);
        mainPath.setAttribute('stroke', temporary ? '#60A5FA' : '#3B82F6');
        mainPath.setAttribute('stroke-width', '2');
        mainPath.setAttribute('fill', 'none');
        mainPath.setAttribute('marker-end', 'url(#arrowhead)');
        mainPath.className = `transition-all duration-200 ${temporary ? 'animate-pulse' : ''}`;
        
        g.appendChild(shadowPath);
        g.appendChild(mainPath);
        
        return g;
    }
    
    // Event Handlers
    handleDragStart(e, nodeType) {
        e.dataTransfer.setData('nodeType', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
    }
    
    handleDrop(e) {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (nodeType) {
            const rect = e.currentTarget.getBoundingClientRect();
            const position = {
                x: e.clientX - rect.left - this.dragState.dragOffset.x,
                y: e.clientY - rect.top - this.dragState.dragOffset.y
            };
            this.addNode(nodeType, position);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    handleCanvasClick(e) {
        if (e.target.id === 'canvas') {
            this.selectNode(null);
            this.dragState.connecting = null;
            this.renderConnections();
        }
    }
    
    handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        this.dragState.mousePosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        if (this.dragState.connecting) {
            this.renderConnections();
        }
    }
    
    handleNodeMouseDown(e, node) {
        e.stopPropagation();
        this.dragState.isDragging = true;
        this.dragState.draggedNode = node;
        this.dragState.dragOffset = {
            x: e.clientX - node.position.x,
            y: e.clientY - node.position.y
        };
        this.selectNode(node);
        
        const nodeElement = e.currentTarget;
        nodeElement.classList.add('dragging');
    }
    
    handleNodeClick(e, node) {
        e.stopPropagation();
        this.selectNode(node);
    }
    
    handlePortClick(e, nodeId, portType) {
        e.stopPropagation();
        
        if (portType === 'output') {
            this.dragState.connecting = { fromNodeId: nodeId, fromPort: 'output' };
        } else if (portType === 'input' && this.dragState.connecting) {
            this.connectNodes(this.dragState.connecting.fromNodeId, nodeId);
            this.dragState.connecting = null;
            this.renderConnections();
        }
    }
    
    handleGlobalMouseMove(e) {
        if (this.dragState.isDragging && this.dragState.draggedNode) {
            const newPosition = {
                x: e.clientX - this.dragState.dragOffset.x,
                y: e.clientY - this.dragState.dragOffset.y
            };
            this.updateNodePosition(this.dragState.draggedNode.id, newPosition);
        }
    }
    
    handleGlobalMouseUp() {
        if (this.dragState.isDragging) {
            this.dragState.isDragging = false;
            this.dragState.draggedNode = null;
            
            // Remove dragging class from all nodes
            document.querySelectorAll('.workflow-node.dragging').forEach(node => {
                node.classList.remove('dragging');
            });
        }
    }
    
    // Core Methods
    selectNode(node) {
        this.selectedNode = node;
        this.renderNodes();
        this.updatePropertyPanel();
        this.updateUI();
    }
    
    updateNodePosition(nodeId, position) {
        const node = this.workflow.nodes.find(n => n.id === nodeId);
        if (node) {
            node.position = position;
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.style.left = `${position.x}px`;
                nodeElement.style.top = `${position.y}px`;
            }
            this.renderConnections();
        }
    }
    
    connectNodes(fromId, toId) {
        // Check if connection already exists
        const connectionExists = this.workflow.connections.some(
            conn => conn.from === fromId && conn.to === toId
        );
        
        if (!connectionExists) {
            const newConnection = {
                id: `conn_${Date.now()}`,
                from: fromId,
                to: toId
            };
            this.workflow.connections.push(newConnection);
            this.workflow.metadata.updatedAt = new Date();
        }
    }
    
    updatePropertyPanel() {
        const panel = document.getElementById('property-panel');
        const badge = document.getElementById('node-type-badge');
        const content = document.getElementById('property-content');
        
        if (this.selectedNode) {
            this.showProperties = true;
            panel.classList.remove('hidden');
            
            // Update badge
            badge.innerHTML = `
                <div class="bg-gray-700 rounded-lg p-3">
                    <div class="text-sm font-medium text-white mb-1">
                        ${this.selectedNode.type.charAt(0).toUpperCase() + this.selectedNode.type.slice(1)} Node
                    </div>
                    <div class="text-xs text-gray-400">
                        ID: ${this.selectedNode.id.substring(0, 8)}...
                    </div>
                </div>
            `;
            
            // Update content based on node type
            content.innerHTML = this.getPropertyPanelContent(this.selectedNode);
            this.setupPropertyPanelEvents();
        } else {
            panel.classList.add('hidden');
            this.showProperties = false;
        }
        
        this.updateUI();
    }
    
    getPropertyPanelContent(node) {
        // This is a simplified version - you can expand this based on node type
        return `
            <div class="p-4 space-y-4">
                <div class="bg-gray-700 rounded-lg p-4">
                    <h3 class="text-white font-medium mb-4">Basic Configuration</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
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
                        
                        ${this.getNodeSpecificFields(node)}
                    </div>
                </div>
            </div>
        `;
    }
    
    getNodeSpecificFields(node) {
        switch (node.type) {
            case 'llm':
                return `
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            AI Model
                        </label>
                        <select id="node-model" class="form-select">
                            <option value="gpt-4" ${node.data.model === 'gpt-4' ? 'selected' : ''}>gpt-4</option>
                            <option value="gpt-3.5-turbo" ${node.data.model === 'gpt-3.5-turbo' ? 'selected' : ''}>gpt-3.5-turbo</option>
                            <option value="claude-3-opus" ${node.data.model === 'claude-3-opus' ? 'selected' : ''}>claude-3-opus</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            System Prompt
                        </label>
                        <textarea
                            id="node-prompt"
                            rows="6"
                            class="form-textarea"
                            placeholder="Enter your prompt here..."
                        >${node.data.prompt || ''}</textarea>
                    </div>
                `;
            
            case 'input':
                return `
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Input Type
                        </label>
                        <select id="node-input-type" class="form-select">
                            <option value="text" ${node.data.inputType === 'text' ? 'selected' : ''}>Text</option>
                            <option value="number" ${node.data.inputType === 'number' ? 'selected' : ''}>Number</option>
                            <option value="json" ${node.data.inputType === 'json' ? 'selected' : ''}>JSON Object</option>
                        </select>
                    </div>
                `;
            
            default:
                return '';
        }
    }
    
    setupPropertyPanelEvents() {
        const labelInput = document.getElementById('node-label');
        if (labelInput) {
            labelInput.addEventListener('input', (e) => {
                this.updateNodeData(this.selectedNode.id, 'label', e.target.value);
            });
        }
        
        const modelSelect = document.getElementById('node-model');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.updateNodeData(this.selectedNode.id, 'model', e.target.value);
            });
        }
        
        const promptTextarea = document.getElementById('node-prompt');
        if (promptTextarea) {
            promptTextarea.addEventListener('input', (e) => {
                this.updateNodeData(this.selectedNode.id, 'prompt', e.target.value);
            });
        }
        
        const inputTypeSelect = document.getElementById('node-input-type');
        if (inputTypeSelect) {
            inputTypeSelect.addEventListener('change', (e) => {
                this.updateNodeData(this.selectedNode.id, 'inputType', e.target.value);
            });
        }
    }
    
    updateNodeData(nodeId, field, value) {
        const node = this.workflow.nodes.find(n => n.id === nodeId);
        if (node) {
            node.data[field] = value;
            this.workflow.metadata.updatedAt = new Date();
            this.renderNodes(); // Re-render to show updated data
        }
    }
    
    updateWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcome-message');
        if (this.workflow.nodes.length === 0) {
            welcomeMessage.style.display = 'flex';
        } else {
            welcomeMessage.style.display = 'none';
        }
    }
    
    updateUI() {
        // Update toggle buttons
        const paletteBtn = document.getElementById('toggle-palette');
        const propertiesBtn = document.getElementById('toggle-properties');
        const palette = document.getElementById('node-palette');
        const propertyPanel = document.getElementById('property-panel');
        
        if (this.showPalette) {
            paletteBtn.className = paletteBtn.className.replace('bg-gray-700 hover:bg-gray-600 text-gray-300', 'bg-blue-600 hover:bg-blue-700 text-white');
            palette.style.display = 'block';
        } else {
            paletteBtn.className = paletteBtn.className.replace('bg-blue-600 hover:bg-blue-700 text-white', 'bg-gray-700 hover:bg-gray-600 text-gray-300');
            palette.style.display = 'none';
        }
        
        if (this.showProperties && this.selectedNode) {
            propertiesBtn.className = propertiesBtn.className.replace('bg-gray-700 hover:bg-gray-600 text-gray-300', 'bg-blue-600 hover:bg-blue-700 text-white');
            propertyPanel.classList.remove('hidden');
        } else {
            propertiesBtn.className = propertiesBtn.className.replace('bg-blue-600 hover:bg-blue-700 text-white', 'bg-gray-700 hover:bg-gray-600 text-gray-300');
            propertyPanel.classList.add('hidden');
        }
        
        // Update execute button
        const executeBtn = document.getElementById('execute-btn');
        if (this.isExecuting) {
            executeBtn.disabled = true;
            executeBtn.innerHTML = `
                <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Running...</span>
            `;
        } else {
            executeBtn.disabled = this.workflow.nodes.length === 0;
            executeBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M9 6h1m4 0h1"/>
                </svg>
                <span>Execute</span>
            `;
        }
    }
    
    // UI Toggle Methods
    togglePalette() {
        this.showPalette = !this.showPalette;
        this.updateUI();
    }
    
    toggleProperties() {
        if (this.selectedNode) {
            this.showProperties = !this.showProperties;
            this.updateUI();
        }
    }
    
    closeProperties() {
        this.selectNode(null);
    }
    
    toggleExportMenu() {
        const menu = document.getElementById('export-menu');
        menu.classList.toggle('show');
    }
    
    hideExportMenu() {
        const menu = document.getElementById('export-menu');
        menu.classList.remove('show');
    }
    
    // File Operations
    saveWorkflow() {
        try {
            const workflowData = JSON.stringify(this.workflow, null, 2);
            const blob = new Blob([workflowData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.workflow.name || 'workflow'}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to save workflow:', error);
            alert('Failed to save workflow');
        }
    }
    
    loadWorkflow(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workflowData = JSON.parse(e.target.result);
                    this.workflow = workflowData;
                    this.selectedNode = null;
                    this.renderNodes();
                    this.updateWelcomeMessage();
                    this.updateUI();
                } catch (error) {
                    console.error('Failed to load workflow:', error);
                    alert('Failed to load workflow: Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    }
    
    exportWorkflow(format) {
        let content, filename, mimeType;
        
        switch (format) {
            case 'json':
                content = JSON.stringify(this.workflow, null, 2);
                filename = `${this.workflow.name || 'workflow'}.json`;
                mimeType = 'application/json';
                break;
                
            case 'js':
                content = this.generateJavaScriptCode();
                filename = `${this.workflow.name || 'workflow'}.js`;
                mimeType = 'application/javascript';
                break;
                
            default:
                console.error('Unsupported export format:', format);
                return;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    generateJavaScriptCode() {
        let code = `// Generated workflow: ${this.workflow.name}\n`;
        code += `// Generated on: ${new Date().toISOString()}\n\n`;
        
        code += `async function executeWorkflow(input) {\n`;
        code += `  const results = {};\n`;
        code += `  const errors = [];\n\n`;
        
        // Generate code for each node
        const sortedNodes = this.topologicalSort();
        
        sortedNodes.forEach(node => {
            code += `  // ${node.type.toUpperCase()} Node: ${node.data.label || node.id}\n`;
            
            switch (node.type) {
                case 'input':
                    code += `  results['${node.id}'] = input || ${JSON.stringify(node.data.defaultValue || '')};\n`;
                    break;
                
                case 'llm':
                    code += `  try {\n`;
                    code += `    const response = await callLLM({\n`;
                    code += `      model: '${node.data.model || 'gpt-3.5-turbo'}',\n`;
                    code += `      prompt: \`${node.data.prompt || ''}\`,\n`;
                    code += `      temperature: ${node.data.temperature || 0.7},\n`;
                    code += `      maxTokens: ${node.data.maxTokens || 1000}\n`;
                    code += `    });\n`;
                    code += `    results['${node.id}'] = response;\n`;
                    code += `  } catch (error) {\n`;
                    code += `    errors.push({ nodeId: '${node.id}', error });\n`;
                    code += `  }\n`;
                    break;
                
                case 'output':
                    code += `  results['${node.id}'] = formatOutput(results, '${node.data.outputFormat || 'json'}');\n`;
                    break;
                
                default:
                    code += `  results['${node.id}'] = processNode(${JSON.stringify(node.data)});\n`;
            }
            
            code += `\n`;
        });
        
        code += `  return { results, errors };\n`;
        code += `}\n\n`;
        
        // Add helper functions
        code += `// Helper functions\n`;
        code += `async function callLLM(config) {\n`;
        code += `  // Implement your LLM API call here\n`;
        code += `  throw new Error('LLM API not implemented');\n`;
        code += `}\n\n`;
        
        code += `function formatOutput(results, format) {\n`;
        code += `  switch (format) {\n`;
        code += `    case 'json': return JSON.stringify(results, null, 2);\n`;
        code += `    case 'text': return String(results);\n`;
        code += `    default: return results;\n`;
        code += `  }\n`;
        code += `}\n\n`;
        
        code += `function processNode(data) {\n`;
        code += `  // Implement custom node processing\n`;
        code += `  return data;\n`;
        code += `}\n`;
        
        return code;
    }
    
    topologicalSort() {
        const graph = new Map();
        const inDegree = new Map();
        
        // Initialize graph
        this.workflow.nodes.forEach(node => {
            graph.set(node.id, []);
            inDegree.set(node.id, 0);
        });
        
        // Build graph
        this.workflow.connections.forEach(conn => {
            graph.get(conn.from).push(conn.to);
            inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
        });
        
        // Topological sort using Kahn's algorithm
        const queue = [];
        const result = [];
        
        // Find nodes with no incoming edges
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) {
                queue.push(nodeId);
            }
        });
        
        while (queue.length > 0) {
            const nodeId = queue.shift();
            const node = this.workflow.nodes.find(n => n.id === nodeId);
            result.push(node);
            
            // Remove edges from this node
            graph.get(nodeId).forEach(neighborId => {
                const newDegree = (inDegree.get(neighborId) || 0) - 1;
                inDegree.set(neighborId, newDegree);
                
                if (newDegree === 0) {
                    queue.push(neighborId);
                }
            });
        }
        
        return result;
    }
    
    // Workflow Execution
    async executeWorkflow() {
        this.isExecuting = true;
        this.updateUI();
        
        try {
            const results = {};
            const sortedNodes = this.topologicalSort();
            
            for (const node of sortedNodes) {
                // Update node status
                node.data.status = 'running';
                this.renderNodes();
                
                // Simulate processing delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Mock result based on node type
                results[node.id] = await this.executeNode(node, results);
                
                // Update node status
                node.data.status = 'completed';
                this.renderNodes();
            }
            
            this.executionResults = results;
            console.log('Workflow execution completed:', results);
            alert('Workflow executed successfully! Check console for results.');
            
        } catch (error) {
            console.error('Workflow execution failed:', error);
            alert('Workflow execution failed: ' + error.message);
        } finally {
            this.isExecuting = false;
            this.updateUI();
            
            // Clear status indicators after a delay
            setTimeout(() => {
                this.workflow.nodes.forEach(node => {
                    delete node.data.status;
                });
                this.renderNodes();
            }, 3000);
        }
    }
    
    async executeNode(node, previousResults) {
        // Mock node execution based on type
        switch (node.type) {
            case 'input':
                return node.data.defaultValue || 'Sample input data';
            
            case 'llm':
                // Simulate LLM API call
                return {
                    response: `Mock LLM response for prompt: "${node.data.prompt || 'No prompt'}"`,
                    model: node.data.model,
                    metadata: { tokens: 150, duration: 1200 }
                };
            
            case 'branch':
                // Simulate condition evaluation
                return {
                    condition: node.data.condition,
                    result: Math.random() > 0.5,
                    path: Math.random() > 0.5 ? node.data.trueLabel : node.data.falseLabel
                };
            
            case 'merge':
                // Simulate merging previous results
                return {
                    merged: 'Combined results from previous nodes',
                    strategy: node.data.mergeStrategy,
                    inputCount: Object.keys(previousResults).length
                };
            
            case 'output':
                return {
                    output: 'Final workflow output',
                    format: node.data.outputFormat,
                    timestamp: new Date().toISOString()
                };
            
            default:
                return {
                    result: `Processed by ${node.type} node`,
                    nodeId: node.id
                };
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.workflowEditor = new WorkflowEditor();
});