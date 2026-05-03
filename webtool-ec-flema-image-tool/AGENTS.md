# Repository Guidelines

## Project Structure & Module Organization
This is a static Fabric.js SPA, so `index.html` is the only entry point and owns the CDN scripts plus accessibility hooks. Styling sits in `css/style.css`. Feature logic is grouped inside `js/`: `canvas.*.js` drives Fabric initialization, selection, and zoom; `image.*.js` handles uploads, URL fetch, and adjustments; `text.*.js` keeps presets/UI interactions; `project.js`+`db.js` wrap IndexedDB persistence; `export.js` writes PNG/JPG; `utils.js` hosts shared helpers; `main.js` bootstraps on `DOMContentLoaded`. Add new modules per feature and append them to the `<script>` list in dependency order.

## Build, Test, and Development Commands
- `python3 -m http.server 5173` — fastest local server; open `http://localhost:5173`.
- `npx http-server . -p 5173` — Node-based option (`npm install -g http-server` once).
- Clear browser cache/IndexedDB before regression runs (`Application > Storage > Clear site data`) to avoid stale state when comparing fixes.

## Coding Style & Naming Conventions
Use vanilla ES2015+ with 4-space indentation, `const`/`let`, and lower camelCase for functions, variables, and DOM ids (`setupZoomSlider`, `undoBtn`). Files remain kebab/dotted (`image.advanced.js`) to reflect layering. Keep comments concise and task-focused (Japanese labels are fine). Prefer guard clauses and helper extraction over deep nesting. Any DOM-derived strings must be sanitized via DOMPurify, and new globals should hang off their module namespace instead of `window`.

## Testing Guidelines
No automated tests exist, so attach manual QA notes to each change. Minimum smoke checklist: 1) import via file picker and HTTPS URL, 2) add/remove canvases and validate undo/redo, 3) adjust text styles plus presets, 4) export PNG and JPG, 5) reload to confirm IndexedDB restores the session. Persistence changes require backing up the IndexedDB store, clearing it, and rerunning save/load. Capture before/after screenshots (see `.playwright-mcp/` examples) for layout or responsive issues.

## Commit & Pull Request Guidelines
Git history uses `v0.4.x <scope>` style messages (`v0.4.x Mac Air`, `v0.4.x Mac Pro`). Follow that format, incrementing the suffix that best matches your change and mentioning the device or context exercised. PRs should ship with: a concise summary, linked bug-report IDs (`Bug_report3`, etc.), the manual test checklist you executed, and screenshots/GIFs for UI updates. Call out IndexedDB schema tweaks, new CDN dependencies, or extra reviewer steps before requesting approval.
