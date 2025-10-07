# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese keyword management tool ("ぬるっとキーワードマネージャー") designed for advertising and SEO purposes. It's a single-page web application that helps users:

- Remove duplicate keywords from keyword lists
- Split keywords into byte-limited chunks (250/500 bytes) for ad platform requirements
- Convert space-separated keywords to newline-separated format

## Architecture

**Single-file application**: The entire application is contained in `index.html` with embedded CSS and JavaScript.

**Key functionality**:
- **Duplicate removal**: Preserves original keyword order while removing duplicates using Set-based deduplication
- **Byte-aware splitting**: Uses `TextEncoder` for accurate UTF-8 byte counting to meet advertising platform requirements
- **Text processing**: Various formatting utilities for keyword list manipulation
- **Modal-based UI**: Results are displayed in an overlay modal with copy-to-clipboard functionality

**Core functions** (lines 401-517):
- `execBtn` event listener: Main duplicate removal logic
- `splitAndShow(maxBytes)`: Byte-aware keyword splitting for ad platforms
- `spaceToNewline()`: Format conversion utility
- `copyText()`: Clipboard integration with visual feedback

## Development Notes

**No build system**: This is a vanilla HTML/CSS/JavaScript application with no package.json, build tools, or dependencies beyond CDN resources.

**External dependencies**:
- Font Awesome icons (CDN)
- Google Analytics tracking
- Japanese web fonts (Hiragino Kaku Gothic Pro, Meiryo)

**Browser compatibility**: Uses modern JavaScript features including `TextEncoder`, `navigator.clipboard`, and Set collections.

## Testing

No automated testing framework is configured. Manual testing should focus on:
- Keyword deduplication accuracy
- Byte counting precision for UTF-8 Japanese text
- Modal functionality and clipboard operations
- Cross-browser compatibility for Japanese text rendering