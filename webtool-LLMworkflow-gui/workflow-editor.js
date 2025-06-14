// LLM Workflow Editor - Main Class
// Coordinates all modules and maintains the overall workflow state

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
        
        // Canvas state for zoom and pan
        this.canvasState = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };
        
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

        // Connection state
        this.connectionState = {
            isConnecting: false,
            sourceNode: null,
            sourcePort: null,
            temporaryLine: null
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
        
        // Initialize modules
        this.nodeManager = new NodeManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.eventHandlers = new EventHandlers(this);
        this.uiManager = new UIManager(this);
        this.workflowExecutor = new WorkflowExecutor(this);
        
        this.init();
    }
    
    init() {
        this.eventHandlers.setupEventListeners();
        this.uiManager.renderNodePalette();
        this.uiManager.updateUI();
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

    // Delegate methods to appropriate modules
    generateNodeId(nodeType) {
        return this.nodeManager.generateNodeId(nodeType);
    }
    
    addNode(nodeType, position) {
        return this.nodeManager.addNode(nodeType, position);
    }
    
    getDefaultNodeData(nodeType) {
        return this.nodeManager.getDefaultNodeData(nodeType);
    }
    
    renderNodes() {
        return this.nodeManager.renderNodes();
    }
    
    createNodeElement(node) {
        return this.nodeManager.createNodeElement(node);
    }
    
    getNodeDescription(type) {
        return this.nodeManager.getNodeDescription(type);
    }
    
    getNodeContent(node) {
        return this.nodeManager.getNodeContent(node);
    }
    
    updateNodePosition(nodeId, position) {
        return this.nodeManager.updateNodePosition(nodeId, position);
    }
    
    deleteSelectedNode() {
        return this.nodeManager.deleteSelectedNode();
    }
    
    duplicateNode(node) {
        return this.nodeManager.duplicateNode(node);
    }
    
    updateNodeData(nodeId, field, value) {
        return this.nodeManager.updateNodeData(nodeId, field, value);
    }
    
    // Connection methods
    renderConnections() {
        return this.connectionManager.renderConnections();
    }
    
    createConnectionPath(from, to, temporary = false, connectionId = null) {
        return this.connectionManager.createConnectionPath(from, to, temporary, connectionId);
    }
    
    getPortPosition(node, portType) {
        return this.connectionManager.getPortPosition(node, portType);
    }
    
    deleteConnection(connectionId) {
        return this.connectionManager.deleteConnection(connectionId);
    }
    
    startConnection(nodeId, portType) {
        return this.connectionManager.startConnection(nodeId, portType);
    }
    
    completeConnection(targetNodeId, targetPortType, customSourceNodeId = null, customSourcePortType = null) {
        return this.connectionManager.completeConnection(targetNodeId, targetPortType, customSourceNodeId, customSourcePortType);
    }
    
    cancelConnection() {
        return this.connectionManager.cancelConnection();
    }
    
    canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType) {
        return this.connectionManager.canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType);
    }
    
    updatePortStates() {
        return this.connectionManager.updatePortStates();
    }
    
    connectNodes(fromId, toId) {
        return this.connectionManager.connectNodes(fromId, toId);
    }
    
    handleConnectNodesFromPanel() {
        return this.connectionManager.handleConnectNodesFromPanel();
    }
    
    canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType) {
        return this.connectionManager.canConnect(sourceNodeId, targetNodeId, sourcePortType, targetPortType);
    }
    
    // Event handler methods
    handleDragStart(e, nodeType) {
        return this.eventHandlers.handleDragStart(e, nodeType);
    }
    
    handleDrop(e) {
        return this.eventHandlers.handleDrop(e);
    }
    
    handleDragOver(e) {
        return this.eventHandlers.handleDragOver(e);
    }
    
    handleCanvasClick(e) {
        return this.eventHandlers.handleCanvasClick(e);
    }
    
    handleMouseMove(e) {
        return this.eventHandlers.handleMouseMove(e);
    }
    
    handleNodeMouseDown(e, node) {
        return this.eventHandlers.handleNodeMouseDown(e, node);
    }
    
    handleNodeClick(e, node) {
        return this.eventHandlers.handleNodeClick(e, node);
    }
    
    handlePortClick(e, nodeId, portType) {
        return this.eventHandlers.handlePortClick(e, nodeId, portType);
    }
    
    handleGlobalMouseMove(e) {
        return this.eventHandlers.handleGlobalMouseMove(e);
    }
    
    handleGlobalMouseUp() {
        return this.eventHandlers.handleGlobalMouseUp();
    }
    
    handlePortHover(e, nodeId, portType, isEntering) {
        return this.eventHandlers.handlePortHover(e, nodeId, portType, isEntering);
    }
    
    handleKeyDown(e) {
        return this.eventHandlers.handleKeyDown(e);
    }
    
    // UI methods
    renderNodePalette() {
        return this.uiManager.renderNodePalette();
    }
    
    updatePropertyPanel() {
        return this.uiManager.updatePropertyPanel();
    }
    
    getPropertyPanelContent(node) {
        return this.uiManager.getPropertyPanelContent(node);
    }
    
    getNodeSpecificFields(node) {
        return this.uiManager.getNodeSpecificFields(node);
    }
    
    setupPropertyPanelEvents() {
        return this.uiManager.setupPropertyPanelEvents();
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
    
    showConnectionModal(nodeId) {
        return this.uiManager.showConnectionModal(nodeId);
    }
    
    hideConnectionModal() {
        return this.uiManager.hideConnectionModal();
    }
    
    confirmConnection(nodeId) {
        return this.uiManager.confirmConnection(nodeId);
    }
    
    // Workflow execution methods
    topologicalSort() {
        return this.workflowExecutor.topologicalSort();
    }
    
    async executeWorkflow() {
        return await this.workflowExecutor.executeWorkflow();
    }
    
    async executeNode(node, previousResults) {
        return await this.workflowExecutor.executeNode(node, previousResults);
    }
    
    async testAPIConnection() {
        return await this.workflowExecutor.testAPIConnection();
    }
    
    // Core Methods
    selectNode(node) {
        this.selectedNode = node;
        
        if (node) {
            this.showProperties = true;
        }
        
        // Use optimized selection update instead of full re-render
        this.nodeManager.updateNodeSelection();
        this.updatePropertyPanel();
        this.updateUI();
    }
}

// Initialize the workflow editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.workflowEditor = new WorkflowEditor();
}); 