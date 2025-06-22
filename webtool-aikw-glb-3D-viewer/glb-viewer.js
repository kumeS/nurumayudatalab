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
        
        // Ensure DOM is loaded before initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
                this.setupEventListeners();
                window.glbViewerInitialized = true;
            });
        } else {
            this.init();
            this.setupEventListeners();
            window.glbViewerInitialized = true;
        }
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
        
        // RADICAL SOLUTION: Complete override of 180-degree limitation
        // Remove ALL constraints that cause the 180-degree lock (set to unrestricted)
        this.orbitControls.minPolarAngle = -Infinity;
        this.orbitControls.maxPolarAngle = Infinity; // Unlimited vertical rotation
        this.orbitControls.minAzimuthAngle = -Infinity;
        this.orbitControls.maxAzimuthAngle = Infinity;
        
        // Basic settings
        this.orbitControls.enablePan = true;
        this.orbitControls.enableZoom = true;
        this.orbitControls.enableRotate = true;
        this.orbitControls.rotateSpeed = 1.0;
        this.orbitControls.panSpeed = 1.0;
        this.orbitControls.zoomSpeed = 1.0;
        
        // ABSOLUTE FINAL SOLUTION: Completely disable OrbitControls internal constraints
        console.log('Applying ABSOLUTE FINAL SOLUTION for unlimited vertical rotation...');
        
        // Store reference to controls for easier access
        const controls = this.orbitControls;
        
        // Method 1: Force-override constraint properties
        Object.defineProperty(controls, 'minPolarAngle', {
            // Return unrestricted value so internal clamps are effectively disabled
            get: () => -Infinity,
            set: () => {},
            configurable: false
        });
        Object.defineProperty(controls, 'maxPolarAngle', {
            // Allow unlimited positive range
            get: () => Infinity,
            set: () => {},
            configurable: false
        });
        
        // Method 2: Wrap the original update method to ensure internal clamps always see unrestricted limits
        const originalUpdate = controls.update.bind(controls);
        controls.update = function() {
            // Temporarily ensure min/max are unrestricted (in case internal code tries to modify them)
            const prevMin = this.minPolarAngle;
            const prevMax = this.maxPolarAngle;
            this.minPolarAngle = -Infinity;
            this.maxPolarAngle = Infinity;

            const result = originalUpdate();

            // Restore (though getters already lock them, keep for clarity)
            this.minPolarAngle = prevMin;
            this.maxPolarAngle = prevMax;
            return result;
        };
        
        // Method 3: Deep patch of spherical coordinates system
        setTimeout(() => {
            if (controls.spherical) {
                const spherical = controls.spherical;
                
                // Track cumulative phi rotation for unlimited vertical movement
                let cumulativePhi = Math.PI / 2; // Start at equator
                let lastUpdatePhi = spherical.phi;
                
                // Override makeSafe completely
                spherical.makeSafe = function() {
                    this.radius = Math.max(this.radius, Number.EPSILON);
                    // CRITICAL: Remove phi clamping entirely
                };
                
                // Override setFromVector3 to accumulate phi changes
                const originalSetFromVector3 = spherical.setFromVector3;
                spherical.setFromVector3 = function(vector) {
                    originalSetFromVector3.call(this, vector);
                    
                    // Calculate phi delta and add to cumulative
                    const deltaPhi = this.phi - lastUpdatePhi;
                    if (Math.abs(deltaPhi) < Math.PI) { // Avoid large jumps
                        cumulativePhi += deltaPhi;
                        this.phi = cumulativePhi;
                    }
                    lastUpdatePhi = this.phi;
                    
                    return this;
                };
                
                console.log('Spherical system COMPLETELY patched - no more 180° limits!');
            }
        }, 100);
        
        console.log('ABSOLUTE FINAL PATCH APPLIED: All vertical rotation limits eliminated!');
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.animate();
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        const fileButton = document.getElementById('fileButton');
        
        // Debug: Check if elements exist
        console.log('File input element:', fileInput);
        console.log('File button element:', fileButton);
        
        if (!fileInput) {
            console.error('File input element not found!');
            return;
        }
        
        if (!fileButton) {
            console.error('File button element not found!');
            return;
        }
        
        // File change event
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed:', e.target.files);
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log('Selected file:', file.name, file.type, file.size);
                
                // Validate file type
                const isValidType = file.name.toLowerCase().endsWith('.glb') || 
                                   file.name.toLowerCase().endsWith('.gltf') ||
                                   file.type === 'model/gltf-binary' ||
                                   file.type === 'model/gltf+json';
                
                if (!isValidType) {
                    alert('GLBまたはGLTFファイルを選択してください');
                    fileInput.value = ''; // Clear the input
                    return;
                }
                
                this.loadModel(file);
            }
        });
        
        // File button click to trigger file input
        fileButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('File button clicked, opening file dialog');
            try {
                fileInput.click();
                console.log('File input click triggered successfully');
            } catch (error) {
                console.error('Error triggering file input:', error);
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
            console.log('Dropped files:', files);
            
            const glbFile = files.find(file => {
                const isValidType = file.name.toLowerCase().endsWith('.glb') || 
                                   file.name.toLowerCase().endsWith('.gltf') ||
                                   file.type === 'model/gltf-binary' ||
                                   file.type === 'model/gltf+json';
                return isValidType;
            });
            
            if (glbFile) {
                console.log('Valid GLB/GLTF file dropped:', glbFile.name);
                this.loadModel(glbFile);
            } else {
                alert('GLBまたはGLTFファイルをドロップしてください');
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
            
            // Generate filename with aikw-3D-viewer-YYYYMM-HHMM.png format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const fileName = `aikw-3D-viewer-${year}${month}-${hours}${minutes}.png`;
            
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
        const helpToggle = document.getElementById('helpToggle');
        
        dropZone.classList.toggle('hidden', !show);
        settingsToggle.classList.toggle('hidden', show);
        helpToggle.classList.toggle('hidden', show);
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