# Mangane React Query and Cache Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

This document records React Query behavior verified from exact repository paths. It intentionally distinguishes the confirmed global cache contract from the still-unresolved source-wide query-key and mutation inventory.

## 1. Global client

`app/soapbox/queries/client.ts` exports one process-wide `QueryClient`.

Verified defaults:

- `refetchOnWindowFocus: false`;
- `staleTime: 60000` milliseconds;
- `cacheTime: Infinity`.

The root application imports that singleton and exposes it through one `QueryClientProvider` shared by the entire rendered application.

## 2. Security and lifecycle consequences

An infinite cache lifetime means inactive query records are not garbage-collected by time. Data therefore remains in memory until it is explicitly removed, the client is cleared, or the page process terminates.

Because the same client is shared across authentication and instance transitions, every query key must encode all authority dimensions that affect the returned data. Depending on the endpoint, this may include:

- authenticated account;
- credential scope;
- backend origin or instance;
- moderation and visibility state;
- locale;
- feature/capability version;
- pagination cursor;
- request parameters that alter private or filtered results.

A key that omits an authority dimension can return stale data from another account or instance even when the subsequent network request would have used different credentials.

## 3. Verified missing lifecycle evidence

No inspected logout, account-removal, account-switch, emergency-reset, or root-bootstrap path establishes a React Query purge contract.

The current evidence does not establish that these operations occur during account changes:

- cancellation of in-flight queries;
- removal of account-scoped query records;
- removal of instance-scoped query records;
- invalidation before credential replacement;
- blocking of late responses from an old account scope;
- mutation reset;
- optimistic-update rollback;
- persisted-query removal, if persistence exists elsewhere;
- WebSocket or streaming updates being detached from stale cache records.

These items remain unverified rather than assumed absent.

## 4. Required query and mutation matrix

Phase 0 must enumerate every use of:

- `useQuery`;
- `useInfiniteQuery`;
- `useQueries`;
- `useMutation`;
- `fetchQuery` and `prefetchQuery`;
- `getQueryData` and `setQueryData`;
- `setQueriesData`;
- `invalidateQueries`;
- `removeQueries`;
- `resetQueries`;
- `cancelQueries`;
- `clear`;
- query defaults and mutation defaults;
- hydration, dehydration or persistence adapters.

For every query or mutation, record:

| Field | Required evidence |
|---|---|
| Owner | feature/module and responsible subsystem |
| Query or mutation key | exact factory and serialized dimensions |
| Transport | endpoint, method and shared-client path |
| Authentication | anonymous, application token or user token |
| Account scope | account identifier represented in key or explicit reason it is not needed |
| Instance scope | backend origin represented in key or explicit reason it is not needed |
| Input validation | parameter schema and unsafe-value handling |
| Staleness | stale time and refetch triggers |
| Retention | cache time and explicit removal behavior |
| Cancellation | signal propagation and account-switch behavior |
| Mutation safety | idempotency, optimistic update, rollback and conflict behavior |
| Invalidation | exact related keys invalidated or updated |
| Error behavior | normalized error type and user-visible handling |
| Privacy | private data retained in memory or persisted elsewhere |
| Tests | multi-account, multi-instance, late-response and rollback coverage |

## 5. Account transition contract required by later phases

Before activating a different account or instance, the target architecture must:

1. mark the old account scope inactive;
2. cancel old-scope requests and mutations where safe;
3. reject or quarantine late old-scope responses;
4. detach streams and subscriptions;
5. remove or securely partition private old-scope cache entries;
6. activate the new credential-and-origin scope atomically;
7. fetch new-scope data without displaying old private records;
8. preserve only explicitly public, origin-independent records that have a proven safe key.

Logout must use the same mechanism rather than relying on Redux reconstruction alone.

## 6. Current evidence limitation

The repository code-search index returned no results for React Query APIs during this inspection, and the available GitHub file interface does not enumerate directories. Only the singleton client and root provider have therefore been verified directly so far.

This limitation is a blocker. It must not be converted into a claim that there are few query modules, that query keys are safe, or that React Query is unused beyond the root provider.

## 7. Phase 0 completion criteria

This inventory may be marked complete only when:

- all query and mutation call sites are enumerated;
- every private result has an explicit account-and-origin scope;
- all account and instance transitions have cancellation and purge behavior mapped;
- optimistic mutations and rollback behavior are documented;
- stream-to-cache update paths are identified;
- persistence or hydration is either inventoried or proven absent;
- tests cover account switching, logout, multi-instance operation, stale late responses and mutation failure;
- the final matrix is reconciled with Redux and local persistence authority.
