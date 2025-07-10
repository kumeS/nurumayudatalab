# CLAUDE.md


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based system for generating SMILE or MOL files for metabolites and chemical compounds using LLM text input, with 3D molecular visualization capabilities. The system is designed to be implemented using HTML5, CSS, and JavaScript only.

### Key Technologies
- **Frontend**: Pure HTML5, CSS, JavaScript (no frameworks)
- **LLM API**: io.net API using Llama-4 via Cloudflare Worker endpoint
- **3D Visualization**: 3Dmol.js library for molecular structure display
- **Reference Design**: Based on gitingest-ui.html styling

### Architecture

The project consists of three main components:

1. **llm.js**: Core LLM API integration module
   - Handles communication with `https://nurumayu-worker.skume-bioinfo.workers.dev/`
   - Uses `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` model
   - Contains JSON response parsing logic for structured data extraction

2. **gitingest-ui.html**: Reference UI design template
   - Clean, modern interface with header/navigation structure
   - Uses system fonts and minimal styling approach
   - Color scheme: black text, red accent (#ff1744), white/light gray backgrounds

3. **実装案.txt**: Project specification and implementation plan (Japanese)
   - Defines the three-step development process:
     - Step 1: LLM-based SMILE/MOL file generation
     - Step 2: 3D molecular visualization with 3Dmol.js
     - Step 3: MS fragmentation prediction using LLM

### Development Workflow

Since this is a pure frontend project:
- No build process required
- Test by opening HTML files directly in browser
- Development server can be started with `python -m http.server` or similar for testing

### API Integration Details

The LLM API expects:
```javascript
{
  model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  temperature: 0.7,
  stream: false,
  max_completion_tokens: 2000,
  messages: [...]
}
```

Response parsing handles multiple JSON extraction patterns:
- JSON wrapped in ```json blocks
- JSON wrapped in ``` blocks  
- Direct JSON extraction from braces
- Fallback to direct parsing

### Implementation Notes

- Focus on chemical informatics and molecular structure generation
- Integrate 3Dmol.js for interactive 3D molecular visualization
- Maintain clean, accessible UI following the reference design
- All text processing and molecule generation handled via LLM API calls
- No backend infrastructure required - purely client-side application