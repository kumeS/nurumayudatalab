class UploadManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadModal = document.getElementById('uploadModal');
        const closeUploadModal = document.getElementById('closeUploadModal');
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');
        const uploadLink = uploadArea.querySelector('.upload-link');
        const cancelUpload = document.getElementById('cancelUpload');

        // Open modal
        uploadBtn.addEventListener('click', () => {
            uploadModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        // Close modal
        closeUploadModal.addEventListener('click', () => {
            this.closeModal();
        });

        cancelUpload.addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal on outside click
        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                this.closeModal();
            }
        });

        // File input triggers
        uploadLink.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Form submission
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
    }

    handleFiles(files) {
        if (files.length === 0) return;

        const file = files[0];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImageData = e.target.result;
            this.showUploadForm();
        };
        reader.readAsDataURL(file);
    }

    showUploadForm() {
        const uploadArea = document.getElementById('uploadArea');
        const uploadForm = document.getElementById('uploadForm');
        
        uploadArea.style.display = 'none';
        uploadForm.style.display = 'block';

        // Auto-generate title from filename if available
        const fileInput = document.getElementById('fileInput');
        const titleInput = document.getElementById('imageTitle');
        
        if (fileInput.files.length > 0) {
            const filename = fileInput.files[0].name;
            const title = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
            titleInput.value = title.charAt(0).toUpperCase() + title.slice(1);
        }
    }

    submitForm() {
        const title = document.getElementById('imageTitle').value.trim();
        const description = document.getElementById('imageDescription').value.trim();
        const tagsInput = document.getElementById('imageTags').value.trim();
        
        if (!title) {
            alert('Please enter a title for your image.');
            return;
        }

        if (!this.selectedImageData) {
            alert('Please select an image to upload.');
            return;
        }

        // Parse tags
        const tags = tagsInput 
            ? tagsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag)
            : [];

        // Create image data
        const imageData = {
            title,
            description,
            tags,
            imageUrl: this.selectedImageData
        };

        // Add to gallery
        window.gallery.addImage(imageData);

        // Close modal and reset form
        this.closeModal();
        this.resetForm();

        // Show success message
        this.showSuccessMessage();
    }

    closeModal() {
        const uploadModal = document.getElementById('uploadModal');
        uploadModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form after animation
        setTimeout(() => {
            this.resetForm();
        }, 300);
    }

    resetForm() {
        const uploadArea = document.getElementById('uploadArea');
        const uploadForm = document.getElementById('uploadForm');
        const fileInput = document.getElementById('fileInput');
        const form = uploadForm.querySelector('form') || uploadForm;
        
        uploadArea.style.display = 'block';
        uploadForm.style.display = 'none';
        fileInput.value = '';
        
        // Reset form fields
        document.getElementById('imageTitle').value = '';
        document.getElementById('imageDescription').value = '';
        document.getElementById('imageTags').value = '';
        
        this.selectedImageData = null;
    }

    showSuccessMessage() {
        // Create and show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                </svg>
                Image uploaded successfully!
            </div>
        `;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize upload manager
window.uploadManager = new UploadManager();

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);