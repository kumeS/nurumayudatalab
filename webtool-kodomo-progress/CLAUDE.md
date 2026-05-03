# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **児童進捗管理ツール (Kids Progress Manager)** - a comprehensive web-based tool for Japanese elementary schools to track student progress and generate AI-powered educational insights. The system is designed as a single-page application with offline-first capabilities, serving educators in managing and analyzing student data across multiple categories.

## Development Commands

### Local Development
```bash
# Serve the application locally (any of these work)
python -m http.server 3000
python3 -m http.server 3000
npx serve .

# Access application at http://localhost:3000
```

### Testing
- **Manual Testing**: Primary testing method via browser interaction
- **No Test Framework**: Application lacks automated tests (technical debt item)
- **Cross-Browser Testing**: Recommended on Chrome, Firefox, Safari, Edge
- **Responsive Testing**: Test across desktop, tablet, and mobile viewports

### Linting & Code Quality
- **No Automated Linting**: Currently no ESLint, Prettier, or similar tools configured
- **Code Quality**: Relies on manual review (improvement opportunity)

### Deployment
- **Zero Build Process**: Static files serve directly from any web server
- **No Dependencies**: Only external CDN for Font Awesome icons
- **Deployment Requirements**: Web server capable of serving static HTML/CSS/JS

## Architecture Overview

### File Structure
```
├── index.html          # Main application (~2,400 lines) - complete UI
├── app.js              # Core JavaScript (6,477 lines) - all business logic  
├── css/main.css        # Stylesheet (1,085+ lines) - extracted from HTML
├── css/                # Dedicated CSS directory
├── js/                 # Future modular JS directory (planned)
├── Plan/               # Development improvement roadmap
│   ├── UI分離.txt      # UI separation planning
│   └── css分離.txt     # CSS extraction planning
├── README.md           # Comprehensive Japanese documentation
├── CLAUDE.md           # Development guidance (this file)
├── JS改善.txt          # JavaScript improvement plans
├── UI改善.txt          # UI improvement plans  
└── js分離.txt          # JavaScript modularization plans
```

### Key Architectural Decisions

**Monolithic Design**: The application uses a single HTML file with all UI components embedded. This design choice prioritizes:
- **Simple Deployment**: Easy to distribute to schools
- **Zero Configuration**: No build process or server setup required
- **Offline Capability**: Runs entirely in browser with localStorage persistence

**Technology Stack**:
- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ (no frameworks)
- **Styling**: CSS custom properties, Flexbox/Grid, responsive design
- **Data**: localStorage for persistence, JSON for import/export
- **AI Integration**: External LLM API (Hyperbolic AI) with local fallbacks
- **Dependencies**: Font Awesome icons (CDN), jsPDF for report generation

## Core Features & Data Model

### Student Management
- **Data Structure**: Student records with basic info (name, grade, class, gender)
- **Progress Tracking**: 50+ built-in evaluation fields across 7 categories
- **Evaluation Categories**:
  - `learning` (学習面): Academic performance, understanding, participation
  - `academic` (学習・教科): Subject-specific performance
  - `extracurricular` (課外活動): Clubs and activities
  - `lifestyle` (生活面): Daily life skills, health, punctuality
  - `social` (社会性): Friendship, cooperation, communication
  - `motivation` (意欲・態度): Enthusiasm, responsibility, initiative
  - `activities` (特別活動): School events, committees, volunteer work

### AI Analysis System
- **Three Analysis Types**:
  1. **Class Analysis**: Overall class trends and teaching recommendations
  2. **Individual Analysis**: Specific student analysis and guidance
  3. **Bulk Individual**: All students analyzed simultaneously
- **AI Model**: Uses meta-llama/Llama-4-Maverick-17B-128E-Instruct via Hyperbolic API
- **Report Generation**: Parent-friendly reports with specific home support suggestions

### Data Management
- **Persistence**: localStorage for offline operation
- **Import/Export**: Complete data backup including AI analysis history
- **Data Integrity**: Automatic validation and duplicate checking

## Code Quality & Technical Debt

### Critical Technical Debt (Immediate Priority)
1. **Inline Event Handlers**: 52+ onclick attributes create security vulnerabilities and maintenance issues
   - **Impact**: XSS vulnerabilities, difficult debugging, poor testability
   - **Solution**: Implement unified event delegation using `data-action` attributes
   - **Expected Benefit**: 60% improvement in maintainability, 70% better debugging

2. **Inline Styles**: 331+ style attributes prevent CSS caching and create inconsistencies
   - **Impact**: Inconsistent design, poor maintainability, cache inefficiency
   - **Solution**: Extract to CSS classes using BEM methodology
   - **Expected Benefit**: 50% reduction in style-related bugs

3. **Monolithic JavaScript**: Single 6,477-line app.js file makes debugging and testing difficult
   - **Impact**: Poor maintainability, impossible unit testing, tight coupling
   - **Solution**: Split into 18 focused modules (detailed in improvement plans)

### High-Priority Improvements
1. **DOM Structure Simplification**: Reduce maximum nesting from 9 to 6 levels
2. **Code Duplication**: Standardize modal system and form handling patterns
3. **CSS Architecture**: Extract 1,085+ lines from HTML to dedicated CSS files
4. **Error Handling**: Implement consistent error handling patterns

### Planned Modular Structure
When refactoring, the application will be split into these modules:
- `app-globals.js` - Global variables and initialization
- `tab-manager.js` - Tab switching and navigation
- `student-manager.js` - Student data operations
- `field-manager.js` - Evaluation field management
- `analysis-engine.js` - AI analysis core functionality
- `llm-api-client.js` - External API integration
- Plus 12 additional specialized modules (see Plan/ directory)

### Implementation Phases
1. **Phase 1 (Critical)**: Event system refactoring and CSS separation
2. **Phase 2 (High)**: JavaScript modularization and modal standardization  
3. **Phase 3 (Medium)**: Advanced CSS architecture and accessibility improvements

## Working with the Codebase

### Key Files to Understand
- **`index.html:1-50`**: Document head, dependencies, and basic structure
- **`index.html:18-38`**: Tab navigation system with 6 main tabs
- **`index.html:41-100`**: Sidebar with search, filters, and quick actions
- **`app.js:1-11`**: Global variables and application state
- **`app.js:12-110`**: Built-in evaluation fields master data (7 categories, 50+ fields)
- **`css/main.css:1-15`**: CSS custom properties defining color scheme and theming
- **`css/main.css:17-50`**: Base styles, typography, and layout foundations

### Common Development Tasks

**Adding New Evaluation Fields**:
1. Modify `builtInFields` object in `app.js` 
2. Update field rendering logic in form generation functions
3. Ensure data compatibility with existing student records

**Modifying AI Analysis**:
1. Update prompt templates in AI analysis functions
2. Modify result parsing and display logic
3. Test with various data scenarios

**UI Improvements**:
1. Check existing CSS custom properties before adding new ones
2. Use established component patterns for consistency
3. Test responsive behavior across devices

### Important Functions & Patterns
- **Data Persistence**: All operations use localStorage with JSON serialization (`studentsData` object)
- **Tab Management**: `switchTab()` function controls 6-tab navigation system
- **Modal System**: 9 modals managed via `openModal()`/`closeModal()` pattern (needs standardization)
- **Dynamic Forms**: Form generation based on `builtInFields` configuration object
- **AI Integration**: Hyperbolic AI API with meta-llama/Llama-4-Maverick-17B-128E-Instruct model
- **Event Handling**: Currently inline onclick (scheduled for event delegation refactor)
- **Field Management**: 7 categories with 50+ evaluation fields in master data structure

## Educational Context

This tool is specifically designed for **Japanese elementary education** (小学校) with:
- Age-appropriate evaluation criteria for grades 1-6
- Cultural considerations for student-teacher-parent relationships
- Terminology and metrics aligned with Japanese educational standards
- Privacy-first approach suitable for sensitive student data

When making changes, consider the educational context and ensure modifications support the tool's primary goal of improving student outcomes through data-driven insights and enhanced parent-teacher communication.

## Performance Considerations

- **Client-Side Processing**: All operations happen in browser
- **Data Limits**: Designed to handle ~1000 student records efficiently
- **Memory Management**: localStorage data is loaded on startup
- **Network Usage**: Minimal (only for AI API calls when configured)

## Deployment Notes

The application is designed for deployment in educational environments where:
- IT infrastructure may be limited
- Security policies restrict server-based applications
- Ease of setup and maintenance is critical
- Data privacy and local control are priorities

No special deployment steps are required beyond serving the files from a web server.