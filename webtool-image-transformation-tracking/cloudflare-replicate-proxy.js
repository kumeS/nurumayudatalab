/**
 * Cloudflare Worker: Replicate API CORS Proxy + R2 Storage
 * Version: 2.0
 * Updated: 2025-10-26
 *
 * Domain: replicate-nanobanana.skume-bioinfo.workers.dev
 *
 * Environment Variables:
 *   - REPLICATE_API_TOKEN (Secret): Replicate API token
 *   - IMAGE_BUCKET (R2 Binding): R2 bucket "nurumayu-nanobanana"
 *   - ALLOWED_ORIGINS (Optional): Comma-separated list of allowed origins (default: "*")
 *
 * Endpoints:
 *   - POST /        : Create prediction (alias to /proxy)
 *   - POST /proxy   : Create prediction with optional polling
 *   - POST /poll    : Poll existing prediction
 *   - GET  /image/:key : Serve image from R2
 *   - GET  /health  : Health check
 *   - OPTIONS *     : CORS preflight
 *
 * Changes in v2:
 *   - Enhanced R2 logging with [R2] prefixes
 *   - New filename format: YYYYMMdd-HHmmss_model-name_prediction-id_index.ext
 *   - Added GET /image/:key endpoint for R2 image serving
 *   - Improved error handling and diagnostics
 *   - Added detailed console logs for debugging R2 storage
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = buildCorsHeaders(request, env);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { 
                status: 204, 
                headers: corsHeaders 
            });
        }

        try {
            // POST / or /proxy: Create prediction
            if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '/proxy')) {
                return await handleCreatePrediction(request, env, ctx, corsHeaders);
            }

            // POST /poll: Poll prediction status
            if (request.method === 'POST' && url.pathname === '/poll') {
                return await handlePollPrediction(request, env, corsHeaders);
            }

            // GET /image/:key: Serve image from R2
            if (request.method === 'GET' && url.pathname.startsWith('/image/')) {
                return await handleGetImage(url, env, corsHeaders);
            }

            // GET /health: Health check
            if (request.method === 'GET' && url.pathname === '/health') {
                return json(
                    {
                        ok: true,
                        service: 'replicate-proxy',
                        version: '2.0',
                        updated: '2025-10-26',
                        features: {
                            r2Storage: true,
                            autoPolling: true,
                            imageServing: true
                        },
                        endpoints: {
                            'POST /': 'Create prediction',
                            'POST /proxy': 'Create prediction (alias)',
                            'POST /poll': 'Poll prediction status',
                            'GET /image/:key': 'Get image from R2',
                            'GET /health': 'Health check'
                        }
                    },
                    corsHeaders,
                    200
                );
            }

            // Default response
            return json(
                { 
                    error: 'Not Found',
                    message: 'Endpoint not found. Use POST / or POST /poll'
                }, 
                corsHeaders, 
                404
            );

        } catch (err) {
            console.error('Worker Error:', err);
            return json(
                { 
                    error: 'Internal Server Error', 
                    detail: String(err.message || err) 
                }, 
                corsHeaders, 
                500
            );
        }
    },
};

/**
 * Build CORS headers based on origin and allowed origins
 */
function buildCorsHeaders(request, env) {
    const origin = request.headers.get('Origin') || '*';
    let allowOrigin = '*';

    // Check if origin is allowed
    if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS !== '*') {
        const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
        if (allowed.includes(origin)) {
            allowOrigin = origin;
        } else if (allowed[0]) {
            allowOrigin = allowed[0];
        }
    }

    const acrh =
        request.headers.get('Access-Control-Request-Headers') ||
        request.headers.get('access-control-request-headers') ||
        'content-type';

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': acrh,
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    };
}

/**
 * Handle prediction creation
 */
async function handleCreatePrediction(request, env, ctx, corsHeaders) {
    const reqUrl = new URL(request.url);
    
    // Parse request body
    const raw = await request.text();
    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    // Determine target URL
    let targetUrl = reqUrl.searchParams.get('url') || payload.url || null;
    if (!targetUrl) {
        const path = payload.path || '/v1/predictions';
        targetUrl = 'https://api.replicate.com' + (path.startsWith('/') ? path : '/' + path);
    }

    // Validate Replicate API URL
    if (!isAllowedReplicateUrl(targetUrl)) {
        return json({ error: 'Only api.replicate.com is allowed' }, corsHeaders, 400);
    }

    // Validate API token
    if (!env.REPLICATE_API_TOKEN) {
        return json({ error: 'REPLICATE_API_TOKEN not configured' }, corsHeaders, 500);
    }

    // Remove non-forward keys from payload
    const { url, path, ...forwardBody } = payload || {};

    // Call Replicate API
    const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(forwardBody || {}),
    });

    const start = await safeJson(res);
    if (!res.ok) {
        return json(
            { 
                error: 'Replicate API error', 
                status: res.status, 
                body: start 
            },
            corsHeaders,
            res.status
        );
    }

    // Short polling window (within Cloudflare execution limits)
    const pollWindowMs = 24000; // 24 seconds
    let outcome = start;

    // Poll if prediction is not complete
    if (
        start &&
        start.urls &&
        start.urls.get &&
        start.status &&
        start.status !== 'succeeded' &&
        start.status !== 'failed' &&
        start.status !== 'canceled'
    ) {
        outcome = await pollUntilDone(start.urls.get, env, pollWindowMs);
    }

    // Save to R2 if succeeded
    let saved = [];
    if (outcome && outcome.status === 'succeeded') {
        const saveResult = await saveOutputsToR2(outcome, env, request.url);
        saved = saveResult.saved;

        // Add R2 URLs to prediction output for client to use
        if (saveResult.r2Urls && saveResult.r2Urls.length > 0) {
            outcome.r2Output = saveResult.r2Urls;
        }
    }

    // If still not complete, return 202 with polling instructions
    if (outcome && outcome.status && outcome.status !== 'succeeded' && outcome.status !== 'failed') {
        return json(
            {
                ok: true,
                pending: true,
                prediction: outcome,
                next: {
                    endpoint: '/poll',
                    hint: 'POST to /poll with { "url": prediction.urls.get }',
                    pollUrl: start && start.urls ? start.urls.get : null,
                },
            },
            corsHeaders,
            202
        );
    }

    return json({ ok: true, prediction: outcome, saved }, corsHeaders, 200);
}

/**
 * Handle GET /image/:key - Serve image from R2
 */
async function handleGetImage(url, env, corsHeaders) {
    if (!env.IMAGE_BUCKET) {
        return json({ error: 'IMAGE_BUCKET not configured' }, corsHeaders, 500);
    }

    // Extract key from pathname: /image/replicate/xxx/00-file.png
    const key = decodeURIComponent(url.pathname.substring('/image/'.length));

    if (!key) {
        return json({ error: 'No image key provided' }, corsHeaders, 400);
    }

    try {
        const object = await env.IMAGE_BUCKET.get(key);

        if (!object) {
            return json({ error: 'Image not found' }, corsHeaders, 404);
        }

        // Return image with appropriate headers
        return new Response(object.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                'ETag': object.etag,
            },
        });
    } catch (error) {
        console.error('Error fetching from R2:', error);
        return json({ error: 'Failed to fetch image', detail: String(error) }, corsHeaders, 500);
    }
}

/**
 * Handle prediction polling
 */
async function handlePollPrediction(request, env, corsHeaders) {
    const raw = await request.text();
    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    const pollUrl = payload.url || payload.get || payload.href || payload.pollUrl || null;
    if (!pollUrl || !isAllowedReplicateUrl(pollUrl)) {
        return json({ error: 'Valid Replicate prediction URL required' }, corsHeaders, 400);
    }

    // Poll for result
    const outcome = await pollUntilDone(pollUrl, env, 24000);

    // Save to R2 if succeeded
    let saved = [];
    if (outcome && outcome.status === 'succeeded') {
        const saveResult = await saveOutputsToR2(outcome, env, request.url);
        saved = saveResult.saved;

        // Add R2 URLs to prediction output for client to use
        if (saveResult.r2Urls && saveResult.r2Urls.length > 0) {
            outcome.r2Output = saveResult.r2Urls;
        }
    }

    const code = outcome && outcome.status === 'succeeded' ? 200 : 202;
    return json({ ok: true, prediction: outcome, saved }, corsHeaders, code);
}

/**
 * Check if URL is allowed Replicate API URL
 */
function isAllowedReplicateUrl(u) {
    try {
        const parsed = new URL(String(u));
        return parsed.protocol === 'https:' && parsed.hostname === 'api.replicate.com';
    } catch {
        return false;
    }
}

/**
 * Poll until prediction is done or timeout
 */
async function pollUntilDone(getUrl, env, maxMs) {
    const startTime = Date.now();
    let waitMs = 1200; // Start with 1.2s, gradually increase

    while (Date.now() - startTime < maxMs) {
        const res = await fetch(getUrl, {
            headers: { 
                'Authorization': `Token ${env.REPLICATE_API_TOKEN}` 
            },
        });

        const data = await safeJson(res);
        if (!data || !data.status) return data;

        // Check if complete
        if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
            return data;
        }

        // Wait before next poll
        await sleep(waitMs);
        if (waitMs < 5000) waitMs += 400; // Gradually increase wait time
    }

    // Timeout - return current status
    return { status: 'processing', urls: { get: getUrl } };
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
async function safeJson(res) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Save prediction outputs to R2
 * @returns {{ saved: Array, r2Urls: Array }}
 */
async function saveOutputsToR2(prediction, env, requestUrl) {
    const urls = extractFileUrls(prediction);
    const saved = [];
    const r2Urls = [];

    console.log('[R2] ========================================');
    console.log('[R2] Starting R2 save process');
    console.log('[R2] Prediction ID:', prediction.id);
    console.log('[R2] Found', urls.length, 'image URLs to save');
    console.log('[R2] URLs:', JSON.stringify(urls));

    if (!env.IMAGE_BUCKET) {
        console.error('[R2] CRITICAL ERROR: IMAGE_BUCKET not configured - R2 save disabled');
        console.error('[R2] Available env keys:', Object.keys(env));
        return { saved, r2Urls };
    }

    console.log('[R2] IMAGE_BUCKET binding found:', typeof env.IMAGE_BUCKET);

    // Extract base URL from request to construct R2 image URLs
    let baseUrl = 'https://replicate-nanobanana.skume-bioinfo.workers.dev';
    if (requestUrl) {
        try {
            const url = new URL(requestUrl);
            baseUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
            console.warn('[R2] Failed to parse request URL, using default:', e);
        }
    }

    // Generate timestamp in YYYYMMdd-HHmmss format
    const now = new Date();
    const timestamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`;

    const modelName = 'google-nano-banana';
    const predictionId = prediction.id || crypto.randomUUID();
    let index = 0;

    console.log('[R2] Timestamp:', timestamp);
    console.log('[R2] Model:', modelName);
    console.log('[R2] Base URL:', baseUrl);

    for (const fileUrl of urls) {
        try {
            console.log(`[R2] Processing image ${index + 1}/${urls.length}: ${fileUrl.substring(0, 100)}...`);

            const fileRes = await fetch(fileUrl);
            console.log(`[R2] Fetch response status: ${fileRes.status}`);

            if (!fileRes.ok) {
                const errorMsg = `fetch status ${fileRes.status}`;
                console.error(`[R2] Failed to fetch image: ${errorMsg}`);
                saved.push({ source: fileUrl, error: errorMsg });
                continue;
            }

            const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
            console.log(`[R2] Content-Type: ${contentType}`);

            // Determine extension from content type or URL
            const nameFromUrl = fileUrl.split('?')[0].split('/').pop() || 'file';
            const extFromUrl = getKnownExt(nameFromUrl);
            const extFromType = extFromContentType(contentType);
            const ext = extFromUrl || extFromType || '.png'; // Default to .png

            // New filename format: YYYYMMdd-HHmmss_model-name_prediction-id_index.ext
            const key = `${timestamp}_${modelName}_${predictionId}_${index}${ext}`;

            console.log(`[R2] Saving to R2 with key: ${key}`);

            const putRes = await env.IMAGE_BUCKET.put(key, fileRes.body, {
                httpMetadata: { contentType },
                customMetadata: {
                    sourceUrl: fileUrl,
                    replicateId: String(predictionId),
                    savedAt: new Date().toISOString(),
                    modelName: modelName,
                    timestamp: timestamp,
                },
            });

            console.log(`[R2] Successfully saved to R2. ETag: ${putRes?.etag || 'unknown'}`);

            // Generate R2 URL for client to use
            const r2Url = `${baseUrl}/image/${encodeURIComponent(key)}`;
            console.log(`[R2] Generated R2 URL: ${r2Url}`);

            saved.push({
                source: fileUrl,
                r2Key: key,
                r2Url: r2Url,
                etag: putRes && putRes.etag ? putRes.etag : undefined,
                contentType,
            });

            // Add R2 URL to array for client
            r2Urls.push(r2Url);

            index += 1;
            console.log(`[R2] Image ${index} saved successfully`);
        } catch (e) {
            console.error(`[R2] ERROR saving image ${index}:`, e);
            console.error(`[R2] Error details:`, e.stack || e.message || String(e));
            saved.push({ source: fileUrl, error: String(e.message || e) });
        }
    }

    // Also save prediction JSON with new naming format
    try {
        const jsonKey = `${timestamp}_${modelName}_${predictionId}_metadata.json`;
        console.log(`[R2] Saving prediction metadata to: ${jsonKey}`);

        await env.IMAGE_BUCKET.put(jsonKey, JSON.stringify(prediction, null, 2), {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: {
                replicateId: String(predictionId),
                savedAt: new Date().toISOString(),
                modelName: modelName,
                timestamp: timestamp,
            },
        });

        console.log(`[R2] Metadata saved successfully`);
        saved.push({ r2Key: jsonKey, type: 'metadata' });
    } catch (e) {
        console.error('[R2] ERROR saving prediction JSON:', e);
        console.error('[R2] Metadata error details:', e.stack || e.message || String(e));
    }

    console.log('[R2] Save process completed. Total saved:', saved.length);
    console.log('[R2] R2 URLs generated:', r2Urls.length);
    console.log('[R2] ========================================');

    return { saved, r2Urls };
}

/**
 * Extract file URLs from prediction response
 */
function extractFileUrls(obj) {
    const urls = new Set();
    const allowedExts = new Set([
        '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp',
        '.glb', '.gltf',
        '.mp4', '.webm', '.mov',
    ]);

    const visit = (node) => {
        if (!node) return;
        if (typeof node === 'string') {
            const s = node;
            if (s.startsWith('http://') || s.startsWith('https://')) {
                const path = s.split('?')[0];
                const dot = path.lastIndexOf('.');
                const ext = dot >= 0 ? path.slice(dot).toLowerCase() : '';
                if (allowedExts.has(ext)) {
                    urls.add(s);
                }
            }
            return;
        }
        if (Array.isArray(node)) {
            for (const item of node) visit(item);
            return;
        }
        if (typeof node === 'object') {
            for (const v of Object.values(node)) visit(v);
        }
    };

    // Start from output, fallback to entire object
    visit(obj && obj.output ? obj.output : obj);

    return Array.from(urls);
}

/**
 * Get known file extension from filename
 */
function getKnownExt(name) {
    const lower = name.toLowerCase();
    const exts = [
        '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp',
        '.glb', '.gltf',
        '.mp4', '.webm', '.mov',
    ];
    for (const e of exts) {
        if (lower.endsWith(e)) return e;
    }
    return '';
}

/**
 * Get file extension from content type
 */
function extFromContentType(ct) {
    const map = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/bmp': '.bmp',
        'model/gltf-binary': '.glb',
        'model/gltf+json': '.gltf',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
    };
    const key = (ct || '').split(';')[0].trim().toLowerCase();
    return map[key] || '';
}

/**
 * Sanitize filename
 */
function sanitizeName(name) {
    return String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

/**
 * JSON response helper
 */
function json(obj, corsHeaders, status) {
    return new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
        },
    });
}
