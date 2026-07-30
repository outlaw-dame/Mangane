import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, value) => fs.writeFileSync(path, value);

const roadmapPath = 'docs/architecture/IMPLEMENTATION_ROADMAP_V2.md';
let roadmap = read(roadmapPath);
roadmap = roadmap.replace(
  '| Phases 10–23 | Queued | Begin only after their dependency and preceding-phase exit criteria are met |',
  '| Phase 10 — Threaded Post Composer and Reliable Publishing | Queued | [`PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md`](./PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md) |\n| Phases 11–23 | Queued | Begin only after their dependency and preceding-phase exit criteria are met |',
);
const oldPhase10 = `## Phase 10 — Composer and publishing migration

Goal: create a lightweight, reliable Framework7 composer before adding intelligence.

Deliverables:

- draft persistence and account scoping;
- visibility/audience controls;
- reply and quote context;
- media upload sequencing and recovery;
- content warnings and backend-specific content types;
- character/counting behavior;
- offline/pending publication state;
- edit/conflict handling;
- accessible keyboard and focus behavior.

Exit criteria:

- feature parity with current supported publishing behavior;
- drafts survive reload and failed uploads;
- no draft crosses account boundaries.`;
const newPhase10 = `## Phase 10 — Threaded Post Composer and Reliable Publishing

Status: **Queued; see [\`PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md\`](./PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md).**

Goal: migrate the composer through Framework7 while adding a clean Threads-inspired multi-post authored-sequence flow, safe long-text splitting, durable sequential publication, partial-success recovery, and later continuation without creating a proprietary thread object or duplicate draft/outbox/publishing authority.

Deliverables and exit criteria are authoritative in the detailed Phase 10 plan. Phase 10 reuses Phase 5 drafts/statuses/media, Phase 6 durable outbox and retry policy, Phase 7 commands/capabilities, Phase 8D content-source and Markdown/MFM contracts, Phase 9 conversation reading, and existing publishing adapters. It must not introduce a second draft store, media uploader, publication client, retry queue, conversation graph, or remote thread object.`;
if (!roadmap.includes(oldPhase10)) throw new Error('Phase 10 roadmap block not found');
roadmap = roadmap.replace(oldPhase10, newPhase10);
write(roadmapPath, roadmap);

const readmePath = 'docs/architecture/README.md';
let readme = read(readmePath);
const phase9Line = '- [`PHASE_9_ORIGIN_AUTHORITATIVE_CONVERSATION_TREES.md`](./PHASE_9_ORIGIN_AUTHORITATIVE_CONVERSATION_TREES.md) defines Mangane’s origin-first immutable conversation graph, focused-path and chronological projections, adaptive branch summaries, durable account-scoped reading state, moderation-safe unread semantics, responsive Framework7 presentation, accessibility, performance, repair, migration, and rollback gates without duplicating Phase 8A or the Context Recovery Coordinator.';
const phase10Line = '- [`PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md`](./PHASE_10_THREADED_POST_COMPOSER_AND_RELIABLE_PUBLISHING.md) defines Mangane’s Threads-inspired multi-post authored-sequence composer, safe long-text splitting, account-scoped sequence drafts, Phase 6-backed sequential publication and ambiguous-outcome reconciliation, partial-success recovery, Continue thread behavior, minimal semantic icon language, and Phase 9 reading integration without introducing a proprietary thread object or duplicate draft, outbox, uploader, publisher, or conversation authority.';
if (!readme.includes(phase9Line)) throw new Error('Phase 9 README line not found');
readme = readme.replace(phase9Line, `${phase9Line}\n${phase10Line}`);
write(readmePath, readme);

const adrPath = 'docs/architecture/ARCHITECTURAL_DECISIONS.md';
let adr = read(adrPath);
const template = '## ADR template';
const adr031 = `## ADR-031 — Multi-post authored sequences use ordinary replies and the existing durable outbox

Status: Accepted

Date: 2026-07-30

Decision: Expand canonical Phase 10 into Threaded Post Composer and Reliable Publishing. Mangane may coordinate an unpublished multi-segment authored sequence locally, but each published segment remains an ordinary canonical status and replies to the immediately preceding confirmed segment. Phase 5 remains the draft/status authority, Phase 6 remains the durable outbox/retry authority, protocol adapters remain the capability and publication authority, and Phase 9 remains the conversation-reading authority.

Context: Meta Threads demonstrates the strongest user experience for preparing several connected posts before publication, including adding segments inside one composer and proposing splits for over-limit pasted text. Phanpy provides useful lightweight Continue thread and thread-identification cues. Mangane needs those benefits without pretending a sequence can publish atomically across ordinary Fediverse APIs, duplicating status data, inventing a proprietary ActivityPub thread object, or creating a second draft/outbox/publisher.

Alternatives considered: keep only one-post-at-a-time self-replies; copy Threads without durable recovery; create a proprietary remote thread object; create a second thread draft database and publication queue; publish all segments concurrently; retry timed-out POST requests blindly; make every same-author reply a deliberate thread; use emoji as the primary control language.

Rationale: A local authored-sequence draft and publication-run projection can deliver a first-class composer while preserving interoperable reply semantics. Strict sequential confirmation, idempotency where available, ambiguous-outcome reconciliation, and exact partial-success state protect against duplicate or mis-parented publication. Collision-resistant authored-sequence terminology keeps composition separate from Phase 9 conversation trees.

Consequences and tradeoffs: Publication is coordinated but not remotely atomic. Later segments wait for confirmed parent identity, so long sequences may take longer to publish. Partial success must remain visible and recoverable. Scheduling is exposed only when an approved backend or durable authority can preserve parent dependencies. Published segments cannot be reordered as one object.

Security/privacy impact: Every draft, segment, media reference, run, command, callback, and projection is account/instance scoped. Content and fingerprints remain out of diagnostics. Ambiguous non-idempotent requests reconcile before retry. Capability and authorization checks fail closed. Private content follows ordinary authorized publication and is not sent to third-party or origin services outside that path.

Migration/rollback: Phase 10 is additive and feature-flagged. Rollback restores the single-status composer, pauses active authored-sequence runs safely through Phase 6, preserves compatible drafts and every already-published status, and disables local sequence provenance without changing canonical reply edges or Phase 9 reading.

`;
if (!adr.includes(template)) throw new Error('ADR template marker not found');
adr = adr.replace(template, `${adr031}${template}`);
write(adrPath, adr);
