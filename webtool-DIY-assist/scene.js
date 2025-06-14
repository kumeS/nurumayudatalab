/**
 * scene.js - 3Dシーンと視覚化管理（改善版）
 * 
 * 主な改善点：
 * - より適切なマテリアル設定
 * - 改善されたエラーハンドリング
 * - 家具タイプ別の色設定
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
      
      // 家具タイプ別のカラーパレット
      this.furnitureColorPalettes = {
        'chair': {
          primary: 0x8B6B47,    // 座面・背もたれ（ウォルナット）
          secondary: 0x4A4A4A,  // 脚部（ダークグレー）
          accent: 0xD4AF37     // アクセント（ゴールド）
        },
        'desk': {
          primary: 0xF5DEB3,    // 天板（ウィート）
          secondary: 0x696969,  // 脚部（ディムグレー）
          accent: 0xC0C0C0     // 金具（シルバー）
        },
        'shelf': {
          primary: 0xDEB887,    // 棚板（バーリーウッド）
          secondary: 0x8B7355,  // 側板（シェンナ）
          accent: 0xCD853F     // 背板（ペルー）
        },
        'cabinet': {
          primary: 0xA0522D,    // 本体（シエナ）
          secondary: 0x8B4513,  // 扉（サドルブラウン）
          accent: 0xDAA520     // 取っ手（ゴールデンロッド）
        },
        'default': {
          primary: 0xD2B48C,    // タン
          secondary: 0xBC8F8F,  // ロージーブラウン
          accent: 0xF4A460     // サンディブラウン
        }
      };
    }
  
    // ========== 3Dシーン初期化（改善版） ==========
    setup3DScene() {
      this.assistant.log('debug', '3Dシーン初期化開始');
      
      try {
        const container = document.getElementById('threeContainer');
        if (!container) {
          this.assistant.log('error', '3Dプレビューコンテナが見つかりません');
          this.showFallbackMessage('コンテナが見つかりません');
          return false;
        }

        // Three.js利用可能性チェック（詳細版）
        if (typeof THREE === 'undefined') {
          this.assistant.log('error', 'Three.jsライブラリが読み込まれていません');
          this.showFallbackMessage('Three.jsが利用できません。ページを再読み込みしてください。');
          return false;
        }

        // バージョン情報をログに記録
        this.assistant.log('info', 'Three.js初期化情報', {
          revision: THREE.REVISION,
          objLoaderAvailable: typeof THREE.OBJLoader !== 'undefined',
          orbitControlsAvailable: typeof THREE.OrbitControls !== 'undefined'
        });

        // 既存のcanvas要素をクリーンアップ
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
          existingCanvas.remove();
          this.assistant.log('debug', '既存のcanvas要素を削除');
        }
    
        // シーン作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);
        this.scene.fog = new THREE.Fog(0xf8f9fa, 100, 500); // 霧効果を追加
    
        // カメラ作成（視野角を調整）
        this.camera = new THREE.PerspectiveCamera(
          50, // 視野角を適度に設定して歪みを軽減
          container.clientWidth / container.clientHeight,
          0.1,
          2000 // より遠くまで描画
        );
        this.camera.position.set(25, 20, 25); // 家具全体が見える適切な距離
    
        // レンダラー作成（高品質設定）
        this.renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // パフォーマンス考慮
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        container.appendChild(this.renderer.domElement);
    
        // 改善されたライティング
        this.setupImprovedLighting();
    
        // コントロール（利用可能な場合のみ、改善版）
        const OrbitControlsClass = THREE.OrbitControls || window.OrbitControls;
        if (OrbitControlsClass) {
          this.controls = new OrbitControlsClass(this.camera, this.renderer.domElement);
          this.controls.enableDamping = true;
          this.controls.dampingFactor = 0.05;
          this.controls.minDistance = 5;   // 適度な最小距離
          this.controls.maxDistance = 150; // 適度な最大距離
          this.controls.maxPolarAngle = Math.PI * 0.48; // 床下を見せない
          
          // ズーム・回転・パン機能の有効化
          this.controls.enableZoom = true;   // ズーム明示的に有効化
          this.controls.enableRotate = true; // 回転有効化
          this.controls.enablePan = true;    // パン（中心移動）有効化
          
          // 操作速度の調整
          this.controls.zoomSpeed = 1.2;     // ズーム速度を調整
          this.controls.rotateSpeed = 1.0;   // 回転速度
          this.controls.panSpeed = 0.8;      // パン速度
          
          // マウスボタンの割り当て
          this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,   // 左クリック：回転
            MIDDLE: THREE.MOUSE.DOLLY,  // ホイール：ズーム
            RIGHT: THREE.MOUSE.PAN      // 右クリック：パン（中心移動）
          };
          
          // 高度な中心点操作機能を追加
          this.setupAdvancedCenterControls();
          
          this.assistant.log('debug', 'OrbitControls初期化完了', {
            minDistance: this.controls.minDistance,
            maxDistance: this.controls.maxDistance,
            enableZoom: this.controls.enableZoom,
            enablePan: this.controls.enablePan,
            enableRotate: this.controls.enableRotate
          });
        } else {
          this.assistant.log('warning', 'OrbitControlsが利用できません - マウス操作が制限されます');
        }
    
        // 改善された床面
        this.addImprovedFloor();
    
        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());
    
        // アニメーションループ
        this.animate();
        
        this.isInitialized = true;
        this.assistant.log('info', '3Dシーン初期化完了', {
          containerSize: `${container.clientWidth}x${container.clientHeight}`,
          hasControls: !!this.controls,
          renderer: {
            antialias: this.renderer.capabilities.antialias,
            maxTextures: this.renderer.capabilities.maxTextures,
            maxVertexTextures: this.renderer.capabilities.maxVertexTextures,
            precision: this.renderer.capabilities.precision
          }
        });
        
        return true;
      } catch (error) {
        this.assistant.log('error', '3Dシーン初期化中にエラー', { 
          error: error.message, 
          stack: error.stack 
        });
        this.showFallbackMessage(`初期化エラー: ${error.message}`);
        this.isInitialized = false;
        return false;
      }
    }
  
    // ========== 高度な中心点操作機能 ==========
    setupAdvancedCenterControls() {
      if (!this.controls || !this.renderer) return;
      
      // Raycaster for object picking
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      
      // ダブルクリックで注視点を変更
      this.renderer.domElement.addEventListener('dblclick', (event) => {
        this.onDoubleClick(event);
      });
      
      // キーボードショートカット
      document.addEventListener('keydown', (event) => {
        this.onKeyDown(event);
      });
      
      // 中心点の可視化
      this.centerIndicator = null;
      this.showCenterIndicator = false;
      
      this.assistant.log('debug', '高度な中心点操作機能を初期化');
    }
    
    // ダブルクリックイベントハンドラ
    onDoubleClick(event) {
      if (!this.currentModel || !this.controls) return;
      
      // マウス座標を正規化デバイス座標に変換
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycastingで交差点を取得
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.currentModel, true);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        const newTarget = intersection.point.clone();
        
        // 注視点を新しい位置に移動（アニメーション付き）
        this.animateTargetTo(newTarget);
        
        this.assistant.log('debug', '注視点を変更', {
          newTarget: { x: newTarget.x, y: newTarget.y, z: newTarget.z },
          hitObject: intersection.object.name || 'unnamed'
        });
      }
    }
    
    // キーボードショートカットハンドラ
    onKeyDown(event) {
      if (!this.controls) return;
      
      // Ctrl+Rで中心点をリセット
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        this.resetCameraTarget();
      }
      
      // Ctrl+Cで中心点インジケーター表示切替
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        this.toggleCenterIndicator();
      }
      
      // 矢印キーで微調整
      const step = 2;
      let targetChanged = false;
      const currentTarget = this.controls.target.clone();
      
      switch(event.key) {
        case 'ArrowLeft':
          currentTarget.x -= step;
          targetChanged = true;
          break;
        case 'ArrowRight':
          currentTarget.x += step;
          targetChanged = true;
          break;
        case 'ArrowUp':
          if (event.shiftKey) {
            currentTarget.y += step; // Shift+Up: Y軸上方向
          } else {
            currentTarget.z -= step; // Up: Z軸前方向
          }
          targetChanged = true;
          break;
        case 'ArrowDown':
          if (event.shiftKey) {
            currentTarget.y -= step; // Shift+Down: Y軸下方向
          } else {
            currentTarget.z += step; // Down: Z軸後方向
          }
          targetChanged = true;
          break;
      }
      
      if (targetChanged) {
        event.preventDefault();
        this.animateTargetTo(currentTarget);
      }
    }
    
    // 注視点のアニメーション移動
    animateTargetTo(newTarget) {
      if (!this.controls) return;
      
      const startTarget = this.controls.target.clone();
      const duration = 500; // ミリ秒
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // イージング関数（ease-out）
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // 線形補間
        const interpolatedTarget = startTarget.clone().lerp(newTarget, easeProgress);
        this.controls.target.copy(interpolatedTarget);
        this.controls.update();
        
        // 中心インジケーターを更新
        if (this.centerIndicator) {
          this.centerIndicator.position.copy(interpolatedTarget);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    // 中心点をリセット
    resetCameraTarget() {
      if (!this.controls || !this.currentModel) return;
      
      // モデルの中心に戻す
      const box = new THREE.Box3().setFromObject(this.currentModel);
      const center = box.getCenter(new THREE.Vector3());
      center.y = center.y * 0.4; // 少し下に
      
      this.animateTargetTo(center);
      
      // カメラ位置も適切な距離にリセット
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = Math.max(maxDim * 1.8, 15);
      const cameraHeight = Math.max(size.y * 0.6 + maxDim * 0.4, 8);
      
      this.camera.position.set(
        distance * 0.8,
        cameraHeight,
        distance * 0.8
      );
      this.controls.update();
      
      this.assistant.log('debug', '注視点とカメラ位置をリセット', {
        center: { x: center.x, y: center.y, z: center.z },
        cameraPosition: this.camera.position
      });
    }
    
    // 中心点インジケーターの表示切替
    toggleCenterIndicator() {
      this.showCenterIndicator = !this.showCenterIndicator;
      
      if (this.showCenterIndicator) {
        if (!this.centerIndicator) {
          // インジケーターを作成
          const geometry = new THREE.SphereGeometry(0.5, 8, 6);
          const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.7 
          });
          this.centerIndicator = new THREE.Mesh(geometry, material);
          this.scene.add(this.centerIndicator);
        }
        this.centerIndicator.position.copy(this.controls.target);
        this.centerIndicator.visible = true;
      } else if (this.centerIndicator) {
        this.centerIndicator.visible = false;
      }
      
             this.assistant.log('debug', '中心点インジケーター', {
         visible: this.showCenterIndicator
       });
     }
     
     // UIイベントリスナーの設定
     setupUIEventListeners() {
       // 中心操作パネルを開く
       const openCenterBtn = document.getElementById('openCenterControlBtn');
       if (openCenterBtn) {
         openCenterBtn.addEventListener('click', () => {
           const panel = document.getElementById('centerControlPanel');
           if (panel) {
             panel.style.display = 'block';
           }
         });
       }
       
       // 中心操作パネルを閉じる
       const closeCenterBtn = document.getElementById('closeCenterPanel');
       if (closeCenterBtn) {
         closeCenterBtn.addEventListener('click', () => {
           const panel = document.getElementById('centerControlPanel');
           if (panel) {
             panel.style.display = 'none';
           }
         });
       }
       
       // 中心リセットボタン
       const resetCenterBtn = document.getElementById('resetCenterBtn');
       if (resetCenterBtn) {
         resetCenterBtn.addEventListener('click', () => {
           this.resetCameraTarget();
         });
       }
       
       // 中心インジケーター切替ボタン
       const toggleIndicatorBtn = document.getElementById('toggleIndicatorBtn');
       if (toggleIndicatorBtn) {
         toggleIndicatorBtn.addEventListener('click', () => {
           this.toggleCenterIndicator();
           // ボタンの状態を更新
           if (this.showCenterIndicator) {
             toggleIndicatorBtn.classList.add('active');
           } else {
             toggleIndicatorBtn.classList.remove('active');
           }
         });
       }
     }

    // ========== 改善されたライティング設定 ==========
    setupImprovedLighting() {
      // 環境光（全体を柔らかく照らす）
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);
  
      // メイン指向性ライト（太陽光）
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(10, 15, 10);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -20;
      mainLight.shadow.camera.right = 20;
      mainLight.shadow.camera.top = 20;
      mainLight.shadow.camera.bottom = -20;
      mainLight.shadow.bias = -0.001;
      this.scene.add(mainLight);
  
      // フィルライト（影を和らげる）
      const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
      fillLight.position.set(-5, 8, -5);
      this.scene.add(fillLight);
      
      // リムライト（輪郭を強調）
      const rimLight = new THREE.DirectionalLight(0xffffcc, 0.3);
      rimLight.position.set(0, 5, -10);
      this.scene.add(rimLight);
      
      // 半球光（自然な環境光）
      const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.3);
      this.scene.add(hemiLight);
    }
  
    // ========== 改善された床面追加 ==========
    addImprovedFloor() {
      // 床面（より質感のあるマテリアル）
      const floorGeometry = new THREE.PlaneGeometry(30, 30);
      const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        shininess: 10,
        specular: 0x222222
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      floor.receiveShadow = true;
      this.scene.add(floor);
  
      // グリッド（より見やすく）
      const gridHelper = new THREE.GridHelper(30, 30, 0xcccccc, 0xeeeeee);
      gridHelper.material.opacity = 0.5;
      gridHelper.material.transparent = true;
      this.scene.add(gridHelper);
      
      // 座標軸ヘルパー（デバッグ用、小さめ）
      if (this.assistant.debugMode) {
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
      }
    }
  
    // ========== アニメーションループ ==========
    animate() {
      requestAnimationFrame(() => this.animate());
      
      if (this.controls) {
        this.controls.update();
      }
      
      // モデルの自動回転（オプション）
      if (this.currentModel && this.autoRotate) {
        this.currentModel.rotation.y += 0.005;
      }
      
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  
    // ========== ウィンドウリサイズ対応 ==========
    onWindowResize() {
      if (!this.isInitialized) return;
      
      const container = document.getElementById('threeContainer');
      if (container && this.camera && this.renderer) {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
      }
    }
  
    // ========== OBJモデル読み込み（改善版） ==========
    async loadOBJModel(objData) {
      // 基本的な検証
      if (!objData || typeof objData !== 'string') {
        this.assistant.log('error', '無効なOBJデータ', { 
          objData: objData, 
          type: typeof objData
        });
        throw new Error('OBJデータが提供されていません');
      }

      this.assistant.log('debug', 'OBJモデル読み込み開始', { 
        dataSize: objData.length,
        preview: objData.substring(0, 100) + '...'
      });

      // OBJデータの検証とクリーニング
      objData = this.validateAndCleanOBJData(objData);
      if (!objData) {
        throw new Error('OBJデータの検証に失敗しました');
      }

      // 初期化チェック
      if (!this.isInitialized) {
        this.assistant.log('error', '3Dシーンが初期化されていません');
        throw new Error('3Dシーンが初期化されていません');
      }

      // OBJLoaderの利用可能性チェック（改善版）
      const OBJLoaderClass = THREE.OBJLoader || window.OBJLoader;
      if (!OBJLoaderClass) {
        this.assistant.log('error', 'OBJLoaderが利用できません');
        throw new Error('OBJLoaderライブラリが読み込まれていません');
      }

      // 既存モデルを削除
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
        if (this.currentModel.geometry) this.currentModel.geometry.dispose();
        if (this.currentModel.material) {
          if (Array.isArray(this.currentModel.material)) {
            this.currentModel.material.forEach(m => m.dispose());
          } else {
            this.currentModel.material.dispose();
          }
        }
        this.currentModel = null;
      }
  
      // OBJLoaderでモデルを読み込み
      const loader = new OBJLoaderClass();
      
      try {
        this.assistant.log('debug', 'OBJLoader.parse実行開始', {
          dataLength: objData.length,
          hasVertices: objData.includes('v '),
          hasFaces: objData.includes('f ')
        });
        
        const object = loader.parse(objData);
        
        if (!object) {
          throw new Error('OBJLoaderがnullオブジェクトを返しました');
        }
        
        this.assistant.log('debug', 'OBJLoader.parse実行完了', { 
          hasObject: !!object,
          childrenCount: object.children?.length || 0
        });
        
        // NaN値の修正
        this.fixNaNValuesInObject(object);
        
        // 家具タイプを検出
        const furnitureType = this.detectFurnitureTypeFromOBJ(objData);
        
        // 改善されたマテリアル設定
        this.applyImprovedMaterials(object, furnitureType, objData);
  
        // モデルを中央に配置
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        object.position.sub(center);
        object.position.y = -box.min.y; // 床に設置
  
        this.scene.add(object);
        this.currentModel = object;
  
        // モデル情報を更新
        this.updateModelInfo(object, objData);
        
        // カメラ位置を最適化
        this.optimizeCameraPosition(box, size);
  
        // オーバーレイを非表示
        this.hideCanvasOverlay();
        
        this.assistant.log('info', 'OBJモデル読み込み成功', { 
          vertexCount: this.getModelVertexCount(object),
          faceCount: this.getModelFaceCount(object),
          furnitureType: furnitureType,
          dimensions: `${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}`
        });
        
      } catch (error) {
        this.assistant.log('error', 'OBJモデル読み込みエラー', { 
          error: error.message, 
          stack: error.stack,
          objDataPreview: objData.substring(0, 200)
        });
        
        // フォールバック: 基本的な立方体を表示
        try {
          this.assistant.log('info', 'フォールバック: 基本立方体を表示');
          const geometry = new THREE.BoxGeometry(10, 10, 10);
          const material = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
          const cube = new THREE.Mesh(geometry, material);
          
          this.scene.add(cube);
          this.currentModel = cube;
          this.hideCanvasOverlay();
          
          this.assistant.log('info', 'フォールバック表示成功');
          return; // エラーを投げずに正常終了
        } catch (fallbackError) {
          this.assistant.log('error', 'フォールバック表示も失敗', { error: fallbackError.message });
        }
        
        throw new Error(`3Dモデルの読み込みに失敗しました: ${error.message}`);
      }
    }
  
    // ========== 家具タイプ検出 ==========
    detectFurnitureTypeFromOBJ(objData) {
      // OBJコメントやグループ名から家具タイプを推測
      const lines = objData.split('\n');
      let detectedType = 'default';
      
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('chair') || lower.includes('seat')) {
          detectedType = 'chair';
          break;
        } else if (lower.includes('desk') || lower.includes('table')) {
          detectedType = 'desk';
          break;
        } else if (lower.includes('shelf') || lower.includes('rack')) {
          detectedType = 'shelf';
          break;
        } else if (lower.includes('cabinet') || lower.includes('storage')) {
          detectedType = 'cabinet';
          break;
        }
      }
      
      // ProcessingManagerのデータも参照
      if (this.assistant.processingManager.stage1Data?.furniture_type) {
        const stage1Type = this.assistant.processingManager.stage1Data.furniture_type;
        if (stage1Type.includes('椅子')) detectedType = 'chair';
        else if (stage1Type.includes('机')) detectedType = 'desk';
        else if (stage1Type.includes('棚')) detectedType = 'shelf';
        else if (stage1Type.includes('キャビネット')) detectedType = 'cabinet';
      }
      
      return detectedType;
    }
  
    // ========== 改善されたマテリアル適用 ==========
    applyImprovedMaterials(object, furnitureType, objData) {
      const palette = this.furnitureColorPalettes[furnitureType] || this.furnitureColorPalettes.default;
      
      // パーツ名から色を決定するマッピング
      const partColorMap = {
        'seat': palette.primary,
        'backrest': palette.primary,
        'cushion': palette.primary,
        'top': palette.primary,
        'tabletop': palette.primary,
        'shelf': palette.primary,
        'door': palette.secondary,
        'drawer': palette.secondary,
        'panel': palette.secondary,
        'leg': palette.secondary,
        'frame': palette.secondary,
        'handle': palette.accent,
        'knob': palette.accent,
        'metal': palette.accent
      };

      let meshIndex = 0;
      const meshCount = this.countMeshes(object);
      
      object.traverse((child) => {
        if (child.isMesh) {
          // グループ名から適切な色を選択
          let color = palette.primary;
          const groupName = child.name?.toLowerCase() || '';
          
          // パーツ名マッチング
          for (const [partName, partColor] of Object.entries(partColorMap)) {
            if (groupName.includes(partName)) {
              color = partColor;
              break;
            }
          }
          
          // メッシュインデックスによるグラデーション（フォールバック）
          if (!groupName && meshCount > 1) {
            const ratio = meshIndex / Math.max(meshCount - 1, 1);
            if (ratio < 0.33) color = palette.primary;
            else if (ratio < 0.66) color = palette.secondary;
            else color = palette.accent;
          }
          
          // 高品質マテリアルを適用
          const material = new THREE.MeshPhongMaterial({ 
            color: color,
            side: THREE.DoubleSide,
            shininess: 30,
            specular: 0x222222,
            emissive: color,
            emissiveIntensity: 0.02
          });
          
          // 元のマテリアルを破棄
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
          
          child.material = material;
          child.castShadow = true;
          child.receiveShadow = true;
          
          this.assistant.log('debug', `マテリアル適用: ${groupName || `mesh_${meshIndex}`}`, {
            color: `#${color.toString(16).padStart(6, '0')}`,
            meshIndex: meshIndex
          });
          
          meshIndex++;
        }
      });
      
      this.assistant.log('info', '改善されたマテリアル適用完了', {
        furnitureType: furnitureType,
        totalMeshes: meshIndex,
        palette: {
          primary: `#${palette.primary.toString(16).padStart(6, '0')}`,
          secondary: `#${palette.secondary.toString(16).padStart(6, '0')}`,
          accent: `#${palette.accent.toString(16).padStart(6, '0')}`
        }
      });
    }
  
    // ========== メッシュ数カウント ==========
    countMeshes(object) {
      let count = 0;
      object.traverse((child) => {
        if (child.isMesh) count++;
      });
      return count;
    }
  
    // ========== カメラ位置最適化 ==========
    optimizeCameraPosition(box, size) {
      const maxDim = Math.max(size.x, size.y, size.z);
      // 家具全体が見える適切な距離を計算（より保守的な設定）
      const distance = Math.max(maxDim * 1.8, 15); // 距離を短縮して適切な表示に
      
      // 家具の高さに応じてカメラの高さを調整（より低めに）
      const cameraHeight = Math.max(size.y * 0.6 + maxDim * 0.4, 8);
      
      this.camera.position.set(
        distance * 0.8,
        cameraHeight,
        distance * 0.8
      );
      
      // 注視点をモデルの中心より少し上に
      const lookAtY = size.y * 0.3;
      this.camera.lookAt(0, lookAtY, 0);
      
      if (this.controls) {
        this.controls.target.set(0, lookAtY, 0);
        // ズーム範囲をモデルサイズに応じて動的調整（より適切な範囲に）
        this.controls.minDistance = Math.max(maxDim * 0.3, 3);
        this.controls.maxDistance = Math.max(maxDim * 6, 100);
        this.controls.reset(); // コントロールをリセットして新しい設定を適用
        this.controls.update();
        
        this.assistant.log('debug', 'カメラ位置最適化完了', {
          modelSize: { x: size.x, y: size.y, z: size.z },
          maxDim: maxDim,
          distance: distance,
          cameraPosition: this.camera.position,
          lookAtY: lookAtY,
          zoomRange: { min: this.controls.minDistance, max: this.controls.maxDistance }
        });
      }
    }
  
    // ========== 色設定リセット（改善版） ==========
    resetMaterialColors(colorScheme = 'gradient') {
      if (!this.currentModel) {
        this.assistant.log('warn', '色設定リセット: 現在のモデルがありません');
        return;
      }

      const furnitureType = this.detectFurnitureTypeFromOBJ('');
      const palette = this.furnitureColorPalettes[furnitureType] || this.furnitureColorPalettes.default;
      let meshIndex = 0;
      
      this.currentModel.traverse((child) => {
        if (child.isMesh && child.material) {
          switch (colorScheme) {
            case 'gradient':
              // 家具タイプ別のグラデーション
              const colors = [palette.primary, palette.secondary, palette.accent];
              const color = colors[meshIndex % colors.length];
              child.material.color.setHex(color);
              child.material.opacity = 1.0;
              child.material.transparent = false;
              break;
              
            case 'bright':
              // 明るい単色（プライマリカラー）
              child.material.color.setHex(palette.primary);
              child.material.opacity = 1.0;
              child.material.transparent = false;
              child.material.emissiveIntensity = 0.1;
              break;
              
            case 'transparent':
              // 半透明（ガラス風）
              child.material.opacity = 0.7;
              child.material.transparent = true;
              child.material.color.setHex(0xcccccc);
              child.material.emissiveIntensity = 0.05;
              break;
          }
          
          // マテリアルの更新を通知
          child.material.needsUpdate = true;
          meshIndex++;
        }
      });
      
      this.assistant.log('info', `色設定を${colorScheme}に変更しました`, { 
        meshCount: meshIndex,
        furnitureType: furnitureType
      });
    }
  
    // ========== モデル情報更新（改善版） ==========
    updateModelInfo(object, objData) {
      const modelInfo = document.getElementById('modelInfo');
      if (modelInfo) {
        modelInfo.style.display = 'block';
      }
  
      const vertexCount = this.getModelVertexCount(object);
      const faceCount = this.getModelFaceCount(object);
      const groupCount = this.getModelGroupCount(object);

      // 基本統計情報
      const vertexEl = document.getElementById('vertexCount');
      if (vertexEl) vertexEl.textContent = vertexCount.toLocaleString();
      
      const faceEl = document.getElementById('faceCount');
      if (faceEl) faceEl.textContent = faceCount.toLocaleString();
      
      const fileSize = new Blob([objData]).size;
      const fileSizeEl = document.getElementById('fileSize');
      if (fileSizeEl) fileSizeEl.textContent = this.assistant.formatFileSize(fileSize);

      // 家具説明を更新
      this.updateFurnitureDescription();
      
      // 品質指標を計算
      const qualityMetrics = this.calculateQualityMetrics(vertexCount, faceCount, groupCount);
      this.assistant.log('info', 'モデル品質指標', qualityMetrics);
    }
  
    // ========== 品質指標計算 ==========
    calculateQualityMetrics(vertexCount, faceCount, groupCount) {
      // 頂点と面の比率（理想は0.5〜2.0）
      const vertexFaceRatio = vertexCount / Math.max(faceCount, 1);
      
      // 複雑度スコア（0-100）
      let complexityScore = Math.min(100, Math.log10(vertexCount + 1) * 25);
      
      // 構造スコア（グループ数に基づく）
      let structureScore = Math.min(100, groupCount * 20);
      
      // 全体的な品質スコア
      let qualityScore = 50;
      if (vertexFaceRatio >= 0.5 && vertexFaceRatio <= 2.0) {
        qualityScore += 30;
      }
      if (vertexCount >= 8 && faceCount >= 6) {
        qualityScore += 20;
      }
      
      return {
        vertexFaceRatio: vertexFaceRatio.toFixed(2),
        complexityScore: Math.round(complexityScore),
        structureScore: Math.round(structureScore),
        overallQuality: Math.round(qualityScore),
        rating: qualityScore >= 80 ? '優秀' : qualityScore >= 60 ? '良好' : '改善余地あり'
      };
    }
  
    // ========== モデルグループ数取得 ==========
    getModelGroupCount(object) {
      const groups = new Set();
      object.traverse((child) => {
        if (child.name && child.isMesh) {
          groups.add(child.name);
        }
      });
      return groups.size;
    }
  
    // ========== 家具説明更新 ==========
    updateFurnitureDescription() {
      const furnitureDescription = document.getElementById('furnitureDescription');
      
      if (this.assistant.processingManager.stage1Data) {
        const stage1Data = this.assistant.processingManager.stage1Data;
        
        // 家具種別を更新
        const furnitureType = document.getElementById('furnitureType');
        if (furnitureType) {
          furnitureType.textContent = stage1Data.furniture_type || '不明';
        }
        
        // 寸法を更新
        const furnitureDimensions = document.getElementById('furnitureDimensions');
        if (furnitureDimensions && stage1Data.dimensions) {
          const { width, depth, height } = stage1Data.dimensions;
          furnitureDimensions.textContent = `${width}×${depth}×${height}cm`;
        }
        
        // 3D構造詳細を更新
        this.updateStructureDetails(stage1Data.structural_analysis);
        
        // 家具説明セクションを表示
        if (furnitureDescription) {
          furnitureDescription.style.display = 'block';
        }
      } else if (furnitureDescription) {
        furnitureDescription.style.display = 'none';
      }
    }

    // ========== 3D構造詳細更新 ==========
    updateStructureDetails(structuralAnalysis) {
      const mainComponentsList = document.getElementById('mainComponentsList');
      const specialFeatures = document.getElementById('specialFeatures');
      const specialFeaturesList = document.getElementById('specialFeaturesList');
      
      if (!structuralAnalysis || !mainComponentsList) {
        return;
      }
      
      // 主要部品の表示
      if (structuralAnalysis.main_components && structuralAnalysis.main_components.length > 0) {
        const componentTexts = structuralAnalysis.main_components.map(comp => {
          return `${comp.name} (位置: ${comp.position}, サイズ: ${comp.size})`;
        });
        mainComponentsList.innerHTML = componentTexts.join('<br>');
      } else {
        mainComponentsList.textContent = '部品情報を解析中...';
      }
      
      // 特殊形状の表示
      if (specialFeatures && specialFeaturesList) {
        const features = structuralAnalysis.design_features || {};
        const specialShapes = [];
        
        if (features.curved_parts && features.curved_parts.length > 0) {
          specialShapes.push(`<strong>曲線部分:</strong> ${features.curved_parts.join(', ')}`);
        }
        
        if (features.tapered_parts && features.tapered_parts.length > 0) {
          specialShapes.push(`<strong>テーパー部分:</strong> ${features.tapered_parts.join(', ')}`);
        }
        
        if (features.beveled_edges && features.beveled_edges.length > 0) {
          specialShapes.push(`<strong>面取り部分:</strong> ${features.beveled_edges.join(', ')}`);
        }
        
        if (specialShapes.length > 0) {
          specialFeaturesList.innerHTML = specialShapes.join('<br>');
          specialFeatures.style.display = 'block';
        } else {
          specialFeatures.style.display = 'none';
        }
      }
    }
  
    // ========== モデル統計情報取得 ==========
    getModelVertexCount(object) {
      let vertexCount = 0;
      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          if (child.geometry.attributes.position) {
            vertexCount += child.geometry.attributes.position.count;
          }
        }
      });
      return vertexCount;
    }
  
    getModelFaceCount(object) {
      let faceCount = 0;
      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          if (child.geometry.index) {
            faceCount += child.geometry.index.count / 3;
          } else if (child.geometry.attributes.position) {
            faceCount += child.geometry.attributes.position.count / 3;
          }
        }
      });
      return Math.floor(faceCount);
    }
  
    // ========== キャンバス管理 ==========
    resetCanvas() {
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
        
        // リソースの解放
        this.currentModel.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        
        this.currentModel = null;
      }
      
      this.showCanvasOverlay();
      
      const modelInfo = document.getElementById('modelInfo');
      if (modelInfo) modelInfo.style.display = 'none';
      
      const furnitureDescription = document.getElementById('furnitureDescription');
      if (furnitureDescription) furnitureDescription.style.display = 'none';
      
      const downloadButtonGroup = document.getElementById('downloadButtonGroup');
      if (downloadButtonGroup) downloadButtonGroup.style.display = 'none';
      
      const downloadObjBtn = document.getElementById('downloadObjBtn');
      if (downloadObjBtn) downloadObjBtn.disabled = true;
      
      // カメラをリセット
      if (this.camera && this.controls) {
        this.camera.position.set(15, 12, 15); // 修正された初期位置
        this.controls.target.set(0, 0, 0);
        this.controls.minDistance = 2;
        this.controls.maxDistance = 200;
        this.controls.update();
      }
    }
    
    showCanvasOverlay() {
      const overlay = document.getElementById('canvasOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }
      
      // 3D操作ヒントを非表示
      const hints = document.getElementById('threeDHints');
      if (hints) {
        hints.style.display = 'none';
      }
      
      // 中心操作UIを非表示
      const centerBtn = document.getElementById('openCenterControlBtn');
      if (centerBtn) {
        centerBtn.style.display = 'none';
      }
      
      const centerPanel = document.getElementById('centerControlPanel');
      if (centerPanel) {
        centerPanel.style.display = 'none';
      }
    }
    
    hideCanvasOverlay() {
      const overlay = document.getElementById('canvasOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      
      // 3D操作ヒントを表示
      const hints = document.getElementById('threeDHints');
      if (hints) {
        hints.style.display = 'block';
      }
      
      // 中心操作ボタンを表示
      const centerBtn = document.getElementById('openCenterControlBtn');
      if (centerBtn) {
        centerBtn.style.display = 'flex';
      }
      
      // UIイベントリスナーを設定
      this.setupUIEventListeners();
    }

    // ========== OBJデータ検証とクリーニング（改善版） ==========
    validateAndCleanOBJData(objData) {
      try {
        this.assistant.log('debug', 'OBJデータ検証開始', {
          originalLength: objData.length
        });
        
        if (!objData || typeof objData !== 'string') {
          this.assistant.log('error', 'OBJデータが文字列ではありません', { type: typeof objData });
          return null;
        }
        
        const lines = objData.split('\n');
        const cleanedLines = [];
        const vertices = [];
        const faces = [];
        let currentGroup = 'default';
        let vertexOffset = 0;
        const vertexMap = new Map(); // 元のインデックスから新しいインデックスへのマッピング
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line === '' || line.startsWith('#')) {
            cleanedLines.push(line);
            continue;
          }
          
          if (line.startsWith('v ')) {
            // 頂点データの検証と正規化
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
              const coords = parts.slice(1, 4).map(Number);
              
              // NaN値と無限大のチェック
              const isValid = coords.every(c => !isNaN(c) && isFinite(c) && Math.abs(c) < 10000);
              
              if (isValid) {
                // 小数点以下を適切に丸める
                const cleanedCoords = coords.map(c => parseFloat(c.toFixed(6)));
                vertices.push(cleanedCoords);
                vertexMap.set(vertices.length + vertexOffset, vertices.length);
                cleanedLines.push(`v ${cleanedCoords.join(' ')}`);
              } else {
                this.assistant.log('warn', `無効な頂点を修正（行${i+1}）`, { 
                  original: line,
                  coords: coords
                });
                vertices.push([0, 0, 0]);
                vertexMap.set(vertices.length + vertexOffset, vertices.length);
                cleanedLines.push('v 0 0 0');
              }
            }
          } else if (line.startsWith('vn ')) {
            // 法線ベクトルの検証
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
              const coords = parts.slice(1, 4).map(Number);
              if (coords.every(c => !isNaN(c) && isFinite(c))) {
                // 正規化
                const length = Math.sqrt(coords[0]**2 + coords[1]**2 + coords[2]**2);
                if (length > 0) {
                  const normalized = coords.map(c => (c / length).toFixed(6));
                  cleanedLines.push(`vn ${normalized.join(' ')}`);
                }
              }
            }
          } else if (line.startsWith('f ')) {
            // 面データの検証と修正
            const parts = line.substring(2).split(/\s+/);
            const validIndices = [];
            
            for (const part of parts) {
              const index = parseInt(part.split('/')[0]);
              if (!isNaN(index) && index > 0 && index <= vertices.length + vertexOffset) {
                const mappedIndex = vertexMap.get(index) || index;
                validIndices.push(mappedIndex);
              }
            }
            
            if (validIndices.length >= 3) {
              // 重複頂点を除去
              const uniqueIndices = [...new Set(validIndices)];
              if (uniqueIndices.length >= 3) {
                faces.push(uniqueIndices);
                cleanedLines.push(`f ${uniqueIndices.join(' ')}`);
              }
            }
          } else if (line.startsWith('g ')) {
            currentGroup = line.substring(2).trim();
            cleanedLines.push(line);
          } else if (line.startsWith('o ') || line.startsWith('s ') || 
                     line.startsWith('mtllib ') || line.startsWith('usemtl ') ||
                     line.startsWith('vt ')) {
            cleanedLines.push(line);
          }
        }
        
        const cleanedObjData = cleanedLines.join('\n');
        
        // 品質チェック（緩和版）
        if (vertices.length < 3) {
          this.assistant.log('error', '頂点数が不足しています（最低3個必要）', { vertexCount: vertices.length });
          return null;
        }
        
        if (faces.length < 1) {
          this.assistant.log('warn', '面が定義されていません、基本的な面を生成します', { faceCount: faces.length });
          // 基本的な三角形面を生成（最初の3つの頂点を使用）
          if (vertices.length >= 3) {
            faces.push([1, 2, 3]);
            cleanedLines.push('f 1 2 3');
          }
        }
        
        this.assistant.log('info', 'OBJデータ検証・クリーニング完了', {
          originalLines: lines.length,
          cleanedLines: cleanedLines.length,
          vertexCount: vertices.length,
          faceCount: faces.length,
          removedLines: lines.length - cleanedLines.length
        });
        
        return cleanedObjData;
        
      } catch (error) {
        this.assistant.log('error', 'OBJデータ検証中にエラー', { 
          error: error.message,
          stack: error.stack 
        });
        return null;
      }
    }

    // ========== フォールバック表示（改善版） ==========
    showFallbackMessage(reason = '') {
      const container = document.getElementById('threeContainer');
      if (container) {
        const iconClass = reason.includes('エラー') ? 'fa-exclamation-triangle' : 'fa-cube';
        const iconColor = reason.includes('エラー') ? '#ff5252' : '#ff9800';
        
        container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; flex-direction: column; padding: 2rem;">
            <i class="fas ${iconClass}" style="font-size: 48px; color: ${iconColor}; margin-bottom: 1rem;"></i>
            <p style="text-align: center; margin: 0; font-weight: 500;">3Dプレビューを初期化できません</p>
            <p style="text-align: center; margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #999;">${reason || 'ページを再読み込みしてください'}</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              <i class="fas fa-sync"></i> 再読み込み
            </button>
          </div>
        `;
      }
    }

    // ========== NaN値修正（改善版） ==========
    fixNaNValuesInObject(object) {
      let fixedCount = 0;
      let totalVertices = 0;
      
      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          
          // 位置属性の修正
          if (geometry.attributes.position) {
            const positions = geometry.attributes.position.array;
            totalVertices += positions.length / 3;
            
            for (let i = 0; i < positions.length; i++) {
              if (isNaN(positions[i]) || !isFinite(positions[i])) {
                positions[i] = 0;
                fixedCount++;
              }
            }
            geometry.attributes.position.needsUpdate = true;
          }
          
          // 法線属性の修正
          if (geometry.attributes.normal) {
            const normals = geometry.attributes.normal.array;
            for (let i = 0; i < normals.length; i += 3) {
              const x = normals[i];
              const y = normals[i + 1];
              const z = normals[i + 2];
              
              if (isNaN(x) || isNaN(y) || isNaN(z) || !isFinite(x) || !isFinite(y) || !isFinite(z)) {
                // デフォルトの上向き法線
                normals[i] = 0;
                normals[i + 1] = 1;
                normals[i + 2] = 0;
              }
            }
            geometry.attributes.normal.needsUpdate = true;
          }
          
          // ジオメトリの再計算
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          
          // 法線が存在しない場合は計算
          if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
          }
        }
      });
      
      if (fixedCount > 0) {
        this.assistant.log('warn', 'NaN値を修正しました', { 
          fixedCount: fixedCount,
          totalVertices: totalVertices,
          percentage: ((fixedCount / (totalVertices * 3)) * 100).toFixed(2) + '%'
        });
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
      } else {
        // ゼロベクトルの場合はデフォルト法線
        normal[0] = 0;
        normal[1] = 1;
        normal[2] = 0;
      }
      
      return normal;
    }
}