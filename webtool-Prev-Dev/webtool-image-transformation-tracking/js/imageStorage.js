/**
 * Image Storage - IndexedDB wrapper for storing images
 */

class ImageStorage {
    constructor() {
        this.dbName = 'WorkflowImageDB';
        this.storeName = 'images';
        this.db = null;
        this.version = 1;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create indexes
                    objectStore.createIndex('nodeId', 'nodeId', { unique: false });
                    objectStore.createIndex('url', 'url', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });

                    console.log('Object store created');
                }
            };
        });
    }

    /**
     * Save image to IndexedDB
     * @param {string} nodeId - Node ID
     * @param {Blob} blob - Image blob
     * @param {Object} metadata - Image metadata
     * @returns {Promise<Object>} Saved image data
     */
    async saveImage(nodeId, blob, metadata = {}) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const imageData = {
                nodeId: nodeId,
                blob: blob,
                metadata: {
                    ...metadata,
                    size: blob.size,
                    type: blob.type,
                    timestamp: Date.now()
                },
                url: metadata.originalUrl || null,
                timestamp: Date.now()
            };

            const request = objectStore.add(imageData);

            request.onsuccess = () => {
                const id = request.result;
                console.log('Image saved to IndexedDB with ID:', id);
                resolve({
                    id: id,
                    ...imageData
                });
            };

            request.onerror = () => {
                console.error('Failed to save image:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get image by ID
     * @param {number} id - Image ID
     * @returns {Promise<Object>} Image data
     */
    async getImage(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to get image:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all images for a node
     * @param {string} nodeId - Node ID
     * @returns {Promise<Array>} Array of image data
     */
    async getImagesByNode(nodeId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('nodeId');
            const request = index.getAll(nodeId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to get images for node:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete image by ID
     * @param {number} id - Image ID
     * @returns {Promise<void>}
     */
    async deleteImage(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('Image deleted from IndexedDB:', id);
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to delete image:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete all images for a node
     * @param {string} nodeId - Node ID
     * @returns {Promise<void>}
     */
    async deleteImagesByNode(nodeId) {
        if (!this.db) {
            await this.init();
        }

        const images = await this.getImagesByNode(nodeId);
        const deletePromises = images.map(img => this.deleteImage(img.id));
        return Promise.all(deletePromises);
    }

    /**
     * Convert blob to data URL
     * @param {Blob} blob - Image blob
     * @returns {Promise<string>} Data URL
     */
    async blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }



    /**
     * Clear all images from database
     * @returns {Promise<void>}
     */
    async clearAll() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('All images cleared from IndexedDB');
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to clear images:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getStats() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const countRequest = objectStore.count();

            countRequest.onsuccess = () => {
                resolve({
                    totalImages: countRequest.result,
                    dbName: this.dbName,
                    storeName: this.storeName
                });
            };

            countRequest.onerror = () => {
                reject(countRequest.error);
            };
        });
    }
}

// Create global instance
const imageStorage = new ImageStorage();

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        try {
            await imageStorage.init();
            console.log('Image storage ready');
        } catch (error) {
            console.error('Failed to initialize image storage:', error);
        }
    });
}
