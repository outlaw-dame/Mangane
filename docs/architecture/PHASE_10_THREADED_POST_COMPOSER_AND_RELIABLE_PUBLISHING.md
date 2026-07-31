# Phase 10 — Adaptive Publishing, Articles, Formatted Notes, and Reliable Authored Sequences

Status: **Accepted target / queued after Phase 9 and required Phase 5–8D dependencies**

Last updated: 2026-07-31

## Purpose

Create one clean adaptive publishing and presentation system for ordinary posts, formatted notes, articles, article and blog link previews, and intentional authored sequences. The phase covers the complete lifecycle: truthful content classification, composition, capability-safe publication, feed presentation, reading, engagement, continuation, and durable recovery.

This phase expands the existing canonical Phase 10 composer and publishing slot. It does not create a new numbered phase, proprietary federated thread object, second draft store, second media uploader, second outbox, second publication client, or second conversation graph.

Each successfully published thread segment remains an ordinary canonical Fediverse status. Segment 2 replies to segment 1, segment 3 replies to segment 2, and so on. Native articles, rich notes, long plain notes, external article links, and authored sequences retain their canonical protocol identities while Mangane projects the richest truthful presentation supported by the available evidence. Phase 9 remains the canonical conversation and authored-sequence graph authority.

## Product outcome

A user can:

- write one post or add additional connected posts before publishing;
- paste long text and choose a safe proposed split into multiple connected posts;
- review, edit, reorder, remove, or merge unpublished segments;
- attach media, alt text, content warnings, language, and supported per-status options to each segment;
- publish through one **Post thread** action;
- see exact publication progress and recover after refresh, suspension, offline transitions, rate limits, or partial server success;
- continue an already-published authored sequence from an existing post;
- understand when an authored sequence is complete, partial, still publishing, or only inferred from remote statuses.

The default surface remains clean and minimal. Thread controls use the semantic Phosphor icon authority and plain labels. Decorative emoji are not the primary runtime control language.

## Research-informed direction

### Meta Threads ideas to emulate

Mangane should emulate the strongest product characteristics of Meta Threads’ multi-post composer:

- compose multiple connected posts in one session;
- add another segment without first publishing the previous one;
- review the whole sequence before publication;
- let each segment carry its own text and supported attachments;
- provide one final publication action;
- offer automatic division of over-limit pasted text into connected posts;
- preserve a clear visual connector and segment order without excessive chrome.

Mangane must improve on this model through local-first drafts, protocol capability truth, durable resumable publication, explicit partial-success recovery, account isolation, accessibility, and reversible migration.

### Phanpy ideas to retain

Mangane may retain Phanpy’s useful lightweight behaviors:

- a fast **Continue thread** action from an existing post by the signed-in author;
- compact thread-position or continuation cues while reading;
- honest fallback when the total authored sequence cannot be proven;
- restrained use of icons and labels;
- no requirement that every ordinary self-reply be treated as a deliberately composed thread.

Phanpy’s shortcut is not sufficient as the primary architecture because it composes one reply at a time after publication. Mangane’s primary flow coordinates the unpublished sequence first, then publishes it reliably.

## Terminology and collision boundaries

### User-facing terminology

Use:

- **Add post** — append another unpublished segment;
- **Post thread** — publish the prepared authored sequence;
- **Continue thread** — append a new post to an already-published same-author sequence;
- **Thread draft** — a saved unpublished multi-segment composition;
- **1 of 4** or **Post 1 of 4** — composition and progress cues.

Avoid exposing internal protocol terms such as `in_reply_to_id`, outbox job, publication run, or canonical alias.

### Internal terminology

Use collision-resistant domain names:

- `authoredSequenceDraft`;
- `authoredSequenceSegment`;
- `authoredSequencePublicationRun`;
- `authoredSequenceContinuation`;
- `authoredSequenceProjection`;
- `authoredSequenceId` only for local coordination identity.

Avoid generic or overloaded names such as:

- `Thread`;
- `ThreadStore`;
- `ThreadNode`;
- `PostQueue`;
- `PublishQueue`;
- `DraftStore`;
- `ComposerState` as a new global authority;
- `Conversation` for unpublished composition state.

“Thread” is already used broadly for reply conversations and Phase 9 reading. Internal authored-sequence names prevent accidental coupling between composition and conversation projection.

## Non-negotiable authority model

### Canonical status and reply authority

Published segments are ordinary statuses normalized through existing protocol and canonical status authorities. Their parent/child relationships use normal reply semantics.

Mangane must not:

- invent a proprietary ActivityPub `Thread` object;
- replace canonical status URIs with a local sequence identifier;
- require remote servers to understand Mangane-specific metadata;
- store duplicate published status bodies in a separate thread database;
- infer publication success solely from a client timeout or optimistic local state.

### Draft authority

Phase 5’s account-scoped draft repository remains the canonical local draft authority. Phase 10 extends its versioned schema to represent a bounded ordered sequence of segment references and per-segment draft payloads.

There is no second IndexedDB table solely because the composer contains multiple segments unless a schema review proves that extending the canonical draft authority is unsafe or unworkable. Any separate table would require an ADR and explicit ownership/migration evidence.

### Durable mutation authority

Phase 6’s durable outbox and synchronization reconciliation remain the sole durable mutation authority. Phase 10 adds an authored-sequence orchestration contract over ordinary status-publication commands.

The orchestration layer may coordinate dependency order and aggregate progress, but it must not create a second retry queue, background-sync queue, service-worker outbox, or publication client.

### Protocol authority

Protocol adapters remain authoritative for:

- status character and byte limits;
- visibility and audience options;
- reply/quote controls;
- content types, Markdown, and MFM capabilities;
- media count, type, size, processing, and alt-text constraints;
- poll constraints;
- scheduling support;
- language support;
- idempotency capabilities;
- edit support;
- local-only or backend-specific options;
- response identifiers and canonical URI resolution.

Presentation components consume capability projections. They do not branch directly on backend names.

### Conversation reading authority

Phase 9 owns reading and presentation of published reply graphs. Phase 10 may provide strong local provenance that a chain was deliberately composed together, but it does not create another conversation graph or thread renderer.

## Dependencies

Phase 10 depends on:

- Phase 5 account-scoped canonical drafts, statuses, media metadata, migrations, retention, corruption handling, and purge;
- Phase 6 durable outbox, ordered mutation reconciliation, idempotency, retry, cancellation, generation fencing, and multi-tab ownership;
- Phase 7 application commands, queries, protocol capabilities, typed errors, account scope, and legacy adapters;
- Phase 8 canonical Framework7 status/card rendering and adaptive presentation foundations;
- Phase 8D content-source preservation, Markdown/MFM classification, preview, sanitization, and authoring capabilities;
- Phase 9 canonical conversation graph and author-continuation projection for published sequences;
- existing canonical media upload, poll, scheduling, visibility, content-warning, language, quote, edit, and status publication paths;
- Phase 2 semantic controls, icons, focus, motion, and accessibility contracts;
- Phase 3 Framework7 shell and route/session behavior;
- Phase 4 PWA offline, update, storage, and lifecycle hardening.

Phase 10 must not duplicate or rename these authorities.

## Current Mangane baseline

The inherited composer already supports a substantial set of single-status behaviors through Redux actions, backend capability checks, media upload, poll state, content warnings, visibility, scheduling, editing, drafts, reply context, and status publication.

Phase 10 begins with a repository-wide authority inventory rather than assuming these paths are uniform or safe to replace. The implementation must preserve supported Akkoma, Pleroma, Mastodon-compatible, Mitra, and Misskey-compatible behavior behind adapters.

Known target gaps include:

- no first-class pre-publication multi-segment sequence;
- no single durable progress model for sequential publication;
- no safe automatic split preview for over-limit pasted text;
- no coherent partial-publication recovery surface;
- no canonical later-continuation command;
- no deliberate-sequence provenance contract shared with Phase 9;
- likely duplicated or component-local inherited composer state that must be inventoried before migration.

## Adaptive publishing intentions

The composer and reading system distinguish user intent without forcing every backend to support identical remote object types.

### Ordinary post

A normal social post remains the default and must retain the lightest composer and feed presentation.

### Formatted note

A formatted note is a longer socially shaped publication that may contain paragraphs, emphasis, links, quotations, lists, code, Markdown, MFM, or other capability-approved structured text. It remains an ordinary canonical status or note and does not require article framing, a cover, a title, or a publication masthead.

### Article

An article is an intentionally structured long-form work. Where the origin software exposes a native article or document object, Mangane preserves that identity. Where federation or a Mastodon-compatible API flattens the work into a generic `Note`, Mangane may restore an article presentation only when bounded evidence supports that classification.

An article may project a title, subtitle or deck, cover media, creator attribution, publication/provider, lead, sections, headings, lists, quotations, code, embedded canonical posts, citations, footnotes, reading time, edit history, and a table of contents where supported and truthful.

Multiple images do not by themselves prove a carousel or slideshow. Mangane presents article media as an ordered slideshow only when a canonical source, structured article block, or explicitly ordered collection supplies that relationship. An unordered attachment set may still use the ordinary media gallery, but presentation must not invent slide order or narrative meaning.

### Authored sequence

An authored sequence is a deliberate chain of ordinary statuses connected by canonical reply relationships. It retains exact per-status identity and actions while supporting an optional continuous reader projection.

### Capability-safe conversion

Before publication, Mangane may offer explicit, previewable conversion between compatible intentions:

- formatted note to article;
- article highlights to an authored sequence;
- long note to authored sequence;
- authored-sequence draft to formatted note;
- article plus a separately published teaser sequence.

Conversion must never silently discard media, source formatting, citations, warnings, audience settings, or unsupported blocks. Lossy conversion requires a precise warning and keeps the original draft revision recoverable.

## Content presentation classification authority

Phase 10 adds one bounded `contentPresentationClassification` projection. It is not another status store, parser, creator resolver, preview-card authority, or protocol adapter.

The classifier consumes normalized evidence from existing authorities and returns a presentation recommendation rather than changing canonical object truth.

```ts
interface ContentPresentationClassification {
  kind:
    | 'ordinary-post'
    | 'formatted-note'
    | 'native-article'
    | 'article-like-note'
    | 'external-article-link'
    | 'external-blog-link'
    | 'authored-sequence'
    | 'unknown-long-form';
  confidence: 'high' | 'medium' | 'low' | 'abstain';
  evidence: readonly ContentPresentationEvidence[];
  provenance: readonly ContentPresentationProvenance[];
  completeness: 'complete' | 'partial' | 'unknown';
  fallback: ContentPresentationFallback;
}
```

### Evidence inputs

Classification may consider:

- native ActivityPub object type and documented extension types;
- documented API fields or endpoint contracts;
- title, subtitle, summary, source and rendered-body relationships;
- canonical URL and linked-work relationships;
- cover, lead image, media structure and attachment roles;
- verified or metadata-only creator attribution from Phase 8B;
- publication/provider metadata;
- structured article metadata associated with an approved preview-card observation;
- content type and source syntax from Phase 8D;
- headings, paragraphs, lists, quotations, code blocks and other semantic structure;
- deliberate local authored-sequence provenance;
- Phase 9 canonical same-author continuation relationships;
- direct-origin and connected-server observations with field provenance;
- edits, deletions, tombstones, content warnings and visibility.

No individual payload may be classified solely from the server software name, instance domain, URL shape, body length, or the presence of one heading-like line.

### Confidence and abstention

The classifier must abstain when evidence is contradictory or insufficient. A generic Note must never be promoted to an article merely because it is long. A linked page must never be called an article merely because it has a large preview image.

Low-confidence enrichment may improve typography and truncation without applying an authoritative **Article** label. Diagnostics expose only bounded classification codes and counts, never article bodies, URLs containing secrets, draft text, or private creator information.

### Field-level provenance

Classification does not merge entire payloads by source priority. Title, source, body, creator, publication, canonical URL, cover, and content-type observations retain independent provenance and freshness. Origin-authoritative public fields, connected-server viewer state, local canonical state, and linked-work metadata keep their existing authority boundaries.

## Article media-sequence parsing authority

Phase 10 owns one bounded `articleMediaSequence` projection for native articles, article-like notes, and approved linked-work metadata. Phase 24 consumes this projection for immersive presentation; it does not reparse article HTML or create a second media model.

```ts
interface ArticleMediaSequence {
  schemaVersion: 1;
  articleIdentity: CanonicalContentRef;
  revisionIdentity: string;
  ordering: 'explicit' | 'source-block-order' | 'unknown';
  presentation: 'carousel' | 'slideshow' | 'gallery' | 'fallback';
  items: readonly ArticleMediaItem[];
  provenance: readonly ContentPresentationProvenance[];
  completeness: 'complete' | 'bounded-overflow' | 'partial' | 'unknown';
}

interface ArticleMediaItem {
  stableItemKey: string;
  mediaRef: CanonicalMediaRef;
  role: 'cover' | 'lead' | 'inline' | 'slide' | 'gallery' | 'unknown';
  position?: number;
  altText?: string;
  caption?: string;
  credit?: string;
  sensitive: boolean;
  provenance: readonly ContentPresentationProvenance[];
}
```

### Accepted evidence and ordering

The parser accepts only normalized data from existing protocol adapters or the approved Phase 8B linked-work metadata boundary:

- native article/document blocks whose media positions are part of the canonical object;
- ActivityStreams `image` and `attachment` objects, including explicitly ordered `OrderedCollection.orderedItems`;
- connected-server media attachments with canonical IDs and documented roles;
- typed, bounded metadata emitted by an approved server-side linked-work extractor;
- a Mastodon PreviewCard as one preview image only.

A PreviewCard never proves that the linked article contains a gallery or slideshow. Repeated Open Graph images, DOM proximity, CSS class names, filenames, URL numbering, or page layout heuristics may be recorded only by an approved extractor as low-confidence observations; they cannot independently create an ordered slideshow. When order is not explicit, `ordering` is `unknown` and controls must use gallery language rather than “slide N of M.”

### Safe parsing and normalization

- External article HTML is never fetched directly by the PWA, returned to presentation code, persisted in browser storage, or inserted into the DOM. Phase 8B's HTTPS, SSRF, redirect, DNS-rebinding, byte, timeout, content-type, and credential-stripping controls remain mandatory for linked-work extraction.
- Native rich content is sanitized through the canonical HTML policy. Any inert parser extracts allowlisted typed fields only; parsed nodes are never reinserted, event handlers and active content are discarded, and every emitted media/link URL passes the central URL policy.
- Only supported passive raster-image media types are eligible for image sequences. SVG, HTML, scripts, `data:`, `blob:`, `file:`, `javascript:`, ambiguous MIME data, and credential-bearing URLs fail closed to the ordinary safe fallback.
- Item count, source depth, string lengths, dimensions, decoded size, redirects, and processing time have explicit tested bounds. Overflow is represented honestly and offers an open-origin fallback; it is not silently discarded or recursively fetched.
- Deduplication uses canonical media identity and source role, not a lossy URL-only guess. The same resource referenced twice for distinct evidenced roles remains representable; exact duplicate observations merge provenance deterministically.
- Alt text, caption, credit, sensitive state, focal point, and role retain field-level provenance. A caption never substitutes for missing alt text without an explicit accessible-text policy, and generated descriptions are labeled rather than attributed to the author.
- A slideshow is selected only for explicit narrative ordering. A carousel is a responsive presentation of an evidenced media sequence; a gallery is the honest fallback for unordered media. Ordinary status attachments continue through the canonical media-gallery authority.

### State, edits, and restoration

Viewer position is keyed by account scope, canonical article identity, revision identity, and `stableItemKey`, never by array index alone. On edit, alias migration, moderation change, deletion, or reordered media, restoration resolves the same safe item where possible; otherwise it clamps to the nearest valid item, announces the change accessibly, and never opens a different sensitive item silently. Stale or corrupt viewer state is rebuildable and cannot grant access to media that the current account may not view.

## Cross-platform compatibility and fixture matrix

Phase 10 cannot be implemented from nominal protocol support alone. The first implementation slice must inventory every software family Mangane currently supports or explicitly targets that can emit native articles, rich notes, Markdown, MFM, long plain notes, external article previews, or same-author continuations.

At minimum, the inventory must cover applicable versions and representations from:

- Mastodon and Mastodon-compatible APIs;
- Akkoma and Pleroma;
- Mitra;
- Misskey and compatible/forked software already supported by Mangane;
- article- or blog-oriented ActivityPub software encountered by supported discovery and preview flows, including applicable WriteFreely, WordPress ActivityPub, Ghost or equivalent fixtures when available;
- direct-origin ActivityPub representations and the corresponding federated representation as observed through supported connected servers.

The list is evidence-driven and must be updated when repository adapters or supported-platform documentation changes. A named platform does not imply every version supports every content type.

### Required fixture dimensions

Versioned sanitized fixtures must capture, where applicable:

- raw ActivityPub object type and extension fields;
- Mastodon-compatible API representation;
- source content, content type and rendered content;
- title, subtitle, summary and body;
- canonical URL and origin identity;
- cover and attachment roles;
- ordered and unordered multi-image structures, per-item roles, captions, alt text, credits and sensitive state;
- status author, linked-work creator and publication/provider;
- `fediverse:creator`, Mastodon preview-card `authors[]`, legacy author fields and missing-attribution state;
- Markdown, MFM, HTML and plain-text degradation;
- reply and authored-continuation relationships;
- edits, deletes, tombstones and changed canonical URLs;
- visibility, content warnings, moderation and filtered state;
- fields lost, rewritten or flattened by Note-centric federation and APIs.

### Required assertions

Every fixture family must pass assertions for:

- canonical normalization;
- field provenance and alias resolution;
- classification outcome, confidence and abstention;
- article card, formatted-note card, link preview and ordinary fallback;
- article reader, formatted-note reader and authored-sequence reader;
- carousel/slideshow/gallery classification, explicit-order preservation, overflow fallback and edit-safe restoration;
- creator tag and publication/provider treatment;
- keyboard, screen-reader, reflow, RTL, forced-colors and reduced-motion behavior;
- warnings, moderation, blocked/muted creators, deleted content and unavailable origins;
- direct-origin versus federated equivalence and honest differences;
- no raw-payload access from presentation components.

Golden fixtures must be versioned with collection date, software/version evidence, retrieval surface, expected degradation, and a documented refresh process. Tests must not depend on live third-party servers.

## Creator-tag-aware cards and previews

Phase 8B remains the only creator/entity authority. Phase 10 consumes its projected creator attribution and must never independently resolve or verify a creator.

### Identity separation

Article cards, blog/article link previews, readers, search results and related-content surfaces distinguish:

- **status author** — the account that posted or shared the status;
- **linked-work creator** — one or more people or accounts credited with creating the work;
- **publication/provider** — the publication, site or service hosting or publishing it.

The same actor may occupy more than one role, but the data model and accessible output must not collapse the roles merely because names match.

### Creator tag rules

- verified Fediverse creator attribution uses the canonical Phase 8B creator tag and links to the verified canonical account;
- metadata-only creator attribution is labeled honestly and may link to the canonical author URL only through the approved URL policy;
- multiple creators are supported from the start with bounded display and an accessible full list;
- blocked, muted, suspended or inaccessible creator identities follow moderation policy before avatars, names, counts or labels are projected;
- missing or conflicting attribution causes omission or an honest generic byline, never invented attribution;
- article and blog link previews use the creator tag when attribution applies;
- the full article reader repeats the creator tag near the title/byline and preserves publication/provider separately.

### Article and blog link-preview card

A high-confidence article/blog preview may include:

- quiet semantic content-type label;
- title and optional subtitle;
- cover or lead media with alt text and focal-point behavior;
- creator tag;
- publication/provider;
- bounded description or opening excerpt;
- reading-time estimate and section count only when derived reproducibly;
- **Read article** or **Read post** according to classification;
- ordinary reply, Share, favorite, bookmark, quote and moderation actions for the containing social status.

When an approved article-media sequence is available, the card may show one deterministic representative image plus a bounded count. Feed cards do not eagerly fetch every slide, auto-advance, or imply a slideshow when only the PreviewCard image is known.

Opening the linked work and engaging with the containing social status are distinct controls and accessible actions.

## Feed presentation profiles

Presentation applies consistently across Home, For You, lists, profiles, search, Explore, notifications, conversation views and Shared projections. Each surface may choose density, but it consumes the same classification and attribution contracts.

### Article profile

A native or high-confidence article-like object renders as a beautiful article card rather than an enormous generic status body. Dense feeds use a bounded excerpt; detail opens the dedicated article reader. Social identity, visibility, warnings and engagement remain visible.

### Formatted-note profile

A formatted note receives formatting-aware truncation, semantic block preservation, an optional reading-time cue and **Continue reading**. It opens a lighter long-form reader and must not masquerade as an article.

### Authored-sequence profile

A verified or sufficiently evidenced authored sequence may render as a compact sequence card with:

- opening segment;
- subtle continuation connector;
- verified count or honest partial-count language;
- representative media selected by deterministic rules;
- bounded continuation preview;
- reading-time estimate where reproducible;
- **Read thread** or **Reader view**;
- a direct route to the post-by-post conversation representation.

The compact projection must not merge outside replies, hide content warnings, leak moderated actors, fabricate missing segments, or aggregate engagement into a nonexistent remote sequence object.

### Unknown and degraded profile

When classification abstains, Mangane uses the safe canonical status and preview rendering. Enrichment failure must never hide content that the viewer is authorized to see or trap the user in a broken reader.

## Long-form readers

### Article reader

The article reader is a clean reading surface with bounded line length, responsive semantic typography, strong media treatment, content-warning enforcement, creator tag, publication/provider, publication and edit dates, language, reading progress and semantic position restoration.

It may provide a section outline or table of contents only from verified semantic headings. Reader settings must reuse canonical tokens and browser accessibility behavior rather than applying arbitrary author fonts, colors or scripts.

The article reader preserves:

- canonical origin and open-origin action;
- status author/share context when the article arrived through a social status;
- creator tag and creator navigation;
- publication/provider link;
- reply, Share, favorite, bookmark, quote and moderation actions against the appropriate canonical social object;
- edits, deletion, tombstone and unavailable-origin states;
- sanitization, URL policy, embed policy and media constraints.

For an evidenced media sequence, the reader preserves source order, per-item alt text/captions/credits, content-warning state, and stable restoration identity. Controls expose previous/next and a direct item chooser, announce the current item and total when total is known, retain focus predictably, and support touch without making swipe the only operation. Auto-advance is off by default; reduced motion disables nonessential transitions; data-saver mode loads only the selected item and bounded adjacent previews.

### Formatted-note reader

The note reader is intentionally lighter than the article reader. It preserves the author’s semantic formatting but avoids a publication masthead, invented title, fabricated cover, or table of contents unless those elements exist in the canonical source.

### Authored-sequence reader

The continuous reader removes repeated same-author chrome while retaining semantic boundaries, media positions, warnings, edits, missing-segment markers and per-segment canonical links.

It must provide **View as posts** and restore the same focused location in Phase 9’s post-by-post conversation view. Outside replies begin in a clearly separated discussion region and are never incorporated into the authored body.

Reader-level engagement summaries are projections only. Reactions, replies, shares, bookmarks and moderation actions continue to belong to individual canonical statuses.

## Engagement and navigation contract

Rich presentation must preserve normal social behavior and make target identity explicit.

Required actions include, where supported and authorized:

- reply to the containing status or selected sequence segment;
- Share, favorite and bookmark the canonical status;
- quote the appropriate canonical status;
- open the origin object;
- open the linked canonical publication;
- copy the canonical social link or linked-work link through distinct actions;
- navigate to the status author;
- navigate through the creator tag;
- navigate to the publication/provider;
- report, mute, block, filter or otherwise moderate through existing authorities;
- switch between article/note/thread reader and exact social representation.

A whole-thread reaction, bookmark or reply must not be invented unless a supported remote object actually provides that semantic. When the user acts from a continuous reader, the UI identifies which canonical segment receives the action.

## Structured authoring blocks

Article and formatted-note authoring should use bounded semantic blocks rather than arbitrary visual styling.

Initial candidates include paragraph, heading levels 2–3, bulleted list, numbered list, block quote, code block, divider, media, canonical-post embed and safe link preview. Inline formatting may include bold, italic, strikethrough, code and link.

The initial implementation should reject arbitrary font families, arbitrary font sizes, arbitrary colors, custom CSS, raw HTML, scripts, floating objects and unbounded nesting. Source preservation and loss-aware conversion remain governed by Phase 8D.

## Presentation security and privacy

- classification never bypasses visibility or connected-server authorization;
- creator and publication metadata are moderated before display and accessible labeling;
- linked-work extraction reuses approved preview/entity authorities and their SSRF, redirect, DNS, size, timeout, parser and cache-poisoning protections;
- no connected credentials are sent to an origin or linked publication;
- private bodies, draft source, hidden segments and content-warning text are excluded from diagnostics;
- reader caches remain account scoped where viewer state or restricted content is involved;
- classification and reader projections are bounded, rebuildable and purgeable;
- stale classifications invalidate on edit, deletion, creator-proof change, preview change, alias migration, moderation change or origin revision.
- media-sequence parsing never turns the browser into an arbitrary article fetcher, never forwards connected-account cookies or authorization headers, and requires a no-referrer, credential-minimizing image/proxy policy that does not expose account identifiers to slide origins;
- slideshow selection requires explicit ordering evidence, while malformed, oversized, active, unsupported, or ambiguous media degrades to the canonical safe card/gallery.

## Authored sequence draft model

### Draft contract

```ts
interface AuthoredSequenceDraft {
  schemaVersion: 1;
  accountScopeKey: string;
  authoredSequenceDraftId: string;
  createdAt: string;
  updatedAt: string;
  mode: 'new-sequence' | 'continue-published-sequence';
  continuationParent?: PublishedStatusRef;
  segmentOrder: readonly string[];
  segmentById: Readonly<Record<string, AuthoredSequenceSegmentDraft>>;
  inheritedSettings: AuthoredSequenceInheritedSettings;
  publicationRunId?: string;
  revision: number;
}

interface AuthoredSequenceSegmentDraft {
  authoredSequenceSegmentId: string;
  textSource: string;
  contentType: SupportedComposerContentType;
  contentWarning?: string;
  language?: string;
  mediaDraftRefs: readonly string[];
  pollDraftRef?: string;
  quoteTargetRef?: string;
  visibilityOverride?: SupportedVisibility;
  interactionPolicyOverride?: SupportedInteractionPolicy;
  scheduledAtOverride?: string;
  sourceSplit?: AuthoredSequenceSplitProvenance;
  revision: number;
}
```

The precise types may evolve, but the following separation is mandatory:

- local draft sequence identity;
- local segment identity;
- published canonical status identity;
- publication-run identity;
- media-upload identity;
- outbox-command identity.

No identifier may be reused across these domains merely because values happen to match.

### Draft bounds

Policy must define and test:

- maximum segments per draft;
- maximum aggregate source characters and bytes;
- maximum aggregate media references;
- maximum serialized record size;
- maximum retained sequence drafts per account;
- per-segment and aggregate content-warning bounds;
- bounded revision history or explicit absence of history;
- expiry and retention behavior;
- storage-pressure behavior that never silently deletes an actively edited draft.

Limits should be capability- and device-aware but must have hard global ceilings.

### Account and instance isolation

Every read, write, reorder, delete, restore, publish, continue, retry, and purge operation requires exact account and instance scope.

Required tests include:

- guessed draft IDs across accounts;
- stale route state after account switch;
- publication callbacks arriving after account change;
- multi-tab edits under different active accounts;
- imported or restored draft payloads with forged scope;
- aliases that point to a status belonging to another connected account context.

All fail closed without exposing whether another account’s draft exists.

## Composer interaction model

### Default single-post simplicity

The composer must remain lightweight for ordinary posting.

A new composition begins as one segment. Additional sequence UI appears only when the user:

- selects **Add post**;
- accepts a proposed long-text split;
- opens a saved thread draft;
- chooses **Continue thread** from an authored status.

Single-post composition must not feel like managing a list or project.

### Segment presentation

Each segment shows:

- restrained vertical continuity;
- the author avatar only where it aids orientation, not repeated decorative clutter;
- an unobtrusive order cue such as `1 of 3`;
- its text editor and supported attachments/settings;
- a semantic drag/reorder handle only while reordering is available;
- remove, merge, or segment actions in an overflow menu where appropriate;
- capability and validation messages local to that segment.

The active segment receives clear focus and visual emphasis without hiding the rest of the sequence.

### Add post

**Add post** appends a new segment after the active segment or at the end according to one documented rule. The action must be reachable through touch, keyboard, switch control, and screen-reader navigation.

Use the semantic icon registry, likely a plus-circle/add-item concept. Do not use an emoji as the only icon or accessible name.

### Reordering

Reordering is allowed only before publication begins.

Requirements:

- drag-and-drop is optional, not the only mechanism;
- provide Move earlier / Move later commands;
- preserve focus after movement;
- update reply dependency order deterministically;
- never reorder uploaded media independently of its owning segment;
- prevent reordering once any segment has confirmed publication unless an explicit recovery workflow creates a new draft for remaining unpublished segments.

### Removing and merging

Before publication, the user may remove an empty or populated segment after confirmation where data would be lost.

A merge action may combine adjacent text segments when content types and capability constraints permit. It must not silently drop media, polls, content warnings, language, scheduling, or interaction policy. Unsupported merges fail with a precise explanation.

## Safe long-text splitting

### User-controlled proposal

Mangane may propose splitting pasted or imported text when it exceeds the active server capability limit. It must not silently rewrite the draft into multiple posts.

Example:

```text
This text exceeds the current post limit.
Split into 4 connected posts?

[Review split] [Keep editing]
```

The user reviews and may adjust every boundary before accepting.

### Split policy

The splitter operates on source text before rendering or sanitization and respects the active content type.

Preferred boundaries:

1. paragraph boundaries;
2. sentence boundaries;
3. clause or line boundaries;
4. whitespace boundaries;
5. grapheme-cluster-safe hard boundaries only as a last resort.

It must not split inside:

- URLs;
- email-like addresses where linkification applies;
- mentions or handles;
- hashtags;
- custom emoji shortcodes;
- Unicode emoji grapheme sequences;
- Markdown links;
- fenced or inline code where the parser requires balance;
- MFM constructs;
- HTML entities;
- content-warning metadata;
- backend-specific source tokens;
- attachment references.

If a single unsplittable token exceeds the server limit, the splitter abstains and explains why.

### Count authority

The splitter must use the same canonical counting contract used by final validation and publication. It cannot use JavaScript string length as an approximation when the server counts URLs, graphemes, bytes, markup, or custom content differently.

When exact server-side counting cannot be reproduced, Mangane must leave a safety margin, validate through the capability adapter, and handle server rejection without losing the draft.

### Split provenance

Store bounded local provenance sufficient to:

- show that segments came from one source paste;
- support undo before further edits;
- avoid repeatedly offering the same split;
- preserve original source locally only while needed and within retention/privacy bounds.

Do not include original long text in diagnostics or telemetry.

## Settings inheritance and overrides

### Thread-level inherited settings

The sequence establishes defaults for:

- account and instance;
- visibility/audience;
- language;
- content warning policy;
- interaction/reply controls;
- scheduled publication intent;
- content type where supported;
- local-only or backend-specific publishing options.

New segments inherit these settings at creation.

### Segment-level overrides

Overrides are permitted only where:

- the backend supports the option per status;
- the resulting parent/child sequence remains visible and understandable;
- validation can explain consequences before publication.

Mangane should warn or block when a later segment would be broader than its parent, unavailable to the parent’s audience, scheduled before its parent, or otherwise likely to create a broken sequence.

A conservative first release may require one visibility, interaction policy, and scheduled time across all segments while allowing text, media, language, and content warnings per segment.

### Content warnings

Each segment may have its own content warning where supported. A thread-level action may apply or clear the same warning across all unpublished segments after confirmation.

Collapsed previews must not expose content hidden by a segment warning.

### Polls

Poll support is capability-gated and conservative. A first release should allow at most one poll in an authored sequence unless adapters and UX tests prove multiple polls are interoperable and understandable.

### Quotes and replies

A new authored sequence may quote a status or begin as a reply to an existing status, but the exact relationship must be explicit:

- segment 1 replies to or quotes the external target;
- segment 2 replies to segment 1;
- later segments reply to the immediately preceding confirmed segment.

Do not accidentally make every segment reply directly to the external root.

## Media upload and recovery

Each segment owns its media draft references. Existing media upload authorities remain responsible for upload, processing, validation, alt text, focus/crop metadata, and deletion.

Requirements:

- uploads may occur before publication but must remain associated with exact segment and account scope;
- moving a segment moves its media references with it;
- removing a segment triggers bounded cleanup of unreferenced temporary uploads according to existing policy;
- publication waits for required media processing for that segment, not unrelated later segments unless policy intentionally preflights the entire sequence;
- failures preserve draft text, alt text, and media association;
- retries do not duplicate remote media uploads when reconciliation can prove an existing upload;
- orphan cleanup is resumable and never deletes media referenced by another draft or confirmed status.

## Publication architecture

### Non-atomic remote reality

Most supported Fediverse APIs publish one status at a time. **Post thread** is therefore a coordinated local workflow, not a claim of atomic server publication.

The UI must not imply that all segments either publish together or none publish.

### Publication run contract

```ts
interface AuthoredSequencePublicationRun {
  schemaVersion: 1;
  accountScopeKey: string;
  authoredSequencePublicationRunId: string;
  authoredSequenceDraftId: string;
  draftRevision: number;
  state:
    | 'preflighting'
    | 'ready'
    | 'publishing'
    | 'paused-offline'
    | 'waiting-retry'
    | 'partially-published'
    | 'completed'
    | 'cancelled-before-publication'
    | 'needs-user-action'
    | 'failed-terminal';
  segmentRuns: readonly AuthoredSequenceSegmentPublicationState[];
  startedAt?: string;
  updatedAt: string;
  completedAt?: string;
}
```

A segment publication state records local segment identity, exact outbox command identity, dependency on the prior confirmed segment, attempt/reconciliation state, confirmed local/server IDs, canonical URI when resolved, and typed failure class. It must not duplicate status bodies unnecessarily.

### Preflight

Before enqueuing the first publish command, validate the immutable draft revision:

- account/session remains valid;
- every segment is nonempty according to supported rules;
- counts and content types pass current capabilities;
- media are valid or recoverably processing;
- polls, quotes, visibility, language, content warnings, and scheduling are valid;
- sequence and aggregate bounds pass;
- no unsupported widening or scheduling contradiction exists;
- draft revision has not changed since confirmation;
- service/app update state will not invalidate required schema or commands.

Preflight does not guarantee server acceptance, but it prevents known local failures before any public side effect.

### Sequential dependency

Publication order is strict:

```text
publish segment 1
  -> reconcile confirmed status identity
publish segment 2 as reply to confirmed segment 1
  -> reconcile confirmed status identity
publish segment 3 as reply to confirmed segment 2
```

The next command is not released merely because the prior HTTP request returned. It requires a validated success response or reconciliation proving the status exists with the expected author, content fingerprint or client token, and parent relationship.

### Idempotency and ambiguous outcomes

Use backend idempotency support where available. Otherwise, maintain a local operation token and reconcile before retrying any ambiguous non-idempotent request.

Never blindly retry a timed-out POST when the server may have accepted it. The system must first search approved connected-server/canonical sources for a matching publication outcome within bounded privacy-safe criteria.

Reconciliation must avoid matching an unrelated coincidentally similar post. Use the strongest available combination of:

- explicit idempotency key;
- returned local ID;
- client application marker if supported and privacy-safe;
- exact author/account scope;
- expected parent identity;
- bounded creation-time window;
- content/media fingerprint held locally and never logged;
- server-side scheduled-status identity where applicable.

### Retry policy

Retry behavior belongs to Phase 6’s shared policy:

- bounded attempts;
- exponential backoff with full jitter;
- `Retry-After` support;
- per-account and per-origin budgets;
- offline pause rather than failure churn;
- cancellation and generation fencing;
- no retry for validation, authorization, or policy rejection without user action;
- no retry of ambiguous non-idempotent publication before reconciliation.

### Multi-tab ownership

Only one tab/process may actively advance a publication run. Use the canonical Phase 6 lease/generation authority.

Other tabs may display read-only progress and request takeover only through the approved stale-lease path.

## Partial publication and recovery

### Honest states

When some segments have published and a later segment fails, show exact state:

```text
2 of 4 posts were published.

[Retry post 3] [Edit remaining posts] [Open published thread]
```

Do not describe a partially published sequence as a failed draft without acknowledging public posts already exist.

### Recovery actions

Depending on failure class, permit:

- retry the blocked segment after reconciliation;
- edit only remaining unpublished segments by creating a new draft revision;
- remove a failing remaining segment and re-link subsequent unpublished dependency order after explicit confirmation;
- open the published portion;
- abandon remaining unpublished segments while preserving published truth;
- save remaining segments as a separate draft;
- copy content where policy permits.

Do not automatically delete or roll back already-published statuses. Remote deletion is a separate explicit destructive action with its own partial-failure semantics.

### Refresh, suspension, and update recovery

After page refresh, PWA relaunch, browser suspension, app update, or process termination:

- load the publication run through canonical repositories;
- reacquire or observe the Phase 6 lease;
- reconcile every segment whose outcome is not final;
- restore progress without republishing confirmed segments;
- preserve exact account scope and stop if the required account is unavailable;
- require explicit account activation before resuming if the user switched accounts;
- migrate compatible schema versions transactionally or leave the run paused with actionable guidance.

## Scheduling

Scheduling a multi-post sequence is capability-gated and must not be simulated by unreliable browser timers.

Preferred strategies:

1. a backend-supported coordinated or individually scheduled status chain with resolvable parent dependencies;
2. an approved external durable authority documented by Phase 6A or a later server capability;
3. otherwise, scheduling the entire authored sequence is unavailable.

Because later segments need the confirmed parent ID, ordinary independent scheduled-status APIs may not support reliable threaded scheduling. Mangane must not claim support until an adapter contract proves how parent dependencies are resolved.

A local PWA timer is not sufficient for dependable scheduled publication while the app is closed.

## Continue thread after publication

### Eligibility

Show **Continue thread** only when:

- the active account is the canonical author or has verified permission to post as that identity;
- the target status is available through a valid connected local ID/action mapping;
- the status is not deleted, unauthorized, or otherwise non-repliable;
- the adapter supports replies;
- moderation or server policy does not forbid the action.

### Parent selection

By default, continue from the last verified visible author-continuation segment in the canonical Phase 9 graph, not merely the status currently visible.

If completeness is partial or multiple plausible continuation tips exist, present the selected parent clearly and let the user choose among authorized candidates. Never silently attach to an uncertain branch.

### Continuation provenance

A later continuation is an ordinary reply. Local provenance may mark that the user intentionally invoked **Continue thread**, but remote clients are not required to recognize it.

The UI must distinguish:

- a coordinated pre-publication authored sequence;
- a later intentional continuation;
- an ordinary self-reply;
- a correction/update;
- an inferred remote same-author chain.

Do not rewrite historical remote statuses to force one classification.

## Reading integration with Phase 9

Phase 10 supplies optional strong local provenance to Phase 9. Phase 9 remains responsible for graph truth and presentation.

Possible reading cues:

- `Post 1 of 4` when total length is verified;
- `Part of a thread` when sequence membership is known but total is incomplete;
- `Thread continues` when later author segments exist;
- partial-publication state visible only to the author where appropriate;
- compact root-author continuation lane;
- one action to open the entire authored sequence in context.

A denominator must not be shown unless Mangane can verify the relevant authored sequence boundaries. Missing, deleted, private, or inaccessible segments must not be counted as visible content in a misleading way.

## Editing published sequences

Editing remains status-by-status according to backend capability.

Mangane must not suggest that editing a thread is one atomic operation. It may provide an authored-sequence management view that links to each editable status, but:

- each edit has its own conflict and failure state;
- changing one status does not silently rewrite later parent relationships;
- deleting a middle segment may create missing context and must be represented honestly by Phase 9;
- reordering published segments is not supported because reply parentage is already public protocol state;
- replacing a published segment with a new reply is an explicit workflow, not an edit illusion.

## Minimal visual and icon language

### Icons

Use the canonical semantic icon registry. Candidate semantics include:

- add segment: plus-circle/add-item;
- reorder: drag handle plus accessible move commands;
- thread/sequence cue: a restrained connected-post or branching semantic icon if approved by the registry;
- retry: arrow-clockwise;
- publication progress: spinner/progress indicator;
- partial warning: warning-circle;
- completed: check-circle.

No component may import Phosphor directly or introduce an ad hoc emoji/icon mapping.

### Emoji

Emoji may appear in user-authored content normally. Product-owned emoji such as 🧵 may be used sparingly in onboarding, release notes, or friendly empty-state copy, but not as the only control signifier, repeated decoration, or substitute for accessible labels.

### Motion

Adding, removing, moving, and publishing segments may use restrained spatial continuity. Reduced-motion mode removes nonessential transitions. Publication progress must not rely on animation alone.

## Framework7 responsive behavior

### Phone

- one active segment in comfortable editing focus with neighboring segments visible enough for context;
- vertical sequence; no horizontal-only workflow;
- sticky or safely reachable **Add post** and final action without obscuring keyboard content;
- media and settings sheets scoped to the active segment;
- safe-area and virtual-keyboard handling;
- recoverable full-page progress state during publication.

### Tablet

- sequence overview plus active segment editor where space permits;
- drag and keyboard reorder alternatives;
- settings/details panel without losing draft context.

### Desktop

- sequence list and active editor may use split layout;
- keyboard navigation across segments;
- no hover-only controls;
- publication progress remains visible while reviewing already-confirmed statuses.

## Accessibility contract

Required semantics and behavior:

- the composer is a named region;
- segments are an ordered list only while order semantics are truthful;
- each segment has a stable accessible label such as `Post 2 of 4`;
- **Add post**, remove, move, merge, retry, and publish are real buttons;
- drag-and-drop has Move earlier / Move later alternatives;
- errors are associated with the exact field and segment;
- aggregate errors link or move focus to the first invalid segment;
- adding/removing/reordering announces concise changes without noisy live regions;
- focus remains predictable after segment actions;
- hidden settings are absent from focus order;
- 44x44 targets, reflow at 320 CSS pixels, 200 percent zoom, forced colors, high contrast, RTL, long localization, screen reader, switch control, keyboard-only, touch, and reduced motion are tested;
- publication progress exposes determinate counts where known and meaningful status text;
- partial-success recovery never traps focus or hides public-side-effect information.

## Security and privacy

Required controls:

- account/instance scope on every draft, media, publication run, command, callback, and persisted projection;
- no cross-account draft discovery or publication through guessed IDs;
- no bearer tokens, cookies, content bodies, canonical URIs, media URLs, or private audience data in diagnostics;
- destination and URL policy for quoted links and media;
- canonical sanitizer and content-type-safe preview;
- bounded parsing, splitting, records, arrays, strings, media, retries, and publication runs;
- stale-generation rejection after logout, account switch, route replacement, or draft revision;
- strict capability validation rather than trusting client-supplied backend labels;
- server authorization remains decisive;
- service worker and push paths cannot publish drafts unless an explicitly approved authenticated durable-outbox contract exists;
- clipboard/share-target imports are treated as untrusted input;
- imported draft files or deep links cannot select another account’s draft;
- content fingerprints used for reconciliation remain local, bounded, and content-free in logs;
- private/direct sequence content is never sent to an origin or third party outside normal authorized publication.

## Corruption and self-healing

Validate drafts and publication runs on read.

Self-healing may:

- remove duplicate segment IDs while preserving first valid order and quarantining ambiguity;
- restore missing order entries for valid unreferenced segments deterministically;
- clamp invalid non-security timestamps;
- discard rebuildable derived progress after reconciling durable outbox truth;
- repair canonical aliases through approved mappings;
- release stale leases through Phase 6 policy.

Fail closed and quarantine when:

- account scope mismatches;
- segment ownership conflicts;
- publication command identities point to another run/account;
- published parent identity contradicts confirmed sequence state;
- hostile sizes, cycles, or prototype-bearing payloads appear;
- migration cannot preserve public-side-effect truth.

Never repair corruption by deleting confirmed statuses or retrying ambiguous publication blindly.

## Feature flags and rollback

Use registered owned flags with removal criteria, for example:

```text
composer.authoredSequenceDrafts
composer.authoredSequencePublishing
composer.safeLongTextSplit
composer.continueThread
```

Flags may be consolidated, but draft schema, publishing behavior, and continuation rollout must remain independently reversible where failure domains differ.

Rollback:

- restores the existing single-status composer;
- keeps ordinary published statuses and replies unchanged;
- pauses active sequence publication runs safely and leaves Phase 6 commands inspectable/recoverable;
- preserves compatible single-segment drafts;
- exports or retains multi-segment drafts according to migration policy rather than silently dropping them;
- disables local authored-sequence provenance without altering canonical conversation edges;
- leaves Phase 9 conversation reading functional;
- introduces no deletion of remote statuses.

## Implementation slices

### 10.0 — Repository-wide composer authority and collision inventory

- inspect every active branch and open PR before implementation;
- inventory composer components, Redux actions/reducers/selectors, draft persistence, media uploads, polls, visibility, content warnings, languages, quotes, edits, scheduling, publication actions, offline paths, service worker, share target, and tests;
- map Phase 5, Phase 6, Phase 7, Phase 8D, and Phase 9 ownership;
- record backend capability fixtures and current UI behavior;
- identify duplicate or stale composer state and exact migration seams;
- establish flags and rollback owner;
- make no runtime behavior change.

Exit gate: reviewed ownership/collision matrix proves no second draft, outbox, media, publisher, or conversation authority is proposed.

### 10.1 — Authored-sequence domain and persistence contracts

- define draft, segment, publication-run, continuation, and projection types;
- extend canonical draft persistence with versioned migration;
- add account/instance scope, bounds, validation, corruption repair, retention, purge, and multi-tab revision control;
- test cross-account IDOR, stale revisions, hostile payloads, migration interruption, and rollback compatibility.

Exit gate: multi-segment drafts survive reload and PWA relaunch without crossing account boundaries or duplicating draft storage.

### 10.2 — Framework7 multi-segment composer shell

- add one-to-many segment presentation behind a flag;
- implement Add post, remove, move, merge, active-segment navigation, and thread-level settings inheritance;
- preserve ordinary single-post simplicity;
- use canonical controls/icons and content-type-safe editors;
- add phone/tablet/desktop, keyboard, touch, screen-reader, RTL, reflow, and reduced-motion tests.

Exit gate: users can create and edit a bounded unpublished sequence accessibly without publication behavior changing.

### 10.3 — Capability-aware per-segment content and media

- integrate text counting, Markdown/MFM, content warnings, language, media/alt text, poll, quote, visibility, interaction policy, and scheduling capability projections;
- define safe inheritance/override validation;
- sequence media uploads and orphan cleanup through existing authorities;
- add protocol fixtures for supported and degraded backends.

Exit gate: every segment passes the same canonical validation used by final publication; unsupported options degrade honestly.

### 10.4 — Safe long-text split and boundary editor

- implement a bounded content-type-aware tokenizer/split planner;
- use canonical counting authority;
- abstain on unsafe constructs;
- provide review, boundary adjustment, undo, merge, and accessibility behavior;
- add grapheme, URL, mention, hashtag, emoji, Markdown, MFM, code, custom emoji, hostile-length, and fuzz/property tests.

Exit gate: splitting never corrupts protected tokens or silently changes the user’s draft.

### 10.5 — Durable sequential publication orchestration

- define authored-sequence application command over Phase 6 outbox;
- freeze and preflight exact draft revision;
- enqueue/release segment publication commands in confirmed parent order;
- add idempotency, ambiguous-outcome reconciliation, cancellation, backoff, jitter, rate-limit, offline pause, and multi-tab lease handling;
- preserve canonical status import and alias mapping;
- test duplicate delivery, timeout-after-success, server rewrite, media processing, and stale callbacks.

Exit gate: confirmed segments publish once in exact reply order; ambiguous requests never retry blindly.

### 10.6 — Partial-success recovery and resumable progress

- persist and restore publication runs;
- implement exact progress, partial-publication, retry, edit remaining, abandon remaining, save remainder, and open-published actions;
- reconcile after refresh, suspension, app update, account switch, and offline transitions;
- ensure published statuses are never auto-deleted;
- add migration, corruption, purge, and terminal-failure tests.

Exit gate: every partial outcome is honest and recoverable without duplicating or hiding public posts.

### 10.7 — Continue-thread command and Phase 9 integration

- implement eligibility and parent-tip selection through canonical account/status/Phase 9 queries;
- support clear uncertainty when graph completeness is partial;
- provide strong local provenance for coordinated sequences and later continuations;
- expose compact verified reading cues without a second graph or renderer;
- test deleted, inaccessible, multiple-tip, alias, account-move, and ordinary-self-reply cases.

Exit gate: Continue thread attaches to the intended verified parent, and Phase 9 remains the sole conversation-reading authority.

### 10.8 — Article classification, media-sequence parsing, and readers

- implement the bounded content-presentation classifier over normalized adapter evidence;
- implement one typed article block and `articleMediaSequence` parser with field provenance, explicit-order semantics, stable media identity, bounds, safe URL/media validation, abstention, and ordinary-renderer fallback;
- consume only typed Phase 8B linked-work metadata and never fetch or persist arbitrary article HTML in the PWA;
- add article/link-preview cards and long-form readers while reusing canonical status actions, creator attribution, media, moderation, sanitization, and navigation;
- integrate Phase 24's viewer only as a presentation consumer of the canonical media sequence;
- test native/federated degradation, single PreviewCard images, ordered collections, unordered attachments, duplicate observations, hostile URLs/MIME, overflow, edits, restoration, content warnings, data saver, keyboard, screen reader, RTL, reflow, and reduced motion.

Exit gate: supported article sources produce one truthful bounded projection; carousel/slideshow UI appears only from evidenced media structure, and every unsupported or unsafe case falls back without hiding canonical content.

### 10.9 — Scheduling and advanced capability evaluation

- evaluate whether each supported backend can schedule a dependent status chain;
- implement only proven adapter contracts;
- reject unreliable local-timer simulation;
- document unsupported/degraded states;
- test timezone, DST, parent-resolution, cancellation, partial scheduling, and account/session expiry.

Exit gate: scheduling is exposed only where dependency-safe publication can be guaranteed by an approved authority.

### 10.10 — Hardening, accessibility, performance, rollout, and closure

- run adversarial, property, fuzz, IDOR, authorization, privacy, retry, corruption, account-transition, multi-tab, service-worker, update, and rollback tests;
- benchmark large drafts, long text, media-heavy sequences, editor latency, persistence, upload, and publication recovery on mid-range mobile;
- complete visual/accessibility baselines;
- document operations, migration, diagnostics, flags, rollback, and deprecated-path removal;
- update roadmap status only after runtime implementation and evidence merge.

Exit gate: no known correctness, security, privacy, accessibility, performance, migration, or rollback blocker remains.

## Required test matrix

### Draft and identity

- one segment and maximum bounded segments;
- add, remove, reorder, merge, restore, duplicate IDs, missing order entries;
- account switch, logout, account removal, instance change, stale route, cross-tab conflict;
- draft revision races and interrupted migration;
- cross-account IDOR reads, writes, publication, continuation, and purge.

### Splitting and counting

- paragraphs, sentences, long unbroken tokens;
- grapheme clusters and emoji ZWJ sequences;
- mentions, hashtags, URLs, Markdown links, code fences, MFM, custom emoji;
- server-specific URL/count behavior;
- exact limit, one over, byte limit, safety margin, malformed source;
- split review, undo, boundary move, merge, and abstention.

### Content and media

- per-segment media, alt text, sensitive state, content warnings, language;
- polls, quotes, visibility, interaction policy, local-only options;
- upload timeout, processing delay, duplicate retry, orphan cleanup;
- unsupported capabilities and content-type fallback.
- native article blocks, ActivityStreams images/attachments and explicitly ordered collections;
- PreviewCard single-image fallback and refusal to infer a slideshow from repeated or heuristic page images;
- explicit versus unknown order, stable item identities, exact duplicate observations and distinct evidenced roles;
- unsafe schemes, SVG/HTML/active content, MIME mismatch, hostile dimensions, oversized collections, timeout and bounded overflow;
- per-item alt text, captions, credits, sensitive state, edits, deletion, reorder, alias migration and account-scoped restoration;
- gallery/carousel/slideshow accessibility, no mandatory autoplay, data saver, reduced motion, keyboard, touch, screen reader, RTL and reflow.

### Publication correctness

- complete success;
- first-segment rejection;
- middle-segment validation failure;
- timeout after server success;
- rate limit and Retry-After;
- offline before and during publication;
- refresh, suspension, app update, and multi-tab takeover;
- duplicate stream/pagination echo;
- server-normalized content or parent aliases;
- ambiguous reconciliation abstention;
- cancellation before first publish and after partial publish.

### Recovery

- retry blocked segment;
- edit and republish remaining;
- remove failing remaining segment;
- save remainder;
- abandon remainder;
- unavailable account/session;
- corrupt run self-healing and quarantine;
- rollback to single composer with active drafts/runs.

### Continue thread and reading

- verified coordinated sequence;
- later continuation;
- ordinary self-reply;
- multiple plausible tips;
- partial graph;
- missing/deleted/private segment;
- account move and canonical alias;
- correct Phase 9 author-continuation projection and denominator honesty.

### Accessibility and presentation

- phone, tablet, desktop;
- keyboard-only, touch, screen reader, switch control;
- add/remove/reorder/merge focus and announcements;
- progress and partial-success communication;
- reduced motion, forced colors, high contrast, RTL, long localization, 200 percent zoom, 320 CSS-pixel reflow;
- no emoji-only controls or inaccessible drag-only ordering.

## Completion criteria

Phase 10 is complete only when:

- the existing Phase 10 slot is the single canonical composer/publishing phase;
- ordinary single-post composition remains lightweight and feature-complete;
- users can prepare, persist, review, reorder, and publish a bounded multi-segment authored sequence;
- every published segment is an ordinary canonical status linked through normal reply semantics;
- no proprietary federated thread object or duplicate published-status store exists;
- Phase 5 remains the draft/status authority and Phase 6 remains the durable outbox/retry authority;
- long-text splitting is optional, reviewable, content-type-aware, grapheme-safe, and uses canonical counting;
- publication proceeds only after confirmed parent identity and ambiguous POST outcomes reconcile before retry;
- refresh, suspension, offline, rate limits, partial success, and app updates recover without duplicate publication;
- partial success is communicated honestly and confirmed statuses are never auto-deleted;
- Continue thread uses verified author and parent-tip selection and does not misclassify every self-reply;
- Phase 9 remains the sole canonical conversation graph and reading authority;
- Phase 10 owns one bounded article/media-sequence parsing projection, Phase 24 only presents it, and no PWA path fetches arbitrary article HTML;
- carousel/slideshow treatment requires explicit media/order evidence and unsafe or ambiguous inputs degrade to the canonical card/gallery without content loss;
- drafts, runs, commands, media, and callbacks are account/instance scoped and cross-account IDOR tests pass;
- clean semantic icons and minimal product language replace decorative or emoji-only controls;
- accessibility, security, privacy, performance, migration, corruption, multi-tab, scheduling, and rollback gates pass;
- canonical documentation, ADRs, generated registries, code, tests, CI, and review state agree before completion is claimed.
