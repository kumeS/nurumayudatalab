# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GLB/GLTF 3D model viewer built with vanilla JavaScript and Three.js. The project provides an interactive web application for viewing, manipulating, and saving states of 3D models directly in the browser.

## Architecture

### Core Components 
- **GLBViewer Class** (`js/glb-viewer.js`): Main application class that handles all 3D rendering, model loading, and user interactions
- **Main Application** (`js/main.js`): Entry point that initializes the GLBViewer when the page loads
- **Three.js Integration**: Uses Three.js for 3D rendering with GLTFLoader for model loading, OrbitControls for camera manipulation, and WebGL rendering
- **Transform System**: Direct mouse manipulation system for translate/rotate/scale operations on loaded models
- **State Management**: LocalStorage-based save/load system for preserving model transforms and scene settings

### Key Features
- Drag & drop GLB/GLTF file loading
- Three transform modes: Translate (T), Rotate (R), Scale (S) with keyboard shortcuts
- Real-time transform value display
- Background color customization with presets
- State persistence (save/load model transforms and settings)
- Screenshot capture functionality
- Responsive design with mobile support

## Development

### File Structure
```
webtool-single-glb-viewer/
├── index.html              # Main HTML file with CSS styles
├── js/
│   ├── glb-viewer.js      # GLBViewer class (main application logic)
│   └── main.js            # Application initialization
├── CLAUDE.md              # This file
├── README.md              # User documentation
└── 実装案.txt             # Japanese specification document
```

### Dependencies (CDN-based)
- Three.js r128 core library
- GLTFLoader for model loading
- OrbitControls for camera manipulation

### No Build Process
This is a static project with no build tools, package managers, or compilation steps. Simply open `index.html` in a web browser to run the application.

### Key Methods (GLBViewer class)
- `loadModel(file)` - Handles GLB/GLTF file loading and scene setup
- `setTransformMode(mode)` - Switches between translate/rotate/scale modes
- `handleTranslate/Rotate/Scale()` - Direct manipulation transform handlers
- `saveState()/loadState()` - LocalStorage persistence system
- `updateTransformDisplay()` - Updates UI with current model transform values

### Mouse Interaction System
The application implements a custom direct manipulation system:
- Mouse down on model enters transform mode and disables OrbitControls
- Mouse drag applies transforms based on current mode (translate/rotate/scale)
- Mouse up exits transform mode and re-enables OrbitControls
- Intersection plane calculations for accurate 3D transformations

### Keyboard Shortcuts
- `T` - Switch to translate mode
- `R` - Switch to rotate mode  
- `S` - Switch to scale mode
- `Ctrl+S` - Save current state
- `Ctrl+L` - Load saved state
- `Esc` - Reset model transforms