/**
 * Canvas Controller - Manages the visual workflow canvas using Vis.js
 */

class CanvasController {
    constructor() {
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.container = null;
        this.connectingFrom = null;
        this.isDragging = false;
        this.tempEdgeId = 'temp-edge';
        this.nodeImageIndexes = new Map(); // Track current image index for each node
        this.circleMenu = null;
        this.circleMenuHandlers = new Map(); // Store event handlers for cleanup
        this.rightClickedNodeId = null; // Track right-clicked node
    }

    initialize() {
        this.container = document.getElementById('workflowCanvas');
        if (this.container) {
            this.setupNetwork();
            this.bindEngineEvents();
            this.setupInteractions();
            this.createCircleMenu();
            this.setupGlobalEventListeners();
            console.log('Canvas Controller initialized');
        }
    }
    
    setupGlobalEventListeners() {
        // Wait for canvas to be created by vis.js
        setTimeout(() => {
            const canvas = this.container.querySelector('canvas');
            if (canvas) {
                canvas.addEventListener('contextmenu', (e) => {
                    console.log('Canvas contextmenu at:', e.clientX, e.clientY);
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Get the node at this position
                    const rect = canvas.getBoundingClientRect();
                    const domPosition = { 
                        x: e.clientX - rect.left, 
                        y: e.clientY - rect.top 
                    };
                    const canvasPosition = this.network.DOMtoCanvas(domPosition);
                    const nodeId = this.network.getNodeAt(canvasPosition);
                    
                    console.log('Found node:', nodeId, 'at canvas position:', canvasPosition);
                    
                    if (nodeId) {
                        this.handleNodeRightClick(nodeId, e);
                    }
                    
                    return false;
                });
                console.log('Canvas contextmenu listener successfully added');
            } else {
                console.error('Canvas element not found after delay');
            }
        }, 500);
    }
    
    handleNodeRightClick(nodeId, event) {
        console.log('handleNodeRightClick:', nodeId);
        
        // Hide any existing menu
        this.hideCircleMenu();
        
        // Store the clicked node
        this.rightClickedNodeId = nodeId;
        
        // Disable dragging temporarily
        this.network.setOptions({
            interaction: { dragNodes: false }
        });
        
        // Show the menu
        this.showCircleMenu(nodeId, event);
        
        // Re-enable dragging after a delay
        setTimeout(() => {
            this.network.setOptions({
                interaction: { dragNodes: true }
            });
        }, 500);
    }

    setupNetwork() {
        // Create datasets
        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);

        // Network options with custom renderer
        const options = {
            nodes: {
                shape: 'custom',
                ctxRenderer: this.nodeRenderer.bind(this),
                font: {
                    size: 14,
                    color: '#FFFFFF',
                    face: 'Inter'
                },
                borderWidth: 3,
                borderWidthSelected: 4,
                size: 100,
                chosen: true
            },
            edges: {
                width: 3,
                color: {
                    color: '#9333EA',
                    highlight: '#EC4899',
                    hover: '#EC4899'
                },
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 1,
                        type: 'arrow'
                    }
                },
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    roundness: 0.2
                },
                font: {
                    size: 12,
                    color: '#FFFFFF',
                    background: '#1F2937',
                    strokeWidth: 3,
                    strokeColor: '#1F2937'
                },
                chosen: true,
                labelHighlightBold: true
            },
            physics: {
                enabled: false
            },
            interaction: {
                hover: true,
                hoverConnectedEdges: true,
                multiselect: true,
                navigationButtons: false,
                zoomView: true,
                dragView: true,
                dragNodes: true
            },
            manipulation: {
                enabled: false
            }
        };

        // Create network
        const data = { nodes: this.nodes, edges: this.edges };
        this.network = new vis.Network(this.container, data, options);

        // Setup network events
        this.setupNetworkEvents();
        
        console.log('Network initialized');
    }

    nodeRenderer({ctx, id, x, y, state: {selected, hover}, style, label}) {
        const node = workflowEngine.nodes.get(id);
        if (!node) return;

        const width = 220;
        const height = 160;
        const radius = 10;

        // Shadow
        ctx.shadowColor = selected ? 'rgba(236, 72, 153, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = selected ? 20 : 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;

        // Background - different colors for active/inactive
        const hasImages = node.images && node.images.length > 0;
        const isActive = hasImages;
        
        this.roundRect(ctx, x - width/2, y - height/2, width, height, radius);
        if (isActive) {
            // Active node - purple gradient
            const gradient = ctx.createLinearGradient(x - width/2, y - height/2, x + width/2, y + height/2);
            gradient.addColorStop(0, selected ? '#6D28D9' : '#4C1D95');
            gradient.addColorStop(1, selected ? '#7C3AED' : '#5B21B6');
            ctx.fillStyle = gradient;
        } else {
            // Inactive node - dark gray
            ctx.fillStyle = selected ? '#374151' : hover ? '#1F2937' : '#111827';
        }
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Border - more prominent for active nodes
        if (isActive) {
            ctx.strokeStyle = selected ? '#EC4899' : hover ? '#A78BFA' : '#8B5CF6';
            ctx.lineWidth = selected ? 4 : 3;
        } else {
            ctx.strokeStyle = selected ? '#6B7280' : hover ? '#4B5563' : '#374151';
            ctx.lineWidth = 2;
        }
        this.roundRect(ctx, x - width/2, y - height/2, width, height, radius);
        ctx.stroke();

        // Header
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.roundRect(ctx, x - width/2, y - height/2, width, 30, radius, true, false);
        ctx.fill();

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shortId = id.substr(-6);
        ctx.fillText(`Node ${shortId}`, x, y - height/2 + 15);

        // Image thumbnail or placeholder
        if (hasImages) {
            // Get current image index
            let currentIndex = this.nodeImageIndexes.get(id) || 0;
            if (currentIndex >= node.images.length) currentIndex = 0;
            
            const image = node.images[currentIndex];
            const imgSize = 80;
            const imgY = y - 20;

            // Draw image placeholder
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(x - imgSize/2, imgY - imgSize/2, imgSize, imgSize);
            
            // Try to draw actual image
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, x - imgSize/2, imgY - imgSize/2, imgSize, imgSize);
            };
            img.src = image.thumbnail || image.url;

            // Image counter
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x - imgSize/2, imgY + imgSize/2 - 20, imgSize, 20);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '11px Inter';
            ctx.fillText(`${currentIndex + 1} / ${node.images.length}`, x, imgY + imgSize/2 - 10);

            // Navigation arrows if multiple images
            if (node.images.length > 1) {
                // Left arrow
                ctx.fillStyle = hover ? '#EC4899' : '#9333EA';
                ctx.beginPath();
                ctx.moveTo(x - imgSize/2 - 15, imgY);
                ctx.lineTo(x - imgSize/2 - 5, imgY - 8);
                ctx.lineTo(x - imgSize/2 - 5, imgY + 8);
                ctx.closePath();
                ctx.fill();

                // Right arrow
                ctx.beginPath();
                ctx.moveTo(x + imgSize/2 + 15, imgY);
                ctx.lineTo(x + imgSize/2 + 5, imgY - 8);
                ctx.lineTo(x + imgSize/2 + 5, imgY + 8);
                ctx.closePath();
                ctx.fill();
            }

            // Metadata
            if (image.metadata?.name) {
                ctx.fillStyle = '#9CA3AF';
                ctx.font = '10px Inter';
                const name = image.metadata.name;
                const shortName = name.length > 25 ? name.substr(0, 22) + '...' : name;
                ctx.fillText(shortName, x, y + height/2 - 15);
            }
        } else {
            // No images - show upload hint
            ctx.fillStyle = '#6B7280';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('📤 Drop images here', x, y - 10);
            ctx.font = '11px Inter';
            ctx.fillText('or right-click to upload', x, y + 10);
        }

        // Status indicator
        const statusColor = node.status === 'processing' ? '#F59E0B' : 
                           node.status === 'error' ? '#EF4444' : '#10B981';
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(x + width/2 - 15, y - height/2 + 15, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Return the required structure for vis.js
        // Don't return drawExternalLabel to avoid the error
        return {
            nodeDimensions: {x: x - width/2, y: y - height/2, w: width, h: height}
        };
    }

    roundRect(ctx, x, y, width, height, radius, topOnly = false, bottomOnly = false) {
        ctx.beginPath();
        if (topOnly) {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        ctx.closePath();
    }

    createCircleMenu() {
        // Clean up existing menu if present
        if (this.circleMenu) {
            this.circleMenu.remove();
        }

        // Create circle menu container
        const menu = document.createElement('div');
        menu.id = 'circleMenu';
        menu.className = 'fixed hidden';
        menu.style.zIndex = '10000'; // Ensure high z-index
        menu.innerHTML = `
            <div class="circle-menu-container">
                <div class="circle-menu-center"></div>
                <div class="circle-menu-item" data-action="upload" style="--angle: 0deg;">
                    <i class="fas fa-upload"></i>
                    <span>Upload</span>
                </div>
                <div class="circle-menu-item" data-action="transform" style="--angle: 72deg;">
                    <i class="fas fa-magic"></i>
                    <span>Transform</span>
                </div>
                <div class="circle-menu-item" data-action="duplicate" style="--angle: 144deg;">
                    <i class="fas fa-copy"></i>
                    <span>Duplicate</span>
                </div>
                <div class="circle-menu-item" data-action="connect" style="--angle: 216deg;">
                    <i class="fas fa-link"></i>
                    <span>Connect</span>
                </div>
                <div class="circle-menu-item" data-action="delete" style="--angle: 288deg;">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </div>
            </div>
        `;
        document.body.appendChild(menu);
        this.circleMenu = menu;

        // Add styles for circle menu if not already present
        if (!document.getElementById('circleMenuStyles')) {
            const style = document.createElement('style');
            style.id = 'circleMenuStyles';
            style.textContent = `
                .circle-menu-container {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    pointer-events: none;
                }
                .circle-menu-center {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 60px;
                    height: 60px;
                    background: #374151;
                    border: 3px solid #EC4899;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                    pointer-events: auto;
                }
                .circle-menu-item {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 50px;
                    height: 50px;
                    background: #1F2937;
                    border: 2px solid #9333EA;
                    border-radius: 50%;
                    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(70px) rotate(calc(-1 * var(--angle)));
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    opacity: 0;
                    animation: circleMenuItemAppear 0.3s forwards;
                    animation-delay: calc(var(--angle) / 360 * 0.2s);
                    pointer-events: auto;
                }
                .circle-menu-item:hover {
                    background: #9333EA;
                    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(70px) rotate(calc(-1 * var(--angle))) scale(1.2);
                }
                .circle-menu-item i {
                    font-size: 18px;
                    color: white;
                    margin-bottom: 2px;
                }
                .circle-menu-item span {
                    font-size: 9px;
                    color: white;
                    text-align: center;
                }
                @keyframes circleMenuItemAppear {
                    to {
                        opacity: 1;
                    }
                }
                #circleMenu.hidden {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('Circle menu created and added to DOM');
    }

    setupNetworkEvents() {
        // Click events
        this.network.on('click', (params) => {
            // Handle image navigation
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = workflowEngine.nodes.get(nodeId);
                
                if (node && node.images && node.images.length > 1) {
                    const pos = this.network.getPositions([nodeId])[nodeId];
                    const pointer = params.pointer.canvas;
                    
                    // Check if clicked on navigation arrows
                    const imgSize = 80;
                    const arrowWidth = 20;
                    
                    if (Math.abs(pointer.y - pos.y + 20) < imgSize/2) {
                        if (pointer.x < pos.x - imgSize/2 && pointer.x > pos.x - imgSize/2 - arrowWidth) {
                            // Left arrow clicked
                            this.navigateNodeImage(nodeId, -1);
                            return;
                        } else if (pointer.x > pos.x + imgSize/2 && pointer.x < pos.x + imgSize/2 + arrowWidth) {
                            // Right arrow clicked
                            this.navigateNodeImage(nodeId, 1);
                            return;
                        }
                    }
                }
                
                this.handleNodeClick(nodeId, params.event);
            } else if (params.edges.length > 0) {
                const edgeId = params.edges[0];
                this.handleEdgeClick(edgeId, params.event);
            } else {
                workflowEngine.clearSelection();
                this.hideCircleMenu();
            }
        });

        // Double click - NO NODE CREATION, only show details or edge prompt
        this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                this.showNodeDetails(nodeId);
            } else if (params.edges.length > 0) {
                const edgeId = params.edges[0];
                this.showEdgePromptMenu(edgeId);
            }
            // NO ELSE CLAUSE - don't create nodes on empty space double-click
        });

        // Right click (context menu) - Using vis.js event
        // Note: This may not work in all browsers, so we also have a backup in setupGlobalEventListeners
        this.network.on('oncontext', (params) => {
            console.log('Vis.js oncontext event:', params);
            
            if (params.event) {
                params.event.preventDefault();
            }
            
            if (params.nodes && params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const event = params.event || { clientX: 100, clientY: 100 };
                this.handleNodeRightClick(nodeId, event);
            }
        });

        // Drag events
        this.network.on('dragStart', (params) => {
            // Don't start drag if we just right-clicked
            if (this.rightClickedNodeId && params.nodes.includes(this.rightClickedNodeId)) {
                return false;
            }
            
            if (params.nodes.length > 0) {
                this.isDragging = true;
                this.hideCircleMenu();
            }
        });

        this.network.on('dragEnd', (params) => {
            if (params.nodes.length > 0 && this.isDragging) {
                this.isDragging = false;
                const nodeId = params.nodes[0];
                const position = this.network.getPositions([nodeId])[nodeId];
                if (position) {
                    workflowEngine.updateNode(nodeId, { position });
                }
            }
        });

        // Mouse move - clear right-clicked node when moving
        this.network.on('hoverNode', () => {
            if (this.rightClickedNodeId) {
                // Re-enable dragging after hover
                this.network.setOptions({
                    interaction: {
                        dragNodes: true
                    }
                });
                this.rightClickedNodeId = null;
            }
        });
    }

    navigateNodeImage(nodeId, direction) {
        const node = workflowEngine.nodes.get(nodeId);
        if (!node || !node.images || node.images.length <= 1) return;

        let currentIndex = this.nodeImageIndexes.get(nodeId) || 0;
        currentIndex += direction;
        
        // Wrap around
        if (currentIndex < 0) currentIndex = node.images.length - 1;
        if (currentIndex >= node.images.length) currentIndex = 0;
        
        this.nodeImageIndexes.set(nodeId, currentIndex);
        
        // Force redraw
        this.network.redraw();
    }

    showCircleMenu(nodeId, event) {
        console.log('showCircleMenu called for node:', nodeId, 'event:', event);
        
        // Ensure circle menu exists
        if (!this.circleMenu || !document.body.contains(this.circleMenu)) {
            console.log('Creating circle menu...');
            this.createCircleMenu();
        }
        
        const menu = this.circleMenu;
        if (!menu) {
            console.error('Failed to create circle menu');
            return;
        }

        // Calculate position
        const x = event.clientX || event.x || 100;
        const y = event.clientY || event.y || 100;
        
        console.log('Positioning menu at:', x, y);
        
        // Position and show menu
        menu.style.position = 'fixed';
        menu.style.left = `${x - 100}px`;
        menu.style.top = `${y - 100}px`;
        menu.style.display = 'block';
        menu.style.visibility = 'visible';
        menu.style.opacity = '1';
        menu.classList.remove('hidden');
        menu.dataset.nodeId = nodeId;
        
        console.log('Circle menu should now be visible');

        // Remove old handlers
        this.cleanupCircleMenuHandlers();

        // Setup click handlers for menu items
        const items = menu.querySelectorAll('.circle-menu-item');
        items.forEach(item => {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleCircleMenuAction(item.dataset.action, nodeId);
                this.hideCircleMenu();
            };
            item.addEventListener('click', handler);
            this.circleMenuHandlers.set(item, handler);
        });

        // Setup click handler for center (close menu)
        const center = menu.querySelector('.circle-menu-center');
        if (center) {
            const centerHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideCircleMenu();
            };
            center.addEventListener('click', centerHandler);
            this.circleMenuHandlers.set(center, centerHandler);
        }

        // Hide menu when clicking outside - with delay to prevent immediate closing
        const documentHandler = (e) => {
            // Don't hide if clicking on menu itself
            if (!menu.contains(e.target)) {
                this.hideCircleMenu();
            }
        };
        
        // Store the handler for cleanup
        this.circleMenuHandlers.set(document, documentHandler);
        
        // Add the document click handler after a delay
        setTimeout(() => {
            document.addEventListener('click', documentHandler, true);
        }, 100);
    }

    hideCircleMenu() {
        if (this.circleMenu) {
            this.circleMenu.classList.add('hidden');
            this.cleanupCircleMenuHandlers();
            
            // Re-enable node dragging
            if (this.network) {
                this.network.setOptions({
                    interaction: {
                        dragNodes: true
                    }
                });
            }
            
            // Clear right-clicked node
            this.rightClickedNodeId = null;
        }
    }

    cleanupCircleMenuHandlers() {
        // Remove all stored event handlers
        this.circleMenuHandlers.forEach((handler, element) => {
            if (element === document) {
                document.removeEventListener('click', handler, true);
            } else {
                element.removeEventListener('click', handler);
            }
        });
        this.circleMenuHandlers.clear();
    }

    handleCircleMenuAction(action, nodeId) {
        console.log(`Circle menu action: ${action} for node ${nodeId}`);
        
        switch(action) {
            case 'upload':
                this.uploadImageToNode(nodeId);
                break;
            
            case 'transform':
                this.showTransformDialog(nodeId);
                break;
            
            case 'duplicate':
                this.duplicateNode(nodeId);
                break;
            
            case 'connect':
                workflowEngine.setMode('connect');
                this.handleConnection(nodeId);
                break;
            
            case 'delete':
                if (confirm('Delete this node?')) {
                    workflowEngine.deleteNode(nodeId);
                }
                break;
        }
    }

    showTransformDialog(nodeId) {
        // Clean up any existing dialog
        const existingDialog = document.getElementById('transformDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create transform dialog
        const dialog = document.createElement('div');
        dialog.id = 'transformDialog';
        dialog.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 border border-white/10">
                <h3 class="text-xl font-semibold mb-4 text-white">Transform Settings</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Number of output branches
                        </label>
                        <input type="number" id="branchCount" min="1" max="5" value="3" 
                               class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    </div>
                    <div class="flex space-x-3">
                        <button id="cancelTransform" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                            Cancel
                        </button>
                        <button id="confirmTransform" class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                            Create Branches
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        document.getElementById('cancelTransform').onclick = () => {
            document.body.removeChild(dialog);
        };

        document.getElementById('confirmTransform').onclick = () => {
            const count = parseInt(document.getElementById('branchCount').value) || 3;
            this.createTransformBranches(nodeId, count);
            document.body.removeChild(dialog);
        };
    }

    createTransformBranches(sourceNodeId, branchCount) {
        const sourceNode = workflowEngine.nodes.get(sourceNodeId);
        if (!sourceNode) return;

        const sourcePos = sourceNode.position;
        const angleStep = Math.PI / (branchCount + 1);
        const distance = 250; // Increased distance for better spacing

        for (let i = 0; i < branchCount; i++) {
            // Calculate position for new node
            const angle = -Math.PI/2 + angleStep * (i + 1);
            const x = sourcePos.x + Math.cos(angle) * distance;
            const y = sourcePos.y + Math.sin(angle) * distance;

            // Create new empty node
            const newNode = workflowEngine.createNode({
                position: { x, y }
            });

            // Create edge with empty prompt
            const edge = workflowEngine.createEdge(sourceNodeId, newNode.id, {
                prompt: '',
                style: 'transform'
            });

            // Show prompt menu for first edge only
            if (edge && i === 0) {
                setTimeout(() => this.showEdgePromptMenu(edge.id), 300);
            }
        }
    }

    showEdgePromptMenu(edgeId) {
        const edge = workflowEngine.edges.get(edgeId);
        if (!edge) return;

        // Clean up any existing dialog
        const existingDialog = document.getElementById('edgePromptDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Check if edge already has a prompt
        const hasPrompt = edge.prompt && edge.prompt.trim() !== '';
        const currentPrompt = edge.prompt || '';

        // Create prompt menu dialog
        const dialog = document.createElement('div');
        dialog.id = 'edgePromptDialog';
        dialog.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold text-white">Edge Prompt Configuration</h3>
                    ${hasPrompt ? '<span class="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">✓ Configured</span>' : ''}
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-3">
                        <button id="manualPrompt" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white transition-colors">
                            <i class="fas fa-keyboard text-2xl mb-2"></i>
                            <div>Manual Input</div>
                        </button>
                        <button id="templatePrompt" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white transition-colors">
                            <i class="fas fa-list text-2xl mb-2"></i>
                            <div>Template</div>
                        </button>
                        <button id="llmPrompt" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white transition-colors">
                            <i class="fas fa-robot text-2xl mb-2"></i>
                            <div>AI Generate</div>
                        </button>
                    </div>
                    
                    <div id="promptContent" class="${hasPrompt ? '' : 'hidden'}">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Transformation Prompt</label>
                        <textarea id="promptText" rows="4" placeholder="Enter transformation prompt..."
                                  class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400">${currentPrompt}</textarea>
                    </div>
                    
                    <div id="templateContent" class="hidden">
                        <select id="templateSelect" class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                            <option value="">Select a template...</option>
                            <option value="artistic">Artistic Enhancement</option>
                            <option value="photorealistic">Photorealistic</option>
                            <option value="anime">Anime Style</option>
                            <option value="cyberpunk">Cyberpunk</option>
                            <option value="watercolor">Watercolor</option>
                            <option value="sketch">Sketch</option>
                        </select>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button id="cancelPrompt" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                            Cancel
                        </button>
                        <button id="savePrompt" class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                            Save Prompt
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        // Auto show prompt content if edge already has a prompt
        const promptTextArea = document.getElementById('promptText');
        if (hasPrompt) {
            document.getElementById('promptContent').classList.remove('hidden');
        }

        // Setup handlers
        document.getElementById('manualPrompt').onclick = () => {
            document.getElementById('promptContent').classList.remove('hidden');
            document.getElementById('templateContent').classList.add('hidden');
        };

        document.getElementById('templatePrompt').onclick = () => {
            document.getElementById('promptContent').classList.add('hidden');
            document.getElementById('templateContent').classList.remove('hidden');
        };

        document.getElementById('llmPrompt').onclick = () => {
            // Generate with LLM
            const sourceNode = workflowEngine.nodes.get(edge.source);
            if (sourceNode && sourceNode.images && sourceNode.images.length > 0) {
                document.getElementById('promptContent').classList.remove('hidden');
                document.getElementById('templateContent').classList.add('hidden');
                promptTextArea.value = 'AI-generated prompt: Transform image with creative enhancement, maintaining original composition while adding artistic flair...';
            } else {
                alert('Source node must have images for AI generation');
            }
        };

        document.getElementById('templateSelect').onchange = (e) => {
            const templates = {
                artistic: 'Transform into vibrant artistic masterpiece with bold colors and creative interpretation',
                photorealistic: 'Enhance to ultra-realistic photography with perfect lighting and details',
                anime: 'Convert to anime/manga art style with characteristic features',
                cyberpunk: 'Transform into futuristic cyberpunk aesthetic with neon lights',
                watercolor: 'Create soft watercolor painting effect with flowing colors',
                sketch: 'Convert to detailed pencil sketch with shading'
            };
            
            if (templates[e.target.value]) {
                document.getElementById('promptContent').classList.remove('hidden');
                promptTextArea.value = templates[e.target.value];
            }
        };

        document.getElementById('cancelPrompt').onclick = () => {
            document.body.removeChild(dialog);
        };

        document.getElementById('savePrompt').onclick = () => {
            const promptText = promptTextArea.value.trim();
            if (promptText) {
                workflowEngine.updateEdge(edgeId, { prompt: promptText });
                console.log(`Updated edge ${edgeId} with prompt: ${promptText}`);
            }
            document.body.removeChild(dialog);
        };
    }

    duplicateNode(nodeId) {
        const sourceNode = workflowEngine.nodes.get(nodeId);
        if (!sourceNode) return;
        
        const newNode = workflowEngine.createNode({
            position: {
                x: sourceNode.position.x + 100,
                y: sourceNode.position.y + 100
            },
            images: [...(sourceNode.images || [])],
            metadata: { ...sourceNode.metadata, duplicatedFrom: nodeId }
        });
        
        console.log('Duplicated node:', newNode.id);
    }

    bindEngineEvents() {
        // Node events
        workflowEngine.on('nodeCreated', (node) => {
            this.addNode(node);
        });

        workflowEngine.on('nodeUpdated', (node) => {
            this.updateNode(node);
        });

        workflowEngine.on('nodeDeleted', (nodeId) => {
            this.removeNode(nodeId);
            this.nodeImageIndexes.delete(nodeId);
        });

        workflowEngine.on('imageAdded', (data) => {
            const node = workflowEngine.nodes.get(data.nodeId);
            if (node) {
                this.updateNode(node);
            }
        });

        // Edge events
        workflowEngine.on('edgeCreated', (edge) => {
            this.addEdge(edge);
        });

        workflowEngine.on('edgeUpdated', (edge) => {
            this.updateEdge(edge);
        });

        workflowEngine.on('edgeDeleted', (edgeId) => {
            this.removeEdge(edgeId);
        });

        // Other events
        workflowEngine.on('selectionCleared', () => {
            this.network.unselectAll();
        });

        workflowEngine.on('modeChanged', (mode) => {
            this.updateCursor(mode);
        });

        workflowEngine.on('workflowCleared', () => {
            this.clearCanvas();
        });

        workflowEngine.on('workflowLoaded', () => {
            this.loadWorkflow();
        });
    }

    setupInteractions() {
        // Prevent default context menu
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Drag and drop
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            this.container.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
        });

        this.container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.container.style.backgroundColor = '';
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.container.style.backgroundColor = '';
            
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                const rect = this.container.getBoundingClientRect();
                const position = { 
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                this.handleImageDrop(files, position);
            }
        });
    }

    // Node operations
    addNode(node) {
        this.nodes.add({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            label: ''  // Label is drawn by custom renderer
        });
    }

    updateNode(node) {
        this.nodes.update({
            id: node.id,
            x: node.position.x,
            y: node.position.y
        });
        this.network.redraw();
    }

    removeNode(nodeId) {
        this.nodes.remove(nodeId);
    }

    // Edge operations
    addEdge(edge) {
        const hasPrompt = edge.prompt && edge.prompt.trim() !== '';
        const label = hasPrompt ? 
            (edge.prompt.length > 30 ? edge.prompt.substring(0, 30) + '...' : edge.prompt) : 
            '➕ Add prompt';
        
        // Color based on prompt status
        const color = hasPrompt ? {
            color: '#8B5CF6',
            highlight: '#A78BFA',
            hover: '#A78BFA'
        } : {
            color: '#4B5563',
            highlight: '#6B7280',
            hover: '#6B7280'
        };
            
        this.edges.add({
            id: edge.id,
            from: edge.source,
            to: edge.target,
            label: label,
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 1.2
                }
            },
            color: color,
            width: hasPrompt ? 3 : 2,
            smooth: {
                enabled: true,
                type: 'curvedCW',
                roundness: 0.2
            },
            font: {
                size: 12,
                color: hasPrompt ? '#DDD6FE' : '#9CA3AF',
                strokeWidth: 3,
                strokeColor: '#111827'
            }
        });
    }

    updateEdge(edge) {
        const hasPrompt = edge.prompt && edge.prompt.trim() !== '';
        const label = hasPrompt ? 
            (edge.prompt.length > 30 ? edge.prompt.substring(0, 30) + '...' : edge.prompt) : 
            '➕ Add prompt';
        
        // Update color based on prompt status
        const color = hasPrompt ? {
            color: '#8B5CF6',
            highlight: '#A78BFA',
            hover: '#A78BFA'
        } : {
            color: '#4B5563',
            highlight: '#6B7280',
            hover: '#6B7280'
        };
            
        this.edges.update({
            id: edge.id,
            label: label,
            color: color,
            width: hasPrompt ? 3 : 2,
            font: {
                size: 12,
                color: hasPrompt ? '#DDD6FE' : '#9CA3AF',
                strokeWidth: 3,
                strokeColor: '#111827'
            }
        });
    }

    removeEdge(edgeId) {
        this.edges.remove(edgeId);
    }

    // Other methods
    handleNodeClick(nodeId, event) {
        const multiSelect = event.ctrlKey || event.metaKey;
        workflowEngine.selectNode(nodeId, multiSelect);
        
        if (workflowEngine.mode === 'connect') {
            this.handleConnection(nodeId);
        }
    }

    handleEdgeClick(edgeId, event) {
        const multiSelect = event.ctrlKey || event.metaKey;
        workflowEngine.selectEdge(edgeId, multiSelect);
    }

    handleConnection(nodeId) {
        if (!this.connectingFrom) {
            this.connectingFrom = nodeId;
            console.log('Starting connection from:', nodeId);
        } else if (this.connectingFrom !== nodeId) {
            const edge = workflowEngine.createEdge(this.connectingFrom, nodeId);
            if (edge) {
                this.showEdgePromptMenu(edge.id);
            }
            this.connectingFrom = null;
            workflowEngine.setMode('select'); // Return to select mode
        }
    }

    handleImageDrop(files, position) {
        const node = workflowEngine.createNode({ position });
        
        if (node) {
            files.forEach(file => {
                this.uploadImageToNode(node.id, file);
            });
        }
    }

    uploadImageToNode(nodeId, file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
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
            
            workflowEngine.addImageToNode(nodeId, imageData);
        };
        
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
        };
        
        reader.readAsDataURL(file);
    }

    showNodeDetails(nodeId) {
        const panel = document.getElementById('nodeDetailPanel');
        if (panel) {
            panel.classList.remove('translate-x-full');
            this.renderNodeDetails(nodeId);
        }
    }

    renderNodeDetails(nodeId) {
        const node = workflowEngine.nodes.get(nodeId);
        if (!node) return;

        const content = document.getElementById('nodeDetailContent');
        if (!content) return;

        let imagesHtml = '';
        if (node.images && node.images.length > 0) {
            imagesHtml = node.images.map((img, index) => `
                <div class="detail-image" title="${img.metadata?.name || 'Image ' + (index + 1)}">
                    <img src="${img.thumbnail || img.url}" alt="Image ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            `).join('');
        } else {
            imagesHtml = '<p class="text-gray-500 col-span-3">No images in this node</p>';
        }

        content.innerHTML = `
            <div class="detail-section">
                <div class="detail-label">Node ID</div>
                <div class="detail-value font-mono text-sm">${node.id}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="px-2 py-1 rounded text-xs ${
                        node.status === 'processing' ? 'bg-yellow-600' : 
                        node.status === 'error' ? 'bg-red-600' : 'bg-green-600'
                    }">
                        ${node.status.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Images (${node.images ? node.images.length : 0})</div>
                <div class="detail-image-grid">
                    ${imagesHtml}
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Created</div>
                <div class="detail-value">${new Date(node.created).toLocaleString('ja-JP')}</div>
            </div>
        `;
    }

    uploadImageToNode(nodeId) {
        console.log('Uploading image to node:', nodeId);
        
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            
            for (const file of files) {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const imageData = {
                        url: event.target.result,
                        thumbnail: event.target.result,
                        metadata: {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            uploadedAt: new Date().toISOString()
                        }
                    };
                    
                    // Add image to node
                    const result = workflowEngine.addImageToNode(nodeId, imageData);
                    console.log('Image added:', result);
                    
                    // Force redraw to show new image
                    this.network.redraw();
                };
                
                reader.onerror = (error) => {
                    console.error('Failed to read file:', error);
                };
                
                reader.readAsDataURL(file);
            }
        });
        
        // Trigger file selection
        input.click();
    }

    updateCursor(mode) {
        this.container.style.cursor = mode === 'connect' ? 'crosshair' : 'default';
    }

    fitView() {
        if (this.network) {
            this.network.fit({
                animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuad'
                }
            });
        }
    }

    zoomIn() {
        if (this.network) {
            const scale = this.network.getScale();
            this.network.moveTo({ scale: scale * 1.2 });
        }
    }

    zoomOut() {
        if (this.network) {
            const scale = this.network.getScale();
            this.network.moveTo({ scale: scale / 1.2 });
        }
    }

    clearCanvas() {
        this.nodes.clear();
        this.edges.clear();
        this.nodeImageIndexes.clear();
        this.hideCircleMenu();
    }

    loadWorkflow() {
        this.clearCanvas();
        
        for (const node of workflowEngine.nodes.values()) {
            this.addNode(node);
        }
        
        for (const edge of workflowEngine.edges.values()) {
            this.addEdge(edge);
        }
        
        this.fitView();
    }

    // Cleanup method to be called when destroying the controller
    destroy() {
        // Clean up event handlers
        this.cleanupCircleMenuHandlers();
        
        // Remove circle menu
        if (this.circleMenu) {
            this.circleMenu.remove();
            this.circleMenu = null;
        }
        
        // Remove all container event listeners
        if (this.container) {
            // Create new container element to remove all event listeners
            const newContainer = this.container.cloneNode(false);
            this.container.parentNode.replaceChild(newContainer, this.container);
        }
        
        // Destroy network instance
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }
        
        // Clear all data structures
        this.nodes = null;
        this.edges = null;
        this.nodeImageIndexes.clear();
        this.nodeImageIndexes = null;
        
        // Clear any remaining timeouts
        if (this.hideMenuTimeout) {
            clearTimeout(this.hideMenuTimeout);
            this.hideMenuTimeout = null;
        }
        
        // Clear references
        this.container = null;
        this.rightClickedNodeId = null;
        this.circleMenuHandlers = null;
    }
}

// Create global instance - will be initialized after DOM load
let canvasController = null;