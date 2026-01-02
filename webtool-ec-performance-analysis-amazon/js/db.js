import { CONFIG } from './config.js';

let db = null;

export async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB initialization error:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            if (!database.objectStoreNames.contains('fileData')) {
                const fileStore = database.createObjectStore('fileData', { keyPath: 'id', autoIncrement: true });
                fileStore.createIndex('hash', 'hash', { unique: true });
                fileStore.createIndex('fileName', 'fileName', { unique: false });
                fileStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('amazonData')) {
                const dataStore = database.createObjectStore('amazonData', { keyPath: 'id', autoIncrement: true });
                dataStore.createIndex('fileHash', 'fileHash', { unique: false });
                dataStore.createIndex('asin', 'asin', { unique: false });
                dataStore.createIndex('weekDate', 'weekDate', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('uploadHistory')) {
                const historyStore = database.createObjectStore('uploadHistory', { keyPath: 'id', autoIncrement: true });
                historyStore.createIndex('hash', 'hash', { unique: true });
                historyStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            }
        };
    });
}

export async function saveFileToIndexedDB(file, weekDate, hash, processedData) {
    if (!db) throw new Error('IndexedDB not initialized');
    
    return new Promise(async (resolve, reject) => {
        try {
            const fileContent = await file.text();
            const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
            
            const fileStore = transaction.objectStore('fileData');
            fileStore.add({
                fileName: file.name,
                size: file.size,
                hash: hash,
                weekDate: weekDate.toISOString(),
                uploadDate: new Date().toISOString(),
                content: fileContent
            });
            
            const dataStore = transaction.objectStore('amazonData');
            for (const item of processedData) {
                dataStore.add({
                    ...item,
                    fileHash: hash,
                    weekDate: item.weekDate.toISOString()
                });
            }
            
            const historyStore = transaction.objectStore('uploadHistory');
            historyStore.add({
                fileName: file.name,
                hash: hash,
                weekDate: weekDate.toISOString(),
                uploadDate: new Date().toISOString(),
                recordCount: processedData.length
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

export async function checkDuplicateFile(hash) {
    if (!db) return false;
    const transaction = db.transaction(['fileData'], 'readonly');
    const store = transaction.objectStore('fileData');
    const index = store.index('hash');
    
    return new Promise((resolve, reject) => {
        const request = index.get(hash);
        request.onsuccess = () => resolve(request.result !== undefined);
        request.onerror = () => reject(request.error);
    });
}

export async function getUploadHistory() {
    if (!db) return [];
    const transaction = db.transaction(['uploadHistory'], 'readonly');
    const store = transaction.objectStore('uploadHistory');
    const index = store.index('uploadDate');
    
    return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            results.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function loadDataFromIndexedDB() {
    if (!db) return [];
    const transaction = db.transaction(['amazonData'], 'readonly');
    const store = transaction.objectStore('amazonData');
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            resolve(results.map(item => ({
                ...item,
                weekDate: new Date(item.weekDate)
            })));
        };
        request.onerror = () => reject(request.error);
    });
}

export async function deleteDataFromIndexedDB(hash) {
    if (!db) return;
    const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
    
    const deleteFromStore = (storeName, indexName) => {
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(hash);
        request.onsuccess = () => {
            request.result.forEach(item => store.delete(item.id));
        };
    };
    
    deleteFromStore('fileData', 'hash');
    deleteFromStore('amazonData', 'fileHash');
    deleteFromStore('uploadHistory', 'hash');
}

export async function clearAllData() {
    if (!db) return;
    const transaction = db.transaction(['fileData', 'amazonData', 'uploadHistory'], 'readwrite');
    
    await Promise.all(['fileData', 'amazonData', 'uploadHistory'].map(storeName => {
        return new Promise((resolve, reject) => {
            const request = transaction.objectStore(storeName).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }));
}

export async function loadHistoryFile(hash) {
    if (!db) throw new Error('Database not initialized');
    const transaction = db.transaction(['amazonData'], 'readonly');
    const store = transaction.objectStore('amazonData');
    const index = store.index('fileHash');
    
    return new Promise((resolve, reject) => {
        const request = index.getAll(hash);
        request.onsuccess = () => {
            const results = request.result || [];
            resolve(results.map(item => ({
                ...item,
                weekDate: new Date(item.weekDate)
            })));
        };
        request.onerror = () => reject(request.error);
    });
}
