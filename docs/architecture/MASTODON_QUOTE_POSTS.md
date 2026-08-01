# Mastodon quote posts compatibility

Status: **Runtime compatibility implemented; management and notification surfaces remain incremental**

Last updated: 2026-07-31

## Purpose

Mangane already supported older Pleroma, Akkoma, Fedibird, and Rebased quote shapes through `quote_id` and embedded quoted statuses. Mastodon 4.5 introduced a consent-aware quote protocol and Mastodon API version 7 with different request and response contracts.

## Implemented API surface

- `POST /api/v1/statuses` using `quoted_status_id` when `api_versions.mastodon >= 7`;
- `GET /api/v1/statuses/:id/quotes`;
- `POST /api/v1/statuses/:id/quotes/:quoting_status_id/revoke`;
- `PUT /api/v1/statuses/:id/interaction_policy`;
- `PATCH /api/v1/accounts/update_credentials` using `source[quote_policy]`;
- `GET /api/v1/preferences` for `posting:default:quote_policy`;
- status fields `quote`, `quote_approval`, `quotes_count`, and normalized quote state.

Mastodon's `quote` and `quoted_update` notification types still require explicit notification-type registration and presentation work. They are not claimed complete by this change.

## Compatibility rules

Mastodon quote wrappers are normalized into the existing canonical quoted-status relationship only for the accepted state. Pending, rejected, revoked, deleted, unauthorized, blocked, muted, and unknown states do not expose nested quoted content. Unknown states fail closed as unauthorized.

Mastodon API-v7 creation converts Mangane's inherited `quote_id` compose field to `quoted_status_id`. Older quote implementations keep `quote_id`. Editing removes quote identifiers because Mastodon does not permit changing or removing the quoted post through status editing.

Mastodon quote posts cannot include media attachments or polls. Mangane rejects those combinations before submission rather than silently discarding user content.

Quote permission metadata is retained through `quote_approval`. `automatic` and `manual` permit quote authoring; `denied`, `unknown`, and absent policy metadata on an authoritative Mastodon API-v7 status fail closed when consumed by a strict UI surface.

The server-provided `.quote-inline` compatibility paragraph continues to be removed by the existing reviewed HTML transformation before rendering, preventing duplicate quoted links.

## Authority and security

- Quote authorization is not inferred from visibility alone when Mastodon policy metadata is authoritative.
- Revocation and interaction-policy changes are authenticated server operations; local state is updated only from returned server entities.
- Status IDs are URL encoded before use in quote endpoints.
- Unknown states and policies do not expose nested status content.
- Existing filters, blocks, mutes, domain policy, visibility checks, and canonical status rendering remain authoritative.
- No second status store, renderer, composer, outbox, or retry queue is introduced.

## Remaining presentation work

The API, capability, creation, and normalization boundaries are implemented. Later UI slices may add a posting-default quote-policy selector, per-post interaction-policy sheet, quotes-list surface, explicit pending/revoked placeholders, `quote` and `quoted_update` notification presentation, and a one-tap revoke control. They must reuse this authority and preserve fail-closed behavior.

## Primary references

- Mastodon client quote implementation guide: <https://docs.joinmastodon.org/client/quotes/>
- Mastodon status methods: <https://docs.joinmastodon.org/methods/statuses/>
- Mastodon Quote entity: <https://docs.joinmastodon.org/entities/Quote/>
- Mastodon QuoteApproval entity: <https://docs.joinmastodon.org/entities/QuoteApproval/>
- Mastodon ActivityPub quote extension: <https://docs.joinmastodon.org/spec/activitypub/>
