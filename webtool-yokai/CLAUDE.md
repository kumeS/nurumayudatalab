# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered yokai (Japanese supernatural beings) dictionary web application that uses LLM APIs to search for yokai and generate images via Replicate API. The application has evolved from a plant identification tool to a yokai encyclopedia.

## Architecture

### Core Components

- **app.js**: Main application logic containing:
  - `ReplicateImageClient`: Handles Replicate API image generation
  - `YokaiImageStorage`: Local storage management for saved images
  - `PlantSearchLLM`: LLM search functionality (legacy naming from plant app)
  - Image generation pipeline with prompt optimization
  - Multi-model support (SDXL Lightning, Minimax Image-01)

- **index.html**: Frontend interface with search functionality and image display

- **実装案.txt**: Implementation specification document outlining the MVP design for the yokai dictionary

### API Integration

- **LLM Search API**: `https://nurumayu-worker.skume-bioinfo.workers.dev/`
  - Model: `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
  - Handles yokai search and information retrieval

- **Replicate Image API**: `https://nurumayu-replicate-api.skume-bioinfo.workers.dev/`
  - SDXL Lightning: Fast 4-step generation with width/height control (512-1280px)
  - Minimax Image-01: High quality with aspect ratio control (1:1, 3:4, 4:3, 9:16, 16:9)

### Image Generation Pipeline

1. **Draft Prompt Creation**: Creates initial yokai-specific prompts
2. **LLM Optimization**: Uses separate LLM API to optimize prompts for image generation
3. **Style Processing**: Supports botanical, anime, and realistic styles
4. **Multi-Model Generation**: Supports both SDXL Lightning and Minimax models
5. **Auto-Save**: Generated images are automatically saved to local storage

## Development Notes

### Code Structure Peculiarities

- Many function and variable names still reference "plants" (legacy from original plant identification app)
- `yokaiInfo` objects use plant-like field names (`scientificName`, `feature1`, etc.)
- Translation functions map Japanese yokai features to English for image generation

### Image Generation Options

**SDXL Lightning**:
- Fast generation (4 steps)
- Width/height control (512-1280px, default 1024x1024)
- Scheduler options: K_EULER (default)
- Guidance scale: 0 (default)

**Minimax Image-01**:
- High quality generation
- Aspect ratio control: 1:1 (default), 3:4, 4:3, 9:16, 16:9
- Better for detailed artwork

### Error Handling

- Comprehensive logging with request IDs and timestamps
- Fallback mechanisms for prompt optimization failures
- Japanese text detection and automatic translation
- Retry logic with exponential backoff

### Local Storage

- Automatic image saving with Base64 conversion
- Maximum 50 images, 5MB per image limit
- Storage management with deletion capabilities

## Common Development Tasks

Since this is a simple web application with no build system:

- **Run locally**: Open `index.html` in a web browser
- **Test API calls**: Check browser console for detailed logging
- **Debug image generation**: Look for 🔥 prefixed logs in console
- **Check storage**: Use browser dev tools Application tab

No package management, build commands, or test runners are present in this project.