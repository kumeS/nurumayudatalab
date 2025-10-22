# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**近所ニュース要約レーダー (Local News Summary Radar)** - A Cloudflare Workers-based news aggregation and summarization system for the Osaka Kyobashi/Miyakojima area that scrapes Yahoo News search results, extracts article content, and generates AI-powered 30-second summaries using io.net's OpenAI-compatible LLM endpoint (gpt-oss-120B model).

## Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers (Edge compute)
- **HTML Parsing**: linkedom + Readability for content extraction
- **LLM**: io.net Intelligence API (OpenAI-compatible, model: `openai/gpt-oss-120b`)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Deployment**: Wrangler CLI

### Core Components

**1. Worker Backend (`src/worker.js`)**
- Main entry point handling routing for `/`, `/api/ingest`, `/api/digest`
- Scraping logic for 4 fixed Yahoo News/realtime search URLs
- Article extraction with Readability and fallback to OG description
- LLM integration via io.net Chat Completions API
- Caching strategy: search pages (10min), article pages (30min)

**2. Static Frontend**
- `index.html`: Main UI with area input and two action buttons
- `public/styles.css`: Minimal design system with CSS variables
- `public/app.js`: Client-side fetching and rendering logic

**3. Configuration**
- `wrangler.toml`: Workers config with environment variables
- Secrets: `IO_API_KEY` (set via `wrangler secret put`)
- Environment vars: `IO_BASE_URL`, `IO_MODEL`

### Data Flow

```
Browser → /api/digest
  ↓
Worker fetches 4 search pages (cache: 10min)
  ↓
Extract article links (max 5 per source, dedupe, ≤20 total)
  ↓
Fetch article pages (cache: 30min) → Readability extraction
  ↓
Filter articles <140 chars → Select top 8
  ↓
Call io.net Chat Completions API
  ↓
Return {summary, items} JSON
  ↓
Browser renders summary + article list
```

## Development Commands

### Local Development
```bash
wrangler dev
```
Starts local development server with hot reload.

### Deploy to Production
```bash
wrangler deploy
```
Deploys to Cloudflare Workers.

### Set API Key Secret
```bash
wrangler secret put IO_API_KEY
```
Securely stores the io.net API key.

### Testing Endpoints Locally
```bash
# Test article collection only (no LLM)
curl "http://localhost:8787/api/ingest?area=大阪・京橋/都島"

# Test full digest with LLM summary
curl "http://localhost:8787/api/digest?area=大阪・京橋/都島"
```

## API Specifications

### GET /api/ingest?area=<string>
Collects and extracts articles without summarization.

**Response (200)**:
```json
{
  "area": "大阪・京橋/都島",
  "count": 8,
  "items": [
    {
      "url": "https://news.yahoo.co.jp/articles/...",
      "title": "記事タイトル",
      "content": "本文 (first 12000 chars)"
    }
  ]
}
```

**Response (500)**: `{"error": "error message"}`

### GET /api/digest?area=<string>
Collects articles and generates LLM summary.

**Response (200)**:
```json
{
  "area": "大阪・京橋/都島",
  "summary": "3-paragraph summary + 5 bullet points + Sources",
  "items": [/* same as /api/ingest */]
}
```

**Error Handling**:
- If article collection yields 0 items: `summary="（要約なし）", items=[]`
- If LLM fails: `summary="（要約エラー <status>）", items` still returned
- Failed article URLs are skipped, processing continues

## LLM Configuration

### Prompt Structure
**System Prompt**: "事実限定・出典必須・日本語" (Facts only, sources required, Japanese)

**User Prompt Template**:
```
エリア: <AREA>
以下の記事から、最新状況を居住者向けに「3段落＋箇条書き5点」で要約し、最後に"Sources"としてタイトル＋URLを列挙してください。
データ: <JSON>
```

**Parameters**:
- `temperature: 0.2`
- Model: `openai/gpt-oss-120b`

### Expected Output Format
- 3 paragraphs of context
- 5 bullet points with key highlights
- "Sources" section with article titles + URLs

## Scraping Rules & Constraints

### Target URLs (Fixed Array)
1. `https://news.yahoo.co.jp/search?p=大阪市都島区&ei=utf-8&aq=0`
2. `https://news.yahoo.co.jp/search?p=大阪京橋&ei=utf-8`
3. `https://search.yahoo.co.jp/realtime/search?p=%23大阪京橋&ei=UTF-8&ifr=tl_sc`
4. `https://search.yahoo.co.jp/realtime/search?p=%23大阪都島&ei=UTF-8&ifr=tl_sc`

### Extraction Logic
- Use `HTMLRewriter` to extract `<a href>` links
- Priority patterns: `/articles/`, `/pickup/` on news.yahoo.co.jp domain
- Deduplication of URLs
- Limit: 5 articles per source, 20 total before filtering
- Content extraction: Readability → fallback to `og:description` → fallback to first `<p>` tags
- Minimum content threshold: 140 characters (discard shorter articles)
- Final selection: top 8 articles for LLM input

### Rate Limiting & Etiquette
- 300-400ms wait between consecutive fetches
- Parallel fetch limit: ~3 concurrent requests
- Cache TTL: search pages (600s), article pages (1800s)

### Compliance Notes
**MVP is for development/testing purposes only.** Production deployment must:
- Use official APIs/feeds where available
- Respect robots.txt and terms of service
- Properly attribute sources
- Consider copyright/distribution rights

## Performance Targets

- Total `/api/digest` response time: <10 seconds (varies with LLM latency)
- Article extraction: Fail-safe (skip broken URLs, continue processing)
- Availability: Relies on Cloudflare Workers regional distribution

## Frontend Specifications

### UI Components
- **Header**: Title, area input field, two action buttons (最新要約 / リストのみ)
- **Card 1**: "30秒ダイジェスト" with monospace formatted summary
- **Card 2**: Article list with clickable titles and 160-char snippets
- **Footer note**: Compliance disclaimer and last updated timestamp

### Accessibility
- Clear link labeling
- Keyboard navigation support
- Sufficient color contrast (defined in CSS variables)

## Testing Checklist (UAT)

- [ ] At least 1 article collected from the 4 URLs
- [ ] Summary contains 3 paragraphs + 5 bullet points + Sources section
- [ ] All article links are clickable and valid
- [ ] Articles with <140 chars content are excluded
- [ ] Response time within 10 seconds (network dependent)
- [ ] Error scenarios handled gracefully (0 items, LLM failure)

## Environment Variables

Set in `wrangler.toml` (public) and Wrangler Secrets (private):

```toml
[vars]
IO_BASE_URL = "https://api.intelligence.io.solutions/api/v1"
IO_MODEL = "openai/gpt-oss-120b"
```

**Secret** (set via CLI):
```bash
wrangler secret put IO_API_KEY
```

## Future Extensions (Out of Scope for MVP)

- Article clustering (embeddings + KMeans/HDBSCAN)
- RAG integration with municipal RSS feeds
- Web Push notifications (daily digest at 7am)
- Archive storage (Cloudflare Pages/KV/R2)
- Migration to official news/social media APIs
- Image/video extraction
- User accounts and preferences
- Advanced content moderation
