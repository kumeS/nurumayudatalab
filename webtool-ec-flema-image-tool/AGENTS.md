# Repository Guidelines

## Project Structure & Module Organization
- `index.html` is the single-page shell that wires UI controls to the feature modules loaded from `js/`.
- `css/style.css` provides shared styling; scope additions with small utility classes to prevent bleed.
- `js/` is organized by feature (`canvas.js`, `text.js`, `image.js`, `export.js`, `project.js`, `db.js`, `utils.js`, `main.js`); extend the closest domain file and place cross-cutting helpers in `utils.js`.
- `assets/` stores small static media; user uploads stay in memory and are not checked in.
- Data persistence flows through IndexedDB in `js/db.js`; review schema impacts before changing storage.

## Build, Test, and Development Commands
- `python3 -m http.server 5173` — spins up a local static server from the repo root for quick smoke tests.
- `npx http-server . -p 5173` — node-based server that mirrors deployment behavior.
- `npm run lint` — run the optional lint script if present; document any new tooling inside `package.json`.

## Coding Style & Naming Conventions
- JavaScript uses 4 spaces; CSS uses 2 spaces. Prefer `const`/`let`, arrow functions, and browser-native APIs.
- Use `camelCase` for functions, variables, and file-local helpers; reserve `PascalCase` for constructor-like utilities; filenames stay lowercase with no spaces.
- Keep new comments concise, bilingual when clarifying complex logic (日本語 + brief English), and default to ASCII characters.

## Testing Guidelines
- Manual testing is required: verify project load/save, IndexedDB persistence after refresh, image uploads, text styling, zoom/pan, keyboard shortcuts, and export flows in Chrome and Safari.
- Document any regressions or browser discrepancies in `docs/` or relevant pull requests; no automated test suite exists yet.

## Commit & Pull Request Guidelines
- Write atomic commits in present tense (e.g., `Add zoom reset shortcut`); use `feature/<topic>` or `fix/<issue-number>` branches.
- Pull requests should summarize changes, link related issues, list manual test steps, and attach before/after screenshots for UI updates.
- Avoid adding large binaries; keep new static assets in `assets/` and pin CDN versions if dependencies change in `index.html`.

## Security & Configuration Tips
- Never embed secrets; the app operates entirely client-side.
- When adjusting IndexedDB behavior, consider quota limits, migrations, and communicate potential data loss.
