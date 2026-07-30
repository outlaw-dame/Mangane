# Phase 1B — Misskey Post, Markdown, and MFM Compatibility

Status: **Accepted target / required compatibility prerequisite**

Last updated: 2026-07-30

## Purpose

Mangane must render and compose federated content accurately across Mastodon-compatible, Akkoma/Pleroma, Misskey-family, and other ActivityPub implementations without leaking protocol-specific parsing into presentation components.

This phase establishes one content-format compatibility boundary for:

- ordinary sanitized HTML statuses;
- plain text;
- CommonMark-compatible Markdown where a backend explicitly identifies Markdown source;
- Misskey Flavored Markdown (MFM);
- Misskey-family post entities and federation-derived representations.

This phase is a prerequisite for broad editorial-surface migration. A new Home, thread, search, notification, custom-feed, or story surface may not claim protocol compatibility while bypassing these contracts.

## Non-goals

This phase does not:

- execute arbitrary HTML, JavaScript, CSS, SVG, iframe, or custom-element payloads;
- infer Markdown or MFM solely from punctuation in already-rendered HTML;
- reinterpret remote HTML as Markdown;
- promise pixel-identical rendering with every Misskey fork;
- add a second status store, sanitizer, linkifier, emoji authority, or network client;
- require animation for MFM constructs;
- allow protocol-specific payloads to reach migrated presentation components.

## Architectural rule

All incoming post content passes through a protocol-content adapter before normalization and rendering.

```text
remote API / ActivityPub payload
        │
        ▼
protocol content classifier
        │
        ├── sanitized HTML
        ├── plain text
        ├── Markdown source
        └── MFM source
        │
        ▼
format-specific parser
        │
        ▼
safe canonical content AST
        │
        ▼
policy transforms
        │
        ├── mentions
        ├── hashtags
        ├── links
        ├── emoji
        ├── content warnings
        └── supported MFM nodes
        │
        ▼
accessible renderer
```

Presentation code consumes only the canonical content projection. It must not branch on `software === "Misskey"`, parse raw MFM, inspect raw ActivityPub JSON, or call a sanitizer directly.

## Canonical content model

The implementation must introduce a qualified, non-colliding canonical representation such as:

```ts
interface CanonicalPostContent {
  sourceFormat: 'html' | 'plain-text' | 'markdown' | 'mfm';
  sourceProvenance: ContentSourceProvenance;
  blocks: CanonicalContentBlock[];
  plainText: string;
  searchableText: string;
  links: CanonicalContentLink[];
  mentions: CanonicalContentMention[];
  hashtags: CanonicalContentHashtag[];
  emojis: CanonicalContentEmoji[];
  unsupportedConstructs: UnsupportedContentConstruct[];
  sanitizerPolicyVersion: number;
  parserVersion: number;
}
```

The exact type names may change during implementation, but there must be one canonical AST/projection and one renderer authority.

Raw source may be retained only when required for editing, redrafting, diagnostics, or lossless migration, and must remain account-scoped, bounded, purgeable, and excluded from telemetry.

## Source-format classification

Classification must be evidence-based and fail closed.

Accepted evidence includes:

- an explicit API `content_type` or equivalent capability-backed field;
- a Misskey-family API contract that defines the note text as MFM;
- a locally composed draft with an explicitly selected format;
- a trusted adapter mapping for a verified backend family and version;
- ActivityPub extension metadata whose semantics are documented and covered by fixtures.

Classification must not rely only on:

- server branding strings;
- hostname heuristics;
- Markdown-looking punctuation;
- user-agent text;
- HTML content containing `<p>` or `<br>`;
- unverified extension fields.

Unknown or contradictory evidence must select the safest non-executing representation and record a degraded/unsupported result rather than guessing.

## Misskey post compatibility fixture suite

Mangane must add a committed, versioned fixture corpus representing real Misskey-family post shapes. The suite must include, at minimum:

### Core post shapes

- ordinary public note;
- followers-only, specified/direct, and home visibility variants;
- local-only note;
- reply with parent identifiers;
- renote without added text;
- quote-renote with added text;
- nested renote depth and cycle-defense cases;
- edited note where the backend exposes edit metadata;
- deleted/unavailable parent and quote target;
- note with content warning;
- note with poll;
- note with files/media;
- note with custom emoji;
- note with mentions and hashtags;
- note with remote-user references;
- note containing Unicode, RTL, combining marks, and long grapheme clusters.

### Federation representations

Fixtures must cover both:

1. direct Misskey-family API responses where Mangane connects to that backend; and
2. Mastodon-compatible or ActivityPub-normalized representations of Misskey-originated posts received through another server.

The same logical post should be represented in paired fixtures where practical so adapter-equivalence tests can prove that canonical output is stable across transport forms.

### Fork coverage

The baseline matrix must include current representative payloads for:

- Misskey;
- Firefish or its maintained successor/fork where materially different;
- Sharkey where materially different;
- Iceshrimp-family behavior where materially different;
- at least one Mastodon/Akkoma instance representation of a federated Misskey-origin note.

A fork is included only when its payload or MFM behavior differs materially. Fixtures must record source project, version, capture date, redaction method, and expected capability mapping.

No fixture may contain access tokens, private messages, private profile fields, stable personal identifiers unnecessary to the test, or live URLs that create network dependencies.

## Markdown support

Markdown support must use an actively maintained parser configured for an explicit safe subset.

Required baseline constructs:

- paragraphs and hard/soft line breaks;
- emphasis and strong emphasis;
- inline code and fenced code blocks;
- block quotes;
- ordered and unordered lists;
- links;
- autolinks;
- escaped punctuation;
- headings only if product design accepts them for posts;
- spoiler/content-warning handling outside the body parser;
- tables only if explicitly accepted after mobile, accessibility, and overflow testing.

Raw HTML embedded in Markdown must be disabled or treated as literal text. URL schemes must use Mangane's central destination policy. Images embedded via Markdown must not bypass media-attachment policy, proxying, privacy, CSP, or referrer controls.

Parser extensions must be opt-in and versioned. GitHub Flavored Markdown is not assumed to be identical to ordinary Markdown or MFM.

## Misskey Flavored Markdown support

MFM must be parsed as a separate source format, not as a loose Markdown mode.

### Initial supported subset

The first production slice must accurately support:

- standard Markdown-compatible text constructs used by MFM;
- mentions;
- hashtags;
- URLs;
- custom emoji syntax;
- code spans and code blocks;
- quote blocks;
- search markup when represented as a safe link/action;
- plain and nested MFM function syntax through an allowlisted parser;
- `$[x2 ...]`, `$[x3 ...]`, and `$[x4 ...]` as bounded typographic emphasis;
- `$[small ...]`;
- `$[center ...]` only where it remains accessible and responsive;
- `$[fg.color ...]` and `$[bg.color ...]` only after contrast enforcement and safe color parsing;
- `$[border ...]` through design-token-bounded styling;
- `$[blur ...]` with an explicit reveal control and keyboard/touch accessibility;
- `$[flip ...]`, `$[rotate ...]`, and motion functions only through bounded transforms with reduced-motion fallbacks;
- math notation only if rendered without remote execution, unsafe HTML, or unbounded resource use.

### Unsupported and degraded constructs

Unknown functions, invalid nesting, excessive depth, oversized arguments, and unsupported effects must preserve readable child text. Mangane must never drop the entire post because one MFM node is unsupported.

Unsupported nodes should produce structured diagnostics such as:

```ts
interface UnsupportedContentConstruct {
  format: 'markdown' | 'mfm';
  name: string;
  reason: 'unknown' | 'disabled' | 'invalid' | 'depth-limit' | 'size-limit';
  sourceRange?: { start: number; end: number };
}
```

Diagnostics must not include private post text in telemetry.

## Animation and reduced motion

MFM motion effects are optional presentation enhancements, never semantic requirements.

- `prefers-reduced-motion: reduce` must disable continuous, bouncing, spinning, jittering, rainbow, tada, jump, and similar effects.
- Disabled animation must preserve readable text and layout.
- Animation duration, iteration, transform magnitude, and concurrent animated-node count must be bounded.
- Content may not trigger flashing patterns that violate WCAG thresholds.
- Offscreen animated nodes must not consume continuous work.
- Nested effects must have a hard depth and complexity budget.
- The renderer must remain stable under virtualization and timeline recycling.

## Security requirements

The Markdown/MFM pipeline is an untrusted-content boundary.

Mandatory controls:

- parse without `eval`, dynamic code generation, script execution, or remote module loading;
- no raw HTML passthrough;
- sanitize any generated HTML through the canonical sanitizer, or render the AST directly with safe components;
- central allowlist for URL schemes and destinations;
- `rel`, referrer, opener, download, and external-navigation policy enforced centrally;
- no inline event handlers or arbitrary style properties;
- strict safe parsing for colors, numeric arguments, CSS lengths, transforms, and function names;
- hard limits for input bytes, token count, nesting depth, node count, link count, emoji count, and render complexity;
- cycle detection for nested renotes, quotes, AST nodes, and malformed references;
- catastrophic-backtracking and parser-complexity tests;
- no fetches initiated by parsing;
- no arbitrary remote images, fonts, audio, video, embeds, or iframes created from body syntax;
- no credential, cookie, private URL, or account identifier leakage through errors or telemetry;
- deterministic plain-text fallback when parsing fails;
- account-safe caching and purge behavior.

MFM colors and effects must map to generated classes or bounded style objects. Remote input must never become an arbitrary class name or CSS declaration.

## Performance and resilience

- Parsing must be deterministic and side-effect free.
- Expensive parsing may move to a worker only through the existing runtime/worker authority and with bounded messages.
- Canonical output should be cached by content hash, source format, parser version, sanitizer version, and relevant capability version.
- Cache entries must be account-safe where visibility or moderation decisions are involved.
- Parser failure must not prevent the status shell, author, media, actions, or thread context from rendering.
- A plain-text fallback must remain available offline.
- Large or hostile posts must terminate within defined CPU and memory budgets.
- Virtualized lists must not repeatedly reparse unchanged content.

## Composition and round-trip behavior

Mangane must distinguish display support from composition support.

### Display

Remote Markdown and MFM can be displayed once the safe parser and renderer pass the required gates.

### Compose

Mangane may offer a Markdown or MFM composer only when the connected backend explicitly accepts that format. Composer capability must be derived from the protocol capability contract, not instance branding.

Requirements:

- format selector is shown only for supported backends;
- draft persistence records the chosen source format;
- edit/redraft preserves the original supported format when source is available;
- switching formats warns about lossy constructs;
- preview uses the same parser, policy, and renderer as final display;
- submission sends the backend's documented content-type field;
- unsupported MFM functions are blocked or visibly degraded before submission;
- character/count validation follows the backend's actual semantics where known;
- no silent conversion from MFM to HTML or Markdown if it changes meaning.

## Moderation, filtering, search, and entity integration

Canonical plain/searchable text must be derived from the safe AST, not raw source markup.

- keyword filters must see human-readable text;
- hidden MFM syntax must not evade moderation;
- links, mentions, hashtags, emoji, CWs, and quote/renote relationships remain structured;
- semantic hashtag/entity resolution consumes canonical hashtag nodes;
- search indexes canonical text plus structured fields, not unsafe generated HTML;
- content warnings remain authoritative and must not be bypassed by MFM blur/effects;
- blocked/muted entities remain suppressed regardless of format;
- translated text must identify whether translation used plain canonical text or backend-rendered content.

## Required tests

### Parser unit tests

- every supported Markdown construct;
- every supported MFM function;
- unknown functions preserving child text;
- nested constructs at, below, and above limits;
- malformed delimiters and incomplete functions;
- Unicode, RTL, grapheme clusters, and emoji;
- URL-scheme rejection;
- color and numeric argument validation;
- plain-text extraction;
- deterministic output and cache keys.

### Security regression tests

- script tags, event handlers, raw HTML, SVG, MathML, and iframe payloads;
- `javascript:`, `data:`, `file:`, `blob:`, custom schemes, encoded schemes, and control-character URLs;
- CSS injection through color, border, transform, animation, and class arguments;
- deeply nested and exponentially expanding input;
- oversized code blocks, links, emoji, mentions, and function arguments;
- bidirectional-control and homoglyph cases;
- parser timeout/resource-budget enforcement;
- sanitizer equivalence and no unsafe React sink regression.

### Adapter/fixture tests

- each committed Misskey-family fixture normalizes successfully;
- paired direct/federated representations produce equivalent canonical content and relationships;
- replies, renotes, quotes, CWs, polls, files, emoji, mentions, hashtags, and visibility survive normalization;
- unknown fields are preserved only where the canonical model explicitly allows extensions;
- malformed remote IDs and cross-account cache keys fail closed;
- no live network access is required.

### Integration and browser tests

- timeline card;
- status detail and recovered parent thread;
- notification;
- search result;
- custom feed;
- quoted/renoted post;
- composer preview and redraft;
- reduced-motion behavior;
- keyboard reveal for blur/spoiler content;
- mobile overflow and long unbroken content;
- offline cached rendering;
- logout/account-switch purge.

### Differential tests

For a curated public corpus, compare Mangane's canonical plain text and supported visual semantics against the corresponding Misskey renderer behavior. Differences must be classified as:

- intentional safe degradation;
- unsupported extension;
- upstream ambiguity;
- Mangane defect.

Screenshots alone are insufficient; semantic DOM, accessible name, links, structured entities, and plain-text output must also be asserted.

## CI requirements

A dedicated compatibility job must:

- run the fixture adapter suite;
- run Markdown and MFM parser tests;
- run security/adversarial cases;
- prohibit network access during fixture tests;
- enforce fixture provenance metadata;
- enforce parser and sanitizer version snapshots;
- fail on unsupported raw HTML sinks or direct parser use outside the canonical authority;
- run reduced-motion and browser accessibility coverage;
- publish no fixture content or private data as artifacts;
- remain required for PRs touching status normalization, content rendering, sanitizer policy, composer formats, protocol capabilities, or Misskey adapters.

The existing HTML safety, architecture inventory, network callsite, telemetry/redaction, browser persistence, React Query, accessibility, and Phase 0G quality authorities remain mandatory.

## Implementation slices

### Slice 1 — Inventory and evidence

- inventory current Markdown/content-type behavior;
- inventory Misskey/MFM handling inherited from Soapbox;
- capture and redact representative fixtures;
- map all content renderers, sanitizers, linkifiers, emoji renderers, and raw sinks;
- document direct versus federated Misskey payload differences.

### Slice 2 — Canonical content boundary

- introduce source classification;
- introduce canonical AST/projection;
- adapt existing sanitized HTML without regressions;
- centralize plain-text/searchable-text extraction;
- add versioned cache keys and deterministic fallback.

### Slice 3 — Markdown

- select and security-review the parser;
- implement the accepted subset;
- integrate destination, sanitizer, emoji, mention, and hashtag authorities;
- add parser, security, browser, and compose-preview tests.

### Slice 4 — MFM display

- implement a grammar-aware MFM parser or adopt a maintained implementation after dependency/license/security review;
- implement the safe initial subset;
- implement readable unknown-node degradation;
- enforce complexity and animation budgets;
- add Misskey fixture equivalence and browser tests.

### Slice 5 — Misskey protocol adapter coverage

- normalize direct Misskey-family API shapes;
- normalize federated Misskey-origin representations;
- preserve reply, renote, quote, visibility, CW, files, poll, emoji, mention, hashtag, and edit semantics;
- integrate with thread context recovery and canonical local records;
- add capability/version matrix entries.

### Slice 6 — Composition

- capability-gated Markdown/MFM selection;
- draft schema and migration;
- preview parity;
- edit/redraft source preservation;
- submission contract and failure states;
- lossy-conversion warnings.

### Slice 7 — CI authority and rollout

- dedicated compatibility workflow;
- drift gate for parser/renderer ownership;
- performance budgets;
- accessibility and reduced-motion gates;
- staged feature flags for display and compose;
- rollback to canonical plain-text/sanitized-HTML rendering.

## Rollout and rollback

Rollout flags must be separable:

- `misskeyPostAdapter`;
- `markdownPostDisplay`;
- `mfmPostDisplay`;
- `markdownComposer`;
- `mfmComposer`.

Names may be adjusted to fit the canonical feature-flag registry.

Disabling Markdown or MFM display must fall back to safe canonical plain text, not raw syntax execution or a blank post. Disabling composition must preserve existing drafts and offer export/copy where safe. Parser-version rollback must invalidate incompatible cached projections without deleting source records.

## Exit criteria

Phase 1B is complete only when:

1. one canonical content-format authority owns classification, parsing, plain-text extraction, and rendering;
2. representative Misskey-family fixtures are committed with provenance and privacy review;
3. direct and federated Misskey representations pass equivalence tests;
4. Markdown display passes parser, sanitizer, URL, accessibility, offline, and adversarial tests;
5. the accepted MFM subset renders safely and unknown constructs preserve readable text;
6. reduced-motion users receive equivalent readable content without continuous effects;
7. status detail, timelines, notifications, search, custom feeds, quotes/renotes, and thread recovery pass integration coverage;
8. composition is capability-gated and round-trip behavior is tested where enabled;
9. no protocol-specific parsing exists in migrated presentation components;
10. no new HTML, network, telemetry, persistence, or duplicate-state authority is introduced;
11. all applicable CI and documentation authority checks pass;
12. migration and rollback are tested and documented.

## Dependency order

This phase depends on the completed Phase 1 compatibility contract and Phase 0D HTML-safety authority. Its inventory and fixture slice should begin before broad Phase 8 presentation migration. Display support may proceed before composition support. Entity resolution, semantic hashtags, custom feeds, and search should consume this phase's canonical structured output rather than reparsing source markup.
