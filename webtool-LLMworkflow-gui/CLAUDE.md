# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a visual LLM workflow editor built with vanilla HTML, CSS, and JavaScript. It allows users to create complex AI workflows using a node-based GUI system without programming knowledge. The application supports multi-stage processing, branching, merging, and automatic code generation.

## Architecture

### Modular Architecture

The application uses a modular architecture with separate manager classes:

- **app.js**: Application bootstrap and error handling
  - Creates the main `WorkflowEditor` instance
  - Provides global debugging utilities (`window.dev`)
  - Handles application-level error states

- **workflow-editor.js**: Main orchestrator class
  - Initializes and coordinates all manager classes
  - Sets up inter-manager communication via callbacks
  - Manages DOM event listeners for toolbar buttons

- **Manager Classes** (each handles a specific domain):
  - `ViewportManager`: Canvas pan/zoom/grid operations
  - `NodeManager`: Node creation, selection, movement, deletion
  - `ConnectionManager`: Connection drawing and management
  - `PropertiesManager`: Property panel rendering and editing
  - `WorkflowExecutor`: Workflow execution with topological sorting
  - `StorageManager`: Save/load/import/export functionality

- **index.html**: Single-page application with three main sections:
  - Left sidebar: Node palette and workflow settings  
  - Center canvas: Visual workflow editor with pan/zoom capabilities
  - Right panel: Node properties editor

- **llm.js**: API integration module for LLM calls
  - Connects to external LLM API endpoint (currently Cloudflare Workers)
  - Handles response parsing with multiple JSON extraction patterns
  - Contains robust error handling for malformed responses

### Node System

The application supports 10 node types:
- `input`: Data entry points
- `llm`: LLM processing with customizable prompts
- `branch`: Conditional logic branching  
- `merge`: Multiple input aggregation
- `transform`: JavaScript-based data transformation
- `filter`: Data filtering with conditions/patterns
- `sort`: Data sorting operations
- `aggregate`: Statistical aggregations
- `split`: Data splitting operations
- `output`: Final output nodes

### Workflow Execution

- Uses topological sorting to determine execution order
- Supports async execution with proper error handling
- Maintains execution logs for debugging
- Validates node connections based on defined rules

## Development Commands

### Running the Application
```bash
# Simply open index.html in a web browser
open index.html
# Or serve locally (if preferred)
python -m http.server 8000
```

### Debugging Utilities
Available in browser console:
```javascript
// Access the main editor instance
window.workflowEditor

// Development helpers
window.dev.getEditor()           // Get editor instance
window.dev.getNodes()            // Get all nodes
window.dev.getConnections()      // Get all connections  
window.dev.exportData()          // Export workflow data
window.dev.clearAll()            // Clear workflow silently
window.debugWorkflow()           // Debug current workflow
window.getManagerStatus()        // Get manager status info
```

## Architecture Patterns

### Manager Communication
- Managers communicate via callback pattern set in `workflow-editor.js`
- Each manager is initialized with dependencies injected
- State changes trigger callbacks to maintain consistency

### File Loading Order
Critical: Scripts must load in this order (as defined in index.html):
1. `llm.js` - API utilities
2. `viewport-manager.js` - Canvas operations  
3. `node-manager.js` - Node management
4. `connection-manager.js` - Connection handling
5. `properties-manager.js` - Properties panel
6. `workflow-executor.js` - Execution engine
7. `storage-manager.js` - Persistence
8. `workflow-editor.js` - Main orchestrator
9. `app.js` - Bootstrap

### Adding New Node Types
1. Add node template in `index.html` node palette section
2. Update `getDefaultNodeData()` in NodeManager
3. Add icon mapping in `renderNode()` method
4. Implement execution logic in WorkflowExecutor's `executeNode()`
5. Add property form generation in PropertiesManager
6. Update connection validation rules in ConnectionManager

## Code Style Notes

- Uses ES6 class syntax and async/await
- Extensive use of localStorage for state persistence  
- SVG for connection lines with proper pan/zoom transforms
- Event delegation pattern for dynamic node interactions
- Comprehensive error handling with user-friendly messages
- Modular architecture with clear separation of concerns

## API Configuration

The LLM API endpoint is configured in `llm.js`:
- **Current endpoint**: Cloudflare Workers proxy (`https://nurumayu-worker.skume-bioinfo.workers.dev/`)
- **Model**: `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
- **Response parsing**: Supports multiple JSON extraction patterns for robust parsing

To change providers:
1. Update the `apiUrl` variable in `llm.js:4`
2. Modify the request format in `callLLMAPI()` function  
3. Adjust response parsing in `parseRecipeResponse()` if needed

## Data Persistence

- **localStorage**: All workflow data, viewport state, and settings
- **Auto-save**: Triggered on any workflow modification
- **Import/Export**: JSON format for workflow sharing
- **Session restoration**: Automatic restoration on page reload