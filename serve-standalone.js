/**
 * Simple static server for Mangane in standalone mode.
 * Serves static files from ./static, returns 404 for API routes
 * (which triggers standalone mode), and falls back to index.html
 * for all other routes (SPA behavior).
 *
 * Includes gzip compression and cache headers for performance.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3036;
const STATIC_DIR = path.join(__dirname, 'static');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

// File types worth compressing
const COMPRESSIBLE = new Set([
  'text/html', 'application/javascript', 'text/css',
  'application/json', 'image/svg+xml', 'application/manifest+json',
]);

// Paths that should NOT be served by the SPA fallback.
// These return 404 so Mangane detects standalone mode.
const API_PREFIXES = ['/api/', '/oauth/', '/nodeinfo', '/.well-known/'];

// Translation proxy path
const TRANSLATE_PROXY_PATH = '/_translate/';

function shouldCompress(contentType) {
  return COMPRESSIBLE.has(contentType);
}

function getCacheHeader(pathname) {
  // Hashed assets (packs/) get long-term cache
  if (pathname.startsWith('/packs/')) {
    return 'public, max-age=31536000, immutable';
  }
  // index.html and manifests should revalidate
  return 'public, max-age=0, must-revalidate';
}

function serveFile(req, res, filePath, cachePathname) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = getCacheHeader(cachePathname);
  const acceptEncoding = req.headers['accept-encoding'] || '';

  const headers = {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  };

  // Gzip compress if client supports it and content is compressible
  if (shouldCompress(contentType) && acceptEncoding.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
  } else {
    const stat = fs.statSync(filePath);
    headers['Content-Length'] = stat.size;
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS header for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Translation proxy — forwards requests to DeepL/LibreTranslate to avoid CORS
  if (pathname.startsWith(TRANSLATE_PROXY_PATH)) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { targetUrl, headers: proxyHeaders, body: proxyBody } = JSON.parse(body);
        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing targetUrl' }));
          return;
        }

        const https = require('https');
        const urlObj = new URL(targetUrl);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...proxyHeaders,
          },
        };

        const proxyReq = https.request(options, (proxyRes) => {
          let responseBody = '';
          proxyRes.on('data', chunk => { responseBody += chunk; });
          proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, {
              'Content-Type': proxyRes.headers['content-type'] || 'application/json',
            });
            res.end(responseBody);
          });
        });

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
        });

        proxyReq.write(proxyBody || '');
        proxyReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // API paths → 404 (triggers standalone mode detection)
  if (API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Try to serve the actual file
  let filePath = path.join(STATIC_DIR, pathname);

  // If it's a directory, try index.html in it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(req, res, filePath, pathname);
    return;
  }

  // SPA fallback: serve index.html for all other routes
  const indexPath = path.join(STATIC_DIR, 'index.html');
  serveFile(req, res, indexPath, '/index.html');
});

server.listen(PORT, () => {
  console.log(`Mangane standalone server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${STATIC_DIR}`);
  console.log('Gzip compression enabled for text assets');
  console.log('Hashed assets cached immutably (1 year)');
  console.log('API routes return 404 → standalone mode enabled');
});
