# Backend Capability Matrix

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document establishes the Phase 0 evidence structure for inherited Akkoma, Pleroma, Mastodon-compatible, and Mangane-specific backend behavior. It prevents presentation code and later architecture work from assuming that every server exposes the same endpoints, fields, limits, moderation behavior, streaming semantics, or authentication requirements.

It is a capability inventory, not a claim that all rows are implemented or equivalent.

## Required evidence model

Every backend-dependent feature must be classified using direct source evidence:

| Capability | Client owner | Endpoint or transport | Akkoma | Pleroma | Mastodon-compatible | Mangane-specific fallback | Auth scope | Pagination or stream semantics | Failure and degraded behavior | Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|

Allowed status values are:

- **Verified-current** — directly supported by inspected source and tests;
- **Partial** — some paths are verified but important variants remain unresolved;
- **Unknown** — no complete source-backed conclusion is available;
- **Unsupported** — explicitly absent and handled through a documented fallback;
- **Blocked** — unsafe to rely on until security, privacy, migration, or compatibility evidence exists.

## Capability groups requiring enumeration

The complete matrix must cover at least:

1. instance discovery, versioning, registrations, configuration, feature flags, limits, and custom emojis;
2. OAuth application registration, authorization, token exchange, revocation, scopes, and multi-account behavior;
3. accounts, relationships, follow requests, lists, filters, blocks, mutes, endorsements, and account notes;
4. home, local, federated, list, hashtag, bookmarks, favourites, and conversation timelines;
5. statuses, replies, quotes, edits, history, polls, reactions, bookmarks, favourites, pins, and deletion;
6. media upload, processing, limits, descriptions, thumbnails, and failure recovery;
7. notifications, push subscriptions, web push payloads, streaming, reconnect, resume, and deduplication;
8. search, trends, suggestions, directory, featured tags, and server ranking behavior;
9. reports, moderation, domain blocks, content warnings, sensitive media, filters, and visibility semantics;
10. chats or private-message extensions, if present;
11. server-specific Akkoma and Pleroma extensions;
12. rate limits, retry metadata, pagination cursors, idempotency, and error schemas.

## Current verified boundary

The canonical architecture already establishes that Mangane must support Akkoma, Pleroma, and Mastodon-compatible APIs through explicit protocol and capability boundaries. Existing functionality must not be removed merely because it is absent from the target design.

The complete endpoint, adapter, selector, hook, action, reducer, and test inventory has not yet been established. Therefore no backend capability should be treated as universally available merely because one inherited code path references it.

## Required adapter contract

Later implementation must expose backend differences through a stable capability layer that:

- detects support from verified instance metadata and safe probes rather than branding alone;
- distinguishes unsupported behavior from transient failure;
- validates response shape before storing or rendering it;
- prevents server-specific fields from leaking directly into presentation components;
- defines pagination, streaming, retry, cancellation, and stale-data behavior;
- scopes cached data and capability decisions by account and instance;
- fails closed for authentication, privacy, moderation, and visibility-sensitive behavior;
- supplies explicit degraded-mode UI when a capability is unavailable;
- records compatibility tests for each supported backend family.

## Security and privacy gates

The matrix remains blocked for production decisions until it records:

- authentication scopes and token exposure for every protected capability;
- visibility and audience semantics for posts, replies, quotes, chats, and notifications;
- moderation and filter differences that could expose hidden or blocked content;
- URL, redirect, media, and attachment trust boundaries;
- instance-controlled HTML and metadata handling;
- rate-limit and retry behavior that avoids duplicate mutations;
- account-transition and cache-isolation behavior.

## Completion gate

This bounded artifact defines the canonical matrix and evidence standard. The broader Phase 0 backend capability gate remains open until every active backend-dependent code path is mapped to its endpoint or transport, capability status, authentication requirements, failure behavior, cache ownership, tests, and documented fallback.
