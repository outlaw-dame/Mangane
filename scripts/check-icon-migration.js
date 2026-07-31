'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildIconImportSnapshot,
  canonicalRegistryPath,
  findImportGrowth,
  summarizeProviders,
} = require('./icon-migration-lib');

const root = path.resolve(process.env.ICON_MIGRATION_ROOT || path.resolve(__dirname, '..'));
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const baseline = JSON.parse(read('config/icon-migration-baseline.json'));
const imports = buildIconImportSnapshot(root);
const packageJson = JSON.parse(read('package.json'));
const phosphorImports = imports.filter(item => item.provider === 'phosphor');

const trustedRef = process.env.ICON_MIGRATION_BASE_REF;
const readTrustedBaseline = revision => {
  assert.match(
    revision,
    /^[0-9a-f]{40}$/i,
    'ICON_MIGRATION_BASE_REF must be a full 40-character hexadecimal commit SHA',
  );

  let serialized;
  try {
    serialized = execFileSync(
      'git',
      ['show', `${revision}:config/icon-migration-baseline.json`],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    const detail = error.stderr?.toString().trim();
    throw new Error(
      `Unable to read the trusted icon baseline from ${revision}${detail ? `: ${detail}` : ''}`,
    );
  }

  try {
    return JSON.parse(serialized);
  } catch {
    throw new Error(`The trusted icon baseline at ${revision} is not valid JSON`);
  }
};

assert.equal(baseline.schemaVersion, 1, 'Unsupported icon migration baseline schema');
assert.equal(baseline.canonicalRegistry, canonicalRegistryPath, 'Canonical semantic icon registry drifted');
assert.equal(
  baseline.policy,
  'legacy-imports-may-only-shrink-through-reviewed-baseline-updates',
  'Raw icon import policy drifted',
);
assert.ok(
  phosphorImports.length > 0,
  'The canonical semantic icon registry must import Phosphor',
);
assert.deepStrictEqual(
  [...new Set(phosphorImports.map(item => item.path))],
  [canonicalRegistryPath],
  `Phosphor imports are restricted to ${canonicalRegistryPath}`,
);
assert.deepStrictEqual(
  imports,
  baseline.imports,
  'Raw icon import baseline drifted; new raw imports are forbidden and migrations require reviewed baseline reconciliation',
);
assert.deepStrictEqual(
  summarizeProviders(imports),
  baseline.providers,
  'Icon provider counts drifted from the reviewed migration baseline',
);

if (trustedRef) {
  const trustedBaseline = readTrustedBaseline(trustedRef);
  assert.equal(trustedBaseline.schemaVersion, 1, 'Unsupported trusted icon baseline schema');
  assert.ok(Array.isArray(trustedBaseline.imports), 'Trusted icon baseline imports must be an array');
  const growth = findImportGrowth(baseline.imports, trustedBaseline.imports);
  assert.deepStrictEqual(
    growth,
    [],
    `Raw icon import growth is forbidden relative to trusted baseline ${trustedRef}`,
  );
}
assert.equal(
  packageJson.dependencies?.['@phosphor-icons/react'],
  '2.1.10',
  'Pin the reviewed Phosphor dependency exactly to 2.1.10',
);

process.stdout.write(`${JSON.stringify({
  canonicalRegistry: canonicalRegistryPath,
  providers: baseline.providers,
  ...(trustedRef ? { trustedBaseline: trustedRef } : {}),
}, null, 2)}\n`);
