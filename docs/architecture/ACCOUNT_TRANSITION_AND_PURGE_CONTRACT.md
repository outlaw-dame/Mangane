# Account Transition and Purge Contract

Status: **Accepted target / Phase 0 evidence contract**

Last updated: 2026-07-23

## Purpose

This document defines the mandatory account-transition boundary for login, account activation, account switching, logout, account removal, instance switching, credential expiry and emergency local reset. It translates the verified Phase 0 persistence, state-authority, React Query and service-worker findings into one ordered fail-closed lifecycle contract.

This is not a claim that the current inherited implementation satisfies the contract. Current behavior remains distributed across Redux actions and reducers, browser persistence, Axios clients, React Query, localForage, service workers and native notifications.

## Verified current-state constraints

The transition design must account for these source-backed facts:

- the complete authentication graph is persisted as plaintext browser-readable `localStorage` state;
- the selected account is also represented in `sessionStorage` and more than one Redux location;
- legacy credential keys may remain after migration;
- account and instance snapshots are retained in one origin-wide localForage/IndexedDB store;
- one global React Query client has infinite cache lifetime and no verified transition purge;
- the central Axios client does not provide global cancellation or account-scope assertions;
- root logout preserves several Redux domains, including `auth` and `instance`;
- native notification data can retain bearer tokens beyond the page lifecycle;
- service-worker actions are not proven to bind tokens, accounts and destinations together;
- no verified transition coordinator spans requests, caches, persistence, workers and notifications.

## Transition identities

Every transition must operate on an immutable scope descriptor:

```text
AccountScope {
  accountId
  accountUrl
  instanceOrigin
  credentialHandle
  sessionGeneration
}
```

The scope descriptor is the authority for request binding, cache keys, persistence keys, worker messages and purge operations. Raw bearer tokens must not serve as identifiers.

`sessionGeneration` must change whenever credentials, active account, instance origin or authorization validity changes. Late work from an older generation must be rejected before it can update canonical state or durable caches.

## Required transition state machine

At minimum, the application lifecycle must distinguish:

- `anonymous`;
- `authenticating`;
- `activating`;
- `active`;
- `switching`;
- `revoking`;
- `purging`;
- `degraded-active`;
- `reauthentication-required`;
- `reset-required`.

UI state must not imply an account is active until credential, account and destination binding has been validated. A failed activation must return to a previously valid scope or anonymous state without exposing partially loaded private data.

## Ordered activation contract

Activating an account must occur in this order:

1. parse and normalize the account URL and instance origin;
2. validate the credential record and bind it to the same account and origin;
3. allocate a new session generation;
4. suspend old-scope mutations and background actions;
5. cancel or quarantine old-scope requests;
6. initialize account-and-instance-scoped cache and persistence views;
7. fetch and verify current credentials;
8. load instance capabilities without trusting stale host snapshots as current authority;
9. hydrate only records matching the new scope and supported schema versions;
10. publish the active scope atomically;
11. permit timelines, notifications, composer actions and background work.

Any failure before step 10 must fail closed. No private cache belonging to another scope may be displayed as fallback content.

## Ordered switch contract

Switching between accounts, especially across instances, must:

1. mark the old generation closing so new work cannot start;
2. pause optimistic mutations and durable outbox replay;
3. cancel old-generation network requests where supported;
4. prevent late responses from committing state;
5. detach old-scope subscriptions, streams and push-action channels;
6. hide or invalidate old private UI projections;
7. activate the new scope through the activation contract;
8. retain the old account only according to explicit multi-account policy;
9. restore old-scope data later only through keys containing both account and instance scope.

Switching must not be implemented as changing only `me`, selected account ID or API base URL.

## Ordered logout and account-removal contract

Logout/account removal must be locally successful even when remote revocation fails.

The required order is:

1. freeze new requests, mutations and worker actions for the closing generation;
2. attempt remote OAuth revocation and backend session termination with bounded timeouts;
3. record revocation failure without storing secrets or blocking local cleanup;
4. invalidate the generation so late responses and worker messages are rejected;
5. delete active and legacy credential records for the exact account and origin;
6. clear account-scoped Redux and React Query state;
7. remove account snapshots, drafts, outbox entries, uploads and private derived indexes;
8. close account-scoped native notifications and invalidate pending actions;
9. notify service workers and other tabs that the generation is revoked;
10. release object URLs and temporary media;
11. verify that no account-private store remains reachable through known keys;
12. activate another retained account through the normal activation contract, or enter `anonymous`.

A partially failed purge must remain resumable and must not silently report completion.

## Remote revocation semantics

Remote revocation and local purge are separate outcomes:

- `remoteRevocationSucceeded`;
- `remoteRevocationFailedRetryable`;
- `remoteRevocationFailedPermanent`;
- `localPurgeSucceeded`;
- `localPurgeIncomplete`.

The UI may warn that a server token could remain valid, but it must never retain the local token merely to retry later. Any revocation retry must use a narrowly scoped secure mechanism rather than restoring the removed account to application state.

## Request and response fencing

Every authenticated request must bind:

- account identity;
- normalized instance origin;
- credential handle;
- session generation;
- request purpose.

Before committing a response, the caller must verify that the generation is still active. Cancellation is an optimization; generation validation is the correctness boundary.

Redirects, pagination URLs and configured backend overrides must not bypass origin binding.

## Cache and persistence fencing

All account-private keys must include explicit account and instance scope. Cache and persistence APIs must reject unscoped private records.

Required behavior includes:

- no global private React Query keys;
- no account-private data in deployment-global Cache Storage;
- schema-versioned localForage/IndexedDB records;
- no raw tokens in query keys, entity keys, notification tags or URLs;
- deterministic deletion by scope;
- stale-generation writes rejected after purge;
- derived indexes disposable and rebuildable.

## Cross-tab and worker protocol

Tabs and workers must exchange versioned messages for:

- active-generation change;
- scope revocation;
- purge start;
- purge completion or incomplete status;
- notification closure;
- cache invalidation;
- emergency reset.

Messages must include the scoped account, instance and generation identifiers, but never bearer tokens. A stale tab or worker must not reactivate credentials or rewrite deleted storage.

## Failure and recovery rules

- Browser termination during purge must leave a durable non-secret purge journal that resumes on next startup.
- Corrupt scoped storage must be quarantined and deleted rather than accepted as partial authority.
- Quota failure must not leave credentials persisted while private-cache deletion is skipped.
- A failed account activation must not overwrite the last known valid multi-account index until the new scope is verified.
- Emergency reset must be available without successful Redux hydration, React rendering or network access.
- Purge and activation operations must be idempotent.

## Required tests

The implementation gate requires tests for:

- two accounts on one instance;
- two accounts on different instances;
- account switch with slow old requests completing late;
- logout while offline;
- revocation timeout and server error;
- browser termination at every purge stage;
- stale tab writing after account removal;
- stale service worker handling a notification action;
- corrupted current and legacy auth storage;
- React Query optimistic mutation during switching;
- instance capability snapshot incompatible with the live server;
- native notifications remaining after local account removal;
- multi-account fallback activation after removing the active account;
- emergency reset before normal application startup.

## Phase status

This document establishes the accepted transition contract needed to safely design the Phase 1 architecture seam. It does not close the Phase 0 gate. Closure still requires complete current call-site mapping and a source-backed transition table showing how every existing login, switch, logout, removal, refresh, worker and cache path behaves today.