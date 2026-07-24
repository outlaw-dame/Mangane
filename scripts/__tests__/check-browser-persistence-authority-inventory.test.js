'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const script = path.join(repositoryRoot, 'scripts', 'check-browser-persistence-authority-inventory.js');
const run = (root = repositoryRoot) => execFileSync(process.execPath, [script], {
  cwd: root,
  env: { ...process.env, BROWSER_PERSISTENCE_INVENTORY_ROOT: root },
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-persistence-authority-'));
  for (const relativePath of [
    'config/browser-persistence-authority-inventory.json',
    'app/soapbox/reducers/auth.js',
    'app/soapbox/storage/kv_store.ts',
    'app/soapbox/service_worker/web_push_notifications.ts',
  ]) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relativePath), destination);
  }
  return root;
};

const mutate = (root, relativePath, transform) => {
  const target = path.join(root, relativePath);
  fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8')));
};

describe('browser persistence authority inventory drift gate', () => {
  it('verifies the bounded current persistence inventory', () => {
    expect(JSON.parse(run())).toMatchObject({
      checkedSurfaces: 7,
      sensitiveSurfaces: 7,
      explicitUnknowns: 4,
    });
  });

  it('fails when credential persistence drifts without reconciliation', () => {
    const root = fixture();
    mutate(root, 'app/soapbox/reducers/auth.js', source => source.replace('localStorage.setItem(STORAGE_KEY, JSON.stringify(state.toJS()))', 'void state'));
    expect(() => run(root)).toThrow(/auth-local-storage/);
  });

  it('fails when a legacy credential copy is silently removed from the inventory', () => {
    const root = fixture();
    const manifestPath = 'config/browser-persistence-authority-inventory.json';
    mutate(root, manifestPath, source => {
      const manifest = JSON.parse(source);
      manifest.surfaces = manifest.surfaces.filter(surface => surface.id !== 'legacy-auth-user');
      return `${JSON.stringify(manifest, null, 2)}\n`;
    });
    expect(() => run(root)).toThrow(/required credential-bearing surface legacy-auth-user/);
  });

  it('fails when notification action credentials drift without review', () => {
    const root = fixture();
    mutate(root, 'app/soapbox/service_worker/web_push_notifications.ts', source => source.replace('data.access_token).then', "'redacted').then"));
    expect(() => run(root)).toThrow(/native-notification-data/);
  });

  it('rejects source paths escaping the repository root', () => {
    const root = fixture();
    const manifestPath = 'config/browser-persistence-authority-inventory.json';
    mutate(root, manifestPath, source => {
      const manifest = JSON.parse(source);
      manifest.surfaces[0].path = '../outside.js';
      return `${JSON.stringify(manifest, null, 2)}\n`;
    });
    expect(() => run(root)).toThrow(/unsafe source path/);
  });
});
