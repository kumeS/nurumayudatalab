class Gallery {
    constructor() {
        this.images = this.loadImages();
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.renderGallery();
        this.setupEventListeners();
        this.setupSearch();
        this.setupFilters();
    }

    loadImages() {
        const savedImages = localStorage.getItem('gallery-images');
        if (savedImages) {
            return JSON.parse(savedImages);
        }
        
        // Default sample images using Pexels
        return [
            {
                id: 'sample-1',
                title: 'Mystical Forest',
                description: 'A beautiful mystical forest scene with ethereal lighting and ancient trees',
                imageUrl: 'https://images.pexels.com/photos/441906/pexels-photo-441906.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['nature', 'forest', 'mystical', 'trees'],
                likes: 127,
                comments: [],
                views: 1542,
                uploadDate: new Date().toISOString(),
                author: 'AI Artist'
            },
            {
                id: 'sample-2',
                title: 'Cosmic Nebula',
                description: 'Stunning cosmic nebula with vibrant colors and stellar formations',
                imageUrl: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['space', 'nebula', 'cosmic', 'stars'],
                likes: 89,
                comments: [],
                views: 932,
                uploadDate: new Date(Date.now() - 86400000).toISOString(),
                author: 'Space Explorer'
            },
            {
                id: 'sample-3',
                title: 'Digital Architecture',
                description: 'Futuristic digital architecture with neon accents and modern design',
                imageUrl: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['architecture', 'futuristic', 'digital', 'neon'],
                likes: 156,
                comments: [],
                views: 2103,
                uploadDate: new Date(Date.now() - 172800000).toISOString(),
                author: 'Digital Creator'
            },
            {
                id: 'sample-4',
                title: 'Abstract Ocean',
                description: 'Abstract representation of ocean waves with dynamic movement',
                imageUrl: 'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['abstract', 'ocean', 'waves', 'dynamic'],
                likes: 73,
                comments: [],
                views: 654,
                uploadDate: new Date(Date.now() - 259200000).toISOString(),
                author: 'Wave Master'
            },
            {
                id: 'sample-5',
                title: 'Cyberpunk City',
                description: 'Neon-lit cyberpunk cityscape with flying vehicles and urban atmosphere',
                imageUrl: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['cyberpunk', 'city', 'neon', 'futuristic'],
                likes: 201,
                comments: [],
                views: 3847,
                uploadDate: new Date(Date.now() - 345600000).toISOString(),
                author: 'Cyber Punk'
            },
            {
                id: 'sample-6',
                title: 'Ethereal Portrait',
                description: 'Dreamy ethereal portrait with soft lighting and mystical elements',
                imageUrl: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['portrait', 'ethereal', 'dreamy', 'mystical'],
                likes: 94,
                comments: [],
                views: 1276,
                uploadDate: new Date(Date.now() - 432000000).toISOString(),
                author: 'Dream Weaver'
            },
            {
                id: 'sample-7',
                title: 'Mountain Landscape',
                description: 'Majestic mountain landscape with dramatic lighting and clouds',
                imageUrl: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['landscape', 'mountains', 'nature', 'dramatic'],
                likes: 182,
                comments: [],
                views: 2456,
                uploadDate: new Date(Date.now() - 518400000).toISOString(),
                author: 'Mountain Explorer'
            },
            {
                id: 'sample-8',
                title: 'Urban Night',
                description: 'City lights reflecting on wet streets during a rainy night',
                imageUrl: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['urban', 'night', 'city', 'rain'],
                likes: 145,
                comments: [],
                views: 1789,
                uploadDate: new Date(Date.now() - 604800000).toISOString(),
                author: 'Night Walker'
            },
            {
                id: 'sample-9',
                title: 'Desert Sunset',
                description: 'Golden hour in the desert with sand dunes and warm colors',
                imageUrl: 'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['desert', 'sunset', 'golden', 'landscape'],
                likes: 98,
                comments: [],
                views: 1234,
                uploadDate: new Date(Date.now() - 691200000).toISOString(),
                author: 'Desert Wanderer'
            },
            {
                id: 'sample-10',
                title: 'Tropical Paradise',
                description: 'Crystal clear waters and palm trees in a tropical paradise',
                imageUrl: 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['tropical', 'beach', 'paradise', 'ocean'],
                likes: 267,
                comments: [],
                views: 3421,
                uploadDate: new Date(Date.now() - 777600000).toISOString(),
                author: 'Island Dreamer'
            },
            {
                id: 'sample-11',
                title: 'Winter Wonderland',
                description: 'Snow-covered forest with icicles and winter magic',
                imageUrl: 'https://images.pexels.com/photos/1054218/pexels-photo-1054218.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['winter', 'snow', 'forest', 'cold'],
                likes: 134,
                comments: [],
                views: 1876,
                uploadDate: new Date(Date.now() - 864000000).toISOString(),
                author: 'Winter Spirit'
            },
            {
                id: 'sample-12',
                title: 'Flower Field',
                description: 'Vibrant field of wildflowers in full bloom during spring',
                imageUrl: 'https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg?auto=compress&cs=tinysrgb&w=600',
                tags: ['flowers', 'spring', 'colorful', 'nature'],
                likes: 189,
                comments: [],
                views: 2567,
                uploadDate: new Date(Date.now() - 950400000).toISOString(),
                author: 'Flower Child'
            }
        ];
    }

    saveImages() {
        localStorage.setItem('gallery-images', JSON.stringify(this.images));
    }

    setupEventListeners() {
        // Gallery item clicks
        document.addEventListener('click', (e) => {
            const galleryItem = e.target.closest('.gallery-item');
            if (galleryItem) {
                const imageId = galleryItem.dataset.imageId;
                this.openImageModal(imageId);
            }
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderGallery();
            }, 300);
        });
    }

    setupFilters() {
        const filterBtns = document.querySelectorAll('.nav-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                this.currentFilter = btn.dataset.filter;
                this.renderGallery();
            });
        });
    }

    filterImages() {
        let filtered = [...this.images];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(image => 
                image.title.toLowerCase().includes(this.searchQuery) ||
                image.description.toLowerCase().includes(this.searchQuery) ||
                image.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }

        // Apply category filter
        switch (this.currentFilter) {
            case 'popular':
                filtered = filtered.filter(image => image.likes > 100);
                break;
            case 'recent':
                filtered = filtered.filter(image => {
                    const uploadDate = new Date(image.uploadDate);
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return uploadDate > weekAgo;
                });
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }

        return filtered;
    }

    renderGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        
        // Show loading
        loading.style.display = 'block';
        emptyState.style.display = 'none';
        galleryGrid.innerHTML = '';

        // Simulate loading delay
        setTimeout(() => {
            const filteredImages = this.filterImages();
            
            loading.style.display = 'none';
            
            if (filteredImages.length === 0) {
                emptyState.style.display = 'block';
                return;
            }

            filteredImages.forEach(image => {
                const imageElement = this.createImageElement(image);
                galleryGrid.appendChild(imageElement);
            });

            // Add fade-in animation
            galleryGrid.querySelectorAll('.gallery-item').forEach((item, index) => {
                item.style.animationDelay = `${index * 50}ms`;
                item.classList.add('fade-in');
            });
        }, 300);
    }

    createImageElement(image) {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.dataset.imageId = image.id;
        
        div.innerHTML = `
            <img src="${image.imageUrl}" alt="${image.title}" loading="lazy">
            <div class="gallery-item-overlay">
                <div class="gallery-item-stats">
                    <span class="stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        ${image.likes}
                    </span>
                    <span class="stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        ${image.comments.length}
                    </span>
                    <span class="stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        ${image.views}
                    </span>
                </div>
            </div>
        `;

        return div;
    }

    openImageModal(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        // Increment views
        image.views++;
        this.saveImages();

        const modal = document.getElementById('imageModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalImage = document.getElementById('modalImage');
        const modalDescription = document.getElementById('modalDescription');
        const modalTags = document.getElementById('modalTags');
        const modalDate = document.getElementById('modalDate');
        const modalLikes = document.getElementById('modalLikes');
        const modalComments = document.getElementById('modalComments');
        const modalViews = document.getElementById('modalViews');
        const likeBtn = document.getElementById('likeBtn');

        // Populate modal content
        modalTitle.textContent = image.title;
        modalImage.src = image.imageUrl;
        modalImage.alt = image.title;
        modalDescription.textContent = image.description;
        modalLikes.textContent = image.likes;
        modalComments.textContent = image.comments.length;
        modalViews.textContent = image.views;
        
        // Format date
        const date = new Date(image.uploadDate);
        modalDate.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Render tags
        modalTags.innerHTML = image.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');

        // Setup like button
        const isLiked = this.isImageLiked(imageId);
        likeBtn.classList.toggle('liked', isLiked);
        
        likeBtn.onclick = () => this.toggleLike(imageId);

        // Load comments
        window.commentsManager.displayCommentsForImage(imageId);

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeImageModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    toggleLike(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        const likedImages = this.getLikedImages();
        const isLiked = likedImages.includes(imageId);

        if (isLiked) {
            // Unlike
            image.likes--;
            const index = likedImages.indexOf(imageId);
            likedImages.splice(index, 1);
        } else {
            // Like
            image.likes++;
            likedImages.push(imageId);
        }

        // Save changes
        localStorage.setItem('liked-images', JSON.stringify(likedImages));
        this.saveImages();

        // Update UI
        const likeBtn = document.getElementById('likeBtn');
        const modalLikes = document.getElementById('modalLikes');
        
        likeBtn.classList.toggle('liked', !isLiked);
        modalLikes.textContent = image.likes;

        // Re-render gallery to update like counts
        this.renderGallery();
    }

    isImageLiked(imageId) {
        const likedImages = this.getLikedImages();
        return likedImages.includes(imageId);
    }

    getLikedImages() {
        const liked = localStorage.getItem('liked-images');
        return liked ? JSON.parse(liked) : [];
    }

    addImage(imageData) {
        const newImage = {
            id: Date.now().toString(),
            ...imageData,
            likes: 0,
            comments: [],
            views: 0,
            uploadDate: new Date().toISOString(),
            author: 'You'
        };

        this.images.unshift(newImage);
        this.saveImages();
        this.renderGallery();
    }

    getImage(imageId) {
        return this.images.find(img => img.id === imageId);
    }

    updateImage(imageId, updates) {
        const imageIndex = this.images.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) {
            this.images[imageIndex] = { ...this.images[imageIndex], ...updates };
            this.saveImages();
        }
    }
}

// Initialize gallery when DOM is loaded
window.gallery = new Gallery();