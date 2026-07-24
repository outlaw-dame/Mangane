# Deployment Rewrite and Reserved Path Inventory

Status: **Current / bounded Phase 0 artifact complete**

Last updated: 2026-07-24

## Purpose

This document records the verified build-time basename, emitted asset path, development SPA fallback, backend-proxy behavior and production service-worker navigation exclusions that constrain Mangane routing. It closes the next bounded Phase 0 routing dependency after the route and navigation call-site inventories.

It is source-backed for the inspected repository-owned build, development and production configuration. It does not claim to enumerate external reverse proxies, container ingress, CDN rewrites or backend routes outside this repository.

## Directly inspected source boundary

| Source | Verified behavior | Confidence | Remaining unknowns |
|---|---|---|---|
| `app/soapbox/build_config.js` | sanitizes `BACKEND_URL`, `FE_SUBDIRECTORY`, build directory and instance source directory | High | deployment environment values are installation-specific |
| `webpack/shared.js` | emits bundles beneath `FE_SUBDIRECTORY`, writes `index.html` and `404.html`, and copies instance assets | High | external host/CDN behavior is not defined here |
| `webpack/development.js` | configures history fallback and explicit backend proxy prefixes | High | production web-server rules are outside this file |
| `webpack/production.js` | configures OfflinePlugin app-shell routing, cache scope and production navigation exclusions | High | generated worker behavior still requires built-artifact/browser verification |
| `app/soapbox/containers/soapbox.tsx` | mounts `BrowserRouter` with `BuildConfig.FE_SUBDIRECTORY` | High | request routing before the browser loads remains deployment-specific |
| route and navigation inventories | document canonical, compatibility and imperative frontend destinations | High | complete external edge ownership remains open |

## Build-time path contract

`build_config.js` reads `BACKEND_URL`, `FE_SUBDIRECTORY`, `FE_BUILD_DIR` and `FE_INSTANCE_SOURCE_DIR`.

| Variable | Current normalization | Consequence |
|---|---|---|
| `BACKEND_URL` | parsed with `new URL`; trailing slash removed; invalid values become empty | invalid configuration does not preserve raw input |
| `FE_SUBDIRECTORY` | surrounding slashes trimmed and one leading slash added | empty input becomes `/`; router, assets and worker shell must share this value |
| `FE_BUILD_DIR` | surrounding slashes removed; defaults to `static` | filesystem output location is distinct from browser routing |
| `FE_INSTANCE_SOURCE_DIR` | defaults to `instance` | instance assets are copied into emitted `instance` |

The basename normalizer does not reject dot segments, encoded separators, backslashes or control characters. Deployment validation must reject unsafe values before build execution.

## Emitted asset and HTML fallback contract

`webpack/shared.js` establishes:

- application entry `app/application.ts`;
- JavaScript under `packs/js` and CSS under `packs/css`;
- webpack `publicPath` equal to `join(FE_SUBDIRECTORY, '/')`;
- generated `index.html` and `404.html` from the same application template;
- copied emoji assets and instance customization assets.

Framework7 migration must preserve basename-consistent assets, direct deep links, static-host fallback behavior and service-worker scope. Existing assets and backend routes must be served before any SPA fallback.

## Verified development backend reservations

`webpack/development.js` proxies these prefixes or exact paths before SPA fallback:

| Path | Ownership |
|---|---|
| `/api` | backend; `/api/patron` has a dedicated `PATRON_URL` target |
| `/pleroma` | backend |
| `/nodeinfo` | backend |
| `/socket` | backend |
| `/oauth` | backend |
| `/.well-known/webfinger` | backend |
| `/static` | backend |
| `/main/ostatus` | backend |
| `/ostatus_subscribe` | backend |
| `/favicon.png` | backend |

The development server uses `historyApiFallback.disableDotRule: true` with fallback index `join(FE_SUBDIRECTORY, '/')`. Its permissive `Access-Control-Allow-Origin: *` response header is development behavior and must not be inferred as production policy.

## Verified production service-worker navigation exclusions

`webpack/production.js` configures OfflinePlugin with app shell `join(FE_SUBDIRECTORY, '/')` and a navigation `cacheMaps` matcher. Navigations whose pathname starts with any listed backend prefix bypass app-shell substitution and return the original URL:

| Production exclusion | Ownership/risk |
|---|---|
| `/.well-known` | federation and discovery; broader than the development WebFinger-only proxy |
| `/activities` | ActivityPub/backend object surface |
| `/admin` | backend-rendered administration basename; collides conceptually with frontend compatibility redirects |
| `/api` | backend APIs |
| `/auth` | backend authentication routes; frontend uses compatibility redirects under this basename |
| `/inbox` | federation inbox |
| `/instance` | backend/instance content; also related to emitted instance assets |
| `/internal` | backend internal routes |
| `/main/ostatus` | legacy backend route |
| `/manifest.json` | backend/static manifest ownership in the worker map |
| `/media` | backend media |
| `/nodeinfo` | discovery |
| `/oauth` | OAuth |
| `/objects` | backend objects |
| `/ostatus_subscribe` | legacy backend subscription |
| `/pghero` | backend operations surface |
| `/pleroma` | backend-specific routes |
| `/proxy` | backend proxy surface |
| `/relay` | federation relay |
| `/sidekiq` | backend operations surface |
| `/socket` | streaming/socket transport |
| `/static` | backend static content |
| `/unsubscribe` | backend unsubscribe flow |
| any pathname ending `/embed` | backend/embed handling |

This production list is materially broader than the development proxy list. Route conformance must therefore use the union of development, production-worker and externally verified edge reservations; one environment cannot be treated as authoritative for another.

## Production worker cache contract

The production configuration also verifies:

- cache name `soapbox`;
- service-worker entry `app/soapbox/service_worker/entry.ts`;
- automatic updates and event support;
- app shell beneath `FE_SUBDIRECTORY`;
- `404.html`, instance assets, source maps, reports, audio and other patterns excluded from precache;
- navigation exclusions applied only to request type `navigate`.

Generated worker output and browser behavior remain test obligations; source configuration is not proof that every host serves or scopes the worker correctly.

## Canonical rewrite precedence

Every supported deployment and worker strategy must:

1. reject malformed host/path inputs at the edge;
2. preserve the union of backend-owned API, OAuth, federation, discovery, socket, media, operations, embed and static paths;
3. serve existing emitted assets and instance files without SPA rewriting;
4. apply intentional compatibility redirects without overriding backend ownership;
5. serve the SPA only for allowlisted frontend navigation paths beneath `FE_SUBDIRECTORY`;
6. preserve real backend 401/403/404/5xx responses rather than masking them with HTML;
7. keep browser-router, webpack public path, service-worker scope and app-shell basename identical;
8. preserve query strings only according to destination policy.

## Collision and escape risks

- frontend routes under any reserved prefix may be unreachable or environment-dependent;
- `/auth` and `/admin` illustrate client-redirect versus backend/service-worker ownership collisions;
- development and production exclusion lists differ;
- a broad fallback can mask backend failures with a successful SPA shell;
- malformed subdirectories can double-prefix assets or escape the intended base;
- dot-rule behavior can differ by host;
- `404.html` semantics vary across static hosts;
- service-worker scope can drift from router basename and webpack public path;
- OAuth, WebFinger, ActivityPub inbox/object and embed routes must never be converted into the SPA document.

## Required deployment matrix

Test at minimum:

| Deployment | Required assertions |
|---|---|
| root-hosted static/PWA | deep links, refresh, assets, worker scope, app shell, backend exclusions and true backend errors |
| non-root `FE_SUBDIRECTORY` | no double prefix/escape, correct assets, direct links and worker shell scope |
| webpack development server | proxy precedence, dotted routes, fallback and backend errors |
| production generated service worker | every `cacheMaps` exclusion, `/embed`, cache upgrade and offline fallback |
| reverse proxy with separate backend | union of reserved paths, forwarded headers and non-masked failures |
| CDN/static host | `index.html`/`404.html`, cache keys, immutable assets and navigation fallback |
| rollback deployment | inherited router, assets and service worker remain reachable under the same basename |

Negative tests must include encoded traversal, backslashes, repeated slashes, protocol-relative inputs, oversized paths, dot segments, percent-encoded reserved prefixes, backend collisions and unknown API routes.

## Production evidence still required

The broader deployment gate remains open until verified evidence exists for:

- production Nginx/Apache/Caddy/container ingress rules;
- CDN or static-host rewrites;
- built service-worker registration scope and runtime cache-map behavior;
- OAuth callback, ActivityPub and federation discovery ownership at the edge;
- production security headers and CORS;
- precedence for existing files, backend routes, redirects and SPA fallback;
- rollback and health checks that distinguish SPA success from backend health.

## Phase status

The repository-owned build, development proxy, production OfflinePlugin navigation map, SPA fallback and verified reserved-path artifact is complete for the inspected boundary. External production edge configuration and built-runtime verification remain explicitly named blockers and may not be inferred from source configuration.