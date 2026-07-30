from pathlib import Path

phase_path = Path('docs/architecture/PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md')
roadmap_path = Path('docs/architecture/IMPLEMENTATION_ROADMAP_V2.md')
adr_path = Path('docs/architecture/ARCHITECTURAL_DECISIONS.md')

phase = phase_path.read_text()
phase = phase.replace(
    '# Phase 10 — Threaded Post Composer and Reliable Publishing',
    '# Phase 10 — Adaptive Publishing, Articles, Formatted Notes, and Reliable Authored Sequences',
    1,
)
phase = phase.replace(
    'Create a clean, lightweight, Threads-inspired composer that lets a person prepare several connected posts before publication, publish them as one intentional authored sequence, continue that sequence later, and recover honestly from interruption or partial failure.',
    'Create one clean adaptive publishing and presentation system for ordinary posts, formatted notes, articles, article and blog link previews, and intentional authored sequences. The phase covers the complete lifecycle: truthful content classification, composition, capability-safe publication, feed presentation, reading, engagement, continuation, and durable recovery.',
    1,
)
phase = phase.replace(
    'Each successfully published segment remains an ordinary canonical Fediverse status. Segment 2 replies to segment 1, segment 3 replies to segment 2, and so on. Phase 9 later recognizes and presents that same-author chain as an author continuation within the canonical conversation graph.',
    'Each successfully published thread segment remains an ordinary canonical Fediverse status. Segment 2 replies to segment 1, segment 3 replies to segment 2, and so on. Native articles, rich notes, long plain notes, external article links, and authored sequences retain their canonical protocol identities while Mangane projects the richest truthful presentation supported by the available evidence. Phase 9 remains the canonical conversation and authored-sequence graph authority.',
    1,
)

marker = '## Authored sequence draft model\n'
if marker not in phase:
    raise SystemExit('Phase 10 insertion marker missing')

section = r'''## Adaptive publishing intentions

The composer and reading system distinguish user intent without forcing every backend to support identical remote object types.

### Ordinary post

A normal social post remains the default and must retain the lightest composer and feed presentation.

### Formatted note

A formatted note is a longer socially shaped publication that may contain paragraphs, emphasis, links, quotations, lists, code, Markdown, MFM, or other capability-approved structured text. It remains an ordinary canonical status or note and does not require article framing, a cover, a title, or a publication masthead.

### Article

An article is an intentionally structured long-form work. Where the origin software exposes a native article or document object, Mangane preserves that identity. Where federation or a Mastodon-compatible API flattens the work into a generic `Note`, Mangane may restore an article presentation only when bounded evidence supports that classification.

An article may project a title, subtitle or deck, cover media, creator attribution, publication/provider, lead, sections, headings, lists, quotations, code, embedded canonical posts, citations, footnotes, reading time, edit history, and a table of contents where supported and truthful.

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

'''

if '## Content presentation classification authority' not in phase:
    phase = phase.replace(marker, section + marker, 1)

# Expand implementation slices and closure gates without renumbering the phase.
phase = phase.replace(
    '### Slice 10.0 — Repository-wide composer authority inventory',
    '### Slice 10.0 — Repository-wide composer, content-type, preview, and presentation authority inventory',
    1,
)
phase = phase.replace(
    '- inventory compose routes, Redux state, actions, reducers, selectors, persistence, media uploads, polling, scheduling, editing, and backend-specific branches;',
    '- inventory compose routes, Redux state, actions, reducers, selectors, persistence, media uploads, polling, scheduling, editing, backend-specific branches, article/note object handling, preview cards, creator attribution, long-form truncation, status detail, and same-author sequence presentation;',
    1,
)

phase_path.write_text(phase)

roadmap = roadmap_path.read_text()
roadmap = roadmap.replace(
    '## Phase 10 — Threaded Post Composer and Reliable Publishing',
    '## Phase 10 — Adaptive Publishing, Articles, Formatted Notes, and Reliable Authored Sequences',
)
roadmap = roadmap.replace(
    'Goal: provide a clean, Threads-inspired multi-post composer with durable sequential publication, safe long-text splitting, partial-success recovery, and later continuation while preserving ordinary Fediverse reply semantics.',
    'Goal: provide one adaptive composition, classification, publication, feed-presentation, reading, and engagement system for ordinary posts, formatted notes, articles, article/blog previews, and reliable authored sequences while preserving canonical Fediverse identity and existing authorities.',
)
roadmap_path.write_text(roadmap)

adr = adr_path.read_text()
adr = adr.replace(
    '## ADR-031 — Multi-post authored sequences use ordinary replies and the existing durable outbox',
    '## ADR-031 — Adaptive long-form publishing preserves canonical objects and uses one presentation classifier',
)
adr = adr.replace(
    'Decision: Expand canonical Phase 10 into Threaded Post Composer and Reliable Publishing.',
    'Decision: Expand canonical Phase 10 into Adaptive Publishing, Articles, Formatted Notes, and Reliable Authored Sequences. Preserve native article, note, linked-work and ordinary status identities; publish authored sequences as ordinary replies through the existing durable outbox; and derive feed cards and readers through one bounded presentation classifier that consumes Phase 8B creator attribution, Phase 8D source semantics and Phase 9 conversation truth.',
)
adr_path.write_text(adr)
