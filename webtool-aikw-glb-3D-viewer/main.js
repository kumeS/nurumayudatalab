// Initialize the viewer when the page loads - use multiple event listeners for reliability
function initializeViewer() {
    console.log('Initializing GLB Viewer...');
    try {
        new GLBViewer();
        console.log('GLB Viewer initialized successfully');
    } catch (error) {
        console.error('Error initializing GLB Viewer:', error);
    }
}

// Try multiple initialization methods
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeViewer);
} else {
    initializeViewer();
}

// Fallback initialization
window.addEventListener('load', () => {
    // Only initialize if not already done
    if (!window.glbViewerInitialized) {
        console.log('Fallback initialization triggered');
        initializeViewer();
    }
});