# Account and Instance Isolation Matrix

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document begins the required Phase 0 reconciliation of account, instance, credential, cache, persistence, worker, and asynchronous-response isolation. It records verified current behavior and explicit unknowns. It does not claim logout or account switching is privacy-complete.

## Isolation standard

An account transition is complete only when the old scope cannot remain readable, executable, observable, or capable of repopulating state through:

- Redux;
- React Query;
- localStorage or sessionStorage;
- IndexedDB/localForage;
- Cache Storage and service workers;
- WebSocket or other streams;
- push subscriptions and Notification data;
- in-flight HTTP requests and late responses;
- object URLs, media, drafts, uploads, logs, telemetry, or developer tooling.

Server token revocation and local privacy cleanup are separate obligations. Failure of either must not silently imply success of the other.

## Verified matrix entries

| State or transition | Current owner / storage | Scope represented | Verified current behavior | Verified gap or risk | Required follow-up |
|---|---|---|---|---|---|
| Serialized authentication state | Auth reducer persisted to `localStorage` under `soapbox:auth` or `soapbox@<subdirectory>:auth` | Multiple users, tokens, application registration, active identity | Complete auth state is written after reducer changes | Raw access tokens and client data are JavaScript-readable; no verified schema version, integrity marker, expiry envelope, encryption, or deterministic corruption recovery | Enumerate exact schema and every reader/writer; define versioned migration, fail-closed parsing, purge, retention, and secure-storage alternatives |
| Selected account marker | `sessionStorage` `...:auth:me` | Active account | Selected identity is stored separately from complete credentials | Selection can diverge from user/token indexes; session storage does not form the credential boundary | Prove selected account, account record, token record, origin, and request destination agree before use |
| Legacy credentials | `soapbox:auth:app` and `soapbox:auth:user` in `localStorage` | Historical application/user credentials | Current code reads legacy keys during migration | Source intentionally leaves legacy keys in place, so stale duplicate credentials may survive logout and migration | Inventory all historical formats and add deterministic deletion and regression tests |
| Account and token indexes | Auth reducer users keyed by account URL; tokens keyed by raw access token | Account and instance relationships | Reducer attempts duplicate and mismatch cleanup | Raw tokens act as object keys; multiple representations can diverge; malformed state behavior is not fully proven fail-closed | Define one credential identity and explicit account-origin binding; prohibit raw tokens as cache/entity keys |
| Account removal/logout | Auth actions and reducer | Selected account, with possible other accounts retained | Revocation is attempted; local removal dispatch occurs in `finally`; selected user and associated token records are removed | This is account removal, not complete application purge; failed revocation may leave a valid server token | Build transition tests for successful and failed revocation, final-account logout, multi-account fallback, and multiple instances |
| Verified-account snapshot | localForage/IndexedDB database `soapbox`, store `keyvaluepairs`, key `authAccount:<account URL>` | Account URL, implicitly instance-bearing | Verified account snapshots are persisted and older Pleroma settings may be retained | Database/store are not visibly account- or instance-scoped; logout does not visibly delete snapshots; stale private settings may return | Record schema and sensitive fields; define versioning, retention, purge, quota/corruption handling, and stale-field authority |
| React Query cache | Global singleton QueryClient | Scope depends on each query key | Client defaults include infinite cache lifetime | Complete query-key account/instance scope is unverified; no inspected logout path clears or cancels cache; late responses may restore old data | Inventory keys, mutations, invalidations, cancellation, Redux overlap, and account-transition barriers |
| Redux domain state | Root Redux store | Mixed account, instance, and shared state | Logout rebuilds most reducers while preserving selected reducers | Preserved and rebuilt domains have not been classified; asynchronous actions may repopulate stale scope | Produce reducer/action/selector ownership matrix and transition tests for every sensitive domain |
| Service-worker and Cache Storage state | Service worker runtime and browser caches | Origin-wide unless explicitly partitioned | Emergency reset unregisters service workers | Normal logout does not visibly unregister workers or clear caches; authenticated-response caching remains unverified | Inventory cache names, strategies, response classes, update behavior, purge ordering, and rollback |
| Push and Notification state | Push worker and `Notification.data` | Account/token context | Push payload may include bearer token used for later actions | Tokens can persist in browser notification data after logout/account switching | Remove raw bearer tokens from payload/data design; enumerate existing notifications and close or invalidate old-scope actions |
| Streaming state | `app/soapbox/stream.ts` WebSocket ownership | Account/instance connection | WebSocket usage is verified | Teardown, backoff, destination binding, token rotation, duplicate events, and account-switch cancellation remain unverified | Define lifecycle state machine and prove old connections cannot dispatch after transition |
| In-flight HTTP state | Axios clients/actions | Request-specific account, token, and destination | Bearer injection is centralized in inspected client behavior | No complete cancellation registry or stale-response barrier is verified | Bind account, credential, origin, and generation to each request; cancel before purge and reject late responses |

## Required account-transition order

The target transition contract must define and test an order equivalent to:

1. freeze new old-scope work;
2. advance an account/instance generation identifier;
3. cancel HTTP requests, mutations, uploads, timers, and streams;
4. detach push and notification actions from old credentials;
5. clear or partition React Query and other singleton caches;
6. clear account-owned Redux domains;
7. purge versioned browser persistence and worker caches;
8. revoke server credentials, while independently completing local cleanup;
9. activate the new account only after destination and capability state are established;
10. reject every late completion associated with the prior generation.

The exact implementation may differ, but equivalent safety properties are mandatory.

## Mandatory transition tests

The completed matrix must drive tests for:

- account A to account B on the same instance;
- account A on instance X to account B on instance Y;
- removal of one account while others remain;
- removal of the final account;
- failed token revocation with successful local cleanup;
- malformed and partially migrated auth storage;
- stale React Query, Redux, WebSocket, worker, and HTTP completions after purge;
- browser reload during each transition stage;
- worker update during account switching;
- notifications created before logout and acted on afterward;
- multiple tabs observing a storage/account transition;
- quota, IndexedDB failure, cache deletion failure, and partial cleanup recovery.

## Next inspection queue

1. Enumerate all auth reducer/action readers and writers.
2. Enumerate every localStorage, sessionStorage, localForage, IndexedDB, and Cache Storage key/schema.
3. Build the React Query key, mutation, invalidation, and cancellation matrix.
4. Build the Redux authority and persistence matrix.
5. Trace stream, push, notification, and service-worker lifecycle ownership.
6. Trace request cancellation and stale-response handling across Axios call sites.
7. Identify cross-tab synchronization and storage-event behavior.
8. Record telemetry, logging, Redux DevTools, and error-reporting exposure of transition data.

## Completion gate

This workstream remains incomplete until every account- and instance-bearing state location has:

- an explicit owner;
- a versioned schema where persisted;
- account and instance scope;
- creation, read, update, migration, retention, and purge rules;
- cancellation and stale-completion behavior;
- security and privacy classification;
- failure recovery and rollback behavior;
- direct tests proving no old-scope data or authority survives transitions.

Unknown storage, cache, worker, stream, notification, request, or telemetry behavior remains a blocker rather than evidence of absence.
