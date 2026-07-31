# Phase 7B — Collections, Starter Kits, and Safe Rich Embeds

Status: **Implementation in progress**

## Purpose

Add a normalized Mangane experience for public curated account groups and rich post embeds while preserving protocol truth, account consent, moderation, and browser security.

This phase supports:

- Mastodon 4.6 Collections through API version 10;
- Loops Starter Kits through the published Loops API;
- Pixelfed Starter Kits when a connected Pixelfed deployment exposes a compatible endpoint;
- embedded media from YouTube, Vimeo, PeerTube, Mastodon, Pixelfed, Loops, and compatible Fediverse providers.

Private timeline lists remain a separate feature. Collections and starter kits are public or discoverable recommendation objects and must not be silently converted into private list membership.

## Mastodon Collections

Mangane supports the Mastodon collection surface:

- `POST /api/v1/collections`;
- `GET /api/v1/collections/:id`;
- `GET /api/v1/accounts/:account_id/collections`;
- `GET /api/v1/accounts/:account_id/in_collections`;
- `PATCH /api/v1/collections/:id`;
- `DELETE /api/v1/collections/:id`;
- `POST /api/v1/collections/:collection_id/items`;
- `DELETE /api/v1/collections/:collection_id/items/:id`;
- `POST /api/v1/collections/:collection_id/items/:id/revoke`.

Capability is determined from `api_versions.mastodon >= 10`, not solely from software-name detection. OAuth registration and reauthorization must request `read:collections` and `write:collections` before mutation controls are considered complete.

Mangane preserves Mastodon's consent model:

- accepted and pending membership states remain distinct;
- users can revoke their own inclusion;
- sensitive collections retain their warning state;
- blocked or otherwise hidden accounts are not reintroduced client-side;
- there is no automatic Follow All action for Mastodon Collections unless Mastodon later publishes such an API and product contract.

## Loops Starter Kits

Mangane normalizes Loops Starter Kits without pretending they are Mastodon Collections. Supported operations include:

- listing the current account's kits;
- retrieving kit details and accounts;
- applying or re-applying a kit through the server endpoint;
- preserving creator, discoverability, sensitivity, hashtags, usage counts, and ownership metadata;
- honoring membership approval, rejection, and revocation semantics when those controls are exposed in Mangane UI.

The Loops server remains authoritative for the bulk-follow operation. Mangane does not issue an unbounded series of client-side follow requests as an imitation.

## Pixelfed Starter Kits

Pixelfed's official Starter Kits project historically exists as a separate onboarding mechanism and deployments vary in how it is exposed. Mangane probes a bounded `/api/v1/starter-kits` compatibility endpoint and fails closed when unavailable.

A missing endpoint is treated as unsupported, not as an empty authoritative server result. Before create, edit, membership, or apply operations are enabled, the connected Pixelfed deployment must publish a verified capability and response contract. Mangane must not guess routes from another Pixelfed service or send credentials to a third-party starter-kit host.

## Normalized model

All providers map into `DiscoveryPack` for presentation only. Provider-specific IDs, permissions, membership state, and actions remain owned by their adapters.

The normalized model includes:

- provider;
- canonical pack ID and URL;
- owner identity;
- name and description;
- language, topic, sensitivity, and discoverability;
- item count and bounded account summaries;
- whether the provider offers an authoritative apply-all operation;
- whether the current user owns the object.

Mangane never merges objects from different providers solely because their titles match.

## Embed policy

Embeds are activated only after an explicit user action. A preview image, title, description, provider, and original-page link remain available before activation and after closing the embed.

The first supported provider set is:

- YouTube and YouTube Privacy-Enhanced Mode;
- Vimeo player URLs;
- PeerTube same-origin embed URLs;
- Mastodon, Pixelfed, and Loops same-origin embed URLs identified by provider metadata;
- other same-origin Fediverse embed paths that satisfy the bounded path policy.

Security requirements:

- HTTPS only;
- exact host allowlists for YouTube and Vimeo;
- same-origin relationship between post URL and embed URL for decentralized providers;
- no raw server-provided HTML execution;
- sandboxed iframes;
- no referrer disclosure;
- lazy loading;
- explicit accessible play, close, and original-page actions;
- no autoplay before consent;
- no embed URL treated as authorization;
- existing content warnings and media visibility continue to apply;
- external fallback when an embed is unsupported or blocked.

The current iframe sandbox permits scripts, same-origin execution within the provider origin, presentation, and provider-initiated popups. It does not permit top-navigation, forms, downloads, storage-access escalation, or unrestricted browser capabilities.

## Presentation

Collections and starter kits appear alongside, but visually separate from, private lists. Cards should use clear provider labels, account counts, topic metadata, sensitivity treatment, and an original-source link.

Rich embeds use the existing canonical link-preview card and replace the preview area only after activation. The card retains editorial hierarchy and does not become a bare iframe.

## Testing and completion gates

Required coverage includes:

- Mastodon API version detection;
- collection input bounds and account deduplication;
- Mastodon CRUD, membership removal, and revocation fixtures;
- Loops list, detail, apply, membership, and error fixtures;
- Pixelfed supported and unsupported capability fixtures;
- provider normalization without cross-provider ID collision;
- malicious URL, non-HTTPS, cross-origin, deceptive provider-name, and malformed-response tests;
- iframe sandbox, consent, keyboard, focus, reduced-motion, and content-warning tests;
- account switching and authorization scope tests;
- generated network, design, persistence, documentation, and HTML-safety authority reconciliation.

This phase is complete only after the remaining OAuth scope, full management UI, provider fixtures, translations, accessibility tests, generated authority updates, and CI gates are green.
