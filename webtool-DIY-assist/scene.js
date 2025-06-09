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
      // パーツごとの色定義
      const partColors = {
        'SEAT': 0x8b4513,       // 茶色（座面）
        'BACKREST': 0xa0522d,   // 濃い茶色（背もたれ）
        'LEG': 0x654321,        // ダークブラウン（脚部）
        'TABLETOP': 0xdeb887,   // バーリーウッド（天板）
        'PANEL': 0xf5deb3,      // ウィート（パネル）
        'SHELF': 0xd2691e,      // チョコレート（棚板）
        'default': 0x8b4513     // デフォルト
      };
  
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
          // パーツに応じた色をランダムに選択（デモ用）
          const colors = [0x8b4513, 0xa0522d, 0x654321, 0xdeb887, 0xf5deb3, 0xd2691e];
          const randomColor = colors[meshIndex % colors.length];
          
          child.material = new THREE.MeshLambertMaterial({ 
            color: randomColor,
            side: THREE.DoubleSide
          });
          child.castShadow = true;
          child.receiveShadow = true;
          meshIndex++;
        }
      });
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
  
      // プロンプト表示ボタンの表示制御
      const promptBtn = document.getElementById('showOptimizedPromptBtn');
      if (this.assistant.currentOptimizedPrompt) {
        promptBtn.style.display = 'inline-block';
      } else {
        promptBtn.style.display = 'none';
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
      
      // プロンプトボタンを非表示
      const promptBtn = document.getElementById('showOptimizedPromptBtn');
      if (promptBtn) {
        promptBtn.style.display = 'none';
      }
      
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
              
              // NaNや無効な値をチェック
              if (isNaN(x) || isNaN(y) || isNaN(z) || 
                  !isFinite(x) || !isFinite(y) || !isFinite(z)) {
                this.assistant.log('warn', `無効な頂点データを検出（行${i+1}）`, { 
                  line: line,
                  x: x, y: y, z: z 
                });
                invalidVertexCount++;
                // 無効な頂点は原点に置き換え
                cleanedLines.push(`v 0.0 0.0 0.0`);
              } else {
                // 座標値を適切な範囲に制限（-1000 ～ 1000）
                const clampedX = Math.max(-1000, Math.min(1000, x));
                const clampedY = Math.max(-1000, Math.min(1000, y));
                const clampedZ = Math.max(-1000, Math.min(1000, z));
                cleanedLines.push(`v ${clampedX.toFixed(3)} ${clampedY.toFixed(3)} ${clampedZ.toFixed(3)}`);
                vertexCount++;
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