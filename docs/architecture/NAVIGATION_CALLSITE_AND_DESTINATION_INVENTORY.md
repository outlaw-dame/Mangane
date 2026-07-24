# Navigation Call-Site and Destination Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document begins the repository-wide inventory of navigation producers, route consumers and destination ownership required before Mangane replaces inherited React Router behavior with a Framework7 shell.

The route manifest records the verified root and primary route table. This companion inventory records how destinations are produced outside that table, which inputs can influence them, what trust boundary applies, and what must be preserved or hardened during migration.

This is a bounded source-backed artifact. It does not yet claim exhaustive enumeration of every `history.push`, `history.replace`, `Redirect`, `Link`, `NavLink`, route helper, nested router, service worker, notification handler or server rewrite.

## Navigation authority model

A destination may originate from one of six classes:

1. **Static application navigation** — hard-coded internal routes from menus, tabs, keyboard shortcuts and settings surfaces.
2. **Entity-derived navigation** — destinations derived from account usernames, status identifiers, list identifiers, tags or instance names.
3. **Session continuation navigation** — login return destinations and account-transition redirects.
4. **Worker-originated navigation** — service-worker messages, share-target handling and notification clicks.
5. **Compatibility navigation** — legacy redirects and backend-compatible deep links.
6. **External navigation** — links intentionally leaving the application origin.

The replacement shell must not treat these classes as equivalent. Each requires explicit validation, encoding, scope and rollback behavior.

## Initially verified call sites

| Producer | Current behavior | Input trust | Migration consequence |
|---|---|---|---|
| Primary UI service-worker message handler | messages with `type === 'navigate'` call `history.push(data.path)` | worker-provided path; validation is not visible at the call site | central destination policy must reject external, malformed, oversized and privileged paths before Framework7 navigation |
| Keyboard shortcuts | push Home, Notifications and account-derived profile collection routes | mostly static; account-derived segments require safe construction | preserve shortcut behavior while routing through canonical destination builders |
| Browser-back fallback | pushes `/` when browser history length is one | static internal destination | preserve predictable escape behavior without corrupting modal or nested-view history |
| Share-target worker | redirects to `/statuses/compose?text=...` | externally supplied shared text encoded into a query string | enforce length, encoding and account-scope rules; do not permit query-based route injection |
| Notification click handling | may open or navigate a stored URL | credential-adjacent worker state and remotely influenced notification payload | require same-origin and allowed-route validation before focusing or opening a client |
| Anonymous protected-route continuation | stores URL-encoded pathname and query under `soapbox:redirect_uri`, then redirects to `/login` | current browser location; persisted across session changes | add expiry, same-origin validation, account-generation binding and purge behavior |
| Compatibility redirects | map inherited Mastodon, Pleroma, Gab and Soapbox paths to canonical destinations | browser path parameters and query strings | preserve parameter/query semantics and reject malformed values without open redirects |

## Required destination policy

All programmatic navigation should converge on one policy boundary with these properties:

- accepts only explicit internal destinations unless an external-navigation API is intentionally invoked;
- normalizes against `FE_SUBDIRECTORY` without double-prefixing or escaping the configured basename;
- rejects protocol-relative, absolute external, backslash-confused, control-character and encoded traversal inputs;
- preserves only allowed query parameters and fragments for the destination class;
- bounds destination and query-string length;
- constructs entity-derived routes using encoded typed parameters rather than string concatenation;
- associates session-continuation destinations with account and session generation;
- permits worker destinations only through an allowlisted message contract;
- distinguishes privileged/admin/developer surfaces from ordinary routes;
- records a safe reason code for rejected navigation without logging secrets or full sensitive URLs;
- falls back deterministically to a safe route when the requested destination is invalid.

## Inventory schema

Every discovered call site must be recorded with:

| Field | Meaning |
|---|---|
| File and symbol | exact source location and owning component, hook, action or worker |
| Navigation primitive | `history.push`, `history.replace`, `Redirect`, `Link`, `NavLink`, `window.open`, `location.*`, client focus/open or helper abstraction |
| Destination class | static, entity-derived, session continuation, worker, compatibility or external |
| Input source | constant, route param, API response, account object, notification payload, persisted storage, worker message or user input |
| Validation | current checks before navigation |
| Encoding | how path segments, query strings and fragments are constructed |
| Account scope | whether the destination can survive switching, logout or credential expiry |
| Capability/role gate | whether the target can be absent or privileged |
| Replacement owner | canonical route builder or destination-policy function required for Framework7 |
| Test obligation | positive, malformed, cross-account, capability-off, privilege and rollback cases |

## Known hazards to verify repository-wide

- destinations assembled by raw string interpolation;
- account usernames or IDs inserted without path-segment encoding;
- API-provided URLs passed directly to `history`, `window.open` or client focus/open;
- query strings copied wholesale during redirects;
- login return destinations surviving logout or account switching;
- service-worker messages bypassing application authorization state;
- notification URLs opening another origin or a privileged local surface;
- `window.location` assignments that bypass `FE_SUBDIRECTORY` and SPA state;
- duplicated route constants that can drift from the canonical manifest;
- nested routers with path ordering different from the primary switch;
- modal navigation keys coupled to React Router history shape;
- links that reveal protected-route existence to anonymous users;
- external links missing safe opener/referrer behavior.

## Required tests

The Phase 0 routing gate must define, and Phase 3 must execute, at minimum:

- exhaustive static call-site inventory checks or a generated report;
- canonical builder tests for every typed destination;
- same-origin and basename normalization tests;
- encoded traversal, protocol-relative, control-character and backslash confusion cases;
- malformed and oversized worker-message destinations;
- notification click cases for external, privileged, stale-account and deleted-resource destinations;
- login continuation expiry, purge and cross-account rejection;
- capability-off and insufficient-role destinations;
- direct navigation, browser refresh, back/forward, modal continuity and PWA relaunch;
- compatibility redirect parameter and query preservation;
- rollback to the inherited router with equivalent destination behavior.

## Remaining source inventory

The next bounded pass must enumerate:

- every direct import or use of React Router navigation primitives;
- every shared route or URL-building helper;
- every nested or feature-local router;
- every `window.location`, `location.assign`, `location.replace` and `window.open` call;
- service-worker client navigation and focus/open behavior;
- notification destination creation, persistence and consumption;
- OAuth callback and authentication continuation paths;
- deployment and backend rewrite ownership;
- tests that currently exercise navigation behavior.

## Phase status

This artifact starts the next Phase 0 routing workstream after the primary route manifest. It establishes the classification, policy and evidence schema, and records the already verified cross-boundary call sites. The repository-wide call-site inventory remains open and must be completed before the Framework7 shell route implementation begins.
