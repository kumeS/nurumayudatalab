// 衝突検出管理クラス
class CollisionDetector {
    constructor(sceneManager, furnitureModels) {
        this.sceneManager = sceneManager;
        this.furnitureModels = furnitureModels;
        this.collisionTolerance = 5; // 5cm の許容範囲
        
        // デフォルトの家具寸法（メタデータが欠落している場合のフォールバック）
        this.DEFAULT_FURNITURE_DIMENSIONS = { width: 50, height: 50, depth: 50 };
    }

    // 衝突チェック（メイン関数）
    checkCollisions(furniture, position, excludeFurniture = null, placedFurniture = []) {
        const bounds = this.getFurnitureBounds(furniture, position);
        const collision = {
            hasCollision: false,
            type: null,
            details: null,
            severity: 'none' // 'low', 'medium', 'high'
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

    // 家具の境界ボックスを取得
    getFurnitureBounds(furniture, position) {
        const dimensions = furniture.metadata?.dimensions || this.DEFAULT_FURNITURE_DIMENSIONS;
        const halfWidth = dimensions.width / 2;
        const halfDepth = dimensions.depth / 2;

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
        }

        return collision;
    }

    // 他の家具との衝突チェック
    checkFurnitureCollision(bounds, excludeFurniture, placedFurniture) {
        for (const furniture of placedFurniture) {
            if (furniture === excludeFurniture) continue;

            const furnitureType = this.furnitureModels.getFurnitureTypes().find(f => f.id === furniture.metadata?.type);
            if (!furnitureType) continue;

            const dimensions = furnitureType.dimensions;
            const halfWidth = dimensions.width / 2 + this.collisionTolerance;
            const halfDepth = dimensions.depth / 2 + this.collisionTolerance;

            const otherBounds = {
                minX: furniture.position.x - halfWidth,
                maxX: furniture.position.x + halfWidth,
                minZ: furniture.position.z - halfDepth,
                maxZ: furniture.position.z + halfDepth
            };

            // AABB (Axis-Aligned Bounding Box) 衝突検出
            if (bounds.minX < otherBounds.maxX &&
                bounds.maxX > otherBounds.minX &&
                bounds.minZ < otherBounds.maxZ &&
                bounds.maxZ > otherBounds.minZ) {
                
                return {
                    hasCollision: true,
                    type: 'furniture',
                    furniture: furniture,
                    message: `${furniture.metadata.name}と重なっています`,
                    overlap: this.calculateOverlap(bounds, otherBounds)
                };
            }
        }

        return { hasCollision: false };
    }

    // 重複量計算
    calculateOverlap(bounds1, bounds2) {
        const overlapX = Math.min(bounds1.maxX, bounds2.maxX) - Math.max(bounds1.minX, bounds2.minX);
        const overlapZ = Math.min(bounds1.maxZ, bounds2.maxZ) - Math.max(bounds1.minZ, bounds2.minZ);
        return Math.min(overlapX, overlapZ);
    }

    // 有効な配置位置を提案
    suggestValidPosition(furniture, originalPosition, placedFurniture = []) {
        const furnitureType = this.furnitureModels.getFurnitureTypes().find(f => f.id === furniture.metadata?.type);
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