'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_ICONS = Object.freeze([
  { src: 'pwa-icons/icon-192.png', sizes: '192x192', purpose: 'any' },
  { src: 'pwa-icons/icon-512.png', sizes: '512x512', purpose: 'any maskable' },
]);

const fail = message => {
  throw new Error(`pwa-installability: ${message}`);
};

const readInside = (root, relativePath) => {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(`unsafe path ${relativePath}`);
  return fs.readFileSync(absolute);
};

const readText = (root, relativePath) => readInside(root, relativePath).toString('utf8');

const normalizeBasePath = value => {
  if (typeof value !== 'string') fail('base path must be a string');
  const segments = value.split('/').filter(Boolean);
  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes('\\'))) {
    fail(`unsafe base path ${value}`);
  }
  return segments.length ? `/${segments.join('/')}/` : '/';
};

const readPngDimensions = buffer => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    fail('icon is not a PNG with an IHDR header');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const validateManifest = manifest => {
  for (const field of ['name', 'short_name', 'description', 'theme_color', 'background_color']) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) fail(`manifest ${field} is required`);
  }
  for (const field of ['id', 'scope', 'start_url']) {
    if (manifest[field] !== './') fail(`manifest ${field} must be relative to its deployment directory`);
  }
  if (manifest.display !== 'standalone') fail('manifest display must remain standalone');
  if (manifest.share_target?.action !== 'share') fail('share target action must be deployment-relative');

  for (const required of REQUIRED_ICONS) {
    const icon = manifest.icons?.find(candidate => candidate.src === required.src);
    if (!icon) fail(`manifest icon is missing: ${required.src}`);
    if (icon.type !== 'image/png' || icon.sizes !== required.sizes || icon.purpose !== required.purpose) {
      fail(`manifest icon metadata is invalid: ${required.src}`);
    }
  }
};

const validateIcons = root => {
  for (const icon of REQUIRED_ICONS) {
    const expected = Number(icon.sizes.split('x')[0]);
    const dimensions = readPngDimensions(readInside(root, path.join('app', icon.src)));
    if (dimensions.width !== expected || dimensions.height !== expected) {
      fail(`${icon.src} must be exactly ${expected}x${expected}`);
    }
  }
};

const requireFragments = (source, fragments, label) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) fail(`${label} is missing required evidence: ${fragment}`);
  }
};

const validateSource = root => {
  const manifest = JSON.parse(readText(root, 'app/manifest.json'));
  validateManifest(manifest);
  validateIcons(root);

  requireFragments(readText(root, 'app/index.ejs'), [
    'href="<%= pwaBasePath %>manifest.json"',
    'href="<%= pwaBasePath %>pwa-icons/icon-192.png"',
  ], 'app/index.ejs');
  requireFragments(readText(root, 'webpack/shared.js'), [
    'pwaBasePath,',
    'from: join(__dirname, \'..\', \'app\', \'pwa-icons\')',
    'to: join(output.path, \'pwa-icons\')',
  ], 'webpack/shared.js');
  requireFragments(readText(root, 'webpack/production.js'), [
    'self.registration.scope',
    'relativePathname',
  ], 'webpack/production.js');
  requireFragments(readText(root, 'app/soapbox/service_worker/share_target.js'), [
    'self.registration.scope',
    'sharePath',
    'composeUrl',
  ], 'share target worker');
  requireFragments(readText(root, 'app/soapbox/main.tsx'), [
    'BuildConfig.FE_SUBDIRECTORY',
    'share_target.js',
  ], 'service-worker development registration');
  requireFragments(readText(root, 'app/pwa-icons/icon.svg'), [
    '<rect width="1024" height="1024" fill="#4338ca"/>',
    'translate(192 192) scale(26.6666667)',
  ], 'maskable icon source');
  requireFragments(readText(root, 'app/soapbox/features/pwa-install/components/pwa-install-banner.tsx'), [
    'window.addEventListener(\'beforeinstallprompt\'',
    'window.addEventListener(\'appinstalled\'',
    'await currentPrompt.prompt()',
    'persistDismissal()',
  ], 'PWA install discovery');
  requireFragments(readText(root, '.github/workflows/pwa-installability.yml'), [
    'permissions:\n  contents: read',
    'yarn install --immutable --mode=skip-build',
    'PWA_BUILD_OUTPUT_ROOT=static/Mangane PWA_BASE_PATH=/Mangane yarn check:pwa-installability',
    'yarn test:pwa-browser',
  ], 'PWA installability workflow');
  requireFragments(readText(root, 'docs/architecture/PHASE_4B_PWA_INSTALLABILITY_CLOSURE.md'), [
    'Status: **Implementation complete; merge verification pending**',
    'does not authorize authenticated API response caching',
    'calls `prompt()` only from the Install button handler',
  ], 'Phase 4B documentation');

  return {
    icons: REQUIRED_ICONS.length,
    manifest: 'app/manifest.json',
  };
};

const validateBuild = (outputRoot, basePathValue = '/') => {
  const basePath = normalizeBasePath(basePathValue);
  const output = path.resolve(outputRoot);
  const manifest = JSON.parse(readText(output, 'manifest.json'));
  validateManifest(manifest);
  const html = readText(output, 'index.html');
  requireFragments(html, [
    `href="${basePath}manifest.json"`,
    `href="${basePath}pwa-icons/icon-192.png"`,
  ], 'built index.html');

  for (const icon of REQUIRED_ICONS) {
    const expected = Number(icon.sizes.split('x')[0]);
    const dimensions = readPngDimensions(readInside(output, icon.src));
    if (dimensions.width !== expected || dimensions.height !== expected) {
      fail(`built ${icon.src} must be exactly ${expected}x${expected}`);
    }
  }
  for (const required of ['sw.js', 'assets-manifest.json']) readInside(output, required);

  return { basePath, icons: REQUIRED_ICONS.length };
};

module.exports = {
  REQUIRED_ICONS,
  normalizeBasePath,
  readPngDimensions,
  validateBuild,
  validateManifest,
  validateSource,
};
