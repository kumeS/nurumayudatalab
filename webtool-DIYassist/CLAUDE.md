# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based DIY assistant tool for furniture and interior design. The project consists of a single-page application that allows users to input natural language descriptions of furniture requirements and generates 3D models for preview and 3D printing.

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **3D Graphics**: Three.js (planned)
- **LLM Integration**: Uses `https://nurumayu-worker.skume-bioinfo.workers.dev/` API
- **Model**: meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8

## Architecture

The application currently includes:
- Translation and proofreading functionality (existing implementation)
- Planned 3D model generation features for DIY furniture design

### Core Components

1. **LLM Integration** (`app.js:408-488`): 
   - Non-streaming API calls to Cloudflare Worker endpoint
   - Language detection for proper input validation
   - Response cleaning and formatting

2. **UI State Management** (`app.js:76-111`):
   - Tab-based mode switching (translation/proofreading modes)
   - Dynamic styling updates for active states

3. **Text Processing** (`app.js:290-356`):
   - Mode-specific prompt generation for different text processing tasks
   - Input validation based on language detection

## Key Files

- `index.html`: Main application interface with embedded CSS
- `app.js`: Core application logic and LLM integration
- `実装案.txt`: Detailed implementation plan for DIY features (in Japanese)

## Development Notes

### API Configuration
- The LLM API endpoint is hardcoded: `https://nurumayu-worker.skume-bioinfo.workers.dev/`
- Model: `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
- Non-streaming mode with 1500 max completion tokens

### Text Processing Modes
- `jaen`: Japanese to English translation
- `enja`: English to Japanese translation  
- `jajarev`: Japanese proofreading
- `enrev`: English proofreading

### Planned Features (from 実装案.txt)
- 3D model generation from natural language input
- Three.js integration for 3D preview
- OBJ to STL conversion for 3D printing
- Project management and version control

## Current State

This is currently a translation/proofreading tool with plans to expand into a DIY furniture design assistant. The core LLM integration infrastructure is in place and can be extended for 3D model generation features.