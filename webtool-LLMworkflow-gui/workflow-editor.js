// LLM Workflow Editor - Main Class - Bug Fixes
// 修正点: イベントハンドリング、接続状態管理、デリゲーションメソッドの改善

class WorkflowEditor {
    constructor() {
        window.debugMonitor?.logInit('WorkflowEditor constructor started');
        
        this.connections = [];
        this.nodes = [];
        
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
        
        window.debugMonitor?.logInit('Workflow data structure initialized', this.workflow);
        
        this.selectedNode = null;
        this.isExecuting = false;
        this.executionResults = {};
        this.showPalette = true;
        this.showProperties = false;
        
        // **新機能**: 自動保存設定
        this.autoSaveKey = 'llm-workflow-autosave';
        this.autoSaveInterval = 3000; // 3秒間隔
        this.autoSaveTimer = null;
        this.hasUnsavedChanges = false;
        
        // Canvas state for zoom and pan
        this.canvasState = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };
        
        window.debugMonitor?.logInit('Canvas state initialized', this.canvasState);
        
        // Canvas pan state
        this.canvasPanState = {
            isPanning: false,
            startX: 0,
            startY: 0,
            startTranslateX: 0,
            startTranslateY: 0
        };
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            draggedNode: null,
            dragOffset: { x: 0, y: 0 },
            connecting: null,
            mousePosition: { x: 0, y: 0 },
            temporaryConnection: null,
            hoveredPort: null,
            mouseDownTime: 0,
            mouseDownPos: { x: 0, y: 0 }
        };

        window.debugMonitor?.logInit('Drag and pan states initialized');

        // **修正**: Enhanced connection state with port index tracking
        this.connectionState = {
            isConnecting: false,
            sourceNode: null,
            sourcePort: null,
            sourcePortIndex: null,
            temporaryLine: null
        };
        
        window.debugMonitor?.logInit('Connection state initialized', this.connectionState);
        
        // **修正**: getIconメソッドを先に定義
        this.getIcon = (type) => {
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
        
        window.debugMonitor?.logInit(`Node types registered: ${this.nodeTypes.length} types`);
        
        // Initialize modules
        try {
            window.debugMonitor?.logInit('Initializing NodeManager...');
            this.nodeManager = new NodeManager(this);
            window.debugMonitor?.logSuccess('NodeManager initialized successfully');
            
            window.debugMonitor?.logInit('Initializing ConnectionManager...');
            this.connectionManager = new ConnectionManager(this);
            window.debugMonitor?.logSuccess('ConnectionManager initialized successfully');
            
            window.debugMonitor?.logInit('Initializing EventHandlers...');
            this.eventHandlers = new EventHandlers(this);
            window.debugMonitor?.logSuccess('EventHandlers initialized successfully');
            
            window.debugMonitor?.logInit('Initializing UIManager...');
            this.uiManager = new UIManager(this);
            window.debugMonitor?.logSuccess('UIManager initialized successfully');
            
            window.debugMonitor?.logInit('Initializing WorkflowExecutor...');
            this.workflowExecutor = new WorkflowExecutor(this);
            window.debugMonitor?.logSuccess('WorkflowExecutor initialized successfully');
            
        } catch (error) {
            window.debugMonitor?.logError('Module initialization failed', { error: error.message, stack: error.stack });
        }
        
        window.debugMonitor?.logInit('Initializing canvas...');
        this.initializeCanvas();
        window.debugMonitor?.logSuccess('Canvas initialized');
        
        window.debugMonitor?.logInit('Running final initialization...');
        this.initializeUI();
        
        // Load saved workflow after UI is initialized
        window.debugMonitor?.logInit('Loading saved workflow...');
        this.loadWorkflowFromStorage();
        
        window.debugMonitor?.logSuccess('WorkflowEditor initialization completed successfully');
    }
    
    initializeUI() {
        try {
            window.debugMonitor?.logInit('Initializing UI components...');
            
            // Initialize node palette
            if (this.uiManager && this.uiManager.renderNodePalette) {
                this.uiManager.renderNodePalette();
                window.debugMonitor?.logSuccess('Node palette rendered');
            }
            
            // Setup event handlers with additional safety check
            if (this.eventHandlers && this.eventHandlers.setupEventListeners) {
                try {
                    this.eventHandlers.setupEventListeners();
                    window.debugMonitor?.logSuccess('Event handlers setup');
                } catch (eventError) {
                    window.debugMonitor?.logWarning('Event handlers setup failed (expected in test environments): ' + eventError.message);
                    // Don't throw error in test environments - continue initialization
                }
            }
            
            // Update welcome message
            this.updateWelcomeMessage();
            
            window.debugMonitor?.logSuccess('UI initialization completed');
        } catch (error) {
            window.debugMonitor?.logError('UI initialization failed: ' + error.message);
            // In test environments, don't throw error to allow partial initialization
            if (typeof document !== 'undefined' && document.getElementById('canvas')) {
                throw error;
            } else {
                window.debugMonitor?.logWarning('Continuing with partial initialization in test environment');
            }
        }
    }
    
    initializeCanvas() {
        // Create layered structure
        const canvas = document.getElementById('canvas');
        
        if (!canvas) {
            window.debugMonitor?.logWarning('Canvas element not found - skipping canvas initialization');
            console.warn('Canvas element not found - this is expected in test environments');
            return;
        }
        
        window.debugMonitor?.logInit('Canvas element found, initializing...');
        
        // Check if connections-svg already exists (from HTML)
        let connectionsSVG = document.getElementById('connections-svg');
        if (!connectionsSVG) {
            // Create connections SVG if it doesn't exist
            connectionsSVG = this.connectionManager.createConnectionSVG();
            connectionsSVG.id = 'connections-svg';
            canvas.appendChild(connectionsSVG);
        } else {
            // Ensure existing SVG has proper attributes
            connectionsSVG.setAttribute("width", "100%");
            connectionsSVG.setAttribute("height", "100%");
            connectionsSVG.setAttribute("viewBox", "0 0 10000 10000");
            connectionsSVG.setAttribute("preserveAspectRatio", "xMidYMid meet");
            connectionsSVG.style.position = "absolute";
            connectionsSVG.style.top = "0";
            connectionsSVG.style.left = "0";
            connectionsSVG.style.pointerEvents = "none";
        }
        
        // Ensure nodes container exists
        let nodesContainer = document.getElementById('nodes-container');
        if (!nodesContainer) {
            nodesContainer = document.createElement('div');
            nodesContainer.id = 'nodes-container';
            nodesContainer.className = 'nodes-layer';
            canvas.appendChild(nodesContainer);
        }
    }
    
    init() {
        this.eventHandlers.setupEventListeners();
        this.uiManager.renderNodePalette();
        this.uiManager.updateUI();
        
        // **新機能**: UI イベントハンドラー設定
        this.uiManager.setupUIEventHandlers();
        
        // **新機能**: 自動保存の開始
        this.startAutoSave();
        
        // **新機能**: ページ離脱時の保存
        this.setupBeforeUnloadHandler();
    }
    
    // Node Manager Delegation
    generateNodeId(nodeType) {
        return this.nodeManager.generateNodeId(nodeType);
    }
    
    addNode(nodeType, position) {
        const node = this.nodeManager.addNode(nodeType, position);
        // **修正**: Force UI update after adding node
        requestAnimationFrame(() => {
            this.uiManager.updateWelcomeMessage();
        });
        return node;
    }
    
    getDefaultNodeData(nodeType) {
        return this.nodeManager.getDefaultNodeData(nodeType);
    }
    
    renderNodes() {
        return this.nodeManager.renderNodes();
    }
    
    updateNodePosition(nodeId, position) {
        return this.nodeManager.updateNodePosition(nodeId, position);
    }
    
    deleteSelectedNode() {
        const result = this.nodeManager.deleteSelectedNode();
        // **修正**: Force UI updates after deletion
        requestAnimationFrame(() => {
            this.uiManager.updatePropertyPanel();
            this.renderConnections();
        });
        return result;
    }
    
    duplicateNode(node) {
        return this.nodeManager.duplicateNode(node);
    }
    
    updateNodeData(nodeId, field, value) {
        this.nodeManager.updateNodeData(nodeId, field, value);
        // **修正**: Force property panel update for certain fields
        if (['label', 'outputPorts'].includes(field)) {
            requestAnimationFrame(() => {
                this.uiManager.updatePropertyPanel();
            });
        }
    }
    
    // Connection Manager Delegation
    renderConnections() {
        return this.connectionManager.renderConnections();
    }
    
    startConnection(nodeId, portType, portIndex = 0) {
        console.log('Starting connection:', { nodeId, portType, portIndex });
        return this.connectionManager.startConnection(nodeId, portType, portIndex);
    }
    
    completeConnection(targetNodeId, targetPortType, customSourceNodeId = null, customSourcePortType = null, customSourcePortIndex = 0) {
        const result = this.connectionManager.completeConnection(targetNodeId, targetPortType, customSourceNodeId, customSourcePortType, customSourcePortIndex);
        // **修正**: Force property panel update after connection
        requestAnimationFrame(() => {
            this.uiManager.updatePropertyPanel();
        });
        return result;
    }
    
    cancelConnection() {
        return this.connectionManager.cancelConnection();
    }
    
    canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType) {
        return this.connectionManager.canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType);
    }
    
    connectNodes(fromId, toId, fromPortIndex = 0) {
        const result = this.connectionManager.connectNodes(fromId, toId, fromPortIndex);
        // **修正**: Force property panel update after connection creation
        if (result) {
            requestAnimationFrame(() => {
                this.uiManager.updatePropertyPanel();
            });
        }
        return result;
    }
    
    handleConnectNodesFromPanel() {
        const result = this.connectionManager.handleConnectNodesFromPanel();
        // **修正**: Force property panel update
        requestAnimationFrame(() => {
            this.uiManager.updatePropertyPanel();
        });
        return result;
    }
    
    // Event Handler Delegation
    handleDragStart(e, nodeType) {
        return this.eventHandlers.handleDragStart(e, nodeType);
    }
    
    // **修正**: Enhanced port click handling with proper port index support
    handlePortClick(e, nodeId, portType, portIndex = 0) {
        console.log('Port click delegated to event handler:', { nodeId, portType, portIndex });
        return this.eventHandlers.handlePortClick(e, nodeId, portType, portIndex);
    }
    
    handlePortHover(e, nodeId, portType, isEntering) {
        return this.eventHandlers.handlePortHover(e, nodeId, portType, isEntering);
    }
    
    // UI Manager Delegation
    updatePropertyPanel() {
        return this.uiManager.updatePropertyPanel();
    }
    
    updateWelcomeMessage() {
        return this.uiManager.updateWelcomeMessage();
    }
    
    updateUI() {
        return this.uiManager.updateUI();
    }
    
    togglePalette() {
        return this.uiManager.togglePalette();
    }
    
    toggleProperties() {
        return this.uiManager.toggleProperties();
    }
    
    closeProperties() {
        return this.uiManager.closeProperties();
    }
    
    // Workflow Executor Delegation
    async executeWorkflow() {
        return await this.workflowExecutor.executeWorkflow();
    }
    
    async testAPIConnection() {
        return await this.workflowExecutor.testAPIConnection();
    }
    
    // **修正**: Enhanced Core Methods with better state management
    selectNode(node) {
        const previousNode = this.selectedNode;
        this.selectedNode = node;
        
        if (node) {
            this.showProperties = true;
            console.log(`Selected node: ${node.data.label || node.type} (${node.id.substring(0, 8)}...)`);
        } else {
            console.log('Deselected node');
        }
        
        // **修正**: Optimized rendering - only update selection if changed
        if (previousNode !== node) {
            this.nodeManager.updateNodeSelection();
            
            // **修正**: Use requestAnimationFrame for smooth UI updates
            requestAnimationFrame(() => {
                this.updatePropertyPanel();
                this.updateUI();
            });
        }
    }

    async createConnection(sourcePortId, targetPortId) {
        try {
            // Validate connection
            const sourcePort = this.findPortById(sourcePortId);
            const targetPort = this.findPortById(targetPortId);
            
            if (!this.validateConnection(sourcePort, targetPort)) {
                throw new Error('Invalid connection');
            }

            // Create internal connection data
            const connection = {
                id: `${sourcePortId}-${targetPortId}`,
                source: sourcePort.nodeId,
                target: targetPort.nodeId,
                sourceHandle: sourcePortId,
                targetHandle: targetPortId
            };

            this.connections.push(connection);

            // Create visual connection line
            await this.renderConnection(connection);

            // Update property panel with timing consideration
            this.uiManager.queuePropertyPanelUpdate(sourcePort.nodeId);
            this.uiManager.queuePropertyPanelUpdate(targetPort.nodeId);

            console.log(`Connection created: ${sourcePortId} -> ${targetPortId}`);
            console.log(`Total connections: ${this.connections.length}`);

            return connection;
        } catch (error) {
            console.error('Failed to create connection:', error);
            throw error;
        }
    }

    async renderConnection(connection) {
        try {
            const sourceNode = this.workflow.nodes.find(n => n.id === connection.source);
            const targetNode = this.workflow.nodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) {
                throw new Error('Source or target node not found');
            }

            // Get port positions using ConnectionManager's method
            const sourcePos = await this.connectionManager.getPortPosition(sourceNode, 'output');
            const targetPos = await this.connectionManager.getPortPosition(targetNode, 'input');

            if (!sourcePos || !targetPos) {
                throw new Error('Port positions not available');
            }

            // Create connection path using ConnectionManager
            const connectionElement = this.connectionManager.createConnectionPath(sourcePos, targetPos, false, connection.id);

            // Add to SVG
            const svg = document.getElementById('connections-svg');
            if (!svg) {
                throw new Error('Connections SVG not found');
            }

            svg.appendChild(connectionElement);

        } catch (error) {
            console.error('Connection rendering failed:', error);
        }
    }

    findPortById(portId) {
        // Parse port ID format: nodeId-portType-portIndex
        const parts = portId.split('-');
        if (parts.length < 2) return null;

        const nodeId = parts.slice(0, -2).join('-');
        const portType = parts[parts.length - 2];
        const portIndex = parseInt(parts[parts.length - 1]) || 0;

        const node = this.workflow.nodes.find(n => n.id === nodeId);
        if (!node) return null;

        return {
            nodeId,
            portType,
            portIndex,
            node
        };
    }

    validateConnection(sourcePort, targetPort) {
        if (!sourcePort || !targetPort) return false;
        if (sourcePort.nodeId === targetPort.nodeId) return false;
        if (sourcePort.portType !== 'output' || targetPort.portType !== 'input') return false;

        // Check for existing connection
        const existingConnection = this.connections.find(conn => 
            conn.source === sourcePort.nodeId && 
            conn.target === targetPort.nodeId
        );

        return !existingConnection;
    }

    debugState() {
        const state = {
            nodes: this.workflow.nodes.length,
            connections: this.workflow.connections.length,
            selectedNode: this.selectedNode?.id || null,
            showPalette: this.showPalette,
            showProperties: this.showProperties,
            isExecuting: this.isExecuting,
            canvasState: this.canvasState,
            connectionState: this.connectionState
        };
        
        console.group('🔍 Workflow Debug State');
        console.table(state);
        console.log('Nodes:', this.workflow.nodes);
        console.log('Connections:', this.workflow.connections);
        console.groupEnd();
        
        return state;
    }

    forceRerender() {
        console.log('🔄 Force re-rendering workflow...');
        this.renderNodes();
        this.renderConnections();
        this.updateWelcomeMessage();
        this.updateUI();
        console.log('✅ Force re-render completed');
    }

    validateWorkflow() {
        const issues = [];
        
        // Check for orphaned nodes
        const connectedNodeIds = new Set();
        this.workflow.connections.forEach(conn => {
            connectedNodeIds.add(conn.from);
            connectedNodeIds.add(conn.to);
        });
        
        const orphanedNodes = this.workflow.nodes.filter(node => 
            !connectedNodeIds.has(node.id) && this.workflow.nodes.length > 1
        );
        
        if (orphanedNodes.length > 0) {
            issues.push(`${orphanedNodes.length} orphaned nodes found`);
        }
        
        // Check for invalid connections
        const invalidConnections = this.workflow.connections.filter(conn => {
            const fromNode = this.workflow.nodes.find(n => n.id === conn.from);
            const toNode = this.workflow.nodes.find(n => n.id === conn.to);
            return !fromNode || !toNode;
        });
        
        if (invalidConnections.length > 0) {
            issues.push(`${invalidConnections.length} invalid connections found`);
        }
        
        // Check for circular dependencies
        const visited = new Set();
        const recursionStack = new Set();
        
        const hasCycle = (nodeId) => {
            if (recursionStack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;
            
            visited.add(nodeId);
            recursionStack.add(nodeId);
            
            const outgoingConnections = this.workflow.connections.filter(conn => conn.from === nodeId);
            for (const conn of outgoingConnections) {
                if (hasCycle(conn.to)) return true;
            }
            
            recursionStack.delete(nodeId);
            return false;
        };
        
        for (const node of this.workflow.nodes) {
            if (hasCycle(node.id)) {
                issues.push('Circular dependency detected');
                break;
            }
        }
        
        console.group('🔍 Workflow Validation');
        if (issues.length === 0) {
            console.log('✅ Workflow is valid');
        } else {
            console.warn('⚠️ Workflow issues found:');
            issues.forEach(issue => console.warn(`  - ${issue}`));
        }
        console.groupEnd();
        
        return { valid: issues.length === 0, issues };
    }

    cleanupConnections() {
        const initialCount = this.workflow.connections.length;
        
        // Remove connections with missing nodes
        this.workflow.connections = this.workflow.connections.filter(conn => {
            const fromNode = this.workflow.nodes.find(n => n.id === conn.from);
            const toNode = this.workflow.nodes.find(n => n.id === conn.to);
            return fromNode && toNode;
        });
        
        const removedCount = initialCount - this.workflow.connections.length;
        
        if (removedCount > 0) {
            console.log(`🧹 Cleaned up ${removedCount} invalid connections`);
            this.renderConnections();
        } else {
            console.log('✅ No connections needed cleanup');
        }
        
        return removedCount;
    }

    // **修正**: Export workflow state (useful for debugging and save functionality)
    exportWorkflow() {
        const workflowData = {
            ...this.workflow,
            metadata: {
                ...this.workflow.metadata,
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            }
        };
        
        window.debugMonitor?.logSuccess('Exported workflow', workflowData);
        return workflowData;
    }
    
    // **修正**: Import workflow state (useful for load functionality)
    importWorkflow(workflowData) {
        try {
            this.workflow = {
                ...workflowData,
                metadata: {
                    ...workflowData.metadata,
                    importedAt: new Date().toISOString()
                }
            };
            
            this.selectedNode = null;
            this.showProperties = false;
            
            // Force complete re-render
            this.forceRerender();
            
            window.debugMonitor?.logSuccess('Imported workflow successfully');
            return true;
        } catch (error) {
            window.debugMonitor?.logError('Failed to import workflow', { error: error.message, stack: error.stack });
            return false;
        }
    }
    
    // **新機能**: ワークフローデータの自動保存システム
    
    saveWorkflowToStorage() {
        try {
            const saveData = {
                workflow: this.workflow,
                canvasState: this.canvasState,
                metadata: {
                    savedAt: new Date().toISOString(),
                    version: '1.0.0',
                    nodeCount: this.workflow.nodes.length,
                    connectionCount: this.workflow.connections.length
                }
            };
            
            localStorage.setItem(this.autoSaveKey, JSON.stringify(saveData));
            this.hasUnsavedChanges = false;
            
            window.debugMonitor?.logSuccess('Workflow auto-saved to localStorage', {
                nodeCount: this.workflow.nodes.length,
                connectionCount: this.workflow.connections.length
            });
            
            return true;
        } catch (error) {
            window.debugMonitor?.logError('Failed to save workflow to localStorage', { 
                error: error.message,
                storageAvailable: this.isLocalStorageAvailable()
            });
            
            // Try to clear old data if storage is full
            if (error.name === 'QuotaExceededError') {
                this.clearOldAutoSaves();
                return this.saveWorkflowToStorage(); // Retry once
            }
            
            return false;
        }
    }
    
    loadWorkflowFromStorage() {
        try {
            const savedData = localStorage.getItem(this.autoSaveKey);
            if (!savedData) {
                window.debugMonitor?.logInit('No saved workflow found');
                return false;
            }
            
            const data = JSON.parse(savedData);
            
            // Validate saved data structure
            if (!data.workflow || !data.workflow.nodes || !data.workflow.connections) {
                window.debugMonitor?.logWarning('Invalid workflow data format in storage');
                return false;
            }
            
            // Restore workflow data
            this.workflow = {
                ...data.workflow,
                metadata: {
                    ...data.workflow.metadata,
                    restoredAt: new Date().toISOString()
                }
            };
            
            // Restore canvas state if available
            if (data.canvasState) {
                this.canvasState = { ...data.canvasState };
            }
            
            // Re-render with restored data
            this.nodeManager.renderNodes();
            this.connectionManager.renderConnections();
            this.uiManager.updateWelcomeMessage();
            this.uiManager.updateUI();
            
            window.debugMonitor?.logSuccess('Workflow restored from localStorage', {
                nodeCount: this.workflow.nodes.length,
                connectionCount: this.workflow.connections.length,
                savedAt: data.metadata?.savedAt
            });
            
            return true;
        } catch (error) {
            window.debugMonitor?.logError('Failed to load workflow from localStorage', { 
                error: error.message,
                stack: error.stack
            });
            
            // Clear corrupted data
            this.clearWorkflowStorage();
            return false;
        }
    }
    
    startAutoSave() {
        // Clear any existing timer
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        // Start auto-save timer
        this.autoSaveTimer = setInterval(() => {
            if (this.hasUnsavedChanges) {
                this.saveWorkflowToStorage();
            }
        }, this.autoSaveInterval);
        
        window.debugMonitor?.logInit(`Auto-save started with ${this.autoSaveInterval}ms interval`);
    }
    
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            window.debugMonitor?.logInit('Auto-save stopped');
        }
    }
    
    markAsChanged() {
        this.hasUnsavedChanges = true;
        this.workflow.metadata.updatedAt = new Date();
        
        window.debugMonitor?.logUI('Workflow marked as changed');
    }
    
    setupBeforeUnloadHandler() {
        window.addEventListener('beforeunload', (e) => {
            // Save before page unload
            if (this.hasUnsavedChanges) {
                this.saveWorkflowToStorage();
                
                // Show confirmation dialog for unsaved changes
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
        
        // Also save on visibility change (page switch, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.hasUnsavedChanges) {
                this.saveWorkflowToStorage();
            }
        });
        
        // **新機能**: キーボードショートカット (Ctrl+S)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                window.debugMonitor?.logUI('Ctrl+S keyboard shortcut triggered');
                
                const success = this.manualSave();
                if (success) {
                    this.uiManager.showSaveIndicator();
                }
            }
        });
        
        window.debugMonitor?.logInit('Before unload handlers set up');
    }
    
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
    
    clearWorkflowStorage() {
        try {
            localStorage.removeItem(this.autoSaveKey);
            window.debugMonitor?.logInit('Workflow storage cleared');
        } catch (error) {
            window.debugMonitor?.logError('Failed to clear workflow storage', { error: error.message });
        }
    }
    
    clearOldAutoSaves() {
        try {
            // Remove other potential workflow saves to free up space
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('llm-workflow-') || key.startsWith('workflow-'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                if (key !== this.autoSaveKey) {
                    localStorage.removeItem(key);
                }
            });
            
            window.debugMonitor?.logInit(`Cleared ${keysToRemove.length} old workflow saves`);
        } catch (error) {
            window.debugMonitor?.logError('Failed to clear old saves', { error: error.message });
        }
    }
    
    // **改善**: 手動保存・ロード機能（JSONファイルダウンロード）
    manualSave() {
        try {
            // localStorage保存も行う（自動保存として）
            const storageSuccess = this.saveWorkflowToStorage();
            
            // JSONファイルとしてダウンロード
            const workflowData = this.exportWorkflow();
            const jsonString = JSON.stringify(workflowData, null, 2);
            
            // ファイル名の生成（日時付き）
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const filename = `llm-workflow-${timestamp}.json`;
            
            // **修正**: 最も確実なダウンロード方法を使用（FileSaver.js風）
            try {
                const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                
                // Microsoft Edge/IE対応
                if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                    window.navigator.msSaveOrOpenBlob(blob, filename);
                    this.showNotification(`ワークフローを ${filename} としてダウンロードしました`, 'success');
                    return true;
                }
                
                // 強制ダウンロード用のURL作成
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                
                // **重要**: ダウンロード属性の強制設定
                downloadLink.href = url;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';
                downloadLink.style.visibility = 'hidden';
                downloadLink.setAttribute('target', '_self');
                
                // **修正**: イベントの強制発火
                document.body.appendChild(downloadLink);
                
                // **確実な方法**: 複数の方法でクリックを試行
                try {
                    // 方法1: ネイティブクリック
                    downloadLink.click();
                } catch (nativeClickError) {
                    try {
                        // 方法2: MouseEventを使用
                        const clickEvent = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        downloadLink.dispatchEvent(clickEvent);
                    } catch (eventClickError) {
                        // 方法3: フォールバック
                        throw new Error('All click methods failed');
                    }
                }
                
                // **検証**: ダウンロードが成功したかチェック
                setTimeout(() => {
                    // クリーンアップ
                    if (document.body.contains(downloadLink)) {
                        document.body.removeChild(downloadLink);
                    }
                    URL.revokeObjectURL(url);
                    
                    // **重要**: ダウンロードが実際に動作したかユーザーに確認
                    setTimeout(() => {
                        const userConfirm = confirm(
                            `ダウンロードは正常に開始されましたか？\n\n` +
                            `ファイル名: ${filename}\n\n` +
                            `「OK」: ダウンロード成功\n` +
                            `「キャンセル」: 手動保存ダイアログを表示`
                        );
                        
                        if (!userConfirm) {
                            // ユーザーがダウンロード失敗を報告した場合
                            this.showSaveDialog(jsonString, filename);
                        } else {
                            this.showNotification(`ワークフローを ${filename} としてダウンロードしました`, 'success');
                        }
                    }, 1500); // ダウンロードダイアログが表示されるまで待機
                }, 500);
                
                window.debugMonitor?.logSuccess('Workflow download initiated', {
                    filename,
                    nodeCount: workflowData.workflow.nodes.length,
                    connectionCount: workflowData.workflow.connections.length,
                    fileSize: Math.round(jsonString.length / 1024) + 'KB'
                });
                
                return true;
                
            } catch (blobError) {
                window.debugMonitor?.logWarning('Blob download failed, using alternative method', { 
                    error: blobError.message 
                });
                
                // **フォールバック**: ファイル保存ダイアログを表示
                this.showSaveDialog(jsonString, filename);
                return true;
            }
            
        } catch (error) {
            window.debugMonitor?.logError('Failed to download workflow JSON', { 
                error: error.message,
                stack: error.stack
            });
            
            this.showNotification('JSONファイルのダウンロードに失敗しました', 'error');
            return false;
        }
    }
    
    // **新機能**: 保存ダイアログ表示（ダウンロード失敗時のフォールバック）
    showSaveDialog(jsonString, filename) {
        // モーダルダイアログを作成
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;
        
        dialog.innerHTML = `
            <h2 style="margin-top: 0; color: #333; font-size: 24px;">💾 ワークフローを保存</h2>
            <p style="color: #666; margin-bottom: 20px;">
                自動ダウンロードが機能しないため、以下の手順でファイルを保存してください：
            </p>
            <ol style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                <li><strong>「JSONをコピー」</strong>ボタンをクリック</li>
                <li>テキストエディタ（メモ帳など）を開く</li>
                <li>コピーしたJSONを貼り付け</li>
                <li><strong>${filename}</strong> として保存</li>
            </ol>
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                    ワークフローJSON:
                </label>
                <textarea readonly 
                    style="width: 100%; height: 200px; font-family: 'Courier New', monospace; font-size: 12px; border: 1px solid #ddd; border-radius: 4px; padding: 10px; resize: vertical;" 
                    id="workflow-json-content">${jsonString}</textarea>
            </div>
            <div style="text-align: right;">
                <button id="copy-json-btn" 
                    style="margin-right: 10px; padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    📋 JSONをコピー
                </button>
                <button id="close-save-dialog" 
                    style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    閉じる
                </button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // イベントリスナー
        document.getElementById('copy-json-btn').addEventListener('click', () => {
            const textarea = document.getElementById('workflow-json-content');
            textarea.select();
            textarea.setSelectionRange(0, 99999); // モバイル対応
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    this.showNotification('JSONをクリップボードにコピーしました', 'success');
                    document.getElementById('copy-json-btn').textContent = '✅ コピー完了';
                    document.getElementById('copy-json-btn').style.background = '#20c997';
                } else {
                    throw new Error('execCommand failed');
                }
            } catch (err) {
                this.showNotification('コピーに失敗しました。手動で選択してコピーしてください', 'warning');
            }
        });
        
        document.getElementById('close-save-dialog').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // 自動でテキストエリアを選択
        setTimeout(() => {
            document.getElementById('workflow-json-content').focus();
        }, 100);
    }
    
    // **新機能**: フォールバックダウンロード方法
    fallbackDownload(jsonString, filename) {
        try {
            // データURLを使用したフォールバック
            const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
            
            const fallbackLink = document.createElement('a');
            fallbackLink.href = dataUrl;
            fallbackLink.download = filename;
            fallbackLink.style.display = 'none';
            fallbackLink.target = '_blank';
            
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            document.body.removeChild(fallbackLink);
            
            window.debugMonitor?.logWarning('Used fallback download method (data URL)');
        } catch (fallbackError) {
            window.debugMonitor?.logError('Fallback download also failed', { 
                error: fallbackError.message 
            });
            
            // 最後の手段: 新しいウィンドウでJSONを表示
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write('<pre>' + jsonString + '</pre>');
                newWindow.document.title = filename;
                this.showNotification('新しいウィンドウでJSONを表示しました。右クリックして保存してください', 'warning');
            } else {
                this.showNotification('ダウンロードに失敗しました。ポップアップブロッカーを確認してください', 'error');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(notification);
        }

        // Set notification style based on type
        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.opacity = '1';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
    
    // **新機能**: JSONをクリップボードにコピー（ダウンロード代替手段）
    copyWorkflowToClipboard() {
        try {
            const workflowData = this.exportWorkflow();
            const jsonString = JSON.stringify(workflowData, null, 2);
            
            // モダンブラウザのClipboard APIを使用
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(jsonString).then(() => {
                    this.showNotification('ワークフローJSONをクリップボードにコピーしました', 'success');
                    window.debugMonitor?.logSuccess('Workflow copied to clipboard');
                }).catch(err => {
                    console.warn('Clipboard API failed, using fallback:', err);
                    this.fallbackCopyToClipboard(jsonString);
                });
            } else {
                // フォールバック方法
                this.fallbackCopyToClipboard(jsonString);
            }
        } catch (error) {
            window.debugMonitor?.logError('Failed to copy workflow to clipboard', { 
                error: error.message 
            });
            this.showNotification('クリップボードへのコピーに失敗しました', 'error');
        }
    }
    
    // **補助機能**: フォールバック クリップボードコピー
    fallbackCopyToClipboard(text) {
        try {
            // テキストエリアを作成して選択、コピー
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                this.showNotification('ワークフローJSONをクリップボードにコピーしました', 'success');
                window.debugMonitor?.logSuccess('Workflow copied to clipboard (fallback method)');
            } else {
                throw new Error('execCommand failed');
            }
        } catch (fallbackError) {
            window.debugMonitor?.logError('Fallback clipboard copy failed', { 
                error: fallbackError.message 
            });
            
            // 最後の手段：テキスト表示ダイアログ
            this.showWorkflowAsText();
        }
    }
    
    // **補助機能**: ワークフローテキスト表示
    showWorkflowAsText() {
        try {
            const workflowData = this.exportWorkflow();
            const jsonString = JSON.stringify(workflowData, null, 2);
            
            // モーダルダイアログを作成
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 80%;
                max-height: 80%;
                overflow: auto;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin-top: 0;">ワークフローJSON</h3>
                <p>以下のJSONをコピーして、テキストファイルとして保存してください：</p>
                <textarea readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;">${jsonString}</textarea>
                <div style="margin-top: 10px; text-align: right;">
                    <button id="copy-text-btn" style="margin-right: 10px; padding: 8px 16px;">コピー</button>
                    <button id="close-text-modal" style="padding: 8px 16px;">閉じる</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            // イベントリスナー
            document.getElementById('copy-text-btn').addEventListener('click', () => {
                const textarea = dialog.querySelector('textarea');
                textarea.select();
                document.execCommand('copy');
                this.showNotification('JSONをコピーしました', 'success');
            });
            
            document.getElementById('close-text-modal').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
            
        } catch (error) {
            window.debugMonitor?.logError('Failed to show workflow as text', { 
                error: error.message 
            });
        }
    }

    // **新機能**: JSONファイルからワークフローをロード
    loadFromJSONFile() {
        try {
            // ファイル入力要素を作成
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        
                        // データ構造の検証
                        if (!jsonData.workflow || !jsonData.workflow.nodes || !jsonData.workflow.connections) {
                            throw new Error('Invalid workflow file format');
                        }
                        
                        // ワークフローをインポート
                        const importSuccess = this.importWorkflow(jsonData);
                        
                        if (importSuccess) {
                            this.showNotification(`ワークフローを ${file.name} から読み込みました`, 'success');
                            
                            window.debugMonitor?.logSuccess('Workflow loaded from JSON file', {
                                filename: file.name,
                                nodeCount: jsonData.workflow.nodes.length,
                                connectionCount: jsonData.workflow.connections.length,
                                fileSize: Math.round(file.size / 1024) + 'KB'
                            });
                        } else {
                            throw new Error('Failed to import workflow data');
                        }
                    } catch (parseError) {
                        window.debugMonitor?.logError('Failed to parse JSON file', { 
                            error: parseError.message,
                            filename: file.name
                        });
                        
                        this.showNotification('JSONファイルの読み込みに失敗しました: ' + parseError.message, 'error');
                    }
                };
                
                reader.onerror = () => {
                    this.showNotification('ファイルの読み込みでエラーが発生しました', 'error');
                };
                
                reader.readAsText(file);
            });
            
            // DOMに追加してクリック、その後削除
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
            
        } catch (error) {
            window.debugMonitor?.logError('Failed to create file load dialog', { 
                error: error.message,
                stack: error.stack
            });
            
            this.showNotification('ファイル選択ダイアログの作成に失敗しました', 'error');
        }
    }

    // **新機能**: テスト用の新しいメソッド群
    getSystemInfo() {
        return {
            version: '1.0.0',
            nodeCount: this.workflow.nodes.length,
            connectionCount: this.workflow.connections.length,
            lastModified: this.workflow.metadata.updatedAt,
            autoSaveEnabled: this.autoSaveTimer !== null
        };
    }

    calculateWorkflowComplexity() {
        const nodeCount = this.workflow.nodes.length;
        const connectionCount = this.workflow.connections.length;
        const nodeTypeVariety = new Set(this.workflow.nodes.map(n => n.type)).size;
        
        return {
            totalNodes: nodeCount,
            totalConnections: connectionCount,
            nodeTypeVariety: nodeTypeVariety,
            complexityScore: (nodeCount * 1) + (connectionCount * 2) + (nodeTypeVariety * 3),
            rating: this.getComplexityRating(nodeCount, connectionCount, nodeTypeVariety)
        };
    }

    getComplexityRating(nodes, connections, variety) {
        const score = (nodes * 1) + (connections * 2) + (variety * 3);
        if (score < 10) return 'Simple';
        if (score < 25) return 'Moderate';
        if (score < 50) return 'Complex';
        return 'Very Complex';
    }

    generateWorkflowReport() {
        const systemInfo = this.getSystemInfo();
        const complexity = this.calculateWorkflowComplexity();
        
        return {
            timestamp: new Date().toISOString(),
            system: systemInfo,
            complexity: complexity,
            nodes: this.workflow.nodes.map(node => ({
                id: node.id,
                type: node.type,
                label: node.data.label,
                hasConnections: this.workflow.connections.some(c => 
                    c.sourceNodeId === node.id || c.targetNodeId === node.id
                )
            })),
            connections: this.workflow.connections.map(conn => ({
                from: conn.sourceNodeId,
                to: conn.targetNodeId,
                type: `${conn.sourcePortType} -> ${conn.targetPortType}`
            }))
        };
    }

    optimizeWorkflow() {
        const report = this.generateWorkflowReport();
        const suggestions = [];
        
        // 未接続ノードの検出
        const unconnectedNodes = report.nodes.filter(node => !node.hasConnections);
        if (unconnectedNodes.length > 0) {
            suggestions.push({
                type: 'warning',
                message: `${unconnectedNodes.length} unconnected nodes found`,
                nodes: unconnectedNodes.map(n => n.id)
            });
        }
        
        // 複雑度チェック
        if (report.complexity.complexityScore > 50) {
            suggestions.push({
                type: 'info',
                message: 'Consider breaking down this complex workflow into smaller components',
                score: report.complexity.complexityScore
            });
        }
        
        return {
            report: report,
            suggestions: suggestions,
            optimizationApplied: false
        };
    }
}

// **修正**: Enhanced initialization with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.workflowEditor = new WorkflowEditor();
        window.debugMonitor?.logSuccess('Workflow Editor initialized successfully');
        
        // **修正**: Add global debug methods for easier debugging
        window.debugWorkflow = () => window.workflowEditor.debugState();
        window.validateWorkflow = () => window.workflowEditor.validateWorkflow();
        window.cleanupWorkflow = () => window.workflowEditor.cleanupConnections();
        window.rerenderWorkflow = () => window.workflowEditor.forceRerender();
        
        window.debugMonitor?.logSuccess('Debug methods available: debugWorkflow(), validateWorkflow(), cleanupWorkflow(), rerenderWorkflow()');
        
    } catch (error) {
        window.debugMonitor?.logError('Failed to initialize Workflow Editor', { error: error.message, stack: error.stack });
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 16px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        errorDiv.innerHTML = `
            <strong>⚠️ Initialization Error</strong><br>
            Failed to start the Workflow Editor. Please refresh the page.<br>
            <small>Check console for details.</small>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-remove error message after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
});