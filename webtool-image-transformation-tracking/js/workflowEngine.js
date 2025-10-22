/**
 * Workflow Engine - Core workflow management system
 */

class WorkflowEngine {
    constructor() {
        this.nodes = new Map(); // nodeId -> node data
        this.edges = new Map(); // edgeId -> edge data
        this.workflow = {
            id: this.generateId('workflow'),
            name: 'New Workflow',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            nodes: [],
            edges: []
        };
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.mode = 'select'; // select, connect, delete
        this.tempConnection = null;
        this.listeners = new Map();
    }

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Node Management
    createNode(options = {}) {
        try {
            const node = {
                id: options.id || this.generateId('node'),
                type: options.type || 'image',
                position: options.position || { x: 100, y: 100 },
                images: options.images || [],
                metadata: options.metadata || {},
                status: 'ready',
                currentIndex: 0,
                created: new Date().toISOString()
            };
            
            this.nodes.set(node.id, node);
            this.workflow.nodes.push(node.id);
            this.emit('nodeCreated', node);
            
            // Debounced save to prevent excessive storage writes
            this.debouncedSave();
            
            return node;
        } catch (error) {
            console.error('Failed to create node:', error);
            return null;
        }
    }

    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        Object.assign(node, updates);
        node.modified = new Date().toISOString();
        
        this.emit('nodeUpdated', node);
        this.saveWorkflow();
        
        return node;
    }

    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        
        // Remove connected edges
        const connectedEdges = this.getConnectedEdges(nodeId);
        connectedEdges.forEach(edge => this.deleteEdge(edge.id));
        
        // Remove node
        this.nodes.delete(nodeId);
        this.workflow.nodes = this.workflow.nodes.filter(id => id !== nodeId);
        
        this.emit('nodeDeleted', nodeId);
        this.saveWorkflow();
        
        return true;
    }

    addImageToNode(nodeId, imageData) {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        const image = {
            id: this.generateId('img'),
            url: imageData.url,
            thumbnail: imageData.thumbnail || imageData.url,
            metadata: imageData.metadata || {},
            created: new Date().toISOString()
        };
        
        node.images.push(image);
        this.emit('imageAdded', { nodeId, image });
        this.saveWorkflow();
        
        return image;
    }

    // Edge Management  
    createEdge(sourceNodeId, targetNodeId, options = {}) {
        // Check if nodes exist
        if (!this.nodes.has(sourceNodeId) || !this.nodes.has(targetNodeId)) {
            return null;
        }
        
        // Check for existing edge
        const existingEdge = this.findEdge(sourceNodeId, targetNodeId);
        if (existingEdge && !options.allowMultiple) {
            return existingEdge;
        }
        
        const edge = {
            id: options.id || this.generateId('edge'),
            source: sourceNodeId,
            target: targetNodeId,
            prompt: options.prompt || '',
            model: options.model || config.get('imageModel'),
            style: options.style || 'custom',
            metadata: options.metadata || {},
            created: new Date().toISOString()
        };
        
        this.edges.set(edge.id, edge);
        this.workflow.edges.push(edge.id);
        
        this.emit('edgeCreated', edge);
        this.saveWorkflow();
        
        return edge;
    }

    updateEdge(edgeId, updates) {
        const edge = this.edges.get(edgeId);
        if (!edge) return null;
        
        Object.assign(edge, updates);
        edge.modified = new Date().toISOString();
        
        this.emit('edgeUpdated', edge);
        this.saveWorkflow();
        
        return edge;
    }

    deleteEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return false;
        
        this.edges.delete(edgeId);
        this.workflow.edges = this.workflow.edges.filter(id => id !== edgeId);
        
        this.emit('edgeDeleted', edgeId);
        this.saveWorkflow();
        
        return true;
    }

    findEdge(sourceId, targetId) {
        for (const edge of this.edges.values()) {
            if (edge.source === sourceId && edge.target === targetId) {
                return edge;
            }
        }
        return null;
    }

    getConnectedEdges(nodeId) {
        const edges = [];
        for (const edge of this.edges.values()) {
            if (edge.source === nodeId || edge.target === nodeId) {
                edges.push(edge);
            }
        }
        return edges;
    }

    // Selection Management
    selectNode(nodeId, multi = false) {
        if (!multi) {
            this.clearSelection();
        }
        
        this.selectedNodes.add(nodeId);
        this.emit('nodeSelected', nodeId);
    }

    deselectNode(nodeId) {
        this.selectedNodes.delete(nodeId);
        this.emit('nodeDeselected', nodeId);
    }

    selectEdge(edgeId, multi = false) {
        if (!multi) {
            this.clearSelection();
        }
        
        this.selectedEdges.add(edgeId);
        this.emit('edgeSelected', edgeId);
    }

    deselectEdge(edgeId) {
        this.selectedEdges.delete(edgeId);
        this.emit('edgeDeselected', edgeId);
    }

    clearSelection() {
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.emit('selectionCleared');
    }

    getSelection() {
        return {
            nodes: Array.from(this.selectedNodes),
            edges: Array.from(this.selectedEdges)
        };
    }

    // Mode Management
    setMode(mode) {
        this.mode = mode;
        this.emit('modeChanged', mode);
    }

    // Merge Nodes
    mergeNodes(nodeIds, options = {}) {
        if (nodeIds.length < 2) return null;
        
        const sourceNodes = nodeIds.map(id => this.nodes.get(id)).filter(Boolean);
        if (sourceNodes.length < 2) return null;
        
        // Calculate center position
        const centerX = sourceNodes.reduce((sum, n) => sum + n.position.x, 0) / sourceNodes.length;
        const centerY = sourceNodes.reduce((sum, n) => sum + n.position.y, 0) / sourceNodes.length;
        
        // Create merged node
        const mergedNode = this.createNode({
            position: { x: centerX, y: centerY + 150 },
            metadata: {
                mergedFrom: nodeIds,
                mergeType: options.mergeType || 'combine'
            }
        });
        
        // Create edges from source nodes to merged node
        nodeIds.forEach(sourceId => {
            this.createEdge(sourceId, mergedNode.id, {
                prompt: options.prompt || 'Merge images',
                style: 'merge'
            });
        });
        
        return mergedNode;
    }

    // Workflow Management
    saveWorkflow() {
        this.workflow.modified = new Date().toISOString();
        
        if (window.config && window.config.get('autoSave')) {
            this.saveToStorage();
        }
        
        this.emit('workflowSaved', this.workflow);
    }
    
    // Debounced save to prevent excessive storage writes
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveWorkflow();
        }, 1000);
    }

    saveToStorage() {
        try {
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
            const index = workflows.findIndex(w => w.id === this.workflow.id);
            
            const workflowData = {
                ...this.workflow,
                nodes: Array.from(this.nodes.values()),
                edges: Array.from(this.edges.values())
            };
            
            if (index >= 0) {
                workflows[index] = workflowData;
            } else {
                workflows.push(workflowData);
            }
            
            // Keep only recent workflows
            const maxWorkflows = window.config ? window.config.get('maxWorkflows') : 10;
            if (workflows.length > maxWorkflows) {
                workflows.shift();
            }
            
            localStorage.setItem('workflows', JSON.stringify(workflows));
            return true;
        } catch (error) {
            console.error('Failed to save workflow:', error);
            return false;
        }
    }

    loadWorkflow(workflowId) {
        try {
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
            const workflowData = workflows.find(w => w.id === workflowId);
            
            if (!workflowData) return false;
            
            this.clearWorkflow();
            
            this.workflow = {
                id: workflowData.id,
                name: workflowData.name,
                created: workflowData.created,
                modified: workflowData.modified,
                nodes: [],
                edges: []
            };
            
            // Load nodes
            workflowData.nodes.forEach(nodeData => {
                this.nodes.set(nodeData.id, nodeData);
                this.workflow.nodes.push(nodeData.id);
            });
            
            // Load edges
            workflowData.edges.forEach(edgeData => {
                this.edges.set(edgeData.id, edgeData);
                this.workflow.edges.push(edgeData.id);
            });
            
            this.emit('workflowLoaded', this.workflow);
            return true;
        } catch (error) {
            console.error('Failed to load workflow:', error);
            return false;
        }
    }

    clearWorkflow() {
        this.nodes.clear();
        this.edges.clear();
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.workflow = {
            id: this.generateId('workflow'),
            name: 'New Workflow',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            nodes: [],
            edges: []
        };
        this.emit('workflowCleared');
    }

    exportWorkflow() {
        return {
            ...this.workflow,
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            version: '1.0'
        };
    }

    importWorkflow(data) {
        try {
            if (data.version !== '1.0') {
                throw new Error('Unsupported workflow version');
            }
            
            this.clearWorkflow();
            
            this.workflow = {
                id: data.id || this.generateId('workflow'),
                name: data.name || 'Imported Workflow',
                created: data.created || new Date().toISOString(),
                modified: new Date().toISOString(),
                nodes: [],
                edges: []
            };
            
            // Import nodes
            data.nodes.forEach(nodeData => {
                this.nodes.set(nodeData.id, nodeData);
                this.workflow.nodes.push(nodeData.id);
            });
            
            // Import edges
            data.edges.forEach(edgeData => {
                this.edges.set(edgeData.id, edgeData);
                this.workflow.edges.push(edgeData.id);
            });
            
            this.emit('workflowImported', this.workflow);
            this.saveWorkflow();
            
            return true;
        } catch (error) {
            console.error('Failed to import workflow:', error);
            return false;
        }
    }

    // Event System
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index >= 0) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    // Statistics
    getStatistics() {
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            totalImages: Array.from(this.nodes.values()).reduce((sum, node) => sum + node.images.length, 0),
            selectedNodes: this.selectedNodes.size,
            selectedEdges: this.selectedEdges.size
        };
    }
}

// Create global instance
const workflowEngine = new WorkflowEngine();