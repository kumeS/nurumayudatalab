/**
 * IndexedDB Storage Manager - 大容量画像ストレージ
 * LocalStorageの代替として、画像をBlob形式で効率的に保存
 */

class IndexedDBStorage {
    constructor(dbName = 'WorkflowDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.ready = false;
        this.initPromise = this.init();
    }

    /**
     * IndexedDBを初期化
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ IndexedDB open failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.ready = true;
                console.log('✅ IndexedDB initialized:', this.dbName);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Workflowsストア（メタデータのみ）
                if (!db.objectStoreNames.contains('workflows')) {
                    const workflowStore = db.createObjectStore('workflows', { keyPath: 'id' });
                    workflowStore.createIndex('modified', 'modified', { unique: false });
                    console.log('📦 Created workflows object store');
                }

                // Imagesストア（画像をBlobで保存）
                if (!db.objectStoreNames.contains('images')) {
                    const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                    imageStore.createIndex('workflowId', 'workflowId', { unique: false });
                    imageStore.createIndex('nodeId', 'nodeId', { unique: false });
                    console.log('📦 Created images object store');
                }

                console.log('🔧 IndexedDB schema upgraded to version', this.version);
            };
        });
    }

    /**
     * 準備完了を待つ
     * @returns {Promise<void>}
     */
    async waitReady() {
        if (this.ready) return;
        await this.initPromise;
    }

    /**
     * ワークフローを保存（画像はimagesストアに分離）
     * @param {Object} workflow - ワークフローデータ
     * @returns {Promise<boolean>}
     */
    async saveWorkflow(workflow) {
        try {
            await this.waitReady();

            const workflowData = {
                id: workflow.id,
                name: workflow.name,
                created: workflow.created,
                modified: workflow.modified || new Date().toISOString(),
                nodes: [],
                edges: workflow.edges || []
            };

            // 各ノードから画像を分離
            const imagePromises = [];
            for (const node of (workflow.nodes || [])) {
                const nodeData = { ...node, images: [] };

                // 画像を個別に保存
                if (node.images && node.images.length > 0) {
                    for (let i = 0; i < node.images.length; i++) {
                        const img = node.images[i];
                        const imageId = `${workflow.id}_${node.id}_${i}`;

                        // 画像データをBlobに変換して保存
                        imagePromises.push(
                            this.saveImage(imageId, img.url, workflow.id, node.id, img.metadata)
                        );

                        // ノードには画像IDのみ保存
                        nodeData.images.push({ imageId });
                    }
                }

                workflowData.nodes.push(nodeData);
            }

            // 画像を並列保存
            await Promise.all(imagePromises);

            // ワークフローメタデータを保存
            const transaction = this.db.transaction(['workflows'], 'readwrite');
            const store = transaction.objectStore('workflows');
            store.put(workflowData);

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`✅ Workflow saved to IndexedDB: ${workflow.id}`);
                    resolve();
                };
                transaction.onerror = () => {
                    console.error('❌ Workflow save failed:', transaction.error);
                    reject(transaction.error);
                };
            });

            return true;
        } catch (error) {
            console.error('❌ saveWorkflow error:', error);
            return false;
        }
    }

    /**
     * 画像をBlobとして保存
     * @param {string} imageId - 画像ID
     * @param {string} dataUrl - Data URL (base64)
     * @param {string} workflowId - ワークフローID
     * @param {string} nodeId - ノードID
     * @param {Object} metadata - メタデータ
     * @returns {Promise<void>}
     */
    async saveImage(imageId, dataUrl, workflowId, nodeId, metadata = {}) {
        try {
            // Data URLをBlobに変換
            const blob = await this.dataUrlToBlob(dataUrl);

            const imageData = {
                id: imageId,
                workflowId,
                nodeId,
                blob,
                metadata,
                savedAt: new Date().toISOString(),
                size: blob.size
            };

            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            store.put(imageData);

            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });

            console.log(`📷 Image saved: ${imageId} (${(blob.size / 1024).toFixed(1)} KB)`);
        } catch (error) {
            console.error(`❌ saveImage error (${imageId}):`, error);
            throw error;
        }
    }

    /**
     * Data URLをBlobに変換
     * @param {string} dataUrl - Data URL
     * @returns {Promise<Blob>}
     */
    async dataUrlToBlob(dataUrl) {
        const response = await fetch(dataUrl);
        return response.blob();
    }

    /**
     * BlobをData URLに変換
     * @param {Blob} blob - Blob
     * @returns {Promise<string>}
     */
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * ワークフローを読み込み（画像も復元）
     * @param {string} workflowId - ワークフローID
     * @returns {Promise<Object>}
     */
    async loadWorkflow(workflowId) {
        try {
            await this.waitReady();

            // ワークフローメタデータを取得
            const transaction = this.db.transaction(['workflows', 'images'], 'readonly');
            const workflowStore = transaction.objectStore('workflows');
            const imageStore = transaction.objectStore('images');

            const workflowData = await new Promise((resolve, reject) => {
                const request = workflowStore.get(workflowId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!workflowData) {
                console.warn('⚠️ Workflow not found:', workflowId);
                return null;
            }

            console.log(`📂 Loading workflow: ${workflowId}`);

            // 各ノードの画像を復元
            for (const node of workflowData.nodes) {
                if (node.images && node.images.length > 0) {
                    const restoredImages = [];

                    for (const imgRef of node.images) {
                        const imageData = await new Promise((resolve, reject) => {
                            const request = imageStore.get(imgRef.imageId);
                            request.onsuccess = () => resolve(request.result);
                            request.onerror = () => reject(request.error);
                        });

                        if (imageData && imageData.blob) {
                            // BlobをData URLに戻す
                            const dataUrl = await this.blobToDataUrl(imageData.blob);
                            restoredImages.push({
                                url: dataUrl,
                                metadata: imageData.metadata || {}
                            });
                        }
                    }

                    node.images = restoredImages;
                }
            }

            console.log(`✅ Workflow loaded with ${workflowData.nodes.length} nodes`);
            return workflowData;
        } catch (error) {
            console.error('❌ loadWorkflow error:', error);
            return null;
        }
    }

    /**
     * 全ワークフローのリストを取得
     * @returns {Promise<Array>}
     */
    async getAllWorkflows() {
        try {
            await this.waitReady();

            const transaction = this.db.transaction(['workflows'], 'readonly');
            const store = transaction.objectStore('workflows');

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const workflows = request.result || [];
                    // 最新順にソート
                    workflows.sort((a, b) => new Date(b.modified) - new Date(a.modified));
                    resolve(workflows);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ getAllWorkflows error:', error);
            return [];
        }
    }

    /**
     * ワークフローを削除（関連画像も削除）
     * @param {string} workflowId - ワークフローID
     * @returns {Promise<boolean>}
     */
    async deleteWorkflow(workflowId) {
        try {
            await this.waitReady();

            const transaction = this.db.transaction(['workflows', 'images'], 'readwrite');
            const workflowStore = transaction.objectStore('workflows');
            const imageStore = transaction.objectStore('images');

            // ワークフローを削除
            workflowStore.delete(workflowId);

            // 関連画像を削除
            const index = imageStore.index('workflowId');
            const range = IDBKeyRange.only(workflowId);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`🗑️ Workflow deleted: ${workflowId}`);
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });

            return true;
        } catch (error) {
            console.error('❌ deleteWorkflow error:', error);
            return false;
        }
    }

    /**
     * ストレージ使用量を取得
     * @returns {Promise<Object>}
     */
    async getStorageInfo() {
        try {
            await this.waitReady();

            const transaction = this.db.transaction(['workflows', 'images'], 'readonly');
            const workflowStore = transaction.objectStore('workflows');
            const imageStore = transaction.objectStore('images');

            const workflowCount = await new Promise((resolve) => {
                const request = workflowStore.count();
                request.onsuccess = () => resolve(request.result);
            });

            const imageCount = await new Promise((resolve) => {
                const request = imageStore.count();
                request.onsuccess = () => resolve(request.result);
            });

            // 画像の合計サイズを計算
            const images = await new Promise((resolve) => {
                const request = imageStore.getAll();
                request.onsuccess = () => resolve(request.result || []);
            });

            const totalImageSize = images.reduce((sum, img) => sum + (img.size || 0), 0);

            return {
                workflowCount,
                imageCount,
                totalImageSize,
                totalImageSizeMB: (totalImageSize / (1024 * 1024)).toFixed(2)
            };
        } catch (error) {
            console.error('❌ getStorageInfo error:', error);
            return { workflowCount: 0, imageCount: 0, totalImageSize: 0, totalImageSizeMB: '0.00' };
        }
    }

    /**
     * 古いワークフローを削除してストレージをクリーンアップ
     * @param {number} maxWorkflows - 保持する最大ワークフロー数
     * @returns {Promise<number>} 削除されたワークフロー数
     */
    async cleanup(maxWorkflows = 10) {
        try {
            const workflows = await this.getAllWorkflows();

            if (workflows.length <= maxWorkflows) {
                console.log(`✅ Cleanup not needed (${workflows.length}/${maxWorkflows})`);
                return 0;
            }

            const toDelete = workflows.slice(maxWorkflows);
            console.log(`🧹 Cleaning up ${toDelete.length} old workflows...`);

            for (const workflow of toDelete) {
                await this.deleteWorkflow(workflow.id);
            }

            console.log(`✅ Cleanup complete: deleted ${toDelete.length} workflows`);
            return toDelete.length;
        } catch (error) {
            console.error('❌ cleanup error:', error);
            return 0;
        }
    }

    /**
     * データベース全体をクリア（危険）
     * @returns {Promise<boolean>}
     */
    async clearAll() {
        try {
            await this.waitReady();

            const transaction = this.db.transaction(['workflows', 'images'], 'readwrite');
            transaction.objectStore('workflows').clear();
            transaction.objectStore('images').clear();

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('🗑️ IndexedDB cleared');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });

            return true;
        } catch (error) {
            console.error('❌ clearAll error:', error);
            return false;
        }
    }
}

// グローバルインスタンス
window.indexedDBStorage = new IndexedDBStorage();

console.log('📦 IndexedDB Storage Manager loaded');
