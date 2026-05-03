# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI植物辞典 (AI Plant Dictionary) is a web-based plant identification tool that uses LLM and AI image generation to help users discover plants from ambiguous descriptions or common names. Users can search using vague terms like "fluffy white flower" or "roadside weeds" and get scientific plant candidates with AI-generated illustrations.

## Architecture

This is a vanilla JavaScript application with three main components:

- **Frontend**: Single-page HTML application with tabbed navigation
- **Plant Search**: LLM-powered plant identification via Cloudflare Workers
- **Image Generation**: Replicate API integration for botanical illustrations

### Core Files

- `index.html` - Main application interface with embedded CSS and JavaScript
- `app.js` - Complete backend integration (LLM search + Replicate image generation)

### External Dependencies

- **Plant Search API**: `https://nurumayu-worker.skume-bioinfo.workers.dev/`
- **Image Generation API**: `https://nurumayu-replicate-api.skume-bioinfo.workers.dev/`
- **Models**: SDXL Lightning (fast), Minimax Image-01 (high quality)

## Common Development Tasks

### Running the Application

```bash
# Start a local server in the project directory
python3 -m http.server 8080
# or
python -m http.server 8080

# Access at http://localhost:8080
```

### Testing Features

The application has no automated tests. Manual testing workflow:

1. Test plant search with various queries (Japanese terms, scientific names, vague descriptions)
2. Test image generation with different styles (botanical, anime, realistic)
3. Test "My Dictionary" save/export/import functionality
4. Test responsive design on mobile and desktop

### Key Functions in app.js

- `PlantSearchLLM.searchPlants()` - Main plant identification
- `generatePlantImage()` - AI image generation wrapper
- `PlantImageStorage` - Local storage management
- `parsePlantSearchResponse()` - JSON response parsing with fallbacks

## Development Guidelines

### Plant Search Queries

The system is designed to handle ambiguous Japanese descriptions. When testing or modifying search logic:

- Test with vague terms: "白い花", "ふわふわした", "道端の雑草"
- Test with scientific names: "Setaria viridis", "Taraxacum officinale"  
- Test with regional settings: japan, southeast-asia, north-america

### Image Generation Styles

Three main styles are supported:
- `botanical` - Scientific illustration style with watercolor techniques
- `anime` - Japanese animation style with cel-shading
- `realistic` - Photorealistic macro photography style

### Error Handling

The application has extensive error handling and fallback mechanisms:
- LLM API failures fall back to error messages with search tips
- Image generation failures preserve generation count and show user-friendly errors
- JSON parsing includes repair attempts for malformed responses

### Data Storage

- Uses localStorage for persistence
- "My Dictionary" exports to JSON with Base64 image data
- No server-side storage - everything is client-side

## Known Issues

### Critical Bugs to Fix

1. **Image generation error handling** - Generation count may not rollback on failures
2. **Prompt display bugs** - Prompts may not save properly on first generation
3. **Data integrity** - Import validation needs improvement for duplicate detection

### Common Troubleshooting

- If plant search fails: Check the worker URL and API availability
- If image generation fails: Verify Replicate API limits and worker status
- If UI becomes unresponsive: Check browser console for JavaScript errors

## Code Conventions

- **No semicolons** in JavaScript
- **Vanilla JavaScript** - no frameworks or build tools
- **Extensive logging** - Console logs for debugging API calls and user actions
- **Responsive design** - CSS Grid and Flexbox for mobile-first approach

## Important Implementation Details

### Japanese Text Handling

The system includes sophisticated Japanese-to-English translation for image prompts:
- Manual translation mappings for botanical terms
- Japanese character detection and cleanup
- Fallback mechanisms for untranslated content

### API Integration Patterns

All API calls use:
- Exponential backoff retry logic
- Detailed request/response logging
- Error transformation for user-friendly messages
- Request ID tracking for debugging

### Performance Considerations

- Image generation is limited to 3 attempts per plant to manage API costs
- localStorage has size limits - large images are converted to Base64
- No caching beyond localStorage - each search hits the API fresh