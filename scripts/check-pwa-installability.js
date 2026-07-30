'use strict';

const path = require('node:path');

const { validateBuild, validateSource } = require('./pwa-installability-lib');

const root = path.resolve(process.env.PWA_INSTALLABILITY_ROOT || path.resolve(__dirname, '..'));
const result = process.env.PWA_BUILD_OUTPUT_ROOT
  ? validateBuild(path.resolve(process.env.PWA_BUILD_OUTPUT_ROOT), process.env.PWA_BASE_PATH || '/')
  : validateSource(root);

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
