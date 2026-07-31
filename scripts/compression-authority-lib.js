'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');

const parseAcceptEncoding = (header) => {
  const codings = new Map();
  if (typeof header !== 'string') return codings;

  for (const item of header.split(',')) {
    const [rawCoding, ...parameters] = item.trim().toLowerCase().split(';');
    if (!/^[a-z0-9*._-]+$/.test(rawCoding)) continue;
    let quality = 1;
    for (const parameter of parameters) {
      const match = parameter.trim().match(/^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/);
      if (match) quality = Number(match[1]);
    }
    codings.set(rawCoding, quality);
  }
  return codings;
};

const qualityFor = (codings, coding) => {
  if (codings.has(coding)) return codings.get(coding);
  if (codings.has('*')) return codings.get('*');
  return 0;
};

const selectContentEncoding = (header, available) => {
  const codings = parseAcceptEncoding(header);
  const ranked = available
    .filter(coding => coding === 'zstd' || coding === 'gzip')
    .map((coding, preference) => ({
      coding,
      preference,
      quality: qualityFor(codings, coding),
    }))
    .filter(candidate => candidate.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.preference - right.preference);

  if (ranked.length > 0) return ranked[0].coding;
  const identityQuality = codings.has('identity') ? codings.get('identity') : 1;
  return identityQuality > 0 ? 'identity' : null;
};

const validateNegotiatedResponse = ({
  selectedEncoding,
  contentEncoding,
  vary,
  etag,
}) => {
  if (selectedEncoding !== 'identity' && contentEncoding !== selectedEncoding) {
    throw new Error('Content-Encoding does not match the negotiated representation');
  }
  if (selectedEncoding === 'identity' && contentEncoding) {
    throw new Error('Identity representation must not declare Content-Encoding');
  }
  const varyTokens = String(vary || '')
    .split(',')
    .map(token => token.trim().toLowerCase());
  if (!varyTokens.includes('accept-encoding')) {
    throw new Error('Negotiated responses must include Vary: Accept-Encoding');
  }
  if (typeof etag !== 'string' || etag.trim().length === 0) {
    throw new Error('Negotiated responses require a variant-scoped validator');
  }
};

const walkSourceFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkSourceFiles(absolute));
    } else if (entry.isFile() && /\.(?:[cm]?[jt]sx?|ejs)$/.test(entry.name)) {
      output.push(absolute);
    }
  }
  return output;
};

const verifyGzipConfig = (source, label) => {
  if (!/\bgzip\s+on\s*;/.test(source)) {
    throw new Error(`${label} must explicitly enable gzip with "gzip on;"`);
  }
  if (!/\bgzip_vary\s+on\s*;/.test(source)) {
    throw new Error(`${label} must emit Vary: Accept-Encoding with "gzip_vary on;"`);
  }
  if (!/application\/activity\+json/.test(source) || !/application\/ld\+json/.test(source)) {
    throw new Error(`${label} must cover ActivityStreams JSON media types`);
  }
};

const verifyRepositoryCompressionAuthority = (root) => {
  for (const sourcePath of walkSourceFiles(path.join(root, 'app'))) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    if (
      /['"]accept-encoding['"]\s*:/i.test(source)
      || /\.(?:set|append)\(\s*['"]accept-encoding['"]/i.test(source)
    ) {
      throw new Error(`Application source must not control forbidden Accept-Encoding: ${path.relative(root, sourcePath)}`);
    }
  }

  const productionImports = walkSourceFiles(path.join(root, 'app'))
    .filter(sourcePath => !sourcePath.includes(`${path.sep}__tests__${path.sep}`))
    .filter(sourcePath => /(?:from|import\()\s*['"]soapbox\/utils\/compression['"]/.test(
      fs.readFileSync(sourcePath, 'utf8'),
    ))
    .map(sourcePath => path.relative(root, sourcePath))
    .sort();
  const approvedImports = ['app/soapbox/db/compressed-cache.ts'];
  if (
    productionImports.length !== approvedImports.length
    || productionImports.some((sourcePath, index) => sourcePath !== approvedImports[index])
  ) {
    throw new Error(`Compression critical-path/import authority drifted: ${productionImports.join(', ')}`);
  }

  const deploymentFiles = [
    ['installation/mastodon.conf', 'Mastodon Nginx template'],
    ['docs/administration/install-subdomain.md', 'subdomain Nginx template'],
  ];
  for (const [relativePath, label] of deploymentFiles) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) throw new Error(`Missing deployment compression authority: ${relativePath}`);
    verifyGzipConfig(fs.readFileSync(absolute, 'utf8'), label);
  }
};

const benchmarkRepresentativeTimeline = () => {
  const source = Buffer.from(JSON.stringify({
    ids: Array.from({ length: 2000 }, (_, index) => `status-${index}`),
  }));
  const startedAt = process.hrtime.bigint();
  const compressed = gzipSync(source, { level: 6 });
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return {
    sourceBytes: source.byteLength,
    compressedBytes: compressed.byteLength,
    ratio: compressed.byteLength / source.byteLength,
    durationMs,
  };
};

module.exports = {
  benchmarkRepresentativeTimeline,
  parseAcceptEncoding,
  selectContentEncoding,
  validateNegotiatedResponse,
  verifyRepositoryCompressionAuthority,
};
