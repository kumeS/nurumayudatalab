// Image upload and 3D generation handler
class ImageTo3DGenerator {
    constructor() {
        this.selectedImages = [];
        this.glbViewer = null;
        this.workerUrl = 'https://nurumayu-replicate-api.skume-bioinfo.workers.dev/';
        // 例: 'https://your-worker-name.your-account.workers.dev'
        // R2_workers_replicate_v1.js を Cloudflare Workers にデプロイして取得したURLを設定してください
        this.setupEventListeners();
        this.initializeUI();
    }

    initializeUI() {
        // Hide help button on initial load
        const helpToggle = document.getElementById('helpToggle');
        if (helpToggle) {
            helpToggle.style.display = 'none';
        }
    }

    setupEventListeners() {
        // File input event
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            this.handleImageSelection(e.target.files);
        });

        // Drag and drop events
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
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            
            if (files.length > 0) {
                this.handleImageSelection(files);
            }
        });

        // Generate button event
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.addEventListener('click', () => {
            this.generate3DModel();
        });
    }

    async handleImageSelection(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && 
            (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg')
        );

        if (imageFiles.length === 0) {
            alert('PNG または JPEG 形式の画像ファイルを選択してください。');
            return;
        }

        // Add new images to existing ones (avoiding duplicates)
        imageFiles.forEach(newFile => {
            const isDuplicate = this.selectedImages.some(existingFile => 
                existingFile.name === newFile.name && 
                existingFile.size === newFile.size &&
                existingFile.lastModified === newFile.lastModified
            );
            
            if (!isDuplicate) {
                this.selectedImages.push(newFile);
            }
        });
        
        // Reset file input to allow re-selection of same files
        const fileInput = document.getElementById('fileInput');
        fileInput.value = '';
        
        // Hide help button when images are selected
        const helpToggle = document.getElementById('helpToggle');
        if (helpToggle) {
            helpToggle.style.display = 'none';
        }
        
        // Display selected images
        await this.displaySelectedImages();
        
        // Show generate button
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.style.display = 'block';
    }

    async displaySelectedImages() {
        const container = document.getElementById('selectedImages');
        container.innerHTML = '';
        container.style.display = 'block';

        for (let i = 0; i < this.selectedImages.length; i++) {
            const file = this.selectedImages[i];
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            
            // Create image preview
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            
            const info = document.createElement('div');
            info.className = 'image-info';
            
            const name = document.createElement('div');
            name.className = 'image-name';
            name.textContent = file.name;
            
            const size = document.createElement('div');
            size.className = 'image-size';
            size.textContent = this.formatFileSize(file.size);
            
            info.appendChild(name);
            info.appendChild(size);
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => this.removeImage(i);
            
            preview.appendChild(img);
            preview.appendChild(info);
            preview.appendChild(removeBtn);
            
            container.appendChild(preview);
        }
    }

    removeImage(index) {
        // Clean up object URL to prevent memory leaks
        const container = document.getElementById('selectedImages');
        const imagePreview = container.children[index];
        if (imagePreview) {
            const img = imagePreview.querySelector('img');
            if (img && img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        }
        
        // Remove image from array
        this.selectedImages.splice(index, 1);
        
        // Re-display images
        this.displaySelectedImages();
        
        // Hide UI elements if no images remain
        if (this.selectedImages.length === 0) {
            document.getElementById('generateBtn').style.display = 'none';
            document.getElementById('selectedImages').style.display = 'none';
            
            // Keep help button hidden when all images are removed
            const helpToggle = document.getElementById('helpToggle');
            if (helpToggle) {
                helpToggle.style.display = 'none';
            }
        }
        
        // Reset file input to allow re-selection
        const fileInput = document.getElementById('fileInput');
        fileInput.value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async generate3DModel() {
        if (this.selectedImages.length === 0) {
            alert('画像を選択してください。');
            return;
        }

        // Check if worker URL is configured
        if (!this.workerUrl) {
            alert('CloudflareワーカーのURLが設定されていません。\nmain.jsの6行目でworkerUrlを設定してください。\n例: this.workerUrl = "https://your-worker.your-account.workers.dev"');
            return;
        }

        const generateBtn = document.getElementById('generateBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        try {
            // Disable generate button and show progress
            generateBtn.disabled = true;
            generateBtn.textContent = '生成中...';
            progressContainer.style.display = 'block';
            
            // Hide help button during generation
            const helpToggle = document.getElementById('helpToggle');
            if (helpToggle) {
                helpToggle.style.display = 'none';
            }
            
            // Upload images and get URLs
            progressText.textContent = '画像をアップロード中...';
            progressFill.style.width = '10%';
            
            const imageUrls = await this.uploadImages();
            
            // Call TRELLIS API
            progressText.textContent = '3Dモデルを生成中...';
            progressFill.style.width = '30%';
            
            const result = await this.callTrellisAPI(imageUrls);
            
            progressText.textContent = 'GLBファイルをダウンロード中...';
            progressFill.style.width = '80%';
            
            // Download and load the GLB file
            if (result.output && result.output.model_file) {
                await this.loadGeneratedModel(result.output.model_file);
                
                progressFill.style.width = '100%';
                progressText.textContent = '完了！';
                
                // Hide drop zone and show viewer
                document.getElementById('dropZone').classList.add('hidden');
                document.getElementById('settingsToggle').classList.remove('hidden');
                
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    // Show help button again after completion
                    const helpToggle = document.getElementById('helpToggle');
                    if (helpToggle) {
                        helpToggle.style.display = 'flex';
                    }
                }, 2000);
            } else {
                throw new Error('GLBファイルが生成されませんでした。');
            }
            
        } catch (error) {
            console.error('3D model generation error:', error);
            let errorMessage = error.message;
            
            // Provide more specific error messages
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'CloudflareワーカーへのAPIリクエストが失敗しました。\n・ワーカーURLが正しく設定されているか確認してください\n・ワーカーがデプロイされているか確認してください\n・CORS設定が正しいか確認してください';
            }
            
            alert(`3Dモデル生成に失敗しました:\n${errorMessage}`);
            
            progressContainer.style.display = 'none';
            
            // Show help button again on error
            const helpToggle = document.getElementById('helpToggle');
            if (helpToggle) {
                helpToggle.style.display = 'flex';
            }
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.textContent = '3Dモデルを生成';
        }
    }

    async uploadImages() {
        // Convert images to data URLs for direct API transmission
        const imageUrls = [];
        
        for (const file of this.selectedImages) {
            const dataUrl = await this.fileToDataUrl(file);
            imageUrls.push(dataUrl);
        }
        
        return imageUrls;
    }

    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async callTrellisAPI(imageUrls) {
        const payload = {
            version: "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
            input: {
                images: imageUrls,
                texture_size: 2048,
                mesh_simplify: 0.9,
                generate_model: true,
                save_gaussian_ply: true,
                ss_sampling_steps: 38
            }
        };

        const requestBody = {
            apiUrl: "https://api.replicate.com/v1/predictions",
            payload: payload
        };

        const response = await fetch(this.workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        return await response.json();
    }

    async loadGeneratedModel(glbUrl) {
        try {
            // Download GLB file
            const response = await fetch(glbUrl);
            if (!response.ok) {
                throw new Error(`Failed to download GLB file: ${response.status}`);
            }
            
            const blob = await response.blob();
            const file = new File([blob], 'generated_model.glb', { type: 'model/gltf-binary' });
            
            // Load into 3D viewer
            if (this.glbViewer) {
                await this.glbViewer.loadModel(file);
            } else {
                console.error('GLB viewer not initialized');
            }
            
        } catch (error) {
            console.error('Error loading generated model:', error);
            throw error;
        }
    }

    setGLBViewer(viewer) {
        this.glbViewer = viewer;
    }
}

// Initialize the application when the page loads
window.addEventListener('load', () => {
    const glbViewer = new GLBViewer();
    const imageGenerator = new ImageTo3DGenerator();
    
    // Connect the generator to the viewer
    imageGenerator.setGLBViewer(glbViewer);
    
    // Make both available globally for debugging
    window.glbViewer = glbViewer;
    window.imageGenerator = imageGenerator;
});