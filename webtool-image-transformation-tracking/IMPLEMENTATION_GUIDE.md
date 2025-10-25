# 画像変換ワークフロー - 残りの実装ガイド

このファイルには、残りの実装作業の詳細手順が記載されています。

## 完了した実装

✅ **ノードタイプシステム基盤** - workflowEngine.js
✅ **設定管理の拡張** - config.js, index.html  
✅ **Replicate API実装** - transformationService.js
✅ **ヘルパー関数** - transformationService.js, workflowEngine.js
✅ **HTML構造** - index.html (モーダル追加)

---

## 残りの実装タスク

### 1. ノードタイプ選択モーダルの機能実装

**ファイル**: `js/workflowApp.js`

`addNewNode()` メソッドを以下のように更新：

```javascript
addNewNode() {
    // ノードタイプ選択モーダルを表示
    const modal = document.getElementById('nodeTypeModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // 位置情報を一時保存
        const centerPosition = window.canvasController?.network?.getViewPosition() || { x: 400, y: 300 };
        modal.dataset.position = JSON.stringify(centerPosition);
    }
}
```

`setupEventListeners()` メソッドに追加：

```javascript
// Node type modal handlers
const closeNodeTypeModal = document.getElementById('closeNodeTypeModal');
if (closeNodeTypeModal) {
    closeNodeTypeModal.addEventListener('click', () => {
        document.getElementById('nodeTypeModal')?.classList.add('hidden');
    });
}

const selectInputNode = document.getElementById('selectInputNode');
if (selectInputNode) {
    selectInputNode.addEventListener('click', () => {
        this.createNodeWithType('input');
    });
}

const selectGeneratedNode = document.getElementById('selectGeneratedNode');
if (selectGeneratedNode) {
    selectGeneratedNode.addEventListener('click', () => {
        this.createNodeWithType('generated');
    });
}
```

新しいメソッドを追加：

```javascript
createNodeWithType(nodeType) {
    const modal = document.getElementById('nodeTypeModal');
    const position = modal?.dataset.position ? JSON.parse(modal.dataset.position) : { x: 400, y: 300 };
    
    const node = workflowEngine.createNode({
        position: position,
        nodeType: nodeType
    });
    
    console.log(`Created ${nodeType} node:`, node.id);
    
    // モーダルを閉じる
    modal?.classList.add('hidden');
}
```

---

### 2. 画像拡大モーダルの機能実装

**ファイル**: `js/workflowApp.js`

`setupEventListeners()` メソッドに追加：

```javascript
// Image viewer modal handlers
const closeImageViewer = document.getElementById('closeImageViewer');
if (closeImageViewer) {
    closeImageViewer.addEventListener('click', () => {
        document.getElementById('imageViewerModal')?.classList.add('hidden');
    });
}

const downloadImageBtn = document.getElementById('downloadImageBtn');
if (downloadImageBtn) {
    downloadImageBtn.addEventListener('click', () => {
        this.downloadCurrentImage();
    });
}
```

新しいメソッドを追加：

```javascript
showImageViewer(imageUrl, imageName) {
    const modal = document.getElementById('imageViewerModal');
    const img = document.getElementById('viewerImage');
    const nameEl = document.getElementById('viewerImageName');
    
    if (modal && img) {
        img.src = imageUrl;
        if (nameEl) nameEl.textContent = imageName || 'image';
        
        // データを保存
        modal.dataset.imageUrl = imageUrl;
        modal.dataset.imageName = imageName || 'image';
        
        modal.classList.remove('hidden');
    }
}

downloadCurrentImage() {
    const modal = document.getElementById('imageViewerModal');
    const imageUrl = modal?.dataset.imageUrl;
    const imageName = modal?.dataset.imageName || 'image';
    
    if (imageUrl) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `${imageName}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
```

---

### 3. エッジ詳細パネルの機能実装

**ファイル**: `js/canvasController.js`

`handleEdgeClick()` メソッドを更新：

```javascript
handleEdgeClick(edgeId, event) {
    const multiSelect = event.ctrlKey || event.metaKey;
    workflowEngine.selectEdge(edgeId, multiSelect);
    
    // エッジ詳細パネルを表示
    this.showEdgeDetails(edgeId);
}
```

新しいメソッドを追加：

```javascript
showEdgeDetails(edgeId) {
    // ノード詳細パネルを閉じる
    const nodePanel = document.getElementById('nodeDetailPanel');
    if (nodePanel) {
        nodePanel.classList.add('translate-x-full');
    }
    
    // エッジ詳細パネルを表示
    const edgePanel = document.getElementById('edgeDetailPanel');
    if (edgePanel) {
        edgePanel.classList.remove('translate-x-full');
        this.renderEdgeDetails(edgeId);
    }
}

renderEdgeDetails(edgeId) {
    const edge = workflowEngine.edges.get(edgeId);
    if (!edge) return;
    
    const sourceNode = workflowEngine.nodes.get(edge.source);
    const targetNode = workflowEngine.nodes.get(edge.target);
    
    const content = document.getElementById('edgeDetailContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">エッジID</div>
            <div class="detail-value font-mono text-sm">${edge.id}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">ソースノード</div>
            <div class="detail-value">${sourceNode ? sourceNode.id.substr(-8) : 'Unknown'}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">ターゲットノード</div>
            <div class="detail-value">${targetNode ? targetNode.id.substr(-8) : 'Unknown'}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">プロンプト</div>
            <textarea id="edgePromptText" rows="6" 
                      class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-purple-500"
                      placeholder="変換プロンプトを入力...">${edge.prompt || ''}</textarea>
            <button id="saveEdgePrompt" data-edge-id="${edgeId}" 
                    class="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors">
                <i class="fas fa-save mr-2"></i>プロンプトを保存
            </button>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">スタイル</div>
            <div class="detail-value">${edge.style || 'custom'}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">モデル</div>
            <div class="detail-value">${edge.model || 'google/nano-banana'}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">作成日時</div>
            <div class="detail-value">${new Date(edge.created).toLocaleString('ja-JP')}</div>
        </div>
        
        <div class="detail-section mt-6">
            <button id="deleteEdge" data-edge-id="${edgeId}" 
                    class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors">
                <i class="fas fa-trash mr-2"></i>エッジを削除
            </button>
        </div>
    `;
    
    // イベントリスナーを追加
    const saveBtn = document.getElementById('saveEdgePrompt');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const promptText = document.getElementById('edgePromptText')?.value;
            if (promptText !== undefined) {
                workflowEngine.updateEdge(edgeId, { prompt: promptText });
                alert('プロンプトを保存しました');
            }
        });
    }
    
    const deleteBtn = document.getElementById('deleteEdge');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('このエッジを削除しますか？')) {
                workflowEngine.deleteEdge(edgeId);
                document.getElementById('edgeDetailPanel')?.classList.add('translate-x-full');
            }
        });
    }
}
```

`setupEventListeners()` または `initialize()` に追加：

```javascript
// Close edge detail panel
const closeEdgeDetailPanel = document.getElementById('closeEdgeDetailPanel');
if (closeEdgeDetailPanel) {
    closeEdgeDetailPanel.addEventListener('click', () => {
        document.getElementById('edgeDetailPanel')?.classList.add('translate-x-full');
    });
}
```

---

### 4. ノード詳細パネルの画像クリックで拡大表示

**ファイル**: `js/canvasController.js`

`renderNodeDetails()` メソッドの画像HTMLを更新：

```javascript
if (node.images && node.images.length > 0) {
    imagesHtml = node.images.map((img, index) => `
        <div class="detail-image cursor-pointer" 
             onclick="window.app.showImageViewer('${img.url}', '${img.metadata?.name || 'Image ' + (index + 1)}')"
             title="${img.metadata?.name || 'Image ' + (index + 1)}">
            <img src="${img.thumbnail || img.url}" alt="Image ${index + 1}" 
                 style="width: 100%; height: 100%; object-fit: cover;">
        </div>
    `).join('');
} else {
    imagesHtml = '<p class="text-gray-500 col-span-3">No images in this node</p>';
}
```

---

### 5. Generate機能の実装

**ファイル**: `js/canvasController.js`

`renderNodeDetails()` メソッドにGenerateボタンを追加：

```javascript
// Generateボタンの状態を判定
const canGenerate = workflowEngine.canGenerateImages(nodeId);
const generateBtnClass = canGenerate ? 
    'bg-green-600 hover:bg-green-700' : 
    'bg-gray-600 cursor-not-allowed opacity-50';

content.innerHTML = `
    <div class="detail-section">
        <div class="detail-label">Node ID</div>
        <div class="detail-value font-mono text-sm">${node.id}</div>
    </div>
    
    <div class="detail-section">
        <div class="detail-label">Node Type</div>
        <div class="detail-value">
            <span class="px-2 py-1 rounded text-xs ${
                node.nodeType === 'input' ? 'bg-blue-600' : 'bg-purple-600'
            }">
                ${node.nodeType === 'input' ? '入力ノード' : '生成ノード'}
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
    
    ${canGenerate ? `
    <div class="detail-section">
        <button id="generateImagesBtn" data-node-id="${nodeId}" 
                class="w-full px-4 py-2 ${generateBtnClass} rounded transition-colors">
            <i class="fas fa-magic mr-2"></i>Generate Images
        </button>
    </div>
    ` : `
    <div class="detail-section">
        <button disabled 
                class="w-full px-4 py-2 ${generateBtnClass} rounded">
            <i class="fas fa-magic mr-2"></i>Generate Images (No incoming edges)
        </button>
    </div>
    `}
    
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

// Generateボタンのイベントリスナーを追加
if (canGenerate) {
    const generateBtn = document.getElementById('generateImagesBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            this.generateImages(nodeId);
        });
    }
}
```

新しいメソッドを追加：

```javascript
async generateImages(nodeId) {
    try {
        const node = workflowEngine.nodes.get(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }
        
        // 入力エッジを取得
        const incomingEdges = workflowEngine.getIncomingEdges(nodeId);
        if (incomingEdges.length === 0) {
            alert('このノードには入力エッジがありません');
            return;
        }
        
        // プロンプト付きのエッジを取得
        const edgeWithPrompt = incomingEdges.find(e => e.prompt && e.prompt.trim() !== '');
        if (!edgeWithPrompt) {
            alert('入力エッジにプロンプトが設定されていません');
            return;
        }
        
        // ソースノードから画像を取得
        const sourceNode = workflowEngine.nodes.get(edgeWithPrompt.source);
        if (!sourceNode || !sourceNode.images || sourceNode.images.length === 0) {
            alert('ソースノードに画像がありません');
            return;
        }
        
        // ノードを処理中状態に
        workflowEngine.updateNode(nodeId, { status: 'processing' });
        
        // 画像のURLを配列で取得
        const sourceImageUrls = sourceNode.images.map(img => img.url);
        
        // Nano Banana APIで生成
        const results = await transformationService.transformWithNanoBanana(
            sourceImageUrls,
            edgeWithPrompt.prompt,
            {
                aspectRatio: config.get('aspectRatio'),
                outputFormat: config.get('outputFormat')
            }
        );
        
        // 生成された画像をノードに追加
        results.forEach(result => {
            workflowEngine.addImageToNode(nodeId, {
                url: result.url,
                thumbnail: result.thumbnail,
                metadata: result.metadata
            });
        });
        
        // ノードを完了状態に
        workflowEngine.updateNode(nodeId, { status: 'ready' });
        
        // 詳細パネルを更新
        this.renderNodeDetails(nodeId);
        
        alert(`${results.length}枚の画像を生成しました！`);
        
    } catch (error) {
        console.error('Image generation failed:', error);
        workflowEngine.updateNode(nodeId, { status: 'error' });
        alert(`画像生成に失敗しました: ${error.message}`);
    }
}
```

---

### 6. ノードレンダラーの更新（色分けとGenerateボタン）

**ファイル**: `js/canvasController.js`

`nodeRenderer()` メソッドを更新：

```javascript
nodeRenderer({ctx, id, x, y, state: {selected, hover}, style, label}) {
    const node = workflowEngine.nodes.get(id);
    if (!node) return;

    const width = 220;
    const height = 180; // 高さを少し増やす
    const radius = 10;

    // Shadow
    ctx.shadowColor = selected ? 'rgba(236, 72, 153, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = selected ? 20 : 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // Background - ノードタイプ別に色分け
    const hasImages = node.images && node.images.length > 0;
    const isInput = node.nodeType === 'input';
    
    this.roundRect(ctx, x - width/2, y - height/2, width, height, radius);
    
    if (isInput) {
        // 入力ノード - 青系
        const gradient = ctx.createLinearGradient(x - width/2, y - height/2, x + width/2, y + height/2);
        if (hasImages) {
            gradient.addColorStop(0, selected ? '#3B82F6' : '#2563EB');
            gradient.addColorStop(1, selected ? '#60A5FA' : '#3B82F6');
        } else {
            gradient.addColorStop(0, selected ? '#1E3A8A' : '#1E40AF');
            gradient.addColorStop(1, selected ? '#2563EB' : '#1E3A8A');
        }
        ctx.fillStyle = gradient;
    } else {
        // 生成ノード - 紫系
        const gradient = ctx.createLinearGradient(x - width/2, y - height/2, x + width/2, y + height/2);
        if (hasImages) {
            gradient.addColorStop(0, selected ? '#7C3AED' : '#6D28D9');
            gradient.addColorStop(1, selected ? '#A78BFA' : '#7C3AED');
        } else {
            gradient.addColorStop(0, selected ? '#5B21B6' : '#4C1D95');
            gradient.addColorStop(1, selected ? '#6D28D9' : '#5B21B6');
        }
        ctx.fillStyle = gradient;
    }
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = selected ? '#EC4899' : hover ? '#A78BFA' : (isInput ? '#60A5FA' : '#8B5CF6');
    ctx.lineWidth = selected ? 4 : 3;
    this.roundRect(ctx, x - width/2, y - height/2, width, height, radius);
    ctx.stroke();

    // Header
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x - width/2, y - height/2, width, 30, radius, true, false);
    ctx.fill();

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const shortId = id.substr(-6);
    const nodeTypeIcon = isInput ? '📥' : '⚡';
    ctx.fillText(`${nodeTypeIcon} ${shortId}`, x, y - height/2 + 15);

    // ... (画像表示部分は既存コードを維持) ...

    // Generateボタン（生成ノードのみ、入力エッジがある場合）
    if (!isInput && workflowEngine.canGenerateImages(id)) {
        const btnY = y + height/2 - 25;
        const btnWidth = 100;
        const btnHeight = 20;
        
        // ボタンの背景
        ctx.fillStyle = hover ? '#10B981' : '#059669';
        ctx.fillRect(x - btnWidth/2, btnY, btnWidth, btnHeight);
        
        // ボタンのテキスト
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Inter';
        ctx.fillText('⚡ Generate', x, btnY + btnHeight/2 + 1);
    }

    // Status indicator
    const statusColor = node.status === 'processing' ? '#F59E0B' : 
                       node.status === 'error' ? '#EF4444' : '#10B981';
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(x + width/2 - 15, y - height/2 + 15, 5, 0, 2 * Math.PI);
    ctx.fill();

    return {
        nodeDimensions: {x: x - width/2, y: y - height/2, w: width, h: height}
    };
}
```

---

### 7. キャンバスクリックでノード詳細パネルを閉じる

**ファイル**: `js/canvasController.js`

`setupNetworkEvents()` メソッドの `click` イベントを更新：

```javascript
this.network.on('click', (params) => {
    // Handle image navigation
    if (params.nodes.length > 0) {
        // ... 既存のノード処理 ...
        this.handleNodeClick(nodeId, params.event);
    } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        this.handleEdgeClick(edgeId, params.event);
    } else {
        // 何も選択されていない場合、すべてのパネルを閉じる
        workflowEngine.clearSelection();
        this.hideCircleMenu();
        document.getElementById('nodeDetailPanel')?.classList.add('translate-x-full');
        document.getElementById('edgeDetailPanel')?.classList.add('translate-x-full');
    }
});
```

---

### 8. 画像アップロード制限（生成ノード）

**ファイル**: `js/canvasController.js`

`promptUploadImageToNode()` メソッドの先頭に追加：

```javascript
promptUploadImageToNode(nodeId) {
    console.log('Prompting user to upload image to node:', nodeId);
    
    // ノードタイプをチェック
    if (!workflowEngine.canUploadImage(nodeId)) {
        alert('このノードは生成ノードです。外部から画像をアップロードできません。');
        return;
    }
    
    // ... 既存のコード ...
}
```

`handleImageDrop()` メソッドにも同様のチェックを追加。

---

## テスト手順

1. **ノードタイプ選択**:
   - 「ノード追加」ボタンをクリック
   - モーダルが表示されることを確認
   - 「入力ノード」と「生成ノード」を選択してノードが作成されることを確認
   - ノードの色が異なることを確認（入力=青、生成=紫）

2. **画像アップロード制限**:
   - 入力ノードに画像をアップロード → 成功するはず
   - 生成ノードに画像をアップロード → エラーメッセージが表示されるはず

3. **エッジ詳細パネル**:
   - エッジをクリック → 右パネルにエッジ詳細が表示される
   - プロンプトを編集して保存 → 保存されることを確認
   - エッジを削除 → 削除されることを確認

4. **画像拡大表示**:
   - ノード詳細パネルの画像をクリック → 拡大モーダルが表示される
   - ダウンロードボタンをクリック → 画像がダウンロードされる

5. **Generate機能**:
   - 入力ノードに画像をアップロード
   - エッジを作成してプロンプトを設定
   - 生成ノードでGenerateボタンをクリック
   - （APIキーが設定されている場合）画像が生成されることを確認

6. **設定**:
   - Replicate APIキー、Aspect Ratio、Output Formatを設定
   - 設定が保存されることを確認

7. **キャンバスクリック**:
   - 空のキャンバスエリアをクリック → ノード詳細・エッジ詳細パネルが閉じる

---

## トラブルシューティング

### APIエラーが発生する場合

1. Replicate APIキーが正しく設定されているか確認
2. ブラウザのコンソールでエラーメッセージを確認
3. ネットワークタブでAPI呼び出しを確認

### 画像が表示されない場合

1. base64データが正しく保存されているか確認
2. Blob URLの有効期限を確認（ページリロード後は無効）

### スタイルが適用されない場合

1. workflow.cssファイルが正しく読み込まれているか確認
2. ブラウザのキャッシュをクリア

---

## 次のステップ

実装が完了したら：

1. すべての機能をテスト
2. エラーハンドリングを強化
3. ローディング表示を改善
4. レスポンシブデザインの調整
5. パフォーマンス最適化

---

**実装ガイド完了！**

このガイドに従って実装を完成させてください。質問がある場合は遠慮なくお尋ねください。
