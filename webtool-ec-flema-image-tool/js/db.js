// ========== IndexedDB管理モジュール ==========
// プロジェクトデータの永続化

const DB_NAME = 'FleMaDB';
const DB_VERSION = 2; // 画像履歴機能追加のためバージョンアップ
const STORE_NAME = 'projects';
const IMAGE_HISTORY_STORE = 'imageHistory'; // 画像履歴ストア
const MAX_PROJECTS = 20; // 画像を含むプロジェクトを20件まで保持（共有用）
const MAX_IMAGE_HISTORY = 50; // 画像履歴を最大50件まで保持

let db = null;

// IndexedDB初期化
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB open error:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;

            // プロジェクトストアを作成
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                objectStore.createIndex('name', 'name', { unique: false });
                console.log('Projects object store created');
            }

            // 画像履歴ストアを作成
            if (!db.objectStoreNames.contains(IMAGE_HISTORY_STORE)) {
                const imageStore = db.createObjectStore(IMAGE_HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
                imageStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                imageStore.createIndex('dataUrl', 'dataUrl', { unique: false });
                console.log('Image history object store created');
            }
        };
    });
}

// プロジェクト保存
async function saveProject(projectData) {
    if (!db) {
        await initIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        
        // タイムスタンプを追加
        projectData.updatedAt = Date.now();
        
        const request = objectStore.put(projectData);
        
        request.onsuccess = () => {
            console.log('Project saved:', projectData.id);
            resolve(projectData.id);
        };
        
        request.onerror = () => {
            console.error('Save error:', request.error);
            reject(request.error);
        };
    });
}

// プロジェクト読み込み
async function loadProject(projectId) {
    if (!db) {
        await initIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(projectId);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            console.error('Load error:', request.error);
            reject(request.error);
        };
    });
}

// 全プロジェクト取得
async function getAllProjects() {
    if (!db) {
        await initIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const index = objectStore.index('updatedAt');
        const request = index.openCursor(null, 'prev'); // 新しい順
        
        const projects = [];
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                projects.push(cursor.value);
                cursor.continue();
            } else {
                resolve(projects);
            }
        };
        
        request.onerror = () => {
            console.error('GetAll error:', request.error);
            reject(request.error);
        };
    });
}

// プロジェクト削除
async function deleteProject(projectId) {
    if (!db) {
        await initIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(projectId);
        
        request.onsuccess = () => {
            console.log('Project deleted:', projectId);
            resolve();
        };
        
        request.onerror = () => {
            console.error('Delete error:', request.error);
            reject(request.error);
        };
    });
}

// 古いプロジェクトを削除（最大数を超えた場合）
async function cleanupOldProjects() {
    const projects = await getAllProjects();
    
    if (projects.length > MAX_PROJECTS) {
        // 古いものから削除
        const toDelete = projects.slice(MAX_PROJECTS);
        for (const project of toDelete) {
            await deleteProject(project.id);
        }
        console.log(`Cleaned up ${toDelete.length} old projects`);
    }
}

// キャンバスをJSON形式でシリアライズ
function serializeCanvas(canvas) {
    return canvas.toJSON(['id', 'objectType', 'customData', 'customFilters']);
}

// JSONからキャンバスを復元
async function deserializeCanvas(canvas, jsonData) {
    return new Promise((resolve, reject) => {
        canvas.loadFromJSON(jsonData, () => {
            canvas.renderAll();
            console.log('Canvas restored from JSON');
            resolve();
        }, (o, object) => {
            // オブジェクト復元時のカスタム処理
            if (object.objectType === 'uploaded-image') {
                object.set({
                    cornerStyle: 'circle',
                    cornerColor: '#ff9a5a',
                    cornerSize: 16,
                    transparentCorners: false,
                    borderColor: '#ff9a5a'
                });
            } else if (object.type === 'i-text') {
                object.set({
                    cornerStyle: 'circle',
                    cornerColor: '#ff9a5a',
                    cornerSize: 16,
                    transparentCorners: false,
                    borderColor: '#ff9a5a'
                });
            }
        });
    });
}

// プロジェクトデータを作成
function createProjectData(id, name, canvasEntries, activeCanvasId) {
    const canvases = (canvasEntries || []).map((entry, index) => {
        const fabricCanvas = entry.canvas;
        const canvasId = entry.id || `canvas-${index + 1}`;
        const serialized = serializeCanvas(fabricCanvas);
        const thumbnail = fabricCanvas.toDataURL({ format: 'png', quality: 0.3, multiplier: 0.2 });
        return {
            id: canvasId,
            order: index,
            width: fabricCanvas.width,
            height: fabricCanvas.height,
            backgroundColor: fabricCanvas.backgroundColor || '#ffffff',
            canvasData: serialized,
            zoom: fabricCanvas.getZoom ? fabricCanvas.getZoom() : 1,
            thumbnail: thumbnail
        };
    });

    const primaryCanvas = canvases[0] || null;
    const fallbackWidth = typeof window !== 'undefined' && window.DEFAULT_CANVAS_WIDTH ? window.DEFAULT_CANVAS_WIDTH : 1080;
    const fallbackHeight = typeof window !== 'undefined' && window.DEFAULT_CANVAS_HEIGHT ? window.DEFAULT_CANVAS_HEIGHT : 1080;
    const projectThumbnail = primaryCanvas ? primaryCanvas.thumbnail : '';

    return {
        id: id,
        name: name,
        canvases: canvases,
        activeCanvasId: activeCanvasId || (primaryCanvas ? primaryCanvas.id : null),
        canvasData: primaryCanvas ? primaryCanvas.canvasData : null,
        canvasWidth: primaryCanvas ? primaryCanvas.width : fallbackWidth,
        canvasHeight: primaryCanvas ? primaryCanvas.height : fallbackHeight,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnail: projectThumbnail
    };
}

// 現在のプロジェクトIDを取得/設定
let currentProjectId = null;

function getCurrentProjectId() {
    if (!currentProjectId) {
        // LocalStorageから読み込み
        currentProjectId = localStorage.getItem('currentProjectId');
        if (!currentProjectId) {
            // 新規プロジェクト作成
            currentProjectId = generateProjectId();
            localStorage.setItem('currentProjectId', currentProjectId);
        }
    }
    return currentProjectId;
}

function setCurrentProjectId(id) {
    currentProjectId = id;
    localStorage.setItem('currentProjectId', id);
}

function generateProjectId() {
    return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// プロジェクト名を生成
function generateProjectName() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    return `プロジェクト ${dateStr}`;
}

// ========== 画像履歴管理 ==========

// 画像履歴を保存
async function saveImageToHistory(imageDataUrl, fileName = '') {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_HISTORY_STORE], 'readwrite');
        const objectStore = transaction.objectStore(IMAGE_HISTORY_STORE);

        const imageData = {
            dataUrl: imageDataUrl,
            fileName: fileName,
            uploadedAt: Date.now()
        };

        const request = objectStore.add(imageData);

        request.onsuccess = () => {
            console.log('Image saved to history:', request.result);
            cleanupOldImageHistory(); // 古い履歴を削除
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Save image history error:', request.error);
            reject(request.error);
        };
    });
}

// すべての画像履歴を取得（新しい順）
async function getAllImageHistory() {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_HISTORY_STORE], 'readonly');
        const objectStore = transaction.objectStore(IMAGE_HISTORY_STORE);
        const index = objectStore.index('uploadedAt');
        const request = index.openCursor(null, 'prev'); // 新しい順

        const images = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                images.push(cursor.value);
                cursor.continue();
            } else {
                resolve(images);
            }
        };

        request.onerror = () => {
            console.error('Get image history error:', request.error);
            reject(request.error);
        };
    });
}

// 画像履歴を削除
async function deleteImageFromHistory(imageId) {
    if (!db) {
        await initIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGE_HISTORY_STORE], 'readwrite');
        const objectStore = transaction.objectStore(IMAGE_HISTORY_STORE);
        const request = objectStore.delete(imageId);

        request.onsuccess = () => {
            console.log('Image deleted from history:', imageId);
            resolve();
        };

        request.onerror = () => {
            console.error('Delete image history error:', request.error);
            reject(request.error);
        };
    });
}

// 古い画像履歴を削除（最大数を超えた場合）
async function cleanupOldImageHistory() {
    const images = await getAllImageHistory();

    if (images.length > MAX_IMAGE_HISTORY) {
        // 古いものから削除
        const toDelete = images.slice(MAX_IMAGE_HISTORY);
        for (const image of toDelete) {
            await deleteImageFromHistory(image.id);
        }
        console.log(`Cleaned up ${toDelete.length} old images from history`);
    }
}
