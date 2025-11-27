# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Image Transformation Tracker** is a vanilla JavaScript web application that provides a node-based visual workflow editor for constructing AI-powered image processing pipelines. The application uses the Replicate API (Nano Banana model) for image generation and is built without framework dependencies.

**Technology Stack**: Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (CDN), Vis.js (network visualization)

## Development Commands

### Local Development Server
```bash
# Start HTTP server (required for local development)
python3 -m http.server 8088

# Access at: http://localhost:8088
```

### CORS Handling for Development

The Replicate API doesn't return CORS headers. For local development, use one of these approaches:

**Option A: CORS-disabled Chrome (Recommended for Development)**
```bash
# Use the provided script
./sh/start-chrome-no-cors.sh

# Or manually:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --disable-web-security \
    --user-data-dir="/tmp/chrome-dev-session" \
    http://localhost:8088
```

**Option B: Local Proxy Server (Alternative)**
```bash
node proxy-server.js  # Runs on port 8089
```

**Production**: Uses Cloudflare Workers proxy at `https://replicate-nanobanana.skume-bioinfo.workers.dev/`

### API Configuration

The application requires a Replicate API key. Configure via the settings modal (⚙️ button in UI) or directly in `js/config.js`.

## Architecture Overview

The codebase follows an **MVC-like pattern** with separation between data model (WorkflowEngine), view (CanvasController), and control (WorkflowApp). Communication happens through an **event-driven architecture**.

### Core Architecture Pattern

```
WorkflowEngine (State Management)
    ↓ emits events
CanvasController (Visual Representation) ← WorkflowApp (Application Controller)
    ↓ uses
TransformationService → LLMService
                     → ApiService
```

### Key Components and Responsibilities

**WorkflowEngine** (`js/workflowEngine.js`)
- Central state management using Map data structures
- Event emitter pattern for observers
- Manages nodes (Map<nodeId, nodeObject>) and edges (Map<edgeId, edgeObject>)
- Handles workflow serialization to/from JSON and LocalStorage persistence
- Key Methods: `createNode()`, `deleteNode()`, `addImageToNode()`, `createEdge()`, `updateEdge()`, `emit()`

**CanvasController** (`js/canvasController.js`)
- Manages vis.js network visualization
- Custom node rendering with image thumbnails and gradient backgrounds
- Binds to WorkflowEngine events to sync visual state
- **Critical Implementation**: Uses requestAnimationFrame-based redraw scheduler to prevent infinite rendering loops
  - `this.requestRedraw()` method consolidates multiple redraw requests into single frame
  - Prevents re-entrance during vis.js rendering cycle (line 270)
- Handles user interactions: clicks, drags, right-click context menus
- Implements auto-layout algorithm for hierarchical node positioning

**WorkflowApp** (`js/workflowApp.js`)
- Application bootstrap and event orchestration
- Manages UI elements (header buttons, modals, panels)
- Settings persistence and retrieval
- Coordinates between WorkflowEngine and CanvasController

**Service Layer Pattern**:
- **TransformationService** (`js/transformationService.js`): Image generation with Nano Banana model
- **LLMService** (`js/llmService.js`): Optional LLM integration for prompt generation (IO Intelligence API)
- **ApiService** (`js/apiService.js`): Generic HTTP client with auth header injection

### Data Flow for Image Generation

```
User clicks "Generate" on node
    → TransformationService.transformImage()
    → Cloudflare Workers Proxy (/cloudflare-replicate-proxy.js)
    → Replicate API (google/nano-banana)
    → Auto-polling for completion (24s window)
    → R2 storage backup
    → WorkflowEngine.addImageToNode()
    → Event emission
    → CanvasController updates visual
```

### Event-Driven Communication

The WorkflowEngine uses an event emitter pattern. Key events:
- `nodeCreated`, `nodeDeleted`, `nodeUpdated`
- `imageAdded`, `imageRemoved`
- `edgeCreated`, `edgeDeleted`, `edgeUpdated`
- `workflowLoaded`, `workflowCleared`

CanvasController subscribes to these events in `bindEngineEvents()` and updates the visual representation accordingly.

### Node Type System

**Input Nodes** (blue gradient, 📤 icon)
- Allow manual image uploads (drag-drop or file picker)
- Base64 encoding for storage
- Can be source nodes for transformations

**Generated Nodes** (purple gradient, ✨ icon)
- Receive AI-generated images only
- Manual upload is restricted with user-friendly error messages
- Show "Generate" button when connected with prompt-configured edges

### Critical Performance Fix

**Infinite Rendering Loop Prevention** (canvasController.js:19-31, 270):
- **Problem**: Direct `this.network.redraw()` calls inside vis.js `nodeRenderer()` caused infinite loops
- **Solution**: requestAnimationFrame-based scheduler (`requestRedraw()` method)
- **Result**: Prevents re-entrance, consolidates multiple redraw requests, stabilizes CPU usage

## Cloudflare Workers Integration

### Proxy Server (`cloudflare-replicate-proxy.js`)

The production deployment uses Cloudflare Workers to solve CORS issues and secure API tokens.

**Key Features**:
- CORS header injection for browser compatibility
- Server-side Replicate API token management (never exposed to browser)
- R2 automatic backup of generated images and prediction metadata
- 24-second polling window with client-side continuation support
- URL validation (only allows api.replicate.com)

**Environment Configuration**:
```toml
# Required Secret
REPLICATE_API_TOKEN = "r8_..."

# Required R2 Binding
IMAGE_BUCKET → "nurumayu-nanobanana"

# Optional Variable
ALLOWED_ORIGINS = "*"  # or comma-separated list
```

**Endpoints**:
- `POST /` or `POST /proxy` - Create prediction with optional auto-polling
- `POST /poll` - Continue polling existing prediction
- `GET /health` - Health check and endpoint documentation
- `OPTIONS *` - CORS preflight handling

## Important Implementation Details

### LocalStorage Persistence

Workflows automatically save to LocalStorage (configurable via `config.autoSave`). The data structure includes:
- Workflow metadata (id, name, timestamps)
- Nodes array with positions, types, images, metadata
- Edges array with prompts, models, styles, connections

### Image Handling

- **Upload**: FileReader API converts to base64
- **Storage**: Base64 strings in node.images array
- **Display**: Canvas drawImage with cached Image objects
- **Size Limit**: 20MB per file (client-side validation)
- **Formats**: JPG, PNG, GIF, WebP

### Vis.js Custom Rendering

The `nodeRenderer()` function (canvasController.js:218-301) draws custom circles with:
- Gradient backgrounds (color-coded by type and status)
- Image thumbnails with circular clipping
- Type icons (📤 for input, ✨ for generated)
- Status indicators (ACTIVE/INACTIVE)

**Important**: Uses cached Image objects and only calls `requestRedraw()` (not direct redraw) when images load.

### Auto Layout Algorithm

`canvasController.autoLayout()` implements hierarchical positioning:
1. Categorize nodes by type (input vs generated)
2. Sort by connection count (prioritize highly-connected nodes)
3. Calculate positions with fixed spacing
4. Position standalone nodes separately
5. Animate transitions with vis.js physics

## Testing and Debugging

### Console Logging

Debug logging is implemented throughout:
- `js/debug.js` - Debug utilities
- Console logs for major operations (node creation, edge updates, image uploads)
- Error boundaries with try-catch and user-friendly Japanese error messages

### Browser Dev Tools

- Use Performance tab to verify no infinite rendering loops
- Network tab to monitor Replicate API calls (via proxy)
- Application tab to inspect LocalStorage (`workflow_*` keys)

## Common Workflows

### Creating a Basic Workflow
1. Add Input Node → Upload image
2. Add Generated Node
3. Enter Connect Mode (C key) → Click source → Click target
4. Configure prompt in modal (manual, template, or AI-generated)
5. Click Generate button on Generated Node

### Debugging Image Generation Issues
1. Check API key configuration in settings
2. Verify CORS-disabled Chrome or proxy is running
3. Check browser console for error messages
4. Test Cloudflare Workers health endpoint: `curl https://replicate-nanobanana.skume-bioinfo.workers.dev/health`

## File Structure Highlights

```
/
├── index.html              # Main entry point
├── js/
│   ├── workflowEngine.js   # State management core
│   ├── canvasController.js # Vis.js visualization
│   ├── workflowApp.js      # Application controller
│   ├── config.js           # Configuration management
│   ├── transformationService.js
│   ├── llmService.js
│   └── apiService.js
├── cloudflare-replicate-proxy.js  # Production proxy
├── proxy-server.js         # Local development proxy
└── sh/
    └── start-chrome-no-cors.sh    # CORS bypass helper
```

## Key Design Principles

- **Vanilla JavaScript**: No framework dependencies for simplicity and reduced bundle size
- **Event-Driven Architecture**: Loose coupling through event emitter pattern
- **Service Layer Pattern**: Separated concerns for API integrations
- **Progressive Enhancement**: Graceful fallbacks (e.g., LLM unavailable → template prompts)
- **LocalStorage First**: Client-side persistence with optional cloud backup
- **Performance Conscious**: requestAnimationFrame scheduling, image caching, debounced saves

## Known Limitations

- No user authentication (LocalStorage-based, single-user workflows)
- No real-time collaboration
- Browser-dependent (no mobile app)
- Currently supports only Nano Banana model (extensible architecture)
- CORS workarounds required for local development

## References

- **IMPLEMENTATION_REPORT.md**: Details on infinite loop fix and CORS solution
- **QUICK_START.md**: Setup guide for new users
- **AUTO_LAYOUT_IMPLEMENTATION.md**: Auto-layout feature documentation
