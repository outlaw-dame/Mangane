# Creator Attribution Research Sources

Status: **Supporting research / non-canonical source register**

Date: 2026-07-29

This source register supports [`PHASE_8B_CREATOR_ATTRIBUTION.md`](./PHASE_8B_CREATOR_ATTRIBUTION.md). The phase document is the implementation authority.

Primary sources consulted:

- Mastodon user profile documentation: Author attribution and `fediverse:creator` publication markup.
- Mastodon `PreviewCard` REST entity documentation: `authors`, deprecated `author_name`/`author_url`, and `missing_attribution`.
- Mastodon `PreviewCardAuthor` entity documentation: `name`, `url`, and nullable resolved `account`.
- Mastodon account API documentation: `attribution_domains[]` support in `PATCH /api/v1/accounts/update_credentials`.
- Mastodon Account/Profile entity documentation: authenticated source/profile attribution-domain fields.
- Mastodon ActivityPub documentation: `attributionDomains` extension.
- Mastodon engineering and release posts covering the initial 4.3 author-attribution feature and the 4.6 `missing_attribution` addition.

Implementation agents must re-check current upstream documentation and representative server fixtures before coding because API versions, profile endpoints, and interoperability may evolve.
