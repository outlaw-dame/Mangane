'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  normalizeBasePath,
  readPngDimensions,
  validateBuild,
  validateManifest,
  validateSource,
} = require('../pwa-installability-lib');

const repositoryRoot = path.resolve(__dirname, '..', '..');

const pngHeader = (width, height) => {
  const buffer = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
};

const validManifest = () => ({
  name: 'Mangane',
  short_name: 'Mangane',
  description: 'A calm, adaptive Fediverse client',
  id: './',
  scope: './',
  start_url: './',
  display: 'standalone',
  theme_color: '#4338ca',
  background_color: '#f6f7f9',
  icons: [
    { src: 'pwa-icons/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
    { src: 'pwa-icons/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
  ],
  share_target: { action: 'share' },
});

const makeBuild = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mangane-pwa-build-'));
  fs.mkdirSync(path.join(root, 'pwa-icons'));
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(validManifest()));
  fs.writeFileSync(path.join(root, 'index.html'), '<link href="/Mangane/manifest.json"><link href="/Mangane/pwa-icons/icon-192.png">');
  fs.writeFileSync(path.join(root, 'pwa-icons/icon-192.png'), pngHeader(192, 192));
  fs.writeFileSync(path.join(root, 'pwa-icons/icon-512.png'), pngHeader(512, 512));
  fs.writeFileSync(path.join(root, 'sw.js'), 'worker');
  fs.writeFileSync(path.join(root, 'assets-manifest.json'), '{}');
  return root;
};

const makeSourceFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mangane-pwa-source-'));
  const sourcePaths = [
    '.github/workflows/pwa-installability.yml',
    'app/index.ejs',
    'app/manifest.json',
    'app/pwa-icons/icon-192.png',
    'app/pwa-icons/icon-512.png',
    'app/pwa-icons/icon.svg',
    'app/soapbox/features/pwa-install/components/pwa-install-banner.tsx',
    'app/soapbox/features/ui/index.tsx',
    'app/soapbox/main.tsx',
    'app/soapbox/service_worker/share_target.js',
    'app/styles/application.scss',
    'docs/architecture/PHASE_4B_PWA_INSTALLABILITY_CLOSURE.md',
    'webpack/production.js',
    'webpack/shared.js',
  ];
  for (const sourcePath of sourcePaths) {
    const destination = path.join(root, sourcePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, sourcePath), destination);
  }
  return root;
};

test('normalizes root and subdirectory deployment paths and rejects traversal', () => {
  assert.equal(normalizeBasePath(''), '/');
  assert.equal(normalizeBasePath('/Mangane'), '/Mangane/');
  assert.equal(normalizeBasePath('nested/app/'), '/nested/app/');
  assert.throws(() => normalizeBasePath('../private'), /unsafe base path/);
  assert.throws(() => normalizeBasePath('nested\\app'), /unsafe base path/);
});

test('reads exact PNG dimensions from the IHDR header', () => {
  assert.deepEqual(readPngDimensions(pngHeader(192, 512)), { width: 192, height: 512 });
  assert.throws(() => readPngDimensions(Buffer.from('not-png')), /not a PNG/);
});

test('requires deployment-relative manifest identity, scope, launch, share, and icons', () => {
  assert.doesNotThrow(() => validateManifest(validManifest()));
  for (const field of ['id', 'scope', 'start_url']) {
    const manifest = validManifest();
    manifest[field] = '/';
    assert.throws(() => validateManifest(manifest), new RegExp(`manifest ${field}`));
  }
  const manifest = validManifest();
  manifest.share_target.action = '/share';
  assert.throws(() => validateManifest(manifest), /share target action/);
});

test('validates a built subdirectory PWA and fails closed on missing or wrong-sized icons', () => {
  const root = makeBuild();
  assert.deepEqual(validateBuild(root, '/Mangane'), { basePath: '/Mangane/', icons: 2 });

  fs.writeFileSync(path.join(root, 'pwa-icons/icon-512.png'), pngHeader(511, 512));
  assert.throws(() => validateBuild(root, '/Mangane'), /exactly 512x512/);
  fs.rmSync(path.join(root, 'pwa-icons/icon-192.png'));
  assert.throws(() => validateBuild(root, '/Mangane'), /ENOENT/);
});

test('the repository satisfies the Phase 4B source contract', () => {
  assert.doesNotThrow(() => validateSource(repositoryRoot));
});

test('runtime branding owns theme-color without a conflicting static value', () => {
  const template = fs.readFileSync(path.join(repositoryRoot, 'app/index.ejs'), 'utf8');
  const runtime = fs.readFileSync(path.join(repositoryRoot, 'app/soapbox/containers/soapbox.tsx'), 'utf8');
  assert.doesNotMatch(template, /name=["']theme-color["']/);
  assert.match(runtime, /<meta name='theme-color' content=\{soapboxConfig\.brandColor\}/);
});

test('fails closed when the install surface or stylesheet is disconnected from the shell', () => {
  for (const [relativePath, fragment] of [
    ['app/soapbox/features/ui/index.tsx', '<PWAInstallBanner />'],
    ['app/styles/application.scss', '@import \'components/pwa-install\';'],
  ]) {
    const root = makeSourceFixture();
    const sourcePath = path.join(root, relativePath);
    fs.writeFileSync(sourcePath, fs.readFileSync(sourcePath, 'utf8').replace(fragment, ''));
    assert.throws(() => validateSource(root), /PWA install/);
    fs.rmSync(root, { force: true, recursive: true });
  }
});
