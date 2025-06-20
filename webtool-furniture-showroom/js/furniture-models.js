// 家具モデル定義ファイル
// Babylon.jsを使用してプリミティブ形状から3D家具を作成

class FurnitureModels {
    constructor(scene) {
        this.scene = scene;
        this.loadedModels = new Map(); // キャッシュ用
        this.furnitureTypes = [];
        this.furnitureFolder = './3d-furniture/';
        
        // 利用可能な.glbファイルのリスト（デモファイルを削除）
        this.availableModels = [
            // GLBファイルが追加されたらここに登録
            // 3d-furnitureフォルダ内の実際のファイルを追加
            {
                id: 'sofa_glb',
                name: 'Sofa (3D Model)',
                file: 'sofa.glb',
                icon: '🛋️',
                category: 'custom',
                type: 'glb',  // GLBファイルタイプを明示
                dimensions: { width: 200, height: 80, depth: 90 },
                available: true
            }
        ];

        // デフォルト家具タイプ（.glbファイルがない場合のフォールバック）
        this.defaultFurnitureTypes = [
            {
                id: 'sofa',
                name: 'Sofa',
                icon: '🛋️',
                category: 'seating',
                dimensions: { width: 200, height: 80, depth: 90 },
                color: '#8B4513'
            },
            {
                id: 'table',
                name: 'Table',
                icon: '🪑',
                category: 'table',
                dimensions: { width: 120, height: 75, depth: 80 },
                color: '#D2691E'
            },
            {
                id: 'bed',
                name: 'Bed',
                icon: '🛏️',
                category: 'bedroom',
                dimensions: { width: 200, height: 50, depth: 160 },
                color: '#F5DEB3'
            },
            {
                id: 'desk',
                name: 'Desk',
                icon: '💻',
                category: 'office',
                dimensions: { width: 140, height: 75, depth: 70 },
                color: '#CD853F'
            },
            {
                id: 'bookshelf',
                name: 'Bookshelf',
                icon: '📚',
                category: 'storage',
                dimensions: { width: 80, height: 180, depth: 30 },
                color: '#8B4513'
            },
            {
                id: 'chair',
                name: 'Chair',
                icon: '🪑',
                category: 'seating',
                dimensions: { width: 50, height: 90, depth: 50 },
                color: '#A0522D'
            }
        ];

        this.init();
    }

    // 赤色保護ヘルパー: 赤系の色を安全な色に変換
    protectAgainstRedColor(color, fallbackColor = '#6B7280') {
        if (!color) return fallbackColor;
        
        const redVariants = [
            '#ff0000', '#red', 'red', '#dc143c', '#b22222', '#8b0000', 
            '#cd5c5c', '#f08080', '#ff6b6b', '#ff4757', '#e55039'
        ];
        
        const colorLower = color.toString().toLowerCase();
        if (redVariants.includes(colorLower) || colorLower.includes('red')) {
            console.warn(`🚫 Red color "${color}" detected, forcing to safe color "${fallbackColor}" to prevent red box display`);
            return fallbackColor;
        }
        
        return color;
    }

    async init() {
        // 3d-furnitureフォルダ内の.glbファイルを自動的にスキャン
        await this.scanGLBFiles();
        
        // .glbファイルの読み込みを試行
        await this.loadAvailableModels();
        
        // 家具タイプリストを構築
        this.buildFurnitureTypes();
    }

    async scanGLBFiles() {
        console.log('🔍 Checking for existing GLB files (no auto-scan)...');
        
        // Check only predefined GLB files for existence
        for (const model of this.availableModels) {
            try {
                const fullPath = this.furnitureFolder + model.file;
                console.log(`📋 Checking predefined GLB: ${fullPath}`);
                
                // Simple existence check using HTTP HEAD request
                const exists = await this.checkFileExists(fullPath);
                model.available = exists;
                
                if (exists) {
                    console.log(`✅ GLB file found: ${model.name} (${model.file})`);
                } else {
                    console.log(`⚠️ GLB file not found: ${model.name} (${model.file})`);
                }
            } catch (error) {
                console.warn(`❌ Error checking GLB file ${model.file}:`, error);
                model.available = false;
            }
        }
    }

    generateFurnitureNameFromFile(filename) {
        // ファイル名から家具名を生成
        const baseName = filename.replace(/\.glb$/, '');
        const cleanName = baseName.replace(/-\d+$/, '');
        return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).replace(/[-_]/g, ' ');
    }

    generateFurnitureIdFromFile(filename) {
        // ファイル名からIDを生成
        return filename.replace(/\.glb$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    }

    getIconForFurniture(name) {
        // 家具名からアイコンを推測
        const nameLower = name.toLowerCase();
        if (nameLower.includes('chair') || nameLower.includes('seat')) return '🪑';
        if (nameLower.includes('table') || nameLower.includes('desk')) return '💻';
        if (nameLower.includes('sofa') || nameLower.includes('couch')) return '🛌';
        if (nameLower.includes('bed')) return '🛌';
        if (nameLower.includes('shelf') || nameLower.includes('bookcase')) return '📚';
        if (nameLower.includes('lamp') || nameLower.includes('light')) return '💡';
        return '💼'; // デフォルトアイコン
    }

    getCategoryForFurniture(name) {
        // 家具名からカテゴリを推測
        const nameLower = name.toLowerCase();
        if (nameLower.includes('chair') || nameLower.includes('sofa') || nameLower.includes('couch')) return 'seating';
        if (nameLower.includes('table') || nameLower.includes('desk')) return 'table';
        if (nameLower.includes('bed')) return 'bedroom';
        if (nameLower.includes('shelf') || nameLower.includes('bookcase')) return 'storage';
        if (nameLower.includes('lamp') || nameLower.includes('light')) return 'lighting';
        return 'furniture';
    }

    getDefaultDimensions(name) {
        // 家具名からデフォルトサイズを推測
        const nameLower = name.toLowerCase();
        if (nameLower.includes('chair')) return { width: 60, height: 90, depth: 60 };
        if (nameLower.includes('table')) return { width: 120, height: 75, depth: 80 };
        if (nameLower.includes('sofa')) return { width: 200, height: 80, depth: 90 };
        if (nameLower.includes('bed')) return { width: 200, height: 50, depth: 160 };
        if (nameLower.includes('desk')) return { width: 140, height: 75, depth: 70 };
        if (nameLower.includes('shelf')) return { width: 80, height: 180, depth: 30 };
        return { width: 100, height: 100, depth: 100 }; // デフォルトサイズ
    }

    async loadAvailableModels() {
        for (const model of this.availableModels) {
            try {
                const fullPath = this.furnitureFolder + model.file;
                
                // ファイルの存在確認（簡易的）
                const exists = await this.checkFileExists(fullPath);
                if (exists) {
                    model.available = true;
                } else {
                    model.available = false;
                }
            } catch (error) {
                model.available = false;
            }
        }
    }

    async checkFileExists(path) {
        try {
            console.log(`🔍 Checking file existence: ${path}`);
            
            // file://プロトコルの場合とHTTPプロトコルの場合の両方に対応
            const response = await fetch(path, { 
                method: 'HEAD',
                mode: 'no-cors'  // CORSエラーを回避
            });
            
            // no-corsモードの場合、responseのstatusは常に0になるため、
            // エラーが発生しなければファイルが存在すると判断
            console.log(`✅ File check completed for: ${path}`);
            return true;
            
        } catch (error) {
            // ファイルが存在しない場合やアクセスできない場合
            console.log(`❌ File not accessible: ${path}`, error.message);
            
            // file://プロトコルの場合は、より簡単な方法でファイル存在確認を試行
            if (window.location.protocol === 'file:') {
                try {
                    // 実際にファイルを読み込んでみる（サイズ制限付き）
                    const testResponse = await fetch(path);
                    return testResponse.ok || testResponse.type === 'opaque';
                } catch (fileError) {
                    console.log(`❌ File definitely not found: ${path}`);
                    return false;
                }
            }
            
            return false;
        }
    }

    buildFurnitureTypes() {
        this.furnitureTypes = [];
        const addedBaseNames = new Set(); // Track furniture base names to avoid duplicates
        
        // 利用可能な.glbモデルを追加
        for (const model of this.availableModels) {
            if (model.available) {
                this.furnitureTypes.push({
                    id: model.id,
                    name: model.name,
                    icon: model.icon,
                    category: model.category,
                    dimensions: model.dimensions,
                    modelFile: this.furnitureFolder + model.file,
                    type: 'glb'
                });
                
                // Track the base name (e.g., 'sofa' from 'sofa_glb')
                const baseName = model.id.replace(/_glb$/, '');
                addedBaseNames.add(baseName);
                console.log(`📦 Added GLB furniture: ${model.name} (base: ${baseName})`);
            }
        }
        
        // デフォルト家具を追加（GLBバージョンがない場合のみ）
        for (const defaultItem of this.defaultFurnitureTypes) {
            if (!addedBaseNames.has(defaultItem.id)) {
                this.furnitureTypes.push({
                    ...defaultItem,
                    type: 'primitive'
                });
                console.log(`🔷 Added primitive furniture: ${defaultItem.name}`);
            } else {
                console.log(`⏭️ Skipping primitive ${defaultItem.name} - GLB version available`);
            }
        }
        
        console.log(`✅ Built furniture types: ${this.furnitureTypes.length} total`);
    }

    // 全ての家具タイプを取得
    getFurnitureTypes() {
        return this.furnitureTypes;
    }

    // 特定の家具を作成
    async createFurniture(type, position = { x: 0, y: 0, z: 0 }) {
        const furnitureType = this.furnitureTypes.find(f => f.id === type);
        if (!furnitureType) {
            console.error(`家具タイプが見つかりません: ${type}`);
            return null;
        }

        // 家具タイプの色を安全な色に変換（全体保護）
        if (furnitureType.color) {
            furnitureType.color = this.protectAgainstRedColor(furnitureType.color, furnitureType.color);
        }

        try {
            if (furnitureType.type === 'glb') {
                return await this.createGLBFurniture(furnitureType, position);
            } else if (furnitureType.category === 'custom' && furnitureType.meshData) {
                return await this.createCustomGLBFurniture(furnitureType, position);
            } else {
                return this.createPrimitiveFurniture(furnitureType, position);
            }
        } catch (error) {
            console.error(`家具作成エラー: ${type}`, error);
            
            // GLBファイルやカスタム家具の場合は、フォールバックを作成せずにエラーを表示
            if (furnitureType.type === 'glb' || (furnitureType.category === 'custom' && furnitureType.meshData)) {
                // UIにエラーメッセージを表示
                if (window.furnitureApp && window.furnitureApp.uiController) {
                    window.furnitureApp.uiController.updateStatusMessage(`❌ ${furnitureType.name} の読み込みに失敗しました。`);
                }
                console.log(`🚫 GLB/Custom loading failed for ${furnitureType.name} - not creating fallback`);
                return null; // フォールバックを作成しない
            }
            
            // プリミティブ家具の場合のみフォールバックを作成
            return this.createPrimitiveFurniture(furnitureType, position);
        }
    }

    async createGLBFurniture(furnitureType, position) {
        console.log('🔧 Creating GLB furniture:', furnitureType.name);
        
        try {
            const filePath = this.furnitureFolder + furnitureType.file;
            console.log('📁 Loading GLB file:', filePath);
            
            // Babylon.jsでGLBファイルを読み込み
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                this.furnitureFolder,
                furnitureType.file,
                this.scene
            );
            
            // メッシュグループを作成
            const furnitureGroup = new BABYLON.TransformNode(furnitureType.id + "_" + Date.now(), this.scene);
            
            // 読み込んだメッシュをグループに追加
            result.meshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = furnitureGroup;
                }
            });
            
            // 位置設定
            furnitureGroup.position = new BABYLON.Vector3(position.x, position.y, position.z);
            
            // サイズ調整
            this.adjustModelScale(furnitureGroup, furnitureType);
            
            // 影の有効化
            if (this.scene.shadowGenerator) {
                this.enableShadows(furnitureGroup, this.scene.shadowGenerator);
            }
            
            console.log('✅ GLB furniture created successfully:', furnitureType.name);
            return furnitureGroup;
            
        } catch (error) {
            console.error('家具作成エラー:', furnitureType.id, error);
            
            // CORSエラーやファイル読み込みエラーの場合、プリミティブ形状でフォールバック
            if (error.message.includes('CORS') || 
                error.message.includes('Unable to load') || 
                error.message.includes('LoadFileError')) {
                
                console.log('🔄 GLB loading failed, creating primitive fallback for:', furnitureType.name);
                
                // プリミティブ版の設定を作成
                const primitiveType = {
                    id: furnitureType.id.replace('_glb', ''),
                    name: furnitureType.name.replace(' (3D Model)', ''),
                    icon: furnitureType.icon,
                    category: furnitureType.category || this.getCategoryForFurniture(furnitureType.name),
                    dimensions: furnitureType.dimensions,
                    color: this.protectAgainstRedColor('#8B4513') // 安全な茶色
                };
                
                // プリミティブ形状で家具を作成
                return this.createPrimitiveFurniture(primitiveType, position);
            }
            
            console.log('🚫 GLB/Custom loading failed for', furnitureType.name, '- not creating fallback');
            throw error;
        }
    }

    // GLBモデル読み込み
    async loadGLBModel(furnitureType) {
        const cacheKey = furnitureType.glbPath;
        
        // キャッシュから取得
        if (this.loadedModels.has(cacheKey)) {
            const cachedModel = this.loadedModels.get(cacheKey);
            return cachedModel.clone(`${furnitureType.id}_${Date.now()}`);
        }

        // File APIを使用してCORS制限を回避
        if (window.location.protocol === 'file:') {
            console.log('🔧 Using File API for local GLB loading');
            return await this.loadGLBWithFileAPI(furnitureType);
        }

        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMesh(
                "",
                furnitureType.glbPath,
                "",
                this.scene,
                (meshes) => {
                    if (meshes.length === 0) {
                        reject(new Error('モデルが見つかりません'));
                        return;
                    }

                    // メッシュをグループ化
                    const furnitureGroup = new BABYLON.TransformNode(`${furnitureType.id}_group`, this.scene);
                    
                    meshes.forEach(mesh => {
                        if (mesh) {
                            mesh.parent = furnitureGroup;
                        }
                    });

                    // スケール調整
                    this.adjustModelScale(furnitureGroup, furnitureType);

                    // キャッシュに保存
                    this.loadedModels.set(cacheKey, furnitureGroup);


                    resolve(furnitureGroup);
                },
                (progress) => {
                    // プログレス処理
                },
                (error) => {

                    reject(error);
                }
            );
        });
    }

    // File APIを使用したGLB読み込み
    async loadGLBWithFileAPI(furnitureType) {
        // 既存のGLBファイルを直接読み込む場合
        if (furnitureType.file && this.furnitureFolder) {
            try {
                return await this.loadGLBFromExistingFile(furnitureType);
            } catch (error) {
                console.log('🔄 Fallback to file selection dialog');
                // フォールバック：ファイル選択ダイアログを表示
            }
        }

        return new Promise((resolve, reject) => {
            // ファイル選択ダイアログを作成
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.glb';
            fileInput.style.display = 'none';
            
            fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) {
                    reject(new Error('ファイルが選択されませんでした'));
                    return;
                }

                try {
                    console.log(`📁 Loading GLB file: ${file.name}`);
                    
                    // FileをArrayBufferに変換
                    const arrayBuffer = await file.arrayBuffer();
                    const blob = new Blob([arrayBuffer]);
                    const url = URL.createObjectURL(blob);

                    // Babylon.jsでGLBを読み込み
                    BABYLON.SceneLoader.ImportMesh(
                        "",
                        "",
                        url,
                        this.scene,
                        (meshes) => {
                            // URLを解放
                            URL.revokeObjectURL(url);
                            
                            if (meshes.length === 0) {
                                reject(new Error('モデルが見つかりません'));
                                return;
                            }

                            // メッシュをグループ化
                            const furnitureGroup = new BABYLON.TransformNode(`${furnitureType.id}_group`, this.scene);
                            
                            meshes.forEach(mesh => {
                                if (mesh) {
                                    mesh.parent = furnitureGroup;
                                }
                            });

                            // スケール調整
                            this.adjustModelScale(furnitureGroup, furnitureType);

                            // キャッシュに保存
                            this.loadedModels.set(furnitureType.glbPath, furnitureGroup);

                            console.log(`✅ GLB model loaded successfully: ${file.name}`);
                            resolve(furnitureGroup);
                        },
                        (progress) => {
                            console.log(`📊 Loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
                        },
                        (error) => {
                            URL.revokeObjectURL(url);
                            console.error('❌ GLB loading error:', error);
                            reject(error);
                        }
                    );
                } catch (error) {
                    console.error('❌ File processing error:', error);
                    reject(error);
                }
                
                // ファイル入力を削除
                document.body.removeChild(fileInput);
            };

            fileInput.oncancel = () => {
                document.body.removeChild(fileInput);
                reject(new Error('ファイル選択がキャンセルされました'));
            };

            // ファイル選択ダイアログを表示
            document.body.appendChild(fileInput);
            fileInput.click();
        });
    }

    // 既存GLBファイルの直接読み込み
    async loadGLBFromExistingFile(furnitureType) {
        return new Promise(async (resolve, reject) => {
            try {
                const filePath = this.furnitureFolder + furnitureType.file;
                console.log(`🔧 Attempting to load existing GLB: ${filePath}`);

                // fetchでファイルを読み込み（これもCORSで失敗する可能性があるが、試行）
                let response;
                try {
                    response = await fetch(filePath);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (fetchError) {
                    console.log('❌ Direct fetch failed, trying File System Access API');
                    
                    // File System Access APIを試行（Chrome 86+）
                    if ('showOpenFilePicker' in window) {
                        try {
                            const [fileHandle] = await window.showOpenFilePicker({
                                types: [{
                                    description: 'GLB files',
                                    accept: { 'model/gltf-binary': ['.glb'] }
                                }],
                                excludeAcceptAllOption: true,
                                multiple: false
                            });
                            
                            const file = await fileHandle.getFile();
                            const arrayBuffer = await file.arrayBuffer();
                            return this.processGLBArrayBuffer(arrayBuffer, furnitureType);
                        } catch (fsError) {
                            console.log('❌ File System Access API failed:', fsError);
                            throw new Error('All file access methods failed');
                        }
                    } else {
                        throw new Error('File System Access API not supported');
                    }
                }

                // fetchが成功した場合
                const arrayBuffer = await response.arrayBuffer();
                const result = await this.processGLBArrayBuffer(arrayBuffer, furnitureType);
                resolve(result);
                
            } catch (error) {
                console.error('❌ loadGLBFromExistingFile failed:', error);
                reject(error);
            }
        });
    }

    // GLB ArrayBufferを処理
    async processGLBArrayBuffer(arrayBuffer, furnitureType) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([arrayBuffer]);
            const url = URL.createObjectURL(blob);

            BABYLON.SceneLoader.ImportMesh(
                "",
                "",
                url,
                this.scene,
                (meshes) => {
                    URL.revokeObjectURL(url);
                    
                    if (meshes.length === 0) {
                        reject(new Error('モデルが見つかりません'));
                        return;
                    }

                    // メッシュをグループ化
                    const furnitureGroup = new BABYLON.TransformNode(`${furnitureType.id}_group`, this.scene);
                    
                    meshes.forEach(mesh => {
                        if (mesh) {
                            mesh.parent = furnitureGroup;
                        }
                    });

                    // スケール調整
                    this.adjustModelScale(furnitureGroup, furnitureType);

                    // キャッシュに保存
                    this.loadedModels.set(furnitureType.glbPath || furnitureType.file, furnitureGroup);

                    console.log(`✅ GLB processed successfully from ArrayBuffer`);
                    resolve(furnitureGroup);
                },
                (progress) => {
                    console.log(`📊 Processing progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }

    // プリミティブ形状家具作成
    createPrimitiveFurniture(furnitureType, position) {
        const furnitureId = furnitureType.id;
        switch (furnitureId) {
            case 'chair':
                return this.createChair(furnitureType);
            case 'table':
                return this.createTable(furnitureType);
            case 'sofa':
                return this.createSofa(furnitureType);
            case 'bookshelf':
                return this.createBookshelf(furnitureType);
            case 'desk':
                return this.createDesk(furnitureType);
            case 'bed':
                return this.createBed(furnitureType);
            default:
                console.warn(`⚠️ Unknown furniture type: ${furnitureId}, creating generic furniture`);
                return this.createGenericFurniture(furnitureType);
        }
    }

    // モデルのスケール調整
    adjustModelScale(model, furnitureType) {
        // バウンディングボックスを取得
        const boundingInfo = model.getBoundingInfo();
        const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
        
        // 目標サイズ（cm単位）
        const targetSize = furnitureType.dimensions;
        
        // スケール計算
        const scaleX = targetSize.width / (size.x * 100); // メートルからセンチメートルに変換
        const scaleY = targetSize.height / (size.y * 100);
        const scaleZ = targetSize.depth / (size.z * 100);
        
        // 均等スケール（最小値を使用）
        const uniformScale = Math.min(scaleX, scaleY, scaleZ);
        
        model.scaling = new BABYLON.Vector3(uniformScale, uniformScale, uniformScale);
    }

    // 椅子を作成
    createChair(furnitureType) {
        const group = new BABYLON.TransformNode(`chair_${Date.now()}`, this.scene);
        const material = new BABYLON.StandardMaterial(`chairMat_${Date.now()}`, this.scene);
        const color = this.protectAgainstRedColor(furnitureType.color, '#A0522D');
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // 座面
        const seat = BABYLON.MeshBuilder.CreateBox("seat", {
            width: 45,
            height: 5,
            depth: 45
        }, this.scene);
        seat.position.y = 40;
        seat.material = material;
        seat.parent = group;

        // 背面
        const backrest = BABYLON.MeshBuilder.CreateBox("backrest", {
            width: 45,
            height: 50,
            depth: 5
        }, this.scene);
        backrest.position.y = 65;
        backrest.position.z = -20;
        backrest.material = material;
        backrest.parent = group;

        // 脚（4本）
        const legPositions = [
            { x: -18, z: -18 },
            { x: 18, z: -18 },
            { x: -18, z: 18 },
            { x: 18, z: 18 }
        ];

        legPositions.forEach((pos, index) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`leg_${index}`, {
                width: 4,
                height: 40,
                depth: 4
            }, this.scene);
            leg.position.x = pos.x;
            leg.position.y = 20;
            leg.position.z = pos.z;
            leg.material = material;
            leg.parent = group;
        });

        return group;
    }

    // テーブルを作成
    createTable(furnitureType) {
        const group = new BABYLON.TransformNode(`table_${Date.now()}`, this.scene);
        const material = new BABYLON.StandardMaterial(`tableMat_${Date.now()}`, this.scene);
        const color = this.protectAgainstRedColor(furnitureType.color, '#D2691E');
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        // 天板
        const top = BABYLON.MeshBuilder.CreateBox("tableTop", {
            width: 120,
            height: 5,
            depth: 80
        }, this.scene);
        top.position.y = 75;
        top.material = material;
        top.parent = group;

        // 脚（4本）
        const legPositions = [
            { x: -55, z: -35 },
            { x: 55, z: -35 },
            { x: -55, z: 35 },
            { x: 55, z: 35 }
        ];

        legPositions.forEach((pos, index) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`tableLeg_${index}`, {
                width: 5,
                height: 70,
                depth: 5
            }, this.scene);
            leg.position.x = pos.x;
            leg.position.y = 35;
            leg.position.z = pos.z;
            leg.material = material;
            leg.parent = group;
        });

        return group;
    }

    // ソファを作成
    createSofa(furnitureType) {
        const group = new BABYLON.TransformNode(`sofa_${Date.now()}`, this.scene);
        const material = new BABYLON.StandardMaterial(`sofaMat_${Date.now()}`, this.scene);
        const color = this.protectAgainstRedColor(furnitureType.color, '#8B4513');
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // 座面
        const seat = BABYLON.MeshBuilder.CreateBox("sofaSeat", {
            width: 180,
            height: 15,
            depth: 90
        }, this.scene);
        seat.position.y = 40;
        seat.material = material;
        seat.parent = group;

        // 背面
        const backrest = BABYLON.MeshBuilder.CreateBox("sofaBack", {
            width: 180,
            height: 60,
            depth: 15
        }, this.scene);
        backrest.position.y = 70;
        backrest.position.z = -37.5;
        backrest.material = material;
        backrest.parent = group;

        // 肘掛け（左右）
        const armrests = [
            { x: -90, z: 0 },
            { x: 90, z: 0 }
        ];

        armrests.forEach((pos, index) => {
            const armrest = BABYLON.MeshBuilder.CreateBox(`sofaArm_${index}`, {
                width: 15,
                height: 40,
                depth: 90
            }, this.scene);
            armrest.position.x = pos.x;
            armrest.position.y = 60;
            armrest.position.z = pos.z;
            armrest.material = material;
            armrest.parent = group;
        });

        // ベース
        const base = BABYLON.MeshBuilder.CreateBox("sofaBase", {
            width: 180,
            height: 25,
            depth: 90
        }, this.scene);
        base.position.y = 12.5;
        base.material = material;
        base.parent = group;

        return group;
    }

    // 本棚を作成
    createBookshelf(furnitureType) {
        const group = new BABYLON.TransformNode(`bookshelf_${Date.now()}`, this.scene);
        const material = new BABYLON.StandardMaterial(`bookshelfMat_${Date.now()}`, this.scene);
        const color = this.protectAgainstRedColor(furnitureType.color, '#8B4513');
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        // 外枠
        const frame = BABYLON.MeshBuilder.CreateBox("bookshelfFrame", {
            width: 80,
            height: 200,
            depth: 30
        }, this.scene);
        frame.position.y = 100;
        frame.material = material;
        frame.parent = group;

        // 棚板（内部）
        const shelfMaterial = new BABYLON.StandardMaterial(`shelfMat_${Date.now()}`, this.scene);
        shelfMaterial.diffuseColor = BABYLON.Color3.FromHexString('#A0522D');

        for (let i = 0; i < 4; i++) {
            const shelf = BABYLON.MeshBuilder.CreateBox(`shelf_${i}`, {
                width: 75,
                height: 2,
                depth: 25
            }, this.scene);
            shelf.position.y = 30 + (i * 40);
            shelf.material = shelfMaterial;
            shelf.parent = group;
        }

        return group;
    }

    // デスクを作成
    createDesk(furnitureType) {
        const group = new BABYLON.TransformNode(`desk_${Date.now()}`, this.scene);
        const material = new BABYLON.StandardMaterial(`deskMat_${Date.now()}`, this.scene);
        const color = this.protectAgainstRedColor(furnitureType.color, '#CD853F');
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        // デスクトップ
        const desktop = BABYLON.MeshBuilder.CreateBox("desktop", {
            width: 140,
            height: 5,
            depth: 70
        }, this.scene);
        desktop.position.y = 75;
        desktop.material = material;
        desktop.parent = group;

        // 引き出し
        const drawer = BABYLON.MeshBuilder.CreateBox("drawer", {
            width: 60,
            height: 15,
            depth: 60
        }, this.scene);
        drawer.position.y = 60;
        drawer.position.x = -35;
        drawer.material = material;
        drawer.parent = group;

        // 脚（2本）
        const legs = [
            { x: -60, z: 0 },
            { x: 60, z: 0 }
        ];

        legs.forEach((pos, index) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`deskLeg_${index}`, {
                width: 5,
                height: 70,
                depth: 60
            }, this.scene);
            leg.position.x = pos.x;
            leg.position.y = 35;
            leg.position.z = pos.z;
            leg.material = material;
            leg.parent = group;
        });

        return group;
    }

    // ベッドを作成
    createBed(furnitureType) {
        const group = new BABYLON.TransformNode(`bed_${Date.now()}`, this.scene);
        const frameMaterial = new BABYLON.StandardMaterial(`bedFrameMat_${Date.now()}`, this.scene);
        const color = this.protectAgainstRedColor(furnitureType.color, '#F5DEB3');
        frameMaterial.diffuseColor = BABYLON.Color3.FromHexString(color);

        const mattressMaterial = new BABYLON.StandardMaterial(`mattressMat_${Date.now()}`, this.scene);
        mattressMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.95);

        // ベッドフレーム
        const frame = BABYLON.MeshBuilder.CreateBox("bedFrame", {
            width: 200,
            height: 20,
            depth: 100
        }, this.scene);
        frame.position.y = 25;
        frame.material = frameMaterial;
        frame.parent = group;

        // マットレス
        const mattress = BABYLON.MeshBuilder.CreateBox("mattress", {
            width: 190,
            height: 25,
            depth: 90
        }, this.scene);
        mattress.position.y = 47.5;
        mattress.material = mattressMaterial;
        mattress.parent = group;

        // ヘッドボード
        const headboard = BABYLON.MeshBuilder.CreateBox("headboard", {
            width: 200,
            height: 80,
            depth: 10
        }, this.scene);
        headboard.position.y = 75;
        headboard.position.z = -45;
        headboard.material = frameMaterial;
        headboard.parent = group;

        return group;
    }

    // 汎用家具作成（赤いボックスの代替）
    createGenericFurniture(furnitureType) {
        const group = new BABYLON.TransformNode(`generic_${Date.now()}`, this.scene);
        
        // より視覚的に魅力的な材質を作成
        const material = new BABYLON.StandardMaterial(`genericMat_${Date.now()}`, this.scene);
        
        // 赤色保護: 赤系の色が指定された場合はグレーに強制変更
        const color = this.protectAgainstRedColor(furnitureType.color, '#6B7280');
        
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // 複数のボックスで家具らしい形を作成
        const mainBody = BABYLON.MeshBuilder.CreateBox("genericMain", {
            width: furnitureType.dimensions.width * 0.8,
            height: furnitureType.dimensions.height * 0.8,
            depth: furnitureType.dimensions.depth * 0.8
        }, this.scene);
        
        mainBody.position.y = furnitureType.dimensions.height * 0.4;
        mainBody.material = material;
        mainBody.parent = group;
        
        // 装飾的な要素を追加
        const accent = BABYLON.MeshBuilder.CreateBox("genericAccent", {
            width: furnitureType.dimensions.width * 0.9,
            height: furnitureType.dimensions.height * 0.1,
            depth: furnitureType.dimensions.depth * 0.9
        }, this.scene);
        
        accent.position.y = furnitureType.dimensions.height * 0.8;
        
        // アクセント用の材質
        const accentMaterial = material.clone();
        accentMaterial.diffuseColor = BABYLON.Color3.FromHexString('#9CA3AF');
        accent.material = accentMaterial;
        accent.parent = group;

        return group;
    }

    // 家具にシャドウ設定を追加
    enableShadows(furnitureGroup, shadowGenerator) {
        if (furnitureGroup && shadowGenerator) {
            furnitureGroup.getChildMeshes().forEach(mesh => {
                if (mesh instanceof BABYLON.Mesh) {
                    mesh.receiveShadows = true;
                    shadowGenerator.addShadowCaster(mesh);
                }
            });
        }
    }

    // 家具の材質を更新
    updateMaterial(furnitureGroup, color) {
        const safeColor = this.protectAgainstRedColor(color, '#6B7280');
        furnitureGroup.getChildMeshes().forEach(mesh => {
            if (mesh instanceof BABYLON.Mesh && mesh.material) {
                mesh.material.diffuseColor = BABYLON.Color3.FromHexString(safeColor);
            }
        });
    }

    // カスタム家具タイプを追加
    addCustomFurnitureType(customFurnitureType) {
        console.log('📦 Adding custom furniture type:', customFurnitureType.name);
        
        // 既存のリストに追加
        this.furnitureTypes.push(customFurnitureType);
        
        // カスタム家具のための特別な処理
        if (customFurnitureType.meshData) {
            // メッシュデータをキャッシュ
            this.loadedModels.set(customFurnitureType.id, customFurnitureType.meshData[0]);
            
            // メッシュを非表示にする（テンプレートとして保持）
            customFurnitureType.meshData.forEach(mesh => {
                mesh.setEnabled(false);
            });
        }
        
        console.log('✅ Custom furniture type added, total types:', this.furnitureTypes.length);
    }

    // 全家具タイプを取得
    getAllFurnitureTypes() {
        return this.furnitureTypes;
    }

    // カスタムGLB家具を作成
    async createCustomGLBFurniture(furnitureType, position) {
        console.log('🔧 Creating custom GLB furniture:', furnitureType.name);
        
        if (!furnitureType.meshData || furnitureType.meshData.length === 0) {
            console.error('❌ No mesh data found for custom furniture');
            return null;
        }

        // 元のメッシュをクローン
        const rootMesh = furnitureType.meshData[0];
        const clonedMesh = rootMesh.clone(`${furnitureType.id}_${Date.now()}`);
        
        // 子メッシュもクローン
        furnitureType.meshData.slice(1).forEach(childMesh => {
            const clonedChild = childMesh.clone(`${childMesh.name}_${Date.now()}`);
            clonedChild.parent = clonedMesh;
        });
        
        // メッシュを有効化
        clonedMesh.setEnabled(true);
        clonedMesh.getChildMeshes().forEach(child => child.setEnabled(true));
        
        // 位置を設定
        clonedMesh.position = new BABYLON.Vector3(position.x, position.y, position.z);
        
        // 正確なスケーリング（3D空間の絶対的な大きさと一致）
        if (furnitureType.dimensions) {
            // バウンディングボックスを計算
            const boundingInfo = clonedMesh.getBoundingInfo();
            const currentSize = boundingInfo.maximum.subtract(boundingInfo.minimum);
            const targetDimensions = furnitureType.dimensions;
            
            // 各軸のスケール計算（1 Babylon unit = 1 cm）
            const scaleX = targetDimensions.width / Math.abs(currentSize.x);
            const scaleY = targetDimensions.height / Math.abs(currentSize.y);
            const scaleZ = targetDimensions.depth / Math.abs(currentSize.z);
            
            // 均等スケーリング（最小値を使用）
            const uniformScale = Math.min(scaleX, scaleY, scaleZ);
            
            console.log(`📐 Applying custom GLB scale: ${uniformScale.toFixed(3)} (target: ${targetDimensions.width}x${targetDimensions.height}x${targetDimensions.depth}cm)`);
            
            clonedMesh.scaling = new BABYLON.Vector3(uniformScale, uniformScale, uniformScale);
            
            // 子メッシュにも同じスケールを適用
            clonedMesh.getChildMeshes().forEach(child => {
                child.scaling = new BABYLON.Vector3(uniformScale, uniformScale, uniformScale);
            });
        } else if (furnitureType.scale) {
            // 旧式のスケール設定（フォールバック）
            clonedMesh.scaling = new BABYLON.Vector3(
                furnitureType.scale, 
                furnitureType.scale, 
                furnitureType.scale
            );
        }
        
        // 影の設定
        clonedMesh.receiveShadows = true;
        clonedMesh.getChildMeshes().forEach(child => {
            child.receiveShadows = true;
            if (window.furnitureApp && window.furnitureApp.shadowGenerator) {
                window.furnitureApp.shadowGenerator.addShadowCaster(child);
            }
        });
        
        if (window.furnitureApp && window.furnitureApp.shadowGenerator) {
            window.furnitureApp.shadowGenerator.addShadowCaster(clonedMesh);
        }
        
        console.log('✅ Custom GLB furniture created:', clonedMesh.name);
        return clonedMesh;
    }
}