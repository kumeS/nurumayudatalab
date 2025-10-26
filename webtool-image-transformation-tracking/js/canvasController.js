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
        this.imageCache = new Map(); // Cache for loaded images
        this.miniMapCanvas = null; // Mini map canvas element
        this.miniMapCtx = null; // Mini map 2D context

        // Redraw scheduler to prevent infinite rendering loops
        this._redrawScheduled = false;
        this.requestRedraw = () => {
            if (this._redrawScheduled) return; // Already scheduled
            this._redrawScheduled = true;
            requestAnimationFrame(() => {
                this._redrawScheduled = false;
                if (this.network) {
                    this.network.redraw();
                }
            });
        };
    }

    initialize() {
        this.container = document.getElementById('workflowCanvas');
        if (this.container) {
            this.setupNetwork();
            this.bindEngineEvents();
            this.setupInteractions();
            this.createCircleMenu();
            this.setupGlobalEventListeners();
            this.initializeMiniMap();
            console.log('Canvas Controller initialized');
        }
    }
    
    setupGlobalEventListeners() {
        // Wait for canvas to be created by vis.js
        setTimeout(() => {
            const canvas = this.container.querySelector('canvas');
            if (canvas) {
                // Handle contextmenu event (works for Mac Control+Click and right-click)
                canvas.addEventListener('contextmenu', (e) => {
                    console.log('Context menu event detected at:', e.clientX, e.clientY);
                    e.preventDefault();
                    e.stopPropagation();

                    // Get the node at this position
                    const domPosition = {
                        x: e.clientX,
                        y: e.clientY
                    };
                    const nodeId = this.network.getNodeAt(domPosition);

                    console.log('Found node:', nodeId, 'at position:', domPosition);

                    if (nodeId) {
                        this.handleNodeRightClick(nodeId, e);
                    }

                    return false;
                });

                // Also handle mousedown for Windows/Linux right-click
                canvas.addEventListener('mousedown', (e) => {
                    // Right click (button 2)
                    if (e.button === 2) {
                        console.log('Right click (mousedown) detected at:', e.clientX, e.clientY);
                        // Don't handle here - let contextmenu event handle it
                        // This prevents double-triggering
                    }
                });

                console.log('Canvas right-click listeners successfully added');
            } else {
                console.error('Canvas element not found after delay');
            }
        }, 500);
    }
    
    handleNodeRightClick(nodeId, event) {
        console.log('====== RIGHT CLICK HANDLER ======');
        console.log('Node ID:', nodeId);
        console.log('Event:', event);
        console.log('Event position:', event.clientX, event.clientY);
        console.log('=================================');

        try {
            // Hide any existing menu
            this.hideCircleMenu();

            // Store the clicked node
            this.rightClickedNodeId = nodeId;

            // Disable dragging temporarily
            if (this.network) {
                this.network.setOptions({
                    interaction: { dragNodes: false }
                });
            }

            // Show the menu
            this.showCircleMenu(nodeId, event);

            // Re-enable dragging after a delay
            setTimeout(() => {
                if (this.network) {
                    this.network.setOptions({
                        interaction: { dragNodes: true }
                    });
                }
            }, 500);
        } catch (error) {
            console.error('Error in handleNodeRightClick:', error);
        }
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

        // Determine node type and state
        const nodeType = node.nodeType || 'input'; // Default to input if not specified
        const hasImages = node.images && node.images.length > 0;
        const isActive = hasImages;
        const canGenerate = nodeType === 'generated' && workflowEngine.canGenerateImages(id);
        
        console.log(`Rendering node ${id.substr(-6)}: type=${nodeType}, active=${isActive}, canGenerate=${canGenerate}`);
        
        // Background - different colors based on node type
        this.roundRect(ctx, x - width/2, y - height/2, width, height, radius);
        if (isActive) {
            const gradient = ctx.createLinearGradient(x - width/2, y - height/2, x + width/2, y + height/2);
            if (nodeType === 'input') {
                // Input nodes - blue gradient
                gradient.addColorStop(0, selected ? '#1D4ED8' : '#1E3A8A');
                gradient.addColorStop(1, selected ? '#2563EB' : '#1E40AF');
            } else {
                // Generated nodes - purple gradient
                gradient.addColorStop(0, selected ? '#6D28D9' : '#4C1D95');
                gradient.addColorStop(1, selected ? '#7C3AED' : '#5B21B6');
            }
            ctx.fillStyle = gradient;
        } else {
            // Inactive node - dark gray
            ctx.fillStyle = selected ? '#374151' : hover ? '#1F2937' : '#111827';
        }
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Border - color based on node type
        if (isActive) {
            if (nodeType === 'input') {
                ctx.strokeStyle = selected ? '#60A5FA' : hover ? '#3B82F6' : '#2563EB';
            } else {
                ctx.strokeStyle = selected ? '#EC4899' : hover ? '#A78BFA' : '#8B5CF6';
            }
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

        // Title with icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shortId = id.substr(-6);
        const icon = nodeType === 'input' ? '📤' : '✨';
        ctx.fillText(`${icon} Node ${shortId}`, x, y - height/2 + 15);

        // Image thumbnail or placeholder
        if (hasImages) {
            // Get current image index
            let currentIndex = this.nodeImageIndexes.get(id) || 0;
            if (currentIndex >= node.images.length) currentIndex = 0;

            const image = node.images[currentIndex];
            const maxSize = 140; // Maximum dimension for the image container (increased from 80)
            const imgY = y; // Center the image vertically in the node

            // Draw image placeholder
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(x - maxSize/2, imgY - maxSize/2, maxSize, maxSize);

            // Draw actual image with caching
            const imageUrl = image.thumbnail || image.url;
            if (this.imageCache.has(imageUrl)) {
                // Use cached image
                const cachedImg = this.imageCache.get(imageUrl);
                try {
                    // Calculate dimensions to preserve aspect ratio
                    const imgWidth = cachedImg.naturalWidth || cachedImg.width;
                    const imgHeight = cachedImg.naturalHeight || cachedImg.height;

                    let drawWidth, drawHeight;

                    if (imgWidth > imgHeight) {
                        // Landscape or square - fit to width
                        drawWidth = maxSize;
                        drawHeight = (imgHeight / imgWidth) * maxSize;
                    } else {
                        // Portrait - fit to height
                        drawHeight = maxSize;
                        drawWidth = (imgWidth / imgHeight) * maxSize;
                    }

                    // Center the image in the container
                    const drawX = x - drawWidth / 2;
                    const drawY = imgY - drawHeight / 2;

                    ctx.drawImage(cachedImg, drawX, drawY, drawWidth, drawHeight);
                } catch (error) {
                    console.error('Error drawing cached image:', error);
                }
            } else {
                // Load and cache image
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(imageUrl, img);
                    this.requestRedraw(); // Schedule redraw to show loaded image (prevents infinite loop)
                };
                img.onerror = (error) => {
                    console.error('Error loading image:', error);
                };
                img.src = imageUrl;
            }

            // Image counter
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x - maxSize/2, imgY + maxSize/2 - 20, maxSize, 20);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '11px Inter';
            ctx.fillText(`${currentIndex + 1} / ${node.images.length}`, x, imgY + maxSize/2 - 10);

            // Navigation arrows if multiple images
            if (node.images.length > 1) {
                // Left arrow
                ctx.fillStyle = hover ? '#EC4899' : '#9333EA';
                ctx.beginPath();
                ctx.moveTo(x - maxSize/2 - 15, imgY);
                ctx.lineTo(x - maxSize/2 - 5, imgY - 8);
                ctx.lineTo(x - maxSize/2 - 5, imgY + 8);
                ctx.closePath();
                ctx.fill();

                // Right arrow
                ctx.beginPath();
                ctx.moveTo(x + maxSize/2 + 15, imgY);
                ctx.lineTo(x + maxSize/2 + 5, imgY - 8);
                ctx.lineTo(x + maxSize/2 + 5, imgY + 8);
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
        
        // Generate button for generated nodes with incoming edges
        if (canGenerate && node.status !== 'processing') {
            const btnWidth = 100;
            const btnHeight = 24;
            const btnX = x - btnWidth/2;
            const btnY = y + height/2 - btnHeight - 8;
            
            // Button background
            ctx.fillStyle = hover ? '#16A34A' : '#15803D';
            ctx.beginPath();
            ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
            ctx.fill();
            
            // Button border
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Button text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✨ Generate', x, btnY + btnHeight/2);
            
            // Store button bounds for click detection
            if (!this.generateButtonBounds) {
                this.generateButtonBounds = new Map();
            }
            this.generateButtonBounds.set(id, {
                x: btnX,
                y: btnY,
                width: btnWidth,
                height: btnHeight
            });
        }

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
        // Return early if menu already exists
        if (this.circleMenu && document.body.contains(this.circleMenu)) {
            console.log('Circle menu already exists, reusing it');
            return;
        }

        // Create circle menu container
        const menu = document.createElement('div');
        menu.id = 'circleMenu';
        menu.className = 'fixed hidden';
        menu.style.zIndex = '10000'; // Ensure high z-index
        menu.innerHTML = `
            <div class="circle-menu-container">
                <div class="circle-menu-item" data-action="upload" style="--angle: 0deg;">
                    <i class="fas fa-upload"></i>
                    <span>Upload</span>
                </div>
                <div class="circle-menu-item" data-action="uploadUrl" style="--angle: 51deg;">
                    <i class="fas fa-link"></i>
                    <span>URL</span>
                </div>
                <div class="circle-menu-item" data-action="transform" style="--angle: 102deg;">
                    <i class="fas fa-magic"></i>
                    <span>Transform</span>
                </div>
                <div class="circle-menu-item" data-action="duplicate" style="--angle: 153deg;">
                    <i class="fas fa-copy"></i>
                    <span>Duplicate</span>
                </div>
                <div class="circle-menu-item" data-action="setPosition" style="--angle: 204deg;">
                    <i class="fas fa-crosshairs"></i>
                    <span>Position</span>
                </div>
                <div class="circle-menu-item" data-action="connect" style="--angle: 255deg;">
                    <i class="fas fa-project-diagram"></i>
                    <span>Connect</span>
                </div>
                <div class="circle-menu-item" data-action="delete" style="--angle: 306deg;">
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
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 50%;
                }
                .circle-menu-item {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 50px;
                    height: 50px;
                    background: rgba(31, 41, 55, 0.9);
                    border: 2px solid rgba(147, 51, 234, 0.8);
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
                    backdrop-filter: blur(8px);
                }
                .circle-menu-item:hover {
                    background: rgba(147, 51, 234, 0.95);
                    border-color: rgba(236, 72, 153, 0.9);
                    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(70px) rotate(calc(-1 * var(--angle))) scale(1.2);
                    box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
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
                const pos = this.network.getPositions([nodeId])[nodeId];
                const pointer = params.pointer.canvas;
                
                // Check if Generate button was clicked
                if (this.generateButtonBounds && this.generateButtonBounds.has(nodeId)) {
                    const bounds = this.generateButtonBounds.get(nodeId);
                    if (pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width &&
                        pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height) {
                        console.log('Generate button clicked for node:', nodeId);
                        this.handleGenerateClick(nodeId);
                        return;
                    }
                }
                
                if (node && node.images && node.images.length > 1) {
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
                // Empty canvas clicked - close all panels
                console.log('Empty canvas clicked - closing all panels');
                workflowEngine.clearSelection();
                this.hideCircleMenu();
                
                // Close node detail panel
                const nodePanel = document.getElementById('nodeDetailPanel');
                if (nodePanel) {
                    nodePanel.classList.add('translate-x-full');
                }
                
                // Close edge detail panel
                const edgePanel = document.getElementById('edgeDetailPanel');
                if (edgePanel) {
                    edgePanel.classList.add('translate-x-full');
                }
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
        // This is the primary right-click handler
        this.network.on('oncontext', (params) => {
            console.log('Vis.js oncontext event:', params);

            // Always prevent default context menu
            if (params.event) {
                params.event.preventDefault();
                params.event.stopPropagation();
            }

            // Check if right-click is on a node
            if (params.nodes && params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const event = params.event || { clientX: 100, clientY: 100 };
                console.log('Right-clicked on node:', nodeId);
                this.handleNodeRightClick(nodeId, event);
            } else {
                console.log('Right-clicked on empty space');
            }

            return false;
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
                this.updateMiniMap();
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

        // View change events - update mini map when view changes
        this.network.on('zoom', () => {
            this.updateMiniMap();
        });

        this.network.on('dragEnd', () => {
            this.updateMiniMap();
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
        console.log('====== SHOW CIRCLE MENU ======');
        console.log('Node ID:', nodeId);
        console.log('Event:', event);

        try {
            // Hide any existing menu first and clean up handlers
            this.hideCircleMenu();

            // Ensure circle menu exists
            if (!this.circleMenu || !document.body.contains(this.circleMenu)) {
                console.log('Circle menu not found, creating...');
                this.createCircleMenu();
            }

            const menu = this.circleMenu;
            if (!menu) {
                console.error('CRITICAL: Failed to create circle menu!');
                return;
            }

            console.log('Circle menu element:', menu);
            console.log('Menu in document body:', document.body.contains(menu));

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
            menu.style.zIndex = '10000';
            menu.classList.remove('hidden');
            menu.dataset.nodeId = nodeId;

            console.log('Menu styles applied:');
            console.log('  display:', menu.style.display);
            console.log('  visibility:', menu.style.visibility);
            console.log('  opacity:', menu.style.opacity);
            console.log('  position:', menu.style.position);
            console.log('  left:', menu.style.left);
            console.log('  top:', menu.style.top);
            console.log('  zIndex:', menu.style.zIndex);
            console.log('============================');

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

            // Hide menu when clicking outside - with delay to prevent immediate closing
            const documentHandler = (e) => {
                // Don't hide if clicking on menu itself or the canvas during right-click
                if (!menu.contains(e.target) && e.button !== 2) {
                    this.hideCircleMenu();
                }
            };

            // Store the handler for cleanup
            this.circleMenuHandlers.set(document, documentHandler);

            // Add the document click handler after a delay to prevent immediate closing
            setTimeout(() => {
                document.addEventListener('click', documentHandler, true);
            }, 200);

        } catch (error) {
            console.error('Error in showCircleMenu:', error);
        }
    }

    hideCircleMenu() {
        // Clean up handlers first to prevent any race conditions
        this.cleanupCircleMenuHandlers();
        
        if (this.circleMenu) {
            this.circleMenu.classList.add('hidden');
            this.circleMenu.style.display = 'none';
            
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
                // Check if node can accept uploads
                const node = workflowEngine.nodes.get(nodeId);
                if (node && node.nodeType === 'generated') {
                    console.warn('Upload blocked for generated node');
                    alert('生成ノードには手動で画像をアップロードできません。\n入力ノードを使用してください。');
                    return;
                }
                this.promptUploadImageToNode(nodeId);
                break;

            case 'uploadUrl':
                // Check if node can accept uploads
                const nodeForUrl = workflowEngine.nodes.get(nodeId);
                if (nodeForUrl && nodeForUrl.nodeType === 'generated') {
                    console.warn('Upload blocked for generated node');
                    alert('生成ノードには手動で画像をアップロードできません。\n入力ノードを使用してください。');
                    return;
                }
                this.showImageUrlDialog(nodeId);
                break;

            case 'transform':
                this.showTransformDialog(nodeId);
                break;

            case 'duplicate':
                this.duplicateNode(nodeId);
                break;

            case 'setPosition':
                this.showPositionDialog(nodeId);
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
                        <input type="number" id="branchCount" min="1" max="5" value="1" 
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

    showPositionDialog(nodeId) {
        const node = workflowEngine.nodes.get(nodeId);
        if (!node) return;

        // Clean up any existing dialog
        const existingDialog = document.getElementById('positionDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create position dialog
        const dialog = document.createElement('div');
        dialog.id = 'positionDialog';
        dialog.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 border border-white/10">
                <h3 class="text-xl font-semibold mb-4 text-white">ノード位置を設定</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            X 座標
                        </label>
                        <input type="number" id="nodePositionX" value="${Math.round(node.position.x)}" step="10"
                               class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Y 座標
                        </label>
                        <input type="number" id="nodePositionY" value="${Math.round(node.position.y)}" step="10"
                               class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    </div>
                    <div class="text-xs text-gray-400">
                        現在位置: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})
                    </div>
                    <div class="flex space-x-3">
                        <button id="cancelPosition" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                            キャンセル
                        </button>
                        <button id="confirmPosition" class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                            設定
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        // Setup handlers
        document.getElementById('cancelPosition').onclick = () => {
            document.body.removeChild(dialog);
        };

        document.getElementById('confirmPosition').onclick = () => {
            const x = parseFloat(document.getElementById('nodePositionX').value);
            const y = parseFloat(document.getElementById('nodePositionY').value);

            if (!isNaN(x) && !isNaN(y)) {
                // Update node position
                workflowEngine.updateNode(nodeId, {
                    position: { x, y }
                });

                console.log(`Updated node ${nodeId} position to (${x}, ${y})`);
            }

            document.body.removeChild(dialog);
        };

        // Enter key to confirm
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmPosition').click();
            }
        };
        document.getElementById('nodePositionX').addEventListener('keypress', handleEnter);
        document.getElementById('nodePositionY').addEventListener('keypress', handleEnter);
    }

    showImageUrlDialog(nodeId) {
        // Clean up any existing dialog
        const existingDialog = document.getElementById('imageUrlDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create URL input dialog
        const dialog = document.createElement('div');
        dialog.id = 'imageUrlDialog';
        dialog.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 border border-white/10 max-w-md w-full">
                <h3 class="text-xl font-semibold mb-4 text-white">画像URLを入力</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            画像URL
                        </label>
                        <input type="url" id="imageUrlInput" placeholder="https://example.com/image.jpg"
                               class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400">
                    </div>
                    <div class="text-xs text-gray-400">
                        <i class="fas fa-info-circle mr-1"></i>
                        画像はIndexedDBに保存されます
                    </div>
                    <div id="urlLoadingIndicator" class="hidden">
                        <div class="flex items-center space-x-2 text-purple-400">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>画像を読み込み中...</span>
                        </div>
                    </div>
                    <div class="flex space-x-3">
                        <button id="cancelImageUrl" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                            キャンセル
                        </button>
                        <button id="confirmImageUrl" class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                            追加
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        // Setup handlers
        document.getElementById('cancelImageUrl').onclick = () => {
            document.body.removeChild(dialog);
        };

        document.getElementById('confirmImageUrl').onclick = async () => {
            const urlInput = document.getElementById('imageUrlInput');
            const url = urlInput.value.trim();

            if (!url) {
                alert('URLを入力してください。');
                return;
            }

            // Validate URL
            try {
                new URL(url);
            } catch (error) {
                alert('有効なURLを入力してください。');
                return;
            }

            // Show loading indicator
            const loadingIndicator = document.getElementById('urlLoadingIndicator');
            const confirmBtn = document.getElementById('confirmImageUrl');
            loadingIndicator.classList.remove('hidden');
            confirmBtn.disabled = true;
            confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');

            try {
                // Fetch image from URL
                console.log('Fetching image from URL:', url);
                const blob = await imageStorage.fetchImageAsBlob(url);
                console.log('Image fetched successfully, size:', blob.size, 'type:', blob.type);

                // Save to IndexedDB
                const savedImage = await imageStorage.saveImage(nodeId, blob, {
                    name: url.split('/').pop() || 'image',
                    originalUrl: url,
                    uploadedAt: new Date().toISOString()
                });

                console.log('Image saved to IndexedDB:', savedImage.id);

                // Convert blob to data URL for display
                const dataUrl = await imageStorage.blobToDataURL(blob);

                // Add to node
                const imageData = {
                    url: dataUrl,
                    thumbnail: dataUrl,
                    dbId: savedImage.id, // Store IndexedDB ID for reference
                    metadata: {
                        name: savedImage.metadata.name,
                        size: blob.size,
                        type: blob.type,
                        originalUrl: url,
                        uploadedAt: savedImage.metadata.uploadedAt,
                        source: 'url'
                    }
                };

                workflowEngine.addImageToNode(nodeId, imageData);
                console.log('Image added to node:', nodeId);

                // Close dialog
                document.body.removeChild(dialog);

            } catch (error) {
                console.error('Failed to load image from URL:', error);
                loadingIndicator.classList.add('hidden');
                confirmBtn.disabled = false;
                confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                alert(`画像の読み込みに失敗しました: ${error.message}`);
            }
        };

        // Enter key to confirm
        document.getElementById('imageUrlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmImageUrl').click();
            }
        });

        // Focus on input
        setTimeout(() => {
            document.getElementById('imageUrlInput').focus();
        }, 100);
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
                    <h3 class="text-xl font-semibold text-white">変換プロンプト設定</h3>
                    ${hasPrompt ? '<span class="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">✓ 設定済み</span>' : ''}
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <button id="manualPrompt" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white transition-colors">
                            <i class="fas fa-keyboard text-2xl mb-2"></i>
                            <div>手動入力</div>
                        </button>
                        <button id="llmPrompt" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white transition-colors">
                            <i class="fas fa-robot text-2xl mb-2"></i>
                            <div>AI生成</div>
                        </button>
                    </div>

                    <div id="promptContent" class="${hasPrompt ? '' : 'hidden'}">
                        <label class="block text-sm font-medium text-gray-300 mb-2">変換プロンプト</label>
                        <textarea id="promptText" rows="6" placeholder="変換プロンプトを入力してください..."
                                  class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400">${currentPrompt}</textarea>
                    </div>

                    <div class="flex space-x-3">
                        <button id="cancelPrompt" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                            キャンセル
                        </button>
                        <button id="savePrompt" class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                            保存
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        // Auto show prompt content if edge already has a prompt
        const promptTextArea = document.getElementById('promptText');

        // Ensure textarea is enabled and ready for input
        if (promptTextArea) {
            promptTextArea.disabled = false;
        }

        if (hasPrompt) {
            document.getElementById('promptContent').classList.remove('hidden');
        }

        // Setup handlers
        document.getElementById('manualPrompt').onclick = () => {
            document.getElementById('promptContent').classList.remove('hidden');
            if (promptTextArea) {
                promptTextArea.disabled = false;
                promptTextArea.focus();
            }
        };

        document.getElementById('llmPrompt').onclick = async () => {
            // Generate with LLM
            const sourceNode = workflowEngine.nodes.get(edge.source);
            if (!sourceNode || !sourceNode.images || sourceNode.images.length === 0) {
                alert('Source node must have images for AI generation');
                return;
            }

            try {
                document.getElementById('promptContent').classList.remove('hidden');
                promptTextArea.value = 'Generating with AI...';
                promptTextArea.disabled = true;
                
                // Get current image from source node
                const currentIndex = sourceNode.currentIndex || 0;
                const sourceImage = sourceNode.images[currentIndex];
                const imageUrl = sourceImage.url;
                
                // Call LLM service to generate prompt
                const generatedPrompt = await llmService.generatePrompt(
                    imageUrl,
                    'artistic', // Default style
                    'Creative image transformation',
                    null // Use default model
                );
                
                promptTextArea.value = generatedPrompt;
                promptTextArea.disabled = false;
            } catch (error) {
                console.error('Failed to generate prompt:', error);
                promptTextArea.value = '';
                promptTextArea.disabled = false;
                alert('プロンプトの生成に失敗しました: ' + error.message);
            }
        };

        document.getElementById('cancelPrompt').onclick = () => {
            document.body.removeChild(dialog);
        };

        document.getElementById('savePrompt').onclick = () => {
            // Re-get the textarea to ensure we have the latest reference
            const currentPromptTextArea = document.getElementById('promptText');
            const promptText = currentPromptTextArea ? currentPromptTextArea.value.trim() : '';

            console.log('Save prompt clicked, value:', promptText);

            if (promptText) {
                workflowEngine.updateEdge(edgeId, { prompt: promptText });
                console.log(`Updated edge ${edgeId} with prompt: ${promptText}`);
                // Force update the edge visualization
                const updatedEdge = workflowEngine.edges.get(edgeId);
                if (updatedEdge) {
                    this.updateEdge(updatedEdge);
                }
                document.body.removeChild(dialog);
            } else {
                alert('プロンプトを入力してください。');
            }
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

    setupImageViewerModal() {
        // Close button
        const closeBtn = document.getElementById('closeImageViewer');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('Closing image viewer');
                document.getElementById('imageViewerModal')?.classList.add('hidden');
            });
        }
        
        // Download button
        const downloadBtn = document.getElementById('downloadImageBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                console.log('Downloading image');
                const img = document.getElementById('viewerImage');
                const imgName = document.getElementById('viewerImageName')?.textContent || 'image.png';
                
                if (img && img.src) {
                    const a = document.createElement('a');
                    a.href = img.src;
                    a.download = imgName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            });
        }
    }
    
    showImageViewer(imageUrl, imageName, imageMetadata = {}) {
        console.log('Showing image viewer:', imageName);
        const modal = document.getElementById('imageViewerModal');
        const img = document.getElementById('viewerImage');
        const nameEl = document.getElementById('viewerImageName');
        
        if (modal && img) {
            img.src = imageUrl;
            if (nameEl) {
                nameEl.textContent = imageName || 'Image';
            }
            modal.classList.remove('hidden');
        }
    }

    bindEngineEvents() {
        // Setup image viewer modal
        this.setupImageViewerModal();

        // Node events
        workflowEngine.on('nodeCreated', (node) => {
            this.addNode(node);
            this.updateMiniMap();
        });

        workflowEngine.on('nodeUpdated', (node) => {
            this.updateNode(node);
            this.updateMiniMap();
        });

        workflowEngine.on('nodeDeleted', (nodeId) => {
            this.removeNode(nodeId);
            this.nodeImageIndexes.delete(nodeId);
            this.updateMiniMap();
        });

        workflowEngine.on('imageAdded', (data) => {
            const node = workflowEngine.nodes.get(data.nodeId);
            if (node) {
                this.updateNode(node);
                this.updateMiniMap();
            }
        });

        // Edge events
        workflowEngine.on('edgeCreated', (edge) => {
            this.addEdge(edge);
            this.updateMiniMap();
        });

        workflowEngine.on('edgeUpdated', (edge) => {
            this.updateEdge(edge);
            this.updateMiniMap();
        });

        workflowEngine.on('edgeDeleted', (edgeId) => {
            this.removeEdge(edgeId);
            this.updateMiniMap();
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
            this.updateMiniMap();
        });

        workflowEngine.on('workflowLoaded', () => {
            this.loadWorkflow();
            this.updateMiniMap();
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
        console.log('CanvasController.addNode() called with:', {
            id: node.id,
            position: node.position,
            nodeType: node.nodeType,
            hasImages: node.images && node.images.length > 0
        });

        const visNode = {
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            label: ''  // Label is drawn by custom renderer
        };

        console.log('Adding to vis.DataSet:', visNode);
        this.nodes.add(visNode);
        console.log('Node added. DataSet now has', this.nodes.length, 'nodes');
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
            '📝 クリックして設定';

        // Color based on prompt status - more vivid colors
        const color = hasPrompt ? {
            color: '#A78BFA',      // Brighter purple for configured
            highlight: '#C4B5FD',
            hover: '#C4B5FD'
        } : {
            color: '#6B7280',      // Gray for unconfigured
            highlight: '#9CA3AF',
            hover: '#9CA3AF'
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
                color: hasPrompt ? '#E9D5FF' : '#D1D5DB',
                strokeWidth: 3,
                strokeColor: '#111827',
                bold: hasPrompt
            }
        });
    }

    updateEdge(edge) {
        const hasPrompt = edge.prompt && edge.prompt.trim() !== '';
        const label = hasPrompt ?
            (edge.prompt.length > 30 ? edge.prompt.substring(0, 30) + '...' : edge.prompt) :
            '📝 クリックして設定';

        // Update color based on prompt status - more vivid colors
        const color = hasPrompt ? {
            color: '#A78BFA',      // Brighter purple for configured
            highlight: '#C4B5FD',
            hover: '#C4B5FD'
        } : {
            color: '#6B7280',      // Gray for unconfigured
            highlight: '#9CA3AF',
            hover: '#9CA3AF'
        };

        this.edges.update({
            id: edge.id,
            label: label,
            color: color,
            width: hasPrompt ? 3 : 2,
            font: {
                size: 12,
                color: hasPrompt ? '#E9D5FF' : '#D1D5DB',
                strokeWidth: 3,
                strokeColor: '#111827',
                bold: hasPrompt
            }
        });
    }

    removeEdge(edgeId) {
        this.edges.remove(edgeId);
    }

    // Other methods
    async handleGenerateClick(nodeId) {
        console.log('Handling generate for node:', nodeId);
        const node = workflowEngine.nodes.get(nodeId);
        if (!node) return;
        
        // Get incoming edges with prompts
        const incomingEdges = workflowEngine.getIncomingEdges(nodeId)
            .filter(edge => edge.prompt && edge.prompt.trim() !== '');
        
        if (incomingEdges.length === 0) {
            alert('No prompts found on incoming edges');
            return;
        }
        
        // Update node status
        workflowEngine.updateNode(nodeId, { status: 'processing' });
        
        try {
            // Process each incoming edge
            for (const edge of incomingEdges) {
                console.log('Processing edge:', edge.id, 'with prompt:', edge.prompt);
                
                const sourceNode = workflowEngine.nodes.get(edge.source);
                if (!sourceNode || !sourceNode.images || sourceNode.images.length === 0) {
                    console.warn('Source node has no images, skipping');
                    continue;
                }
                
                // Get source image(s)
                const sourceImages = sourceNode.images.map(img => img.url);
                const currentSourceImage = sourceImages[sourceNode.currentIndex || 0];
                
                // Call transformation service to generate image
                console.log(`Generating image with prompt: ${edge.prompt}`);
                const results = await transformationService.transformWithNanoBanana(
                    [currentSourceImage],
                    edge.prompt,
                    {
                        aspectRatio: edge.aspectRatio || 'match_input_image',
                        outputFormat: edge.outputFormat || 'png',
                        count: 1,
                        nodeId: nodeId  // Pass nodeId for IndexedDB storage
                    }
                );
                
                // Add generated images to target node
                for (const result of results) {
                    const generatedImageData = {
                        url: result.url,
                        thumbnail: result.thumbnail || result.url,
                        metadata: {
                            name: `Generated_${Date.now()}.png`,
                            generatedFrom: edge.source,
                            prompt: edge.prompt,
                            model: result.model,
                            generatedAt: result.createdAt,
                            predictionId: result.metadata?.predictionId
                        }
                    };
                    
                    workflowEngine.addImageToNode(nodeId, generatedImageData);
                    console.log('Added generated image to node:', nodeId);
                }
            }
            
            // Update status to success
            workflowEngine.updateNode(nodeId, { status: 'ready' });
            
            // Show success message
            alert(`Generated ${incomingEdges.length} image(s) successfully!`);
            
        } catch (error) {
            console.error('Generation error:', error);
            workflowEngine.updateNode(nodeId, {
                status: 'error',
                errorMessage: error.message || 'Unknown error occurred'
            });
            alert('Generation failed: ' + error.message);
        }
    }

    handleNodeClick(nodeId, event) {
        const multiSelect = event.ctrlKey || event.metaKey;
        workflowEngine.selectNode(nodeId, multiSelect);

        if (workflowEngine.mode === 'connect') {
            this.handleConnection(nodeId);
        } else {
            // Close edge detail panel if open
            const edgePanel = document.getElementById('edgeDetailPanel');
            if (edgePanel && !edgePanel.classList.contains('translate-x-full')) {
                edgePanel.classList.add('translate-x-full');
            }

            // Single click activates node detail panel (active mode)
            this.showNodeDetails(nodeId);
        }
    }

    handleEdgeClick(edgeId, event) {
        console.log('Edge clicked:', edgeId);
        const multiSelect = event.ctrlKey || event.metaKey;
        workflowEngine.selectEdge(edgeId, multiSelect);

        // Close node detail panel if open
        const nodePanel = document.getElementById('nodeDetailPanel');
        if (nodePanel && !nodePanel.classList.contains('translate-x-full')) {
            nodePanel.classList.add('translate-x-full');
        }

        // Show edge detail panel
        this.showEdgeDetails(edgeId);
    }
    
    showEdgeDetails(edgeId) {
        console.log('Showing edge details for:', edgeId);
        // Use workflowApp's showEdgeDetail method for consistent edge detail display
        if (window.app && window.app.showEdgeDetail) {
            window.app.showEdgeDetail(edgeId);
        } else {
            // Fallback to local implementation
            const panel = document.getElementById('edgeDetailPanel');
            if (panel) {
                panel.classList.remove('translate-x-full');
                this.renderEdgeDetails(edgeId);
            }
        }
    }
    
    renderEdgeDetails(edgeId) {
        const edge = workflowEngine.edges.get(edgeId);
        if (!edge) return;
        
        const content = document.getElementById('edgeDetailContent');
        if (!content) return;
        
        const sourceNode = workflowEngine.nodes.get(edge.source);
        const targetNode = workflowEngine.nodes.get(edge.target);
        
        const sourceShortId = edge.source.substr(-6);
        const targetShortId = edge.target.substr(-6);
        
        content.innerHTML = `
            <div class="detail-section">
                <div class="detail-label">Edge ID</div>
                <div class="detail-value font-mono text-sm">${edge.id}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Source Node</div>
                <div class="detail-value">Node ${sourceShortId}</div>
                <div class="text-xs text-gray-500 mt-1">${edge.source}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Target Node</div>
                <div class="detail-value">Node ${targetShortId}</div>
                <div class="text-xs text-gray-500 mt-1">${edge.target}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Transformation Prompt</div>
                <div class="detail-value">
                    ${edge.prompt && edge.prompt.trim() !== '' ? 
                        `<div class="text-white bg-gray-800 p-3 rounded-lg mt-2">${edge.prompt}</div>` : 
                        `<div class="text-gray-500 italic">No prompt set</div>`
                    }
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Style</div>
                <div class="detail-value">
                    <span class="px-2 py-1 rounded text-xs bg-purple-600">
                        ${edge.style || 'custom'}
                    </span>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Model</div>
                <div class="detail-value">${edge.model || 'Not specified'}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Created</div>
                <div class="detail-value">${new Date(edge.created).toLocaleString('ja-JP')}</div>
            </div>
            
            <div class="mt-6">
                <button id="editEdgePromptBtn" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                    <i class="fas fa-edit mr-2"></i>Edit Prompt
                </button>
            </div>
        `;
        
        // Add event listener for edit button
        setTimeout(() => {
            const editBtn = document.getElementById('editEdgePromptBtn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    console.log('Edit prompt button clicked for edge:', edgeId);
                    // Hide edge detail panel
                    document.getElementById('edgeDetailPanel')?.classList.add('translate-x-full');
                    // Show edge prompt dialog
                    this.showEdgePromptMenu(edgeId);
                });
            }
        }, 50);
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

    cancelConnection() {
        if (this.connectingFrom) {
            console.log('Cancelling connection from:', this.connectingFrom);
            this.connectingFrom = null;
            workflowEngine.setMode('select');
            this.network.redraw();
        }
    }

    handleImageDrop(files, position) {
        // Get node at drop position if any
        const domPosition = this.network.canvasToDOM(position);
        const nodeId = this.network.getNodeAt(domPosition);
        
        let targetNode;
        
        if (nodeId) {
            // Dropping on existing node
            targetNode = workflowEngine.nodes.get(nodeId);
            
            // Check if node can accept uploads
            if (targetNode && targetNode.nodeType === 'generated') {
                console.warn('Drop blocked: Cannot drop images on generated node');
                alert('生成ノードには手動で画像をアップロードできません。\n入力ノードを使用してください。');
                return;
            }
        } else {
            // Create new input node at drop position
            targetNode = workflowEngine.createNode({ 
                position,
                nodeType: 'input' // Default to input when dropping images
            });
        }
        
        if (targetNode) {
            files.forEach(file => {
                this.uploadImageFileToNode(targetNode.id, file);
            });
        }
    }

    uploadImageFileToNode(nodeId, file) {
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
                <div class="detail-image" data-image-url="${img.url}" data-image-name="${img.metadata?.name || 'Image ' + (index + 1)}" title="${img.metadata?.name || 'Image ' + (index + 1)}">
                    <img src="${img.thumbnail || img.url}" alt="Image ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            `).join('');
        } else {
            imagesHtml = '<p class="text-gray-500 col-span-3">No images in this node</p>';
        }

        const nodeType = node.nodeType || 'input';
        const hasImages = node.images && node.images.length > 0;
        const canUpload = nodeType === 'input';

        // Check if this is a generated node with incoming edges that have prompts
        const canRegenerate = nodeType === 'generated' &&
            workflowEngine.getIncomingEdges(nodeId).some(edge => edge.prompt && edge.prompt.trim() !== '');

        content.innerHTML = `
            <div class="detail-section">
                <div class="detail-label">Node ID</div>
                <div class="detail-value font-mono text-sm">${node.id}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Node Type</div>
                <div class="detail-value">
                    <span class="px-2 py-1 rounded text-xs ${
                        nodeType === 'input' ? 'bg-blue-600' : 'bg-purple-600'
                    }">
                        ${nodeType === 'input' ? '📤 INPUT' : '✨ GENERATED'}
                    </span>
                </div>
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

            ${node.status === 'error' && node.errorMessage ? `
            <div class="detail-section">
                <div class="detail-label">Error Details</div>
                <div class="detail-value">
                    <div class="text-xs text-red-400 bg-red-900/30 p-2 rounded break-words">
                        ${node.errorMessage}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <div class="detail-label">Actions</div>
                <div class="detail-value space-y-2">
                    ${canUpload ? `
                        <button onclick="window.canvasController.promptUploadImageToNode('${nodeId}')"
                                class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm">
                            <i class="fas fa-upload mr-2"></i>画像をアップロード
                        </button>
                        <button onclick="window.canvasController.showImageUrlDialog('${nodeId}')"
                                class="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors text-sm">
                            <i class="fas fa-link mr-2"></i>URLから画像を追加
                        </button>
                    ` : ''}
                    ${canRegenerate ? `
                        <button onclick="window.canvasController.handleGenerateClick('${nodeId}')"
                                class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm">
                            <i class="fas fa-rotate mr-2"></i>Re-Generate
                        </button>
                    ` : ''}
                    ${hasImages ? `
                        <button onclick="window.canvasController.showTransformDialogFromNode('${nodeId}')"
                                class="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors text-sm">
                            <i class="fas fa-wand-magic-sparkles mr-2"></i>画像を変換
                        </button>
                    ` : ''}
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
        
        // Add click event listeners to images after rendering
        setTimeout(() => {
            const imageElements = content.querySelectorAll('.detail-image');
            imageElements.forEach(imgEl => {
                imgEl.addEventListener('click', () => {
                    const imageUrl = imgEl.dataset.imageUrl;
                    const imageName = imgEl.dataset.imageName;
                    console.log('Detail panel image clicked:', imageName);
                    this.showImageViewer(imageUrl, imageName);
                });
            });
        }, 50);
    }

    showTransformDialogFromNode(nodeId) {
        console.log('showTransformDialogFromNode called for node:', nodeId);

        const node = workflowEngine.nodes.get(nodeId);
        if (!node) {
            console.error('Node not found:', nodeId);
            return;
        }

        if (!node.images || node.images.length === 0) {
            alert('このノードには画像がありません。\n画像変換を行うには、まず画像をアップロードしてください。');
            return;
        }

        // Select the node in the workflow engine
        workflowEngine.selectNode(nodeId);

        // Call the workflowApp's transform method
        if (window.app && window.app.transformSelectedNode) {
            window.app.transformSelectedNode();
        } else {
            console.error('WorkflowApp transformSelectedNode method not found');
            alert('画像変換機能を初期化できませんでした。');
        }
    }

    promptUploadImageToNode(nodeId) {
        console.log('Prompting user to upload image to node:', nodeId);
        
        // Check node type - generated nodes cannot accept uploads
        const node = workflowEngine.nodes.get(nodeId);
        if (!node) {
            console.error('Node not found:', nodeId);
            return;
        }
        
        if (node.nodeType === 'generated') {
            console.warn('Upload blocked: Cannot upload to generated node');
            alert('生成ノードには手動で画像をアップロードできません。\n入力ノードを使用してください。\n\nGenerated nodes only accept AI-generated images. Use an Input node to upload files.');
            return;
        }
        
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            
            input.addEventListener('change', async (e) => {
                try {
                    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
                    
                    if (files.length === 0) {
                        console.warn('No image files selected');
                        return;
                    }
                    
                    for (const file of files) {
                        // Check file size (max 20MB)
                        if (file.size > 20 * 1024 * 1024) {
                            alert(`File ${file.name} is too large. Maximum size is 20MB.`);
                            continue;
                        }
                        
                        const reader = new FileReader();
                        
                        reader.onload = (event) => {
                            try {
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
                            } catch (error) {
                                console.error('Error processing image:', error);
                                alert(`Failed to process ${file.name}: ${error.message}`);
                            }
                        };
                        
                        reader.onerror = (error) => {
                            console.error('Failed to read file:', error);
                            alert(`Failed to read file ${file.name}`);
                        };
                        
                        reader.readAsDataURL(file);
                    }
                } catch (error) {
                    console.error('Error handling file selection:', error);
                    alert(`Error uploading images: ${error.message}`);
                }
            });
            
            // Trigger file selection
            input.click();
        } catch (error) {
            console.error('Error creating file upload dialog:', error);
            alert(`Failed to open file upload: ${error.message}`);
        }
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

    /**
     * Get viewport center position in network coordinates
     * @returns {Object} {x, y} position
     */
    getViewportCenter() {
        if (!this.network) {
            return { x: 400, y: 300 };
        }

        // Get current view position (already in network coordinates)
        const viewPosition = this.network.getViewPosition();

        return {
            x: viewPosition.x,
            y: viewPosition.y
        };
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
        this.imageCache.clear();
        this.hideCircleMenu();
    }

    loadWorkflow() {
        console.log('====== LOAD WORKFLOW ======');
        console.log('WorkflowEngine nodes:', workflowEngine.nodes.size);
        console.log('WorkflowEngine edges:', workflowEngine.edges.size);

        this.clearCanvas();

        let addedNodes = 0;
        for (const node of workflowEngine.nodes.values()) {
            console.log('Adding node:', node.id, 'at position:', node.position);
            this.addNode(node);
            addedNodes++;
        }

        let addedEdges = 0;
        for (const edge of workflowEngine.edges.values()) {
            console.log('Adding edge:', edge.id);
            this.addEdge(edge);
            addedEdges++;
        }

        console.log('Added', addedNodes, 'nodes and', addedEdges, 'edges to canvas');
        console.log('Canvas nodes DataSet size:', this.nodes.length);
        console.log('Canvas edges DataSet size:', this.edges.length);

        // Force network update
        if (this.network) {
            console.log('Forcing network redraw...');
            this.requestRedraw();
        }

        console.log('===========================');

        // Fit view to show all nodes and update minimap after network has stabilized
        if (addedNodes > 0) {
            setTimeout(() => {
                this.fitView();
                // Update minimap after view has been fitted
                setTimeout(() => {
                    this.updateMiniMap();
                }, 200);
            }, 100);
        } else {
            // Even if no nodes, update minimap
            setTimeout(() => {
                this.updateMiniMap();
            }, 100);
        }
    }

    /**
     * Initialize Mini Map - Creates canvas and sets up event listeners
     */
    initializeMiniMap() {
        const miniMapContainer = document.getElementById('miniMapContent');
        if (!miniMapContainer) {
            console.warn('Mini map container not found');
            return;
        }

        // Create canvas element
        const canvas = document.createElement('canvas');

        // Get actual container size
        const containerWidth = miniMapContainer.clientWidth || 192;
        const containerHeight = miniMapContainer.clientHeight || 96; // Adjusted for header space

        // Set canvas resolution (use device pixel ratio for high DPI displays)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = containerWidth * dpr;
        canvas.height = containerHeight * dpr;

        // Set display size
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        canvas.style.display = 'block';

        this.miniMapCanvas = canvas;
        this.miniMapCtx = canvas.getContext('2d');

        // Scale context for high DPI
        this.miniMapCtx.scale(dpr, dpr);

        miniMapContainer.appendChild(canvas);

        // Click handler - move main view to clicked position
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // Convert mini map coordinates to network coordinates
            const bounds = this.getNetworkBounds();
            if (!bounds) return;

            // Add padding to bounds (same as in renderMiniMap)
            const padding = 50;
            const paddedBounds = {
                minX: bounds.minX - padding,
                minY: bounds.minY - padding,
                maxX: bounds.maxX + padding,
                maxY: bounds.maxY + padding
            };

            const boundsWidth = paddedBounds.maxX - paddedBounds.minX;
            const boundsHeight = paddedBounds.maxY - paddedBounds.minY;

            // Calculate scale (same as in renderMiniMap)
            const scaleX = canvas.width / boundsWidth;
            const scaleY = canvas.height / boundsHeight;
            const scale = Math.min(scaleX, scaleY);

            // Calculate offset (same as in renderMiniMap)
            const offsetX = (canvas.width - boundsWidth * scale) / 2;
            const offsetY = (canvas.height - boundsHeight * scale) / 2;

            // Convert mini map coordinates back to network coordinates
            const networkX = paddedBounds.minX + (clickX - offsetX) / scale;
            const networkY = paddedBounds.minY + (clickY - offsetY) / scale;

            // Move to position
            this.network.moveTo({
                position: { x: networkX, y: networkY },
                animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuad'
                }
            });
        });

        console.log('Mini map initialized');
    }

    /**
     * Update Mini Map - Called when network state changes
     */
    updateMiniMap() {
        if (!this.miniMapCanvas || !this.miniMapCtx) return;

        requestAnimationFrame(() => this.renderMiniMap());
    }

    /**
     * Render Mini Map - Draw miniature version of the network
     */
    renderMiniMap() {
        if (!this.miniMapCanvas || !this.miniMapCtx) return;

        const ctx = this.miniMapCtx;
        const canvas = this.miniMapCanvas;

        // Get display size (not canvas resolution which may be scaled by DPI)
        const displayWidth = parseFloat(canvas.style.width) || canvas.width;
        const displayHeight = parseFloat(canvas.style.height) || canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)'; // Dark background
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Get network bounds
        const bounds = this.getNetworkBounds();
        if (!bounds || bounds.maxX === bounds.minX || bounds.maxY === bounds.minY) {
            // No nodes or all nodes at same position
            ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No nodes', displayWidth / 2, displayHeight / 2);
            return;
        }

        // Add padding to bounds
        const padding = 50;
        bounds.minX -= padding;
        bounds.minY -= padding;
        bounds.maxX += padding;
        bounds.maxY += padding;

        const boundsWidth = bounds.maxX - bounds.minX;
        const boundsHeight = bounds.maxY - bounds.minY;

        // Calculate scale to fit everything in mini map
        const scaleX = displayWidth / boundsWidth;
        const scaleY = displayHeight / boundsHeight;
        const scale = Math.min(scaleX, scaleY);

        // Center the content
        const offsetX = (displayWidth - boundsWidth * scale) / 2;
        const offsetY = (displayHeight - boundsHeight * scale) / 2;

        // Convert network coordinates to mini map coordinates
        const toMiniMap = (x, y) => {
            return {
                x: offsetX + (x - bounds.minX) * scale,
                y: offsetY + (y - bounds.minY) * scale
            };
        };

        // Get current node positions from the network (actual positions)
        const nodePositions = this.network.getPositions();

        // Draw edges
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.6)'; // Purple
        ctx.lineWidth = 1;

        for (const edge of this.edges.get()) {
            const fromPos = nodePositions[edge.from];
            const toPos = nodePositions[edge.to];

            if (!fromPos || !toPos) continue;

            const fromMiniPos = toMiniMap(fromPos.x, fromPos.y);
            const toMiniPos = toMiniMap(toPos.x, toPos.y);

            ctx.beginPath();
            ctx.moveTo(fromMiniPos.x, fromMiniPos.y);
            ctx.lineTo(toMiniPos.x, toMiniPos.y);
            ctx.stroke();
        }

        // Draw nodes
        for (const nodeId of Object.keys(nodePositions)) {
            const pos = nodePositions[nodeId];
            const nodeData = workflowEngine.nodes.get(nodeId);
            const miniPos = toMiniMap(pos.x, pos.y);

            // Node color based on type
            const isInput = nodeData?.nodeType === 'input';
            const hasImages = nodeData?.images && nodeData.images.length > 0;

            if (hasImages) {
                ctx.fillStyle = isInput ? 'rgba(37, 99, 235, 0.9)' : 'rgba(139, 92, 246, 0.9)';
            } else {
                ctx.fillStyle = 'rgba(75, 85, 99, 0.7)';
            }

            // Draw node as small circle
            ctx.beginPath();
            ctx.arc(miniPos.x, miniPos.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw viewport indicator
        const viewPosition = this.network.getViewPosition();
        const viewScale = this.network.getScale();
        const viewWidth = this.container.clientWidth / viewScale;
        const viewHeight = this.container.clientHeight / viewScale;

        const viewTopLeft = toMiniMap(
            viewPosition.x - viewWidth / 2,
            viewPosition.y - viewHeight / 2
        );
        const viewBottomRight = toMiniMap(
            viewPosition.x + viewWidth / 2,
            viewPosition.y + viewHeight / 2
        );

        ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)'; // Pink
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            viewTopLeft.x,
            viewTopLeft.y,
            viewBottomRight.x - viewTopLeft.x,
            viewBottomRight.y - viewTopLeft.y
        );
    }

    /**
     * Get network bounds - Calculate min/max coordinates of all nodes
     */
    getNetworkBounds() {
        const positions = this.network.getPositions();
        const nodeIds = Object.keys(positions);

        if (nodeIds.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const nodeId of nodeIds) {
            const pos = positions[nodeId];
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
        }

        return { minX, minY, maxX, maxY };
    }

    /**
     * Auto Layout - Automatically arrange nodes in a hierarchical layout
     * Input nodes on the left, generated nodes on the right
     */
    autoLayout() {
        console.log('Auto layout started');
        
        if (!this.network || !workflowEngine) {
            console.warn('Network or workflow engine not initialized');
            return;
        }
        
        const inputNodes = [];
        const generatedNodes = [];
        const standaloneNodes = []; // Nodes without connections
        
        // Classify nodes by type
        for (const node of this.nodes.get()) {
            const nodeData = workflowEngine.nodes.get(node.id);
            if (!nodeData) continue;
            
            // Check if node has any connections
            const incomingEdges = workflowEngine.getIncomingEdges(node.id);
            const outgoingEdges = workflowEngine.getOutgoingEdges(node.id);
            const hasConnections = incomingEdges.length > 0 || outgoingEdges.length > 0;
            
            if (!hasConnections) {
                standaloneNodes.push({ visNode: node, data: nodeData });
            } else if (nodeData.nodeType === 'input') {
                inputNodes.push({ visNode: node, data: nodeData });
            } else {
                generatedNodes.push({ visNode: node, data: nodeData });
            }
        }
        
        console.log(`Found ${inputNodes.length} input nodes, ${generatedNodes.length} generated nodes, ${standaloneNodes.length} standalone nodes`);
        
        // Layout configuration
        const config = {
            startX: 150,
            startY: 150,
            horizontalSpacing: 500,
            verticalSpacing: 250,
            minVerticalSpacing: 200
        };
        
        // Sort nodes by number of connections (more connected = higher priority)
        const sortByConnections = (a, b) => {
            const aConnections = workflowEngine.getIncomingEdges(a.visNode.id).length + 
                                 workflowEngine.getOutgoingEdges(a.visNode.id).length;
            const bConnections = workflowEngine.getIncomingEdges(b.visNode.id).length + 
                                 workflowEngine.getOutgoingEdges(b.visNode.id).length;
            return bConnections - aConnections;
        };
        
        inputNodes.sort(sortByConnections);
        generatedNodes.sort(sortByConnections);
        
        // Position input nodes (left column)
        let currentY = config.startY;
        const newPositions = [];
        
        inputNodes.forEach((nodeInfo, index) => {
            const y = currentY + (index * config.verticalSpacing);
            newPositions.push({
                id: nodeInfo.visNode.id,
                x: config.startX,
                y: y
            });
        });
        
        // Position generated nodes (right column)
        // Try to align with their source nodes
        const generatedPositions = new Map();
        
        generatedNodes.forEach((nodeInfo) => {
            const incomingEdges = workflowEngine.getIncomingEdges(nodeInfo.visNode.id);
            
            if (incomingEdges.length > 0) {
                // Calculate average Y position of source nodes
                let totalY = 0;
                let count = 0;
                
                incomingEdges.forEach(edge => {
                    const sourcePosition = newPositions.find(p => p.id === edge.source);
                    if (sourcePosition) {
                        totalY += sourcePosition.y;
                        count++;
                    }
                });
                
                if (count > 0) {
                    const avgY = totalY / count;
                    generatedPositions.set(nodeInfo.visNode.id, avgY);
                }
            }
        });
        
        // Assign Y positions to generated nodes, avoiding overlaps
        currentY = config.startY;
        const usedYPositions = [];
        
        generatedNodes.forEach((nodeInfo) => {
            let targetY = generatedPositions.get(nodeInfo.visNode.id) || currentY;
            
            // Avoid overlaps with other nodes
            while (usedYPositions.some(y => Math.abs(y - targetY) < config.minVerticalSpacing)) {
                targetY += config.minVerticalSpacing;
            }
            
            usedYPositions.push(targetY);
            currentY = targetY + config.verticalSpacing;
            
            newPositions.push({
                id: nodeInfo.visNode.id,
                x: config.startX + config.horizontalSpacing,
                y: targetY
            });
        });
        
        // Position standalone nodes (far right)
        standaloneNodes.forEach((nodeInfo, index) => {
            newPositions.push({
                id: nodeInfo.visNode.id,
                x: config.startX + (config.horizontalSpacing * 2),
                y: config.startY + (index * config.verticalSpacing)
            });
        });
        
        // Apply new positions with animation
        const updates = [];
        newPositions.forEach(pos => {
            updates.push({
                id: pos.id,
                x: pos.x,
                y: pos.y
            });
            
            // Update workflow engine
            workflowEngine.updateNode(pos.id, {
                position: { x: pos.x, y: pos.y }
            });
        });
        
        // Update vis.js network
        this.nodes.update(updates);
        
        // Fit view after layout
        setTimeout(() => {
            this.fitView();
        }, 100);
        
        console.log(`Auto layout complete: positioned ${newPositions.length} nodes`);
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
        this.imageCache.clear();
        this.imageCache = null;
        
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