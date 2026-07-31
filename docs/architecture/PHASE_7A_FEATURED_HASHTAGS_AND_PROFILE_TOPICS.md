# Phase 7A — Featured Hashtags and Profile Topics

Status: **Compatibility implementation in progress**

## Goal

Give every Mangane account a reliable way to curate the hashtags that best describe its posts while preserving the difference between server-published profile metadata and Mangane-only preferences.

## Supported behavior

### Native Mastodon-compatible authority

When the connected server supports the featured hashtag API, Mangane uses the server as the authority:

- `GET /api/v1/featured_tags`
- `POST /api/v1/featured_tags`
- `DELETE /api/v1/featured_tags/:id`
- `GET /api/v1/featured_tags/suggestions`
- `GET /api/v1/accounts/:id/featured_tags`

Native entries retain the server-provided identifier, profile-specific URL, authored-status count, and last-used date. They are labelled as server-published and may be shown by other clients or federated by the server.

### Mangane profile topics fallback

Servers that return a verified unsupported response for the native endpoints use an account-scoped Mangane fallback. The fallback:

- stores at most ten normalized hashtag names for the authenticated account;
- rejects empty, overlong, malformed, and numeric-only tags;
- prevents duplicate names case-insensitively;
- never exposes one account's topics to another account;
- marks every entry as `source: mangane` and `federated: false`;
- never claims that Mangane-only topics are published by the server;
- does not invent topics for other accounts.

The fallback is a compatibility bridge. Phase 7's canonical state migration must move it behind the account-scoped local repository without changing the public behavior or source labels.

## Presentation

The existing hashtag management page becomes the shared hashtag surface:

- featured hashtags appear before followed hashtags;
- a user can add and remove featured hashtags;
- native server suggestions are offered when available;
- each tag links to its hashtag timeline;
- server-published and Mangane-managed entries have distinct explanatory copy;
- loading and empty states remain accessible;
- controls have text labels and do not rely on color or iconography alone.

Account profile presentation may consume `GET /api/v1/accounts/:id/featured_tags` through the shared action and reducer. Mangane-only topics are shown only for the currently authenticated account because they are not public server data.

## Failure and security behavior

- Only `404`, `405`, `410`, and `501` select the fallback path. Authentication, authorization, validation, rate-limit, timeout, and server failures remain errors.
- Account identifiers and featured-tag identifiers are URL encoded before entering endpoint paths.
- Local data is schema-versioned, bounded, parsed defensively, and discarded when invalid.
- Native delete operations use the FeaturedTag identifier, not the ordinary Tag identifier.
- The client does not upload fallback data or imply federation.

## Tests

The service contract covers:

- native retrieval and normalization;
- unsupported-endpoint fallback;
- account isolation;
- input validation;
- local add/remove behavior;
- public retrieval for another account.

## Migration and rollback

Migration to the Phase 7 canonical repository must preserve account scope, tag order, source, and federation semantics. Rollback can remove the management UI and service wiring without modifying server-owned featured tags; Mangane-only data remains namespaced and can be safely ignored or purged.

## Exit criteria

This phase is complete when:

1. native and fallback management paths pass tests and CI;
2. profile rendering consumes the shared account query without duplicate API calls;
3. the fallback is migrated to the canonical account-scoped local repository during Phase 7;
4. account-switch, logout, corruption, unsupported-server, and offline tests pass;
5. documentation authority and API callsite inventories are updated;
6. no unresolved review comments remain.
