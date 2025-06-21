class GLBViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.orbitControls = null;
        this.currentModel = null;
        this.currentModelName = '';
        
        // Lighting references for dynamic control
        this.directionalLight = null;
        this.directionalLight2 = null;
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        console.log('GLBViewer initialization started');
        const container = document.getElementById('viewer');
        
        if (!container) {
            console.error('Viewer container not found');
            alert('ビューアコンテナが見つかりません。HTMLファイルを確認してください。');
            return;
        }
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(2, 2, 2);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true, 
            preserveDrawingBuffer: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        container.appendChild(this.renderer.domElement);
        
        // WebGLコンテキスト復元のイベントリスナー
        this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGLコンテキストが失われました');
        });
        
        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGLコンテキストが復元されました');
        });
        
        // Lighting - 指向性ライトと補助ライトのみ
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 10.0);
        this.directionalLight.position.set(10, 10, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.scene.add(this.directionalLight);
        
        // 補助ライト
        this.directionalLight2 = new THREE.DirectionalLight(0xffffff, 6.0);
        this.directionalLight2.position.set(-5, 5, -5);
        this.scene.add(this.directionalLight2);
        
        // Controls
        this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.animate();
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadModel(e.target.files[0]);
            }
        });

        // Drag and drop
        const dropZone = document.getElementById('dropZone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            const glbFile = files.find(file => 
                file.name.toLowerCase().endsWith('.glb') || 
                file.name.toLowerCase().endsWith('.gltf')
            );
            
            if (glbFile) {
                this.loadModel(glbFile);
            }
        });

        // Background presets
        document.querySelectorAll('.bg-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                this.setBackground(color);
                this.updateBackgroundUI(color);
            });
        });

        // Color picker
        const colorPicker = document.getElementById('colorPicker');
        colorPicker.addEventListener('change', (e) => {
            this.setBackground(e.target.value);
            this.updateBackgroundUI(e.target.value);
        });

        // Action buttons
        document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());

        // Settings toggle
        document.getElementById('settingsToggle').addEventListener('click', () => this.toggleSettings());

        // Help toggle
        document.getElementById('helpToggle').addEventListener('click', () => this.toggleHelp());

        // Lighting controls
        this.setupLightingControls();
        
        // Lighting presets
        this.setupLightingPresets();
    }

    async loadModel(file) {
        this.showLoading(true);
        
        try {
            const loader = new THREE.GLTFLoader();
            const url = URL.createObjectURL(file);
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });
            
            // Remove previous model
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
            }
            
            // Add new model
            const model = gltf.scene;
            
            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            
            model.position.sub(center);
            model.scale.setScalar(scale);
            
            this.scene.add(model);
            this.currentModel = model;
            this.currentModelName = file.name;
            
            // Update UI
            this.updateModelInfo();
            this.showDropZone(false);
            
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error loading model:', error);
            alert('モデルの読み込みに失敗しました');
        } finally {
            this.showLoading(false);
        }
    }

    setBackground(color) {
        this.scene.background = new THREE.Color(color);
        this.renderer.setClearColor(color);
    }

    updateBackgroundUI(color) {
        document.querySelectorAll('.bg-preset').forEach(preset => {
            preset.classList.toggle('active', preset.dataset.color === color);
        });
        document.getElementById('colorPicker').value = color;
    }

    updateModelInfo() {
        const info = document.getElementById('modelInfo');
        if (info) {
            info.textContent = this.currentModelName;
        }
    }

    takeScreenshot() {
        if (!this.currentModel) {
            alert('スクリーンショットを撮るにはモデルを読み込んでください');
            return;
        }
        
        try {
            // レンダリングを強制実行してからスクリーンショットを撮る
            this.renderer.render(this.scene, this.camera);
            
            // 高品質なスクリーンショットのためにcanvasを再描画
            const canvas = this.renderer.domElement;
            const dataURL = canvas.toDataURL('image/png', 1.0);
            
            // データURLが有効かチェック
            if (dataURL === 'data:,') {
                throw new Error('スクリーンショットの生成に失敗しました');
            }
            
            const link = document.createElement('a');
            const fileName = this.currentModelName ? 
                `${this.currentModelName.replace(/\.(glb|gltf)$/i, '')}_screenshot.png` : 
                'screenshot.png';
            
            link.download = fileName;
            link.href = dataURL;
            link.click();
            
            console.log('スクリーンショットを保存しました:', fileName);
            
        } catch (error) {
            console.error('スクリーンショットエラー:', error);
            alert('スクリーンショットの保存に失敗しました');
        }
    }

    showDropZone(show) {
        const dropZone = document.getElementById('dropZone');
        const settingsToggle = document.getElementById('settingsToggle');
        
        dropZone.classList.toggle('hidden', !show);
        settingsToggle.classList.toggle('hidden', show);
    }

    showControlPanel(show) {
        const panel = document.getElementById('controlPanel');
        if (show) {
            panel.classList.add('show');
        } else {
            panel.classList.remove('show');
        }
    }

    showLoading(show) {
        let loading = document.getElementById('loading');
        
        if (show && !loading) {
            loading = document.createElement('div');
            loading.id = 'loading';
            loading.className = 'loading';
            loading.innerHTML = `
                <div class="spinner"></div>
                <div>モデルを読み込み中...</div>
            `;
            document.body.appendChild(loading);
        } else if (!show && loading) {
            loading.remove();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupLightingControls() {
        // Directional light slider
        const directionalSlider = document.getElementById('directionalSlider');
        const directionalValue = document.getElementById('directionalValue');
        directionalSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.directionalLight.intensity = value;
            directionalValue.textContent = value.toFixed(1);
            this.updatePresetActiveState();
        });

        // Secondary light slider
        const secondarySlider = document.getElementById('secondarySlider');
        const secondaryValue = document.getElementById('secondaryValue');
        secondarySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.directionalLight2.intensity = value;
            secondaryValue.textContent = value.toFixed(1);
            this.updatePresetActiveState();
        });
    }

    setupLightingPresets() {
        const presetButtons = document.querySelectorAll('.preset-button');
        
        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const directionalValue = parseFloat(button.dataset.directional);
                const secondaryValue = parseFloat(button.dataset.secondary);
                
                // Update light intensities
                this.directionalLight.intensity = directionalValue;
                this.directionalLight2.intensity = secondaryValue;
                
                // Update sliders
                const directionalSlider = document.getElementById('directionalSlider');
                const secondarySlider = document.getElementById('secondarySlider');
                const directionalValueSpan = document.getElementById('directionalValue');
                const secondaryValueSpan = document.getElementById('secondaryValue');
                
                directionalSlider.value = directionalValue;
                secondarySlider.value = secondaryValue;
                directionalValueSpan.textContent = directionalValue.toFixed(1);
                secondaryValueSpan.textContent = secondaryValue.toFixed(1);
                
                // Update active state
                presetButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    updatePresetActiveState() {
        const currentDirectional = this.directionalLight.intensity;
        const currentSecondary = this.directionalLight2.intensity;
        const presetButtons = document.querySelectorAll('.preset-button');
        
        // Remove active class from all buttons
        presetButtons.forEach(btn => btn.classList.remove('active'));
        
        // Find matching preset and activate it
        presetButtons.forEach(button => {
            const directionalValue = parseFloat(button.dataset.directional);
            const secondaryValue = parseFloat(button.dataset.secondary);
            
            if (Math.abs(currentDirectional - directionalValue) < 0.1 && 
                Math.abs(currentSecondary - secondaryValue) < 0.1) {
                button.classList.add('active');
            }
        });
    }

    toggleSettings() {
        const controlPanel = document.getElementById('controlPanel');
        controlPanel.classList.toggle('show');
    }

    toggleHelp() {
        const helpPanel = document.getElementById('helpPanel');
        const helpToggle = document.getElementById('helpToggle');
        
        helpPanel.classList.toggle('hidden');
        
        // パネルが表示されている時はボタンの位置を上にずらす
        if (helpPanel.classList.contains('hidden')) {
            helpToggle.classList.remove('shifted');
        } else {
            helpToggle.classList.add('shifted');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}