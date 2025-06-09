# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based DIY assistant tool for furniture and interior design. The application allows users to input natural language descriptions of furniture requirements and generates 3D models for preview and 3D printing using AI/LLM technology.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **3D Graphics**: Three.js for 3D rendering and model display
- **LLM Integration**: Cloudflare Worker endpoint at `https://nurumayu-worker.skume-bioinfo.workers.dev/`
- **Model**: `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
- **File Formats**: OBJ output for 3D models

## Architecture

The application follows a modular class-based architecture with separation of concerns:

### Core Components

1. **DIYAssistant (core.js)** - Main application controller
   - UI state management and event handling
   - Project management (save/load/delete)
   - Local storage persistence
   - Debug mode and logging system
   - Session restoration capabilities

2. **SceneManager (scene.js)** - 3D rendering and visualization
   - Three.js scene setup and management
   - OBJ model loading and display
   - Camera controls and lighting
   - Canvas overlay management

3. **AIManager (ai.js)** - LLM integration and model generation
   - API communication with Cloudflare Worker
   - Prompt optimization for furniture design
   - OBJ data cleaning and validation
   - STL conversion capabilities

4. **ProcessingManager (processing.js)** - 3-stage processing workflow
   - Stage 1: Specification analysis and optimization
   - Stage 2: 3D model generation
   - Stage 3: Quality validation and checking
   - Progress tracking and error handling

### Application Flow

1. **Input Phase**: User enters natural language furniture description
2. **3-Stage AI Processing**:
   - Stage 1: LLM analyzes and optimizes specifications
   - Stage 2: Generates detailed OBJ 3D model data
   - Stage 3: Validates quality and provides recommendations
3. **Preview Phase**: Three.js renders the 3D model for interactive preview
4. **Output Phase**: User can download OBJ files for 3D printing

## Key Files

- `index.html` - Main application interface with embedded CSS and structure
- `app.js` - Application initialization and module integration
- `core.js` - Main DIYAssistant class and UI management
- `scene.js` - 3D scene management with Three.js
- `ai.js` - LLM API integration and model processing
- `processing.js` - 3-stage workflow management
- `3step_progress.html` - Standalone UI demo for progress visualization

## Development Workflow

### Testing the Application
- Open `index.html` in a web browser (HTTP server recommended for CORS)
- Use sample buttons to quickly test different furniture types
- Check browser console for debug information when debug mode is enabled

### Debug Mode
- **Enable**: Press `Ctrl+Shift+D` or set `diy_debug_mode=true` in localStorage
- **Features**: Detailed logging, debug panel overlay, performance tracking
- **Export Logs**: Press `Ctrl+Shift+L` to download diagnostic logs

### Local Storage Management
- Projects are auto-saved to localStorage with 10-project limit
- Session state restoration supports page refresh recovery
- **Clear All Data**: Press `Ctrl+Shift+C` (with confirmation)

## API Configuration

### LLM Endpoint
- **URL**: `https://nurumayu-worker.skume-bioinfo.workers.dev/`
- **Model**: `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
- **Mode**: Non-streaming with 3000 max completion tokens
- **Temperature**: 0.1 for consistent outputs

### Request Format
```javascript
{
  model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  temperature: 0.1,
  stream: false,
  max_completion_tokens: 3000,
  messages: [...]
}
```

## Sample Data System

Built-in furniture samples with predefined specifications:
- **Desk**: 120×60×75cm learning desk with drawers
- **Shelf**: 80×30×180cm bookshelf with adjustable shelves  
- **Chair**: 45×50×80cm dining chair with ergonomic design
- **Cabinet**: 90×40×85cm storage cabinet with doors and drawers

## State Management

### Session Persistence
- UI inputs auto-saved to localStorage on change
- Active 3D models restored on page reload
- 24-hour session expiration for automatic cleanup

### Project Management
- Complete project state including 3D data, prompts, and metadata
- Stage-specific results (analysis, generation, validation) preserved
- Project loading with 3D model restoration

## Error Handling

### Robust Error Recovery
- API timeout handling (30-second limit)
- Fallback 3D preview when Three.js fails
- Graceful degradation for missing dependencies
- Comprehensive error logging for troubleshooting

### User Feedback
- Real-time progress indicators for 3-stage processing
- Persistent error messages for user awareness
- Success notifications with auto-dismiss
- Loading states with descriptive text

## Performance Considerations

### 3D Model Optimization
- Target 200-500 vertices for detail vs. performance balance
- Quality requirements vary by furniture type (chairs need higher precision)
- Automatic model validation for manufacturing feasibility

### Memory Management
- Limited project history (10 items max)
- Automatic cleanup of expired sessions
- Debug mode memory usage tracking

## Security Notes

- No sensitive data stored in localStorage
- API endpoint uses public Cloudflare Worker
- Client-side only processing with no backend storage
- CORS handling for cross-origin API requests

## Current Status

This is a functional 3D furniture design assistant with complete workflow from natural language input to downloadable 3D models. The modular architecture supports future enhancements such as material selection, collaborative features, or integration with CAD software.