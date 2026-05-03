/**
 * Simple API proxy server to avoid CORS in development
 *
 * Usage:
 *   node api-proxy-server.js
 *
 * Proxies:
 *   Proxies any path to TARGET host preserving path and method.
 *
 * Adds permissive CORS headers for local development.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const TARGET = process.env.TARGET || 'https://api.intelligence.io.solutions';

const targetUrl = new URL(TARGET);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer((req, res) => {
  // CORS preflight
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Proxy any path to the target, preserving method, path and headers
  const proxyPath = req.url;
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 443,
    path: proxyPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.hostname
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    setCors(res);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy error');
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`API proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying to: ${TARGET}`);
  console.log(`Example: http://localhost:${PORT}/api/v1/chat/stream`);
});
