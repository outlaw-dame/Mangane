#!/usr/bin/env node
'use strict';

const path = require('node:path');

const { verifyRepositoryCompressionAuthority } = require('./compression-authority-lib');

const root = path.resolve(__dirname, '..');

try {
  verifyRepositoryCompressionAuthority(root);
  process.stdout.write('Compression authority verified.\n');
} catch (error) {
  process.stderr.write(`Compression authority failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
