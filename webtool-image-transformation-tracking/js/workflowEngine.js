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

    /**
     * Check if a position is occupied by another node
     * @param {Object} position - {x, y} position to check
     * @param {number} threshold - Distance threshold for collision detection
     * @returns {boolean} True if position is occupied
     */
    isPositionOccupied(position, threshold = 30) {
        for (const node of this.nodes.values()) {
            const dx = node.position.x - position.x;
            const dy = node.position.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < threshold) {
                return true;
            }
        }
        return false;
    }

    /**
     * Find an unoccupied position near the target position
     * Uses spiral pattern to find free space
     * @param {Object} targetPosition - {x, y} desired position
     * @param {number} threshold - Distance threshold for collision detection
     * @returns {Object} {x, y} adjusted position
     */
    findUnoccupiedPosition(targetPosition, threshold = 30) {
        // If target position is free, use it
        if (!this.isPositionOccupied(targetPosition, threshold)) {
            return targetPosition;
        }

        // Spiral search for free position
        const maxAttempts = 50;
        const spiralStep = threshold * 1.5; // Step size for spiral

        for (let i = 1; i <= maxAttempts; i++) {
            const angle = i * 0.5; // Angle increment
            const radius = i * spiralStep / 5; // Radius grows slowly

            const x = targetPosition.x + Math.cos(angle) * radius;
            const y = targetPosition.y + Math.sin(angle) * radius;

            const testPosition = { x, y };

            if (!this.isPositionOccupied(testPosition, threshold)) {
                console.log(`Found unoccupied position after ${i} attempts:`, testPosition);
                return testPosition;
            }
        }

        // Fallback: just offset by a larger amount
        console.warn('Could not find unoccupied position in spiral, using fallback offset');
        return {
            x: targetPosition.x + Math.random() * 100 - 50,
            y: targetPosition.y + Math.random() * 100 - 50
        };
    }

    // Node Management
    createNode(options = {}) {
        try {
            // Determine initial position
            let initialPosition = options.position || { x: 100, y: 100 };

            // Check if position adjustment is needed (unless explicitly disabled)
            if (options.adjustPosition !== false) {
                initialPosition = this.findUnoccupiedPosition(initialPosition);
            }

            const node = {
                id: options.id || this.generateId('node'),
                type: options.type || 'image',
                nodeType: options.nodeType || 'input', // 'input' or 'generated'
                position: initialPosition,
                images: options.images || [],
                metadata: options.metadata || {},
                status: 'ready',
                currentIndex: 0,
                created: new Date().toISOString()
            };

            this.nodes.set(node.id, node);
            this.workflow.nodes.push(node.id);
            this.emit('nodeCreated', node);

            // Save immediately to ensure data persistence
            this.saveWorkflow();

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

        // Save immediately to ensure data persistence
        this.saveWorkflow();

        return true;
    }

    addImageToNode(nodeId, imageData) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            console.error('❌ addImageToNode: Node not found:', nodeId);
            return null;
        }

        const image = {
            id: this.generateId('img'),
            url: imageData.url,
            thumbnail: imageData.thumbnail || imageData.url,
            metadata: imageData.metadata || {},
            created: new Date().toISOString()
        };

        node.images.push(image);
        console.log(`📸 Image added to node ${nodeId.substr(-6)}: Total images now = ${node.images.length}`);
        console.log(`   Image URL type: ${image.url.startsWith('data:') ? 'base64' : 'URL'}`);
        console.log(`   Image URL length: ${image.url.length} chars`);

        this.emit('imageAdded', { nodeId, image });

        // Save immediately to ensure data persistence
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
                prompt: options.prompt || 'Merge images'
            });
        });
        
        return mergedNode;
    }

    // Workflow Management
    saveWorkflow() {
        this.workflow.modified = new Date().toISOString();

        // Always save to storage to ensure data persistence
        this.saveToStorage();

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

            // Debug: Log image counts before saving
            console.log('💾 SAVING WORKFLOW TO LOCALSTORAGE');
            let totalImages = 0;
            workflowData.nodes.forEach(node => {
                const imageCount = node.images ? node.images.length : 0;
                totalImages += imageCount;
                if (imageCount > 0) {
                    console.log(`   Node ${node.id.substr(-6)}: ${imageCount} images`);
                    node.images.forEach((img, idx) => {
                        console.log(`      Image ${idx + 1}: ${img.url.startsWith('data:') ? 'base64' : 'URL'} (${img.url.length} chars)`);
                    });
                }
            });
            console.log(`   Total images in workflow: ${totalImages}`);

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

            const jsonString = JSON.stringify(workflows);
            const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
            console.log(`   LocalStorage size: ${sizeInMB} MB`);

            localStorage.setItem('workflows', jsonString);
            console.log('✅ Workflow saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to save workflow:', error);
            if (error.name === 'QuotaExceededError') {
                console.error('⚠️ LocalStorage quota exceeded! Data is too large.');
                alert('保存容量を超えました。画像が多すぎる可能性があります。一部のノードを削除してください。');
            }
            return false;
        }
    }

    loadWorkflow(workflowId) {
        console.log('====== WORKFLOW ENGINE LOAD ======');
        console.log('Loading workflow ID:', workflowId);

        try {
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
            console.log('Total workflows in storage:', workflows.length);

            const workflowData = workflows.find(w => w.id === workflowId);

            if (!workflowData) {
                console.error('❌ Workflow not found:', workflowId);
                console.log('==================================');
                return false;
            }

            console.log('Found workflow:', workflowData.name);
            console.log('Workflow data has', workflowData.nodes?.length || 0, 'nodes');
            console.log('Workflow data has', workflowData.edges?.length || 0, 'edges');

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
            let loadedNodes = 0;
            let totalImagesLoaded = 0;
            workflowData.nodes.forEach(nodeData => {
                const imageCount = nodeData.images ? nodeData.images.length : 0;
                totalImagesLoaded += imageCount;
                console.log(`Loading node: ${nodeData.id.substr(-6)} at position:`, nodeData.position, `with ${imageCount} images`);
                if (imageCount > 0) {
                    nodeData.images.forEach((img, idx) => {
                        console.log(`   Image ${idx + 1}: ${img.url.startsWith('data:') ? 'base64' : 'URL'} (${img.url.length} chars)`);
                    });
                }
                this.nodes.set(nodeData.id, nodeData);
                this.workflow.nodes.push(nodeData.id);
                loadedNodes++;
            });
            console.log(`📸 Total images loaded from storage: ${totalImagesLoaded}`);

            // Load edges
            let loadedEdges = 0;
            workflowData.edges.forEach(edgeData => {
                console.log('Loading edge:', edgeData.id);
                this.edges.set(edgeData.id, edgeData);
                this.workflow.edges.push(edgeData.id);
                loadedEdges++;
            });

            console.log('✅ Loaded', loadedNodes, 'nodes and', loadedEdges, 'edges into engine');
            console.log('Engine nodes Map size:', this.nodes.size);
            console.log('Engine edges Map size:', this.edges.size);
            console.log('Emitting workflowLoaded event...');

            this.emit('workflowLoaded', this.workflow);

            console.log('==================================');
            return true;
        } catch (error) {
            console.error('❌ Failed to load workflow:', error);
            console.error(error.stack);
            console.log('==================================');
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
    
    // Helper Functions
    /**
     * Check if a node can accept external image uploads
     * @param {string} nodeId - Node ID
     * @returns {boolean} - True if node can accept uploads (input nodes only)
     */
    canUploadImage(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        return node.nodeType === 'input';
    }
    
    /**
     * Get incoming edges for a node
     * @param {string} nodeId - Node ID
     * @returns {Array} - Array of incoming edges
     */
    getIncomingEdges(nodeId) {
        return Array.from(this.edges.values()).filter(edge => edge.target === nodeId);
    }
    
    /**
     * Get outgoing edges for a node
     * @param {string} nodeId - Node ID
     * @returns {Array} - Array of outgoing edges
     */
    getOutgoingEdges(nodeId) {
        return Array.from(this.edges.values()).filter(edge => edge.source === nodeId);
    }
    
    /**
     * Check if a node can generate images (has incoming edges with prompts)
     * @param {string} nodeId - Node ID
     * @returns {boolean} - True if node can generate
     */
    canGenerateImages(nodeId) {
        const incomingEdges = this.getIncomingEdges(nodeId);
        return incomingEdges.length > 0 && incomingEdges.some(edge => edge.prompt && edge.prompt.trim() !== '');
    }
}

// Create global instance
const workflowEngine = new WorkflowEngine();