# Changelog

## [2.0] - 2025-10-26

### Cloudflare Workers (cloudflare-replicate-proxy.js)

#### Added
- **R2 Image Serving**: New `GET /image/:key` endpoint to serve images directly from R2 storage
- **Enhanced Logging**: Comprehensive logging with `[R2]` prefixes for debugging R2 storage operations
- **New Filename Format**: Images now saved as `YYYYMMdd-HHmmss_model-name_prediction-id_index.ext`
  - Example: `20251026-211200_google-nano-banana_abc123xyz_0.png`
- **R2 URL Generation**: Automatically generates public R2 URLs in response (`prediction.r2Output`)
- **Environment Diagnostics**: Added logging for R2 bucket binding verification

#### Changed
- Updated health endpoint to version 2.0 with feature flags
- Improved error handling with detailed error messages
- Enhanced metadata storage in R2 (includes timestamp, model name, source URL)

#### Fixed
- R2 storage verification with comprehensive error logging
- File extension detection with fallback to `.png` for unknown types

### UI Side (JavaScript)

#### Added
- **IndexedDB Integration**: Automatic image download and storage in IndexedDB
  - `transformationService.js`: Extended `urlToBase64()` method to save images to IndexedDB
  - Images are downloaded as blobs and stored persistently
  - Prevents reliance on temporary Replicate URLs
- **Node ID Tracking**: Pass `nodeId` to transformation service for proper IndexedDB organization
- **Image Metadata**: Store comprehensive metadata with each image (prompt, model, prediction ID, etc.)

#### Changed
- `transformationService.js`: Modified `urlToBase64()` to accept `nodeId` and `metadata` parameters
- `canvasController.js`: Updated `handleGenerateClick()` to pass `nodeId` in options

### Documentation

#### Added
- **CLOUDFLARE_DEPLOY.md**: Complete deployment guide
  - Wrangler installation and setup
  - R2 bucket creation
  - Secret configuration
  - Deployment commands
  - Troubleshooting section
- **wrangler.toml**: Cloudflare Workers configuration file
  - R2 bucket binding configuration
  - Deployment settings
- **CHANGELOG.md**: This file to track version history

### Files Changed
- `cloudflare-replicate-proxy.js` → Version 2.0
- `cloudflare-replicate-proxy-v2.js` → Backup of version 2.0
- `js/transformationService.js` → IndexedDB integration
- `js/canvasController.js` → NodeId passing
- New: `wrangler.toml`
- New: `CLOUDFLARE_DEPLOY.md`
- New: `CHANGELOG.md`

### Deployment Notes

To deploy version 2.0:

```bash
# Ensure you have Wrangler installed
npm install -g wrangler

# Login to Cloudflare
npx wrangler login

# Create R2 bucket (if not exists)
npx wrangler r2 bucket create nurumayu-nanobanana

# Set Replicate API token
npx wrangler secret put REPLICATE_API_TOKEN

# Deploy
npx wrangler deploy
```

### Testing R2 Storage

After deployment, verify R2 storage is working:

1. Generate an image through the UI
2. Check Cloudflare dashboard → R2 → `nurumayu-nanobanana`
3. Verify files are saved with format: `YYYYMMdd-HHmmss_google-nano-banana_<id>_<index>.png`
4. Check browser console for `[R2]` log messages
5. Check IndexedDB in browser DevTools (Application → IndexedDB → WorkflowImageDB)

### Known Issues

None at this time.

---

## [1.0] - Previous Version

Initial implementation with basic Replicate API proxy functionality.
