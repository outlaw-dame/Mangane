# Mangane Search and Local Intelligence Architecture

Status: **Accepted target**

Last updated: 2026-07-23

## 1. Objective

Mangane will provide local-first hybrid retrieval and contextual intelligence. The system combines exact lexical retrieval, semantic similarity, entities, topics, conversation structure, relationships, time, and explicit user preferences without requiring a centralized behavioral profile.

Search and intelligence are related but distinct:

- Search retrieves and ranks information in response to explicit intent.
- Explore recommends and organizes information without an explicit query.
- Composer intelligence evaluates draft and conversation context.
- Semantic filtering reduces or hides concepts based on explicit user policy.
- Gist synthesizes evidence already retrieved; it is not a source of truth.

## 2. Research synthesis

### ObjectBox lessons

Emulate:

- vectors as first-class projections of canonical local records;
- embedded, persistent vector indexing;
- HNSW approximate-nearest-neighbor retrieval;
- incremental insert, update, and deletion;
- metadata constraints around vector retrieval;
- bounded caches rather than requiring all vectors in memory;
- graph repair and lifecycle awareness;
- transactional consistency as an architectural goal.

Improve:

- strict vector dimension/model compatibility;
- browser-safe journaling across stores;
- explicit lexical index and rank fusion;
- model-versioned parallel indexes;
- deterministic degraded modes.

### Weaviate lessons

Emulate:

- independent lexical and vector candidate generation;
- candidate union rather than intersection;
- BM25F-style field-aware lexical scoring;
- reciprocal-rank and score-based fusion;
- configurable lexical/semantic weighting;
- filters distinct from soft boosts;
- candidate oversampling;
- second-stage reranking;
- named vectors where justified;
- score contribution explanations.

Improve:

- adaptive query planning rather than a single alpha;
- robust score calibration rather than candidate-sensitive min-max only;
- additional entity, topic, conversation, and relationship retrievers;
- local privacy-preserving personalization;
- stable incremental ranking.

### Meilisearch lessons

Emulate:

- typo tolerance as standard behavior;
- prefix search and search-as-you-type;
- matched-word coverage;
- proximity, exactness, and attribute priority;
- split/concatenated term recovery;
- semantic score distribution calibration;
- versioned embedding templates;
- facets and filters;
- small-model-first evaluation.

Improve:

- combine deterministic lexical rules with BM25F;
- classify social identifiers before typo or split behavior;
- avoid embedding on every keystroke;
- adapt semantic weighting by query intent;
- add local entity, conversation, and personalization channels.

## 3. Core components

```text
Query Understanding
  ├── Unicode and language normalization
  ├── token classification
  ├── temporal parsing
  ├── entity mention detection
  └── query-intent classification

Candidate Retrieval
  ├── lexical inverted index
  ├── HNSW vector index
  ├── entity alias/index
  ├── topic index/graph
  ├── conversation graph
  └── relationship and personal-memory lookup

Ranking
  ├── score calibration
  ├── rank/score fusion
  ├── hard eligibility validation
  ├── soft boosts and penalties
  ├── optional reranking
  ├── diversity control
  └── explanations
```

## 4. Canonical and derived data

Canonical social records are authoritative. Search projections are rebuildable.

```ts
interface SearchProjectionManifest {
  sourceId: string;
  sourceRevision: string;
  contentHash: string;
  lexicalSchemaVersion: number;
  embeddingModelId?: string;
  embeddingModelRevision?: string;
  embeddingTemplateVersion?: number;
  vectorDimensions?: number;
  generatedAt: number;
}
```

No search result may be exposed without resolving its canonical record and rechecking current visibility, block, deletion, and account scope.

## 5. Lexical retrieval

The lexical engine should combine deterministic social-search rules and corpus-based relevance.

### Token classes

- normal word;
- quoted phrase;
- handle;
- hashtag;
- URL/domain;
- DID or protocol identifier;
- version/error code;
- numeric/date token;
- emoji;
- entity alias;
- code fragment.

### Policy

- typo-tolerant: ordinary words, names, discovery terms;
- exact or narrowly prefix-aware: handles, DIDs, URLs, AT URIs, codes and cryptographic identifiers;
- semantic-expandable: ordinary concepts and resolved entities;
- accent-folded alongside original forms;
- stopwords retained in the index and handled at query time;
- trigrams used selectively for names and discovery, never indiscriminately.

### Field profiles

Post search may index:

- body;
- hashtags;
- author handle and display name;
- entity labels and aliases;
- topic labels;
- domains and URLs;
- alt text;
- quoted post text;
- limited conversation context.

Exact identifiers receive override rules. BM25F or equivalent scoring operates within appropriate result groups, not as the sole lexical authority.

## 6. Semantic retrieval

The initial semantic representation should be a compact text-content embedding. Additional named vectors require evaluation evidence.

Potential vector spaces:

- content;
- conversation;
- media;
- entity.

Every vector index has a manifest binding:

- model and revision;
- dimensions;
- normalization;
- distance metric;
- template version;
- index algorithm/version.

Mismatched vectors must be rejected, never truncated silently.

### HNSW policy

HNSW is the baseline ANN algorithm. Construction and query parameters are device-profiled. Candidate limits, graph connectivity, insertion quality, deletion repair, and memory use require corpus benchmarks.

### Model lifecycle

```text
index-v1 active
index-v2 building
index-v2 verified
atomic activation
index-v1 retiring
```

Search remains available through the old index or lexical-only mode during migration.

## 7. Embedding templates

Embedding input must be intentional, bounded, and versioned. A post projection may include:

- author display context where useful;
- post text;
- language;
- resolved entities;
- topic labels;
- limited parent/thread summary;
- alt text.

It must exclude tokens, private local annotations, engagement manipulation signals, hidden account data, and unrelated storage metadata.

## 8. Query planning

The planner selects retrievers, field weights, semantic weight, thresholds, vector space, and candidate depth.

Examples:

- handle/URL/code query: lexical dominant;
- quoted phrase: lexical dominant with optional semantic support;
- broad conceptual query: semantic and entity stronger;
- personal recall query: semantic, conversation, time, and local interaction evidence;
- media query: text plus media vector where available;
- account search: handle/display-name profile, not post-content ranking.

User-facing modes:

- Balanced;
- Exact;
- Conceptual.

These adjust planner policy rather than expose raw alpha values.

## 9. Candidate generation and fusion

Retriever candidates are unioned and deduplicated.

```ts
interface RetrievalCandidate {
  documentId: string;
  retriever: 'lexical' | 'semantic' | 'entity' | 'topic' | 'conversation' | 'relationship';
  rank: number;
  rawScore?: number;
  calibratedScore?: number;
  evidence: Record<string, unknown>;
}
```

Supported fusion strategies:

1. reciprocal-rank fusion for incompatible or uncalibrated retrievers;
2. relative-score fusion for early experimentation;
3. calibrated weighted fusion as the long-term target;
4. learned fusion only after sufficient relevance data and privacy review.

Fallback order:

```text
calibrated fusion
  → relative score
  → reciprocal rank
```

## 10. Score calibration

Raw vector similarity and BM25-like scores are not directly comparable. Calibration is model- and retriever-specific.

Evaluate:

- percentile clipping;
- sigmoid mapping;
- quantile mapping;
- isotonic regression;
- query-class-specific calibration.

Calibration artifacts are versioned and testable. Ranking must not change unpredictably merely because one outlier enters or leaves the candidate set.

## 11. Eligibility, boosts, and penalties

### Hard eligibility

- current access and visibility;
- account scope;
- deletion/tombstone;
- block policy;
- strict mute or semantic-hide policy;
- explicit date/surface scope;
- valid canonical record.

### Soft contributions

- lexical relevance;
- semantic relevance;
- entity/topic match;
- conversation continuity;
- relationship affinity;
- explicit interests;
- recency;
- source preference;
- popularity with logarithmic caps.

### Penalties

- repetition;
- already-seen content where requested;
- near duplicates;
- excessive same-author concentration;
- low-confidence vector-only retrieval;
- stale or incomplete projection.

Canonical relevance and personal utility remain separately recorded.

## 12. Reranking

Reranking is optional and operates only on a bounded fused candidate set. Initial options:

- feature-based local reranker;
- small cross-encoder if device budgets permit;
- entity and conversation consistency model;
- pairwise local learning-to-rank after sufficient evaluation.

Progressive reranking may refine lower, unseen results. Do not reorder content under the user's pointer, focus, or current reading position.

## 13. Entity and topic intelligence

Entity pipeline:

```text
mention detection
  → candidate generation
  → contextual resolution
  → canonical local entity
  → optional Wikidata/DBpedia enrichment
```

External knowledge bases enrich but do not define internal storage. Cache only needed fields with provenance, retrieval time, and license/attribution metadata.

Topic assignments are local derived data with confidence and model/version provenance. They are not permanent facts about users or authors.

## 14. Gist architecture

Gist is a presentation of retrieved evidence.

Requirements:

- sufficient and diverse source material;
- citations back to posts or linked sources;
- separation of facts, claims, and interpretation;
- visible uncertainty;
- disagreement preservation;
- no synthesis when evidence is too sparse;
- regeneration when source set materially changes;
- local generation where feasible, optional remote generation only behind explicit privacy policy.

Suggested sections:

- overview;
- key points;
- entities;
- topic clusters;
- notable conversations;
- differing perspectives;
- source list.

## 15. Explore and recommendations

Explore combines global/instance signals with local interest and diversity controls. It must not be a hidden engagement-maximization feed.

Inputs may include:

- followed accounts and lists;
- bookmarks and explicit interests;
- searches and reading history according to retention settings;
- topic/entity affinities;
- instance trends;
- recency and source diversity;
- negative feedback and reduced topics.

Sensitive-trait inference is prohibited as a recommendation feature unless the user explicitly creates such a category for private personal use, and even then it must not leave the device by default.

## 16. Semantic filtering

Semantic filters support:

- Hide;
- Reduce;
- Deprioritize;
- duration;
- surface scope;
- positive examples;
- negative examples;
- confidence threshold;
- explanation and feedback.

Strict hide filters fail closed at presentation: uncertain index state must not expose content that a verified exact policy would hide. Broad semantic overblocking must be mitigated with previews, confidence controls, and undo.

## 17. Composer intelligence and interpolator

Composer context may analyze:

- draft text;
- replied-to post;
- parent thread;
- selected relevant replies;
- entities and links;
- sentiment and conversational dynamics.

Capabilities:

- entity disambiguation;
- missing antecedent or context detection;
- likely misunderstanding warnings;
- duplicate discussion detection;
- audience and thread awareness;
- concise tone/sentiment feedback;
- source/context suggestions;
- interpolation of omitted context from the accessible thread.

Rules:

- advisory by default;
- concise and dismissible;
- no shaming or grading;
- no claim of certainty without evidence;
- private drafts remain local unless the user explicitly invokes a remote model;
- never post automatically;
- accessibility and keyboard parity required.

## 18. Explainability

Every intelligent result stores machine-readable evidence and can produce a user-readable explanation such as:

- exact phrase match;
- related concept;
- matched entity;
- followed author;
- bookmarked topic;
- recent conversation participation;
- reduced because of a selected semantic filter.

Explanations must omit private details that would reveal hidden profiles or inaccessible content.

## 19. Degraded modes

```text
Full: lexical + vector + entities + personalization + reranking
Reduced: lexical + vector + entities
Degraded: lexical + entities
Minimum: remote search + local exact filters
```

Model or vector failures must never blank Search. Index corruption triggers quarantine and rebuild while lexical or remote search remains available.

## 20. Evaluation

Create representative, privacy-safe relevance suites covering:

- handles, hashtags, URLs, quotes and codes;
- typos and prefixes;
- multilingual and accented terms;
- conceptual queries;
- entities with ambiguous names;
- conversation recall;
- recent-event searches;
- semantic-filter false positives and negatives;
- cross-account isolation;
- cold/warm latency, memory, storage and battery.

Track recall@k, precision@k, MRR/NDCG where appropriate, exact-match preservation, query latency, index growth, rebuild time, energy use, and explanation correctness.
