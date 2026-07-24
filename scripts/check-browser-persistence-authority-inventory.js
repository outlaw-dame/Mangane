'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.env.BROWSER_PERSISTENCE_INVENTORY_ROOT || path.resolve(__dirname, '..'));
const manifestPath = path.join(root, 'config', 'browser-persistence-authority-inventory.json');
const fail = message => { throw new Error(`browser-persistence-authority: ${message}`); };

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 1) fail(`unsupported schemaVersion ${manifest.schemaVersion}`);
if (!Array.isArray(manifest.surfaces) || manifest.surfaces.length === 0) fail('surfaces must be a non-empty array');
if (!Array.isArray(manifest.explicitUnknowns) || manifest.explicitUnknowns.length === 0) fail('explicitUnknowns must remain non-empty');

const seenIds = new Set();
let sensitiveSurfaces = 0;
for (const surface of manifest.surfaces) {
  if (!surface || typeof surface.id !== 'string' || typeof surface.path !== 'string') fail('every surface requires id and path');
  if (seenIds.has(surface.id)) fail(`duplicate surface id ${surface.id}`);
  seenIds.add(surface.id);

  const absolute = path.resolve(root, surface.path);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(`unsafe source path ${surface.path}`);
  if (!Array.isArray(surface.requiredFragments) || surface.requiredFragments.length === 0) fail(`${surface.id} requires evidence fragments`);
  if (typeof surface.engine !== 'string' || typeof surface.scope !== 'string' || typeof surface.classification !== 'string') fail(`${surface.id} requires engine, scope and classification`);

  const source = fs.readFileSync(absolute, 'utf8');
  for (const fragment of surface.requiredFragments) {
    if (typeof fragment !== 'string' || fragment.length < 3) fail(`${surface.id} contains an invalid evidence fragment`);
    if (!source.includes(fragment)) fail(`${surface.path} no longer contains evidence for ${surface.id}: ${fragment}`);
  }

  if (surface.sensitive === true) sensitiveSurfaces += 1;
}

const requiredInvariants = [
  'credentialBearingSurfacesRemainExplicit',
  'legacyCredentialCopiesRemainExplicit',
  'notificationCredentialsRemainBlocked',
  'accountAndInstanceScopeRequiredBeforeMigration',
];
for (const invariant of requiredInvariants) {
  if (manifest.invariants?.[invariant] !== true) fail(`required invariant ${invariant} must remain true`);
}

for (const requiredId of ['auth-local-storage', 'legacy-auth-app', 'legacy-auth-user', 'native-notification-data']) {
  if (!seenIds.has(requiredId)) fail(`required credential-bearing surface ${requiredId} is missing`);
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: manifest.schemaVersion,
  status: manifest.status,
  checkedSurfaces: manifest.surfaces.length,
  sensitiveSurfaces,
  engines: [...new Set(manifest.surfaces.map(surface => surface.engine))].sort(),
  explicitUnknowns: manifest.explicitUnknowns.length,
}, null, 2)}\n`);
