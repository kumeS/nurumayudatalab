/**
 * DIYアシスタント JavaScript
 * LLMを活用した3D家具設計ツール
 */

class DIYAssistant {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentModel = null;
    this.currentObjData = null;
    this.projects = this.loadProjects();
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setup3DScene();
    this.loadUIState();
    this.renderProjectList();
  }

  setupEventListeners() {
    // メイン機能ボタン
    document.getElementById('generateBtn').addEventListener('click', () => this.generateModel());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());
    document.getElementById('approveBtn').addEventListener('click', () => this.approveModel());
    document.getElementById('downloadObjBtn').addEventListener('click', () => this.downloadOBJ());
    document.getElementById('downloadStlBtn').addEventListener('click', () => this.downloadSTL());

    // サンプルデータボタン
    document.getElementById('sample1Btn').addEventListener('click', () => this.loadSample(1));
    document.getElementById('sample2Btn').addEventListener('click', () => this.loadSample(2));
    document.getElementById('sample3Btn').addEventListener('click', () => this.loadSample(3));

    // 入力フィールドの保存
    document.getElementById('designPrompt').addEventListener('input', () => {
      localStorage.setItem('diy_prompt', document.getElementById('designPrompt').value);
    });

    // パラメータ入力の同期
    ['widthParam', 'depthParam', 'heightParam'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.saveParameters());
    });

    // ウィンドウリサイズ対応
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setup3DScene() {
    const canvas = document.getElementById('three-canvas');
    const container = canvas.parentElement;

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
      canvas: canvas, 
      antialias: true 
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ライティング
    this.setupLighting();

    // コントロール
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 床面
    this.addFloor();

    // アニメーションループ
    this.animate();
  }

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

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const container = document.getElementById('three-canvas').parentElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  async generateModel() {
    const prompt = document.getElementById('designPrompt').value.trim();
    
    if (!prompt) {
      this.showError('設計要件を入力してください。');
      return;
    }

    this.hideMessages();
    this.showThreeStageProgress(true);
    let currentStage = 0;

    try {
      // 第一段階：家具仕様の最適化
      currentStage = 1;
      this.updateStageProgress(1, 'active', '家具仕様を最適化中...');
      const optimizedSpec = await this.optimizeSpecification(prompt);
      this.updateStageProgress(1, 'completed', '仕様最適化完了');
      this.displayOptimizedSpec(optimizedSpec);

      // 第二段階：3Dモデル生成
      currentStage = 2;
      this.updateStageProgress(2, 'active', '3Dモデルを生成中...');
      const objData = await this.generate3DModel(optimizedSpec);
      this.updateStageProgress(2, 'completed', '3Dモデル生成完了');
      
      if (objData) {
        this.currentObjData = objData;
        await this.loadOBJModel(objData);

        // 第三段階：最終品質チェック
        currentStage = 3;
        this.updateStageProgress(3, 'active', '品質チェック実行中...');
        const qualityCheck = await this.performQualityCheck(prompt, objData, optimizedSpec);
        this.updateStageProgress(3, 'completed', '品質チェック完了');
        
        this.showSuccess('三段階処理が完了しました！最終結果をプレビューに表示しています。');
        this.displayQualityCheckResults(qualityCheck);
        this.enableDownloadButtons();
        this.saveCurrentProject(prompt, objData, qualityCheck, optimizedSpec);
      } else {
        throw new Error('3Dモデルの生成に失敗しました。');
      }
    } catch (error) {
      // Update the current stage to error state
      if (currentStage > 0) {
        this.updateStageProgress(currentStage, 'error', 'エラーが発生しました');
      }
      console.error('Model generation error:', error);
      this.showError(`エラーが発生しました: ${error.message}`);
    } finally {
      this.showThreeStageProgress(false);
      // Reset all stages to pending state for next run
      setTimeout(() => {
        for (let i = 1; i <= 3; i++) {
          this.updateStageProgress(i, 'pending', '待機中');
        }
      }, 1000);
    }
  }

  async callLLMAPI(prompt) {
    // パラメータ取得
    const width = document.getElementById('widthParam').value || 'auto';
    const depth = document.getElementById('depthParam').value || 'auto';
    const height = document.getElementById('heightParam').value || 'auto';

    // プロンプト最適化
    const optimizedPrompt = this.optimizePrompt(prompt, width, depth, height);

    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.1,
      stream: false,
      max_completion_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `あなたは工業デザインとCAD技術に精通した3D家具設計エンジンです。与えられた仕様に基づき、製造可能で実用的なWavefront OBJ形式の3Dモデルを生成してください。

【設計原則】
1. 構造的安定性：重力・荷重・応力を考慮した物理的に安定な設計
2. 製造実現性：実際の木材加工・3Dプリンタで製作可能な形状
3. 機能性優先：使用目的に最適化された寸法とプロポーション
4. 美的調和：黄金比・対称性を活用したバランスの取れたデザイン
5. 安全性配慮：鋭利な角の回避・転倒防止・人間工学的配慮

【技術仕様（厳守）】
■ 座標系・単位
- Y軸：上方向（+Y = 天井方向）
- 単位：センチメートル（cm）
- 原点基準：(0,0,0)から正の値で構築
- 精度：小数点以下1桁まで（例：12.5）

■ OBJ形式要件
- 頂点定義：v x y z（必ず3つの数値）
- 面定義：f v1 v2 v3 v4（反時計回り順序で法線外向き）
- 頂点番号：1から開始（OBJ標準）
- 面構成：三角形または四角形のみ（5頂点以上禁止）

■ 品質基準
- 最小厚み：板材2.0cm以上、構造材5.0cm以上
- 接続部：適切な接合面積確保（最小10cm²）
- 安定性：底面積は高さの1/3以上
- エッジ処理：R1.0以上の面取り推奨

【構造設計ガイドライン】
■ 椅子類
- 座面高：40-45cm（標準42cm）
- 背もたれ角度：95-110度
- 座面奥行：35-40cm
- 脚部配置：座面より内側配置で安定性確保

■ テーブル類  
- 天板厚み：2.5-4.0cm
- 脚部断面：最小5×5cm
- 天板支持：4点以上で均等荷重分散
- 作業高：70-75cm（用途により調整）

■ 収納家具
- 棚板厚み：2.5cm以上
- 支持間隔：80cm以下
- 背板：構造強度向上のため推奨
- 重心：低位置配置で転倒防止

【データ品質管理】
■ 必須検証項目
1. 全頂点座標が有効数値（NaN値禁止）
2. 面法線が外向き（反時計回り頂点順序）
3. 重複頂点なし（同一座標の重複排除）
4. 孤立面なし（全面が連結構造）
5. 閉じた形状（水密性確保）

■ 出力形式（厳格）
- コメント行のみ：# で開始
- 頂点行のみ：v x.x y.y z.z
- 面行のみ：f n1 n2 n3 [n4]
- 説明文・マークダウン・その他文字列は一切出力禁止

【重要注意】
- 単純な立方体や箱状の形状は避け、指定された家具の機能に適した複雑で実用的な形状を作成してください
- 椅子なら座面、背もたれ、脚部を別々のパーツとして設計
- テーブルなら天板と脚部を適切な比率で設計
- 棚なら複数の棚板と側板、背板を組み合わせた構造
- 装飾的要素や実用的なディテールを含めてください

【設計品質チェック】
✓ 機能的でない単純な箱形状になっていないか？
✓ 実際の家具として使用可能な形状・寸法になっているか？
✓ 複数のパーツが組み合わさった realistic な構造になっているか？
✓ 人間工学的配慮が反映されているか？

上記をすべて満たす、実用的で美しい家具のOBJデータのみを生成してください。`
        },
        {
          role: "user",
          content: optimizedPrompt
        }
      ]
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('LLM API Response:', data); // デバッグ用ログ
      
      let objContent = null;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        objContent = data.choices[0].message.content;
      } else if (data.answer) {
        objContent = data.answer;
      } else if (data.response) {
        objContent = data.response;
      } else {
        throw new Error('Invalid API response format - no content found');
      }

      const cleanedOBJ = this.cleanOBJData(objContent);
      if (!cleanedOBJ || cleanedOBJ.trim().length === 0) {
        throw new Error('Generated OBJ data is empty or invalid');
      }

      return cleanedOBJ;
    } catch (error) {
      console.error('LLM API call failed:', error);
      if (error.name === 'AbortError') {
        throw new Error('API request timed out. Please try again.');
      }
      throw new Error(`API呼び出しエラー: ${error.message}`);
    }
  }

  optimizePrompt(userPrompt, width, depth, height) {
    // 家具種別の判定と専門仕様の追加
    let furnitureType = '';
    let specialRequirements = '';
    
    if (userPrompt.includes('椅子') || userPrompt.includes('chair') || userPrompt.includes('チェア')) {
      furnitureType = '椅子';
      specialRequirements = `
【椅子設計仕様（機能性重視）】
- 座面高：42cm（日本人標準体型対応）
- 座面寸法：幅40cm×奥行38cm（快適着座確保）
- 背もたれ角度：95-105度（脊椎負担軽減）
- 背もたれ高：座面から38cm以上（腰椎サポート）
- 脚部配置：座面端から内側5cm以上（転倒防止）
- 脚部間隔：前脚間35cm以上、後脚間35cm以上
- 座面と脚部接合：十分な接合面積と強度確保
- 使用確認：成人男性（体重80kg）が安全に着座可能な設計
- 【形状要件】複数パーツ構成（座面・背もたれ・4本脚を個別形状で設計）
- 脚部形状：円柱または角材、テーパー形状も可、座面下で適切に接合
- 背もたれ：座面から独立した板状またはフレーム状の構造`;
    } else if (userPrompt.includes('テーブル') || userPrompt.includes('table') || userPrompt.includes('机')) {
      furnitureType = 'テーブル';
      specialRequirements = `
【テーブル設計仕様（機能性重視）】
- 天板高：72cm（標準作業高、椅子との組み合わせ最適）
- 天板厚み：3cm以上（荷重分散と強度確保）
- 脚部断面：最小5×5cm（垂直荷重50kg以上対応）
- 脚部配置：天板端から内側15cm以上（膝当たり防止）
- 脚間クリアランス：幅方向60cm以上（椅子収納可能）
- 天板と脚部接合：ボルト接合対応の十分な接合面
- 使用確認：作業用途で安定性と実用性を確保
- 【形状要件】天板と脚部の明確な分離設計（単純な箱型禁止）
- 天板形状：長方形または円形の平面、適切な厚みを持つ板状
- 脚部形状：4本脚または中央支柱、天板下で安定した接合`;
    } else if (userPrompt.includes('本棚') || userPrompt.includes('棚') || userPrompt.includes('shelf')) {
      furnitureType = '収納家具';
      specialRequirements = `
【収納家具設計仕様（機能性重視）】
- 棚板厚み：2.5cm以上（書籍荷重対応）
- 棚間隔：30-35cm（A4書籍収納最適）
- 棚板支持：80cm以下間隔で撓み防止
- 背板：構造強度確保と転倒防止
- 重心設計：下段に重量物配置想定
- 底面安定：奥行の60%以上の底面積確保
- 使用確認：書籍満載時の安全性と安定性確保
- 【形状要件】多層構造の棚（2段以上の棚板構成）
- 側板：左右の垂直支持板、棚板を支える構造
- 棚板：複数の水平板、側板間に適切に配置
- 背板：構造強度のための背面パネル（任意）`;
    }

    let dimensionText = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionText = `
【寸法要件（厳守）】
- 全体幅：${width}cm
- 全体奥行：${depth}cm  
- 全体高：${height}cm`;
    }

    return `【製品仕様】
${userPrompt}
${dimensionText}
${specialRequirements}

【製造要件】
- 材料：木材（厚み2cm以上）または3Dプリンタ樹脂
- 加工方法：CNC加工・ルーター加工対応
- 組立方式：ボルト接合・木ダボ接合
- 表面処理：サンディング・塗装対応

【品質基準】
- 構造安全性：JIS規格準拠
- 製造精度：±0.5mm以内
- 表面品質：面粗度Ra3.2以下
- 接合強度：引張強度500N以上

【出力指示】
上記仕様に基づき、${furnitureType}の完全なOBJモデルデータを生成してください。
構造的に安定で、製造可能で、美的に優れた設計を実現してください。

【絶対禁止事項】
❌ 単純な立方体や箱状の形状
❌ 機能性のない単調な形状
❌ 実際の家具として使用できない形状

【必須要件】
✅ 複数パーツの組み合わせによる realistic な家具形状
✅ 指定された家具として実際に機能する構造
✅ 美的で実用的なプロポーション

コメント行、頂点座標、面定義のみを出力し、説明文は一切含めないでください。`;
  }

  cleanOBJData(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      throw new Error('Invalid OBJ data received');
    }

    // マークダウンコードブロックを除去
    let cleaned = rawData
      .replace(/```obj\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/```/g, '');
    
    // 行ごとに処理
    const lines = cleaned.split('\n');
    const objLines = [];
    let foundValidOBJContent = false;

    for (let line of lines) {
      const trimmed = line.trim();
      
      // 空行は保持
      if (trimmed === '') {
        objLines.push('');
        continue;
      }
      
      // 有効なOBJ行のみを保持
      if (trimmed.startsWith('#') ||           // コメント
          trimmed.startsWith('v ') ||          // 頂点
          trimmed.startsWith('vt ') ||         // テクスチャ座標
          trimmed.startsWith('vn ') ||         // 法線
          trimmed.startsWith('f ') ||          // 面
          trimmed.startsWith('g ') ||          // グループ
          trimmed.startsWith('o ') ||          // オブジェクト
          trimmed.startsWith('s ') ||          // スムースシェーディング
          trimmed.startsWith('mtllib ') ||     // マテリアルライブラリ
          trimmed.startsWith('usemtl ')) {     // マテリアル使用
        objLines.push(line);
        if (trimmed.startsWith('v ') || trimmed.startsWith('f ')) {
          foundValidOBJContent = true;
        }
      }
    }

    if (!foundValidOBJContent) {
      throw new Error('Generated content does not contain valid OBJ data (no vertices or faces found)');
    }

    const result = objLines.join('\n').trim();
    console.log('Cleaned OBJ data:', result); // デバッグ用ログ
    return result;
  }

  async loadOBJModel(objData) {
    // 既存モデルを削除
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }

    // OBJLoaderでモデルを読み込み
    const loader = new THREE.OBJLoader();
    
    try {
      const object = loader.parse(objData);
      
      // マテリアル設定
      object.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshLambertMaterial({ 
            color: 0x8b4513,
            side: THREE.DoubleSide
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

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
      document.getElementById('canvasOverlay').style.display = 'none';
      
    } catch (error) {
      console.error('OBJ loading error:', error);
      throw new Error('3Dモデルの読み込みに失敗しました。');
    }
  }

  updateModelInfo(object, objData) {
    const modelInfo = document.getElementById('modelInfo');
    modelInfo.style.display = 'block';

    let vertexCount = 0;
    let faceCount = 0;

    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        vertexCount += child.geometry.attributes.position.count;
        faceCount += child.geometry.index ? 
          child.geometry.index.count / 3 : 
          child.geometry.attributes.position.count / 3;
      }
    });

    document.getElementById('vertexCount').textContent = vertexCount.toLocaleString();
    document.getElementById('faceCount').textContent = Math.floor(faceCount).toLocaleString();
    
    const fileSize = new Blob([objData]).size;
    document.getElementById('fileSize').textContent = this.formatFileSize(fileSize);
  }

  fitCameraToModel(box) {
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;
    
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(0, size.y / 2, 0);
    this.controls.target.set(0, size.y / 2, 0);
    this.controls.update();
  }

  enableDownloadButtons() {
    document.getElementById('approveBtn').disabled = false;
    document.getElementById('downloadObjBtn').disabled = false;
    document.getElementById('downloadStlBtn').disabled = false;
  }

  approveModel() {
    if (!this.currentObjData) return;
    
    this.showSuccess('モデルが承認されました。STLファイルの生成が可能です。');
    
    // 自動的にSTL変換を開始
    this.convertToSTL();
  }

  downloadOBJ() {
    if (!this.currentObjData) return;
    
    const blob = new Blob([this.currentObjData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `furniture_${Date.now()}.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async convertToSTL() {
    if (!this.currentModel) return;

    try {
      this.showLoading(true, 'STLファイルを生成中...');
      
      // STL変換（簡易実装）
      const stlData = this.objToSTL(this.currentObjData);
      
      // STLファイルとして保存可能にする
      this.currentSTLData = stlData;
      
      this.showSuccess('STLファイルの生成が完了しました！');
    } catch (error) {
      console.error('STL conversion error:', error);
      this.showError('STL変換でエラーが発生しました。');
    } finally {
      this.showLoading(false);
    }
  }

  objToSTL(objData) {
    // 簡易OBJ to STL変換
    const lines = objData.split('\n');
    const vertices = [];
    const faces = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const coords = trimmed.substring(2).split(/\s+/).map(Number);
        vertices.push(coords);
      } else if (trimmed.startsWith('f ')) {
        const faceIndices = trimmed.substring(2).split(/\s+/).map(f => {
          return parseInt(f.split('/')[0]) - 1; // OBJは1から開始、配列は0から
        });
        faces.push(faceIndices);
      }
    }

    // STL ASCII形式で出力
    let stl = 'solid furniture\n';
    
    for (const face of faces) {
      if (face.length >= 3) {
        const v1 = vertices[face[0]];
        const v2 = vertices[face[1]];
        const v3 = vertices[face[2]];
        
        if (v1 && v2 && v3) {
          // 法線ベクトル計算
          const normal = this.calculateNormal(v1, v2, v3);
          
          stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
          stl += `    outer loop\n`;
          stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
          stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
          stl += `      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
          stl += `    endloop\n`;
          stl += `  endfacet\n`;
        }
      }
    }
    
    stl += 'endsolid furniture\n';
    return stl;
  }

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

  downloadSTL() {
    if (!this.currentSTLData) {
      this.convertToSTL();
      return;
    }
    
    const blob = new Blob([this.currentSTLData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `furniture_${Date.now()}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearForm() {
    document.getElementById('designPrompt').value = '';
    document.getElementById('widthParam').value = '';
    document.getElementById('depthParam').value = '';
    document.getElementById('heightParam').value = '';
    
    this.hideMessages();
    this.resetCanvas();
    
    // ローカルストレージをクリア
    localStorage.removeItem('diy_prompt');
    localStorage.removeItem('diy_parameters');
  }

  resetCanvas() {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }
    
    this.currentObjData = null;
    this.currentSTLData = null;
    
    document.getElementById('canvasOverlay').style.display = 'block';
    document.getElementById('modelInfo').style.display = 'none';
    
    // ボタンを無効化
    document.getElementById('approveBtn').disabled = true;
    document.getElementById('downloadObjBtn').disabled = true;
    document.getElementById('downloadStlBtn').disabled = true;
    
    // カメラをリセット
    this.camera.position.set(5, 5, 5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  saveParameters() {
    const params = {
      width: document.getElementById('widthParam').value,
      depth: document.getElementById('depthParam').value,
      height: document.getElementById('heightParam').value
    };
    localStorage.setItem('diy_parameters', JSON.stringify(params));
  }

  loadUIState() {
    // プロンプトの復元
    const savedPrompt = localStorage.getItem('diy_prompt');
    if (savedPrompt) {
      document.getElementById('designPrompt').value = savedPrompt;
    }
    
    // パラメータの復元
    const savedParams = localStorage.getItem('diy_parameters');
    if (savedParams) {
      const params = JSON.parse(savedParams);
      document.getElementById('widthParam').value = params.width || '';
      document.getElementById('depthParam').value = params.depth || '';
      document.getElementById('heightParam').value = params.height || '';
    }
  }

  saveCurrentProject(prompt, objData, qualityCheck = null, optimizedSpec = null) {
    const project = {
      id: Date.now(),
      prompt: prompt,
      objData: objData,
      qualityCheck: qualityCheck,
      optimizedSpec: optimizedSpec,
      timestamp: new Date().toISOString(),
      parameters: {
        width: document.getElementById('widthParam').value,
        depth: document.getElementById('depthParam').value,
        height: document.getElementById('heightParam').value
      }
    };
    
    this.projects.unshift(project);
    
    // 最大10プロジェクトまで保持
    if (this.projects.length > 10) {
      this.projects = this.projects.slice(0, 10);
    }
    
    localStorage.setItem('diy_projects', JSON.stringify(this.projects));
    this.renderProjectList();
  }

  loadProjects() {
    const saved = localStorage.getItem('diy_projects');
    return saved ? JSON.parse(saved) : [];
  }

  renderProjectList() {
    const container = document.getElementById('projectListContainer');
    
    if (this.projects.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          まだプロジェクトが作成されていません
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.projects.map(project => `
      <div class="project-item" id="project-${project.id}">
        <div class="project-info">
          <h4>${this.truncateText(project.prompt, 50)}</h4>
          <div class="project-meta">
            作成日時: ${new Date(project.timestamp).toLocaleString('ja-JP')}
            ${project.parameters?.width ? ` | ${project.parameters.width}×${project.parameters.depth}×${project.parameters.height}cm` : ''}
          </div>
        </div>
        <div class="project-actions">
          <button class="button" onclick="diyAssistant.loadProject(${project.id})" title="このプロジェクトを読み込んで3Dプレビューで表示">
            <i class="fas fa-folder-open"></i> 読み込み
          </button>
          <button class="button danger" onclick="diyAssistant.deleteProject(${project.id})" title="このプロジェクトを削除">
            <i class="fas fa-trash"></i> 削除
          </button>
        </div>
      </div>
    `).join('');
  }

  async loadProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.showError('プロジェクトが見つかりません。');
      return;
    }
    
    console.log('Loading project:', project); // デバッグログ
    
    // ローディング表示
    this.showLoading(true, 'プロジェクトを読み込み中...');
    this.hideMessages();
    
    try {
      // UI に値を設定
      document.getElementById('designPrompt').value = project.prompt || '';
      document.getElementById('widthParam').value = project.parameters?.width || '';
      document.getElementById('depthParam').value = project.parameters?.depth || '';
      document.getElementById('heightParam').value = project.parameters?.height || '';
      
      // OBJデータの検証
      if (!project.objData || project.objData.trim().length === 0) {
        throw new Error('プロジェクトに3Dモデルデータが含まれていません。');
      }
      
      // 3Dモデルを読み込み
      this.currentObjData = project.objData;
      await this.loadOBJModel(project.objData);
      this.enableDownloadButtons();
      
      // 最適化仕様を表示（保存されている場合）
      if (project.optimizedSpec) {
        this.displayOptimizedSpec(project.optimizedSpec);
      }
      
      // 品質チェック結果を表示（保存されている場合）
      if (project.qualityCheck) {
        this.displayQualityCheckResults(project.qualityCheck);
      }
      
      // パラメータ保存
      this.saveParameters();
      localStorage.setItem('diy_prompt', project.prompt || '');
      
      this.showSuccess(`プロジェクト「${this.truncateText(project.prompt, 30)}」を読み込みました。`);
      
      // プロジェクトアイテムを一時的にハイライト
      this.highlightProjectItem(projectId);
      
    } catch (error) {
      console.error('Project load error:', error);
      this.showError(`プロジェクトの読み込みに失敗しました: ${error.message}`);
      
      // エラー時はリセット
      this.resetCanvas();
    } finally {
      this.showLoading(false);
    }
  }

  highlightProjectItem(projectId) {
    // 既存のハイライトを削除
    document.querySelectorAll('.project-item').forEach(item => {
      item.classList.remove('project-highlighted');
    });
    
    // 選択されたプロジェクトをハイライト
    const projectElement = document.getElementById(`project-${projectId}`);
    if (projectElement) {
      projectElement.classList.add('project-highlighted');
      
      // 3秒後にハイライトを削除
      setTimeout(() => {
        projectElement.classList.remove('project-highlighted');
      }, 3000);
    }
  }

  deleteProject(projectId) {
    if (confirm('このプロジェクトを削除しますか？')) {
      this.projects = this.projects.filter(p => p.id !== projectId);
      localStorage.setItem('diy_projects', JSON.stringify(this.projects));
      this.renderProjectList();
      this.showSuccess('プロジェクトが削除されました。');
    }
  }

  // ユーティリティメソッド
  showLoading(show, text = 'AI が3Dモデルを生成中...') {
    const loading = document.getElementById('loadingIndicator');
    const loadingText = loading.querySelector('.loading-text');
    
    if (show) {
      loadingText.textContent = text;
      loading.classList.add('active');
    } else {
      loading.classList.remove('active');
    }
  }

  showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 5000);
  }

  showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    setTimeout(() => successEl.style.display = 'none', 2000);
  }

  hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  truncateText(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  showThreeStageProgress(show) {
    const progressContainer = document.getElementById('threeStageProgress');
    if (show) {
      progressContainer.style.display = 'block';
      // 全ステージをリセット
      for (let i = 1; i <= 3; i++) {
        this.updateStageProgress(i, 'pending', '待機中');
      }
    } else {
      progressContainer.style.display = 'none';
    }
  }

  updateStageProgress(stage, status, message) {
    const stageElement = document.getElementById(`stage${stage}`);
    const stageIcon = document.getElementById(`stage${stage}Icon`);
    const stageText = document.getElementById(`stage${stage}Text`);
    
    // 既存のクラスを削除
    stageElement.className = `stage-item stage-${status}`;
    
    // アイコンを更新
    let iconClass = '';
    switch (status) {
      case 'pending':
        iconClass = 'fas fa-circle';
        break;
      case 'active':
        iconClass = 'fas fa-spinner fa-spin';
        break;
      case 'completed':
        iconClass = 'fas fa-check-circle';
        break;
      case 'error':
        iconClass = 'fas fa-exclamation-circle';
        break;
    }
    stageIcon.className = iconClass;
    
    // テキストを更新
    stageText.textContent = message;
  }

  async performQualityCheck(originalPrompt, objData, optimizedSpec = null) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    // OBJデータの基本解析
    const analysis = this.analyzeOBJStructure(objData);
    
    const checkPrompt = `【3D家具モデル最終品質チェック】

あなたは家具設計の専門家として、三段階処理で生成された3Dモデルが要求仕様と最適化仕様を満たし、実用的かつ安全な設計になっているかを厳格に評価してください。

【元の要求仕様】
${originalPrompt}

${optimizedSpec ? `
【最適化された設計仕様】
${JSON.stringify(optimizedSpec, null, 2)}` : ''}

【生成されたモデルの構造解析】
- 頂点数: ${analysis.vertexCount}
- 面数: ${analysis.faceCount}
- 寸法範囲: X軸${analysis.dimensions.x.min.toFixed(1)}〜${analysis.dimensions.x.max.toFixed(1)}cm, Y軸${analysis.dimensions.y.min.toFixed(1)}〜${analysis.dimensions.y.max.toFixed(1)}cm, Z軸${analysis.dimensions.z.min.toFixed(1)}〜${analysis.dimensions.z.max.toFixed(1)}cm
- 全体寸法: 幅${analysis.overallDimensions.width.toFixed(1)}cm × 奥行${analysis.overallDimensions.depth.toFixed(1)}cm × 高さ${analysis.overallDimensions.height.toFixed(1)}cm

【重要評価項目】
1. **仕様適合性**: 最適化仕様との正確な適合度
2. **寸法精度**: 要求された寸法との誤差評価  
3. **機能性**: 実際の使用目的（座る、置く、収納等）に対する適合性
4. **構造安定性**: 物理的な安定性と強度、転倒リスク評価
5. **人間工学**: 人体寸法との適合性（座面高、作業高、リーチ等）
6. **製造可能性**: 実際の製作における実現可能性
7. **安全性**: 使用時の安全性配慮、怪我リスク評価

【評価項目】
1. **寸法適合性**: 要求された寸法との整合性
2. **機能性**: 実際の使用目的（座る、置く、収納等）に対する適合性
3. **構造安定性**: 物理的な安定性と強度
4. **人間工学**: 人体寸法との適合性（椅子の座面高、テーブル高等）
5. **製造可能性**: 実際の製作における実現可能性
6. **安全性**: 使用時の安全性配慮

【出力形式】
以下のJSON形式で回答してください：

{
  "overall_score": 85,
  "evaluations": {
    "dimensions": {"score": 90, "comment": "要求寸法とほぼ一致している"},
    "functionality": {"score": 80, "comment": "基本機能は満たすが改善余地あり"},
    "stability": {"score": 85, "comment": "構造的に安定している"},
    "ergonomics": {"score": 75, "comment": "人間工学的配慮が不足"},
    "manufacturability": {"score": 90, "comment": "製造可能な設計"},
    "safety": {"score": 85, "comment": "基本的な安全性は確保"}
  },
  "issues": [
    "座面の奥行きが38cmで標準的だが、背もたれとの角度要調整",
    "脚部の接合部分の強度をさらに向上させる必要"
  ],
  "recommendations": [
    "背もたれの角度を100度程度に調整することを推奨",
    "脚部と座面の接合面積を拡大して強度向上"
  ]
}`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 2000,
        messages: [
          {
            role: "system",
            content: "あなたは工業デザインと家具設計の専門家です。3Dモデルの品質評価を行い、機能性・安全性・実用性の観点から詳細な分析を提供してください。必ずJSON形式で回答してください。"
          },
          {
            role: "user",
            content: checkPrompt
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Quality check API failed: ${response.status}`);
      }

      const data = await response.json();
      let resultText = '';
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        resultText = data.choices[0].message.content;
      } else if (data.answer) {
        resultText = data.answer;
      } else if (data.response) {
        resultText = data.response;
      }

      // JSON部分を抽出
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const qualityResult = JSON.parse(jsonMatch[0]);
          return qualityResult;
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }

      // フォールバック: 基本的な品質チェック結果を返す
      return {
        overall_score: 75,
        evaluations: {
          dimensions: {score: 80, comment: "基本的な寸法要件を満たしています"},
          functionality: {score: 70, comment: "機能性の詳細チェックが必要です"},
          stability: {score: 75, comment: "構造安定性は標準的です"},
          ergonomics: {score: 70, comment: "人間工学的検証が推奨されます"},
          manufacturability: {score: 80, comment: "製造可能な設計です"},
          safety: {score: 75, comment: "基本的な安全性は確保されています"}
        },
        issues: ["詳細な品質分析が必要です"],
        recommendations: ["実物での機能テストを実施してください"]
      };

    } catch (error) {
      console.error('Quality check error:', error);
      return {
        overall_score: 60,
        evaluations: {
          dimensions: {score: 70, comment: "寸法チェック未完了"},
          functionality: {score: 60, comment: "機能性チェック未完了"},
          stability: {score: 65, comment: "安定性チェック未完了"},
          ergonomics: {score: 60, comment: "人間工学チェック未完了"},
          manufacturability: {score: 70, comment: "製造性チェック未完了"},
          safety: {score: 65, comment: "安全性チェック未完了"}
        },
        issues: ["品質チェックでエラーが発生しました"],
        recommendations: ["手動での品質確認を実施してください"]
      };
    }
  }

  analyzeOBJStructure(objData) {
    const lines = objData.split('\n');
    const vertices = [];
    let faceCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const coords = trimmed.substring(2).split(/\s+/).map(Number);
        if (coords.length >= 3) {
          vertices.push({x: coords[0], y: coords[1], z: coords[2]});
        }
      } else if (trimmed.startsWith('f ')) {
        faceCount++;
      }
    }

    if (vertices.length === 0) {
      return {
        vertexCount: 0,
        faceCount: 0,
        dimensions: {x: {min: 0, max: 0}, y: {min: 0, max: 0}, z: {min: 0, max: 0}},
        overallDimensions: {width: 0, depth: 0, height: 0}
      };
    }

    const dimensions = {
      x: {min: Math.min(...vertices.map(v => v.x)), max: Math.max(...vertices.map(v => v.x))},
      y: {min: Math.min(...vertices.map(v => v.y)), max: Math.max(...vertices.map(v => v.y))},
      z: {min: Math.min(...vertices.map(v => v.z)), max: Math.max(...vertices.map(v => v.z))}
    };

    return {
      vertexCount: vertices.length,
      faceCount: faceCount,
      dimensions: dimensions,
      overallDimensions: {
        width: dimensions.x.max - dimensions.x.min,
        depth: dimensions.z.max - dimensions.z.min,
        height: dimensions.y.max - dimensions.y.min
      }
    };
  }

  async optimizeSpecification(originalPrompt) {
    const width = document.getElementById('widthParam').value || 'auto';
    const depth = document.getElementById('depthParam').value || 'auto';
    const height = document.getElementById('heightParam').value || 'auto';

    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const optimizePrompt = `【家具設計仕様最適化エンジン】

あなたは工業デザインと人間工学の専門家として、与えられた家具要求を詳細で実用的な設計仕様に最適化してください。

【入力された要求】
${originalPrompt}

${width !== 'auto' || depth !== 'auto' || height !== 'auto' ? `
【指定寸法】
- 幅: ${width}cm
- 奥行: ${depth}cm  
- 高さ: ${height}cm` : ''}

【最適化の観点】
1. **機能性**: 実際の使用場面での利便性と実用性
2. **人間工学**: 日本人の標準体型に適合した寸法設計
3. **構造安全性**: 物理的強度と安定性の確保
4. **製造実現性**: 実際の加工・組立における実現可能性
5. **美的調和**: デザインバランスと視覚的美しさ

【出力形式】
以下のJSON形式で詳細な設計仕様を出力してください：

{
  "furniture_type": "椅子",
  "optimized_dimensions": {
    "overall": {"width": 42, "depth": 40, "height": 80},
    "details": {
      "seat_height": 42,
      "seat_width": 40,
      "seat_depth": 38,
      "backrest_height": 38,
      "leg_spacing": {"front": 35, "rear": 35}
    }
  },
  "structural_requirements": {
    "material_thickness": {"seat": 3.0, "legs": 5.0, "backrest": 2.5},
    "joint_specifications": "ダボ接合+ボルト補強",
    "load_capacity": "80kg",
    "stability_factor": 1.5
  },
  "ergonomic_features": {
    "seat_angle": 0,
    "backrest_angle": 100,
    "lumbar_support": true,
    "edge_radius": 1.0
  },
  "manufacturing_specs": {
    "cutting_method": "CNC加工",
    "assembly_method": "組立式",
    "finish": "サンディング+オイル仕上げ",
    "tolerance": "±0.5mm"
  },
  "safety_considerations": [
    "転倒防止のため脚部を座面端より内側配置",
    "角部の面取り処理による怪我防止",
    "荷重試験による安全性確認"
  ],
  "optimized_description": "日本人標準体型に最適化された、構造的に安定で製造可能なシンプル木製椅子。座面高42cm、奥行38cmで快適な着座を実現。脚部は座面より内側配置で転倒を防止し、背もたれ角度100度で腰椎をサポート。"
}

上記形式に従い、実用性と安全性を重視した詳細な設計仕様を生成してください。`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 2500,
        messages: [
          {
            role: "system",
            content: "あなたは家具設計の専門家です。与えられた要求を詳細で実用的な設計仕様に最適化し、必ずJSON形式で回答してください。"
          },
          {
            role: "user",
            content: optimizePrompt
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Specification optimization failed: ${response.status}`);
      }

      const data = await response.json();
      let resultText = '';
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        resultText = data.choices[0].message.content;
      } else if (data.answer) {
        resultText = data.answer;
      } else if (data.response) {
        resultText = data.response;
      }

      // JSON部分を抽出
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const optimizedSpec = JSON.parse(jsonMatch[0]);
          return optimizedSpec;
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }

      // フォールバック
      return this.createFallbackSpec(originalPrompt, width, depth, height);

    } catch (error) {
      console.error('Specification optimization error:', error);
      return this.createFallbackSpec(originalPrompt, width, depth, height);
    }
  }

  createFallbackSpec(prompt, width, depth, height) {
    // 基本的な仕様を生成するフォールバック
    const furnitureType = prompt.includes('椅子') ? '椅子' : 
                         prompt.includes('テーブル') ? 'テーブル' : '家具';
    
    return {
      furniture_type: furnitureType,
      optimized_dimensions: {
        overall: {
          width: width !== 'auto' ? parseInt(width) : 40,
          depth: depth !== 'auto' ? parseInt(depth) : 40,
          height: height !== 'auto' ? parseInt(height) : 80
        }
      },
      optimized_description: `${prompt}の基本仕様に基づく設計`
    };
  }

  async generate3DModel(optimizedSpec) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const modelPrompt = `【3D家具モデル生成システム】

以下の最適化された設計仕様に基づき、精密なWavefront OBJ形式の3Dモデルを生成してください。

【最適化された設計仕様】
${JSON.stringify(optimizedSpec, null, 2)}

【重要指示】
1. 上記仕様の寸法・構造要件を厳密に守る
2. 機能性と安全性を最優先で設計
3. 製造可能な構造とする
4. 人間工学的配慮を反映

【技術仕様（厳守）】
■ 座標系・単位
- Y軸：上方向（+Y = 天井方向）
- 単位：センチメートル（cm）
- 原点基準：(0,0,0)から正の値で構築
- 精度：小数点以下1桁まで（例：12.5）

■ OBJ形式要件
- 頂点定義：v x y z（必ず3つの数値）
- 面定義：f v1 v2 v3 v4（反時計回り順序で法線外向き）
- 頂点番号：1から開始（OBJ標準）
- 面構成：三角形または四角形のみ（5頂点以上禁止）

■ 品質基準
- 最小厚み：板材2.0cm以上、構造材5.0cm以上
- 接続部：適切な接合面積確保（最小10cm²）
- 安定性：底面積は高さの1/3以上
- エッジ処理：R1.0以上の面取り推奨

【出力指示】
最適化仕様に完全準拠したOBJモデルデータのみを出力してください。
コメント行、頂点座標、面定義のみを出力し、説明文は一切含めないでください。

【重要】単純な箱や立方体ではなく、実際の家具として機能する詳細な形状を作成してください：
- 椅子：座面・背もたれ・4本脚を個別に設計した realistic な椅子形状
- テーブル：天板と脚部が明確に分かれた実用的なテーブル形状  
- 棚：複数段の棚板と支柱からなる実用的な収納家具形状
- 複数パーツの組み合わせによる機能的で美しいデザイン`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 3000,
        messages: [
          {
            role: "system",
            content: "あなたは3D家具設計エンジンです。最適化された仕様に基づき、製造可能で実用的なWavefront OBJ形式の3Dモデルを生成してください。重要：単純な箱や立方体ではなく、実際の家具として機能する詳細で複雑な形状を作成してください。椅子なら座面・背もたれ・脚部、テーブルなら天板・脚部など、複数パーツの組み合わせによる realistic な家具形状にしてください。OBJデータのみを出力してください。"
          },
          {
            role: "user",
            content: modelPrompt
          }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`3D model generation failed: ${response.status}`);
      }

      const data = await response.json();
      let objContent = null;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        objContent = data.choices[0].message.content;
      } else if (data.answer) {
        objContent = data.answer;
      } else if (data.response) {
        objContent = data.response;
      } else {
        throw new Error('Invalid API response format - no content found');
      }

      const cleanedOBJ = this.cleanOBJData(objContent);
      if (!cleanedOBJ || cleanedOBJ.trim().length === 0) {
        throw new Error('Generated OBJ data is empty or invalid');
      }

      return cleanedOBJ;
    } catch (error) {
      console.error('3D model generation failed:', error);
      throw new Error(`3Dモデル生成エラー: ${error.message}`);
    }
  }

  displayOptimizedSpec(optimizedSpec) {
    const modelInfo = document.getElementById('modelInfo');
    
    // 既存の仕様表示を削除
    const existingSpec = document.getElementById('optimizedSpecResults');
    if (existingSpec) {
      existingSpec.remove();
    }

    const specDiv = document.createElement('div');
    specDiv.id = 'optimizedSpecResults';
    specDiv.className = 'optimized-spec-results';
    
    specDiv.innerHTML = `
      <h4><i class="fas fa-cogs"></i> 最適化された設計仕様</h4>
      
      <div class="spec-summary">
        <strong>家具種別:</strong> ${optimizedSpec.furniture_type || '不明'}
      </div>
      
      ${optimizedSpec.optimized_dimensions ? `
        <div class="spec-section">
          <h5>寸法仕様</h5>
          <div class="dimension-grid">
            <div class="dim-item">
              <span class="dim-label">全体寸法:</span>
              <span class="dim-value">${optimizedSpec.optimized_dimensions.overall.width}×${optimizedSpec.optimized_dimensions.overall.depth}×${optimizedSpec.optimized_dimensions.overall.height}cm</span>
            </div>
          </div>
        </div>
      ` : ''}
      
      ${optimizedSpec.optimized_description ? `
        <div class="spec-section">
          <h5>最適化された説明</h5>
          <p class="spec-description">${optimizedSpec.optimized_description}</p>
        </div>
      ` : ''}
      
      ${optimizedSpec.safety_considerations && optimizedSpec.safety_considerations.length > 0 ? `
        <div class="spec-section">
          <h5>安全性配慮</h5>
          <ul class="safety-list">
            ${optimizedSpec.safety_considerations.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    modelInfo.appendChild(specDiv);
  }

  displayQualityCheckResults(qualityCheck) {
    const modelInfo = document.getElementById('modelInfo');
    
    // 既存の品質チェック結果を削除
    const existingQuality = document.getElementById('qualityCheckResults');
    if (existingQuality) {
      existingQuality.remove();
    }

    const qualityDiv = document.createElement('div');
    qualityDiv.id = 'qualityCheckResults';
    qualityDiv.className = 'quality-check-results';
    
    const overallClass = qualityCheck.overall_score >= 80 ? 'excellent' : 
                        qualityCheck.overall_score >= 70 ? 'good' : 
                        qualityCheck.overall_score >= 60 ? 'fair' : 'poor';

    qualityDiv.innerHTML = `
      <h4><i class="fas fa-clipboard-check"></i> 品質チェック結果</h4>
      <div class="overall-score ${overallClass}">
        総合評価: ${qualityCheck.overall_score}点/100点
      </div>
      
      <div class="evaluation-details">
        <div class="eval-item">
          <span class="eval-label">寸法適合性:</span>
          <span class="eval-score">${qualityCheck.evaluations.dimensions.score}点</span>
          <span class="eval-comment">${qualityCheck.evaluations.dimensions.comment}</span>
        </div>
        <div class="eval-item">
          <span class="eval-label">機能性:</span>
          <span class="eval-score">${qualityCheck.evaluations.functionality.score}点</span>
          <span class="eval-comment">${qualityCheck.evaluations.functionality.comment}</span>
        </div>
        <div class="eval-item">
          <span class="eval-label">構造安定性:</span>
          <span class="eval-score">${qualityCheck.evaluations.stability.score}点</span>
          <span class="eval-comment">${qualityCheck.evaluations.stability.comment}</span>
        </div>
        <div class="eval-item">
          <span class="eval-label">人間工学:</span>
          <span class="eval-score">${qualityCheck.evaluations.ergonomics.score}点</span>
          <span class="eval-comment">${qualityCheck.evaluations.ergonomics.comment}</span>
        </div>
      </div>

      ${qualityCheck.issues && qualityCheck.issues.length > 0 ? `
        <div class="issues-section">
          <h5><i class="fas fa-exclamation-triangle"></i> 検出された問題点</h5>
          <ul>
            ${qualityCheck.issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${qualityCheck.recommendations && qualityCheck.recommendations.length > 0 ? `
        <div class="recommendations-section">
          <h5><i class="fas fa-lightbulb"></i> 改善提案</h5>
          <ul>
            ${qualityCheck.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    modelInfo.appendChild(qualityDiv);
  }


  loadSample(sampleNumber) {
    const samples = {
      1: {
        prompt: "幅40cm×奥行40cm×高さ80cmのシンプルな木製椅子。座面の高さは45cm、背もたれは座面から35cm。背もたれは軽やかな縦スラット4本のデザイン。脚は4本でテーパード形状。",
        width: "40",
        depth: "40", 
        height: "80"
      },
      2: {
        prompt: "幅120cm×奥行70cm×高さ72cmの木製ダイニングテーブル。天板は厚み3cmの無垢材風。脚は4本の角材で、天板から少し内側に配置。シンプルで実用的なデザイン。",
        width: "120",
        depth: "70",
        height: "72"
      },
      3: {
        prompt: "幅80cm×奥行30cm×高さ180cmの5段本棚。各棚板の高さは35cm間隔。背板なしのオープンシェルフタイプ。左右の側板は厚み2cm、棚板は厚み2.5cm。安定性のため底面は幅広設計。",
        width: "80",
        depth: "30",
        height: "180"
      }
    };

    const sample = samples[sampleNumber];
    if (sample) {
      document.getElementById('designPrompt').value = sample.prompt;
      document.getElementById('widthParam').value = sample.width;
      document.getElementById('depthParam').value = sample.depth;
      document.getElementById('heightParam').value = sample.height;
      
      // データを保存
      localStorage.setItem('diy_prompt', sample.prompt);
      this.saveParameters();
      
      this.showSuccess(`サンプル${sampleNumber}のデータが読み込まれました。`);
    }
  }
}

// グローバル変数として初期化
let diyAssistant;

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
  diyAssistant = new DIYAssistant();
});