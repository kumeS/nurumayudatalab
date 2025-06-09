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

    this.showLoading(true);
    this.hideMessages();

    try {
      // LLM APIを呼び出してOBJデータを生成
      const objData = await this.callLLMAPI(prompt);
      
      if (objData) {
        this.currentObjData = objData;
        await this.loadOBJModel(objData);
        this.showSuccess('3Dモデルの生成が完了しました！');
        this.enableDownloadButtons();
        this.saveCurrentProject(prompt, objData);
      } else {
        throw new Error('3Dモデルの生成に失敗しました。');
      }
    } catch (error) {
      console.error('Model generation error:', error);
      this.showError(`エラーが発生しました: ${error.message}`);
    } finally {
      this.showLoading(false);
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
      temperature: 0.3,
      stream: false,
      max_completion_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `あなたは3D家具設計エンジンです。ユーザーの要求に基づいて、正確なWavefront OBJ形式の3Dモデルデータを生成してください。

重要な要件：
1. 完全なOBJ形式で出力（# コメント、v 頂点、f 面定義）
2. 座標系：Y軸が上方向、単位はセンチメートル
3. 家具として実用的な形状とプロポーション
4. 面は三角形または四角形のみ使用
5. 頂点番号は1から開始
6. 説明文は含めず、OBJデータのみ出力

出力例：
# Generated furniture model
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 1.0 1.0 0.0
f 1 2 3`
        },
        {
          role: "user",
          content: optimizedPrompt
        }
      ]
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return this.cleanOBJData(data.choices[0].message.content);
      } else if (data.answer) {
        return this.cleanOBJData(data.answer);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw error;
    }
  }

  optimizePrompt(userPrompt, width, depth, height) {
    let prompt = `以下の家具を3Dモデル化してください：

${userPrompt}

寸法指定：
- 幅: ${width}cm
- 奥行: ${depth}cm  
- 高さ: ${height}cm

要求事項：
- 実用的で安定した構造
- 適切なプロポーション
- 家具として機能的な形状
- 製作可能なデザイン

正確なOBJ形式で出力してください。`;

    return prompt;
  }

  cleanOBJData(rawData) {
    // コードブロックのマークアップを除去
    let cleaned = rawData.replace(/```obj\s*/g, '').replace(/```\s*/g, '');
    
    // 説明文を除去（OBJ形式以外の行）
    const lines = cleaned.split('\n');
    const objLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('#') || 
             trimmed.startsWith('v ') || 
             trimmed.startsWith('vt ') || 
             trimmed.startsWith('vn ') || 
             trimmed.startsWith('f ') || 
             trimmed.startsWith('g ') || 
             trimmed.startsWith('o ') ||
             trimmed === '';
    });

    return objLines.join('\n');
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

  saveCurrentProject(prompt, objData) {
    const project = {
      id: Date.now(),
      prompt: prompt,
      objData: objData,
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
      <div class="project-item">
        <div class="project-info">
          <h4>${this.truncateText(project.prompt, 50)}</h4>
          <div class="project-meta">
            作成日時: ${new Date(project.timestamp).toLocaleString('ja-JP')}
            ${project.parameters.width ? ` | ${project.parameters.width}×${project.parameters.depth}×${project.parameters.height}cm` : ''}
          </div>
        </div>
        <div class="project-actions">
          <button class="button" onclick="diyAssistant.loadProject(${project.id})">
            <i class="fas fa-folder-open"></i> 読み込み
          </button>
          <button class="button danger" onclick="diyAssistant.deleteProject(${project.id})">
            <i class="fas fa-trash"></i> 削除
          </button>
        </div>
      </div>
    `).join('');
  }

  async loadProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;
    
    // UI に値を設定
    document.getElementById('designPrompt').value = project.prompt;
    document.getElementById('widthParam').value = project.parameters.width || '';
    document.getElementById('depthParam').value = project.parameters.depth || '';
    document.getElementById('heightParam').value = project.parameters.height || '';
    
    // 3Dモデルを読み込み
    try {
      this.currentObjData = project.objData;
      await this.loadOBJModel(project.objData);
      this.enableDownloadButtons();
      this.showSuccess('プロジェクトが読み込まれました。');
    } catch (error) {
      this.showError('プロジェクトの読み込みに失敗しました。');
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
    setTimeout(() => successEl.style.display = 'none', 3000);
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
}

// グローバル変数として初期化
let diyAssistant;

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
  diyAssistant = new DIYAssistant();
});