# Mangane Data, Privacy, and Resilience Architecture

Status: **Accepted target**

Last updated: 2026-07-23

## 1. Principle

Remote servers remain authoritative for remote social objects and protocol state. Mangane maintains a normalized local representation for offline use, search, reconciliation, and user-controlled intelligence. Derived data is rebuildable and must never silently become the only copy of user-authored content.

## 2. Data classes

### Canonical local records

- accounts and profiles;
- posts/statuses;
- conversations and reply edges;
- media metadata;
- notifications;
- lists and relationships;
- bookmarks/favourites where locally mirrored;
- moderation and visibility state;
- protocol capability snapshots.

### Durable user state

- settings;
- drafts;
- saved searches;
- semantic filters;
- explicit interests;
- local notes;
- outbox operations;
- synchronization checkpoints.

### Derived intelligence data

- lexical projections;
- embeddings;
- vector graph/index;
- entity mentions and canonical links;
- topic assignments;
- affinity and repetition features;
- query calibration data;
- explanation evidence;
- Gist caches.

Derived data must include provenance and version metadata and be safely deletable/rebuildable.

## 3. Account isolation

Every durable record is scoped by account, instance, or an explicitly shared local profile. Repository APIs require account scope; implicit global access is forbidden.

Cross-account sharing of interests or indexes is opt-in and represented as a separate approved profile. Signing out does not necessarily delete data, but the user must be able to choose retain, lock, or delete.

Tests must attempt cross-account access through IDs, search results, caches, worker messages, notifications, and migrations.

## 4. Canonical store and index journal

Search indexes and other derived systems may use different browser storage technologies. Coordinate them through a durable mutation journal.

```ts
interface IndexMutation {
  operationId: string;
  accountId: string;
  sourceId: string;
  sourceRevision: string;
  operations: string[];
  state: 'pending' | 'processing' | 'committed' | 'retryable-failure' | 'dead-letter';
  attemptCount: number;
  nextAttemptAt?: number;
}
```

Requirements:

- idempotent replay;
- bounded retries with jitter;
- dead-letter inspection and repair;
- source revision validation;
- no stale projection activation;
- tombstones take effect before physical index cleanup;
- startup reconciliation after interrupted writes.

## 5. Storage backend evaluation

Browser implementation must evaluate IndexedDB and OPFS-based options with actual target browsers. Selection criteria:

- transaction behavior;
- worker access;
- quota and eviction;
- streaming and random access;
- corruption recovery;
- migration support;
- performance under realistic corpus sizes;
- Safari/PWA behavior;
- accessibility of backup/export.

Do not adopt ObjectBox directly for the PWA unless browser vector support, persistence, licensing, bundle impact, and lifecycle behavior are verified. It remains an architectural reference. Native wrappers may use different engines only behind a shared conformance contract.

## 6. Storage pressure and retention

Mangane must expose meaningful storage controls:

- current approximate usage;
- content cache policy;
- media cache policy;
- search/index usage;
- model storage;
- per-account deletion;
- clear derived intelligence only;
- full local reset.

Retention should prioritize user-authored drafts and durable preferences over reconstructible remote caches and indexes.

When storage pressure is detected:

1. stop nonessential prefetch;
2. compact temporary and stale projections;
3. remove expired media caches;
4. preserve canonical minimum records and durable user state;
5. notify the user before destructive broad cleanup where possible;
6. fall back to smaller or lexical-only indexes.

## 7. Privacy boundaries

Core rules:

- no cloud profiling by default;
- no draft or private-thread upload to a remote model without explicit invocation and disclosure;
- embeddings and semantic profiles are private local data;
- analytics must not include content, embeddings, sensitive topics, or stable cross-instance behavioral fingerprints;
- personalization must be inspectable and resettable;
- sensitive-trait inference is not a product objective;
- source enrichment requests should minimize disclosed query context;
- Wikidata/DBpedia enrichment caches retain provenance and only necessary fields.

## 8. Encryption and device security

Browser storage encryption is constrained by the platform and threat model. Document what is and is not protected. Do not claim encryption at rest unless keys and recovery behavior are actually implemented.

For future native applications, prefer platform key stores and non-exportable keys where applicable. PWA sessions must avoid persisting secrets beyond what protocol operation requires.

## 9. Deletion semantics

Deletion must cover:

- canonical cached record;
- lexical projection;
- vector entry;
- entity/topic projections;
- explanation evidence;
- Gist cache;
- interaction features derived solely from the deleted record;
- queued operations referring to it where appropriate.

Physical vector removal may be asynchronous, but a tombstone must immediately prevent exposure. Deletion verification should be testable.

## 10. Sync and reconciliation

Remote events are hints until canonical records are fetched or verified. Notifications or streaming events must not bypass authorization and visibility checks.

Reconciliation handles:

- edits;
- deletes;
- visibility changes;
- block/mute changes;
- account switching;
- clock skew;
- duplicate events;
- out-of-order events;
- partial page loads;
- stale capability data.

Checkpoints must be account-scoped and crash safe.

## 11. Conflict handling

Drafts and pending mutations require explicit conflict policy. Never silently overwrite a newer remote version. Surface merge or retry choices for user-authored content.

Automatic reconciliation is acceptable for rebuildable caches and derived indexes, not for ambiguous user-authored state.

## 12. Resilience and degraded operation

Mangane must anticipate:

- offline startup;
- model download interruption;
- index corruption;
- quota exceeded;
- worker termination;
- browser tab suspension;
- service-worker update;
- stale schemas;
- backend capability regression;
- expired authentication;
- rate limits;
- partial instance outages.

Recovery techniques:

- resumable migrations and model downloads;
- checksums and manifests;
- index quarantine and rebuild;
- lexical-only search;
- remote-search fallback;
- outbox inspection;
- circuit breakers for repeatedly failing optional services;
- bounded cache and retry policies;
- explicit user-visible sync state.

## 13. Service worker and PWA policy

The service worker may cache application assets and approved responses. It must not indiscriminately cache private API responses under shared keys.

Requirements:

- account-aware or token-independent cache design;
- safe update activation;
- rollback plan for broken assets;
- no hidden telemetry;
- offline shell availability;
- clear stale-content behavior;
- tests for logout and account switching;
- cache purge on security-sensitive transitions where required.

## 14. Observability

Local diagnostics may record:

- operation type;
- duration;
- error category;
- index version;
- corpus size bucket;
- device capability tier;
- recovery action.

They must not record raw content, query text by default, embeddings, access tokens, private entities, or stable sensitive profiles. Exported diagnostic bundles require user review and redaction.

## 15. Backup and export

Provide export boundaries for:

- settings;
- drafts;
- saved searches;
- semantic filter definitions;
- explicit interests;
- optional local notes.

Derived indexes generally should be rebuilt rather than exported. If exported for diagnostics or migration, they require explicit warning and protection because embeddings may reveal information.

## 16. Definition of done

The data layer is production-ready only when:

- schemas and ownership are documented;
- migrations are resumable and tested;
- account isolation tests pass;
- quota and corruption recovery are tested;
- deletion reaches derived data;
- offline and degraded paths work;
- index rebuilds do not destroy canonical state;
- observability is privacy-reviewed;
- logout/account-switch behavior is verified;
- storage controls are available to users.