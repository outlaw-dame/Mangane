# Phase 4A Compression and Transfer Efficiency

Status: **Accepted target / queued after Phase 4; local-data slices also depend on Phase 5**

Last updated: 2026-07-29

## Outcome

Mangane uses standards-compliant Gzip and Zstandard compression where measurement proves a net benefit, without making compression a hidden correctness, security, or compatibility dependency.

This phase covers two related but distinct boundaries:

1. **HTTP representation compression** owned by the deployment server, reverse proxy, CDN, or connected backend; and
2. **application-managed compression** for bounded local snapshots, exports, backups, journals, and other explicitly versioned binary envelopes.

The browser must not attempt to replace normal HTTP content negotiation. Mangane application code must not manually decompress responses that Fetch has already decoded, forge forbidden negotiation headers, or assume that a Mastodon-compatible server accepts compressed request bodies.

## Standards and external references

Implementation and conformance work must use the maintained standards rather than compression-library marketing claims:

- Gzip file format: <https://www.rfc-editor.org/rfc/rfc1952>
- HTTP semantics and content codings: <https://www.rfc-editor.org/rfc/rfc9110>
- Zstandard format and `zstd` HTTP content coding: <https://www.rfc-editor.org/rfc/rfc8878>
- Zstandard HTTP window-size requirements: <https://www.rfc-editor.org/rfc/rfc9659>
- Request content-coding discovery: <https://www.rfc-editor.org/rfc/rfc7694>
- Compression Streams API: <https://developer.mozilla.org/docs/Web/API/Compression_Streams_API>
- `CompressionStream` constructor: <https://developer.mozilla.org/docs/Web/API/CompressionStream/CompressionStream>

A production implementation must pin and review every JavaScript, Wasm, native, proxy, or CDN implementation used. Browser API names appearing in a specification or MDN page do not prove support on Mangane's target browser matrix; feature detection and measured fallback remain mandatory.

## Placement and dependencies

Phase 4A follows the Phase 4 PWA, service-worker, caching, update, and offline contracts.

Dependencies by slice:

- server/static representation compression depends on Phase 4 deployment and cache authority;
- API response compression depends on Phase 1 transport seams and the connected server or deployment edge;
- local snapshot and export compression depends on Phase 5 versioned, account-scoped persistence and migration contracts;
- compressed synchronization envelopes depend on Phase 6 idempotency, retry, and reconciliation contracts;
- search/index snapshots depend on the owning search or intelligence phase and remain rebuildable projections.

Phase 4A does not reopen Phase 4 completion. It is an additive efficiency phase with independent rollout and rollback.

## Terminology

### Representation compression

HTTP response content coding selected through standards-based negotiation, such as:

```text
Content-Encoding: gzip
Content-Encoding: zstd
Vary: Accept-Encoding
```

The browser receives and transparently decodes the selected representation before application code consumes the response body.

### Application envelope compression

Mangane explicitly serializes bytes, compresses them, records the algorithm and integrity metadata, and later performs bounded decompression. This is appropriate for local exports or snapshots, not ordinary Fetch responses.

### Transport is not storage

An API response being transferred with Gzip or Zstandard does not imply that Mangane should store the compressed HTTP representation. Canonical records remain governed by Phase 5. Conversely, a compressed local snapshot must not be served as an HTTP representation without the correct HTTP metadata.

## Compression policy

Mangane uses a capability-and-measurement policy rather than a universal preference.

```ts
export type CompressionAlgorithm = 'zstd' | 'gzip' | 'identity';

export interface CompressionDecision {
  algorithm: CompressionAlgorithm;
  reason:
    | 'server-negotiated'
    | 'measured-local-benefit'
    | 'unsupported'
    | 'already-compressed'
    | 'below-size-threshold'
    | 'cpu-or-battery-budget'
    | 'data-saver-policy'
    | 'recovery-fallback';
}
```

Required ordering for application-managed envelopes:

1. use Zstandard only when a reviewed implementation is available, feature detection succeeds, and target-device measurements pass;
2. otherwise use Gzip when supported and beneficial;
3. otherwise store or transfer the versioned identity representation;
4. never make inability to compress a reason to lose user-owned data.

The algorithm choice is recorded per envelope. A global preference must not make old data unreadable after capability changes.

## HTTP response compression

### Browser responsibility

For normal Fetch and navigation requests, the browser and server negotiate response compression. Mangane must:

- allow the user agent to advertise supported content codings;
- consume the decoded body through Fetch, Axios, streaming, or browser APIs;
- avoid setting or depending on a manually supplied `Accept-Encoding` header;
- avoid decompressing an already decoded response;
- preserve streaming behavior where the browser exposes a decoded stream;
- treat `Content-Length` as representation metadata, not an uncompressed-body limit.

### Deployment responsibility

Mangane deployment guidance must support:

- Gzip as the broad compatibility baseline for compressible text representations;
- Zstandard when the proxy/CDN/server and real client population interoperate;
- correct `Vary: Accept-Encoding` behavior;
- no compression for responses carrying `Cache-Control: no-transform`;
- no double compression;
- no compression of ranges unless the serving stack proves correct byte-range semantics;
- distinct cache variants without cross-account or authorization leakage;
- minimum-size thresholds and compressible content-type allowlists;
- CPU, memory, latency, and concurrency ceilings;
- streaming flush behavior appropriate to SSE and long-lived responses;
- a tested identity fallback.

Static immutable assets may be precompressed during release production when the deployment edge can select the correct variant and integrity checks prove correspondence with the original asset. Source files and generated variants must not drift.

### Zstandard HTTP constraints

For `Content-Encoding: zstd`, encoders must follow RFC 9659 and must not produce frames requiring a window larger than 8 MB. Decoders must reject non-conforming oversized-window frames safely rather than allocating attacker-controlled memory.

Mangane deployment tests must cover:

- a conforming frame at the supported window boundary;
- an oversized-window frame;
- truncated and corrupt frames;
- mismatched `Content-Encoding`;
- stale CDN variants and missing `Vary`;
- clients that advertise only Gzip or identity;
- proxy chains that remove or recompress representations.

### Dynamic API responses

Compression is most likely useful for sufficiently large JSON, HTML, CSS, JavaScript, SVG, ActivityPub JSON-LD, and text/event payloads. It is normally wasteful for already compressed JPEG, AVIF, WebP, PNG, audio, video, archives, and many font formats.

The deployment must measure real payload distributions before setting thresholds. A single threshold may not be appropriate across static assets, API JSON, and streaming responses.

### SSE and streaming

Compression must not destroy live-stream quality by buffering events for an excessive period. For SSE or other incrementally consumed responses:

- measure time-to-first-event and event flush latency;
- verify intermediary idle timeout and buffering behavior;
- disable a coding when the stack cannot flush safely;
- never trade reliable event delivery for a small bandwidth reduction;
- retain heartbeat behavior and cancellation.

FediBuzz's external stream remains controlled by its operator. Mangane cannot require that upstream to use a particular content coding.

## HTTP request compression

Mangane must not optimistically compress ordinary Mastodon, Akkoma, or Pleroma API requests merely because a browser can produce Gzip or Zstandard bytes.

Request compression is enabled only when the exact endpoint or a verified capability explicitly advertises an accepted content coding, including through the RFC 7694 `Accept-Encoding` response mechanism or a documented backend contract.

Requirements:

- capability is scoped to origin, method, path class, media type, and account context;
- a compressed request carries the correct `Content-Encoding` and original media type;
- retries remain idempotency-safe under Phase 6;
- `415 Unsupported Media Type` disables the capability for the bounded cache period indicated by policy;
- upload progress and cancellation remain correct;
- secrets are never included in capability diagnostics;
- uncompressed fallback is used only when retrying the operation is safe;
- small requests and media already encoded efficiently remain uncompressed.

Compressed request support is not a launch requirement for Phase 4A.

## Application-managed compression

### Approved initial uses

The initial implementation may evaluate compression for:

- user-requested account-safe export bundles;
- canonical-store backup or migration snapshots;
- rebuildable lexical/vector index snapshots;
- bounded diagnostic bundles after privacy redaction;
- durable event or journal batches when the owning protocol explicitly supports an application envelope;
- large locally cached structured projections where decompression latency is acceptable.

Each use requires an owner, schema, retention, deletion, and recovery contract. Compression is not permission to duplicate private data or retain it longer.

### Explicit non-approved uses

Do not initially compress individual status rows, tokens, tiny settings records, active outbox entries, media blobs already compressed by their format, or arbitrary IndexedDB values without benchmark evidence. Per-record compression can increase CPU cost, migration complexity, write amplification, and corruption blast radius.

### Envelope format

Every application-compressed object uses a versioned envelope outside the compressed payload:

```ts
export interface CompressedEnvelopeHeader {
  envelopeVersion: number;
  algorithm: 'zstd' | 'gzip' | 'identity';
  mediaType: string;
  schemaId: string;
  schemaVersion: number;
  uncompressedBytes: number;
  compressedBytes: number;
  checksumAlgorithm: 'sha-256';
  checksum: string;
  createdAt: string;
  accountScopeId?: string;
}
```

The header is validated before allocation or decompression. The checksum covers the canonical uncompressed bytes unless a narrower owning specification explicitly requires otherwise.

Compression does not provide encryption or authenticity. Sensitive exports require the separate encryption, key custody, and user-confirmation policy of the owning feature.

### Browser implementation

Prefer the native Compression Streams API in a dedicated worker when the requested algorithm is actually supported:

```ts
function supportsCompressionFormat(format: 'zstd' | 'gzip'): boolean {
  try {
    new CompressionStream(format);
    new DecompressionStream(format);
    return true;
  } catch {
    return false;
  }
}
```

The illustrative probe is not sufficient alone. Production capability detection must also run a bounded round-trip fixture because constructor availability does not prove correct interoperability.

If target browsers lack native Zstandard support, a Wasm fallback may be considered only after:

- dependency and license review;
- supply-chain pinning and integrity verification;
- bundle, startup, memory, and battery measurement;
- worker isolation;
- deterministic decoder limits;
- malformed-frame and fuzz testing;
- confirmation that Gzip does not already meet the product need.

A large Zstandard Wasm dependency must not be placed in the initial application bundle solely to reduce optional local storage.

## Bounded decompression and hostile inputs

All compressed input is untrusted, including locally stored browser data.

Before and during decompression Mangane must enforce:

- maximum compressed bytes;
- maximum declared uncompressed bytes;
- maximum actual emitted bytes independent of the declaration;
- maximum expansion ratio;
- Zstandard 8 MB HTTP window rule where HTTP coding is involved;
- per-operation wall-clock and CPU budget;
- cancellation through `AbortSignal`;
- worker memory ceiling and termination recovery;
- nesting and archive-entry limits for container formats;
- checksum verification before import or canonical commit;
- fail-closed handling of trailing garbage, truncation, checksum mismatch, and unsupported algorithms.

Decompressed bytes must not be accumulated in one unbounded JavaScript string or array. Stream into a bounded sink or chunked parser where practical.

## Persistence and migrations

Compressed data remains account scoped and schema versioned.

Migration rules:

1. read and validate the envelope header;
2. verify capability and size policy before decompression;
3. decompress into a temporary bounded transaction or staging store;
4. validate the contained schema;
5. commit canonical records and migration checkpoint atomically;
6. retain the prior recoverable representation until the commit succeeds;
7. remove obsolete data only after verification;
8. quarantine or discard corrupt rebuildable projections;
9. never silently discard user-owned drafts, bookmarks, or settings because a decoder is unavailable.

A compression-algorithm migration is resumable. It must not require decompressing the entire account database in one foreground session.

## Service worker and cache behavior

The service worker treats HTTP content coding as browser-managed representation metadata. It must not create duplicate cache entries based on decoded body bytes while omitting the response headers that define the representation.

Application-compressed local resources require explicit cache keys containing envelope and schema versions. Service-worker update and rollback must continue to read the previous approved algorithms for the documented compatibility window.

No compressed private response may enter a shared cache merely because its encoded size is small.

## Data saver and adaptive policy

Compression policy may use explicit data-saver preferences and measured device capability, but must not infer sensitive user traits.

Possible inputs:

- payload size and media type;
- algorithm availability;
- previous measured compression ratio for the same schema class;
- current foreground/background state;
- battery-saving preference where exposed and approved;
- device memory class where exposed and privacy-safe;
- network-saving user setting.

Do not use unstable network heuristics to repeatedly recompress the same data. Cache a bounded decision by schema and size bucket, not by user content.

## Observability

Allowed privacy-safe measurements:

- algorithm and fallback category;
- compressed and uncompressed byte buckets;
- ratio bucket;
- compression/decompression latency bucket;
- failure category;
- worker termination or cancellation count;
- unsupported-capability count;
- cache hit/miss by representation class;
- server-side CPU and response-latency budgets where operated by Mangane.

Do not log payloads, post text, handles, account IDs, tokens, URLs containing credentials, compressed bytes, checksums that can identify private documents, or exact private record sizes.

## Rollout and rollback

Use independently owned feature/configuration controls for:

- static deployment Zstandard;
- dynamic API Zstandard;
- Gzip deployment baseline changes;
- each application-envelope class;
- optional Wasm decoder loading;
- compressed request bodies.

Rollback must:

- immediately stop producing the affected coding;
- continue decoding previously committed supported envelopes for the compatibility window;
- serve Gzip or identity HTTP representations;
- preserve canonical data;
- invalidate unsafe CDN variants;
- prevent old service workers from writing a removed envelope version;
- provide a resumable decompression/rewrite path before retiring a decoder.

## Implementation slices

### 4A.1 — Inventory and benchmarks

- inventory deployment servers, reverse proxies, CDN behavior, static assets, API payloads, service-worker caches, local snapshots, exports, and existing codecs;
- capture compressibility, transfer latency, CPU, memory, battery, and streaming-flush baselines;
- classify already compressed types and sensitive/private data;
- define target-browser capability matrix.

### 4A.2 — HTTP Gzip correctness baseline

- verify Gzip negotiation, `Vary`, cache variants, range behavior, thresholds, content types, streaming, and identity fallback;
- add deployment fixtures and integration tests;
- document operator configuration without assuming one server stack.

### 4A.3 — HTTP Zstandard evaluation

- enable only in a representative non-production environment;
- enforce RFC 9659 window sizing;
- test clients, proxies, caches, service workers, and rollback;
- compare against Gzip on real Mangane payload classes;
- adopt only where latency and bandwidth improve without exceeding CPU budgets.

### 4A.4 — Application envelope contract

- implement versioned headers, integrity metadata, strict limits, typed errors, and identity fallback;
- add worker-based Gzip support using native streams;
- evaluate native or reviewed Wasm Zstandard behind capability detection;
- add fixtures and fuzz/malformed tests.

### 4A.5 — First bounded local use

Select one rebuildable or user-invoked large data class, preferably an export or index snapshot. Implement migration, cancellation, quota failure, recovery, and rollback end to end before expanding.

### 4A.6 — Optional request compression

Implement only after a concrete connected backend advertises and tests the capability. Keep this slice deferred otherwise.

## Tests

### Unit

- capability detection and round trip;
- algorithm fallback ordering;
- envelope/header/schema validation;
- checksum verification;
- size, ratio, timeout, and cancellation limits;
- unsupported algorithm and future-version behavior;
- retry classification for request compression.

### Integration

- Gzip, Zstandard, and identity representation negotiation;
- correct `Vary` and cache separation;
- service-worker update and rollback;
- proxy double-compression prevention;
- SSE flush and reconnect behavior;
- local snapshot interruption and resumable migration;
- quota exhaustion and corrupt local storage;
- cross-account purge and cache isolation.

### Security and adversarial

- decompression bomb and forged size declaration;
- oversized Zstandard window;
- malformed, truncated, concatenated, and trailing-garbage frames;
- checksum substitution;
- cross-account envelope replay;
- content-type confusion;
- credential-bearing diagnostic leakage;
- compressed request replay without idempotency;
- cache poisoning through omitted or incorrect `Vary`;
- user-controlled codec or destination selection.

### Performance

- representative low-, mid-, and high-end mobile devices;
- cold and warm worker startup;
- main-thread blocking;
- memory high-water mark;
- battery and CPU cost;
- transfer savings and end-to-end latency;
- streaming event latency;
- bundle cost of every optional codec.

## Explicit non-goals

- replacing TLS;
- treating compression as encryption or integrity protection;
- forcing Zstandard on unsupported browsers;
- embedding a large Wasm codec without measured need;
- manually setting browser HTTP negotiation headers;
- compressing every IndexedDB record;
- compressing already compressed media;
- assuming every Fediverse API accepts compressed requests;
- retaining more private data because it occupies fewer bytes;
- weakening body-size limits after compression;
- changing canonical social-data authority.

## Exit criteria

Phase 4A is complete only when:

1. HTTP and application-envelope compression remain separate documented boundaries;
2. Gzip behavior is correct across deployment, cache, service-worker, and streaming tests;
3. any enabled HTTP Zstandard encoder follows the 8 MB window requirement and passes interoperability tests;
4. unsupported clients receive a correct Gzip or identity representation;
5. application envelopes are versioned, integrity-checked, cancellable, size-bounded, account-scoped, and migration-safe;
6. decompression-bomb, malformed-frame, cache-poisoning, cross-account, and credential-leakage tests pass;
7. at least one bounded application use demonstrates measured net benefit and reversible migration;
8. request compression remains disabled unless an exact backend capability is verified;
9. no compression work blocks rendering, scrolling, posting, logout, or recovery beyond approved budgets;
10. production and rollback configurations are tested;
11. documentation and operator guidance match the deployed behavior;
12. CI and review are clean with no unresolved security, privacy, interoperability, or data-loss blocker.
