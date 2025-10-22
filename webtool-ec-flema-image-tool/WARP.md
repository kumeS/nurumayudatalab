# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

FleMa画像編集 (FleMa Image Editor) is a single-page, browser-only image editor specialized for e-commerce product images, with a focus on Korean cosmetics marketplace listings. It is mobile-first with extensive touch optimization.

- **Tech Stack**: Vanilla JavaScript (ES6+) with Fabric.js 5.3.0 for canvas manipulation
- **Build System**: None (static SPA; modules are loaded via `<script>` tags)
- **Persistence**: IndexedDB (up to 20 projects)
- **Current Version**: v2.4.1 (99.5% complete)

## Development Commands

### Local Development Server
Choose one of these commands to serve the project locally:
```bash
python3 -m http.server 5173
```
or
```bash
npx http-server . -p 5173
```

Then open http://localhost:5173 in your browser.

### Testing
- **No automated tests** - Manual testing only
- After changes, validate: project load/save, image upload, text styling, zoom/pan, export functionality
- Test on both Chrome and Safari (including iOS Safari)
- Verify IndexedDB persistence across browser refreshes
- Confirm keyboard shortcuts still function on desktop

### Build/Deployment
- No build step required
- Deploy by copying all files to a static web host
- Ensure CDN dependencies remain accessible

## High-Level Architecture

### Module Loading Order (Critical)
The application is bootstrapped by `index.html`, which loads JavaScript modules in a **strict order** via `<script>` tags (lines 469-477). **Do not reorder these script tags** - each module assumes globals defined by earlier modules:

```
utils.js → db.js → project.js → canvas.js → image.js → text.js → export.js → main.js
```

**Module Responsibilities**:
- **utils.js**: Shared helpers, device detection, keyboard shortcuts, swipe detection
- **db.js**: IndexedDB accessors and project list management (20 project cap)
- **project.js**: Project lifecycle, auto-save orchestration, canvas serialization
- **canvas.js**: Fabric.js canvas initialization, zoom/pan, selection, history stack (25 states)
- **image.js**: Image import/placement, filter application, filter persistence
- **text.js**: Text object creation/styling, scaling normalization on restore
- **export.js**: Export/flatten routines (PNG/JPEG) with quality presets
- **main.js**: UI event wiring, application startup, layout mode management

### Dependencies
- **Fabric.js 5.3.0** (loaded from CDN) - Must load before canvas-dependent modules
- **FileSaver.js 2.0.5** (loaded from CDN)
- **DOMPurify 3.0.6** (loaded from CDN) - For XSS protection
- **Font Awesome 6.4.0** (loaded from CDN)
- All dependencies are pinned versions in `index.html`

### Storage and State Management

**IndexedDB (via db.js)**:
- Database name: `FleMaDB`
- Store name: `projects`
- Project capacity: **20 projects maximum**
- Cleanup: Oldest projects auto-deleted when limit exceeded

**Auto-Save (via project.js)**:
- Interval: **60 seconds** (`AUTO_SAVE_INTERVAL`)
- Quick-save: Triggered 2 seconds after object changes (`QUICK_SAVE_DELAY`)
- Concurrency flag: `isSaving` prevents timer conflicts during save operations

**History/Undo (via canvas.js)**:
- Capacity: **25 states** (`CANVAS_HISTORY_LIMIT`)
- Stored in memory only (not persisted)
- Concurrency flag: `isLoadingHistory` prevents recursive captures during restore

**Layout Mode**:
- Desktop/Mobile preference stored in `localStorage` as `layoutMode`
- Restored on application startup

## Critical Implementation Details

### Race-Condition Guards
- **`isLoadingHistory`**: True while applying history snapshots; suppresses change hooks and prevents recursive history captures during undo/restore operations
- **`isSaving`**: Set while a save is in progress to avoid conflicts between timer-based auto-save and history capture timing

### Serialization/Deserialization
- **Text objects**: After `loadFromJSON`, scaling is normalized via `normalizeTextScaling()` to ensure text renders with expected font metrics across devices and zoom levels
- **Image filters**: Persisted via a `customFilters` property on Fabric objects; ensure this is preserved when cloning/exporting
- **Canvas state**: Serialized with custom properties: `['id', 'objectType', 'customData', 'customFilters', 'shadow']`

### Canvas Interaction
- **Zoom/Pan**: Implemented atop Fabric.js (not browser zoom)
- **Zoom range**: 10% to 500% (`MIN_CANVAS_ZOOM` to `MAX_CANVAS_ZOOM`)
- **Initial zoom**: 50% (`INITIAL_CANVAS_ZOOM`) for better mobile usability
- **Pan controls**: Space+drag (desktop), middle-button drag (desktop), 2-finger touch (mobile)
- Event handling expects Fabric.js 5.3.x semantics - be careful if upgrading

### Capacity and Limits
- **Projects**: Max 20 in IndexedDB
- **History**: Max 25 states in memory
- **Auto-save**: 60-second interval
- **Image upload**: Max 10MB per file
- These constraints keep memory/storage predictable on mobile devices

## Code Style and Repository Conventions

### Indentation
- **JavaScript**: 4 spaces
- **CSS**: 2 spaces

### Syntax and Patterns
- Modern ES6+ syntax (`const`/`let`, arrow functions, template literals)
- Stay compatible with evergreen browsers - avoid bundler-only features
- No TypeScript, no JSX

### Naming Conventions
- **Functions/Variables**: `camelCase`
- **Constructor-like helpers**: `PascalCase`
- **Filenames**: lowercase without spaces

### Module Organization
- Extend the closest domain file (canvas/image/text/export/project/db/utils/main)
- Share cross-cutting helpers via `utils.js`
- Keep third-party libraries pinned via CDN in `index.html`
- Validate integrity attributes if upgrading dependencies

### Comments
- Bilingual tone: Japanese with concise English where clarity helps
- Document non-trivial logic near the implementation

### Assets
- User-provided files are handled at runtime
- Do not add large binaries to the repo
- Place new static assets under `assets/` folder and reference from `index.html`

## Testing Strategy
- **Manual testing focus**: No automated test suite
- **Core flows to validate**:
  - Project save/load/delete
  - Image upload (single and multiple)
  - Text styling and templates
  - Zoom/pan operations
  - Export (PNG/JPEG, multiple quality levels)
- **Regression checks**:
  - IndexedDB persistence across refreshes
  - Keyboard shortcuts (Ctrl+Z for undo, Delete for delete, etc.)
  - Touch gestures on mobile (pinch zoom, 2-finger pan)
- **Browser targets**: Prioritize Chrome and Safari (including iOS)

## Project Context

### Domain
- Korean cosmetics marketplace listing imagery
- Features 15 "selling phrases" optimized for Korean beauty products
- Special logo/icon system for e-commerce callouts

### Platform
- Browser-only, no server-side components
- Mobile-first with extensive touch optimization
- 44px+ touch targets for mobile usability
- Haptic feedback support where available

### Design Philosophy
- Minimalist UI ("Simple & Powerful")
- Infinite canvas with clear visual boundaries
- Professional-grade navigation (zoom/pan like Photoshop/Canva)
- Privacy-first: All data stays in browser (IndexedDB), no uploads to server

### Version Status
- Current: v2.4.1 (99.5% complete)
- Remaining work: Undo/Redo enhancement, image cropping, rotation/flip features
