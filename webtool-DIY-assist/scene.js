/**
 * scene.js - 3Dシーンと視覚化管理
 * 
 * 主な責務：
 * - Three.jsシーンの初期化と管理
 * - 3Dモデルの読み込みと表示
 * - カメラ、ライティング、レンダリング
 * - マテリアルとビジュアルエフェクト
 */

class SceneManager {
    constructor(assistant) {
      this.assistant = assistant;
      
      // Three.js要素
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.currentModel = null;
      
      // 状態
      this.isInitialized = false;
    }
  
    // ========== 3Dシーン初期化 ==========
    setup3DScene() {
      this.assistant.log('debug', '3Dシーン初期化開始');
      
      try {
        // ライブラリ読み込み完了まで少し待つ
        const initializeScene = () => {
          try {
            const container = document.getElementById('threeContainer');
            if (!container) {
              this.assistant.log('error', '3Dプレビューコンテナが見つかりません');
              this.showFallbackMessage();
              return false;
            }

            // Three.js利用可能性チェック
            if (typeof THREE === 'undefined') {
              this.assistant.log('error', 'Three.jsライブラリが読み込まれていません');
              this.showFallbackMessage();
              return false;
            }

            this.assistant.log('info', 'Three.jsライブラリチェック開始');
            this.assistant.log('debug', 'Three.js version:', THREE.REVISION);
            this.assistant.log('debug', 'OBJLoader available:', typeof THREE.OBJLoader !== 'undefined');
            this.assistant.log('debug', 'OrbitControls available:', typeof THREE.OrbitControls !== 'undefined');
        
            // シーン作成
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xf5f5f5);
        
            // カメラ作成
            this.camera = new THREE.PerspectiveCamera(
              75,
              container.clientWidth / container.clientHeight,
              0.1,
              1000
            );
            this.camera.position.set(5, 5, 5);
        
            // レンダラー作成
            this.renderer = new THREE.WebGLRenderer({ 
              antialias: true 
            });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(this.renderer.domElement);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
            // ライティング
            this.setupLighting();
        
            // コントロール（利用可能な場合のみ）
            if (typeof THREE.OrbitControls !== 'undefined') {
              this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
              this.controls.enableDamping = true;
              this.controls.dampingFactor = 0.05;
            }
        
            // 床面
            this.addFloor();
        
            // アニメーションループ
            this.animate();
            
            this.isInitialized = true;
            this.assistant.log('info', '3Dシーン初期化完了', {
              containerSize: `${container.clientWidth}x${container.clientHeight}`,
              hasControls: !!this.controls,
              objLoaderAvailable: typeof THREE.OBJLoader !== 'undefined'
            });
            
            return true;
          } catch (error) {
            this.assistant.log('error', '3Dシーン初期化中にエラー', { error: error.message, stack: error.stack });
            this.showFallbackMessage();
            this.isInitialized = false;
            return false;
          }
        };

        // ライブラリの読み込み状況に応じて初期化実行
        if (typeof THREE !== 'undefined') {
          // Three.jsが利用可能な場合は即座に初期化
          this.assistant.log('debug', '即座に3Dシーン初期化実行');
          const success = initializeScene();
          if (!success) {
            this.assistant.log('warn', '3Dシーン初期化失敗 - フォールバック表示');
          }
        } else {
          // Three.jsが利用できない場合は少し待ってから再試行
          this.assistant.log('debug', 'ライブラリ読み込み待機中...');
          setTimeout(() => {
            if (typeof THREE !== 'undefined') {
              this.assistant.log('debug', '遅延3Dシーン初期化実行');
              const success = initializeScene();
              if (!success) {
                this.assistant.log('warn', '遅延3Dシーン初期化失敗 - フォールバック表示');
              }
            } else {
              this.assistant.log('warn', 'ライブラリ読み込みタイムアウト - フォールバック表示');
              this.showFallbackMessage();
              this.isInitialized = false;
            }
          }, 1000);
        }
      } catch (error) {
        this.assistant.log('error', '3Dシーン初期化で致命的エラー', { error: error.message, stack: error.stack });
        this.showFallbackMessage();
        this.isInitialized = false;
      }
    }
  
    // ========== ライティング設定 ==========
    setupLighting() {
      // 環境光
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      this.scene.add(ambientLight);
  
      // 指向性ライト
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      this.scene.add(directionalLight);
  
      // 補助ライト
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-5, 5, 5);
      this.scene.add(fillLight);
    }
  
    // ========== 床面追加 ==========
    addFloor() {
      const floorGeometry = new THREE.PlaneGeometry(20, 20);
      const floorMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.scene.add(floor);
  
      // グリッド
      const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xcccccc);
      this.scene.add(gridHelper);
    }
  
    // ========== アニメーションループ ==========
    animate() {
      requestAnimationFrame(() => this.animate());
      
      if (this.controls) {
        this.controls.update();
      }
      
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  
    // ========== ウィンドウリサイズ対応 ==========
      onWindowResize() {
    if (!this.isInitialized) return;
    
    const container = document.getElementById('threeContainer');
    if (container) {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
  }
  
      // ========== OBJモデル読み込み ==========
  async loadOBJModel(objData) {
    this.assistant.log('debug', 'OBJモデル読み込み開始', { dataSize: objData.length });

    // OBJデータの基本検証とクリーニング
    objData = this.validateAndCleanOBJData(objData);
    if (!objData) {
      throw new Error('OBJデータの検証に失敗しました');
    }

    // 初期化チェック
    if (!this.isInitialized) {
        this.assistant.log('error', '3Dシーンが初期化されていません - 再初期化を試行');
        
        // 再初期化を試行
        try {
          this.setup3DScene();
          
          // 少し待ってから再チェック
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (!this.isInitialized) {
            throw new Error('3Dシーンの再初期化に失敗しました');
          }
          
          this.assistant.log('info', '3Dシーンの再初期化に成功しました');
        } catch (error) {
          this.assistant.log('error', '3Dシーン再初期化失敗', { error: error.message });
          throw new Error('3Dシーンが初期化されていません。ページを再読み込みしてください。');
        }
      }

      // OBJデータの基本検証
      if (!objData || typeof objData !== 'string' || objData.trim().length === 0) {
        this.assistant.log('error', '無効なOBJデータ', { objData: objData });
        throw new Error('無効なOBJデータです');
      }

      // OBJLoaderの利用可能性チェック
      if (typeof THREE.OBJLoader === 'undefined') {
        this.assistant.log('error', 'OBJLoaderが利用できません', {
          threeAvailable: typeof THREE !== 'undefined',
          threeRevision: typeof THREE !== 'undefined' ? THREE.REVISION : 'N/A',
          objLoaderType: typeof THREE.OBJLoader,
          windowOBJLoaderReady: window.OBJLoaderReady,
          windowOBJLoaderFailed: window.OBJLoaderFailed
        });
        
        // フォールバックまたは再試行
        if (window.OBJLoaderFailed) {
          throw new Error('OBJLoaderライブラリの読み込みが完全に失敗しました');
        }
        
        // 再試行メカニズム
        this.assistant.log('info', 'OBJLoader再読み込みを試行します...');
        return this.waitForOBJLoaderAndLoad(objData);
      }

      // 既存モデルを削除
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
        this.currentModel = null;
      }
  
      // OBJLoaderでモデルを読み込み
      const loader = new THREE.OBJLoader();
      
      try {
        this.assistant.log('debug', 'OBJLoader.parse実行開始');
        const object = loader.parse(objData);
        this.assistant.log('debug', 'OBJLoader.parse実行完了', { hasObject: !!object });
        
        // NaN値の修正
        this.fixNaNValuesInObject(object);
        
        // パーツベースマテリアル設定
        this.applyPartBasedMaterials(object, objData);
  
        // モデルを中央に配置
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        object.position.y = box.min.y * -1;
  
        this.scene.add(object);
        this.currentModel = object;
  
        // モデル情報を更新
        this.updateModelInfo(object, objData);
        
        // カメラ位置を調整
        this.fitCameraToModel(box);
  
        // オーバーレイを非表示
        this.hideCanvasOverlay();
        
        // プレースホルダーオーバーレイも非表示
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) {
          overlay.style.display = 'none';
        }
        
        this.assistant.log('info', 'OBJモデル読み込み成功', { 
          vertexCount: this.getModelVertexCount(object),
          faceCount: this.getModelFaceCount(object)
        });
        
      } catch (error) {
        this.assistant.log('error', 'OBJモデル読み込みエラー', { 
          error: error.message, 
          stack: error.stack,
          objDataPreview: objData.substring(0, 200) + '...'
        });
        
        // より詳細なエラーメッセージ
        let errorMessage = '3Dモデルの読み込みに失敗しました。';
        if (error.message.includes('OBJLoader')) {
          errorMessage = 'OBJLoaderライブラリが正しく読み込まれていません。';
        } else if (error.message.includes('parse')) {
          errorMessage = '生成されたOBJデータの形式が正しくありません。';
        } else if (error.message.includes('THREE')) {
          errorMessage = 'Three.jsライブラリが正しく読み込まれていません。';
        }
        
        throw new Error(errorMessage);
      }
    }
  
    // ========== マテリアル適用 ==========
    applyPartBasedMaterials(object, objData) {
      // パーツごとの色定義（明るく調整）
      const partColors = {
        'SEAT': 0xDEB887,       // バーリーウッド（座面）- より明るく
        'BACKREST': 0xD2B48C,   // タン（背もたれ）- より明るく
        'LEG': 0xB8860B,        // ダークゴールデンロッド（脚部）- より明るく
        'TABLETOP': 0xF5DEB3,   // ウィート（天板）- 明るく
        'PANEL': 0xFFE4B5,      // モカシン（パネル）- 非常に明るく
        'SHELF': 0xEEE8AA,      // ペールゴールデンロッド（棚板）- 明るく
        'default': 0xDEB887     // デフォルト - 明るく
      };

      // グラデーション用の色パレット（明るく統一感のある色）
      const gradientColors = [
        0xF5DEB3, // ウィート（最も明るい）
        0xFFE4B5, // モカシン
        0xEEE8AA, // ペールゴールデンロッド
        0xDEB887, // バーリーウッド
        0xD2B48C, // タン
        0xDAA520, // ゴールデンロッド
        0xB8860B, // ダークゴールデンロッド
        0xCD853F, // ペルー
        0xF4A460, // サンディブラウン
        0xBC8F8F  // ロージーブラウン
      ];

      // パーツ情報を解析
      const lines = objData.split('\n');
      let currentPartColor = partColors.default;
      let meshIndex = 0;
      
      for (const line of lines) {
        if (line.startsWith('# Part:')) {
          const partName = line.replace('# Part:', '').trim().toUpperCase();
          
          // パーツ名から色を決定
          if (partName.includes('SEAT')) {
            currentPartColor = partColors.SEAT;
          } else if (partName.includes('BACKREST')) {
            currentPartColor = partColors.BACKREST;
          } else if (partName.includes('LEG')) {
            currentPartColor = partColors.LEG;
          } else if (partName.includes('TABLETOP')) {
            currentPartColor = partColors.TABLETOP;
          } else if (partName.includes('PANEL')) {
            currentPartColor = partColors.PANEL;
          } else if (partName.includes('SHELF')) {
            currentPartColor = partColors.SHELF;
          } else {
            currentPartColor = partColors.default;
          }
        }
      }

      // すべてのメッシュにマテリアルを適用
      object.traverse((child) => {
        if (child.isMesh) {
          // グラデーション色を選択（メッシュインデックスに基づく）
          const gradientColor = gradientColors[meshIndex % gradientColors.length];
          
          // マテリアル設定を改善
          child.material = new THREE.MeshPhongMaterial({ 
            color: gradientColor,
            side: THREE.DoubleSide, // 内側も表示
            transparent: true,
            opacity: 0.85, // 少し透明にして内部構造を見やすく
            shininess: 30, // 光沢を追加
            specular: 0x444444, // スペキュラー色
            // 環境マップ反射を追加（より立体的に）
            envMap: null, // 必要に応じて環境マップを設定可能
            reflectivity: 0.1
          });
          
          // 影の設定
          child.castShadow = true;
          child.receiveShadow = true;
          
          // デバッグ用ログ
          this.assistant.log('debug', `メッシュ ${meshIndex} に色を適用`, {
            meshIndex: meshIndex,
            color: `#${gradientColor.toString(16).padStart(6, '0')}`,
            colorName: this.getColorName(gradientColor)
          });
          
          meshIndex++;
        }
      });
      
      this.assistant.log('info', 'グラデーションマテリアル適用完了', {
        totalMeshes: meshIndex,
        colorsUsed: Math.min(meshIndex, gradientColors.length)
      });
    }
  
    // ========== 色名取得（デバッグ用） ==========
    getColorName(colorHex) {
      const colorNames = {
        0xF5DEB3: 'ウィート',
        0xFFE4B5: 'モカシン', 
        0xEEE8AA: 'ペールゴールデンロッド',
        0xDEB887: 'バーリーウッド',
        0xD2B48C: 'タン',
        0xDAA520: 'ゴールデンロッド',
        0xB8860B: 'ダークゴールデンロッド',
        0xCD853F: 'ペルー',
        0xF4A460: 'サンディブラウン',
        0xBC8F8F: 'ロージーブラウン'
      };
      return colorNames[colorHex] || '不明';
    }
  
    // ========== 色設定リセット（実験用） ==========
    resetMaterialColors(colorScheme = 'gradient') {
      if (!this.currentModel) {
        this.assistant.log('warn', '色設定リセット: 現在のモデルがありません');
        return;
      }

      let meshIndex = 0;
      
      if (colorScheme === 'gradient') {
        // グラデーション色パレット
        const colors = [
          0xF5DEB3, 0xFFE4B5, 0xEEE8AA, 0xDEB887, 0xD2B48C,
          0xDAA520, 0xB8860B, 0xCD853F, 0xF4A460, 0xBC8F8F
        ];
        
        this.currentModel.traverse((child) => {
          if (child.isMesh) {
            const color = colors[meshIndex % colors.length];
            child.material.color.setHex(color);
            meshIndex++;
          }
        });
      } else if (colorScheme === 'bright') {
        // 明るい単色
        const brightColor = 0xF5DEB3; // ウィート
        this.currentModel.traverse((child) => {
          if (child.isMesh) {
            child.material.color.setHex(brightColor);
            child.material.opacity = 0.9;
          }
        });
      } else if (colorScheme === 'transparent') {
        // 半透明
        this.currentModel.traverse((child) => {
          if (child.isMesh) {
            child.material.opacity = 0.6;
            child.material.transparent = true;
          }
        });
      }
      
      this.assistant.log('info', `色設定を${colorScheme}に変更しました`, { meshCount: meshIndex });
    }
  
    // ========== モデル情報更新 ==========
    updateModelInfo(object, objData) {
      const modelInfo = document.getElementById('modelInfo');
      modelInfo.style.display = 'block';
  
      const vertexCount = this.getModelVertexCount(object);
      const faceCount = this.getModelFaceCount(object);
  
      document.getElementById('vertexCount').textContent = vertexCount.toLocaleString();
      document.getElementById('faceCount').textContent = Math.floor(faceCount).toLocaleString();
      
      const fileSize = new Blob([objData]).size;
      document.getElementById('fileSize').textContent = this.assistant.formatFileSize(fileSize);

      // 家具説明を更新
      this.updateFurnitureDescription();
  

    }
  
    // ========== 家具説明更新 ==========
    updateFurnitureDescription() {
      const furnitureDescription = document.getElementById('furnitureDescription');
      
      // 第1段階データから家具情報を取得
      if (this.assistant.processingManager.stage1Data) {
        const stage1Data = this.assistant.processingManager.stage1Data;
        
        // 家具種別を更新
        const furnitureType = document.getElementById('furnitureType');
        furnitureType.textContent = stage1Data.furniture_type || '不明';
        
        // 寸法を更新
        const furnitureDimensions = document.getElementById('furnitureDimensions');
        if (stage1Data.dimensions) {
          const { width, depth, height } = stage1Data.dimensions;
          furnitureDimensions.textContent = `${width}×${depth}×${height}cm`;
        } else {
          furnitureDimensions.textContent = '情報なし';
        }
        
        // 3D構造詳細を更新
        this.updateStructureDetails(stage1Data.structural_analysis);
        
        // 家具説明セクションを表示
        furnitureDescription.style.display = 'block';
        
        this.assistant.log('debug', '家具説明を更新しました', {
          furnitureType: stage1Data.furniture_type,
          dimensions: stage1Data.dimensions,
          hasStructuralAnalysis: !!stage1Data.structural_analysis
        });
      } else {
        // データがない場合は非表示
        furnitureDescription.style.display = 'none';
        this.assistant.log('debug', '第1段階データがないため家具説明を非表示にしました');
      }
    }

    // ========== 3D構造詳細更新 ==========
    updateStructureDetails(structuralAnalysis) {
      const mainComponentsList = document.getElementById('mainComponentsList');
      const specialFeatures = document.getElementById('specialFeatures');
      const specialFeaturesList = document.getElementById('specialFeaturesList');
      
      if (!structuralAnalysis) {
        mainComponentsList.textContent = '構造分析データがありません';
        specialFeatures.style.display = 'none';
        return;
      }
      
      // 主要部品の表示
      if (structuralAnalysis.main_components && structuralAnalysis.main_components.length > 0) {
        const componentTexts = structuralAnalysis.main_components.map(comp => {
          return `${comp.name} (位置: ${comp.position}, サイズ: ${comp.size})`;
        });
        mainComponentsList.innerHTML = componentTexts.join('<br>');
      } else {
        mainComponentsList.textContent = '主要部品情報なし';
      }
      
      // 特殊形状の表示
      const specialShapes = [];
      
      if (structuralAnalysis.curved_parts && structuralAnalysis.curved_parts.length > 0) {
        specialShapes.push(`<strong>曲線部分:</strong> ${structuralAnalysis.curved_parts.join(', ')}`);
      }
      
      if (structuralAnalysis.tapered_parts && structuralAnalysis.tapered_parts.length > 0) {
        specialShapes.push(`<strong>テーパー部分:</strong> ${structuralAnalysis.tapered_parts.join(', ')}`);
      }
      
      if (structuralAnalysis.beveled_edges && structuralAnalysis.beveled_edges.length > 0) {
        specialShapes.push(`<strong>面取り部分:</strong> ${structuralAnalysis.beveled_edges.join(', ')}`);
      }
      
      if (specialShapes.length > 0) {
        specialFeaturesList.innerHTML = specialShapes.join('<br>');
        specialFeatures.style.display = 'block';
      } else {
        specialFeatures.style.display = 'none';
      }
    }
  
    // ========== モデル統計情報取得 ==========
    getModelVertexCount(object) {
      let vertexCount = 0;
      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          vertexCount += child.geometry.attributes.position.count;
        }
      });
      return vertexCount;
    }
  
    getModelFaceCount(object) {
      let faceCount = 0;
      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          faceCount += child.geometry.index ? 
            child.geometry.index.count / 3 : 
            child.geometry.attributes.position.count / 3;
        }
      });
      return faceCount;
    }
  
    // ========== カメラ調整 ==========
    fitCameraToModel(box) {
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      
      this.camera.position.set(distance, distance, distance);
      this.camera.lookAt(0, size.y / 2, 0);
      this.controls.target.set(0, size.y / 2, 0);
      this.controls.update();
    }
  
    // ========== キャンバス管理 ==========
    resetCanvas() {
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
        this.currentModel = null;
      }
      
      this.showCanvasOverlay();
      document.getElementById('modelInfo').style.display = 'none';
      
      // 家具説明セクションを非表示
      const furnitureDescription = document.getElementById('furnitureDescription');
      if (furnitureDescription) {
        furnitureDescription.style.display = 'none';
      }
      
      // ボタングループを非表示
      document.getElementById('downloadButtonGroup').style.display = 'none';
      
      // 品質チェック結果や仕様情報も非表示
      const qualityResults = document.getElementById('qualityResults');
      if (qualityResults) {
        qualityResults.style.display = 'none';
      }
      const optimizedSpecDisplay = document.getElementById('optimizedSpecDisplay');
      if (optimizedSpecDisplay) {
        optimizedSpecDisplay.style.display = 'none';
      }
      
      // ボタンを無効化
      document.getElementById('downloadObjBtn').disabled = true;
      

      
      // カメラをリセット
      if (this.camera && this.controls) {
        this.camera.position.set(5, 5, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }
    }
    
    showCanvasOverlay() {
      const overlay = document.getElementById('canvasOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }
    }
    
    hideCanvasOverlay() {
      const overlay = document.getElementById('canvasOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    }
  
    // ========== OBJLoader待機と読み込み ==========
    async waitForOBJLoaderAndLoad(objData) {
      this.assistant.log('debug', 'OBJLoader待機開始');
      
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20; // 10秒間（500ms × 20回）
        
        const checkOBJLoader = () => {
          attempts++;
          
          if (typeof THREE.OBJLoader !== 'undefined') {
            this.assistant.log('info', 'OBJLoader利用可能になりました', { attempts });
            this.loadOBJModelDirect(objData).then(resolve).catch(reject);
            return;
          }
          
          if (window.OBJLoaderFailed) {
            this.assistant.log('error', 'OBJLoader読み込み失敗フラグ検出');
            reject(new Error('OBJLoaderライブラリの読み込みに失敗しました'));
            return;
          }
          
          if (attempts >= maxAttempts) {
            this.assistant.log('error', 'OBJLoader待機タイムアウト', { attempts });
            // 最後の試行として動的読み込み
            this.retryOBJLoader(objData).then(resolve).catch(reject);
            return;
          }
          
          this.assistant.log('debug', 'OBJLoader待機中...', { attempts, maxAttempts });
          setTimeout(checkOBJLoader, 500);
        };
        
        checkOBJLoader();
      });
    }

    // ========== OBJLoader再試行 ==========
    async retryOBJLoader(objData) {
      this.assistant.log('debug', 'OBJLoader最終再試行開始');
      
      return new Promise((resolve, reject) => {
        // より確実なCDNから読み込み
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/examples/js/loaders/OBJLoader.js';
        
        script.onload = () => {
          this.assistant.log('info', 'OBJLoader最終動的読み込み成功');
          
          // 少し待ってからチェック
          setTimeout(() => {
            if (typeof THREE.OBJLoader !== 'undefined') {
              this.loadOBJModelDirect(objData).then(resolve).catch(reject);
            } else {
              this.assistant.log('error', 'OBJLoader最終読み込み後も利用できません');
              reject(new Error('OBJLoaderライブラリの読み込みに失敗しました'));
            }
          }, 100);
        };
        
        script.onerror = () => {
          this.assistant.log('error', 'OBJLoader最終動的読み込み失敗');
          reject(new Error('OBJLoaderライブラリの動的読み込みに失敗しました'));
        };
        
        document.head.appendChild(script);
        
        // タイムアウト設定
        setTimeout(() => {
          reject(new Error('OBJLoader読み込みタイムアウト'));
        }, 5000);
      });
    }

    // ========== OBJモデル直接読み込み ==========
    async loadOBJModelDirect(objData) {
      this.assistant.log('debug', 'OBJモデル直接読み込み開始');
      
      // OBJデータの基本検証とクリーニング
      objData = this.validateAndCleanOBJData(objData);
      if (!objData) {
        throw new Error('OBJデータの検証に失敗しました');
      }
      
      // 既存モデルを削除
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
        this.currentModel = null;
      }

      const loader = new THREE.OBJLoader();
      
      try {
        this.assistant.log('debug', 'OBJLoader.parse実行開始');
        const object = loader.parse(objData);
        this.assistant.log('debug', 'OBJLoader.parse実行完了', { hasObject: !!object });
        
        // NaN値の修正
        this.fixNaNValuesInObject(object);
        
        // パーツベースマテリアル設定
        this.applyPartBasedMaterials(object, objData);

        // モデルを中央に配置
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        object.position.y = box.min.y * -1;

        this.scene.add(object);
        this.currentModel = object;

        // モデル情報を更新
        this.updateModelInfo(object, objData);
        
        // カメラ位置を調整
        this.fitCameraToModel(box);

        // オーバーレイを非表示
        this.hideCanvasOverlay();
        
        // プレースホルダーオーバーレイも非表示
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) {
          overlay.style.display = 'none';
        }
        
        this.assistant.log('info', 'OBJモデル読み込み成功', { 
          vertexCount: this.getModelVertexCount(object),
          faceCount: this.getModelFaceCount(object)
        });
        
        return object;
        
      } catch (error) {
        this.assistant.log('error', 'OBJモデル直接読み込みエラー', { 
          error: error.message, 
          stack: error.stack,
          objDataPreview: objData.substring(0, 200) + '...'
        });
        
        throw error;
      }
    }

    // ========== OBJデータ検証とクリーニング ==========
    validateAndCleanOBJData(objData) {
      try {
        this.assistant.log('debug', 'OBJデータ検証開始');
        
        if (!objData || typeof objData !== 'string') {
          this.assistant.log('error', 'OBJデータが文字列ではありません', { type: typeof objData });
          return null;
        }
        
        const lines = objData.split('\n');
        const cleanedLines = [];
        let vertexCount = 0;
        let faceCount = 0;
        let invalidVertexCount = 0;
        let invalidFaceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.startsWith('#') || line === '') {
            // コメント行と空行はそのまま保持
            cleanedLines.push(line);
          } else if (line.startsWith('v ')) {
            // 頂点データの検証
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
              const x = parseFloat(parts[1]);
              const y = parseFloat(parts[2]);
              const z = parseFloat(parts[3]);
              
              // より厳密なNaN値と有効性チェック
              const isValidX = !isNaN(x) && isFinite(x) && Math.abs(x) < 10000;
              const isValidY = !isNaN(y) && isFinite(y) && Math.abs(y) < 10000;
              const isValidZ = !isNaN(z) && isFinite(z) && Math.abs(z) < 10000;
              
              if (isValidX && isValidY && isValidZ) {
                // 小数点以下6桁に制限して精度を統一
                const cleanX = parseFloat(x.toFixed(6));
                const cleanY = parseFloat(y.toFixed(6));
                const cleanZ = parseFloat(z.toFixed(6));
                
                // 再度NaNチェック（toFixedでもNaNが残る可能性）
                if (!isNaN(cleanX) && !isNaN(cleanY) && !isNaN(cleanZ)) {
                  cleanedLines.push(`v ${cleanX} ${cleanY} ${cleanZ}`);
                  vertexCount++;
                } else {
                  this.assistant.log('warn', `座標クリーニング後もNaN値が残存（行${i+1}）`, { 
                    original: { x, y, z },
                    cleaned: { cleanX, cleanY, cleanZ }
                  });
                  invalidVertexCount++;
                  cleanedLines.push(`v 0.0 0.0 0.0`);
                }
              } else {
                invalidVertexCount++;
                this.assistant.log('warn', `無効な頂点データを除去（行${i+1}）`, { 
                  line: line,
                  originalValues: { x, y, z },
                  validityCheck: { isValidX, isValidY, isValidZ },
                  isNaN: { x: isNaN(x), y: isNaN(y), z: isNaN(z) },
                  isFinite: { x: isFinite(x), y: isFinite(y), z: isFinite(z) }
                });
                // 無効な頂点は原点に置き換え
                cleanedLines.push(`v 0.0 0.0 0.0`);
              }
            } else {
              this.assistant.log('warn', `不正な頂点行形式（行${i+1}）`, { line: line });
              invalidVertexCount++;
              cleanedLines.push(`v 0.0 0.0 0.0`);
            }
          } else if (line.startsWith('f ')) {
            // 面データの検証
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
              const indices = [];
              let validFace = true;
              
              for (let j = 1; j < parts.length; j++) {
                const indexPart = parts[j].split('/')[0]; // 頂点インデックスのみ取得
                const index = parseInt(indexPart);
                if (isNaN(index) || index <= 0) {
                  validFace = false;
                  break;
                }
                indices.push(index);
              }
              
              if (validFace && indices.length >= 3) {
                cleanedLines.push(line);
                faceCount++;
              } else {
                this.assistant.log('warn', `無効な面データを除去（行${i+1}）`, { line: line });
                invalidFaceCount++;
              }
            } else {
              this.assistant.log('warn', `不正な面行形式（行${i+1}）`, { line: line });
              invalidFaceCount++;
            }
          } else if (line.startsWith('vn ') || line.startsWith('vt ') || 
                     line.startsWith('o ') || line.startsWith('g ') ||
                     line.startsWith('s ') || line.startsWith('mtllib ') ||
                     line.startsWith('usemtl ')) {
            // その他の有効なOBJ要素はそのまま保持
            cleanedLines.push(line);
          } else if (line.trim().length > 0) {
            // 未知の行は警告してコメント化
            this.assistant.log('debug', `未知のOBJ行をコメント化（行${i+1}）`, { line: line });
            cleanedLines.push(`# ${line}`);
          }
        }
        
        const cleanedObjData = cleanedLines.join('\n');
        
        this.assistant.log('info', 'OBJデータ検証・クリーニング完了', {
          totalLines: lines.length,
          validVertices: vertexCount,
          validFaces: faceCount,
          invalidVertices: invalidVertexCount,
          invalidFaces: invalidFaceCount,
          cleanedSize: cleanedObjData.length
        });
        
        // 最低限の頂点と面が必要
        if (vertexCount < 3 || faceCount < 1) {
          this.assistant.log('error', 'OBJデータに十分な頂点・面データがありません', {
            vertexCount: vertexCount,
            faceCount: faceCount
          });
          return null;
        }
        
        return cleanedObjData;
        
      } catch (error) {
        this.assistant.log('error', 'OBJデータ検証中にエラー', { 
          error: error.message,
          stack: error.stack 
        });
        return null;
      }
    }

    // ========== フォールバック表示 ==========
    showFallbackMessage() {
      const container = document.getElementById('threeContainer');
      if (container) {
        container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; flex-direction: column; padding: 2rem;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff9800; margin-bottom: 1rem;"></i>
            <p style="text-align: center; margin: 0;">3Dプレビューライブラリの読み込みに失敗しました</p>
            <p style="text-align: center; margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #999;">ページを再読み込みしてください</p>
          </div>
        `;
      }
    }

    // ========== NaN値修正 ==========
    fixNaNValuesInObject(object) {
      let fixedVertices = 0;
      let totalVertices = 0;
      
      object.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.attributes.position) {
          const positions = child.geometry.attributes.position.array;
          totalVertices += positions.length / 3;
          
          for (let i = 0; i < positions.length; i++) {
            if (isNaN(positions[i]) || !isFinite(positions[i])) {
              positions[i] = 0.0; // NaN値を0に置き換え
              fixedVertices++;
            }
          }
          
          // 位置属性を更新
          child.geometry.attributes.position.needsUpdate = true;
          
          // 法線属性も修正
          if (child.geometry.attributes.normal) {
            const normals = child.geometry.attributes.normal.array;
            for (let i = 0; i < normals.length; i++) {
              if (isNaN(normals[i]) || !isFinite(normals[i])) {
                normals[i] = 0.0;
              }
            }
            child.geometry.attributes.normal.needsUpdate = true;
          }
          
          // バウンディングボックスを再計算
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      });
      
      if (fixedVertices > 0) {
        this.assistant.log('warn', 'NaN値を修正しました', { 
          fixedVertices: fixedVertices,
          totalVertices: totalVertices,
          fixedPercentage: ((fixedVertices / totalVertices) * 100).toFixed(2) + '%'
        });
      } else {
        this.assistant.log('debug', 'NaN値は検出されませんでした', { totalVertices: totalVertices });
      }
    }

    // ========== ヘルパーメソッド ==========
    calculateNormal(v1, v2, v3) {
      const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      
      const normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ];
      
      const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
      if (length > 0) {
        normal[0] /= length;
        normal[1] /= length;
        normal[2] /= length;
      }
      
      return normal;
    }
  }