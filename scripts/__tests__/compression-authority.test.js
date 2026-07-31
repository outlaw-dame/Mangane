'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  benchmarkRepresentativeTimeline,
  selectContentEncoding,
  validateNegotiatedResponse,
  verifyRepositoryCompressionAuthority,
} = require('../compression-authority-lib');

const root = path.resolve(__dirname, '..', '..');

test('selects zstd, gzip, or identity using explicit quality values', () => {
  assert.equal(selectContentEncoding('gzip, zstd', ['zstd', 'gzip']), 'zstd');
  assert.equal(selectContentEncoding('zstd;q=0, gzip;q=0.8', ['zstd', 'gzip']), 'gzip');
  assert.equal(selectContentEncoding('gzip;q=0, identity;q=1', ['gzip']), 'identity');
  assert.equal(selectContentEncoding('*;q=0, identity;q=0', ['zstd', 'gzip']), null);
  assert.equal(selectContentEncoding('br;q=1, gzip;q=0.5', ['gzip']), 'gzip');
});

test('requires accurate coding, variant-aware caches, and validators', () => {
  assert.doesNotThrow(() => validateNegotiatedResponse({
    selectedEncoding: 'gzip',
    contentEncoding: 'gzip',
    vary: 'Origin, Accept-Encoding',
    etag: '"asset.gzip.sha256"',
  }));
  assert.throws(() => validateNegotiatedResponse({
    selectedEncoding: 'gzip',
    contentEncoding: 'zstd',
    vary: 'Accept-Encoding',
    etag: '"asset"',
  }), /Content-Encoding/);
  assert.throws(() => validateNegotiatedResponse({
    selectedEncoding: 'gzip',
    contentEncoding: 'gzip',
    vary: 'Origin',
    etag: '"asset"',
  }), /Vary/);
  assert.throws(() => validateNegotiatedResponse({
    selectedEncoding: 'gzip',
    contentEncoding: 'gzip',
    vary: 'Accept-Encoding',
    etag: '',
  }), /validator/);
});

test('repository deployment and application sources satisfy the compression boundary', () => {
  assert.doesNotThrow(() => verifyRepositoryCompressionAuthority(root));
});

test('representative timeline cache compression stays within byte and CPU budgets', () => {
  const result = benchmarkRepresentativeTimeline();
  assert.ok(result.sourceBytes > 20_000);
  assert.ok(result.ratio < 0.4, `expected gzip ratio below 0.4, got ${result.ratio}`);
  assert.ok(result.durationMs < 250, `expected gzip under 250ms, got ${result.durationMs}`);
});

test('forbidden negotiation headers and missing gzip activation fail closed', () => {
  const fixture = fs.mkdtempSync('/tmp/mangane-compression-');
  fs.mkdirSync(path.join(fixture, 'app'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'installation'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'docs/administration'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'app', 'bad.ts'), 'fetch(\'/\', { headers: { \'Accept-Encoding\': \'gzip\' } });');
  fs.writeFileSync(path.join(fixture, 'installation', 'mastodon.conf'), 'gzip_vary on;');
  fs.writeFileSync(path.join(fixture, 'docs/administration', 'install-subdomain.md'), 'gzip_vary on;');

  assert.throws(() => verifyRepositoryCompressionAuthority(fixture), /Accept-Encoding|gzip on/);
});
