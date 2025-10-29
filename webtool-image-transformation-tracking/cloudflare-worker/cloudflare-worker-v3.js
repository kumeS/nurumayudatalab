/**
 * Cloudflare Worker: Replicate API CORS Proxy + R2 Storage
 * Version: 3.0
 * Created: 2025-10-27
 *
 * Based on:
 *   - workers.js: Successful R2 save logic with extractAllFileUrls()
 *   - cloudflare-worker-v2.1.js: Improved endpoint structure and logging
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
 *   - Filename Format: model-name-YYYYMMdd-HHmmss-index.ext
 *   - Example: nano-banana-20251027-123456-0.png
 *
 * Key Improvements in v3.0:
 *   - Uses workers.js proven extractAllFileUrls() with explicit field checking
 *   - Supports TRELLIS v2, Nano Banana, and other model output formats
 *   - Parallel file processing with Promise.all
 *   - Comprehensive error handling with [R2] logging
 *   - Metadata JSON storage for each prediction
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
                        version: '3.0',
                        created: '2025-10-27',
                        configuration: {
                            replicateToken: hasReplicateToken ? 'configured' : 'missing',
                            imageBucket: hasImageBucket ? 'configured' : 'missing',
                            r2Storage: hasImageBucket ? 'enabled' : 'disabled'
                        },
                        features: {
                            r2Storage: hasImageBucket,
                            autoPolling: true,
                            imageServing: hasImageBucket,
                            fileFormats: ['PNG', 'JPG', 'WEBP', 'GIF', 'GLB', 'MP4']
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

    // workers.js pollForResult method (line 220-274)
    async pollForResult(pollUrl, apiToken, controller, maxAttempts = 20) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const pollRes = await fetch(pollUrl, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${apiToken}`,
                        "Content-Type": "application/json"
                    },
                    signal: controller.signal
                });

                if (!pollRes.ok) {
                    throw new Error(`Poll request failed: ${pollRes.status}`);
                }

                const pollData = await pollRes.json();
                console.log(`Poll attempt ${attempt + 1}: Status = ${pollData.status}`);

                if (pollData.status === 'succeeded') {
                    return { success: true, data: pollData };
                } else if (pollData.status === 'failed') {
                    return { success: false, error: `Generation failed: ${pollData.error}` };
                } else if (pollData.status === 'canceled') {
                    return { success: false, error: 'Generation was canceled' };
                }

                // Still processing
                if (pollData.status === 'starting' || pollData.status === 'processing') {
                    const waitTime = Math.min(2000 + (attempt * 1000), 8000); // 2-8 seconds
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                // Unexpected status
                throw new Error(`Unexpected status: ${pollData.status}`);

            } catch (pollError) {
                if (pollError.name === 'AbortError') {
                    return { success: false, error: 'Polling aborted due to timeout' };
                }

                // Retry if not last attempt
                if (attempt < maxAttempts - 1) {
                    console.warn(`Poll attempt ${attempt + 1} failed, retrying:`, pollError.message);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }

                return { success: false, error: `Polling failed: ${pollError.message}` };
            }
        }

        return { success: false, error: 'Polling exceeded maximum attempts' };
    },

    // workers.js processAndSaveImages method (line 277-337) with v2.1.js improvements
    async processAndSaveImages(responseData, env) {
        console.log('[R2] ========================================');
        console.log('[R2] Starting R2 save process');
        console.log('[R2] Prediction ID:', responseData.id);

        // R2 bucket check
        if (!env.IMAGE_BUCKET) {
            console.error('[R2] CRITICAL ERROR: IMAGE_BUCKET not configured');
            console.error('[R2] Available env keys:', Object.keys(env));
            throw new Error("R2 bucket binding not configured");
        }

        console.log('[R2] IMAGE_BUCKET binding found:', typeof env.IMAGE_BUCKET);

        // Extract all file URLs using workers.js method
        const fileUrls = this.extractAllFileUrls(responseData);

        if (fileUrls.length === 0) {
            console.log("[R2] No file URLs found in response");
            return { saved: [], r2Urls: [] };
        }

        console.log(`[R2] Found ${fileUrls.length} file URLs to process`);
        console.log('[R2] URLs:', JSON.stringify(fileUrls));

        // Extract model name
        const modelName = this.extractModelName(responseData);
        console.log('[R2] Model name:', modelName);

        // Process each file in parallel
        const saved = [];
        const r2Urls = [];

        const savePromises = fileUrls.map(async (fileUrl, index) => {
            try {
                console.log(`[R2] Processing file ${index + 1}/${fileUrls.length}: ${fileUrl.substring(0, 100)}...`);

                // Download file
                const fileResponse = await fetch(fileUrl);
                if (!fileResponse.ok) {
                    const errorMsg = `fetch status ${fileResponse.status}`;
                    console.error(`[R2] Failed to fetch file: ${errorMsg}`);
                    return { source: fileUrl, error: errorMsg };
                }

                console.log(`[R2] Fetch response status: ${fileResponse.status}`);

                // Get Content-Type and determine extension
                const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
                console.log(`[R2] Content-Type: ${contentType}`);

                const extension = this.getFileExtension(contentType, fileUrl);

                if (!extension) {
                    console.warn(`[R2] Unsupported file format: ${contentType}, URL: ${fileUrl}`);
                    return { source: fileUrl, error: 'Unsupported format' };
                }

                // Get file data
                const fileData = await fileResponse.arrayBuffer();

                // Generate filename using workers.js format
                const fileName = this.generateFileName(modelName, index, extension);

                console.log(`[R2] Saving to R2 with key: ${fileName}`);

                // Save to R2
                await env.IMAGE_BUCKET.put(fileName, fileData, {
                    httpMetadata: {
                        contentType: contentType || this.getContentTypeForExtension(extension)
                    },
                    customMetadata: {
                        sourceUrl: fileUrl,
                        replicateId: String(responseData.id || 'unknown'),
                        savedAt: new Date().toISOString(),
                        modelName: modelName
                    }
                });

                console.log(`[R2] File saved to R2: ${fileName} (${fileData.byteLength} bytes)`);

                // Generate R2 URL (placeholder - adjust domain as needed)
                const r2Url = `https://replicate-nanobanana.skume-bioinfo.workers.dev/image/${encodeURIComponent(fileName)}`;
                console.log(`[R2] Generated R2 URL: ${r2Url}`);

                return {
                    source: fileUrl,
                    r2Key: fileName,
                    r2Url: r2Url,
                    contentType,
                    size: fileData.byteLength
                };

            } catch (error) {
                console.error(`[R2] ERROR saving file ${index}:`, error);
                console.error(`[R2] Error details:`, error.stack || error.message || String(error));
                return { source: fileUrl, error: String(error.message || error) };
            }
        });

        // Wait for all file processing
        const results = await Promise.all(savePromises);

        // Collect successful saves
        for (const result of results) {
            if (result.r2Url) {
                saved.push(result);
                r2Urls.push(result.r2Url);
            } else if (result.error) {
                saved.push(result);
            }
        }

        // Save metadata JSON (from v2.1.js)
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hour = String(now.getHours()).padStart(2, '0');
            const minute = String(now.getMinutes()).padStart(2, '0');
            const second = String(now.getSeconds()).padStart(2, '0');

            const safeModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
            const jsonKey = `${safeModelName}-${year}${month}${day}-${hour}${minute}${second}-metadata.json`;

            console.log(`[R2] Saving prediction metadata to: ${jsonKey}`);

            await env.IMAGE_BUCKET.put(jsonKey, JSON.stringify(responseData, null, 2), {
                httpMetadata: { contentType: 'application/json' },
                customMetadata: {
                    replicateId: String(responseData.id || 'unknown'),
                    savedAt: new Date().toISOString(),
                    modelName: modelName
                }
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
    },

    // workers.js extractAllFileUrls method (line 340-384) - CRITICAL for Nano Banana support
    extractAllFileUrls(responseData) {
        const fileUrls = [];

        // TRELLIS v2 and general output format support
        if (responseData.output) {
            // GLB model file
            if (responseData.output.model_file) {
                fileUrls.push(responseData.output.model_file);
            }

            // Video files
            if (responseData.output.color_video) {
                fileUrls.push(responseData.output.color_video);
            }
            if (responseData.output.normal_video) {
                fileUrls.push(responseData.output.normal_video);
            }
            if (responseData.output.combined_video) {
                fileUrls.push(responseData.output.combined_video);
            }

            // Background removed images
            if (Array.isArray(responseData.output.no_background_images)) {
                responseData.output.no_background_images.forEach(imageUrl => {
                    if (typeof imageUrl === 'string' && this.isValidUrl(imageUrl)) {
                        fileUrls.push(imageUrl);
                    }
                });
            }

            // Array format output (Nano Banana uses this!)
            if (Array.isArray(responseData.output)) {
                responseData.output.forEach(item => {
                    if (typeof item === 'string' && this.isValidUrl(item)) {
                        fileUrls.push(item);
                    }
                });
            } else if (typeof responseData.output === 'string' && this.isValidUrl(responseData.output)) {
                // Single string output
                fileUrls.push(responseData.output);
            }
        }

        // Remove duplicates
        return [...new Set(fileUrls)];
    },

    // workers.js extractModelName method (line 576-600)
    extractModelName(responseData) {
        // From responseData.model
        if (responseData.model) {
            const modelPath = responseData.model.split(':')[0]; // Remove version
            const modelName = modelPath.split('/').pop(); // Remove owner
            return modelName;
        }

        // From responseData.version.model
        if (responseData.version && responseData.version.model) {
            const modelPath = responseData.version.model.split(':')[0];
            const modelName = modelPath.split('/').pop();
            return modelName;
        }

        // From responseData.prediction.model
        if (responseData.prediction && responseData.prediction.model) {
            const modelPath = responseData.prediction.model.split(':')[0];
            const modelName = modelPath.split('/').pop();
            return modelName;
        }

        // Default
        return 'unknown-model';
    },

    // workers.js generateFileName method (line 603-617)
    generateFileName(modelName, index, extension) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');

        // Sanitize model name
        const safeModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

        // Format: model-name-YYYYMMdd-HHmmss-index.ext
        return `${safeModelName}-${year}${month}${day}-${hour}${minute}${second}-${index}.${extension}`;
    },

    // workers.js getFileExtension method (line 470-520)
    getFileExtension(contentType, url) {
        // Content-Type mapping
        const typeMap = {
            'model/gltf-binary': 'glb',
            'model/gltf+json': 'gltf',
            'application/octet-stream': null, // Check URL
            'video/mp4': 'mp4',
            'video/mpeg': 'mp4',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/bmp': 'bmp'
        };

        // Check Content-Type first
        if (contentType && typeMap[contentType.toLowerCase()]) {
            return typeMap[contentType.toLowerCase()];
        }

        // Extract extension from URL
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            const match = pathname.match(/\.([a-z0-9]+)$/);
            if (match) {
                const ext = match[1];
                // Only allow supported extensions
                if (['glb', 'gltf', 'mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
                    return ext === 'jpeg' ? 'jpg' : ext;
                }
            }
        } catch {
            // URL parse error - ignore
        }

        // Special case: application/octet-stream for GLB
        if (contentType && contentType.toLowerCase().includes('octet-stream')) {
            try {
                const urlObj = new URL(url);
                if (urlObj.pathname.toLowerCase().includes('glb') || urlObj.pathname.toLowerCase().includes('model')) {
                    return 'glb';
                }
            } catch {
                // URL parse error - ignore
            }
        }

        return null;
    },

    // workers.js getContentTypeForExtension method (line 523-537)
    getContentTypeForExtension(extension) {
        const extMap = {
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

        return extMap[extension.toLowerCase()] || 'application/octet-stream';
    },

    // workers.js isValidUrl method (line 460-467)
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

// Helper functions from v2.1.js

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

    // Extract apiToken from request body (UI-side API key)
    const { url, path, apiToken, ...forwardBody } = payload || {};

    // Use apiToken from request, fallback to env.REPLICATE_API_TOKEN
    const replicateToken = apiToken || env.REPLICATE_API_TOKEN;

    if (!replicateToken) {
        return json({
            error: 'Replicate API token required in request or environment',
            hint: 'Please configure your API key in the UI settings or set REPLICATE_API_TOKEN secret in Cloudflare Workers'
        }, corsHeaders, 400);
    }

    // Log which token source is being used (without exposing the token itself)
    console.log('Using API token from:', apiToken ? 'request (UI-side)' : 'environment (Cloudflare Secret)');

    const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${replicateToken}`,
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

    // Auto-polling using workers.js method
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
        // Use workers.js pollForResult
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds

        try {
            const pollResult = await exports.default.pollForResult(start.urls.get, replicateToken, controller);
            clearTimeout(timeoutId);

            if (pollResult.success) {
                outcome = pollResult.data;
            } else {
                throw new Error(pollResult.error);
            }
        } catch (pollError) {
            clearTimeout(timeoutId);
            console.error('Polling error:', pollError);
            // Continue with partial result
        }
    }

    // Save to R2 if succeeded using workers.js method
    let saved = [];
    if (outcome && outcome.status === 'succeeded') {
        try {
            const saveResult = await exports.default.processAndSaveImages(outcome, env);
            saved = saveResult.saved;

            if (saveResult.r2Urls && saveResult.r2Urls.length > 0) {
                outcome.r2Output = saveResult.r2Urls;
            }
        } catch (imageError) {
            console.error("Image processing failed:", imageError);
            // Continue - don't fail the request
        }
    }

    // Return based on status
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

    // Extract apiToken from request body (UI-side API key)
    const apiToken = payload.apiToken || null;

    // Use apiToken from request, fallback to env.REPLICATE_API_TOKEN
    const replicateToken = apiToken || env.REPLICATE_API_TOKEN;

    if (!replicateToken) {
        return json({
            error: 'Replicate API token required in request or environment',
            hint: 'Please configure your API key in the UI settings or set REPLICATE_API_TOKEN secret in Cloudflare Workers'
        }, corsHeaders, 400);
    }

    console.log('Poll - Using API token from:', apiToken ? 'request (UI-side)' : 'environment (Cloudflare Secret)');

    // Use workers.js pollForResult
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let outcome;
    try {
        const pollResult = await exports.default.pollForResult(pollUrl, replicateToken, controller);
        clearTimeout(timeoutId);

        if (pollResult.success) {
            outcome = pollResult.data;
        } else {
            throw new Error(pollResult.error);
        }
    } catch (pollError) {
        clearTimeout(timeoutId);
        return json({ error: 'Polling failed', detail: String(pollError) }, corsHeaders, 500);
    }

    // Save to R2 if succeeded
    let saved = [];
    if (outcome && outcome.status === 'succeeded') {
        try {
            const saveResult = await exports.default.processAndSaveImages(outcome, env);
            saved = saveResult.saved;

            if (saveResult.r2Urls && saveResult.r2Urls.length > 0) {
                outcome.r2Output = saveResult.r2Urls;
            }
        } catch (imageError) {
            console.error("Image processing failed:", imageError);
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

async function safeJson(res) {
    try {
        return await res.json();
    } catch {
        return null;
    }
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
