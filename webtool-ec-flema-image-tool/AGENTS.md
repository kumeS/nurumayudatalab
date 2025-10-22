# Repository Guidelines

## Project Structure & Module Organization
- **`index.html`**: Single-page shell that wires UI elements to script modules loaded via `<script>` tags.
- **`css/style.css`**: Central stylesheet; keep new rules scoped with utility classes to avoid cascading side-effects.
- **`js/`**: Feature-focused modules (`canvas.js`, `text.js`, `image.js`, `export.js`, `project.js`, `db.js`, `utils.js`, `main.js`). Extend the closest domain file and expose helpers through `utils.js` when shared.
- **Assets**: User-provided files are handled at runtime; do not add large binaries to the repo. Place any static additions under a new `assets/` folder and reference them from `index.html`.

## Build, Test, and Development Commands
- `python3 -m http.server 5173`: Serves the project locally from the repository root for quick smoke testing.
- `npx http-server . -p 5173`: Alternative Node-based static server; keeps parity with deployment expectations.
- `npm run lint` (optional): If you add lint tooling, document the script in `package.json` and update this section accordingly.

## Coding Style & Naming Conventions
- **Indentation**: Use 4 spaces in JavaScript and 2 spaces in CSS to match existing files.
- **Syntax**: Favor modern ES6 patterns (arrow functions, `const`/`let`) but stay compatible with evergreen browsers; avoid bundler-only features.
- **Naming**: Use `camelCase` for variables/functions, `PascalCase` only for constructor-like helpers, and keep filenames lowercase without spaces.
- **Comments**: Follow the existing bilingual tone (Japanese with concise English where clarity helps) and document non-trivial logic near the implementation.

## Testing Guidelines
- **Manual focus**: There is no automated test suite. After each change, run a local server and validate core flows: project load/save, image upload, text styling, zoom/pan, and export.
- **Regression list**: Confirm IndexedDB persistence across refreshes and verify that keyboard shortcuts still function on desktop.
- **Cross-browser**: Prioritize Chrome and Safari (including iOS) as noted in the README; report discrepancies clearly in PRs.

## Commit & Pull Request Guidelines
- **Commits**: Keep them atomic and use present-tense summaries (e.g., `Add zoom reset shortcut`). Release bumps follow the existing `vX.Y.Z` tag-style commit message when appropriate.
- **Branch naming**: Prefer `feature/<topic>` or `fix/<issue-number>` for clarity.
- **Pull Requests**: Provide a crisp summary, link related issues, list manual test steps, and attach before/after screenshots for UI-impacting changes.

## Security & Configuration Tips
- **Local data**: Projects persist via IndexedDB (`db.js`). When changing storage behavior, note potential quota impacts and offer migration paths for existing keys.
- **Dependencies**: Third-party libraries load from CDN in `index.html`. Pin versions and validate integrity attributes if you upgrade.
- **Secrets**: No credentials are required; never embed API keys or tokens in the repository.
