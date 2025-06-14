// Event Handlers Module
// Handles all user interactions including drag & drop, mouse events, keyboard events

class EventHandlers {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
    }

    setupEventListeners() {
        // Toolbar events
        document.getElementById('execute-btn').addEventListener('click', () => this.editor.executeWorkflow());
        document.getElementById('toggle-palette').addEventListener('click', () => this.editor.togglePalette());
        document.getElementById('toggle-properties').addEventListener('click', () => this.editor.toggleProperties());
        document.getElementById('close-properties').addEventListener('click', () => this.editor.closeProperties());
        
        // Canvas events
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('drop', (e) => this.handleDrop(e));
        canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('contextmenu', (e) => this.handleCanvasContextMenu(e));
        
        // Global mouse events for dragging and connecting
        document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleGlobalMouseUp(e));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        
        // Canvas zoom and pan events
        canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e));
        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        
        // Context menu events
        this.setupContextMenuEvents();
    }

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
                x: e.clientX - rect.left - this.editor.dragState.dragOffset.x,
                y: e.clientY - rect.top - this.editor.dragState.dragOffset.y
            };
            this.editor.addNode(nodeType, position);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    handleCanvasClick(e) {
        if (e.target.id === 'canvas') {
            this.editor.selectNode(null);
            this.editor.dragState.connecting = null;
            this.editor.renderConnections();
        }
    }
    
    handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        this.editor.dragState.mousePosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        if (this.editor.connectionState.isConnecting) {
            this.editor.renderConnections();
        }
    }
    
    handleNodeMouseDown(e, node) {
        if (e.button === 0) { // Left mouse button
            // Store mouse down time to distinguish click from drag
            this.editor.dragState.mouseDownTime = Date.now();
            this.editor.dragState.mouseDownPos = { x: e.clientX, y: e.clientY };
            
            this.editor.dragState.isDragging = true;
            this.editor.dragState.draggedNode = node;
            
            // Calculate offset based on current node position
            const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
            if (nodeElement) {
                const canvas = document.getElementById('canvas');
                const canvasRect = canvas.getBoundingClientRect();
                const canvasState = this.editor.canvasState || { scale: 1, translateX: 0, translateY: 0 };
                
                // Get mouse position relative to canvas
                const mouseX = e.clientX - canvasRect.left;
                const mouseY = e.clientY - canvasRect.top;
                
                // Calculate offset from mouse to node position (accounting for canvas transform)
                const nodeX = node.position.x * canvasState.scale + canvasState.translateX;
                const nodeY = node.position.y * canvasState.scale + canvasState.translateY;
                
                this.editor.dragState.dragOffset = {
                    x: (mouseX - nodeX) / canvasState.scale,
                    y: (mouseY - nodeY) / canvasState.scale
                };
                
                // Add visual feedback for dragging
                nodeElement.classList.add('dragging');
            }
            
            // Prevent text selection
            e.preventDefault();
        }
    }
    
    handleNodeClick(e, node) {
        e.stopPropagation();
        
        // If we're in connection mode and this is a different node, try to connect
        if (this.editor.connectionState.isConnecting && this.editor.connectionState.sourceNode !== node.id) {
            e.preventDefault();
            this.editor.completeConnection(node.id, 'input');
        } else {
            // Immediate visual feedback for selection
            this.editor.selectNode(node);
        }
    }
    
    handlePortClick(e, nodeId, portType) {
        e.stopPropagation();
        e.preventDefault();
        
        if (this.editor.connectionState.isConnecting) {
            // We're already connecting, try to complete the connection
            if (this.editor.connectionState.sourceNode !== nodeId) {
                this.editor.completeConnection(nodeId, portType);
            } else {
                // Clicking on the same port cancels the connection
                this.editor.cancelConnection();
            }
        } else {
            // Start a new connection
            this.editor.startConnection(nodeId, portType);
        }
    }
    
    
    handleGlobalMouseMove(e) {
        // Handle canvas panning
        if (this.editor.canvasPanState && this.editor.canvasPanState.isPanning) {
            e.preventDefault();
            
            if (!this.editor.canvasState) {
                this.editor.canvasState = { scale: 1, translateX: 0, translateY: 0 };
            }
            
            const deltaX = e.clientX - this.editor.canvasPanState.startX;
            const deltaY = e.clientY - this.editor.canvasPanState.startY;
            
            this.editor.canvasState.translateX = this.editor.canvasPanState.startTranslateX + deltaX;
            this.editor.canvasState.translateY = this.editor.canvasPanState.startTranslateY + deltaY;
            
            // Apply transform
            const transform = `translate(${this.editor.canvasState.translateX}px, ${this.editor.canvasState.translateY}px) scale(${this.editor.canvasState.scale})`;
            document.getElementById('nodes-container').style.transform = transform;
            document.getElementById('connections-svg').style.transform = transform;
            
            return;
        }
        
        // Handle node dragging
        if (this.editor.dragState.isDragging && this.editor.dragState.draggedNode) {
            const canvas = document.getElementById('canvas');
            const canvasRect = canvas.getBoundingClientRect();
            
            // Adjust for canvas transform if it exists
            const canvasState = this.editor.canvasState || { scale: 1, translateX: 0, translateY: 0 };
            const scaleAdjustment = 1 / canvasState.scale;
            
            // Calculate position relative to canvas, accounting for canvas transform
            const rawX = e.clientX - canvasRect.left;
            const rawY = e.clientY - canvasRect.top;
            
            // Adjust for canvas translation and scale
            const adjustedX = (rawX - canvasState.translateX) * scaleAdjustment;
            const adjustedY = (rawY - canvasState.translateY) * scaleAdjustment;
            
            const newPosition = {
                x: adjustedX - this.editor.dragState.dragOffset.x,
                y: adjustedY - this.editor.dragState.dragOffset.y
            };
            
            // Ensure the node stays within reasonable bounds
            newPosition.x = Math.max(0, Math.min(2000, newPosition.x));
            newPosition.y = Math.max(0, Math.min(2000, newPosition.y));
            
            this.editor.updateNodePosition(this.editor.dragState.draggedNode.id, newPosition);
            
            // Also update connections immediately
            this.editor.renderConnections();
        }
        
        // Update mouse position for temporary connections
        const canvas = document.getElementById('canvas');
        if (canvas && this.editor.connectionState.isConnecting) {
            const canvasRect = canvas.getBoundingClientRect();
            const canvasState = this.editor.canvasState || { scale: 1, translateX: 0, translateY: 0 };
            
            // Calculate mouse position relative to canvas with transform
            const rawX = e.clientX - canvasRect.left;
            const rawY = e.clientY - canvasRect.top;
            
            this.editor.dragState.mousePosition = {
                x: (rawX - canvasState.translateX) / canvasState.scale,
                y: (rawY - canvasState.translateY) / canvasState.scale
            };
            
            this.editor.renderConnections();
        }
    }
    
    handleGlobalMouseUp(e) {
        // Handle canvas panning end
        if (this.editor.canvasPanState && this.editor.canvasPanState.isPanning) {
            this.editor.canvasPanState.isPanning = false;
            document.getElementById('canvas').style.cursor = 'default';
            return;
        }
        
        // Handle node dragging end
        if (this.editor.dragState.isDragging) {
            const draggedNode = this.editor.dragState.draggedNode;
            
            // Remove dragging visual feedback
            if (draggedNode) {
                const nodeElement = document.querySelector(`[data-node-id="${draggedNode.id}"]`);
                if (nodeElement) {
                    nodeElement.classList.remove('dragging');
                }
            }
            
            // Check if this was a click or a drag
            const timeDiff = Date.now() - this.editor.dragState.mouseDownTime;
            const mouseMoveDist = Math.sqrt(
                Math.pow(e.clientX - this.editor.dragState.mouseDownPos.x, 2) +
                Math.pow(e.clientY - this.editor.dragState.mouseDownPos.y, 2)
            );
            
            // If it was a quick click with minimal movement, treat as selection
            if (timeDiff < 200 && mouseMoveDist < 5 && draggedNode) {
                this.editor.selectNode(draggedNode);
            }
            
            // Reset drag state
            this.editor.dragState.isDragging = false;
            this.editor.dragState.draggedNode = null;
            this.editor.dragState.dragOffset = { x: 0, y: 0 };
            this.editor.dragState.mouseDownTime = 0;
            this.editor.dragState.mouseDownPos = { x: 0, y: 0 };
            
            // Update workflow metadata
            this.editor.workflow.metadata.updatedAt = new Date();
        }
    }
    
    handlePortHover(e, nodeId, portType, isEntering) {
        const port = e.target;
        
        if (isEntering) {
            this.editor.dragState.hoveredPort = { nodeId, portType };
            
            if (this.editor.connectionState.isConnecting) {
                // Check if this is a valid connection target
                if (this.editor.canConnect(this.editor.connectionState.sourceNode, nodeId, this.editor.connectionState.sourcePort, portType)) {
                    port.classList.add('can-connect');
                }
            }
        } else {
            this.editor.dragState.hoveredPort = null;
            port.classList.remove('can-connect');
        }
    }
    
    handleKeyDown(e) {
        // Delete selected node with Delete or Backspace key
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.editor.selectedNode) {
            e.preventDefault();
            this.editor.deleteSelectedNode();
        }
        
        // Escape key cancels connection
        if (e.key === 'Escape' && this.editor.connectionState.isConnecting) {
            this.editor.cancelConnection();
        }
        
        // Escape key closes context menu
        if (e.key === 'Escape') {
            this.hideContextMenu();
        }
    }
    
    handleCanvasContextMenu(e) {
        e.preventDefault();
        
        // Check if right-clicked on a node
        const nodeElement = e.target.closest('.workflow-node');
        if (nodeElement) {
            const nodeId = nodeElement.getAttribute('data-node-id');
            const node = this.editor.workflow.nodes.find(n => n.id === nodeId);
            if (node) {
                this.showNodeContextMenu(e, node);
            }
        } else {
            // Right-clicked on empty canvas
            this.showCanvasContextMenu(e);
        }
    }
    
    showNodeContextMenu(e, node) {
        this.hideContextMenu(); // Hide any existing context menu
        
        const contextMenu = document.getElementById('node-context-menu');
        if (!contextMenu) return;
        
        // Store the target node
        this.editor.contextMenuNode = node;
        
        // Position the menu
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.style.display = 'block';
        
        // Update menu items based on node
        const nodeLabel = node.data.label || node.type;
        document.getElementById('context-node-label').textContent = nodeLabel;
        
        // Focus on the menu for keyboard navigation
        contextMenu.focus();
    }
    
    showCanvasContextMenu(e) {
        this.hideContextMenu(); // Hide any existing context menu
        
        const contextMenu = document.getElementById('canvas-context-menu');
        if (!contextMenu) return;
        
        // Position the menu
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.style.display = 'block';
        
        // Store click position for "Add Node" functionality
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        this.editor.contextMenuPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Focus on the menu for keyboard navigation
        contextMenu.focus();
    }
    
    hideContextMenu() {
        const nodeContextMenu = document.getElementById('node-context-menu');
        const canvasContextMenu = document.getElementById('canvas-context-menu');
        
        if (nodeContextMenu) {
            nodeContextMenu.style.display = 'none';
        }
        
        if (canvasContextMenu) {
            canvasContextMenu.style.display = 'none';
        }
        
        // Clear stored data
        this.editor.contextMenuNode = null;
        this.editor.contextMenuPosition = null;
    }
    
    handleGlobalClick(e) {
        // Hide context menu when clicking elsewhere
        const nodeContextMenu = document.getElementById('node-context-menu');
        const canvasContextMenu = document.getElementById('canvas-context-menu');
        
        if (nodeContextMenu && !nodeContextMenu.contains(e.target) && nodeContextMenu.style.display === 'block') {
            this.hideContextMenu();
        }
        
        if (canvasContextMenu && !canvasContextMenu.contains(e.target) && canvasContextMenu.style.display === 'block') {
            this.hideContextMenu();
        }
    }
    
    handleCanvasWheel(e) {
        e.preventDefault();
        
        const canvas = document.getElementById('canvas');
        const nodesContainer = document.getElementById('nodes-container');
        const connectionsContainer = document.getElementById('connections-svg');
        
        if (!this.editor.canvasState) {
            this.editor.canvasState = {
                scale: 1,
                translateX: 0, 
                translateY: 0
            };
        }
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(3, this.editor.canvasState.scale * scaleFactor));
        
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate new translation to zoom around mouse position
        const deltaScale = newScale - this.editor.canvasState.scale;
        this.editor.canvasState.translateX -= (mouseX - this.editor.canvasState.translateX) * deltaScale / newScale;
        this.editor.canvasState.translateY -= (mouseY - this.editor.canvasState.translateY) * deltaScale / newScale;
        this.editor.canvasState.scale = newScale;
        
        // Apply transform
        const transform = `translate(${this.editor.canvasState.translateX}px, ${this.editor.canvasState.translateY}px) scale(${this.editor.canvasState.scale})`;
        nodesContainer.style.transform = transform;
        connectionsContainer.style.transform = transform;
    }
    
    handleCanvasMouseDown(e) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+click
            e.preventDefault();
            this.editor.canvasPanState = {
                isPanning: true,
                startX: e.clientX,
                startY: e.clientY,
                startTranslateX: this.editor.canvasState?.translateX || 0,
                startTranslateY: this.editor.canvasState?.translateY || 0
            };
            
            // Change cursor to indicate panning
            document.getElementById('canvas').style.cursor = 'grabbing';
        }
    }
    
    setupContextMenuEvents() {
        // Node context menu events
        const deleteNodeItem = document.getElementById('context-delete-node');
        const duplicateNodeItem = document.getElementById('context-duplicate-node');
        const selectNodeItem = document.getElementById('context-select-node');
        
        if (deleteNodeItem) {
            deleteNodeItem.addEventListener('click', () => {
                if (this.editor.contextMenuNode) {
                    this.editor.selectNode(this.editor.contextMenuNode);
                    this.editor.deleteSelectedNode();
                }
                this.hideContextMenu();
            });
        }
        
        if (duplicateNodeItem) {
            duplicateNodeItem.addEventListener('click', () => {
                if (this.editor.contextMenuNode) {
                    this.editor.duplicateNode(this.editor.contextMenuNode);
                }
                this.hideContextMenu();
            });
        }
        
        if (selectNodeItem) {
            selectNodeItem.addEventListener('click', () => {
                if (this.editor.contextMenuNode) {
                    this.editor.selectNode(this.editor.contextMenuNode);
                }
                this.hideContextMenu();
            });
        }
        
        // Canvas context menu events - Add Node submenu
        const addInputNode = document.getElementById('context-add-input');
        const addLLMNode = document.getElementById('context-add-llm');
        const addBranchNode = document.getElementById('context-add-branch');
        const addMergeNode = document.getElementById('context-add-merge');
        const addFilterNode = document.getElementById('context-add-filter');
        const addLoopNode = document.getElementById('context-add-loop');
        const addCustomNode = document.getElementById('context-add-custom');
        const addOutputNode = document.getElementById('context-add-output');
        
        [
            { element: addInputNode, type: 'input' },
            { element: addLLMNode, type: 'llm' },
            { element: addBranchNode, type: 'branch' },
            { element: addMergeNode, type: 'merge' },
            { element: addFilterNode, type: 'filter' },
            { element: addLoopNode, type: 'loop' },
            { element: addCustomNode, type: 'custom' },
            { element: addOutputNode, type: 'output' }
        ].forEach(({ element, type }) => {
            if (element) {
                element.addEventListener('click', () => {
                    if (this.editor.contextMenuPosition) {
                        this.editor.addNode(type, this.editor.contextMenuPosition);
                    }
                    this.hideContextMenu();
                });
            }
        });
    }
    
    handleNodeContextMenu(e, node) {
        e.preventDefault();
        e.stopPropagation();
        this.showNodeContextMenu(e, node);
    }
}

// Export for use in main workflow editor
window.EventHandlers = EventHandlers; 