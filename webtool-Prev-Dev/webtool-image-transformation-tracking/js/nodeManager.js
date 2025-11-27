/**
 * Node Manager - Extended node operations
 */

class NodeManager {
    constructor() {
        this.selectedNodeId = null;
    }

    /**
     * Upload image to node
     */
    uploadImageToNode(nodeId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = {
                        url: event.target.result,
                        thumbnail: event.target.result,
                        metadata: {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            uploadedAt: new Date().toISOString()
                        }
                    };
                    
                    if (window.workflowEngine) {
                        window.workflowEngine.addImageToNode(nodeId, imageData);
                    }
                };
                reader.readAsDataURL(file);
            });
        });
        
        input.click();
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${this.getNotificationClass(type)}`;
        notification.innerHTML = `
            <div class="flex items-start">
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white opacity-70 hover:opacity-100">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    getNotificationClass(type) {
        switch(type) {
            case 'success': return 'bg-green-600 text-white';
            case 'error': return 'bg-red-600 text-white';
            case 'warning': return 'bg-yellow-500 text-white';
            default: return 'bg-blue-600 text-white';
        }
    }
}

// Initialize node manager
window.nodeManager = new NodeManager();