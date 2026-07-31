'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { normalizeBasePath } = require('./pwa-installability-lib');

const root = path.resolve(process.env.PWA_FIXTURE_ROOT || path.resolve(__dirname, '..', 'static', 'Mangane'));
const basePath = normalizeBasePath(process.env.PWA_FIXTURE_BASE_PATH || '/Mangane/');
const port = Number(process.env.PWA_FIXTURE_PORT || 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('pwa-fixture: invalid port');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/manifest+json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.woff2', 'font/woff2'],
]);

const send = (response, status, body, contentType) => {
  response.writeHead(status, {
    'Cache-Control': 'no-cache',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
};

const resolveStaticPath = pathname => {
  const relativeUrl = pathname.slice(basePath.length);
  let decoded;
  try {
    decoded = decodeURIComponent(relativeUrl);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const absolute = path.resolve(root, decoded || 'index.html');
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return absolute;
};

const server = http.createServer((request, response) => {
  if (!request.url || !['GET', 'HEAD'].includes(request.method || '')) {
    send(response, 405, 'Method Not Allowed', 'text/plain; charset=utf-8');
    return;
  }

  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  if (!requestUrl.pathname.startsWith(basePath)) {
    send(response, 404, 'Not Found', 'text/plain; charset=utf-8');
    return;
  }
  const scopedPath = requestUrl.pathname.slice(basePath.length - 1);
  if (/^\/(?:api|auth|oauth|objects|media)(?:\/|$)/.test(scopedPath)) {
    send(response, 404, '{"error":"fixture backend unavailable"}', 'application/json; charset=utf-8');
    return;
  }

  const absolute = resolveStaticPath(requestUrl.pathname);
  if (!absolute) {
    send(response, 400, 'Bad Request', 'text/plain; charset=utf-8');
    return;
  }

  let target = absolute;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    const acceptsHtml = request.headers.accept?.includes('text/html');
    if (!acceptsHtml) {
      send(response, 404, 'Not Found', 'text/plain; charset=utf-8');
      return;
    }
    target = path.join(root, 'index.html');
  }

  const body = request.method === 'HEAD' ? undefined : fs.readFileSync(target);
  send(response, 200, body, contentTypes.get(path.extname(target)) || 'application/octet-stream');
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`PWA fixture listening at http://127.0.0.1:${port}${basePath}\n`);
});

const close = () => server.close(() => process.exit(0));
process.on('SIGINT', close);
process.on('SIGTERM', close);
