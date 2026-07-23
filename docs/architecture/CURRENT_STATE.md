# Mangane Verified Current State

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

This document records verified repository behavior and known unknowns before modernization begins. It is intentionally distinct from accepted-target architecture. A claim belongs here only when supported by the current repository or a reproducible inspection.

Operational completion tracking, evidence standards, inventory templates, and exit gates live in [`PHASE_0_EVIDENCE_AND_GATES.md`](./PHASE_0_EVIDENCE_AND_GATES.md). That ledger is authoritative for whether Phase 0 is complete.

## 1. Repository baseline

Verified from `README.md`, `package.json`, and the merged canonical architecture documents:

- Mangane is currently an inherited browser-only single-page frontend for Akkoma/Pleroma with broad Mastodon API compatibility.
- The current release metadata is `mangane-fe` version `1.22.2`.
- The application is built with webpack 5 and uses Yarn 4 metadata.
- The current frontend uses React 17, React Router 5, Redux 4, Redux Toolkit 1.8, React Query 4, Immutable.js, Sass, and Tailwind CSS 3.
- The application currently relies on XMLHttpRequest/HTTP APIs provided by the selected backend and performs backend feature detection.
- Local development is documented through `yarn dev`; production output is documented as the `static` directory.
- The existing supported deployment target is primarily Akkoma/Pleroma. Mastodon deployment is documented as not explicitly supported.

These facts describe current code and must not be confused with the Framework7/local-first accepted target.

## 2. Verified dependency-era risks

The package manifest contains a large legacy surface, including:

- React 17 and React Router 5;
- Redux plus Redux Toolkit plus Immutable.js;
- both modern and old overlay/menu/popover systems;
- React Motion and swipeable-view packages;
- the unmaintained `@lcdp/offline-plugin` lineage;
- Axios `1.0.0-alpha.1`;
- multiple emoji packages and data sets;
- multiple icon systems: Tabler, Bootstrap Icons, Feather, Line Awesome, and cryptocurrency icons;
- old compatibility/polyfill packages;
- Jest 28, ESLint 7, Stylelint 13, and TypeScript 4.4;
- Webpack-specific build and asset behavior.

No package may be upgraded or removed solely because it is old. Each change requires call-site inventory, behavior tests, migration, and rollback. Nevertheless, this dependency mix is a verified modernization and supply-chain risk.

## 3. Current build and quality commands

Verified scripts:

- `yarn dev` / `yarn start` — webpack development server;
- `yarn build` — webpack production build;
- `yarn test` — Jest;
- `yarn test:coverage` — Jest coverage;
- `yarn test:all` — coverage plus lint;
- `yarn lint` — JavaScript/TypeScript and Sass lint;
- `yarn manage:translations` — translation normalization;
- `yarn jsdoc` — JSDoc generation.

Phase 0 must still verify what CI actually invokes, whether these commands pass on current `main`, and whether they cover production build, browser integration, accessibility, account isolation, and service-worker behavior.

## 4. Current presentation and styling signals

Verified dependency-level signals show that current presentation is not governed by one coherent design system:

- Tailwind CSS and Sass coexist;
- several icon libraries coexist;
- React Motion and swipeable-view dependencies provide legacy motion/gesture behavior;
- Reach UI menu, popover, portal, tabs, tooltip, and rectangle helpers coexist with other overlay packages;
- Framework7 and Phosphor are not yet part of the current package manifest.

The accepted target therefore requires an incremental compatibility layer. Existing styling, motion, and icons cannot be removed before each active call site is mapped.

## 5. Current state-management signals

Verified dependencies indicate the current application contains at least these state mechanisms:

- Redux;
- Redux Toolkit;
- Redux Thunk;
- Redux Immutable;
- Reselect;
- React Query;
- localForage;
- component-local React state.

The exact ownership boundary of server state, session state, normalized entities, UI state, drafts, persistence, and caches remains **unverified** until source-level inventory is complete.

No new architecture implementation may assume that React Query or Redux already owns a particular category of state.

## 6. Current offline and persistence signals

Verified:

- `@lcdp/offline-plugin` is installed;
- `localforage` is installed;
- `fake-indexeddb` is available in development dependencies;
- the README describes a conventional SPA deployment but does not define the privacy, account isolation, cache invalidation, update, or rollback guarantees required by the target architecture.

Unverified:

- service-worker registration path;
- cache names and keying;
- whether authenticated API responses are cached;
- account-switch/logout purge behavior;
- update activation policy;
- localForage stores and schemas;
- offline mutation behavior;
- background synchronization behavior;
- cross-account and cross-instance isolation.

These unknowns are security-relevant and block Phase 4 implementation until resolved.

## 7. Backend compatibility baseline

Verified from current documentation:

- Akkoma and Pleroma are primary targets;
- Mangane uses Mastodon-compatible APIs where available;
- backend feature detection already exists conceptually;
- Akkoma-specific functionality may be exposed without intentionally breaking compatible backends.

Unverified:

- the actual capability-detection model and caching;
- endpoint-by-endpoint compatibility;
- error normalization;
- pagination and retry behavior;
- authentication/session refresh behavior;
- upload and media edge cases;
- streaming/websocket behavior;
- server-version assumptions;
- existence leaks and authorization-sensitive responses.

Phase 1 cannot define a correct protocol contract until this inventory is complete.

## 8. Initial risk register

### Critical investigation areas

1. **Account isolation** — Redux, React Query, localForage, offline caches, media caches, and service-worker state must be checked for account and instance scoping.
2. **Authentication material** — tokens, session data, logs, error reporting, persistence, and URL handling require inspection.
3. **HTML/content sanitization** — every path that renders remote post HTML, profile fields, custom pages, previews, or embeds requires verification.
4. **URL safety** — instance URLs, media URLs, redirects, external links, proxy configuration, and custom-page links require normalization and allow/deny rules.
5. **Offline cache privacy** — private or authenticated responses must not leak across logout, account switch, instance switch, browser profiles, or cache upgrades.
6. **Legacy dependency exposure** — old overlay, networking, offline, parsing, and polyfill packages require advisory and reachability review.
7. **Error reporting** — Sentry dependencies exist; initialization, default enablement, redaction, consent, and payload boundaries are unverified.
8. **Feature detection** — stale capability data must not enable unsupported endpoints or preserve privileges after account/instance changes.
9. **Upload processing** — file type, size, metadata, preview, object URL, cancellation, and retry behavior require inspection.
10. **State duplication** — Redux, React Query, Immutable.js, localForage, and component state may represent the same records with inconsistent invalidation.

### High modernization risks

- React Router 5 migration and deep-link preservation;
- React 17 compatibility with Framework7 React and eventual React upgrade;
- webpack/offline-plugin coupling;
- multiple icon and styling systems;
- inaccessible custom controls and gesture-only behavior;
- tests that may validate implementation details rather than user behavior;
- undocumented instance customization contracts;
- build-time assumptions tied to the inherited deployment model.

## 9. Documentation reconciliation status

Canonical target documents now exist under `docs/architecture/` and are linked by root `ARCHITECTURE.md`.

Still required during Phase 0:

- enumerate every older roadmap, architecture note, Redux map, history file, and implementation document;
- mark each as current, supporting, historical, superseded, or contradictory;
- preserve useful requirements by mapping them to Roadmap v2;
- update the root README so readers do not mistake inherited current behavior for the accepted target;
- avoid deleting historical context before its requirements are mapped.

## 10. Evidence limitations

The authenticated connector currently exposes file reads and pull-request metadata, but repository code search returned no indexed results and the execution runtime could not clone GitHub because outbound DNS resolution for `github.com` was unavailable.

Therefore this Phase 0 branch records only facts directly verified from accessible repository files. The limitation does not reduce the completion standard and must not be converted into assumptions that uninspected behavior is safe or absent.

This is not Phase 0 completion. The following remain mandatory before exit:

- full source tree inventory;
- route and screen inventory;
- Redux slice/reducer/action inventory;
- React Query key and cache inventory;
- API/client/streaming inventory;
- persistence and service-worker inventory;
- sanitization and URL-flow inventory;
- icon/style/component inventory;
- test and CI workflow inventory;
- dependency license/advisory inventory;
- previous-roadmap requirement mapping;
- subsystem owner/status table.

## 11. Phase 0 completion rule

Phase 0 may be marked complete only when every major subsystem is classified as:

- current and retained;
- current but wrapped;
- current and migrating;
- deprecated with removal phase;
- experimental;
- absent but targeted;
- unknown with a named investigation blocker.

Unknowns may not silently become assumptions in Phase 1 or later work.
