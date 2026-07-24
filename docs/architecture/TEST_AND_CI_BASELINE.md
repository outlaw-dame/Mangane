# Test and CI Baseline

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document records the verified test-command baseline and the currently unresolved continuous-integration surface. It prevents package scripts from being mistaken for enforced CI coverage.

## Verified package scripts

From `package.json`:

| Script | Command | Verified purpose |
|---|---|---|
| `test` | `npx cross-env NODE_ENV=test npx jest` | runs Jest in the test environment |
| `test:coverage` | `${npm_execpath} run test --coverage` | runs Jest coverage through the package manager |
| `test:all` | `${npm_execpath} run test:coverage && ${npm_execpath} run lint` | runs coverage followed by lint |
| `lint` | `${npm_execpath} run lint:js && ${npm_execpath} run lint:sass` | runs JavaScript/TypeScript and Sass linting |
| `lint:js` | `npx eslint --ext .js,.jsx,.ts,.tsx . --cache` | lints JavaScript and TypeScript source files |
| `lint:sass` | `npx stylelint app/styles/**/*.scss` | lints application Sass files |
| `build` | `npx webpack` | produces the webpack build |

## Verified Jest configuration

The inspected Jest configuration establishes a jsdom test environment, setup files, coverage configuration, and exclusions. The service-worker entry is excluded from coverage, so package-level coverage cannot be treated as proof that push, notification, share-target, cache, update, or worker lifecycle behavior is tested.

## CI evidence

- PRs #9 and #10 had no pull-request workflow runs attached to their inspected head commits.
- `.github/workflows/ci.yml` was not present at the inspected path.
- Indexed repository searches for the common GitHub Actions markers `actions/checkout` and `workflow_dispatch` returned no matches.
- These observations do not prove that the repository has no CI: alternate or unindexed workflow content, external CI, disabled workflows, branch-only workflows, and repository settings remain possible.

## Current gaps

The following remain unverified:

- complete workflow-file inventory and triggers;
- runtime and package-manager versions used by CI;
- dependency installation mode and lockfile enforcement;
- lint, type-check, unit, integration, browser, accessibility, worker, build, and security jobs;
- required-check and branch-protection configuration;
- workflow permissions, secrets, caches, artifacts, and fork behavior;
- timeout, cancellation, concurrency, retry, and flake handling;
- reproducible baseline command outcomes on the current repository state;
- source-map, bundle, fixture, snapshot, coverage, and artifact secret scanning.

## Required Phase 0 matrix

| Workflow/job | Trigger | Runtime | Install mode | Commands | Required | Permissions | Secrets | Cache/artifacts | Timeout/concurrency | Baseline result |
|---|---|---|---|---|---|---|---|---|---|---|
| No verified repository workflow discovered through the inspected paths and indexed searches | Unknown | Unknown | Unknown | Package scripts exist but enforcement is unverified | No verified required check | Unknown | Unknown | Unknown | Unknown | No PR workflow runs observed for PRs #9 and #10 |

Missing coverage must remain explicit rather than being inferred from package scripts.

## Minimum target gate

Before Phase 1 implementation is treated as protected, CI must at minimum enforce:

1. deterministic dependency installation from the committed lockfile;
2. JavaScript/TypeScript linting;
3. Sass/style linting;
4. TypeScript checking where not already guaranteed by the build;
5. unit tests and coverage reporting;
6. production build generation;
7. direct service-worker and browser integration tests for security-sensitive PWA behavior;
8. accessibility checks for critical navigation and interaction paths;
9. secret scanning across source, fixtures, snapshots, logs, bundles, source maps, and artifacts;
10. least-privilege workflow permissions, bounded execution, cancellation of stale runs, and explicit artifact retention.

## Disposition

This document completes the bounded Phase 0 baseline artifact. It does not claim that CI exists, passes, or protects the branch. Until direct workflow and repository-setting evidence is available, later work must treat CI enforcement as unverified and must not cite package scripts as proof of automated protection.

The broader Phase 0 CI gate remains open until every workflow, trigger, job, runtime, permission, secret, cache, artifact, required check, and reproducible baseline outcome is directly enumerated or a new canonical CI implementation is added and verified.
