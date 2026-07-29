import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const ROADMAP = 'docs/architecture/IMPLEMENTATION_ROADMAP_V2.md';
const INDEX = 'docs/architecture/README.md';
const ADR = 'docs/architecture/ARCHITECTURAL_DECISIONS.md';
const SELF = 'scripts/.tmp-reconcile-phase-8c.mjs';
const WORKFLOW = '.github/workflows/.tmp-phase-8c-reconcile.yml';

function read(path) {
  return readFileSync(path, 'utf8');
}

function write(path, content) {
  writeFileSync(path, content.replace(/\r\n/g, '\n'), 'utf8');
}

function insertOnce(content, marker, insertion, label) {
  if (content.includes(insertion.trim())) return content;
  const index = content.indexOf(marker);
  if (index < 0) throw new Error(`Missing ${label} marker`);
  return `${content.slice(0, index)}${insertion}${content.slice(index)}`;
}

let roadmap = read(ROADMAP);
const statusAnchor = '| Phase 8B — Entity Resolution & Creator Attribution | Queued | [`PHASE_8B_ENTITY_RESOLUTION_AND_CREATOR_ATTRIBUTION.md`](./PHASE_8B_ENTITY_RESOLUTION_AND_CREATOR_ATTRIBUTION.md) |\n';
if (!roadmap.includes('| Phase 8C — Shared Activity Aggregation and Shared Shelf |')) {
  if (!roadmap.includes(statusAnchor)) throw new Error('Missing Phase 8B status-table anchor');
  roadmap = roadmap.replace(
    statusAnchor,
    `${statusAnchor}| Phase 8C — Shared Activity Aggregation and Shared Shelf | Queued | [\`PHASE_8C_SHARED_ACTIVITY_AGGREGATION_AND_SHARED_SHELF.md\`](./PHASE_8C_SHARED_ACTIVITY_AGGREGATION_AND_SHARED_SHELF.md) |\n`,
  );
}

const phaseSection = `## Phase 8C — Shared Activity Aggregation and Shared Shelf

Status: **Queued; see [\`PHASE_8C_SHARED_ACTIVITY_AGGREGATION_AND_SHARED_SHELF.md\`](./PHASE_8C_SHARED_ACTIVITY_AGGREGATION_AND_SHARED_SHELF.md).**

Goal: preserve every legitimate share event while presenting repeated shares of the same canonical post as one safe, stable group and compacting dense runs of distinct shared posts into an accessible responsive Shared Shelf.

Dependencies:

- Phase 5 canonical records, timeline membership, cursor ownership, and account isolation;
- Phase 6 exact-event reconciliation across pagination, streaming, hydration, replay, retries, and multi-tab ingestion;
- Phase 7 feed-neutral timeline read models and commands;
- Phase 8 canonical Home/For You renderer, virtualization, moderation, and anchor restoration;
- Phase 8A canonical origin/alias authority where available.

Deliverables:

- separate event, canonical-content, and presentation identities;
- exact event idempotency without collapsing legitimate shares by different actors;
- canonical-original grouping with bounded, moderation-safe attribution such as “Shared by Alice, Bob, and 4 others”;
- one rolling presentation window spanning network-page boundaries while preserving server cursors and source order;
- responsive Shared Shelf behavior: touch carousel on compact layouts and keyboard-complete shelf/grid/stack alternatives where horizontal presentation is unsuitable;
- deterministic density, consecutive-run, and projected-height activation rules over distinct grouped posts rather than raw share wrappers;
- stable in-place attribution updates and bounded adaptive resurfacing based on elapsed time, material edits, discussion growth, share velocity, explicit priorities, prior viewing, and dismissal state;
- correct undo-share, deletion, edit, moderation-policy change, canonical-alias migration, account move, corruption repair, retention, purge, and rollback behavior;
- application-wide user-facing **Share / Shared** terminology while retaining protocol/API terms such as Mastodon-compatible \`reblog\`, \`reblogged\`, \`show_reblogs\`, \`exclude_reblogs\`, and ActivityPub \`Announce\` at compatibility boundaries;
- generated terminology inventory and guarded migration covering localization, accessibility text, menus, settings, help, tests, and visual baselines without blind symbol replacement;
- account-isolation, IDOR, visibility, moderation, privacy, accessibility, performance, pagination, virtualization, and adversarial tests.

Exit criteria:

- identical delivery events never create duplicate local events or cards, while shares by distinct actors remain recoverable and individually undoable;
- repeated shares of one canonical post render as one group with bounded safe attribution and no blocked, muted, or inaccessible actor leakage;
- the Shared Shelf never changes server cursor ownership, fabricates chronology, causes unbounded fetch loops, or destabilizes reading anchors;
- phone, tablet, desktop, keyboard-only, screen-reader, reduced-motion, forced-colors, RTL, and narrow-column behavior pass acceptance tests;
- deletion, undo, edit, alias migration, moderation changes, logout, account switch, purge, corruption, offline hydration, and rollback converge deterministically;
- user-facing product copy uses Share / Shared, while wire, adapter, persisted-schema, and historical protocol terminology remains compatible;
- no second timeline, status store, canonicalization authority, moderation path, renderer, pagination system, or personalization dependency is introduced.

`;
roadmap = insertOnce(roadmap, '## Phase 9 — Conversation and reading experience', phaseSection, 'Phase 9');
write(ROADMAP, roadmap);

let index = read(INDEX);
const indexInsertion = '- [`PHASE_8C_SHARED_ACTIVITY_AGGREGATION_AND_SHARED_SHELF.md`](./PHASE_8C_SHARED_ACTIVITY_AGGREGATION_AND_SHARED_SHELF.md) defines event-preserving shared-activity deduplication, canonical-original grouping, bounded safe attribution, the responsive Shared Shelf, deterministic resurfacing, Share/Shared product terminology, and pagination, moderation, accessibility, account-isolation, migration, repair, and rollback gates.\n';
index = insertOnce(index, '- [`PHASE_23B_SUBSCRIBED_POST_STORIES.md`]', indexInsertion, 'active-plan index');
write(INDEX, index);

let adr = read(ADR);
const adrInsertion = `## ADR-029 — Preserve share events while grouping canonical content for presentation

Status: Accepted

Date: 2026-07-29

Decision: Add Phase 8C as the single presentation and reconciliation contract for shared activity. Mangane preserves each legitimate share event and its actor, event identity, source position, undo lifecycle, and provenance; exact repeated delivery is idempotent; multiple shares of the same canonical original are projected as one presentation group with bounded safe attribution; dense runs of distinct grouped shared posts may be presented through a responsive Shared Shelf. User-facing product language is Share / Shared, while protocol and API terms remain unchanged at compatibility boundaries.

Context: Mastodon’s bounded feed falloff and simple client suppression reduce repetition but discard or hide meaningful social context and are sensitive to feed velocity. Phanpy’s boost carousel efficiently prevents shared posts from vertically dominating a feed, but its first-wrapper retention and page-bounded heuristics can discard later booster context and vary at pagination boundaries. Mangane needs a local-first model that keeps protocol truth, supports undo/deletion and moderation changes, preserves cursor and anchor correctness, and improves presentation without creating another timeline system.

Alternatives considered: copy Mastodon’s fixed item falloff; retain every share as a full chronological card; discard later share wrappers like a simple client map; put every raw share event into a carousel; require personalization or AI for grouping; rename protocol fields and symbols from reblog/Announce to share.

Rationale: Separating event identity, canonical content identity, and presentation identity allows exact idempotency, complete social provenance, compact rendering, deterministic repair, and reversible resurfacing. A shelf over distinct grouped originals solves boost-density domination without moving deduplication into the protocol layer. Share / Shared is clearer product language, while retaining wire terminology prevents compatibility and migration damage.

Consequences and tradeoffs: Grouping and shelf decisions require bounded rolling state across page boundaries, safe actor attribution, stable virtualization, explicit resurfacing policy, and surface-specific presentation. Strict chronological inspection surfaces must remain available. Horizontal presentation needs non-gesture controls and responsive alternatives. Later personalization may supply optional signals but cannot become required for correctness.

Security/privacy impact: Visibility, authorization, blocks, mutes, domains, filters, and content warnings are applied before grouping and attribution. Records and caches remain account/instance/feed scoped; diagnostics exclude content, actor IDs, canonical URIs, and relationship data. Deleted or inaccessible originals cannot be resurrected from share caches, and blocked or muted actors cannot leak through labels or accessibility text.

Migration/rollback: Phase 8C is additive and feature-flagged. A generated terminology inventory separates product copy from protocol contracts before migration. Rollback disables grouping, shelf presentation, and adaptive resurfacing, restores the existing canonical Phase 8 timeline projection, and retains canonical events/statuses, server cursors, moderation state, and protocol adapter fields. Optional projection state may be rebuilt or purged without data loss.

`;
adr = insertOnce(adr, '## ADR template', adrInsertion, 'ADR template');
write(ADR, adr);

// Remove temporary automation before generating exhaustive documentation hashes.
unlinkSync(SELF);
unlinkSync(WORKFLOW);

execFileSync(process.execPath, ['scripts/generate-documentation-authority-registry.js'], {
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/check-documentation-authority.js'], {
  stdio: 'inherit',
});
