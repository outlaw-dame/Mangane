# Phase 0 Evidence Ledger and Completion Gates

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

This document is the operational control plane for Phase 0. It prevents partial inspection from being mistaken for completion and makes every finding traceable to evidence, risk, a required output, and a later implementation phase.

It complements:

- [`CURRENT_STATE.md`](./CURRENT_STATE.md), which summarizes verified current behavior;
- [`SOURCE_INVENTORY.md`](./SOURCE_INVENTORY.md), which records verified source architecture;
- [`SECURITY_RUNTIME_INVENTORY.md`](./SECURITY_RUNTIME_INVENTORY.md), which records HTTP, URL, push and share-target security boundaries;
- [`AUTH_PERSISTENCE_INVENTORY.md`](./AUTH_PERSISTENCE_INVENTORY.md), which records verified credential and browser-persistence behavior;
- [`IMPLEMENTATION_ROADMAP_V2.md`](./IMPLEMENTATION_ROADMAP_V2.md), which defines the canonical sequence.

## 1. Evidence standard

A Phase 0 claim must be classified as one of:

| Class | Meaning | Permitted use |
|---|---|---|
| Verified-current | Directly supported by repository source, configuration, tests, workflow, or reproducible runtime inspection | May drive Phase 1 design |
| Verified-absent | A complete scoped inventory demonstrates the behavior or subsystem is not present | May justify adding target capability |
| Accepted-target | Approved architecture, not current behavior | May guide future work but cannot be described as implemented |
| Historical | Earlier behavior or plan retained for context | Must not control implementation when it conflicts with canonical docs |
| Inferred | Strongly suggested but not directly proven | Must be labeled and verified before implementation depends on it |
| Unknown | Evidence is unavailable, incomplete, contradictory, or not yet inspected | Blocks dependent implementation |

Repository age, dependency presence, filenames, comments, and README claims are signals, not sufficient proof of runtime behavior by themselves.

## 2. Required evidence record

Every inventory entry must record:

1. subsystem and concern;
2. source path or reproducible command;
3. verified behavior;
4. account and instance scope;
5. persisted data or side effects;
6. failure and retry behavior;
7. security and privacy impact;
8. accessibility or interaction impact where applicable;
9. current owner;
10. target phase;
11. migration and rollback consequence;
12. confidence and remaining unknowns.

## 3. Phase 0 completion dashboard

| Workstream | Current evidence | Status | Completion gate | Blocks |
|---|---|---|---|---|
| Repository/build baseline | README, package manifest, webpack/bootstrap inspection | Partial | full tree, build variants, generated assets, environment behavior, reproducible command results | Phases 1, 3, 4 |
| Application bootstrap/providers | source-level entry and root-provider inspection | Substantial | error boundaries, initialization side effects, teardown, account switch, test coverage | Phases 1, 3 |
| Routing | root and main UI routing inspected | Partial | machine-readable route manifest, reserved path list, redirects, capability gates, auth/public ownership | Phase 3 |
| Redux | store, root reducer, logout whitelist, broad domain registry inspected | Partial | reducer/action/selector/persistence ownership matrix and duplication map | Phases 1, 7 |
| React Query | global client defaults inspected | Blocked | all keys, mutations, invalidations, account/instance scope, logout and switch behavior | Phases 1, 5, 7 |
| Authentication | app/user token creation, refresh path, verification, switching, revocation, reducer persistence and logout inspected | Partial-critical | complete OAuth call graph, callback paths, refresh validity, deletion coverage and cross-instance tests | Phases 1, 4, 5, 6 |
| API/protocol clients | central Axios client and auth-base selection inspected | Partial | all call sites, interceptors, pagination, retries, cancellation, typed errors, uploads, streaming | Phases 1, 6 |
| Persistence | localStorage auth, sessionStorage active account and IndexedDB account snapshots inspected | Partial-critical | all remaining stores/keys, migrations, purge, quotas, corruption handling and retention | Phases 4, 5, 6 |
| Service worker/PWA | OfflinePlugin, push worker and share-target worker inspected | Partial-critical | runtime caching, subscription lifecycle, credential removal, update rollback and scope conflicts | Phase 4 |
| Sanitization/content safety | push text conversion and share-target ingestion inspected | Blocked | all HTML sinks, sanitizer configuration, embeds, previews, custom pages and URL policy | Phases 1, 8, 9, 29 |
| Telemetry/error reporting | Sentry dependencies verified | Blocked | initialization, consent, payload schema, redaction, breadcrumbs, user/account identifiers, opt-out | Phases 4, 29 |
| Design/icons/styles | dependency-level overlap and theme/accessibility classes inspected | Partial | import/call-site inventory, generated theme contract, Sass/Tailwind ownership, active icon usage | Phase 2 |
| Tests/CI | package commands verified | Blocked | workflows, jobs, matrices, fixtures, browser coverage, flake behavior, baseline pass/fail | Every phase |
| Dependencies/licenses | manifest inspected | Partial | direct/transitive licenses, advisories, reachability, replacement/removal owner | Phases 0, 29, 31 |
| Documentation/history | canonical target docs identified | Partial | all old roadmaps and architecture docs classified and requirement-mapped | Every phase |
| Backend capability matrix | current feature-gating behavior verified conceptually | Blocked | endpoint and capability matrix for Akkoma, Pleroma, Mastodon-compatible servers | Phases 1, 8–11 |

No row marked **Blocked** may be silently treated as complete.

## 4. Security-critical inventories

### 4.1 Account and instance isolation

The inventory must follow one identity through:

- login and authorization callback;
- token creation and persistence;
- initial account loading;
- Redux records;
- React Query keys and cached values;
- localForage/IndexedDB/localStorage/sessionStorage;
- service-worker caches;
- native notification data;
- media/object URLs;
- push subscriptions;
- streaming connections;
- drafts and upload queues;
- logout;
- account switch;
- instance switch;
- browser reload and service-worker upgrade.

Required proof:

- an account A to account B transition cannot expose A data;
- an instance A to instance B transition cannot reuse incompatible capabilities or records;
- logout revokes or removes all locally controlled sensitive state;
- native notifications cannot retain usable credentials after logout;
- shared public data is explicitly classified rather than accidentally shared;
- stale asynchronous responses cannot repopulate a cleared account scope;
- persistent caches have versioned keys and purge rules.

### 4.2 Authentication material

Inventory:

- token types and scopes;
- storage location and serialization;
- redirect/callback validation;
- expiry and refresh behavior;
- revocation and logout behavior;
- multi-account records;
- error/log/telemetry exposure;
- URL and referrer exposure;
- service-worker and notification visibility;
- test fixtures containing secret-like material.

Any raw token in logs, telemetry, URLs, analytics, crash reports, query keys, native notification data or unencrypted exports is a release blocker.

### 4.3 Remote content and URL safety

Inventory every path that handles:

- remote HTML;
- profile fields;
- status content;
- custom pages;
- link previews;
- oEmbed or iframe content;
- SVG or remote images;
- redirect targets;
- instance URLs;
- proxy URLs;
- attachment filenames and MIME types;
- object URLs;
- clipboard/share-target data;
- push-supplied display fields and notification destinations.

For each sink, record sanitizer, allowed schemes, rel/referrer behavior, CSP interaction, sandboxing, size limits and test coverage.

## 5. State-authority matrix template

Every state domain must be entered in a completed version of this table:

| Domain | Canonical current owner | Secondary copies | Persistence | Account scope | Instance scope | Invalidation | Logout behavior | Target owner | Removal phase |
|---|---|---|---|---|---|---|---|---|---|
| Example: current account | Unknown until inventory | Redux/query/module cache TBD | TBD | Required | Required | TBD | Partially verified | Session/account repository | Phase 7 |

A domain may not have two undocumented canonical owners. Duplication used for migration must include:

- source of truth;
- direction of synchronization;
- conflict behavior;
- cutover criteria;
- rollback behavior;
- deletion date or phase.

## 6. React Query inventory template

For every query and mutation:

| Module | Operation | Key factory | Account scope | Instance scope | Input normalization | Cache lifetime | Invalidation | Retry/cancel | Redux overlap | Sensitive data | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|

Required conclusions:

- no sensitive key omits required account/instance identity;
- keys are generated by owned factories rather than ad hoc arrays;
- mutations identify optimistic update and rollback behavior;
- logout/account switch cancels in-flight work before purge;
- late responses cannot repopulate an inactive scope;
- infinite cache entries have an explicit lifecycle;
- duplication with Redux is intentional and temporary or removed.

## 7. API and capability inventory template

| Client/module | Backend family | Endpoint/transport | Auth | Pagination | Retry policy | Cancellation | Error mapping | Capability gate | Sensitive output | Consumers |
|---|---|---|---|---|---|---|---|---|---|---|

The final capability matrix must distinguish:

- standard Mastodon-compatible behavior;
- Akkoma-specific behavior;
- Pleroma-specific behavior;
- server-version-dependent behavior;
- extension/config-dependent behavior;
- unsupported or unverified behavior.

Capability cache entries must declare scope, lifetime, refresh trigger, stale behavior and invalidation on instance/account change.

## 8. Persistence and worker inventory template

| Store/cache/worker | Technology | Key/schema | Data classes | Scope | Writer | Readers | Migration | Purge | Quota/corruption | Offline behavior |
|---|---|---|---|---|---|---|---|---|---|---|

Required stores include every reachable use of:

- localForage;
- IndexedDB;
- localStorage;
- sessionStorage;
- Cache Storage;
- service-worker globals;
- native notification data;
- in-memory singleton caches;
- object URLs;
- WebSocket/streaming state;
- push subscription state;
- share-target payload storage.

## 9. Presentation and interaction inventory template

| Primitive/surface | Implementation | Styling owner | Icon source | Motion/gesture | Keyboard | Focus behavior | Reduced motion | Screen reader behavior | Target phase |
|---|---|---|---|---|---|---|---|---|---|

The final inventory must prevent loss of:

- reduced-motion preference;
- underlined-link preference;
- dyslexic-font preference;
- demetrication preference;
- generated instance themes;
- dark-mode behavior;
- keyboard shortcuts;
- deep-link and history behavior;
- non-gesture alternatives;
- visible focus and modal focus restoration.

## 10. Test and CI evidence

Phase 0 must record:

- every workflow and trigger;
- runtime and package-manager versions;
- caching and artifact behavior;
- jobs required for merge;
- lint, type, unit, integration, build, browser, accessibility and security coverage;
- environment secrets and permissions;
- fork/PR behavior;
- flaky or quarantined tests;
- baseline command outcomes on current `main`;
- gaps between package scripts and CI enforcement.

A package script existing does not prove CI runs it.

## 11. Documentation reconciliation ledger

Every architecture, roadmap, history, contribution, deployment, customization and subsystem document must be classified:

| Document | Classification | Still accurate | Conflicts | Requirements preserved in | Action |
|---|---|---|---|---|---|
| Root README | Current inherited deployment documentation | Partial | Product target and modernization status absent | Canonical architecture set | Update with current/target notice without erasing deployment instructions |
| `docs/history.md` | Historical | To inspect | Unknown | Requirement map TBD | Retain and classify |
| `docs/contributing.md` | Supporting/current candidate | To inspect | Unknown | Contribution governance TBD | Audit |
| `docs/customization.md` | Current contract candidate | To inspect | May conflict with new tokens | Phase 2 design/token migration | Audit and preserve compatibility requirements |
| Canonical `docs/architecture/*` | Accepted target/current evidence as labeled | Yes, subject to sync | Must not diverge from implementation | Roadmap v2 | Update in same PR as material changes |

No old document should be deleted until all still-valid requirements are mapped.

## 12. Previous-phase requirement mapping

The requirement map must contain one row for every earlier phase or significant conversation-derived decision:

| Prior requirement | Source | Canonical destination | Roadmap phase | Acceptance test | Status |
|---|---|---|---|---|---|
| Framework7 adaptive shell | Prior architecture work | Technical architecture/design system | Phase 3 | phone/tablet/desktop shell and route parity tests | Preserved |
| Phosphor semantic icon registry | Prior design decision | Design system | Phase 2 | no new raw icon imports | Preserved |
| ObjectBox/Weaviate/Meilisearch lessons | Search research | Search and intelligence architecture | Phases 12–17 | lexical/semantic/fusion evaluation | Preserved |
| Gist cards | Product/search research | Search and design architecture | Phase 21 | grounded synthesis and source attribution tests | Preserved |
| Composer context | Product requirement | Search/intelligence architecture | Phase 24 | context and sentiment assistance with user control | Preserved |
| AI interpolator | Product requirement | Search/intelligence architecture | Phase 25 | transparent interpolation with provenance and safety tests | Preserved |

This table must be expanded from all discoverable historical roadmaps and documents before Phase 0 exits.

## 13. Exit checklist

Phase 0 may be marked complete only when all items are checked:

- [ ] Complete repository tree inventory committed.
- [ ] Feature and route/capability manifests committed.
- [ ] Redux authority and duplication matrix committed.
- [ ] React Query key/mutation/invalidation matrix committed.
- [ ] Authentication and account-switch lifecycle committed.
- [ ] API, retry, streaming, upload and feature-detection inventory committed.
- [ ] Persistence, cache, service-worker, push and share-target inventory committed.
- [ ] Sanitization, URL, redirect, preview, embed and upload safety inventory committed.
- [ ] Sentry/telemetry consent and redaction inventory committed.
- [ ] Icon, component, style, motion, keyboard and accessibility inventory committed.
- [ ] Tests and CI workflow inventory with baseline outcomes committed.
- [ ] Dependency health, advisory, reachability and license inventory committed.
- [ ] Historical documents classified and prior requirements mapped.
- [ ] Every major subsystem has a current owner, target owner, status and target phase.
- [ ] All unknowns have either been resolved or named as explicit blockers accepted by the project owner.
- [ ] PR description and canonical documents match the evidence.

Until every item is satisfied, Phase 0 remains in progress.
