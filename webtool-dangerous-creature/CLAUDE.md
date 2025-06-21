# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered dangerous creature dictionary web application that uses LLM APIs to search for dangerous organisms and generate images via Replicate API. The application identifies dangerous creatures such as poisonous animals, venomous creatures, pathogenic microorganisms, and toxic plants that pose risks to human health and safety.

## Architecture

### Core Components

- **app.js**: Main application logic containing:
  - `ReplicateImageClient`: Handles Replicate API image generation
  - `dangerousImageStorage`: Local storage management for saved images
  - `dangerousSearchLLM`: LLM search functionality for dangerous creatures
  - Image generation pipeline with prompt optimization
  - Multi-model support (SDXL Lightning, Minimax Image-01)

- **index.html**: Frontend interface with search functionality and image display

- **実装案.txt**: Implementation specification document outlining the MVP design for the dangerous creature dictionary

### API Integration

- **LLM Search API**: `https://nurumayu-worker.skume-bioinfo.workers.dev/`
  - Model: `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
  - Handles dangerous creature search and information retrieval

- **Replicate Image API**: `https://nurumayu-replicate-api.skume-bioinfo.workers.dev/`
  - SDXL Lightning: Fast 4-step generation with width/height control (512-1280px)
  - Minimax Image-01: High quality with aspect ratio control (1:1, 3:4, 4:3, 9:16, 16:9)

### Image Generation Pipeline

1. **Draft Prompt Creation**: Creates initial dangerous creature-specific prompts
2. **LLM Optimization**: Uses separate LLM API to optimize prompts for image generation
3. **Style Processing**: Supports scientific, anime, and realistic styles
4. **Multi-Model Generation**: Supports both SDXL Lightning and Minimax models
5. **Auto-Save**: Generated images are automatically saved to local storage

## Development Notes

### Code Structure Peculiarities

- Many function and variable names still reference "dangerous" (updated from original plant identification app)
- `dangerousInfo` objects use biological field names (`scientificName`, `feature1`, etc.)
- Translation functions map Japanese dangerous creature features to English for image generation

### Image Generation Options

**SDXL Lightning**:
- Fast generation (4 steps)
- Width/height control (512-1280px, default 1024x1024)
- Scheduler options: K_EULER (default)
- Guidance scale: 0 (default)

**Minimax Image-01**:
- High quality generation
- Aspect ratio control: 1:1 (default), 3:4, 4:3, 9:16, 16:9
- Better for detailed scientific artwork

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
- **Debug LLM search**: Look for detailed request/response logs with request IDs
- **Check storage**: Use browser dev tools Application tab → Local Storage
- **Monitor API performance**: Console logs include timing and duration metrics
- **Clear saved images**: Use the storage management interface or browser dev tools

No package management, build commands, or test runners are present in this project.

### Key Debugging Tips

- All API calls are logged with unique request IDs for tracing
- Image generation pipeline includes optimization step logging
- Japanese text detection and translation are logged for debugging
- Local storage automatically manages 50-image limit with 5MB per image cap

### Dangerous Creature Categories

The application identifies various categories of dangerous organisms:
- **Venomous animals**: Snakes, spiders, scorpions, jellyfish
- **Poisonous creatures**: Toxic frogs, poisonous fish, harmful insects
- **Pathogenic microorganisms**: Bacteria, viruses, fungi causing diseases
- **Toxic plants**: Poisonous mushrooms, harmful vegetation
- **Disease vectors**: Mosquitoes, ticks, other disease-carrying insects
- **Allergen sources**: Plants and animals causing allergic reactions