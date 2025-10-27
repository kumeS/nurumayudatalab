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

        // Auto-restore the last saved workflow
        this.autoLoadWorkflow();

        this.updateStatus();

        // Removed automatic node creation - users should create nodes manually
        // to avoid unwanted nodes on application startup
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

        const transformImageBtn = document.getElementById('transformImageBtn');
        if (transformImageBtn) {
            transformImageBtn.addEventListener('click', () => {
                this.transformSelectedNode();
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

        // Auto Layout button
        const autoLayoutBtn = document.getElementById('autoLayoutBtn');
        if (autoLayoutBtn) {
            autoLayoutBtn.addEventListener('click', () => {
                console.log('Auto layout button clicked');
                if (window.canvasController) {
                    window.canvasController.autoLayout();
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

        const clearWorkflowBtn = document.getElementById('clearWorkflowBtn');
        if (clearWorkflowBtn) {
            clearWorkflowBtn.addEventListener('click', () => {
                this.clearWorkflow();
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

        // Detail panels
        const closeDetailPanel = document.getElementById('closeDetailPanel');
        if (closeDetailPanel) {
            closeDetailPanel.addEventListener('click', () => {
                document.getElementById('nodeDetailPanel')?.classList.add('translate-x-full');
            });
        }

        const closeEdgeDetailPanel = document.getElementById('closeEdgeDetailPanel');
        if (closeEdgeDetailPanel) {
            closeEdgeDetailPanel.addEventListener('click', () => {
                document.getElementById('edgeDetailPanel')?.classList.add('translate-x-full');
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

        // Node type selection modal
        const selectInputNodeBtn = document.getElementById('selectInputNode');
        if (selectInputNodeBtn) {
            selectInputNodeBtn.addEventListener('click', () => {
                console.log('Input node selected');
                this.createNodeWithType('input');
            });
        }

        const selectGeneratedNodeBtn = document.getElementById('selectGeneratedNode');
        if (selectGeneratedNodeBtn) {
            selectGeneratedNodeBtn.addEventListener('click', () => {
                console.log('Generated node selected');
                this.createNodeWithType('generated');
            });
        }

        const closeNodeTypeModalBtn = document.getElementById('closeNodeTypeModal');
        if (closeNodeTypeModalBtn) {
            closeNodeTypeModalBtn.addEventListener('click', () => {
                console.log('Closing node type modal');
                const modal = document.getElementById('nodeTypeModal');
                if (modal) {
                    modal.classList.add('hidden');
                }
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

        // Page unload - force save before leaving
        window.addEventListener('beforeunload', () => {
            console.log('Page unloading, forcing workflow save...');
            if (workflowEngine) {
                workflowEngine.saveWorkflow();
            }
        });
    }

    addNewNode() {
        console.log('Opening node type selection modal');

        // Show node type selection modal
        const modal = document.getElementById('nodeTypeModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    createNodeWithType(nodeType) {
        console.log('Creating new node with type:', nodeType);

        // Get viewport center position
        const centerPosition = window.canvasController?.getViewportCenter() || { x: 400, y: 300 };

        console.log('Creating node at position:', centerPosition);

        // Create node with selected type
        const node = workflowEngine.createNode({
            position: { x: centerPosition.x, y: centerPosition.y },
            nodeType: nodeType,
            adjustPosition: true // Enable position adjustment to avoid overlaps
        });

        if (node) {
            console.log('Created', nodeType, 'node:', node.id, 'at adjusted position:', node.position);
        }

        // Close modal
        const modal = document.getElementById('nodeTypeModal');
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

    transformSelectedNode() {
        const selection = workflowEngine.getSelection();
        if (selection.nodes.length === 0) {
            alert('変換するノードを選択してください');
            return;
        }

        if (selection.nodes.length > 1) {
            alert('1つのノードのみ選択してください');
            return;
        }

        const nodeId = selection.nodes[0];
        const node = workflowEngine.nodes.get(nodeId);

        if (!node) {
            alert('ノードが見つかりませんでした');
            return;
        }

        // Check if node has images
        if (!node.images || node.images.length === 0) {
            alert('画像がありません。先に画像をアップロードしてください。');
            return;
        }

        // Show transform dialog via canvas controller
        if (window.canvasController) {
            window.canvasController.showTransformDialog(nodeId);
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

                // Check if target node is a generated node (upload restriction)
                if (targetNode && targetNode.nodeType === 'generated') {
                    alert('生成ノードには画像を直接アップロードできません。\n入力ノードを作成してアップロードしてください。');
                    return;
                }
            } else {
                // Create new input node when no node is selected
                targetNode = workflowEngine.createNode({
                    position: { x: 400, y: 300 },
                    nodeType: 'input'  // Explicitly set as input node
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

        console.log('Generate prompt with LLM');

        // For demo, set a sample prompt
        const defaultPrompt = 'Transform the image creatively';

        const promptText = document.getElementById('promptText');
        if (promptText) {
            promptText.value = defaultPrompt;
        }
    }

    savePrompt() {
        const edgeId = document.getElementById('edgePromptModal')?.dataset.edgeId;
        if (!edgeId) return;

        const updates = {
            prompt: document.getElementById('promptText')?.value,
            model: document.getElementById('promptModel')?.value,
            aspectRatio: document.getElementById('promptAspectRatio')?.value || '1:1'
        };

        workflowEngine.updateEdge(edgeId, updates);
        this.closePromptEditor();

        // Execute transformation in background (non-blocking parallel execution)
        const edge = workflowEngine.edges.get(edgeId);
        if (edge && edge.prompt && edge.prompt.trim() !== '') {
            console.log(`🚀 Starting background image generation for edge ${edgeId}`);
            this.executeEdgeTransformation(edge).catch(error => {
                console.error(`Background generation failed for edge ${edgeId}:`, error);
            });
        }
    }

    async executeEdgeTransformation(edge) {
        const sourceNode = workflowEngine.nodes.get(edge.source);
        const targetNode = workflowEngine.nodes.get(edge.target);

        if (!sourceNode || !targetNode) return;

        // Check if source node has images
        if (!sourceNode.images || sourceNode.images.length === 0) {
            alert('ソースノードに画像がありません');
            return;
        }

        // Update node status
        workflowEngine.updateNode(targetNode.id, { status: 'processing' });

        console.log('Execute transformation:', {
            source: sourceNode.id,
            target: targetNode.id,
            prompt: edge.prompt,
            model: edge.model
        });

        try {
            // Get source image
            const sourceImage = sourceNode.images[0].url;

            // Get transformation settings
            const model = edge.model || config.get('imageModel') || 'google/nano-banana';
            const count = parseInt(document.getElementById('promptImageCount')?.value || '3');
            const aspectRatio = edge.aspectRatio || '1:1';

            console.log('Calling transformationService with:', {
                sourceImage: sourceImage.substring(0, 50) + '...',
                prompt: edge.prompt,
                count: count,
                model: model,
                aspectRatio: aspectRatio
            });

            // Call actual transformation service with aspect ratio
            const results = await transformationService.transformWithNanoBanana(
                [sourceImage],
                edge.prompt,
                {
                    count: count,
                    aspectRatio: aspectRatio,
                    nodeId: targetNode.id
                }
            );

            console.log('Transformation completed, got', results.length, 'images');

            // Add generated images to target node
            results.forEach(result => {
                workflowEngine.addImageToNode(targetNode.id, {
                    url: result.url,
                    thumbnail: result.thumbnail,
                    metadata: {
                        prompt: edge.prompt,
                        model: model,
                        generatedAt: result.createdAt,
                        ...result.metadata
                    }
                });
            });

            // Update node status to ready
            workflowEngine.updateNode(targetNode.id, { status: 'ready' });

            console.log(`✅ Successfully added ${results.length} images to target node ${targetNode.id}`);

        } catch (error) {
            console.error('Transformation failed:', error);

            // Update node status to error with error message
            workflowEngine.updateNode(targetNode.id, {
                status: 'error',
                errorMessage: error.message || 'Unknown error occurred'
            });

            console.error(`❌ Transformation failed for node ${targetNode.id}:`, error.message);
        }
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

    /**
     * Show edge detail panel
     * @param {string} edgeId - Edge ID to display details for
     */
    showEdgeDetail(edgeId) {
        const edge = workflowEngine.edges.get(edgeId);
        if (!edge) return;

        const panel = document.getElementById('edgeDetailPanel');
        const content = document.getElementById('edgeDetailContent');

        if (!panel || !content) return;

        // Get source and target nodes
        const sourceNode = workflowEngine.nodes.get(edge.source);
        const targetNode = workflowEngine.nodes.get(edge.target);

        // Build edge detail HTML
        const html = `
            <div class="space-y-4">
                <div class="bg-gray-800/50 rounded-lg p-4">
                    <h3 class="text-sm font-medium text-gray-400 mb-2">接続情報</h3>
                    <div class="space-y-2">
                        <div>
                            <span class="text-xs text-gray-500">ソース:</span>
                            <div class="text-sm text-white">${sourceNode ? 'Node ' + sourceNode.id.substr(-6) : '不明'}</div>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500">ターゲット:</span>
                            <div class="text-sm text-white">${targetNode ? 'Node ' + targetNode.id.substr(-6) : '不明'}</div>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-800/50 rounded-lg p-4">
                    <h3 class="text-sm font-medium text-gray-400 mb-2">プロンプト設定</h3>
                    <div class="space-y-2">
                        <div>
                            <span class="text-xs text-gray-500">モデル:</span>
                            <div class="text-sm text-white">${edge.model || '未設定'}</div>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500">アスペクト比:</span>
                            <div class="text-sm text-white">${edge.aspectRatio || '1:1'}</div>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500">プロンプト:</span>
                            <div class="text-sm text-white whitespace-pre-wrap">${edge.prompt || 'プロンプトが設定されていません'}</div>
                        </div>
                    </div>
                </div>

                <div class="space-y-2">
                    <button onclick="window.app.editEdgePrompt('${edgeId}')"
                            class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                        <i class="fas fa-edit mr-2"></i>プロンプトを編集
                    </button>
                    ${edge.prompt && edge.prompt.trim() !== '' ? `
                        <button onclick="window.app.regenerateFromEdge('${edgeId}')"
                                class="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors">
                            <i class="fas fa-rotate mr-2"></i>Re-generate
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Close node detail panel if open
        document.getElementById('nodeDetailPanel')?.classList.add('translate-x-full');

        // Show edge detail panel
        panel.classList.remove('translate-x-full');
    }

    /**
     * Edit edge prompt (triggered from edge detail panel)
     * @param {string} edgeId - Edge ID to edit
     */
    editEdgePrompt(edgeId) {
        const edge = workflowEngine.edges.get(edgeId);
        if (!edge) return;

        // Open prompt editor modal with edge data
        const modal = document.getElementById('edgePromptModal');
        if (!modal) return;

        modal.dataset.edgeId = edgeId;

        // Populate form with current edge data
        const promptText = document.getElementById('promptText');
        if (promptText) promptText.value = edge.prompt || '';

        const promptModel = document.getElementById('promptModel');
        if (promptModel) promptModel.value = edge.model || 'google/nano-banana';

        const promptAspectRatio = document.getElementById('promptAspectRatio');
        if (promptAspectRatio) promptAspectRatio.value = edge.aspectRatio || '1:1';

        modal.classList.remove('hidden');
    }

    /**
     * Regenerate images from edge (triggered from edge detail panel)
     * @param {string} edgeId - Edge ID to regenerate from
     */
    regenerateFromEdge(edgeId) {
        const edge = workflowEngine.edges.get(edgeId);
        if (!edge) {
            console.error('Edge not found:', edgeId);
            return;
        }

        // Validate edge has prompt
        if (!edge.prompt || edge.prompt.trim() === '') {
            console.error('Edge has no prompt configured');
            return;
        }

        // Validate source and target nodes
        const sourceNode = workflowEngine.nodes.get(edge.source);
        const targetNode = workflowEngine.nodes.get(edge.target);

        if (!sourceNode || !targetNode) {
            console.error('Source or target node not found');
            return;
        }

        // Validate source node has images
        if (!sourceNode.images || sourceNode.images.length === 0) {
            console.error('Source node has no images');
            alert('ソースノードに画像がありません');
            return;
        }

        console.log(`🚀 Starting Re-generate for edge ${edgeId} (${sourceNode.id} → ${targetNode.id})`);

        // Execute transformation in background (parallel execution)
        this.executeEdgeTransformation(edge).catch(error => {
            console.error(`Re-generate failed for edge ${edgeId}:`, error);
        });

        // Optionally close the edge detail panel
        // document.getElementById('edgeDetailPanel')?.classList.add('translate-x-full');
    }

    /**
     * Auto-load the most recent workflow from localStorage
     */
    autoLoadWorkflow() {
        console.log('====== AUTO LOAD WORKFLOW ======');

        try {
            const workflowsJson = localStorage.getItem('workflows');
            console.log('LocalStorage workflows key exists:', !!workflowsJson);

            const workflows = JSON.parse(workflowsJson || '[]');
            console.log('Found', workflows.length, 'workflows in localStorage');

            if (workflows.length === 0) {
                console.log('No saved workflows found - starting with empty workflow');
                console.log('================================');
                return;
            }

            // Get the most recent workflow (last one in array)
            const latestWorkflow = workflows[workflows.length - 1];

            console.log('Latest workflow ID:', latestWorkflow.id);
            console.log('Latest workflow name:', latestWorkflow.name);
            console.log('Latest workflow has', latestWorkflow.nodes?.length || 0, 'nodes');
            console.log('Latest workflow has', latestWorkflow.edges?.length || 0, 'edges');

            if (latestWorkflow.nodes && latestWorkflow.nodes.length > 0) {
                console.log('First node:', latestWorkflow.nodes[0]);
            }

            // Load workflow into engine
            console.log('Calling workflowEngine.loadWorkflow()...');
            const success = workflowEngine.loadWorkflow(latestWorkflow.id);

            if (success) {
                console.log('✅ Workflow restored successfully');
                console.log('WorkflowEngine now has', workflowEngine.nodes.size, 'nodes');
                console.log('WorkflowEngine now has', workflowEngine.edges.size, 'edges');

                // The workflowLoaded event will automatically trigger canvasController.loadWorkflow()
                // No need to call it explicitly - that was causing double-loading issues
                console.log('The workflowLoaded event will handle canvas updates automatically');

                this.updateStatus();
            } else {
                console.warn('❌ Failed to restore workflow');
            }
        } catch (error) {
            console.error('❌ Error auto-loading workflow:', error);
            console.error(error.stack);
        }

        console.log('================================');
    }

    /**
     * Clear entire workflow (for clear button)
     */
    clearWorkflow() {
        const confirmed = confirm('すべてのノードとエッジをクリアしてもよろしいですか？\nこの操作は取り消せません。');

        if (confirmed) {
            workflowEngine.clearWorkflow();
            // The workflowCleared event will trigger canvasController.clearCanvas()
            // but we'll also update the status
            this.updateStatus();
            console.log('Workflow cleared');
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    window.app = new WorkflowApp();
    window.app.initialize();
});