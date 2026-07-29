# Phase 23A.6 FediBuzz Broader Discovery

Status: **Accepted target / queued after Phase 23A.2 and Phase 23A.5 prerequisites**

Last updated: 2026-07-29

## Purpose

Add FediBuzz as an optional, client-side broader-public-discovery source for
Mangane Custom Feeds without introducing a Mangane relay server, ActivityPub
actor, public inbox, tunnel, or separate ingestion service.

This phase is part of Custom Feeds because it supplies additional candidate
statuses to feed rules. It is not a replacement for the user's home-server
Home, Local, list, account, or hashtag sources, and it is not the Durable
Streams phase.

## Product outcome

A feed creator may enable a plain-language source such as **Broader Fediverse**.
While Mangane is active, one shared FediBuzz public stream supplies public
Mastodon-compatible status candidates originating from many instances observed
by FediBuzz. Mangane routes plausible candidates to eligible Custom Feeds,
applies exact and semantic rules, stores only accepted matches, deduplicates
them against ordinary protocol sources, and renders them through the normal
Home timeline components.

The subscriber experience does not expose FediBuzz provenance on ordinary post
cards. Hashtags remain normally linkified, keyword and semantic matches look
like normal posts, and the feed remains visually equivalent to Home.

## Non-goals

This phase does not:

- claim complete or authoritative Fediverse coverage;
- connect to a single ordinary instance such as mastodon.social as the feed's
  sole public source;
- replace pageable account, list, Home, Local, or hashtag APIs;
- guarantee collection while the PWA is closed or suspended;
- persist the raw FediBuzz firehose;
- open one stream per feed, hashtag, instance, or tab;
- follow FediBuzz relay actors through ActivityPub;
- expose an ActivityPub inbox, signing key, Cloudflare Tunnel, or ngrok tunnel;
- introduce a separate Mangane relay or ingestion backend;
- make FediBuzz a trusted authorization, moderation, or publication authority;
- bypass subscriber blocks, mutes, filters, domain restrictions, or connected
  server policy.

## Upstream contract and capability probe

The intended upstream is the FediBuzz aggregate public Mastodon-compatible
stream currently advertised at:

```text
https://fedi.buzz/api/v1/streaming/public
```

The initial transport target is Server-Sent Events. WebSocket support may be
probed only as an optional capability and must not be assumed from historical
Mastodon streaming compatibility.

Before enabling the feature, the implementation must verify from a real browser
origin:

- cross-origin access and effective CORS policy;
- response status and `text/event-stream` content type;
- redirect behavior and final origin;
- event names and payload schema;
- heartbeat cadence and intermediary idle timeouts;
- update, edit, and delete event behavior;
- reconnect behavior on mobile browsers and installed PWA mode;
- payload-size distribution and malformed-event behavior.

If direct browser access is unavailable, deployments may use an already
existing, explicitly approved same-origin transport boundary. This phase does
not authorize creating a new service merely to conceal a failed capability
probe. Unsupported deployments degrade to home-server sources.

## One shared connection

"One stream" means one aggregate downstream transport shared by all active
feeds in the current Mangane application context. It does not mean one origin
instance is represented.

```text
many instances observed by FediBuzz
                |
                v
one FediBuzz aggregate stream
                |
                v
one Mangane connection
                |
        indexed local dispatcher
         /       |        \
     Feed A   Feed B    Feed C
```

The connection manager must enforce:

- at most one live FediBuzz connection per account/application context;
- no duplicate connection during React remounts, route changes, tab swipes, or
  reconnect races;
- start only when at least one enabled feed needs broader discovery;
- stop when no enabled feed needs it;
- pause while offline and during explicit user/deployment disablement;
- bounded exponential reconnect backoff with full jitter and a maximum delay;
- stable-success reset of retry state;
- cancellation through `AbortSignal` or an equivalent lifecycle contract;
- privacy-safe health state without status text, topics, handles, or tokens.

Multiple browser tabs must elect one live-reader leader where feasible and
share accepted updates through `BroadcastChannel` or the approved Phase 6/7
coordination boundary. Leadership loss must not create simultaneous readers.

## Source contract

FediBuzz must implement the same feed-neutral event-source boundary used by
other stream and polling adapters.

```ts
interface FeedEventSource {
  readonly id: string;
  readonly capabilities: {
    live: boolean;
    replay: boolean;
    resumable: boolean;
    historical: boolean;
  };

  connect(input: {
    cursor?: string;
    signal: AbortSignal;
  }): AsyncIterable<FeedSourceEvent>;
}

type FeedSourceEvent =
  | { type: 'status.upsert'; status: NormalizedStatus; cursor?: string }
  | { type: 'status.delete'; canonicalUri: string; cursor?: string }
  | { type: 'source.checkpoint'; cursor: string }
  | {
      type: 'source.reset-required';
      reason: 'cursor-expired' | 'history-unavailable';
    };
```

The FediBuzz implementation declares:

```ts
const capabilities = {
  live: true,
  replay: false,
  resumable: false,
  historical: false,
} as const;
```

A locally stored connection checkpoint is diagnostic and deduplication state;
it must never be presented as durable replay capability.

## Candidate routing

The stream must not run every semantic model against every incoming status.
Candidate routing proceeds from cheap, indexed checks to more expensive local
relevance evaluation.

Required indexes include, where active definitions require them:

```ts
type CandidateIndex = {
  byHashtag: Map<string, Set<FeedId>>;
  byAuthorDomain: Map<string, Set<FeedId>>;
  byActorUri: Map<string, Set<FeedId>>;
  byLiteralToken: Map<string, Set<FeedId>>;
  semanticFeeds: Set<FeedId>;
};
```

Processing order:

1. parse a bounded event and validate its Mastodon-compatible status shape;
2. derive canonical object identity and reject malformed or unsupported data;
3. normalize author URI/domain, structured hashtags, language, visibility,
   content-warning data, media metadata, and sanitized plain text;
4. reject candidates blocked by mandatory account, domain, visibility, or
   safety policy;
5. obtain plausible feed IDs through exact indexes and configured broad-topic
   eligibility;
6. apply literal hashtag/keyword, language, media, reply, and repost rules;
7. submit only remaining candidates to bounded semantic inclusion/exclusion;
8. deduplicate by canonical ActivityPub object URI;
9. persist one normalized status plus feed-entry references only when at least
   one feed accepts it;
10. emit updates through the existing feed-neutral timeline boundary.

Instance-domain matching means the original author's normalized actor domain,
not the FediBuzz transport domain.

## Semantic processing

Semantic evaluation uses the Phase 12–17 and Phase 23A.5 contracts and runs in
an approved worker boundary so stream processing cannot block scrolling,
gestures, rendering, or input.

Requirements:

- bounded candidate queue with explicit overflow policy;
- batching with latency and memory ceilings;
- model-version and rule-version ownership;
- account-scoped embedding and decision caches;
- sanitized plain text only;
- local-first processing;
- lexical/hashtag fallback when the model is unavailable;
- no silent remote-model invocation;
- no semantic failure may bypass authorization, moderation, or safety checks;
- creator-only preview may show reasons, but subscriber timelines may not.

## Persistence and retention

Mangane must discard unmatched stream candidates immediately after bounded
processing. It must not store or index the aggregate stream as a general
firehose.

Persisted records:

```ts
type CachedExternalStatus = {
  accountScope: AccountScope;
  canonicalUri: string;
  status: NormalizedStatus;
  receivedAt: string;
  updatedAt: string;
  expiresAt: string;
};

type CachedFeedMatch = {
  accountScope: AccountScope;
  feedId: string;
  canonicalUri: string;
  matchedAt: string;
  ruleVersion: number;
  modelVersion?: string;
};
```

One accepted post is stored once even when it belongs to multiple feeds.
Retention must be bounded by:

- per-feed accepted-item ceiling;
- account-scoped global byte/item ceiling;
- age expiration;
- storage-pressure and quota response;
- deterministic LRU or equivalent eviction;
- preservation rules for visible, bookmarked, or otherwise independently owned
  canonical records;
- complete purge on logout, account removal, emergency reset, or source disable
  according to Phase 4–6 contracts.

No fixed production limits are accepted until representative mobile payload,
battery, memory, and IndexedDB measurements establish the budget.

## Update, deletion, and deduplication

The same object may arrive from Home, Local, lists, account timelines, hashtag
timelines, and FediBuzz. Canonical object URI is the primary identity. A bounded
fallback may be used only when canonical URI is absent and must be marked lower
confidence.

On `status.update` or equivalent upsert:

- replace the canonical normalized projection transactionally;
- re-run affected lexical and semantic rules;
- add or remove feed-entry references accordingly;
- preserve unrelated source provenance.

On deletion:

- tombstone or remove the canonical record according to Phase 5 policy;
- remove all affected feed-entry references;
- update active timelines without resurrecting stale cached copies.

Transport provenance is retained for diagnostics and deduplication but is not
shown as authorship. The original status account remains the displayed author.

## Moderation, trust, and privacy

FediBuzz is an external candidate transport, not a trust override. Every
candidate remains subject to:

- subscriber blocks and mutes;
- account and instance scope;
- domain blocks and connected-server policy where known;
- visibility and authorization data available in the normalized status;
- language and sensitive-content preferences;
- feed-specific exclusions;
- malformed, spam, and abusive-payload controls.

A status that cannot be normalized with enough information for safe display is
excluded. The client must not perform authenticated requests to candidate-owned
origins, follow untrusted redirects, or use relay content to bypass a home
server's explicit block policy.

Diagnostics must not record raw post content, feed topics, membership, handles,
access tokens, or full candidate payloads.

## User experience

Creator UI:

- the option is named **Broader Fediverse** or equivalent plain language;
- supporting text states that it includes additional public posts observed
  through participating streams;
- coverage is explicitly variable and not the entire Fediverse;
- the option is available only where hashtags, keywords, topics, or instance
  criteria can bound the candidate set;
- creator preview may explain an accepted or rejected match privately.

Subscriber UI:

- accepted posts render exactly like Home posts;
- no FediBuzz badge, keyword highlighting, or persistent match explanation;
- hashtags remain normally linkified;
- a subtle source-health notice may appear only when broader discovery is
  degraded, without replacing successful/cached content.

## Degraded and offline behavior

When FediBuzz is unavailable, unsupported, CORS-blocked, rate-limited, malformed,
or disabled:

- Custom Feeds continue with account, list, Home, Local, and native hashtag
  sources;
- cached accepted matches remain available under retention policy;
- the feed reports a recoverable partial-source state;
- no exact missed-event or unread claim is made;
- reconnect does not promise replay of events missed while Mangane was closed.

The limitation must be documented accurately: broader public discovery is live
while the application can maintain the upstream connection. Durable replay is a
separate Phase 6A capability and requires a durable producer and stream service.

## Security controls

Tests and implementation must cover:

- oversized and compressed event payloads;
- invalid JSON and schema confusion;
- unsafe URL fields and malformed actor domains;
- duplicate and replayed events;
- update/delete races;
- cross-account cache leakage;
- source disable/logout races;
- duplicate connection races;
- reconnect storms and retry amplification;
- queue overflow and memory pressure;
- semantic worker crash, timeout, and stale response;
- malicious HTML before text extraction;
- forged provenance and relay-as-author confusion;
- domain-block bypass attempts;
- storage-quota exhaustion;
- multiple-tab leadership failure.

## Implementation slices

### 23A.6.1 — Capability probe and fixture capture

- verify the live endpoint from browser and installed-PWA contexts;
- capture redacted event-shape fixtures for update/edit/delete/heartbeat cases;
- document CORS, redirects, content type, idle behavior, and practical limits;
- add a deployment capability result and disabled fallback.

### 23A.6.2 — Shared source and lifecycle manager

- implement the feed-neutral FediBuzz source adapter;
- add single-reader lifecycle, cancellation, connectivity state, backoff, jitter,
  and duplicate-connection prevention;
- add multi-tab leadership or document the bounded initial limitation.

### 23A.6.3 — Indexed dispatch and normalization

- add exact routing indexes;
- validate and normalize candidates;
- integrate canonical URI deduplication and protocol source provenance;
- reject unsupported candidates before semantic work.

### 23A.6.4 — Worker-based relevance and persistence

- integrate literal and semantic feed rules;
- add bounded worker queues and stale-response protection;
- persist only accepted matches and feed references transactionally;
- implement retention, quota, purge, update, and delete behavior.

### 23A.6.5 — Creator controls and subscriber degradation

- add Broader Fediverse creator option and truthful coverage text;
- add private preview reasons;
- add partial-source health and retry behavior;
- verify ordinary Home-equivalent subscriber rendering.

### 23A.6.6 — Hardening and measured acceptance

- run long-lived mobile/PWA connection tests;
- measure memory, CPU, battery, event volume, semantic queue latency, cache
  growth, and duplicate rate;
- complete adversarial, account-isolation, accessibility, offline, and rollback
  tests;
- keep the feature disabled by default until budgets pass.

## Rollback

FediBuzz broader discovery ships behind an owned feature/capability flag.
Rollback:

1. stop and dispose the shared connection;
2. cancel queued worker jobs;
3. remove FediBuzz feed-source registrations;
4. preserve canonical records that have independent ordinary-source provenance;
5. purge FediBuzz-only feed matches and records according to account-scoped
   policy;
6. continue Custom Feeds through normal protocol sources.

No feed definition may become unreadable merely because the optional source is
disabled. The source remains a degradable input, never the sole definition
format or timeline authority.

## Exit criteria

Phase 23A.6 is complete only when:

1. the live upstream capability is verified from supported browser/PWA contexts;
2. one account-scoped shared connection serves all enabled feeds without
   duplicate-reader races;
3. incoming candidates are bounded, validated, normalized, and indexed before
   semantic evaluation;
4. only accepted matches are persisted and raw firehose retention is absent;
5. canonical URI deduplication works across FediBuzz and ordinary protocol
   sources;
6. update and deletion events reconcile transactionally;
7. logout, account switch, source disable, quota pressure, worker failure,
   offline transitions, and reconnect storms fail safely;
8. subscriber moderation and server policy override feed rules;
9. unsupported or unavailable broader discovery degrades to ordinary sources
   without breaking the feed;
10. measured mobile memory, CPU, battery, latency, storage, and accessibility
    budgets pass;
11. documentation never claims complete Fediverse coverage, background catch-up,
    or durable replay;
12. CI and review are clean.