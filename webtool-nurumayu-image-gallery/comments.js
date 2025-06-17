class CommentsManager {
    constructor() {
        this.comments = this._getInitialCommentsData();
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    _getInitialCommentsData() {
        const savedComments = localStorage.getItem('image-comments');
        return savedComments ? JSON.parse(savedComments) : {};
    }

    saveComments() {
        localStorage.setItem('image-comments', JSON.stringify(this.comments));
    }

    setupEventListeners() {
        const addCommentBtn = document.getElementById('addCommentBtn');
        const commentInput = document.getElementById('commentInput');

        addCommentBtn.addEventListener('click', () => {
            this.addComment();
        });

        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addComment();
            }
        });
    }

    addComment() {
        const commentInput = document.getElementById('commentInput');
        const text = commentInput.value.trim();
        
        if (!text) return;

        // Get current image ID from modal
        const modalImage = document.getElementById('modalImage');
        const currentImageId = this.getCurrentImageId();
        
        if (!currentImageId) return;

        // Create comment object
        const comment = {
            id: Date.now().toString(),
            text,
            author: this.getRandomAuthor(),
            date: new Date().toISOString(),
            imageId: currentImageId
        };

        // Add comment to storage
        if (!this.comments[currentImageId]) {
            this.comments[currentImageId] = [];
        }
        this.comments[currentImageId].unshift(comment);
        this.saveComments();

        // Update image comment count
        const image = window.gallery.getImage(currentImageId);
        if (image) {
            image.comments = this.comments[currentImageId];
            window.gallery.updateImage(currentImageId, { comments: image.comments });
        }

        // Clear input and reload comments
        commentInput.value = '';
        this.displayCommentsForImage(currentImageId);

        // Update comment count in modal
        const modalComments = document.getElementById('modalComments');
        modalComments.textContent = this.comments[currentImageId].length;

        // Re-render gallery to update comment counts
        window.gallery.renderGallery();
    }

    displayCommentsForImage(imageId) {
        const commentsList = document.getElementById('commentsList');
        const imageComments = this.comments[imageId] || [];

        if (imageComments.length === 0) {
            commentsList.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-muted);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = imageComments.map(comment => 
            this.createCommentElement(comment)
        ).join('');
    }

    createCommentElement(comment) {
        const date = new Date(comment.date);
        const timeAgo = this.getTimeAgo(date);

        return `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${timeAgo}</span>
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
        `;
    }

    getCurrentImageId() {
        // Extract image ID from the currently open modal
        // This is a simple approach - in a real app you'd have better state management
        const modal = document.getElementById('imageModal');
        if (!modal.classList.contains('active')) return null;
        
        // Find the image ID by looking at gallery items and matching the modal image src
        const modalImage = document.getElementById('modalImage');
        const galleryItems = document.querySelectorAll('.gallery-item');
        
        for (const item of galleryItems) {
            const img = item.querySelector('img');
            if (img && img.src === modalImage.src) {
                return item.dataset.imageId;
            }
        }
        
        return null;
    }

    getRandomAuthor() {
        const authors = [
            'Art Enthusiast',
            'Digital Explorer',
            'Creative Mind',
            'Visual Artist',
            'Design Lover',
            'Pixel Perfect',
            'Color Master',
            'Light Chaser',
            'Dream Catcher',
            'Vision Seeker'
        ];
        return authors[Math.floor(Math.random() * authors.length)];
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMilliseconds = now - date;
        const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) {
            return 'Just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getComments(imageId) {
        return this.comments[imageId] || [];
    }

    getCommentCount(imageId) {
        return this.comments[imageId] ? this.comments[imageId].length : 0;
    }
}

// Initialize comments manager
window.commentsManager = new CommentsManager();