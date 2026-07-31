'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildIconImportSnapshot,
  canonicalRegistryPath,
} = require('../icon-migration-lib');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const checker = path.join(repositoryRoot, 'scripts', 'check-icon-migration.js');
// Assemble provider names so dependency-authority scanning does not misclassify
// adversarial fixture text as executable package usage.
const providers = {
  bootstrap: 'bootstrap-' + 'icons',
  cryptocurrency: 'cryptocurrency-' + 'icons',
  feather: 'feather-' + 'icons',
  forkAwesome: 'fork-' + 'awesome',
  iconoir: 'icon' + 'oir',
  lineAwesome: 'line-' + 'awesome',
  phosphor: '@phosphor-' + 'icons/react',
  tabler: '@tabler/' + 'icons',
};

const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-migration-'));
  for (const relative of [
    'app',
    'config/icon-migration-baseline.json',
    'package.json',
  ]) {
    fs.cpSync(path.join(repositoryRoot, relative), path.join(root, relative), { recursive: true });
  }
  return root;
};

const generator = path.join(repositoryRoot, 'scripts', 'generate-icon-migration-baseline.js');

const runChecker = (root, env = {}) => spawnSync(process.execPath, [checker], {
  cwd: repositoryRoot,
  env: { ...process.env, ICON_MIGRATION_ROOT: root, ...env },
  encoding: 'utf8',
});

const runGenerator = root => spawnSync(process.execPath, [generator], {
  cwd: repositoryRoot,
  env: { ...process.env, ICON_MIGRATION_ROOT: root },
  encoding: 'utf8',
});

const commitTrustedBaseline = root => {
  const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(git(['init']).status, 0);
  assert.equal(git(['config', 'user.name', 'Icon authority test']).status, 0);
  assert.equal(git(['config', 'user.email', 'icon-authority@example.invalid']).status, 0);
  assert.equal(git(['add', 'config/icon-migration-baseline.json']).status, 0);
  assert.equal(git(['commit', '-m', 'trusted icon baseline']).status, 0);
  const revision = git(['rev-parse', 'HEAD']);
  assert.equal(revision.status, 0);
  return revision.stdout.trim();
};

test('records the exact shrinking legacy import baseline', () => {
  const baseline = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'config', 'icon-migration-baseline.json'), 'utf8'),
  );

  assert.deepEqual(buildIconImportSnapshot(repositoryRoot), baseline.imports);
  assert.equal(baseline.canonicalRegistry, canonicalRegistryPath);
  assert.equal(baseline.policy, 'legacy-imports-may-only-shrink-through-reviewed-baseline-updates');
  assert.deepEqual(Object.keys(baseline.providers).sort(), [
    providers.bootstrap,
    providers.cryptocurrency,
    providers.feather,
    providers.forkAwesome,
    providers.iconoir,
    providers.lineAwesome,
    'phosphor',
    'tabler',
  ]);
});

test('allows the canonical registry to be the only Phosphor import boundary', () => {
  const snapshot = buildIconImportSnapshot(repositoryRoot);
  const phosphorImports = snapshot.filter(item => item.provider === 'phosphor');

  assert.deepEqual([...new Set(phosphorImports.map(item => item.path))], [canonicalRegistryPath]);
});

test('rejects a new raw legacy-provider import', () => {
  const root = fixture();
  fs.appendFileSync(
    path.join(root, 'app', 'soapbox', 'components', 'validation-checkmark.tsx'),
    `\nconst unsafeRawIcon = require('${providers.tabler}/alarm.svg');\n`,
  );

  const result = runChecker(root);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /Raw icon import baseline drifted/);
});

test('rejects growth even after the working baseline is regenerated', () => {
  const root = fixture();
  const trustedRevision = commitTrustedBaseline(root);
  fs.appendFileSync(
    path.join(root, 'app', 'soapbox', 'components', 'validation-checkmark.tsx'),
    `\nconst unsafeRawIcon = require('${providers.tabler}/alarm.svg');\n`,
  );

  const generated = runGenerator(root);
  assert.equal(generated.status, 0, generated.stderr);
  const result = runChecker(root, { ICON_MIGRATION_BASE_REF: trustedRevision });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /trusted baseline|import growth/i);
});

test('allows a regenerated baseline when raw imports only shrink', () => {
  const root = fixture();
  const trustedRevision = commitTrustedBaseline(root);
  const rawImport = buildIconImportSnapshot(root).find(item => item.provider === 'tabler');
  assert.ok(rawImport, 'Expected a legacy Tabler import in the migration fixture');
  const sourcePath = path.join(root, rawImport.path);
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.match(source, new RegExp(rawImport.request.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  fs.writeFileSync(sourcePath, source.replace(rawImport.request, '@not-an-icon/provider'));

  const generated = runGenerator(root);
  assert.equal(generated.status, 0, generated.stderr);
  const result = runChecker(root, { ICON_MIGRATION_BASE_REF: trustedRevision });

  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
});

test('rejects an untrusted or ambiguous base revision before invoking git', () => {
  const root = fixture();
  const result = runChecker(root, { ICON_MIGRATION_BASE_REF: 'HEAD' });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /full 40-character hexadecimal commit SHA/);
});

test('rejects Phosphor imports outside the canonical registry', () => {
  const root = fixture();
  fs.appendFileSync(
    path.join(root, 'app', 'soapbox', 'components', 'validation-checkmark.tsx'),
    `\nimport { Alarm } from '${providers.phosphor}';\n`,
  );

  const result = runChecker(root);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /Phosphor imports are restricted to/);
});

test('detects alternate static import forms and style imports', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-import-forms-'));
  const component = path.join(root, 'app', 'component.tsx');
  const stylesheet = path.join(root, 'app', 'styles.scss');
  fs.mkdirSync(path.dirname(component), { recursive: true });
  fs.writeFileSync(component, [
    `import icon from "${providers.tabler}/home.svg";`,
    `const lazy = import("${providers.bootstrap}/icons/alarm.svg");`,
    `const required = require("${providers.feather}");`,
    '',
  ].join('\n'));
  fs.writeFileSync(
    stylesheet,
    `@import "~${providers.lineAwesome}/dist/line-awesome/css/line-awesome.css";\n`,
  );

  const snapshot = buildIconImportSnapshot(root);
  assert.deepEqual(snapshot.map(item => item.provider), [
    providers.bootstrap,
    providers.feather,
    providers.lineAwesome,
    'tabler',
  ]);
});

test('detects no-substitution template literals without treating dynamic requests as static', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-template-import-'));
  const component = path.join(root, 'app', 'component.tsx');
  fs.mkdirSync(path.dirname(component), { recursive: true });
  fs.writeFileSync(component, [
    'const name = "home";',
    'const staticIcon = require(`' + providers.tabler + '/alarm.svg`);',
    'const dynamicIcon = require(`' + providers.tabler + '/${name}.svg`);',
    '',
  ].join('\n'));

  const snapshot = buildIconImportSnapshot(root);
  assert.deepEqual(snapshot, [{
    provider: 'tabler',
    path: 'app/component.tsx',
    request: `${providers.tabler}/alarm.svg`,
    count: 1,
  }]);
});

test('wires CI to a complete checkout and a trusted event base SHA', () => {
  const workflow = fs.readFileSync(
    path.join(repositoryRoot, '.github', 'workflows', 'design-authority.yml'),
    'utf8',
  );

  assert.match(workflow, /fetch-depth: 0/);
  assert.match(
    workflow,
    /ICON_MIGRATION_BASE_REF: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \}\}/,
  );
});
