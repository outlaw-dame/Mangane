# Mangane Security and Runtime Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

This document records security-relevant runtime behavior verified directly from the current repository. It is deliberately narrower than a security audit: every statement below is tied to inspected code, and every unresolved area remains explicitly open.

## 1. Authentication material in current state

The current authentication helpers read credentials from the Redux state graph.

Verified selectors include:

- an application access token at `auth.app.access_token`;
- per-user access tokens beneath `auth.users[accountUrl].access_token`;
- the active authentication identity beneath `auth.me`;
- account URLs resolved through the accounts state and authentication state;
- a VAPID key sourced from either the authenticated application record or instance metadata.

The user access-token lookup uses the selected account's URL as the key into the authentication users map. This means account URL normalization, instance identity, account switching and stale account records are security-relevant.

### Verified concerns

- Tokens are stored in the Redux state graph, but the inspected helper does not establish how they are persisted, encrypted, refreshed, revoked or deleted.
- The root reducer preserves the `auth` domain during logout, so logout cannot be treated as proof that token records are removed.
- The active account identifier and authentication identity are represented in more than one location (`state.me` and `state.auth.me`), creating a consistency boundary that must be tested.
- `getUserToken` derives the authentication record key from `state.accounts[accountId].url`; missing, stale or cross-instance account records may therefore affect token selection.
- The VAPID key has two possible authorities. Capability and instance changes must invalidate any cached push-subscription assumptions.

## 2. URL parsing and trust boundaries

The current authentication utility provides:

- `isURL`, which accepts any value constructible by the platform `URL` parser;
- `parseBaseURL`, which returns `new URL(value).origin` or an empty string;
- authentication-user URL resolution using the first URL-like value in the current authentication record.

### Security implications

Constructibility is not equivalent to application safety. The current helper does not itself enforce:

- HTTPS outside explicitly permitted local development;
- allowed protocols;
- credential-free URLs;
- public-network-only destinations;
- canonical host normalization;
- prevention of loopback, link-local or private-address destinations;
- restrictions on ports;
- instance allowlists or explicit user confirmation;
- redirect target safety.

A future shared URL policy must not silently change current behavior. It requires an inventory of every caller, compatibility tests and explicit handling for local-development instances.

## 3. HTTP client creation

`app/soapbox/api.ts` defines the central Axios client factory.

Verified behavior:

- a new Axios instance is created for each `baseClient` invocation;
- bearer authentication is added through the `Authorization` header when an access token is available;
- `BACKEND_URL` overrides the runtime base URL whenever it passes the current broad `isURL` check;
- otherwise, the authenticated account or authentication-user origin is used when it differs from the frontend origin;
- responses are passed through a permissive JSON parser that returns the original value when JSON parsing fails;
- static frontend files use a separate unauthenticated Axios instance rooted at `FE_SUBDIRECTORY`;
- pagination helpers parse the HTTP `Link` header and return the first `rel=next` URI.

### Verified absences in the inspected central client

The central client factory does not define:

- request timeouts;
- bounded response sizes;
- retry policy;
- exponential backoff;
- cancellation defaults;
- global request or response interceptors;
- typed error normalization;
- rate-limit handling;
- redirect policy;
- per-request account-scope assertions;
- automatic token refresh;
- request correlation identifiers;
- content-type enforcement.

These behaviors may exist at individual call sites, but they are not guaranteed by the shared client. Phase 0 must therefore inventory call-site retry, cancellation and error behavior before Phase 1 defines the replacement contract.

## 4. Base URL selection

The authenticated base URL selector considers:

1. the active account URL in the accounts store;
2. the current authentication-user URL;
3. the parsed origin of the first usable value;
4. an empty base URL when that origin matches `window.location.origin`.

### Risks requiring explicit tests

- switching between accounts on different instances;
- stale account metadata after authentication changes;
- malformed or unsupported account URLs;
- frontend deployments using a backend proxy;
- a configured `BACKEND_URL` overriding the selected account's host;
- token-to-origin binding;
- navigation or API requests after logout while the `auth` reducer remains preserved;
- accidental bearer-token transmission to the wrong origin.

The target protocol adapter must bind each credential to an explicit account and origin. A token must never be selected independently of the destination it is authorized for.

## 5. React Query interaction

The application uses one global `QueryClient` with an infinite cache lifetime. The inspected authentication and API helpers do not clear, partition or recreate that client.

This establishes a mandatory Phase 0 question: whether every query key and mutation is scoped by account and instance, and whether logout/account switching clears all account-private data.

Until that inventory is complete:

- React Query must not be considered account-safe by assumption;
- Redux logout must not be described as a complete privacy purge;
- new query keys must include explicit account/instance scope;
- later phases must not move additional private entities into the global query cache without isolation tests.

## 6. Required authentication lifecycle inventory

The following remain mandatory before Phase 0 can close:

- application registration and app-token creation;
- user authorization and callback handling;
- token persistence mechanism and storage schema;
- multi-account addition and account switching;
- token refresh or reauthentication behavior;
- logout, revoke and account-removal behavior;
- handling of expired, revoked and malformed tokens;
- deletion of React Query, Redux, localForage, service-worker and media caches;
- origin binding and cross-instance tests;
- avoidance of tokens in URLs, logs, analytics and error reports;
- push-subscription lifecycle after account or instance changes.

## 7. Required HTTP call-site inventory

Every API call site must eventually be classified by:

- method and endpoint;
- authentication type;
- destination/origin source;
- idempotency;
- retry behavior;
- cancellation behavior;
- pagination;
- response-size expectations;
- content type;
- error normalization;
- rate-limit behavior;
- offline behavior;
- account and instance scope;
- whether it duplicates Redux or React Query state.

Mutating requests must not receive automatic retries unless their idempotency is proven or protected by an idempotency key/precondition.

## 8. Phase 1 contract consequences

The architecture-seam phase must introduce, at minimum:

- an explicit `AccountScope` containing account identity and instance origin;
- a credential provider that returns tokens only for the requested scope;
- destination validation before attaching credentials;
- a typed request error model;
- timeout and bounded-response defaults;
- explicit retry classification;
- cancellation support;
- rate-limit metadata;
- test fixtures for same-origin, proxy-backed and cross-instance deployments;
- logout/account-switch invalidation hooks spanning all state and cache systems.

## 9. Evidence limitations

This document verifies the shared authentication utility, shared HTTP client and global React Query configuration. It does not claim that all authentication actions, API call sites, persistence modules or error-reporting paths have been inspected. Those remain open Phase 0 deliverables and must not be converted into assumptions.