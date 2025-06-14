# LLM Workflow Editor

> Visual AI workflow creation tool - Build complex AI pipelines without programming knowledge

## 📌 Project Overview

This is a visual LLM workflow editor built with vanilla HTML, CSS, and JavaScript. It allows users to create complex AI workflows using a node-based GUI system without programming knowledge. The application supports multi-stage processing, branching, merging, and automatic code generation.

## 🏗️ Current Architecture (Modular Design)

### Core Modules

The application follows a **modular ES6 class-based architecture** (refactored from single-file):

```
webtool-LLMworkflow-gui/
├── index.html              # Main HTML file with UI structure
├── styles.css              # Tailwind CSS-based styling
├── workflow-editor.js      # Main coordinator class
├── node-manager.js         # Node creation and management
├── connection-manager.js   # Connection rendering and logic
├── event-handlers.js       # DOM event handling
├── ui-manager.js          # UI panels and property management
├── workflow-executor.js   # Workflow execution engine
├── llm.js                 # LLM API integration (mocked)
└── CLAUDE.md              # Project documentation for AI assistants
```

### Module Responsibilities

#### 1. **WorkflowEditor** (workflow-editor.js)
- Main coordinator class that initializes and manages all modules
- Maintains workflow state (nodes, connections, metadata)
- Provides delegation methods to sub-modules
- Handles canvas state (zoom, pan, transformations)

#### 2. **NodeManager** (node-manager.js)
- Node creation, deletion, and position management
- Node type definitions and default data structures
- DOM element generation for different node types
- Node selection and updates

#### 3. **ConnectionManager** (connection-manager.js)
- SVG-based connection line rendering
- Connection creation and deletion logic
- Port position calculations with canvas transformations
- Connection validation and state management

#### 4. **EventHandlers** (event-handlers.js)
- Mouse and keyboard event processing
- Drag and drop functionality for nodes and palette items
- Canvas interaction handling
- Connection creation through port clicks

#### 5. **UIManager** (ui-manager.js)
- Property panel generation and updates
- Node palette rendering
- Modal dialogs and UI state management
- Node-specific configuration forms

#### 6. **WorkflowExecutor** (workflow-executor.js)
- Topological sorting for execution order
- Node execution with data flow
- Mock LLM API calls (currently simulated)
- Execution state management

### ✅ Working Features
- Visual node editor with drag-and-drop functionality
- Node connection system (internal logic working)
- Property panel for node configuration  
- Basic workflow execution with topological sorting
- Modular architecture with clear separation of concerns
- Node creation from palette
- Node selection and property editing
- Event handling system

### 🔄 Partially Working Features
- Connection creation (works internally but lines not visible)
- Property panel updates (timing issues)
- Node dragging (works but some offset issues)

### ❌ Missing/Broken Features
- **Visual connection lines rendering** (Critical)
- **Canvas pan functionality** (Critical)
- Data persistence (save/load)
- Real LLM API integration
- Advanced node types implementation

## 🎯 Supported Node Types

| Node Type | Description | Implementation Status |
|-----------|-------------|----------------------|
| **Input** | Data entry points with configurable input types | ✅ Complete |
| **LLM Process** | AI language model processing with prompts | 🔄 Mock Implementation |
| **Branch** | Conditional logic branching | 🔄 Mock Implementation |
| **Merge** | Multiple input aggregation | 🔄 Mock Implementation |
| **Filter** | Data filtering and transformation | 🔄 Mock Implementation |
| **Loop** | Iterative operations | 🔄 Mock Implementation |
| **Custom** | Custom JavaScript code execution | 🔄 Mock Implementation |
| **Output** | Final output destinations | ✅ Complete |

## 🐛 Critical Bugs Identified (Dev_02.txt Requirements)

Based on comprehensive testing and analysis, the following critical bugs have been identified:

### 🔴 **CRITICAL BUG #1: Connection Lines Not Visible**
- **Issue**: Internal connections are created successfully (console shows "Total connections: 1"), but visual connection lines do not render on canvas
- **Evidence**: Property panel shows correct connection counts, but no visual lines appear in SVG
- **Impact**: High - Users cannot see their workflow connections
- **Root Cause**: SVG coordinate calculation and rendering timing issues
- **Files to Fix**: `connection-manager.js`, `styles.css`

### 🔴 **CRITICAL BUG #2: Canvas Pan Functionality Missing** 
- **Issue**: Canvas cannot be panned/moved by dragging empty areas
- **User Request**: "バレット画面の左右上下移動が実装されていない" (Canvas left/right/up/down movement not implemented)
- **Impact**: High - Users cannot navigate large workflows  
- **Files to Fix**: `event-handlers.js`, `workflow-editor.js`

### 🟡 **BUG #3: Input Node Color Issues**
- **Issue**: "Input Nodeの色合いが良くない。オレンジがInput Nodeの色に加わると見にくい" (Input node colors are bad, orange makes them hard to see)
- **Impact**: Medium - Affects visual clarity
- **Files to Fix**: `styles.css`

### 🟡 **BUG #4: Connection Port Positioning**
- **Issue**: "Connect nodeは、Nodeの左右の中央にあるべきです" (Connection ports should be centered on left/right sides)
- **Requirement**: "Connect nodeは出力は最大で3つまで増やせるようにしたい" (Want to support up to 3 output ports)
- **Files to Fix**: `connection-manager.js`, `styles.css`, `node-manager.js`

### 🟡 **BUG #5: Property Panel Update Timing**
- **Issue**: "プロパティパネルの接続数表示が正しく更新されない。updatePropertyPanel()の呼び出しタイミングの問題" (Property panel connection counts don't update correctly due to updatePropertyPanel() timing issues)
- **Impact**: Medium - Confusing but doesn't break functionality
- **Files to Fix**: `ui-manager.js`, `connection-manager.js`

## 🔧 Required Bug Fixes (Implementation Plan)

### Fix 1: Connection Line Visibility

**File: `connection-manager.js`**
```javascript
// Fix SVG coordinate calculation issues
getPortPosition(node, portType) {
    // Enhanced coordinate calculation with proper canvas transform handling
    // Ensure DOM elements are ready before calculation
    // Add retry mechanism for timing issues
}

renderConnections() {
    // Force multiple render attempts with proper timing
    // Add debugging logs to track rendering issues
    // Ensure SVG z-index and visibility
}
```

**File: `styles.css`**
```css
/* Ensure connection lines are visible */
#connections-svg {
    z-index: 15; /* Increase from current value */
    pointer-events: auto;
}

#connections-svg path {
    stroke: #dc2626 !important;
    stroke-width: 3px !important;
    opacity: 1 !important;
}
```

### Fix 2: Canvas Pan Implementation

**File: `event-handlers.js`**
```javascript
// Add canvas panning functionality
setupCanvasPanEvents() {
    const canvas = document.getElementById('canvas');
    
    // Mouse down on empty canvas starts panning
    canvas.addEventListener('mousedown', (e) => {
        if (e.target === canvas) {
            this.editor.canvasPanState.isPanning = true;
            this.editor.canvasPanState.startX = e.clientX;
            this.editor.canvasPanState.startY = e.clientY;
            this.editor.canvasPanState.startTranslateX = this.editor.canvasState.translateX;
            this.editor.canvasPanState.startTranslateY = this.editor.canvasState.translateY;
        }
    });
    
    // Mouse move updates pan position
    // Mouse up ends panning
}
```

### Fix 3: Input Node Color Correction

**File: `styles.css`**
```css
/* Change Input node from orange to teal/cyan */
.node-input { 
    border-color: #17a2b8; /* Teal instead of orange */
    background: linear-gradient(145deg, #ffffff 0%, #f0fdff 100%);
}

.icon-input { 
    background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
}
```

### Fix 4: Multiple Output Port Support

**File: `connection-manager.js`**
```javascript
// Support multiple output ports
getPortPosition(node, portType, portIndex = 0) {
    // For output ports, calculate position based on portIndex
    // Distribute up to 3 output ports evenly on right side
    // Center single input port on left side
}
```

### Fix 5: Property Panel Update Timing

**File: `ui-manager.js`**
```javascript
// Fix update timing with proper async handling
updatePropertyPanel() {
    // Use requestAnimationFrame for proper DOM timing
    requestAnimationFrame(() => {
        // Update connection counts
        // Refresh property forms
        this.setupPropertyPanelEvents();
    });
}
```

### Running the Application

1. **Direct Browser Opening**:
   ```bash
   open index.html
   ```

2. **Local Server (Recommended)**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx http-server
   ```

### Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Custom Tailwind-like CSS utilities
- **Build**: None (static files)
- **Dependencies**: None (no CDN usage)

### Architecture Patterns
- **Modular Design**: Concerns separated into distinct ES6 classes
- **Direct DOM Manipulation**: Framework-free lightweight implementation
- **SVG-Based Drawing**: Connection lines rendered with SVG
- **Event-Driven**: Responsive to user interactions
- **Delegation Pattern**: Main class delegates to specialized modules

## 📖 Usage Guide

### Basic Operations

1. **Adding Nodes**: Drag from left palette or click to add to canvas
2. **Node Connections**: Use property panel dropdown or drag between ports  
3. **Property Editing**: Select node to open right property panel
4. **Workflow Execution**: Click "Execute Workflow" button in toolbar
5. **File Operations**: Currently not implemented (save/load missing)

### Debugging

Available in browser developer console:

```javascript
// Access main editor instance
window.workflowEditor

// Inspect workflow data
window.workflowEditor.workflow.nodes        // All nodes  
window.workflowEditor.workflow.connections  // All connections
window.workflowEditor.executionResults      // Execution results

// Debug specific modules
window.workflowEditor.connectionManager.renderConnections()
window.workflowEditor.nodeManager.renderNodes()
```

## 🎯 Development Roadmap

### Phase 1: Critical Bug Fixes (1 week)
1. **Fix connection line visibility** - SVG rendering and coordinate calculation
2. **Implement canvas pan functionality** - Mouse drag navigation  
3. **Correct Input node colors** - Change from orange to teal
4. **Fix property panel timing** - Connection count updates
5. **Add multiple output port support** - Up to 3 ports per node

### Phase 2: Core Features (2-3 weeks)
1. **Real LLM API integration** - Replace mock implementations
2. **Data persistence** - localStorage and file save/load
3. **Advanced connection management** - Visual port connections
4. **Workflow validation** - Structure and data flow validation

### Phase 3: Advanced Features (1-2 months)
1. **Import/export functionality** - JSON, code generation
2. **Version control and history** - Undo/redo, change tracking
3. **Performance optimizations** - Large workflow handling
4. **Collaborative editing** - Multi-user support

## 🤝 Contributing

### Code Style Guidelines
1. **ES6+ Standards**: Use modern JavaScript with class-based architecture
2. **Modular Design**: Keep concerns separated in appropriate modules
3. **Clear Naming**: Use descriptive variable and method names
4. **Documentation**: Update CLAUDE.md for AI assistant guidance

### Testing
- **UI Testing**: Use Playwright for visual and interaction testing
- **Manual Testing**: Test in multiple browsers (Chrome, Firefox, Safari)
- **Console Testing**: Use browser console debugging utilities

### Adding New Node Types
1. Add definition to `nodeTypes` array in `workflow-editor.js`
2. Add icon SVG in `getIcon()` method
3. Define default data in `getDefaultNodeData()` method in `node-manager.js`
4. Add property form in `getNodeSpecificFields()` method in `ui-manager.js`
5. Implement execution logic in `executeNode()` method in `workflow-executor.js`

## 📄 File Structure Summary

| File | Lines | Purpose |
|------|-------|---------|
| `workflow-editor.js` | ~380 | Main coordinator and delegation |
| `ui-manager.js` | ~750 | Property panels and UI management |
| `connection-manager.js` | ~370 | Connection logic and SVG rendering |
| `event-handlers.js` | ~300 | Mouse/keyboard event processing |
| `node-manager.js` | ~200 | Node creation and management |
| `workflow-executor.js` | ~150 | Workflow execution engine |
| `llm.js` | ~100 | LLM API integration (mocked) |
| `styles.css` | ~850 | Tailwind-based styling |
| `index.html` | ~250 | Single-page application layout |

## 📊 Current Status

**Project Version**: v0.3.x  
**Architecture**: Modular ES6 Classes  
**Last Updated**: June 2025  
**Development Status**: Active - Critical bug fixing phase

### Key Metrics
- **Total Code**: ~3,400 lines across 9 files
- **Working Features**: 70% (Node creation, basic connections, property editing)
- **Critical Bugs**: 5 identified (2 high priority, 3 medium priority)
- **Test Coverage**: Manual testing with Playwright automation

---

**For detailed AI assistant guidance, see [CLAUDE.md](./CLAUDE.md)**