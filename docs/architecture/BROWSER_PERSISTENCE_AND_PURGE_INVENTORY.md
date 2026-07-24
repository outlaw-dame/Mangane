# Browser Persistence and Deterministic Purge Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document establishes the canonical Phase 0 evidence model for every browser-resident copy of account, instance, content, credential, notification, upload, cache, mutation, and derived-intelligence state. Its primary goal is to make logout, account removal, instance switching, privacy reset, migration, and recovery deterministic rather than best-effort.

This is an inventory and contract baseline. It records the persistence surfaces and concrete keys verified by the current Phase 0 source review, but it does not claim that every repository persistence call site has already been enumerated.

## Initial verified persistence surfaces

| Surface | Verified current role | Scope currently evidenced | Sensitive contents | Current invalidation evidence | Risk/status |
|---|---|---|---|---|---|
| Redux authentication graph persisted to `localStorage` | durable authentication and multi-account state | user/account URLs and active authentication graph | access tokens, refresh tokens, application credentials, account/session metadata | auth reducer removes selected records during logout, but root logout preserves the auth domain | **Blocked** — plaintext credential persistence and purge completeness require full call-site verification |
| `sessionStorage` selected-account identity | preserves current account selection for the tab/session | active account identity | account identifier and cross-instance selection state | no complete account-removal or stale-tab invalidation contract verified | **Partial** |
| localForage / IndexedDB account snapshots | restores account entities through `authAccount:<accountUrl>` keys | account URL | profile/account metadata and instance-specific extensions | `rememberAuthAccount` reads snapshots; logout does not visibly remove them | **Partial** |
| localForage / IndexedDB instance snapshots | restores instance metadata through `instance:<host>` keys | instance host | capabilities, policy, limits, branding and registration state | storage restore races or runs concurrently with network refresh; schema/version invalidation not verified | **Partial** |
| React Query singleton cache | in-memory remote-data cache with infinite cache lifetime | currently global unless each key encodes account and instance | potentially private account, relationship, notification, moderation, search and timeline data | no verified global purge/recreation on logout or account switch | **Blocked** |
| Redux entity and feature domains | active application state and normalized projections | mixed: deployment, instance, account, route and transient UI | private entities and moderation state may be present | root logout rebuilds most domains but preserves `instance`, `soapbox`, `custom_emojis` and `auth` | **Partial** |
| Service-worker application/runtime caches | offline/static resource availability and inherited production caching | deployment/origin | application assets; runtime content remains unenumerated | cache-name ownership exists, but account/private response caching and purge behavior are not fully inventoried | **Unknown** |
| Native notification data | supports notification navigation and action handling outside page lifetime | notification, account and instance are not explicitly bound | bearer token, status/account identifiers, URLs, hidden content and images | no verified logout/account-removal closure and credential purge path | **Blocked** |
| Browser native notifications | persisted operating-system/browser UI state | potentially multiple accounts and instances | titles, bodies, avatars, media previews, URLs and hidden content | grouping and closure are not verified as account-scoped | **Blocked** |
| Share-target redirect/query state | transfers external shared text into the composer | deployment route/tab | external text and URLs | transient redirect only; size, exact routing and cleanup behavior remain unresolved | **Partial** |

## Verified key and call-site registry

The following entries are verified from the current source-backed Phase 0 inventories. This registry is intentionally explicit about what is known and what remains unproven.

| Owner / source | API or storage engine | Verified key, store or field shape | Authority classification | Scope | Verified lifecycle and purge gap |
|---|---|---|---|---|---|
| `app/soapbox/reducers/auth.js` | `localStorage` | `soapbox:auth` or `soapbox@<FE_SUBDIRECTORY>:auth` | durable credential-bearing application state | deployment plus multiple accounts/instances inside one serialized graph | rewritten after auth state changes; no encryption, schema version, integrity envelope or complete privacy-purge proof |
| `app/soapbox/reducers/auth.js` | `sessionStorage` | corresponding `...:auth:me` | selected-account marker, not credential authority | tab/session plus selected account | stale-tab invalidation and account-removal synchronization are not verified |
| legacy auth migration in `app/soapbox/reducers/auth.js` | `localStorage` | `soapbox:auth:app` | deprecated duplicate credential copy | deployment/application credential | read during migration and intentionally left in place; current logout does not prove deletion |
| legacy auth migration in `app/soapbox/reducers/auth.js` | `localStorage` | `soapbox:auth:user` | deprecated duplicate user credential copy | deployment/user credential | read during migration and intentionally left in place; current logout does not prove deletion |
| `app/soapbox/storage/kv_store.ts` | localForage backed by IndexedDB | database `soapbox`, store `keyvaluepairs` | generic persisted key/value cache and snapshot store | origin-wide unless encoded in each key | no verified schema registry, retention policy, corruption repair, quota handling or deterministic store purge |
| authentication account snapshot path | localForage / IndexedDB | `authAccount:<account URL>` | persisted account snapshot/cache | account URL, with instance implied by URL | may retain private settings or extensions; no inspected logout deletion path |
| instance restore path | localForage / IndexedDB | `instance:<host>` | persisted instance capability/metadata snapshot | host | concurrent storage/network restoration is verified; versioning and incompatible-capability invalidation are not |
| root React Query provider | in-memory `QueryClient` | query and mutation keys not yet fully enumerated | remote-data cache and optimistic projection | global client; individual key scope unproven | infinite cache lifetime; no verified account/instance purge or recreation during account transitions |
| `app/soapbox/service_worker/web_push_notifications.ts` | `NotificationOptions.data` | `access_token`, notification/status identifiers and `url` among retained action data | background action state; currently an unsafe credential duplicate | notification lifetime, with account/instance binding unproven | bearer token survives outside page/Redux lifecycle; no verified close-and-invalidate path on logout/account removal |
| `app/soapbox/service_worker/web_push_notifications.ts` | browser/OS notification store | generated notification tag/group and display fields | user-visible background projection | grouping scope not proven | grouped notifications may combine identities; account-scoped enumeration and closure are not verified |
| `app/soapbox/service_worker/share_target.js` | URL query/history state | `/statuses/compose?text=<encoded shared values>` | transient untrusted input transfer | route/tab | no explicit total-size, field-length, exact-path, origin or URL-scheme contract; browser history retention remains to be assessed |
| root Redux reducer | in-memory state with auth persistence side effect | domains preserved across logout: `instance`, `soapbox`, `custom_emojis`, `auth` | mixed canonical state, cache and configuration | mixed deployment, instance and account scope | retained domains are not fully classified, so logout cannot be described as deterministic purge |

### Evidence limitations

- The registry above is complete only for the concrete keys and fields already verified by Phase 0 source inspection.
- Repository code search did not yield an authoritative exhaustive call-site list through the available index, so absence from this table must not be interpreted as absence from the repository.
- Full closure still requires direct enumeration of every storage wrapper user, cache name, notification tag, query key, object URL, upload buffer, draft/outbox record and telemetry/developer-tool buffer.

## Required repository-wide inventory

Every persistence or cache site must be recorded with:

- API and implementation owner;
- key, database, store, cache, notification tag, object URL or query-key shape;
- canonical authority versus cache, snapshot, projection, journal or temporary object;
- account, instance, deployment, device, tab and schema-version scope;
- sensitive-field classification;
- creation and update paths;
- read/restore paths;
- expiry and stale-data policy;
- logout, account-removal, instance-switch and emergency-reset behavior;
- migration and rollback behavior;
- corruption and quota-exhaustion handling;
- cross-tab and service-worker synchronization;
- tests proving deterministic deletion and isolation.

The enumeration must cover at minimum:

1. every direct `localStorage` and `sessionStorage` call;
2. every localForage database, key prefix and object schema;
3. IndexedDB usage hidden behind libraries or wrappers;
4. Cache Storage and offline-plugin runtime caches;
5. service-worker global state and pending events;
6. native notification data, grouping and close behavior;
7. React Query keys, mutations, optimistic state and invalidations;
8. Redux persistence, migration, hydration and preserved logout domains;
9. media blobs, object URLs, upload staging and preview state;
10. drafts, scheduled posts, outbox or mutation-journal records;
11. search indexes, embeddings, entity graphs and other rebuildable derived state;
12. cookies or server-session state used together with bearer credentials;
13. URL/query/history state carrying private or untrusted values;
14. error-reporting or developer-tool buffers that can retain state snapshots.

## Deterministic purge contract

Later implementation must expose one account- and instance-aware purge coordinator. It must be idempotent, interruption-safe and testable. A successful purge must either remove or explicitly retain each classified store according to policy.

At minimum it must:

- attempt remote credential revocation or invalidation first when network access permits and bounded policy allows;
- proceed with local credential deletion and account-private purge regardless of whether remote revocation succeeds, fails, times out, is unavailable, or cannot be attempted;
- clear account-scoped Redux and React Query state;
- delete account-scoped browser persistence and mutation journals;
- close native notifications for the removed scope;
- prevent service-worker actions from using stale credentials;
- release object URLs and temporary media;
- remove or rebuild private search and intelligence projections;
- preserve only documented deployment-global assets and public caches;
- record partial failures without logging secrets or private content;
- resume safely after crashes or browser termination;
- provide an emergency local-only reset that does not require application startup to succeed.

## Isolation invariants

- Credentials must never be persisted in native notification data, URLs, logs, analytics, error reports or generic cache records.
- Account-private state must be keyed by both account identity and instance origin.
- Instance capabilities must not be reused across hosts or after incompatible schema/version changes.
- Public deployment caches must be structurally separate from account-private data.
- A tab, worker or background event holding stale state must not resurrect a removed account.
- Derived indexes and projections must be rebuildable from canonical records and disposable without data loss.
- Logout is not complete until all account-private surfaces are either purged or deliberately retained under an explicit signed-in-again policy.

## Required adversarial tests

The completion gate requires tests for:

- logout while offline;
- failed remote token revocation;
- account removal while push actions are pending;
- two accounts on different instances in multiple tabs;
- stale service worker after a new deployment;
- browser termination during purge;
- corrupted localForage or IndexedDB records;
- storage quota exhaustion;
- malformed or forged push payloads;
- stale React Query data after account switching;
- native notifications remaining after logout;
- migration from legacy keys and schemas;
- emergency reset when normal application rendering fails.

## Completion gate

This bounded artifact establishes the persistence and purge evidence model and records the concrete credential-bearing and snapshot keys verified so far. The broader Phase 0 gate remains open until every browser-resident store and copy is enumerated and deterministic purge, migration, isolation, corruption, quota, crash-recovery and cross-tab tests are documented.
