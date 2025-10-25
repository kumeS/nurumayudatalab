/**
 * Workflow Application - Main application controller
 */

class WorkflowApp {
    constructor() {
        // Do not initialize here, wait for DOM
    }

    initialize() {
        console.log('Initializing Workflow App');
        
        // Initialize canvas controller
        if (!window.canvasController) {
            window.canvasController = new CanvasController();
            window.canvasController.initialize();
        }
        
        this.setupEventListeners();
        this.loadSettings();
        this.updateStatus();
        
        // Initialize with a default node after a short delay
        setTimeout(() => {
            const firstNode = workflowEngine.createNode({
                position: { x: 400, y: 300 }
            });
            console.log('Created initial node:', firstNode.id);
        }, 1000);
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Toolbar buttons
        const addNodeBtn = document.getElementById('addNodeBtn');
        if (addNodeBtn) {
            addNodeBtn.addEventListener('click', () => {
                console.log('Add node button clicked');
                this.addNewNode();
            });
        }

        const connectNodesBtn = document.getElementById('connectNodesBtn');
        if (connectNodesBtn) {
            connectNodesBtn.addEventListener('click', () => {
                console.log('Connect nodes button clicked');
                this.toggleConnectMode();
            });
        }

        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                console.log('Delete button clicked');
                this.deleteSelected();
            });
        }

        const uploadToNodeBtn = document.getElementById('uploadToNodeBtn');
        if (uploadToNodeBtn) {
            uploadToNodeBtn.addEventListener('click', () => {
                document.getElementById('fileInput')?.click();
            });
        }

        const mergeNodesBtn = document.getElementById('mergeNodesBtn');
        if (mergeNodesBtn) {
            mergeNodesBtn.addEventListener('click', () => {
                this.mergeSelectedNodes();
            });
        }

        // View controls
        const fitViewBtn = document.getElementById('fitViewBtn');
        if (fitViewBtn) {
            fitViewBtn.addEventListener('click', () => {
                console.log('Fit view button clicked');
                if (window.canvasController) {
                    window.canvasController.fitView();
                }
            });
        }

        const zoomInBtn = document.getElementById('zoomInBtn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                console.log('Zoom in button clicked');
                if (window.canvasController) {
                    window.canvasController.zoomIn();
                }
            });
        }

        const zoomOutBtn = document.getElementById('zoomOutBtn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                console.log('Zoom out button clicked');
                if (window.canvasController) {
                    window.canvasController.zoomOut();
                }
            });
        }

        // Workflow controls
        const newWorkflowBtn = document.getElementById('newWorkflowBtn');
        if (newWorkflowBtn) {
            newWorkflowBtn.addEventListener('click', () => {
                this.newWorkflow();
            });
        }

        const saveWorkflowBtn = document.getElementById('saveWorkflowBtn');
        if (saveWorkflowBtn) {
            saveWorkflowBtn.addEventListener('click', () => {
                this.saveWorkflow();
            });
        }

        const loadWorkflowBtn = document.getElementById('loadWorkflowBtn');
        if (loadWorkflowBtn) {
            loadWorkflowBtn.addEventListener('click', () => {
                document.getElementById('workflowFileInput')?.click();
            });
        }

        // Settings
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Detail panel
        const closeDetailPanel = document.getElementById('closeDetailPanel');
        if (closeDetailPanel) {
            closeDetailPanel.addEventListener('click', () => {
                document.getElementById('nodeDetailPanel')?.classList.add('translate-x-full');
            });
        }

        // Edge prompt modal
        const closePromptEditor = document.getElementById('closePromptEditor');
        if (closePromptEditor) {
            closePromptEditor.addEventListener('click', () => {
                this.closePromptEditor();
            });
        }

        const cancelPromptBtn = document.getElementById('cancelPromptBtn');
        if (cancelPromptBtn) {
            cancelPromptBtn.addEventListener('click', () => {
                this.closePromptEditor();
            });
        }

        const generateWithLLMBtn = document.getElementById('generateWithLLMBtn');
        if (generateWithLLMBtn) {
            generateWithLLMBtn.addEventListener('click', () => {
                this.generatePromptWithLLM();
            });
        }

        const savePromptBtn = document.getElementById('savePromptBtn');
        if (savePromptBtn) {
            savePromptBtn.addEventListener('click', () => {
                this.savePrompt();
            });
        }

        // Node Type Modal
        const closeNodeTypeModal = document.getElementById('closeNodeTypeModal');
        if (closeNodeTypeModal) {
            closeNodeTypeModal.addEventListener('click', () => {
                document.getElementById('nodeTypeModal')?.classList.add('hidden');
            });
        }

        const selectInputNode = document.getElementById('selectInputNode');
        if (selectInputNode) {
            selectInputNode.addEventListener('click', () => {
                console.log('Input node selected');
                this.createNodeWithType('input');
            });
        }

        const selectGeneratedNode = document.getElementById('selectGeneratedNode');
        if (selectGeneratedNode) {
            selectGeneratedNode.addEventListener('click', () => {
                console.log('Generated node selected');
                this.createNodeWithType('generated');
            });
        }

        // File inputs
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        const workflowFileInput = document.getElementById('workflowFileInput');
        if (workflowFileInput) {
            workflowFileInput.addEventListener('change', (e) => {
                this.handleWorkflowFileSelect(e.target.files[0]);
            });
        }

        // Context menu is now handled by canvasController

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
        });

        // Engine events
        workflowEngine.on('workflowSaved', () => {
            this.updateStatus();
        });

        workflowEngine.on('nodeCreated', () => {
            this.updateStatus();
        });

        workflowEngine.on('edgeCreated', () => {
            this.updateStatus();
        });

        workflowEngine.on('nodeDeleted', () => {
            this.updateStatus();
        });

        workflowEngine.on('edgeDeleted', () => {
            this.updateStatus();
        });

        workflowEngine.on('modeChanged', (mode) => {
            this.updateModeIndicator(mode);
        });
    }

    addNewNode() {
        console.log('Opening node type selection modal');
        // Show node type selection modal instead of creating node directly
        const modal = document.getElementById('nodeTypeModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Store center position for later use
            const centerPosition = window.canvasController?.network?.getViewPosition() || { x: 400, y: 300 };
            modal.dataset.positionX = centerPosition.x;
            modal.dataset.positionY = centerPosition.y;
        }
    }

    createNodeWithType(nodeType) {
        console.log('Creating node with type:', nodeType);
        const modal = document.getElementById('nodeTypeModal');
        
        // Get stored position from modal
        const x = parseFloat(modal?.dataset.positionX) || 400;
        const y = parseFloat(modal?.dataset.positionY) || 300;
        
        const node = workflowEngine.createNode({
            position: { x, y },
            nodeType: nodeType
        });
        
        console.log('Created new node:', node.id, 'with type:', nodeType);
        
        // Hide modal
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    toggleConnectMode() {
        const newMode = workflowEngine.mode === 'connect' ? 'select' : 'connect';
        workflowEngine.setMode(newMode);
        
        const btn = document.getElementById('connectNodesBtn');
        if (btn) {
            if (newMode === 'connect') {
                btn.classList.add('bg-purple-600');
                btn.classList.remove('bg-blue-600');
            } else {
                btn.classList.add('bg-blue-600');
                btn.classList.remove('bg-purple-600');
            }
        }
    }

    deleteSelected() {
        const selection = workflowEngine.getSelection();
        
        // Delete edges first
        selection.edges.forEach(edgeId => {
            workflowEngine.deleteEdge(edgeId);
        });
        
        // Then delete nodes
        selection.nodes.forEach(nodeId => {
            workflowEngine.deleteNode(nodeId);
        });
    }

    mergeSelectedNodes() {
        const selection = workflowEngine.getSelection();
        if (selection.nodes.length < 2) {
            alert('Please select at least 2 nodes to merge');
            return;
        }
        
        const mergedNode = workflowEngine.mergeNodes(selection.nodes, {
            mergeType: 'combine',
            prompt: 'Merge and blend images creatively'
        });
        
        if (mergedNode) {
            console.log('Created merged node:', mergedNode.id);
        }
    }

    async handleFileSelect(files) {
        try {
            const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            
            if (imageFiles.length === 0) {
                console.warn('No image files selected');
                return;
            }
            
            // Get selected node or create new one
            const selection = workflowEngine.getSelection();
            let targetNode;
            
            if (selection.nodes.length > 0) {
                targetNode = workflowEngine.nodes.get(selection.nodes[0]);
            } else {
                targetNode = workflowEngine.createNode({
                    position: { x: 400, y: 300 }
                });
            }
            
            if (!targetNode) {
                throw new Error('Failed to get or create target node');
            }
            
            // Upload images to node with error handling
            const uploadPromises = imageFiles.map(file => 
                this.uploadImageToNode(targetNode.id, file).catch(error => {
                    console.error(`Failed to upload ${file.name}:`, error);
                    return null;
                })
            );
            
            const results = await Promise.allSettled(uploadPromises);
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            
            if (successCount > 0) {
                console.log(`Successfully uploaded ${successCount}/${imageFiles.length} images`);
            } else {
                console.error('All image uploads failed');
            }
        } catch (error) {
            console.error('Error handling file selection:', error);
            if (window.nodeManager) {
                window.nodeManager.showNotification('画像のアップロードに失敗しました', 'error');
            }
        }
    }

    async uploadImageToNode(nodeId, file) {
        return new Promise((resolve, reject) => {
            console.log('uploadImageToNode called for:', nodeId, file.name);
            
            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                reject(new Error(`File ${file.name} exceeds maximum size of 10MB`));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    console.log('FileReader onload triggered for:', file.name);
                    
                    const imageData = {
                        url: e.target.result,
                        thumbnail: e.target.result,
                        metadata: {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            uploadedAt: new Date().toISOString()
                        }
                    };
                    
                    const result = workflowEngine.addImageToNode(nodeId, imageData);
                    console.log('Image added to engine:', result);
                    resolve(result);
                } catch (error) {
                    console.error('Error processing image:', error);
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(error);
            };
            
            reader.onabort = () => {
                reject(new Error('File reading was aborted'));
            };
            
            try {
                reader.readAsDataURL(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    async handleWorkflowFileSelect(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (workflowEngine.importWorkflow(data)) {
                    alert('Workflow imported successfully');
                } else {
                    alert('Failed to import workflow');
                }
            } catch (error) {
                console.error('Import error:', error);
                alert('Invalid workflow file');
            }
        };
        reader.readAsText(file);
    }

    handleContextMenuAction(action, nodeId) {
        const text = action.textContent.trim();
        
        if (text.includes('アップロード')) {
            // Trigger file upload for this node
            workflowEngine.selectNode(nodeId);
            document.getElementById('fileInput')?.click();
        } else if (text.includes('プロンプト生成')) {
            this.generatePromptForNode(nodeId);
        } else if (text.includes('変換実行')) {
            this.executeTransformation(nodeId);
        } else if (text.includes('複製')) {
            this.duplicateNode(nodeId);
        } else if (text.includes('削除')) {
            workflowEngine.deleteNode(nodeId);
        }
        
        // Hide context menu
        document.getElementById('nodeContextMenu')?.classList.add('hidden');
    }

    duplicateNode(nodeId) {
        const sourceNode = workflowEngine.nodes.get(nodeId);
        if (!sourceNode) return;
        
        const newNode = workflowEngine.createNode({
            position: {
                x: sourceNode.position.x + 50,
                y: sourceNode.position.y + 50
            },
            images: [...sourceNode.images],
            metadata: { ...sourceNode.metadata, duplicatedFrom: nodeId }
        });
        
        console.log('Duplicated node:', newNode.id);
    }

    async generatePromptForNode(nodeId) {
        const node = workflowEngine.nodes.get(nodeId);
        if (!node || node.images.length === 0) {
            alert('Node must have at least one image');
            return;
        }
        
        console.log('Generate prompt for node:', nodeId);
    }

    async executeTransformation(nodeId) {
        const node = workflowEngine.nodes.get(nodeId);
        if (!node) return;
        
        // Get incoming edges
        const incomingEdges = workflowEngine.getConnectedEdges(nodeId)
            .filter(edge => edge.target === nodeId);
        
        if (incomingEdges.length === 0) {
            alert('Node must have incoming connections with prompts');
            return;
        }
        
        console.log('Execute transformation for node:', nodeId);
    }

    handleKeyboardShortcut(e) {
        // N: Add new node
        if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.addNewNode();
        }
        
        // C: Connect mode
        if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.toggleConnectMode();
        }
        
        // Delete: Delete selected
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.deleteSelected();
        }
        
        // Ctrl/Cmd + S: Save workflow
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveWorkflow();
        }
        
        // Ctrl/Cmd + O: Open workflow
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            document.getElementById('workflowFileInput')?.click();
        }
        
        // Escape: Cancel operations
        if (e.key === 'Escape') {
            workflowEngine.setMode('select');
            if (window.canvasController) {
                window.canvasController.cancelConnection();
            }
            this.closePromptEditor();
            document.getElementById('nodeDetailPanel')?.classList.add('translate-x-full');
        }
    }

    newWorkflow() {
        if (confirm('Create new workflow? Unsaved changes will be lost.')) {
            workflowEngine.clearWorkflow();
        }
    }

    saveWorkflow() {
        const data = workflowEngine.exportWorkflow();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Workflow saved');
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        // Load current settings
        const ioApiKey = document.getElementById('ioApiKey');
        if (ioApiKey) ioApiKey.value = config.get('ioApiKey') || '';
        
        const replicateApiKey = document.getElementById('replicateApiKey');
        if (replicateApiKey) replicateApiKey.value = config.get('replicateApiKey') || '';
        
        const defaultModel = document.getElementById('defaultModel');
        if (defaultModel) defaultModel.value = config.get('imageModel');
        
        const llmModel = document.getElementById('llmModel');
        if (llmModel) llmModel.value = config.get('llmModel');
        
        const aspectRatio = document.getElementById('aspectRatio');
        if (aspectRatio) aspectRatio.value = config.get('aspectRatio');
        
        const outputFormat = document.getElementById('outputFormat');
        if (outputFormat) outputFormat.value = config.get('outputFormat');
        
        const autoSave = document.getElementById('autoSave');
        if (autoSave) autoSave.checked = config.get('autoSave');
        
        modal.classList.remove('hidden');
    }

    closeSettings() {
        document.getElementById('settingsModal')?.classList.add('hidden');
    }

    saveSettings() {
        config.setMultiple({
            ioApiKey: document.getElementById('ioApiKey')?.value || '',
            replicateApiKey: document.getElementById('replicateApiKey')?.value || '',
            imageModel: document.getElementById('defaultModel')?.value || 'google/nano-banana',
            llmModel: document.getElementById('llmModel')?.value || 'gpt-o1s-120B',
            aspectRatio: document.getElementById('aspectRatio')?.value || '1:1',
            outputFormat: document.getElementById('outputFormat')?.value || 'png',
            autoSave: document.getElementById('autoSave')?.checked || false
        });
        
        this.closeSettings();
        console.log('Settings saved');
    }

    loadSettings() {
        console.log('Settings loaded');
    }

    closePromptEditor() {
        document.getElementById('edgePromptModal')?.classList.add('hidden');
    }

    async generatePromptWithLLM() {
        const edgeId = document.getElementById('edgePromptModal')?.dataset.edgeId;
        if (!edgeId) return;
        
        const edge = workflowEngine.edges.get(edgeId);
        if (!edge) return;
        
        // Get source node images
        const sourceNode = workflowEngine.nodes.get(edge.source);
        if (!sourceNode || sourceNode.images.length === 0) {
            alert('Source node must have images');
            return;
        }
        
        const style = document.getElementById('promptStyle')?.value;
        console.log('Generate prompt with LLM for style:', style);
        
        // For demo, set a sample prompt
        const samplePrompts = {
            artistic: 'Transform into vibrant artistic masterpiece with bold colors',
            photorealistic: 'Enhance to ultra-realistic photography with perfect lighting',
            anime: 'Convert to anime style with characteristic features',
            merge: 'Creatively blend and merge multiple images into cohesive composition'
        };
        
        const promptText = document.getElementById('promptText');
        if (promptText) {
            promptText.value = samplePrompts[style] || 'Custom transformation';
        }
    }

    savePrompt() {
        const edgeId = document.getElementById('edgePromptModal')?.dataset.edgeId;
        if (!edgeId) return;
        
        const updates = {
            style: document.getElementById('promptStyle')?.value,
            prompt: document.getElementById('promptText')?.value,
            model: document.getElementById('promptModel')?.value
        };
        
        workflowEngine.updateEdge(edgeId, updates);
        this.closePromptEditor();
        
        // Execute transformation if configured
        const edge = workflowEngine.edges.get(edgeId);
        if (edge) {
            this.executeEdgeTransformation(edge);
        }
    }

    async executeEdgeTransformation(edge) {
        const sourceNode = workflowEngine.nodes.get(edge.source);
        const targetNode = workflowEngine.nodes.get(edge.target);
        
        if (!sourceNode || !targetNode) return;
        
        // Update node status
        workflowEngine.updateNode(targetNode.id, { status: 'processing' });
        
        console.log('Execute transformation:', {
            source: sourceNode.id,
            target: targetNode.id,
            prompt: edge.prompt,
            model: edge.model
        });
        
        // Simulate transformation
        setTimeout(() => {
            // Add dummy result images
            const resultImages = [];
            const count = parseInt(document.getElementById('promptImageCount')?.value || '3');
            
            for (let i = 0; i < count; i++) {
                resultImages.push({
                    url: sourceNode.images[0]?.url || '',
                    metadata: {
                        prompt: edge.prompt,
                        model: edge.model,
                        generatedAt: new Date().toISOString()
                    }
                });
            }
            
            // Add images to target node
            resultImages.forEach(img => {
                workflowEngine.addImageToNode(targetNode.id, img);
            });
            
            // Update node status
            workflowEngine.updateNode(targetNode.id, { status: 'ready' });
        }, 2000);
    }

    updateStatus() {
        const stats = workflowEngine.getStatistics();
        
        const nodeCount = document.getElementById('nodeCount');
        if (nodeCount) nodeCount.textContent = stats.nodeCount;
        
        const edgeCount = document.getElementById('edgeCount');
        if (edgeCount) edgeCount.textContent = stats.edgeCount;
        
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) selectedCount.textContent = stats.selectedNodes + stats.selectedEdges;
    }

    updateModeIndicator(mode) {
        const indicator = document.getElementById('currentMode');
        if (!indicator) return;
        
        const modeText = {
            select: '<i class="fas fa-mouse-pointer mr-1"></i>選択モード',
            connect: '<i class="fas fa-link mr-1"></i>接続モード',
            delete: '<i class="fas fa-trash mr-1"></i>削除モード'
        };
        
        indicator.innerHTML = modeText[mode] || modeText.select;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    window.app = new WorkflowApp();
    window.app.initialize();
});