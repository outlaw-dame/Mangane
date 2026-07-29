#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const { validateDocumentation } = require('./documentation-authority-lib');

const root = path.resolve(process.env.DOCUMENTATION_AUTHORITY_ROOT || path.resolve(__dirname, '..'));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'config', 'documentation-authority-registry.json'), 'utf8'));
const requirements = JSON.parse(fs.readFileSync(path.join(root, 'config', 'historical-requirement-traceability.json'), 'utf8'));
const { errors, actual } = validateDocumentation({ root, registry, requirements });
if (errors.length) {
  const encoded = zlib.gzipSync(Buffer.from(`${JSON.stringify(actual, null, 2)}\n`, 'utf8')).toString('base64');
  process.stdout.write('EXPECTED_REGISTRY_GZIP_BASE64_BEGIN\n');
  for (let index = 0; index < encoded.length; index += 3000) {
    const chunk = encoded.slice(index, index + 3000);
    const sequence = String(index / 3000).padStart(3, '0');
    const digest = crypto.createHash('sha256').update(chunk).digest('hex');
    process.stdout.write(`EXPECTED_REGISTRY_CHUNK_${sequence}_SHA256=${digest}\n`);
    process.stdout.write(`EXPECTED_REGISTRY_CHUNK_${sequence}=${chunk}\n`);
  }
  process.stdout.write('EXPECTED_REGISTRY_GZIP_BASE64_END\n');
  throw new Error(`documentation-authority:\n- ${errors.join('\n- ')}`);
}

process.stdout.write(`${JSON.stringify({
  documents: actual.documents.length,
  classifications: Object.fromEntries(
    [...new Set(actual.documents.map(record => record.classification))]
      .sort()
      .map(classification => [
        classification,
        actual.documents.filter(record => record.classification === classification).length,
      ]),
  ),
  historicalRequirements: requirements.requirements.length,
}, null, 2)}\n`);
