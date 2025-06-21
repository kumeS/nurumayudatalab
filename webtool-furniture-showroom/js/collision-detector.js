// 衝突検出管理クラス
class CollisionDetector {
    constructor(sceneManager, furnitureModels) {
        this.sceneManager = sceneManager;
        this.furnitureModels = furnitureModels;
        this.collisionTolerance = 0; // 0cm - 物理的重複を完全に防止
        this.strictMode = true; // 厳格モードを有効化
        this.enablePhysicalPlacement = true; // 物理的に正確な配置のみ許可
        this.debugMode = false; // デバッグモードの初期状態
        
        // 🆕 衝突検出のON/OFF切り替え機能
        this.collisionDetectionEnabled = true; // デフォルトでは有効
        this.placementMode = 'realistic'; // 'realistic' or 'creative'
        
        // デフォルトの家具寸法（メタデータが欠落している場合のフォールバック）
        this.DEFAULT_FURNITURE_DIMENSIONS = { width: 50, height: 50, depth: 50 };
        
        // 衝突統計の初期化
        this.collisionStats = {
            totalCollisions: 0,
            furnitureCollisions: 0,
            wallCollisions: 0,
            preventedPlacements: 0,
            startTime: new Date().toISOString()
        };
        
        console.log('🛡️ 物理的衝突防止システム初期化完了:', {
            tolerance: this.collisionTolerance,
            strictMode: this.strictMode,
            physicalPlacement: this.enablePhysicalPlacement,
            debugMode: this.debugMode
        });
    }

    // 衝突チェック（メイン関数） - トグル対応
    checkCollisions(furniture, position, excludeFurniture = null, placedFurniture = []) {
        // 🆕 衝突検出が無効の場合は常に衝突なしを返す
        if (!this.collisionDetectionEnabled || this.placementMode === 'creative') {
            if (this.debugMode) {
                console.log('🎨 Creative Mode: 衝突検出をスキップ - 自由配置許可');
            }
            return {
                hasCollision: false,
                type: null,
                details: null,
                severity: 'none',
                mode: this.placementMode,
                detectionEnabled: this.collisionDetectionEnabled
            };
        }
        
        const bounds = this.getFurnitureBounds(furniture, position);
        const collision = {
            hasCollision: false,
            type: null,
            details: null,
            severity: 'none', // 'low', 'medium', 'high'
            mode: this.placementMode,
            detectionEnabled: this.collisionDetectionEnabled
        };

        // 壁との衝突チェック
        const wallCollision = this.checkWallCollision(bounds);
        if (wallCollision.hasCollision) {
            collision.hasCollision = true;
            collision.type = 'wall';
            collision.details = wallCollision;
            collision.severity = 'high';
            return collision;
        }

        // 他の家具との衝突チェック
        const furnitureCollision = this.checkFurnitureCollision(bounds, excludeFurniture, placedFurniture);
        if (furnitureCollision.hasCollision) {
            collision.hasCollision = true;
            collision.type = 'furniture';
            collision.details = furnitureCollision;
            collision.severity = furnitureCollision.overlap > 20 ? 'high' : 'medium';
            return collision;
        }

        return collision;
    }

    // 家具の境界ボックスを取得 - 複数のデータ構造に対応（強化デバッグ版）
    getFurnitureBounds(furniture, position) {
        let dimensions;
        let dimensionSource = 'unknown';
        
        // 複数の可能なデータ構造をチェック
        if (furniture.metadata?.dimensions) {
            // 新しい形式: metadata.dimensions
            dimensions = furniture.metadata.dimensions;
            dimensionSource = 'metadata.dimensions';
        } else if (furniture.dimensions) {
            // 直接形式: dimensions
            dimensions = furniture.dimensions;
            dimensionSource = 'direct.dimensions';
        } else if (furniture.furnitureType?.dimensions) {
            // 家具タイプ形式: furnitureType.dimensions
            dimensions = furniture.furnitureType.dimensions;
            dimensionSource = 'furnitureType.dimensions';
        } else {
            // フォールバック: デフォルト寸法
            console.warn('⚠️ 家具寸法が見つかりません。デフォルト寸法を使用:', {
                furniture: furniture,
                availableProperties: Object.keys(furniture),
                defaultDimensions: this.DEFAULT_FURNITURE_DIMENSIONS
            });
            dimensions = this.DEFAULT_FURNITURE_DIMENSIONS;
            dimensionSource = 'default_fallback';
        }
        
        // 詳細デバッグログ（デバッグモード時のみ）
        if (this.debugMode || window.furnitureApp?.debugMode) {
            console.log('🔍 家具境界計算:', {
                dimensionSource: dimensionSource,
                dimensions: dimensions,
                position: position,
                furnitureInfo: {
                    id: furniture.furnitureId || furniture.id,
                    type: furniture.furnitureType?.id || furniture.type,
                    name: furniture.name || furniture.furnitureType?.name
                }
            });
        }
        
        const halfWidth = dimensions.width / 2;
        const halfDepth = dimensions.depth / 2;

        // デバッグログ：実際に使用される寸法を記録
        console.log('🔍 Collision detection using dimensions:', {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth,
            position: {x: position.x, y: position.y, z: position.z}
        });

        return {
            minX: position.x - halfWidth,
            maxX: position.x + halfWidth,
            minZ: position.z - halfDepth,
            maxZ: position.z + halfDepth,
            height: dimensions.height,
            center: { x: position.x, z: position.z }
        };
    }

    // 壁との衝突チェック
    checkWallCollision(bounds) {
        const { sceneWidth, sceneHeight, sceneDepth } = this.sceneManager;
        const roomBounds = {
            minX: -sceneWidth / 2,
            maxX: sceneWidth / 2,
            minZ: -sceneDepth / 2,
            maxZ: sceneDepth / 2,
            minY: 0,
            maxY: sceneHeight
        };

        const collision = {
            hasCollision: false,
            walls: [],
            message: ''
        };

        // 各壁との衝突をチェック
        if (bounds.minX < roomBounds.minX) {
            collision.hasCollision = true;
            collision.walls.push('left');
        }
        if (bounds.maxX > roomBounds.maxX) {
            collision.hasCollision = true;
            collision.walls.push('right');
        }
        if (bounds.minZ < roomBounds.minZ) {
            collision.hasCollision = true;
            collision.walls.push('back');
        }
        if (bounds.maxZ > roomBounds.maxZ) {
            collision.hasCollision = true;
            collision.walls.push('front');
        }

        if (collision.hasCollision) {
            collision.message = `家具が${collision.walls.join('・')}の壁を超えています`;
            
            // 壁衝突統計を記録
            this.collisionStats.wallCollisions++;
            this.collisionStats.totalCollisions++;
            
            if (this.debugMode) {
                console.log('🚧 壁衝突検出:', {
                    walls: collision.walls,
                    message: collision.message,
                    bounds: bounds,
                    roomBounds: roomBounds
                });
            }
        }

        return collision;
    }

    // 他の家具との衝突チェック - 厳格化
    checkFurnitureCollision(bounds, excludeFurniture, placedFurniture) {
        for (const furniture of placedFurniture) {
            if (furniture === excludeFurniture) continue;

            // 家具データの構造を修正 - metadata.type ではなく furnitureType または type を使用
            let furnitureType;
            if (furniture.furnitureType) {
                // 実際の家具メッシュの場合
                furnitureType = furniture.furnitureType;
            } else if (furniture.metadata?.type) {
                // 古い形式の場合
                furnitureType = this.furnitureModels.getFurnitureTypes().find(f => f.id === furniture.metadata.type);
            } else if (furniture.type) {
                // placedFurniture 配列の場合
                furnitureType = this.furnitureModels.getFurnitureTypes().find(f => f.id === furniture.type);
            } else {
                console.warn('⚠️ 家具タイプが見つかりません:', furniture);
                continue;
            }
            
            if (!furnitureType) {
                console.warn('⚠️ 家具タイプ定義が見つかりません:', furniture);
                continue;
            }

            const dimensions = furnitureType.dimensions;
            // 厳格モードでは許容範囲を最小限に
            const tolerance = this.strictMode ? this.collisionTolerance : 5;
            const halfWidth = dimensions.width / 2 + tolerance;
            const halfDepth = dimensions.depth / 2 + tolerance;

            // 家具位置の取得を修正 - mesh.position または直接 position を使用
            const furniturePosition = furniture.mesh?.position || furniture.position;
            if (!furniturePosition) {
                console.warn('⚠️ 家具位置が見つかりません:', furniture);
                continue;
            }

            const otherBounds = {
                minX: furniturePosition.x - halfWidth,
                maxX: furniturePosition.x + halfWidth,
                minZ: furniturePosition.z - halfDepth,
                maxZ: furniturePosition.z + halfDepth
            };

            // 厳格なAABB (Axis-Aligned Bounding Box) 衝突検出 - 物理的精度を最優先
            if (bounds.minX < otherBounds.maxX &&
                bounds.maxX > otherBounds.minX &&
                bounds.minZ < otherBounds.maxZ &&
                bounds.maxZ > otherBounds.minZ) {
                
                const overlap = this.calculateOverlap(bounds, otherBounds);
                
                // 物理的に正確な配置モードでは、いかなる重複も許可しない
                const shouldPreventPlacement = this.enablePhysicalPlacement || this.strictMode;
                
                // 家具名の取得を修正
                const furnitureName = furniture.name || furniture.furnitureType?.name || furnitureType.name || '家具';
                
                // 詳細なデバッグ情報を含む衝突レポート
                console.log('🚫 家具衝突検出:', {
                    newFurniture: {
                        bounds: bounds,
                        dimensions: dimensions
                    },
                    existingFurniture: {
                        name: furnitureName,
                        bounds: otherBounds,
                        dimensions: { width: dimensions.width, depth: dimensions.depth }
                    },
                    overlap: Math.round(overlap) + 'cm',
                    preventPlacement: shouldPreventPlacement
                });

                // 詳細な衝突レポートを作成
                const collisionReport = {
                    hasCollision: true,
                    type: 'furniture',
                    furniture: furniture,
                    message: `${furnitureName}と重なっています（${Math.round(overlap)}cm重複）`,
                    overlap: overlap,
                    preventPlacement: shouldPreventPlacement,
                    severity: overlap > 20 ? 'high' : (overlap > 10 ? 'medium' : 'low'),
                    details: {
                        collidingFurniture: {
                            name: furnitureName,
                            id: furniture.furnitureId || furniture.id,
                            type: furniture.furnitureType?.id || furniture.type
                        },
                        overlapAmount: Math.round(overlap),
                        bounds: {
                            current: bounds,
                            other: otherBounds
                        },
                        physicalAccuracy: {
                            strictMode: this.strictMode,
                            tolerance: this.collisionTolerance,
                            physicalPlacement: this.enablePhysicalPlacement
                        }
                    }
                };
                
                // 衝突統計を記録
                this.collisionStats = this.collisionStats || { totalCollisions: 0, furnitureCollisions: 0 };
                this.collisionStats.totalCollisions++;
                this.collisionStats.furnitureCollisions++;
                
                console.error('🚫 家具衝突検出:', {
                    collision: collisionReport,
                    stats: this.collisionStats,
                    timestamp: new Date().toISOString()
                });
                
                return collisionReport;
            }
        }

        return { hasCollision: false };
    }

    // 重複量計算
    calculateOverlap(bounds1, bounds2) {
        const overlapX = Math.min(bounds1.maxX, bounds2.maxX) - Math.max(bounds1.minX, bounds2.minX);
        const overlapZ = Math.min(bounds1.maxZ, bounds2.maxZ) - Math.max(bounds1.minZ, bounds2.minZ);
        const actualOverlap = Math.min(overlapX, overlapZ);
        
        // 🔧 最小許容範囲（1cm）未満の場合は衝突なしとして扱う
        const minTolerance = 1; // 1cm
        return actualOverlap > minTolerance ? actualOverlap : 0;
    }

    // 有効な配置位置を提案
    suggestValidPosition(furniture, originalPosition, placedFurniture = []) {
        const furnitureType = this.furnitureModels.getFurnitureTypes().find(f => f.id === furniture.metadata?.type || f.id === furniture.furnitureType?.id);
        if (!furnitureType) return originalPosition;

        const dimensions = furnitureType.dimensions;
        const stepSize = 20; // 20cm刻みで移動

        // 元の位置から螺旋状に検索
        for (let radius = stepSize; radius <= 200; radius += stepSize) {
            for (let angle = 0; angle < 360; angle += 30) {
                const rad = (angle * Math.PI) / 180;
                const testPosition = {
                    x: originalPosition.x + Math.cos(rad) * radius,
                    y: originalPosition.y,
                    z: originalPosition.z + Math.sin(rad) * radius
                };

                const collision = this.checkCollisions(furniture, testPosition, null, placedFurniture);
                if (!collision.hasCollision) {
                    return testPosition;
                }
            }
        }

        return originalPosition; // 有効な位置が見つからない場合は元の位置を返す
    }

    // 衝突警告表示
    showCollisionWarning(collision) {
        // 既存の警告を削除
        const existingWarning = document.getElementById('collisionWarning');
        if (existingWarning) {
            existingWarning.remove();
        }

        const warning = document.createElement('div');
        warning.id = 'collisionWarning';
        warning.className = `collision-warning ${collision.severity}`;
        
        let message = '';
        let icon = '';
        
        switch (collision.type) {
            case 'wall':
                icon = '🚧';
                message = `壁との衝突が検出されました。家具が部屋の境界を超えています。`;
                break;
            case 'furniture':
                icon = '⚠️';
                const overlap = Math.round(collision.details.overlap);
                message = `他の家具との重複が検出されました（${overlap}cm重複）。`;
                break;
            default:
                icon = '❗';
                message = '配置に問題があります。';
        }

        warning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">${icon}</span>
                <div class="warning-text">
                    <div class="warning-title">配置警告</div>
                    <div class="warning-message">${message}</div>
                </div>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(warning);

        // 5秒後に自動削除
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 5000);

        // フェードインアニメーション
        setTimeout(() => {
            warning.classList.add('show');
        }, 10);
    }

    // 配置可能領域を計算
    getValidPlacementArea(furniture) {
        const dimensions = furniture.metadata?.dimensions || this.DEFAULT_FURNITURE_DIMENSIONS;
        const { sceneWidth, sceneHeight, sceneDepth } = this.sceneManager;
        
        return {
            minX: -sceneWidth / 2 + dimensions.width / 2,
            maxX: sceneWidth / 2 - dimensions.width / 2,
            minZ: -sceneDepth / 2 + dimensions.depth / 2,
            maxZ: sceneDepth / 2 - dimensions.depth / 2
        };
    }

    // 位置が有効かチェック
    isPositionValid(furniture, position, placedFurniture = [], excludeFurniture = null) {
        const collision = this.checkCollisions(furniture, position, excludeFurniture, placedFurniture);
        return !collision.hasCollision;
    }

    // 衝突許容範囲設定
    setCollisionTolerance(tolerance) {
        this.collisionTolerance = tolerance;
    }

    // 衝突許容範囲取得
    getCollisionTolerance() {
        return this.collisionTolerance;
    }
    
    // 🆕 衝突検出ON/OFF切り替え
    setCollisionDetectionEnabled(enabled) {
        this.collisionDetectionEnabled = enabled;
        console.log(`🔄 衝突検出: ${enabled ? '有効' : '無効'}`);
        return this;
    }
    
    // 🆕 配置モード切り替え
    setPlacementMode(mode) {
        if (!['realistic', 'creative'].includes(mode)) {
            console.warn('⚠️ 無効な配置モード:', mode, '- realistic または creative を指定してください');
            return this;
        }
        
        const previousMode = this.placementMode;
        this.placementMode = mode;
        
        // モードに応じて衝突検出を自動調整
        if (mode === 'creative') {
            this.collisionDetectionEnabled = false;
        } else if (mode === 'realistic') {
            this.collisionDetectionEnabled = true;
        }
        
        console.log(`🎯 配置モード変更: ${previousMode} → ${mode}`, {
            collisionDetection: this.collisionDetectionEnabled,
            strictMode: this.strictMode,
            tolerance: this.collisionTolerance
        });
        
        // ユーザーフィードバック
        if (window.furnitureApp && window.furnitureApp.uiController) {
            let feedbackMessage = '';
            if (mode === 'creative') {
                feedbackMessage = '🎨 クリエイティブモード: 任意の場所に自由配置可能 (衝突検出OFF)';
            } else {
                feedbackMessage = '🔒 リアリスティックモード: 物理的制約あり (衝突検出ON)';
            }
            window.furnitureApp.uiController.showSuccessMessage(feedbackMessage, 4000);
        }
        
        return this;
    }
    
    // 🆕 現在の設定状態を取得
    getSettings() {
        return {
            collisionDetectionEnabled: this.collisionDetectionEnabled,
            placementMode: this.placementMode,
            strictMode: this.strictMode,
            collisionTolerance: this.collisionTolerance,
            enablePhysicalPlacement: this.enablePhysicalPlacement,
            debugMode: this.debugMode
        };
    }

    // 衝突統計の表示
    getCollisionStats() {
        const now = new Date();
        const startTime = new Date(this.collisionStats.startTime);
        const sessionDuration = Math.round((now - startTime) / 1000); // 秒単位
        
        return {
            ...this.collisionStats,
            sessionDuration: sessionDuration,
            sessionDurationFormatted: `${Math.floor(sessionDuration / 60)}分${sessionDuration % 60}秒`,
            collisionsPerMinute: sessionDuration > 0 ? Math.round((this.collisionStats.totalCollisions / sessionDuration) * 60) : 0
        };
    }
    
    // 衝突統計をコンソールに表示
    logCollisionStats() {
        const stats = this.getCollisionStats();
        console.table(stats);
        console.log('🛡️ 物理的衝突防止システム統計:', stats);
    }
    
    // デバッグモードの切り替え
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🔧 衝突検出デバッグモード: ${enabled ? '有効' : '無効'}`);
        if (enabled) {
            this.logCollisionStats();
        }
    }
    
    // 衝突統計をリセット
    resetCollisionStats() {
        this.collisionStats = {
            totalCollisions: 0,
            furnitureCollisions: 0,
            wallCollisions: 0,
            preventedPlacements: 0,
            startTime: new Date().toISOString()
        };
        console.log('📊 衝突統計をリセットしました');
    }

    // デバッグ用境界ボックス表示 (無効化 - 赤いボックス表示を防止)
    debugShowBounds(bounds, color = 'red') {
        // デバッグ表示を無効化 - 3Dシーンに赤いボックスが表示されることを防止
        console.log('🚫 Debug bounds visualization disabled to prevent red box display');
        return null;
        
        /* DISABLED DEBUG VISUALIZATION - prevents red box display
        const width = bounds.maxX - bounds.minX;
        const depth = bounds.maxZ - bounds.minZ;
        const height = bounds.height || 10;
        
        const debugBox = BABYLON.MeshBuilder.CreateBox('debugBounds', {
            width: width,
            height: height,
            depth: depth
        }, this.sceneManager.scene);
        
        debugBox.position.x = (bounds.minX + bounds.maxX) / 2;
        debugBox.position.y = height / 2;
        debugBox.position.z = (bounds.minZ + bounds.maxZ) / 2;
        
        const material = new BABYLON.StandardMaterial('debugMaterial', this.sceneManager.scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.alpha = 0.3;
        debugBox.material = material;
        
        // 3秒後に削除
        setTimeout(() => {
            debugBox.dispose();
        }, 3000);
        
        return debugBox;
        */
    }
}

// ESモジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionDetector;
} else {
    window.CollisionDetector = CollisionDetector;
}

// グローバルデバッグ関数を追加（ブラウザコンソールからアクセス可能）
if (typeof window !== 'undefined') {
    window.collisionDebug = {
        enableDebug: () => {
            if (window.furnitureApp?.collisionDetector) {
                window.furnitureApp.collisionDetector.setDebugMode(true);
                console.log('🔧 衝突デバッグモードを有効にしました');
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        disableDebug: () => {
            if (window.furnitureApp?.collisionDetector) {
                window.furnitureApp.collisionDetector.setDebugMode(false);
                console.log('🔧 衝突デバッグモードを無効にしました');
            }
        },
        showStats: () => {
            if (window.furnitureApp?.collisionDetector) {
                window.furnitureApp.collisionDetector.logCollisionStats();
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        resetStats: () => {
            if (window.furnitureApp?.collisionDetector) {
                window.furnitureApp.collisionDetector.resetCollisionStats();
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        // 🆕 配置モード制御
        setCreativeMode: () => {
            if (window.furnitureApp?.collisionDetector) {
                window.furnitureApp.collisionDetector.setPlacementMode('creative');
                console.log('🎨 クリエイティブモード: 任意の場所に自由配置可能');
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        setRealisticMode: () => {
            if (window.furnitureApp?.collisionDetector) {
                window.furnitureApp.collisionDetector.setPlacementMode('realistic');
                console.log('🔒 リアリスティックモード: 物理的制約あり');
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        toggleCollision: () => {
            if (window.furnitureApp?.collisionDetector) {
                const detector = window.furnitureApp.collisionDetector;
                const newState = !detector.collisionDetectionEnabled;
                detector.setCollisionDetectionEnabled(newState);
                console.log(`🔄 衝突検出: ${newState ? '有効' : '無効'}`);
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        showSettings: () => {
            if (window.furnitureApp?.collisionDetector) {
                const settings = window.furnitureApp.collisionDetector.getSettings();
                console.table(settings);
                console.log('⚙️ 現在の設定:', settings);
            } else {
                console.warn('⚠️ CollisionDetector が見つかりません');
            }
        },
        help: () => {
            console.log(`
🛡️ 衝突検出・配置制御コマンド:

🎯 配置モード:
• collisionDebug.setCreativeMode()  - 🎨 自由配置モード (衝突検出OFF)
• collisionDebug.setRealisticMode() - 🔒 物理制約モード (衝突検出ON)

🔄 衝突検出制御:
• collisionDebug.toggleCollision()  - 衝突検出ON/OFF切り替え
• collisionDebug.showSettings()     - 現在の設定表示

📊 統計・デバッグ:
• collisionDebug.enableDebug()      - デバッグモード有効
• collisionDebug.disableDebug()     - デバッグモード無効  
• collisionDebug.showStats()        - 衝突統計表示
• collisionDebug.resetStats()       - 統計リセット

💡 使用例:
  collisionDebug.setCreativeMode()   → 任意の場所に配置可能
  collisionDebug.setRealisticMode()  → 物理的制約を復活
            `);
        }
    };
    
    console.log('🔧 衝突デバッグ関数をグローバルに登録しました。コンソールで collisionDebug.help() を実行してください。');
} 