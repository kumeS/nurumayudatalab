/**
 * Cloudflare Worker: Replicate API CORS Proxy + R2 Storage
 * Version: 2.1
 * Updated: 2025-10-27
 *
 * Domain: replicate-nanobanana.skume-bioinfo.workers.dev
 *
 * Required Configuration:
 *   1. Secret: REPLICATE_API_TOKEN
 *      Command: npx wrangler secret put REPLICATE_API_TOKEN
 *
 *   2. R2 Binding: IMAGE_BUCKET -> nurumayu-nanobanana
 *      In wrangler.toml:
 *        [[r2_buckets]]
 *        binding = "IMAGE_BUCKET"
 *        bucket_name = "nurumayu-nanobanana"
 *
 *      Or in Cloudflare Dashboard:
 *        Settings -> Variables -> R2 Bucket Bindings -> Add binding
 *
 *   3. Optional: ALLOWED_ORIGINS (default: "*")
 *
 * Endpoints:
 *   - POST /        : Create prediction (alias to /proxy)
 *   - POST /proxy   : Create prediction with optional polling + R2 save
 *   - POST /poll    : Poll existing prediction + R2 save on success
 *   - GET  /image/:key : Serve image from R2 storage
 *   - GET  /health  : Health check
 *   - OPTIONS *     : CORS preflight
 *
 * Image Storage:
 *   - R2 Bucket: nurumayu-nanobanana
 *   - Filename Format: YYYYMMdd-HHmmss_google-nano-banana_prediction-id_index.png
 *   - Example: 20251027-012345_google-nano-banana_abc123_0.png
 *
 * Changes in v2.1:
 *   - Clarified R2 binding configuration requirements
 *   - Updated documentation for easier setup
 *   - Improved error messages for missing configuration
 *   - Added setup verification in health endpoint
 *
 * Changes in v2.0:
 *   - Enhanced R2 logging with [R2] prefixes
 *   - New filename format with timestamp
 *   - Added GET /image/:key endpoint for R2 image serving
 *   - Improved error handling and diagnostics
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = buildCorsHeaders(request, env);

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        try {
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
                const hasReplicateToken = !!env.REPLICATE_API_TOKEN;
                const hasImageBucket = !!env.IMAGE_BUCKET;

                return json(
                    {
                        ok: true,
                        service: 'replicate-proxy',
                        version: '2.1',
                        updated: '2025-10-27',
                        configuration: {
                            replicateToken: hasReplicateToken ? 'configured' : 'missing',
                            imageBucket: hasImageBucket ? 'configured' : 'missing',
                            r2Storage: hasImageBucket ? 'enabled' : 'disabled'
                        },
                        features: {
                            r2Storage: hasImageBucket,
                            autoPolling: true,
                            imageServing: hasImageBucket
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

function buildCorsHeaders(request, env) {
    const origin = request.headers.get('Origin') || '*';
    let allowOrigin = '*';

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

async function handleCreatePrediction(request, env, ctx, corsHeaders) {
    const reqUrl = new URL(request.url);

    const raw = await request.text();
    let payload = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    let targetUrl = reqUrl.searchParams.get('url') || payload.url || null;
    if (!targetUrl) {
        const path = payload.path || '/v1/predictions';
        targetUrl = 'https://api.replicate.com' + (path.startsWith('/') ? path : '/' + path);
    }

    if (!isAllowedReplicateUrl(targetUrl)) {
        return json({ error: 'Only api.replicate.com is allowed' }, corsHeaders, 400);
    }

    if (!env.REPLICATE_API_TOKEN) {
        return json({ error: 'REPLICATE_API_TOKEN not configured' }, corsHeaders, 500);
    }

    const { url, path, ...forwardBody } = payload || {};

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

    const pollWindowMs = 24000;
    let outcome = start;

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

    let saved = [];
    if (outcome && outcome.status === 'succeeded') {
        const saveResult = await saveOutputsToR2(outcome, env, request.url);
        saved = saveResult.saved;

        if (saveResult.r2Urls && saveResult.r2Urls.length > 0) {
            outcome.r2Output = saveResult.r2Urls;
        }
    }

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

async function handleGetImage(url, env, corsHeaders) {
    if (!env.IMAGE_BUCKET) {
        return json({ error: 'IMAGE_BUCKET not configured' }, corsHeaders, 500);
    }

    const key = decodeURIComponent(url.pathname.substring('/image/'.length));

    if (!key) {
        return json({ error: 'No image key provided' }, corsHeaders, 400);
    }

    try {
        const object = await env.IMAGE_BUCKET.get(key);

        if (!object) {
            return json({ error: 'Image not found' }, corsHeaders, 404);
        }

        return new Response(object.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000',
                'ETag': object.etag,
            },
        });
    } catch (error) {
        console.error('Error fetching from R2:', error);
        return json({ error: 'Failed to fetch image', detail: String(error) }, corsHeaders, 500);
    }
}

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

    const outcome = await pollUntilDone(pollUrl, env, 24000);

    let saved = [];
    if (outcome && outcome.status === 'succeeded') {
        const saveResult = await saveOutputsToR2(outcome, env, request.url);
        saved = saveResult.saved;

        if (saveResult.r2Urls && saveResult.r2Urls.length > 0) {
            outcome.r2Output = saveResult.r2Urls;
        }
    }

    const code = outcome && outcome.status === 'succeeded' ? 200 : 202;
    return json({ ok: true, prediction: outcome, saved }, corsHeaders, code);
}

function isAllowedReplicateUrl(u) {
    try {
        const parsed = new URL(String(u));
        return parsed.protocol === 'https:' && parsed.hostname === 'api.replicate.com';
    } catch {
        return false;
    }
}

async function pollUntilDone(getUrl, env, maxMs) {
    const startTime = Date.now();
    let waitMs = 1200;

    while (Date.now() - startTime < maxMs) {
        const res = await fetch(getUrl, {
            headers: {
                'Authorization': `Token ${env.REPLICATE_API_TOKEN}`
            },
        });

        const data = await safeJson(res);
        if (!data || !data.status) return data;

        if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
            return data;
        }

        await sleep(waitMs);
        if (waitMs < 5000) waitMs += 400;
    }

    return { status: 'processing', urls: { get: getUrl } };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(res) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

// Save prediction outputs to R2
// Returns: { saved: Array, r2Urls: Array }
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

    let baseUrl = 'https://replicate-nanobanana.skume-bioinfo.workers.dev';
    if (requestUrl) {
        try {
            const url = new URL(requestUrl);
            baseUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
            console.warn('[R2] Failed to parse request URL, using default:', e);
        }
    }

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

            const nameFromUrl = fileUrl.split('?')[0].split('/').pop() || 'file';
            const extFromUrl = getKnownExt(nameFromUrl);
            const extFromType = extFromContentType(contentType);
            const ext = extFromUrl || extFromType || '.png';

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

            const r2Url = `${baseUrl}/image/${encodeURIComponent(key)}`;
            console.log(`[R2] Generated R2 URL: ${r2Url}`);

            saved.push({
                source: fileUrl,
                r2Key: key,
                r2Url: r2Url,
                etag: putRes && putRes.etag ? putRes.etag : undefined,
                contentType,
            });

            r2Urls.push(r2Url);

            index += 1;
            console.log(`[R2] Image ${index} saved successfully`);
        } catch (e) {
            console.error(`[R2] ERROR saving image ${index}:`, e);
            console.error(`[R2] Error details:`, e.stack || e.message || String(e));
            saved.push({ source: fileUrl, error: String(e.message || e) });
        }
    }

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

    visit(obj && obj.output ? obj.output : obj);

    return Array.from(urls);
}

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

function sanitizeName(name) {
    return String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

function json(obj, corsHeaders, status) {
    return new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        },
    });
}
