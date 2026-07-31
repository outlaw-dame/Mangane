# Phase 9A — Profile Walls and Adaptive Thread Timelines

Status: **Accepted target / queued**

## Purpose

Add two client-side social presentation capabilities without inventing protocol objects or weakening the canonical status and conversation authorities:

1. a Friendica-inspired **profile wall** experience that lets a person intentionally address a post to another profile's visible page inside Mangane; and
2. an improved form of Mona's **Invert threads on timeline** behavior that can present authored thread segments newest-first or around the reader's position without falsifying conversation structure.

Both features are Mangane presentation and interaction layers. Every federated post remains an ordinary status, reply, mention, quote, or platform-native equivalent owned by the protocol adapter and canonical status store.

## Research basis

### Friendica wall behavior

Friendica models posts, comments, ordinary statuses, and wall-to-wall activity through a shared item model. Its user-scoped item state includes whether an item belongs on a user's wall, while notification and delivery behavior can distinguish a post made to a profile wall from an ordinary mention. A wall post is therefore not merely decorative text, but neither does it require an unrelated second social object hierarchy.

The useful product lesson for Mangane is to separate:

- the canonical federated object;
- the author's explicit placement intent;
- the profile surface on which Mangane presents the object; and
- the evidence supporting that placement.

Mangane must not copy Friendica's server-side guarantees where a connected platform does not provide them.

### Mona thread inversion

Mona exposes an **Invert threads on timeline** setting described as placing newer posts before earlier posts in a post thread. This solves a real reading problem for active live threads, but a global reversal can obscure roots, branch relationships, unread position, and chronology.

Mangane should retain the useful ordering option while making it graph-aware, feed-aware, reversible, and anchored to reading state.

## Architectural placement

This is a Phase 9 extension because Phase 9 owns the canonical conversation graph and reading projections.

It does not create another:

- status store;
- timeline store;
- conversation graph;
- account/profile authority;
- composer authority;
- outbox or retry queue;
- notification authority;
- moderation authority; or
- protocol capability detector.

Dependencies:

- Phase 5 remains the composer, draft, status, and media authority.
- Phase 6 remains the durable publication, retry, reconciliation, and ambiguous-outcome authority.
- Phase 7 remains the account-scoped local repository and settings authority.
- Phase 8B remains account/entity resolution authority.
- Phase 9 remains canonical conversation graph, context recovery, and authored-sequence authority.
- Phase 10 may offer wall-target selection in the adaptive composer, but cannot redefine wall placement or graph ordering.

## Part A — Mangane profile walls

### Product model

A profile wall is a Mangane view of posts intentionally directed to a profile, plus posts that the profile owner has allowed Mangane to associate with that surface.

A wall is not a new federated destination. It is a bounded projection over canonical statuses and explicit local placement records.

The wall surface may contain:

- posts authored by the profile owner;
- posts explicitly composed through **Post to profile** in Mangane;
- replies whose canonical parent belongs to that profile and which satisfy the selected wall policy;
- mentions that meet strict placement evidence and user policy;
- native wall-target metadata from a protocol adapter, when a platform genuinely provides it; and
- owner-approved or owner-pinned wall entries.

Ordinary mentions must not all become wall posts. That would recreate the current undifferentiated mention model under a misleading name.

### Canonical wall-placement record

Mangane may persist a small account-scoped placement record referencing canonical identities:

```ts
interface ProfileWallPlacement {
  schemaVersion: 1;
  placementId: string;
  viewerAccountScope: string;
  targetAccountUri: string;
  canonicalStatusUri: string;
  canonicalStatusId: string | null;
  intent: 'post-to-profile' | 'owner-approved' | 'owner-pinned' | 'native-wall';
  source: 'mangane' | 'protocol';
  federationState: 'ordinary-status' | 'native-wall' | 'unknown';
  visibility: 'author-private' | 'recipient-visible' | 'public-native';
  recipientEvidence: string | null;
  createdAt: string;
  updatedAt: string;
}
```

The record is an index and presentation instruction, never the source of status content, visibility, authorship, moderation, or deletion state.

Required invariants:

- all account and status references use canonical resolved identifiers;
- records are account-scoped and cannot be read through another signed-in account's scope;
- a placement record never grants access to a status the viewer cannot otherwise fetch;
- a missing, deleted, blocked, filtered, or unauthorized canonical status produces no wall content;
- edits continue to render from canonical status state;
- duplicate placement records collapse by target account plus canonical status URI;
- local placement deletion does not delete the federated post;
- federated post deletion or loss of access invalidates the projection;
- local records cannot imply that another server accepted or published a wall relationship.

### Recipient-visible placement authority

A placement created only in the author's account-scoped repository is **author-private**. It can organize the author's own view, but it cannot drive the recipient's wall, wall policy, wall-specific notification, or a visitor's view. An ordinary federated mention is not evidence of recipient-visible placement.

A placement becomes `recipient-visible` only through verified protocol-native wall metadata, or through an authenticated target-controlled synchronization channel carrying a signed, target-addressed claim bound to the canonical status. Such a claim is metadata only: it grants no status access, cannot override canonical visibility or moderation, must be replay-protected and revocable, and must be accepted in the recipient's canonical account scope.

Until such a channel is implemented and verified, another-profile composition on Mastodon-compatible platforms is **mention-only** for the recipient and visitors. Mangane may retain an explicitly labelled author-private record, **Saved to your Mangane view**, but must not describe it as appearing on the target's wall.

### Composing to a profile

On a profile, Mangane may expose **Post to profile** alongside ordinary mention and reply actions.

The composer must show exactly what will happen:

- **Native wall supported:** the adapter may use a verified platform-native wall destination while still returning a canonical post identity.
- **Mangane wall placement:** recipient-visible only through verified target-addressed authority. Without it, Mangane publishes an ordinary mention and may keep only an explicitly labelled author-private record.
- **Mention-only fallback:** when the target cannot participate in Mangane wall presentation, the composer publishes an ordinary mention and labels it as such. It must not claim the post will appear on the recipient's wall.

For Mastodon-compatible publication, the default compatible strategy is an ordinary status mentioning the target account. Reply semantics are used only when the author actually chose to reply to a canonical post. Mangane must not create a fake reply solely to force placement.

Before publication, the composer resolves:

- target account identity;
- current posting account scope;
- visibility compatibility;
- mention syntax;
- block/mute/domain restrictions;
- target capability evidence;
- whether the target is the author's own profile;
- whether confirmed publication creates only an author-private record or a verified recipient-visible placement.

The placement record is written only after the canonical post has a confirmed identity. Ambiguous publication outcomes are reconciled through Phase 6 before creating or retrying placement.

### Own wall and another person's wall

#### Own wall

The signed-in user may:

- post directly to their own wall;
- pin or remove eligible entries from their Mangane wall projection;
- configure whether replies and high-confidence directed posts appear automatically;
- review entries awaiting approval if moderation mode is enabled; and
- switch between **Posts**, **Wall**, **Replies**, **Media**, and other existing profile projections.

#### Another person's wall

A visitor may see only entries supported by public canonical data and the target's published or locally available wall policy.

A visitor may post to the profile only when:

- the target account resolves unambiguously;
- the visitor is allowed to publish a compatible status;
- the visitor has not been blocked by locally known policy;
- the resulting status visibility can be represented honestly; and
- the UI clearly distinguishes native, Mangane-only, and mention-only outcomes.

Author-private placements cannot affect the target or visitors. Recipient-visible placements require verified target-addressed evidence, and neither form is globally public metadata. Other clients may show only the underlying ordinary status.

### Wall policy

The wall owner controls a bounded policy:

- `off`: no dedicated wall projection;
- `manual`: only owner-approved, owner-pinned, own-wall, and native-wall entries;
- `directed`: include explicit Mangane **Post to profile** placements after policy checks;
- `expanded`: additionally include high-confidence directed mentions and qualifying replies.

`manual` is the privacy-preserving default for accounts without native wall semantics. Automatic inference must abstain when evidence is ambiguous.

Potentially sensitive or private statuses never become publicly discoverable through wall indexing. Visibility and audience remain canonical server truth.

### Presentation and notifications

Wall entries should identify the relationship without overstating federation:

- **Posted to your profile** for verified native or explicit Mangane placement visible to the owner;
- **Mangane wall post** when the relationship exists only in Mangane;
- **Mentioned you** for ordinary mention fallback;
- **Replied to your post** for actual canonical replies.

The status card remains the normal canonical status card with ordinary actions, timestamps, content warnings, edit state, source links, and moderation controls.

A wall-specific notification is a presentation subtype over the existing notification authority. It may be generated locally only when the corresponding canonical status is present and the explicit placement record is valid. It must deduplicate against mention and reply notifications so the same activity does not produce multiple alerts unless the user has intentionally enabled both.

### Security and abuse resistance

- Wall projection queries accept canonical target identity, not arbitrary owner-supplied account IDs.
- Every local placement read and mutation verifies the authenticated account scope.
- No placement endpoint or repository method may reveal whether a private status exists.
- Block, mute, domain block, filter, content-warning, and server moderation results apply before projection.
- A blocked author cannot regain surface placement through a stale local record.
- Wall posting is subject to composer rate limits and publication safeguards; local record creation cannot bypass server rate limits.
- Imported placement records are schema-validated, bounded, deduplicated, and rejected when target/status identities do not match the account scope.
- Profile owners need bulk removal and a bounded approval queue to resist wall spam.
- Wall labels cannot imply endorsement by the profile owner unless the entry was actually approved or pinned.

## Part B — Adaptive thread ordering on timelines

### Goal

Improve live-thread readability without globally reversing arbitrary conversations or changing canonical chronology.

The feature applies only to a detected **thread bundle**: a bounded group of timeline statuses connected through canonical reply relationships and eligible for compact presentation.

### Ordering modes

Mangane offers three modes:

1. **Chronological** — root or earliest visible segment first, then later segments.
2. **Newest first** — newest eligible authored segment first, similar to Mona's inversion setting.
3. **Adaptive** — preserve the reader's current anchor, put the first unread or newest relevant segment nearest that anchor, and provide explicit navigation to root and latest.

The setting may be global per account with optional per-feed overrides. A temporary bundle-level toggle is available without rewriting the saved preference.

### Safe bundle eligibility

Automatic ordering is limited to high-confidence authored sequences or linear same-author chains.

A bundle is eligible when:

- every included status has a canonical identity;
- reply edges form a valid acyclic chain within the included set;
- the continuation author matches the root author, unless a future explicitly documented sequence type permits co-authors;
- each later segment directly or transitively replies within the same chain;
- visibility and content-warning presentation are compatible;
- no deleted or unavailable middle segment would make the displayed order deceptive;
- no moderation filter requires independently hiding a segment in a way that fabricates continuity; and
- confidence meets the Phase 9 authored-sequence threshold.

Mangane abstains and renders ordinary timeline cards when:

- the graph branches into a multi-author conversation;
- parentage is missing or contradictory;
- a boost/reshare would be confused with authorship;
- federation has flattened or rewritten reply metadata beyond reliable reconstruction;
- the chain crosses incompatible visibility boundaries;
- the sequence exceeds bounded expansion limits; or
- canonical data is still loading.

### Branch-aware improvement over simple inversion

A conversation branch is never silently reversed as though it were a linear authored thread.

For branched conversations, Mangane may show:

- the timeline-triggering status as the primary card;
- a compact parent context preview;
- a reply-count or branch summary;
- **Open conversation** for the canonical graph view; and
- separate **Root**, **Latest**, and **First unread** navigation where those targets are known.

The detailed conversation view keeps graph-correct ordering and branch indentation. Timeline ordering preferences cannot mutate the canonical context reducer or server-provided arrays.

### Bundle presentation

A bundled thread card includes:

- a visible label such as **Thread · newest first**;
- the number of included and hidden segments;
- root/newest/first-unread navigation;
- collapse and expand controls;
- per-segment canonical timestamps and permalinks;
- individual content warnings, media, language, edits, and actions;
- a toggle to temporarily switch ordering;
- an accessible ordered-list representation matching visual order; and
- an explanation when some segments are unavailable or excluded.

Newest-first mode must not make the root appear newly authored. Each segment keeps its own timestamp, identity, and action state.

### Adaptive read-position behavior

Adaptive mode uses durable reading state, not engagement ranking.

The projection may consider:

- last-read canonical segment ID;
- first unread segment;
- current viewport anchor;
- newly streamed continuation segments;
- whether the user entered from a notification or permalink; and
- whether the user explicitly jumped to root or latest.

It must not use opaque behavioral profiling to reorder conversation meaning.

When new segments arrive:

- preserve the visible anchor and pixel offset;
- do not jump the reader unexpectedly;
- show a bounded **New thread posts** indicator;
- insert only after canonical deduplication and graph validation;
- maintain the selected mode;
- keep read markers stable across pagination and refresh; and
- reconcile edits, deletions, and parent recovery without duplicating cards.

### Data-flow contract

Canonical timeline state remains an ordered list of canonical status IDs.

A pure presentation selector derives:

```ts
interface TimelineThreadBundle {
  bundleId: string;
  rootStatusId: string;
  visibleStatusIds: string[];
  orderedStatusIds: string[];
  order: 'chronological' | 'newest-first' | 'adaptive';
  confidence: number;
  firstUnreadStatusId: string | null;
  newestStatusId: string;
  isLinear: boolean;
  isComplete: boolean;
  excludedStatusIds: string[];
}
```

The selector consumes canonical status entities, Phase 9 graph edges, feed membership, account-scoped preference, read state, and moderation results. It does not write reordered IDs back into canonical timeline or context state.

### Accessibility

- Ordering controls expose their current state and full text labels.
- Visual and DOM order must agree.
- Screen readers are informed when order changes and when new segments become available.
- Focus remains on the activating control after reordering.
- Root/latest/first-unread actions have distinct accessible names.
- Reduced-motion settings disable animated reflow.
- Keyboard users can expand, collapse, and navigate segments without traversing hidden content.
- A chronological detailed conversation view is always available.

## Compatibility matrix

Fixtures must cover direct-origin and federated representations from every supported software family that can produce replies, self-reply threads, wall posts, or platform-native profile-targeted posts.

At minimum, test:

- Mastodon-compatible ordinary mentions and self-reply threads;
- Friendica wall-origin and federated wall-to-wall examples;
- Akkoma/Pleroma reply and mention representations;
- Misskey notes and reply chains, including MFM content;
- platforms that flatten article or long-note objects into ordinary Notes;
- boosts/reshares containing thread segments;
- deleted, edited, filtered, muted, blocked, and unavailable parents;
- mixed visibility and content warnings;
- remote account identity aliases and migrations;
- pagination overlap and streaming duplicates; and
- malformed or cyclic reply metadata.

No platform-name heuristic alone may classify an individual payload as a wall post or authored thread.

## Persistence, migration, and rollback

Wall placement, wall policy, ordering preference, and read position use Phase 7's account-scoped repository and migrations.

Persistence requirements:

- schema-versioned records;
- bounded counts and field lengths;
- canonical account scope in every key;
- transactional migration where supported;
- corruption isolation and safe reset;
- logout/account-removal purge behavior;
- cross-tab synchronization without echo loops; and
- no private post body duplication in placement records.

Rollback removes the wall and bundle projections while leaving canonical statuses untouched. Mangane-only placement records and ordering preferences may be ignored or purged safely. A rollback cannot delete server-owned posts or native wall metadata.

## Testing requirements

### Wall tests

- explicit own-wall and other-profile composition;
- native, Mangane-only, and mention-only outcomes;
- confirmed-publication-before-placement invariant;
- ambiguous publication reconciliation;
- account-switch and IDOR isolation;
- public/private visibility and existence-leak resistance;
- block/mute/filter invalidation;
- deletion and edit reconciliation;
- duplicate notification suppression;
- spam approval queue bounds;
- malformed import and migration rollback; and
- truthful labels across direct and federated fixtures.

### Thread-ordering tests

- chronological, newest-first, and adaptive pure-selector output;
- linear same-author eligibility;
- branch and multi-author abstention;
- cycle and missing-parent rejection;
- boost/reshare distinction;
- content-warning and visibility boundaries;
- pagination and streaming deduplication;
- viewport-anchor preservation;
- first-unread stability;
- edit/delete/context-recovery reconciliation;
- per-account and per-feed settings isolation;
- reduced-motion, keyboard, focus, and screen-reader behavior; and
- rollback to ordinary canonical timeline rendering.

## Exit criteria

Phase 9A is complete only when:

1. the canonical wall-placement and thread-bundle contracts are implemented without duplicate stores;
2. all adapter capability and fixture matrices are versioned and passing;
3. wall publication labels are truthful for native, Mangane-only, and mention-only paths;
4. placement creation cannot precede confirmed canonical publication identity;
5. IDOR, existence-leak, moderation, spam, and account-isolation tests pass;
6. ordering selectors abstain on ambiguous or branched graphs;
7. timeline and detailed conversation chronology remain canonical and reversible;
8. viewport, pagination, streaming, offline, and cross-tab recovery tests pass;
9. accessibility and reduced-motion gates pass;
10. persistence migrations, purge behavior, rollback, and corruption recovery pass;
11. documentation, architecture, persistence, and network authorities are updated; and
12. CI is green with no unresolved review comments.
