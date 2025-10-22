/**
 * Edge Manager - Extended edge operations
 */

class EdgeManager {
    constructor() {
        this.connectionMode = false;
        this.sourceNodeId = null;
    }

    /**
     * Enter connection mode
     */
    enterConnectionMode() {
        this.connectionMode = true;
        this.sourceNodeId = null;
        
        // Change cursor style
        const canvas = document.querySelector('.vis-network canvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
        }
        
        if (window.nodeManager) {
            window.nodeManager.showNotification('接続モード: 始点ノードをクリックしてください', 'info');
        }
    }

    /**
     * Exit connection mode
     */
    exitConnectionMode() {
        this.connectionMode = false;
        this.sourceNodeId = null;
        
        // Reset cursor style
        const canvas = document.querySelector('.vis-network canvas');
        if (canvas) {
            canvas.style.cursor = 'default';
        }
    }

    /**
     * Auto generate prompt using LLM
     */
    async autoGeneratePrompt() {
        const promptInput = document.getElementById('edgePrompt');
        const styleSelect = document.getElementById('promptTemplate');
        
        if (!promptInput || !styleSelect) return;
        
        const style = styleSelect.value || 'artistic';
        const currentPrompt = promptInput.value;
        
        try {
            // Show loading state
            promptInput.disabled = true;
            promptInput.placeholder = 'プロンプトを生成中...';
            
            // Generate prompt using LLM service
            if (window.llmService) {
                const generatedPrompt = await window.llmService.generatePrompt(
                    '', // No image URL for now
                    style,
                    currentPrompt
                );
                
                promptInput.value = generatedPrompt;
            } else {
                // Fallback to template
                promptInput.value = this.getPromptTemplate(style);
            }
        } catch (error) {
            console.error('Failed to generate prompt:', error);
            if (window.nodeManager) {
                window.nodeManager.showNotification('プロンプト生成に失敗しました', 'error');
            }
        } finally {
            promptInput.disabled = false;
            promptInput.placeholder = '変換プロンプトを入力...';
        }
    }

    /**
     * Apply prompt to edge
     */
    applyPrompt() {
        const promptInput = document.getElementById('edgePrompt');
        const modal = document.getElementById('promptModal');
        
        if (!promptInput || !modal) return;
        
        const prompt = promptInput.value.trim();
        if (!prompt) {
            if (window.nodeManager) {
                window.nodeManager.showNotification('プロンプトを入力してください', 'warning');
            }
            return;
        }
        
        // Apply to selected edges or current edge
        const selectedEdges = window.workflowEngine?.selectedEdges || [];
        
        if (selectedEdges.length > 0) {
            selectedEdges.forEach(edgeId => {
                if (window.workflowEngine) {
                    const edge = window.workflowEngine.edges.get(edgeId);
                    if (edge) {
                        edge.prompt = prompt;
                        edge.metadata = edge.metadata || {};
                        edge.metadata.updatedAt = new Date().toISOString();
                    }
                }
            });
            
            if (window.nodeManager) {
                window.nodeManager.showNotification(`${selectedEdges.length}個のエッジにプロンプトを適用しました`, 'success');
            }
        }
        
        // Close modal
        modal.classList.add('hidden');
        promptInput.value = '';
    }

    /**
     * Execute edge transformation
     */
    async executeEdgeTransformation(edgeId) {
        const edge = window.workflowEngine?.edges.get(edgeId);
        if (!edge || !edge.prompt) {
            throw new Error('エッジまたはプロンプトが見つかりません');
        }
        
        const sourceNode = window.workflowEngine?.nodes.get(edge.from);
        if (!sourceNode || sourceNode.images.length === 0) {
            throw new Error('ソースノードに画像がありません');
        }
        
        // Get source image
        const sourceImage = sourceNode.images[sourceNode.currentIndex || 0];
        
        // Execute transformation
        if (window.transformationService) {
            const results = await window.transformationService.transformImage(
                sourceImage.url,
                edge.prompt,
                3, // Number of variations
                window.config?.get('defaultImageModel') || 'fal-ai/nano-banana'
            );
            
            // Add results to target node
            const targetNode = window.workflowEngine?.nodes.get(edge.to);
            if (targetNode && results) {
                results.forEach(result => {
                    window.workflowEngine?.addImageToNode(targetNode.id, result);
                });
            }
            
            return results;
        }
    }

    /**
     * Get prompt template
     */
    getPromptTemplate(style) {
        const templates = {
            artistic: '芸術的な傑作に変換、鮮やかな色彩と創造的な解釈で',
            photorealistic: 'フォトリアリスティックな変換、ディテールと照明を強化',
            anime: 'アニメ/マンガアートスタイルに変換',
            cyberpunk: '未来的なサイバーパンク美学に変換',
            watercolor: '柔らかな水彩画効果を作成',
            'oil-painting': '古典的な油絵スタイルに変換',
            sketch: '鉛筆スケッチまたは線画に変換',
            '3d-render': '3Dレンダリング画像に変換'
        };
        
        return templates[style] || '';
    }
}

// Initialize edge manager
window.edgeManager = new EdgeManager();