# Phase 4B PWA Installability and Deployment Closure

Status: **Complete**

Last updated: 2026-07-30

## Outcome

Phase 4B closes the installability and deployment gaps discovered after Phase
4 without reopening Phase 4's completed cache, update, Safari, and degraded
shell contracts.

Mangane now owns a bounded production PWA contract for root and subdirectory
deployments:

- the web manifest uses deployment-relative identity, scope, start, icon, and
  share-target URLs;
- 192 x 192 and 512 x 512 PNG icons are bundled with the frontend instead of
  depending on unverified backend-root favicon files;
- the 512 x 512 icon has a full-bleed background, keeps the Mangane glyph in the
  maskable safe zone, and declares `purpose: "any maskable"`;
- HTML manifest and icon links use the sanitized `FE_SUBDIRECTORY` build value;
- service-worker navigation exclusions derive the active deployment prefix
  from `self.registration.scope`;
- share-target interception and composer redirects derive the same worker
  scope;
- browser installation is invoked only after an explicit user action;
- iOS receives dismissible Add to Home Screen guidance;
- dismissal is origin and frontend-subdirectory scoped, contains no account
  identity, and tolerates denied browser storage;
- source, production output, and real Chromium offline behavior have
  fail-closed CI gates.

## Security and privacy boundaries

The service worker continues to cache public application-shell and build
assets. Phase 4B does not authorize authenticated API response caching.

Backend navigation matching compares exact path segments after removing only
the active worker scope. A prefix such as `/apiary` is not classified as
`/api`, while `/Mangane/api` is correctly excluded for a worker scoped to
`/Mangane/`.

The share target accepts only its exact same-origin, deployment-scoped path.
Accepted fields retain the Phase 0G size and content-type bounds and remain
inert composer text.

The install component:

- never synthesizes or repeatedly invokes a browser prompt;
- calls `prompt()` only from the Install button handler;
- consumes each captured prompt once;
- persists only a boolean dismissal marker;
- reports a generic local error without logging platform or account data.

Credential persistence and push-notification bearer-token remediation remain
owned by Phase 27. This slice does not misrepresent installability as final
production-security approval.

## Service-worker implementation decision

Mangane retains `@lcdp/offline-plugin` for Phase 4B.

The installed, lockfile-pinned implementation is 5.1.7 and provides the
existing generated asset manifest, application-shell precache, cache maps,
explicit update-ready callback, user-controlled activation, and previous-worker
rollback behavior. Replacing it inside an installability closure would combine
deployment-path changes with a new cache engine and make rollback evidence
weaker.

Retention is conditional, not permanent:

1. the dependency remains pinned by the existing dependency authority;
2. generated worker behavior remains covered by production build and browser
   tests;
3. cache ownership remains public-static-only;
4. update activation remains user controlled;
5. a future maintenance, browser-compatibility, CSP, or deterministic cleanup
   failure triggers a separate migration ADR and equivalence suite.

A Workbox or custom-worker migration must prove root and subdirectory parity,
offline navigation, backend exclusion, push and share handlers, account purge,
old-cache cleanup, update activation, and rollback before replacing the current
worker.

## Automated evidence

Source and adversarial validation:

```sh
yarn check:pwa-installability
yarn test:pwa-installability
yarn test:worker
```

Production subdirectory build validation:

```sh
NODE_ENV=production FE_SUBDIRECTORY=Mangane yarn build
PWA_BUILD_OUTPUT_ROOT=static/Mangane PWA_BASE_PATH=/Mangane \
  yarn check:pwa-installability
```

Browser validation:

```sh
yarn test:pwa-browser
```

The browser gate verifies:

- manifest response and content type;
- relative identity, scope, launch, and share target;
- fetchable declared icons;
- active service-worker control;
- offline navigation reload under `/Mangane/`;
- fail-closed offline API behavior rather than app-shell HTML substitution.

## Closure evidence

- Implementation pull request:
  [`#83`](https://github.com/outlaw-dame/Mangane/pull/83)
- Reviewed head:
  `a3991957137b0568cd9423b4d4603afbde8de5a2`
- Merge commit:
  `8ac96e7ed55d7e24ed2bc142d4b34a3093a4f0bc`
- Final-head result: all 23 reported pull-request checks passed.
- Review audit: both actionable review threads were addressed with regression
  coverage and explicitly resolved before merge.

## Exit criteria

- [x] Required install icons are repository-owned and exact-size.
- [x] Manifest and HTML installation metadata support root and subdirectories.
- [x] Service-worker backend exclusions are deployment-scope aware.
- [x] Share-target routes and redirects are deployment-scope aware.
- [x] Installation discovery is user-controlled, dismissible, and accessible.
- [x] Source and build validators fail closed on drift.
- [x] A dedicated production PWA browser workflow is defined with read-only
      permissions, immutable script-free dependency installation, bounded
      runtime, no automatic retries, and a real offline navigation assertion.
- [x] Pull-request CI is green.
- [x] Actionable review threads are resolved.
- [x] The pull request is merged and the canonical roadmap head is reconciled.
