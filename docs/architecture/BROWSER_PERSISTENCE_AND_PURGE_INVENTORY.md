# Browser Persistence and Deterministic Purge Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document establishes the canonical Phase 0 evidence model for every browser-resident copy of account, instance, content, credential, notification, upload, cache, mutation, and derived-intelligence state. Its primary goal is to make logout, account removal, instance switching, privacy reset, migration, and recovery deterministic rather than best-effort.

This is an inventory and contract baseline. It does not claim that every repository persistence call site has already been enumerated.

## Initial verified persistence surfaces

| Surface | Verified current role | Scope currently evidenced | Sensitive contents | Current invalidation evidence | Risk/status |
|---|---|---|---|---|---|
| Redux authentication graph persisted to `localStorage` | durable authentication and multi-account state | user/account URLs and active authentication graph | access tokens, refresh tokens, application credentials, account/session metadata | auth reducer removes selected records during logout, but root logout preserves the auth domain | **Blocked** — plaintext credential persistence and purge completeness require full call-site verification |
| `sessionStorage` selected-account identity | preserves current account selection for the tab/session | active account identity | account identifier and cross-instance selection state | no complete account-removal or stale-tab invalidation contract verified | **Partial** |
| localForage / IndexedDB account snapshots | restores account entities through `authAccount:<accountUrl>` keys | account URL | profile/account metadata; may expose private identity context | `rememberAuthAccount` reads snapshots; complete deletion/versioning paths not yet enumerated | **Partial** |
| localForage / IndexedDB instance snapshots | restores instance metadata through `instance:<host>` keys | instance host | capabilities, policy, limits, branding, registration state | storage restore races or runs concurrently with network refresh; schema/version invalidation not verified | **Partial** |
| React Query singleton cache | in-memory remote-data cache with infinite cache lifetime | currently global unless each key encodes account and instance | potentially private account, relationship, notification, moderation, search, and timeline data | no verified global purge/recreation on logout or account switch | **Blocked** |
| Redux entity and feature domains | active application state and normalized projections | mixed: deployment, instance, account, route, and transient UI | private entities and moderation state may be present | root logout rebuilds most domains but preserves `instance`, `soapbox`, `custom_emojis`, and `auth` | **Partial** |
| Service-worker application/runtime caches | offline/static resource availability and inherited production caching | deployment/origin | application assets; runtime content remains unenumerated | cache-name ownership exists, but account/private response caching and purge behavior are not fully inventoried | **Unknown** |
| Native notification data | supports notification navigation and action handling outside page lifetime | notification, account and instance are not explicitly bound | bearer token, status/account identifiers, URLs, hidden content and images | no verified logout/account-removal closure and credential purge path | **Blocked** |
| Browser native notifications | persisted operating-system/browser UI state | potentially multiple accounts and instances | titles, bodies, avatars, media previews, URLs, hidden content | grouping and closure are not verified as account-scoped | **Blocked** |
| Share-target redirect/query state | transfers external shared text into the composer | deployment route/tab | external text and URLs | transient redirect only; size, exact routing and cleanup behavior remain unresolved | **Partial** |

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

- revoke or invalidate credentials before deleting local references when network access permits;
- never block local credential removal on remote revocation success;
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

This bounded artifact establishes the persistence and purge evidence model and records the currently verified high-risk surfaces. The broader Phase 0 gate remains open until every browser-resident store and copy is enumerated and deterministic purge, migration, isolation, corruption, quota, crash-recovery and cross-tab tests are documented.