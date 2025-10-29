/**
 * Cloudflare Worker: Replicate API CORS Proxy + R2 Storage
 * Version: 5.0
 * Created: 2025-10-27
 *
 * Key Improvements in v5.0:
 *   - Eliminated code duplication (date formatting, error handling)
 *   - Introduced constants for magic numbers
 *   - Improved logging with structured format
 *   - Unified error handling patterns
 *   - Enhanced code readability and maintainability
 *
 * Based on:
 *   - cloudflare-worker-v4.js: Fixed function calls
 *   - Code quality analysis and refactoring
 *
 * Domain: replicate-nanobanana.skume-bioinfo.workers.dev
 *
 * Required Configuration:
 *   1. Secret: REPLICATE_API_TOKEN (optional, can use UI-side token)
 *   2. R2 Binding: IMAGE_BUCKET -> nurumayu-nanobanana
 *
 * Endpoints:
 *   - POST /proxy   : Create prediction with auto-polling + R2 save
 *   - POST /poll    : Poll existing prediction + R2 save on success
 *   - GET  /image/:key : Serve image from R2 storage
 *   - GET  /health  : Health check
 */

// ============================================================================
// Constants
// ============================================================================

const CONFIG = {
    VERSION: '5.0',
    CREATED_DATE: '2025-10-27',

    // Polling configuration
    POLLING_TIMEOUT_MS: 120000,      // 120 seconds
    POLLING_MAX_ATTEMPTS: 20,
    POLLING_INITIAL_WAIT_MS: 2000,   // 2 seconds
    POLLING_MAX_WAIT_MS: 8000,       // 8 seconds
    POLLING_RETRY_WAIT_MS: 3000,     // 3 seconds

    // R2 configuration
    R2_CACHE_MAX_AGE: 31536000,      // 1 year

    // File formats
    SUPPORTED_FORMATS: ['PNG', 'JPG', 'WEBP', 'GIF', 'GLB', 'MP4'],

    // Allowed domain
    ALLOWED_REPLICATE_HOSTNAME: 'api.replicate.com',
};

const CONTENT_TYPE_MAP = {
    'model/gltf-binary': 'glb',
    'model/gltf+json': 'gltf',
    'video/mp4': 'mp4',
    'video/mpeg': 'mp4',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp'
};

const EXTENSION_TO_CONTENT_TYPE = {
    'glb': 'model/gltf-binary',
    'gltf': 'model/gltf+json',
    'mp4': 'video/mp4',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp'
};

const SUPPORTED_EXTENSIONS = ['glb', 'gltf', 'mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

// ============================================================================
// Main Export
// ============================================================================

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = buildCorsHeaders(request, env);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        try {
            // Route handling
            if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '/proxy')) {
                return await handleCreatePrediction(request, env, ctx, corsHeaders);
            }

            if (request.method === 'POST' && url.pathname === '/poll') {
                return await handlePollPrediction(request, env, corsHeaders);
            }

            if (request.method === 'GET' && url.pathname.startsWith('/image/')) {
                return await handleGetImage(url, env, corsHeaders);
            }

            if (request.method === 'GET' && url.pathname === '/health') {
                return handleHealthCheck(env, corsHeaders);
            }

            return jsonResponse(
                { error: 'Not Found', message: 'Endpoint not found' },
                404,
                corsHeaders
            );

        } catch (err) {
            logError('Worker Error', err);
            return jsonResponse(
                { error: 'Internal Server Error', detail: err.message },
                500,
                corsHeaders
            );
        }
    }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format current date/time for filename
 * @returns {string} Formatted timestamp (YYYYMMdd-HHmmss)
 */
function formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hour}${minute}${second}`;
}

/**
 * Sanitize string for use in filename
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeFilename(str) {
    return str.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

/**
 * Check if string is valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if URL is allowed Replicate API URL
 * @param {string} url - URL to check
 * @returns {boolean} True if allowed
 */
function isAllowedReplicateUrl(url) {
    try {
        const parsed = new URL(String(url));
        return parsed.protocol === 'https:' && parsed.hostname === CONFIG.ALLOWED_REPLICATE_HOSTNAME;
    } catch {
        return false;
    }
}

/**
 * Safe JSON parsing
 * @param {Response} res - Fetch response
 * @returns {Promise<object|null>} Parsed JSON or null
 */
async function safeJsonParse(res) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Create JSON response
 * @param {object} data - Response data
 * @param {number} status - HTTP status code
 * @param {object} headers - Additional headers
 * @returns {Response} JSON response
 */
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...headers,
            'Content-Type': 'application/json'
        }
    });
}

/**
 * Log information message
 * @param {string} message - Log message
 * @param {*} data - Optional data to log
 */
function logInfo(message, data = null) {
    if (data !== null) {
        console.log(`[INFO] ${message}:`, data);
    } else {
        console.log(`[INFO] ${message}`);
    }
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|*} error - Error object or data
 */
function logError(message, error) {
    console.error(`[ERROR] ${message}:`, error.message || error);
    if (error.stack) {
        console.error('[ERROR] Stack:', error.stack);
    }
}

/**
 * Log R2 operation
 * @param {string} message - Log message
 * @param {*} data - Optional data
 */
function logR2(message, data = null) {
    if (data !== null) {
        console.log(`[R2] ${message}:`, data);
    } else {
        console.log(`[R2] ${message}`);
    }
}

// ============================================================================
// File Processing Functions
// ============================================================================

/**
 * Get file extension from Content-Type or URL
 * @param {string} contentType - Content-Type header
 * @param {string} url - File URL
 * @returns {string|null} File extension or null
 */
function getFileExtension(contentType, url) {
    // Check Content-Type first
    const lowerContentType = contentType?.toLowerCase();
    if (lowerContentType && CONTENT_TYPE_MAP[lowerContentType]) {
        return CONTENT_TYPE_MAP[lowerContentType];
    }

    // Extract from URL
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const match = pathname.match(/\.([a-z0-9]+)$/);

        if (match) {
            const ext = match[1];
            if (SUPPORTED_EXTENSIONS.includes(ext)) {
                return ext === 'jpeg' ? 'jpg' : ext;
            }
        }
    } catch {
        // URL parse error
    }

    // Special case: octet-stream for GLB
    if (lowerContentType?.includes('octet-stream')) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            if (pathname.includes('glb') || pathname.includes('model')) {
                return 'glb';
            }
        } catch {
            // URL parse error
        }
    }

    return null;
}

/**
 * Get Content-Type for file extension
 * @param {string} extension - File extension
 * @returns {string} Content-Type
 */
function getContentTypeForExtension(extension) {
    return EXTENSION_TO_CONTENT_TYPE[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Generate filename for R2 storage
 * @param {string} modelName - Model name
 * @param {number} index - File index
 * @param {string} extension - File extension
 * @returns {string} Generated filename
 */
function generateFileName(modelName, index, extension) {
    const timestamp = formatTimestamp();
    const safeName = sanitizeFilename(modelName);
    return `${safeName}-${timestamp}-${index}.${extension}`;
}

/**
 * Extract model name from Replicate response
 * @param {object} responseData - Replicate response
 * @returns {string} Model name
 */
function extractModelName(responseData) {
    const sources = [
        responseData.model,
        responseData.version?.model,
        responseData.prediction?.model
    ];

    for (const source of sources) {
        if (source) {
            const modelPath = source.split(':')[0]; // Remove version
            const modelName = modelPath.split('/').pop(); // Remove owner
            return modelName;
        }
    }

    return 'unknown-model';
}

/**
 * Extract all file URLs from Replicate response
 * @param {object} responseData - Replicate response
 * @returns {string[]} Array of file URLs
 */
function extractAllFileUrls(responseData) {
    const fileUrls = [];

    if (!responseData.output) {
        return fileUrls;
    }

    const output = responseData.output;

    // Single file fields
    const singleFields = ['model_file', 'color_video', 'normal_video', 'combined_video'];
    for (const field of singleFields) {
        if (output[field]) {
            fileUrls.push(output[field]);
        }
    }

    // Array fields
    if (Array.isArray(output.no_background_images)) {
        output.no_background_images.forEach(url => {
            if (typeof url === 'string' && isValidUrl(url)) {
                fileUrls.push(url);
            }
        });
    }

    // Array output (Nano Banana format)
    if (Array.isArray(output)) {
        output.forEach(item => {
            if (typeof item === 'string' && isValidUrl(item)) {
                fileUrls.push(item);
            }
        });
    } else if (typeof output === 'string' && isValidUrl(output)) {
        // Single string output
        fileUrls.push(output);
    }

    // Remove duplicates
    return [...new Set(fileUrls)];
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Poll Replicate API for prediction result
 * @param {string} pollUrl - URL to poll
 * @param {string} apiToken - API token
 * @param {AbortController} controller - Abort controller
 * @param {number} maxAttempts - Maximum attempts
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function pollForResult(pollUrl, apiToken, controller, maxAttempts = CONFIG.POLLING_MAX_ATTEMPTS) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const pollRes = await fetch(pollUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            if (!pollRes.ok) {
                throw new Error(`Poll failed with status ${pollRes.status}`);
            }

            const pollData = await pollRes.json();
            logInfo(`Poll attempt ${attempt + 1}/${maxAttempts}`, `Status: ${pollData.status}`);

            // Terminal states
            if (pollData.status === 'succeeded') {
                return { success: true, data: pollData };
            }

            if (pollData.status === 'failed') {
                return { success: false, error: `Generation failed: ${pollData.error || 'Unknown error'}` };
            }

            if (pollData.status === 'canceled') {
                return { success: false, error: 'Generation was canceled' };
            }

            // Still processing
            if (pollData.status === 'starting' || pollData.status === 'processing') {
                const waitTime = Math.min(
                    CONFIG.POLLING_INITIAL_WAIT_MS + (attempt * 1000),
                    CONFIG.POLLING_MAX_WAIT_MS
                );
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // Unexpected status
            throw new Error(`Unexpected status: ${pollData.status}`);

        } catch (pollError) {
            if (pollError.name === 'AbortError') {
                return { success: false, error: 'Polling timeout' };
            }

            // Retry if not last attempt
            if (attempt < maxAttempts - 1) {
                logInfo(`Poll attempt ${attempt + 1} failed, retrying`, pollError.message);
                await new Promise(resolve => setTimeout(resolve, CONFIG.POLLING_RETRY_WAIT_MS));
                continue;
            }

            return { success: false, error: `Polling failed: ${pollError.message}` };
        }
    }

    return { success: false, error: 'Polling exceeded maximum attempts' };
}

/**
 * Process single file and save to R2
 * @param {string} fileUrl - File URL to download
 * @param {number} index - File index
 * @param {string} modelName - Model name
 * @param {object} env - Worker environment
 * @param {string} predictionId - Prediction ID
 * @returns {Promise<object>} Save result
 */
async function processSingleFile(fileUrl, index, modelName, env, predictionId) {
    try {
        logR2(`Processing file ${index + 1}`, fileUrl.substring(0, 100));

        // Download file
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            return { source: fileUrl, error: `Fetch failed: ${fileResponse.status}` };
        }

        // Get Content-Type and extension
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        const extension = getFileExtension(contentType, fileUrl);

        if (!extension) {
            logError(`Unsupported format: ${contentType}`, fileUrl);
            return { source: fileUrl, error: 'Unsupported format' };
        }

        // Download data
        const fileData = await fileResponse.arrayBuffer();
        const fileName = generateFileName(modelName, index, extension);

        logR2('Saving to R2', fileName);

        // Save to R2
        await env.IMAGE_BUCKET.put(fileName, fileData, {
            httpMetadata: {
                contentType: contentType || getContentTypeForExtension(extension)
            },
            customMetadata: {
                sourceUrl: fileUrl,
                replicateId: String(predictionId || 'unknown'),
                savedAt: new Date().toISOString(),
                modelName: modelName
            }
        });

        logR2('File saved', `${fileName} (${fileData.byteLength} bytes)`);

        // Generate R2 URL
        const r2Url = `https://replicate-nanobanana.skume-bioinfo.workers.dev/image/${encodeURIComponent(fileName)}`;

        return {
            source: fileUrl,
            r2Key: fileName,
            r2Url: r2Url,
            contentType,
            size: fileData.byteLength
        };

    } catch (error) {
        logError(`Failed to process file ${index}`, error);
        return { source: fileUrl, error: error.message };
    }
}

/**
 * Process prediction response and save images to R2
 * @param {object} responseData - Replicate response
 * @param {object} env - Worker environment
 * @returns {Promise<{saved: array, r2Urls: array}>}
 */
async function processAndSaveImages(responseData, env) {
    logR2('========================================');
    logR2('Starting R2 save process');
    logR2('Prediction ID', responseData.id);

    // Check R2 bucket
    if (!env.IMAGE_BUCKET) {
        logError('IMAGE_BUCKET not configured', Object.keys(env));
        throw new Error('R2 bucket binding not configured');
    }

    // Extract file URLs
    const fileUrls = extractAllFileUrls(responseData);
    if (fileUrls.length === 0) {
        logR2('No file URLs found');
        return { saved: [], r2Urls: [] };
    }

    logR2(`Found ${fileUrls.length} file URLs`);
    const modelName = extractModelName(responseData);
    logR2('Model name', modelName);

    // Process files in parallel
    const savePromises = fileUrls.map((fileUrl, index) =>
        processSingleFile(fileUrl, index, modelName, env, responseData.id)
    );

    const results = await Promise.all(savePromises);

    // Collect results
    const saved = [];
    const r2Urls = [];

    for (const result of results) {
        if (result.r2Url) {
            saved.push(result);
            r2Urls.push(result.r2Url);
        } else if (result.error) {
            saved.push(result);
        }
    }

    // Save metadata JSON
    try {
        const timestamp = formatTimestamp();
        const safeName = sanitizeFilename(modelName);
        const jsonKey = `${safeName}-${timestamp}-metadata.json`;

        logR2('Saving metadata', jsonKey);

        await env.IMAGE_BUCKET.put(jsonKey, JSON.stringify(responseData, null, 2), {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: {
                replicateId: String(responseData.id || 'unknown'),
                savedAt: new Date().toISOString(),
                modelName: modelName
            }
        });

        logR2('Metadata saved successfully');
        saved.push({ r2Key: jsonKey, type: 'metadata' });
    } catch (error) {
        logError('Failed to save metadata', error);
    }

    logR2(`Save complete: ${saved.length} total, ${r2Urls.length} files`);
    logR2('========================================');

    return { saved, r2Urls };
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Build CORS headers
 * @param {Request} request - Request object
 * @param {object} env - Worker environment
 * @returns {object} CORS headers
 */
function buildCorsHeaders(request, env) {
    const origin = request.headers.get('Origin') || '*';
    let allowOrigin = '*';

    if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS !== '*') {
        const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
        if (allowed.includes(origin)) {
            allowOrigin = origin;
        } else if (allowed[0]) {
            allowOrigin = allowed[0];
        }
    }

    const requestHeaders = request.headers.get('Access-Control-Request-Headers') || 'content-type';

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': requestHeaders,
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
}

/**
 * Handle health check endpoint
 * @param {object} env - Worker environment
 * @param {object} corsHeaders - CORS headers
 * @returns {Response} Health check response
 */
function handleHealthCheck(env, corsHeaders) {
    const hasReplicateToken = !!env.REPLICATE_API_TOKEN;
    const hasImageBucket = !!env.IMAGE_BUCKET;

    return jsonResponse(
        {
            ok: true,
            service: 'replicate-proxy',
            version: CONFIG.VERSION,
            created: CONFIG.CREATED_DATE,
            configuration: {
                replicateToken: hasReplicateToken ? 'configured' : 'missing',
                imageBucket: hasImageBucket ? 'configured' : 'missing',
                r2Storage: hasImageBucket ? 'enabled' : 'disabled'
            },
            features: {
                r2Storage: hasImageBucket,
                autoPolling: true,
                imageServing: hasImageBucket,
                fileFormats: CONFIG.SUPPORTED_FORMATS
            },
            endpoints: {
                'POST /': 'Create prediction',
                'POST /proxy': 'Create prediction (alias)',
                'POST /poll': 'Poll prediction status',
                'GET /image/:key': 'Get image from R2',
                'GET /health': 'Health check'
            }
        },
        200,
        corsHeaders
    );
}

/**
 * Handle create prediction request
 * @param {Request} request - Request object
 * @param {object} env - Worker environment
 * @param {object} ctx - Execution context
 * @param {object} corsHeaders - CORS headers
 * @returns {Promise<Response>} Response
 */
async function handleCreatePrediction(request, env, ctx, corsHeaders) {
    const reqUrl = new URL(request.url);
    const raw = await request.text();

    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    // Determine target URL
    let targetUrl = reqUrl.searchParams.get('url') || payload.url;
    if (!targetUrl) {
        const path = payload.path || '/v1/predictions';
        targetUrl = `https://${CONFIG.ALLOWED_REPLICATE_HOSTNAME}${path.startsWith('/') ? path : '/' + path}`;
    }

    if (!isAllowedReplicateUrl(targetUrl)) {
        return jsonResponse(
            { error: 'Only api.replicate.com is allowed' },
            400,
            corsHeaders
        );
    }

    // Extract API token
    const { url, path, apiToken, ...forwardBody } = payload;
    const replicateToken = apiToken || env.REPLICATE_API_TOKEN;

    if (!replicateToken) {
        return jsonResponse(
            {
                error: 'Replicate API token required',
                hint: 'Configure API key in UI settings or set REPLICATE_API_TOKEN secret'
            },
            400,
            corsHeaders
        );
    }

    logInfo('Using API token from', apiToken ? 'UI' : 'environment');

    // Call Replicate API
    const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(forwardBody)
    });

    const start = await safeJsonParse(res);
    if (!res.ok) {
        return jsonResponse(
            { error: 'Replicate API error', status: res.status, body: start },
            res.status,
            corsHeaders
        );
    }

    // Auto-polling
    let outcome = start;
    const shouldPoll = start?.urls?.get &&
                      start.status &&
                      !['succeeded', 'failed', 'canceled'].includes(start.status);

    if (shouldPoll) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.POLLING_TIMEOUT_MS);

        try {
            const pollResult = await pollForResult(start.urls.get, replicateToken, controller);
            clearTimeout(timeoutId);

            if (pollResult.success) {
                outcome = pollResult.data;
            } else {
                throw new Error(pollResult.error);
            }
        } catch (pollError) {
            clearTimeout(timeoutId);
            logError('Polling error', pollError);
        }
    }

    // Save to R2
    let saved = [];
    if (outcome?.status === 'succeeded') {
        try {
            const saveResult = await processAndSaveImages(outcome, env);
            saved = saveResult.saved;

            if (saveResult.r2Urls?.length > 0) {
                outcome.r2Output = saveResult.r2Urls;
            }
        } catch (imageError) {
            logError('Image processing failed', imageError);
        }
    }

    // Return response
    if (outcome?.status && !['succeeded', 'failed'].includes(outcome.status)) {
        return jsonResponse(
            {
                ok: true,
                pending: true,
                prediction: outcome,
                next: {
                    endpoint: '/poll',
                    hint: 'POST to /poll with { "url": prediction.urls.get }',
                    pollUrl: start?.urls?.get
                }
            },
            202,
            corsHeaders
        );
    }

    return jsonResponse(
        { ok: true, prediction: outcome, saved },
        200,
        corsHeaders
    );
}

/**
 * Handle poll prediction request
 * @param {Request} request - Request object
 * @param {object} env - Worker environment
 * @param {object} corsHeaders - CORS headers
 * @returns {Promise<Response>} Response
 */
async function handlePollPrediction(request, env, corsHeaders) {
    const raw = await request.text();

    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const pollUrl = payload.url || payload.get || payload.href || payload.pollUrl;
    if (!pollUrl || !isAllowedReplicateUrl(pollUrl)) {
        return jsonResponse(
            { error: 'Valid Replicate prediction URL required' },
            400,
            corsHeaders
        );
    }

    // Extract API token
    const replicateToken = payload.apiToken || env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
        return jsonResponse(
            {
                error: 'Replicate API token required',
                hint: 'Configure API key in UI settings or set REPLICATE_API_TOKEN secret'
            },
            400,
            corsHeaders
        );
    }

    logInfo('Poll - Using API token from', payload.apiToken ? 'UI' : 'environment');

    // Poll for result
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.POLLING_TIMEOUT_MS);

    let outcome;
    try {
        const pollResult = await pollForResult(pollUrl, replicateToken, controller);
        clearTimeout(timeoutId);

        if (pollResult.success) {
            outcome = pollResult.data;
        } else {
            throw new Error(pollResult.error);
        }
    } catch (pollError) {
        clearTimeout(timeoutId);
        return jsonResponse(
            { error: 'Polling failed', detail: pollError.message },
            500,
            corsHeaders
        );
    }

    // Save to R2
    let saved = [];
    if (outcome?.status === 'succeeded') {
        try {
            const saveResult = await processAndSaveImages(outcome, env);
            saved = saveResult.saved;

            if (saveResult.r2Urls?.length > 0) {
                outcome.r2Output = saveResult.r2Urls;
            }
        } catch (imageError) {
            logError('Image processing failed', imageError);
        }
    }

    const statusCode = outcome?.status === 'succeeded' ? 200 : 202;
    return jsonResponse(
        { ok: true, prediction: outcome, saved },
        statusCode,
        corsHeaders
    );
}

/**
 * Handle get image from R2
 * @param {URL} url - Request URL
 * @param {object} env - Worker environment
 * @param {object} corsHeaders - CORS headers
 * @returns {Promise<Response>} Image response
 */
async function handleGetImage(url, env, corsHeaders) {
    if (!env.IMAGE_BUCKET) {
        return jsonResponse({ error: 'IMAGE_BUCKET not configured' }, 500, corsHeaders);
    }

    const key = decodeURIComponent(url.pathname.substring('/image/'.length));
    if (!key) {
        return jsonResponse({ error: 'No image key provided' }, 400, corsHeaders);
    }

    try {
        const object = await env.IMAGE_BUCKET.get(key);
        if (!object) {
            return jsonResponse({ error: 'Image not found' }, 404, corsHeaders);
        }

        return new Response(object.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
                'Cache-Control': `public, max-age=${CONFIG.R2_CACHE_MAX_AGE}`,
                'ETag': object.etag
            }
        });
    } catch (error) {
        logError('R2 fetch error', error);
        return jsonResponse(
            { error: 'Failed to fetch image', detail: error.message },
            500,
            corsHeaders
        );
    }
}
