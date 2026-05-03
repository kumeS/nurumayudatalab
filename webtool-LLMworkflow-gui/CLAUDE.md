# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a visual LLM workflow editor built with vanilla HTML, CSS, and JavaScript. It allows users to create complex AI workflows using a node-based GUI system without programming knowledge. The application supports multi-stage processing, branching, merging, and LLM API integration.

## Architecture

### Modular ES6 Architecture

The application uses a modular ES6 class-based architecture with clear separation of concerns:

- **workflow-editor.js**: Main orchestrator class (`WorkflowEditor`)
  - Central state management (workflow, canvas, selection)
  - Module coordination and initialization
  - Delegates functionality to specialized modules

- **node-manager.js**: Node lifecycle management
  - Node creation, deletion, duplication, positioning
  - Node rendering and visual updates
  - Supports 8 node types: input, llm, branch, merge, filter, loop, custom, output

- **connection-manager.js**: Connection system
  - SVG-based connection drawing with Bezier curves
  - Connection validation and conflict prevention
  - Interactive connection creation and deletion

- **event-handlers.js**: User interaction management
  - Drag & drop, mouse/keyboard events
  - Context menus and canvas zoom/pan
  - Global event coordination

- **ui-manager.js**: UI component management
  - Dynamic property panels for each node type
  - Node palette rendering and form handling
  - Panel visibility and modal controls

- **workflow-executor.js**: Execution engine
  - Topological sorting for execution order
  - Node-specific execution logic
  - Error handling and result management

- **llm.js**: LLM API client
  - Multiple API endpoint support (Cloudflare Workers, io.net)
  - Retry logic with exponential backoff
  - Response parsing and timeout handling

- **index.html**: Single-page application with three-panel layout
- **styles.css**: Tailwind CSS-based styling

### Node System

The application supports 8 node types:
- `input`: Data entry points with configurable input text
- `llm`: LLM processing with customizable prompts and API integration
- `branch`: Conditional logic branching with custom JavaScript conditions
- `merge`: Multiple input aggregation with various merge strategies
- `filter`: Data filtering with condition-based logic
- `loop`: Iterative processing with configurable loop conditions
- `custom`: Custom JavaScript execution with user-defined code
- `output`: Final output nodes with result display

All node types are fully implemented with real execution capabilities.

### Workflow Execution

- Uses topological sorting to determine execution order
- Supports async execution with proper error handling
- Maintains execution logs and results for debugging
- Real LLM API integration with fallback support
- Validates node connections and prevents circular dependencies

## Development Commands

### Running the Application
```bash
# Open directly in browser (macOS)
open index.html

# Serve locally (recommended for development)
python -m http.server 8000
# Then visit http://localhost:8000

# Alternative servers
python3 -m http.server 8000    # Python 3 explicitly
npx http-server                 # Node.js (if available)
```

### Git Status Commands
```bash
# Check git status for modified files
git status

# View current changes
git diff

# View recent commits
git log --oneline -10
```

### Module Loading Order
Critical loading sequence defined in index.html:
1. `llm.js` (standalone API utility)
2. `node-manager.js`
3. `connection-manager.js`
4. `event-handlers.js`
5. `ui-manager.js`
6. `workflow-executor.js`
7. `workflow-editor.js` (main orchestrator)

### Debugging Utilities
Available in browser console:
```javascript
// Access the main editor instance
window.workflowEditor

// Workflow state inspection
window.workflowEditor.workflow.nodes         // All nodes
window.workflowEditor.workflow.connections   // All connections
window.workflowEditor.executionResults       // Last execution results
window.workflowEditor.selectedNode           // Currently selected node

// Module access
window.workflowEditor.nodeManager           // Node operations
window.workflowEditor.connectionManager     // Connection operations
window.workflowEditor.eventHandlers         // Event management
window.workflowEditor.uiManager             // UI operations
window.workflowEditor.workflowExecutor      // Execution engine
```

## Architecture Patterns

### Modular Design
- Functionality is separated across specialized modules
- `WorkflowEditor` acts as the main coordinator, delegating to modules
- Each module receives the editor instance for state access
- State management is centralized in the main `WorkflowEditor` class
- DOM manipulation is distributed across relevant modules

### Module Interaction Pattern
```javascript
// Main controller initializes all modules
class WorkflowEditor {
  constructor() {
    this.nodeManager = new NodeManager(this);
    this.connectionManager = new ConnectionManager(this);
    this.eventHandlers = new EventHandlers(this);
    this.uiManager = new UIManager(this);
    this.workflowExecutor = new WorkflowExecutor(this);
  }
}
```

### Adding New Node Types
1. Add node type definition to `nodeTypes` array in `node-manager.js`
2. Add icon SVG to `getNodeIcon()` method in `node-manager.js`
3. Add default data structure to `getDefaultNodeData()` in `node-manager.js`
4. Add property form logic to `generatePropertyForm()` in `ui-manager.js`
5. Implement execution logic in `executeNode()` in `workflow-executor.js`
6. Add styling in `styles.css` for the new node type

## Code Style Notes

- Uses ES6 class syntax and async/await throughout
- Direct DOM manipulation without external frameworks
- SVG-based visual connections with Bezier curves
- Comprehensive error handling with user-friendly messages
- Modular architecture with clear separation of concerns
- No build process - pure vanilla JavaScript
- No external dependencies

## Implementation Status

### ✅ Fully Implemented
- Visual node editor with drag-and-drop
- Node connection system with SVG rendering
- Property panels for all node types
- Canvas zoom/pan functionality
- Context menus and keyboard shortcuts
- LLM API integration with fallback support
- Workflow execution engine with topological sorting
- All 8 node types with real execution

### 🔄 Partially Implemented
- Error handling (basic implementation, could be enhanced)
- Node validation (connection rules implemented, data validation basic)

### ❌ Not Implemented
- Data persistence (no localStorage/IndexedDB)
- Import/export functionality
- Undo/redo functionality
- Real-time collaboration
- Advanced workflow features (sub-workflows, templates)

## Current Limitations

- **No Persistence**: Workflows are lost on page refresh
- **Limited Error Recovery**: Basic error handling, no retry mechanisms for failed nodes
- **No Offline Support**: Requires internet connection for LLM API calls
- **Browser Compatibility**: Uses modern ES6+ features, may not work in older browsers

## Critical Issues to Address

### High Priority Bugs
1. **Connection Lines Not Visible**: SVG rendering fails, connections exist internally but don't display
2. **Canvas Pan Missing**: Cannot drag canvas to navigate large workflows
3. **Node ID Duplication**: System stability issues with duplicate node IDs

### Files Requiring Fixes
- `connection-manager.js`: SVG coordinate calculation and rendering timing
- `event-handlers.js`: Canvas pan functionality implementation
- `ui-manager.js`: Property panel update timing issues
- `styles.css`: Input node color improvements and connection line visibility

## Configuration Notes

### Project Structure
- **No package.json**: Pure vanilla JavaScript, no npm dependencies
- **No build process**: Direct browser execution
- **No test framework**: Manual testing with planned Playwright integration
- **Git repository**: Active development with recent commits focused on v0.3.x

### Japanese Documentation
The `/Dev/` directory contains extensive Japanese development documentation:
- `dev.txt`: Architecture patterns and implementation details
- `memo.txt`: Bug reports and fix requirements
- Various implementation notes and development plans