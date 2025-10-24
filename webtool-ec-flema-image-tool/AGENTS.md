# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Single-page shell wiring UI to script modules via `<script>` tags.
- `css/style.css`: Central stylesheet; scope new rules with small utility classes.
- `js/`: Feature-focused modules — `canvas.js`, `text.js`, `image.js`, `export.js`, `project.js`, `db.js`, `utils.js`, `main.js`. Extend the closest domain file; share helpers via `utils.js`.
- `assets/`: Place small static additions here. User uploads are handled at runtime and not stored in the repo.
- Data: Projects persist via IndexedDB in `db.js`.

## Build, Test, and Development Commands
- `python3 -m http.server 5173`: Serve locally from repo root for quick smoke tests.
- `npx http-server . -p 5173`: Node-based static server (parity with deployment).
- `npm run lint` (optional): If linting is added, document the script in `package.json`.
- Open `http://localhost:5173` and verify core flows.

## Coding Style & Naming Conventions
- Indentation: JavaScript 4 spaces; CSS 2 spaces.
- Syntax: Prefer ES6 (`const`/`let`, arrow functions); avoid bundler-only features; target evergreen browsers.
- Naming: `camelCase` for vars/functions, `PascalCase` only for constructor-like helpers; filenames lowercase without spaces.
- Comments: Keep concise; bilingual where useful (日本語 + brief English).

## Testing Guidelines
- Focus: Manual testing. Validate project load/save, image upload, text styling, zoom/pan, and export.
- Regression: Confirm IndexedDB persistence across refresh and keyboard shortcuts on desktop.
- Cross-browser: Prioritize Chrome and Safari (including iOS). Document discrepancies clearly.
- No automated test suite at present.

## Commit & Pull Request Guidelines
- Commits: Atomic, present tense (e.g., `Add zoom reset shortcut`). Use tag-style release bumps when applicable (e.g., `v1.2.3`).
- Branches: `feature/<topic>` or `fix/<issue-number>`.
- Pull Requests: Provide a crisp summary, link related issues, list manual test steps, and include before/after screenshots for UI changes.
- Assets: Do not add large binaries. Place small static files under `assets/`.

## Security & Configuration Tips
- Local data: IndexedDB (`db.js`). If changing storage behavior, consider quota/migrations and note impact.
- Dependencies: Loaded from CDN in `index.html`. Pin versions and validate integrity attributes on upgrades.
- Secrets: None required. Never embed API keys or tokens.

