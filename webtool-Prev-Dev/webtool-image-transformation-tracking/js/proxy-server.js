#!/usr/bin/env node

/**
 * Simple CORS Proxy Server for Replicate API
 * This allows the browser to call Replicate API without CORS errors
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8089;
const REPLICATE_API_BASE = 'https://api.replicate.com';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Prefer',
    'Access-Control-Max-Age': '86400'
};

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    // Only proxy /api/* requests
    if (!req.url.startsWith('/api/')) {
        res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found. Use /api/* endpoints' }));
        return;
    }

    // Extract the actual API path
    const apiPath = req.url.replace('/api', '');
    const targetUrl = REPLICATE_API_BASE + apiPath;

    console.log(`Proxying to: ${targetUrl}`);

    // Collect request body
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        const parsedUrl = url.parse(targetUrl);
        
        // Prepare headers for the proxied request
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Workflow-Tracker-Proxy/1.0'
        };

        // Forward Authorization header if present
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }

        // Forward Prefer header if present
        if (req.headers.prefer) {
            headers['Prefer'] = req.headers.prefer;
        }

        if (body) {
            headers['Content-Length'] = Buffer.byteLength(body);
        }

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: req.method,
            headers: headers
        };

        const proxyReq = https.request(options, (proxyRes) => {
            console.log(`Response status: ${proxyRes.statusCode}`);

            // Set CORS headers
            const responseHeaders = {
                ...corsHeaders,
                'Content-Type': proxyRes.headers['content-type'] || 'application/json'
            };

            res.writeHead(proxyRes.statusCode, responseHeaders);

            proxyRes.on('data', chunk => {
                res.write(chunk);
            });

            proxyRes.on('end', () => {
                res.end();
            });
        });

        proxyReq.on('error', (error) => {
            console.error('Proxy request error:', error);
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Proxy error',
                message: error.message
            }));
        });

        if (body) {
            proxyReq.write(body);
        }

        proxyReq.end();
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 CORS Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 Proxying requests to: ${REPLICATE_API_BASE}`);
    console.log(`\n💡 Usage: Replace "https://api.replicate.com" with "http://localhost:${PORT}/api" in your code\n`);
    console.log(`Example: http://localhost:${PORT}/api/v1/models/google/nano-banana/predictions\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down proxy server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
