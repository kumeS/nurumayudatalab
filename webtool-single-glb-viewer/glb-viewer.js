class GLBViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.orbitControls = null;
        this.currentModel = null;
        this.currentModelName = '';
        this.transformMode = 'translate';
        
        // マウス操作用の変数
        this.isTransforming = false;
        this.mouseStart = new THREE.Vector2();
        this.mouseCurrent = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.intersectionPlane = new THREE.Plane();
        this.intersectionPoint = new THREE.Vector3();
        this.modelStartTransform = {
            position: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            scale: new THREE.Vector3()
        };
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        const container = document.getElementById('viewer');
        
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
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        container.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
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

        // Transform mode buttons
        document.querySelectorAll('.mode-button').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                this.setTransformMode(mode);
            });
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
        document.getElementById('saveBtn').addEventListener('click', () => this.saveState());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadState());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetTransform());
        document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());

        // Mouse events for direct manipulation
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    onMouseDown(event) {
        if (!this.currentModel) return;
        
        event.preventDefault();
        
        this.mouseStart.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseStart.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouseStart, this.camera);
        const intersects = this.raycaster.intersectObject(this.currentModel, true);
        
        if (intersects.length > 0) {
            this.isTransforming = true;
            this.orbitControls.enabled = false;
            
            // Store initial transform state
            this.modelStartTransform.position.copy(this.currentModel.position);
            this.modelStartTransform.rotation.copy(this.currentModel.rotation);
            this.modelStartTransform.scale.copy(this.currentModel.scale);
            
            // Set up intersection plane based on transform mode
            const normal = new THREE.Vector3();
            switch (this.transformMode) {
                case 'translate':
                    normal.set(0, 1, 0); // XZ plane
                    this.updateCursor('viewer-move');
                    break;
                case 'rotate':
                    normal.copy(this.camera.position).normalize();
                    this.updateCursor('viewer-grabbing');
                    break;
                case 'scale':
                    normal.copy(this.camera.position).normalize();
                    this.updateCursor('viewer-ew-resize');
                    break;
            }
            
            this.intersectionPlane.setFromNormalAndCoplanarPoint(normal, intersects[0].point);
        }
    }

    onMouseMove(event) {
        if (!this.isTransforming || !this.currentModel) return;
        
        event.preventDefault();
        
        this.mouseCurrent.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseCurrent.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouseCurrent, this.camera);
        
        if (this.raycaster.ray.intersectPlane(this.intersectionPlane, this.intersectionPoint)) {
            const deltaX = this.mouseCurrent.x - this.mouseStart.x;
            const deltaY = this.mouseCurrent.y - this.mouseStart.y;
            
            switch (this.transformMode) {
                case 'translate':
                    this.handleTranslate(deltaX, deltaY);
                    break;
                case 'rotate':
                    this.handleRotate(deltaX, deltaY);
                    break;
                case 'scale':
                    this.handleScale(deltaX, deltaY);
                    break;
            }
            
            this.updateTransformDisplay();
        }
    }

    onMouseUp(event) {
        if (this.isTransforming) {
            this.isTransforming = false;
            this.orbitControls.enabled = true;
            this.updateCursor('default');
        }
    }

    handleTranslate(deltaX, deltaY) {
        const sensitivity = 3;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        
        this.camera.getWorldDirection(new THREE.Vector3());
        right.setFromMatrixColumn(this.camera.matrixWorld, 0);
        up.setFromMatrixColumn(this.camera.matrixWorld, 1);
        
        const translation = new THREE.Vector3()
            .addScaledVector(right, deltaX * sensitivity)
            .addScaledVector(up, deltaY * sensitivity);
        
        this.currentModel.position.copy(this.modelStartTransform.position).add(translation);
    }

    handleRotate(deltaX, deltaY) {
        const sensitivity = 3;
        
        this.currentModel.rotation.copy(this.modelStartTransform.rotation);
        this.currentModel.rotation.y += deltaX * sensitivity;
        this.currentModel.rotation.x += deltaY * sensitivity;
    }

    handleScale(deltaX, deltaY) {
        const sensitivity = 2;
        const scaleFactor = 1 + (deltaX + deltaY) * sensitivity;
        const clampedScale = Math.max(0.1, Math.min(5, scaleFactor));
        
        this.currentModel.scale.copy(this.modelStartTransform.scale).multiplyScalar(clampedScale);
    }

    updateCursor(cursorClass) {
        const viewer = document.getElementById('viewer');
        viewer.className = viewer.className.replace(/viewer-\w+/g, '');
        if (cursorClass !== 'default') {
            viewer.classList.add(cursorClass);
        }
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
            this.updateTransformDisplay();
            this.showControlPanel(true);
            this.showDropZone(false);
            
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error loading model:', error);
            alert('モデルの読み込みに失敗しました');
        } finally {
            this.showLoading(false);
        }
    }

    setTransformMode(mode) {
        this.transformMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Show mode indicator
        this.showModeIndicator(mode);
    }

    showModeIndicator(mode) {
        const indicator = document.getElementById('modeIndicator');
        const modeNames = {
            translate: '移動モード',
            rotate: '回転モード',
            scale: '拡大モード'
        };
        
        indicator.textContent = modeNames[mode];
        indicator.className = `mode-indicator ${mode} show`;
        
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 1500);
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
        info.textContent = this.currentModelName;
    }

    updateTransformDisplay() {
        if (!this.currentModel) return;
        
        const pos = this.currentModel.position;
        const rot = this.currentModel.rotation;
        const scale = this.currentModel.scale;
        
        document.getElementById('positionValue').textContent = 
            `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
        
        document.getElementById('rotationValue').textContent = 
            `${(rot.x * 180 / Math.PI).toFixed(1)}°, ${(rot.y * 180 / Math.PI).toFixed(1)}°, ${(rot.z * 180 / Math.PI).toFixed(1)}°`;
        
        document.getElementById('scaleValue').textContent = 
            `${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}`;
    }

    resetTransform() {
        if (!this.currentModel) return;
        
        this.currentModel.position.set(0, 0, 0);
        this.currentModel.rotation.set(0, 0, 0);
        this.currentModel.scale.set(1, 1, 1);
        
        this.updateTransformDisplay();
    }

    saveState() {
        if (!this.currentModel) return;
        
        const state = {
            modelName: this.currentModelName,
            transform: {
                position: [
                    this.currentModel.position.x,
                    this.currentModel.position.y,
                    this.currentModel.position.z
                ],
                rotation: [
                    this.currentModel.rotation.x,
                    this.currentModel.rotation.y,
                    this.currentModel.rotation.z
                ],
                scale: [
                    this.currentModel.scale.x,
                    this.currentModel.scale.y,
                    this.currentModel.scale.z
                ]
            },
            background: {
                type: 'color',
                value: '#' + this.scene.background.getHexString()
            },
            timestamp: Date.now()
        };
        
        localStorage.setItem('glb-viewer-state', JSON.stringify(state));
        alert('状態を保存しました');
    }

    loadState() {
        try {
            const saved = localStorage.getItem('glb-viewer-state');
            if (!saved) {
                alert('保存された状態がありません');
                return;
            }
            
            const state = JSON.parse(saved);
            
            if (this.currentModel) {
                // Apply transform
                this.currentModel.position.set(...state.transform.position);
                this.currentModel.rotation.set(...state.transform.rotation);
                this.currentModel.scale.set(...state.transform.scale);
                
                // Apply background
                this.setBackground(state.background.value);
                this.updateBackgroundUI(state.background.value);
                
                this.updateTransformDisplay();
                alert('状態を復元しました');
            } else {
                alert('モデルが読み込まれていません');
            }
            
        } catch (error) {
            console.error('Failed to load state:', error);
            alert('状態の復元に失敗しました');
        }
    }

    takeScreenshot() {
        if (!this.currentModel) return;
        
        const link = document.createElement('a');
        link.download = `${this.currentModelName.replace(/\.(glb|gltf)$/i, '')}_screenshot.png`;
        link.href = this.renderer.domElement.toDataURL();
        link.click();
    }

    handleKeyboard(event) {
        // Ignore if typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key.toLowerCase()) {
            case 't':
                event.preventDefault();
                this.setTransformMode('translate');
                break;
            case 'r':
                event.preventDefault();
                this.setTransformMode('rotate');
                break;
            case 's':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.saveState();
                } else {
                    event.preventDefault();
                    this.setTransformMode('scale');
                }
                break;
            case 'l':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.loadState();
                }
                break;
            case 'escape':
                event.preventDefault();
                this.resetTransform();
                break;
        }
    }

    showDropZone(show) {
        const dropZone = document.getElementById('dropZone');
        dropZone.classList.toggle('hidden', !show);
    }

    showControlPanel(show) {
        const panel = document.getElementById('controlPanel');
        panel.style.display = show ? 'block' : 'none';
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

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}