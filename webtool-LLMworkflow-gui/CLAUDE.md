# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a visual LLM workflow editor built with vanilla HTML, CSS, and JavaScript. It allows users to create complex AI workflows using a node-based GUI system without programming knowledge. The application supports multi-stage processing, branching, merging, and automatic code generation.

## Architecture

### Core Components

- **app.js**: Main application logic containing the `WorkflowEditor` class
  - Handles node creation, drag & drop, pan/zoom canvas operations
  - Manages workflow execution engine with topological sorting
  - Implements viewport state persistence in localStorage
  - Provides JSON import/export functionality

- **index.html**: Single-page application with three main sections:
  - Left sidebar: Node palette and workflow settings
  - Center canvas: Visual workflow editor with pan/zoom capabilities
  - Right panel: Node properties editor

- **llm.js**: API integration module for LLM calls
  - Connects to external LLM API endpoint
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

## Common Development Tasks

### Running the Application
- Open `index.html` in a web browser
- No build process required - pure client-side application

### Testing Workflows
- Use the execution panel in the left sidebar
- Enter test data in the "入力データ" textarea
- Click "ワークフロー実行" to run the workflow
- Check browser console for detailed execution logs

### Adding New Node Types
1. Add node template HTML in index.html node palette
2. Define default data in `getDefaultNodeData()` method
3. Add icon mapping in `renderNode()` method  
4. Implement execution logic in `executeNode()` method
5. Add property form generation in `generatePropertiesForm()`
6. Update connection rules in `isValidConnection()`

### Debugging
- Execution logs are available in browser console
- Viewport state and workflow data persist in localStorage
- Use browser dev tools to inspect node positions and connections

## Code Style Notes

- Uses ES6 class syntax and async/await
- Extensive use of localStorage for state persistence
- SVG for connection lines with proper pan/zoom transforms
- Event delegation pattern for dynamic node interactions
- Comprehensive error handling with user-friendly messages

## API Configuration

The LLM API endpoint is configured in `llm.js`. To change providers:
1. Update the `apiUrl` variable
2. Modify the request format in `callLLMAPI()`
3. Adjust response parsing in `parseRecipeResponse()` if needed