# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Image Transformation Tracker** is a visual workflow tool for tracking AI-driven image transformations. It allows users to upload images, generate transformation prompts using LLM, execute transformations, and visualize the transformation history as a tree structure using Vis.js.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (CDN)
- **Visualization**: Vis.js Network for interactive workflow canvas
- **Data Persistence**: LocalStorage (client-side)
- **External APIs**: IO Intelligence API (LLM), Replicate API (image transformation)
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter)

## Development Commands

This is a static web application with no build process. To develop:

```bash
# Open the application in a browser
open index.html

# For local development with live reload, use a simple HTTP server:
python3 -m http.server 8000
# or
npx serve .
```

## Architecture

### Core System Components

#### 1. **WorkflowEngine** (`js/workflowEngine.js`)
- Central data model managing nodes (image containers) and edges (transformations)
- Maintains workflow state: nodes Map, edges Map, selection state
- Event-driven architecture using custom listeners
- Handles CRUD operations for nodes and edges
- Implements debounced auto-save to LocalStorage

#### 2. **CanvasController** (`js/canvasController.js`)
- Manages Vis.js network visualization
- Custom node renderer with visual states (active/inactive, selected/hover)
- Handles right-click context menu (circle menu) for node actions
- Manages canvas interactions: zoom, pan, fit view, node dragging
- Implements temporary edge drawing for connection mode
- **Important**: Uses `DOMtoCanvas` conversion for accurate click detection

#### 3. **WorkflowApp** (`js/workflowApp.js`)
- Main application controller
- Initializes subsystems and coordinates UI interactions
- Event delegation for toolbar, modal, and file input handling
- Manages application state transitions (select/connect/delete modes)

#### 4. **LLMService** (`js/llmService.js`)
- Handles LLM API communication for prompt generation
- Contains 8 pre-defined style templates (artistic, photorealistic, anime, etc.)
- Image analysis using vision models
- Currently uses mock/simulated responses for demo purposes
- Production-ready structure with commented real API calls

#### 5. **TransformationService** (`js/transformationService.js`)
- Manages image transformation workflows
- Supports multiple models and APIs (Replicate, IO Intelligence)
- Progress tracking with visual indicators
- Batch transformation capabilities
- Currently uses CSS filters for demo transformations

#### 6. **Config** (`js/config.js`)
- Centralized configuration management
- Stores API keys, model preferences, and settings in LocalStorage
- Provides API header generation with proper authentication
- Service detection based on model prefix (e.g., 'replicate/')

### Data Flow

```
User Action → WorkflowApp → WorkflowEngine (update state)
                          → CanvasController (update visualization)
                          → LLMService/TransformationService (API calls)
                          → LocalStorage (persist)
```

### Key Data Structures

**Node**:
```javascript
{
  id: string,
  type: 'image',
  position: {x, y},
  images: [{ id, url, thumbnail, metadata, created }],
  metadata: {},
  status: 'ready'|'processing'|'error',
  currentIndex: number,
  created: ISO timestamp
}
```

**Edge**:
```javascript
{
  id: string,
  source: nodeId,
  target: nodeId,
  prompt: string,
  model: string,
  style: 'artistic'|'photorealistic'|...|'custom',
  metadata: {},
  created: ISO timestamp
}
```

## Important Implementation Details

### Right-Click Menu System
- Uses dual event handling: Vis.js `oncontext` + native canvas `contextmenu`
- Temporarily disables node dragging during right-click (500ms delay)
- Circle menu positioned with z-index enforcement and pointer-events
- Menu cleanup requires removing event listeners from Map to prevent memory leaks

### Node Rendering
- Custom Vis.js node renderer (`ctxRenderer`)
- Active nodes (with images): purple gradient background
- Inactive nodes (no images): gray background
- Canvas 2D context with rounded rectangles, shadows, gradients
- Image rendering with aspect ratio preservation
- Status badges and navigation controls for multiple images

### Edge Styling
- Edges with prompts: purple (`#9333EA`), width 4
- Edges without prompts: gray (`#6B7280`), width 2
- Label color matches edge state
- Cubic bezier smoothing with roundness 0.2

### Event Handling Patterns
- WorkflowEngine emits custom events: `nodeCreated`, `nodeUpdated`, `edgeCreated`, etc.
- CanvasController listens to engine events and updates visualization
- Debounced save prevents excessive LocalStorage writes
- Modal interactions use show/hide classes on fixed positioned overlays

### LocalStorage Keys
- `workflowTrackerConfig`: user settings and API keys
- Workflow data saved with auto-save feature (configurable)

## Common Development Tasks

### Adding a New Node
```javascript
const node = workflowEngine.createNode({
  position: { x: 100, y: 100 },
  type: 'image'
});
// CanvasController automatically updates visualization via event listener
```

### Uploading Image to Node
```javascript
const imageData = {
  url: imageDataUrl,
  thumbnail: thumbnailUrl,
  metadata: { filename, size }
};
workflowEngine.addImageToNode(nodeId, imageData);
```

### Creating Edge with Prompt
```javascript
const edge = workflowEngine.createEdge(sourceNodeId, targetNodeId, {
  prompt: generatedPrompt,
  style: 'artistic',
  model: 'fal-ai/nano-banana'
});
```

### Executing Transformation
```javascript
const results = await transformationService.transformImage(
  sourceImageUrl,
  prompt,
  imageCount,  // 1-10
  model
);

// Add results to target node
results.forEach(result => {
  workflowEngine.addImageToNode(targetNodeId, result);
});
```

## File Organization

```
/
├── index.html              # Main application entry point
├── css/
│   ├── workflow.css        # Workflow canvas and node styles
│   └── style.css           # General application styles
└── js/
    ├── config.js           # Configuration management
    ├── workflowEngine.js   # Core data model and state
    ├── workflowApp.js      # Application controller
    ├── canvasController.js # Visualization layer
    ├── llmService.js       # LLM API integration
    ├── transformationService.js  # Image transformation API
    ├── nodeManager.js      # Node-specific utilities (legacy/unused?)
    ├── edgeManager.js      # Edge-specific utilities (legacy/unused?)
    └── apiService.js       # Generic API utilities (legacy/unused?)
```

## Known Issues & Recent Fixes (v3)

### Fixed (2025-01-22 v3)
- Dual event handler for right-click menu (browser compatibility)
- Accurate node detection using DOMtoCanvas conversion
- Menu z-index and pointer-events enforcement
- Drag control during right-click interactions

### Fixed (2025-01-22 v2)
- Active/Inactive node visual distinction
- Edge color based on prompt presence
- Prompt re-editing via double-click
- Image upload from right-click menu
- FileReader error handling

### Fixed (2025-01-22 v1)
- Removed double-click node creation on empty canvas
- Right-click node movement prevention
- Memory leak prevention with proper event cleanup
- Vis.js rendering errors in custom node renderer
- Undefined storage object references
- Performance optimization with debounced save

## API Integration Notes

### Current State: Demo Mode
All API services use mock/simulated responses for demo purposes. Production-ready code structure is in place but commented out.

### Switching to Production APIs

**LLM Service**:
1. Set `ioApiKey` in settings modal
2. Uncomment production API calls in `llmService.js`
3. Verify endpoints: `/api/intelligence/chat`, `/api/image/understand`

**Transformation Service**:
1. Set `replicateApiKey` for Replicate models
2. Set `ioApiKey` for IO Intelligence models
3. Uncomment production API calls in `transformationService.js`
4. Model routing based on prefix (e.g., 'replicate/' → Replicate API)

### API Headers
```javascript
// IO Intelligence
config.getApiHeaders('io')  // → { Authorization: 'Bearer <key>' }

// Replicate
config.getApiHeaders('replicate')  // → { Authorization: 'Token <key>' }
```

## Development Best Practices for This Codebase

- **State mutations**: Always go through WorkflowEngine methods, never modify Maps directly
- **UI updates**: Rely on event listeners, avoid direct DOM manipulation in engine
- **Canvas operations**: Use CanvasController methods for all Vis.js interactions
- **API calls**: Use service classes (LLMService, TransformationService) with proper error handling
- **Memory management**: Clean up event listeners in destroy/cleanup methods
- **Async operations**: Use try-catch with proper error propagation
- **Data persistence**: Use debounced saves to prevent LocalStorage thrashing

## Browser Compatibility

- Modern browsers with ES6+ support
- Canvas 2D context required
- LocalStorage required
- Tested on Chrome, Firefox, Safari (macOS)

## Future Integration Points

- RESTful Table API backend (schema defined in README)
- Real-time collaboration features
- Plugin system for custom transformations
- Workflow automation and templates
