# Mangane Technical Architecture

Status: **Accepted target**

Last updated: 2026-07-23

## 1. Architectural objective

Mangane will evolve through controlled replacement of inherited presentation and state-management seams while preserving protocol compatibility and existing user-facing behavior. The migration must be incremental, testable, and reversible.

Framework7 React owns adaptive presentation and navigation. It must not become the domain model, protocol client, search engine, or persistence layer.

## 2. Layer model

```text
Experience Layer
  Framework7 React, routes, adaptive layouts, components, motion

Application Layer
  use cases, orchestration, query commands, feature state, error mapping

Domain Layer
  normalized social objects, conversations, moderation, search contracts

Local Intelligence Layer
  lexical/vector/entity/topic indexes, planner, fusion, reranking, composer context

Persistence and Sync Layer
  canonical store, derived indexes, outbox, index journal, migrations, cache policy

Protocol Layer
  capability detection, API adapters, authentication, streaming, uploads

Infrastructure Layer
  workers, model runtime, storage backend, logging, metrics, feature flags
```

### Dependency rule

Dependencies point downward. Lower layers cannot import UI components. Protocol adapters cannot directly mutate presentation state. Search indexes cannot become the canonical source of social records.

## 3. Adaptive runtime environment

Mangane must own a runtime environment abstraction instead of allowing UI libraries or user-agent checks to spread through components.

```ts
interface RuntimeEnvironment {
  platform: 'ios' | 'ipados' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';
  deviceClass: 'phone' | 'tablet' | 'desktop';
  displayMode: 'browser' | 'standalone' | 'fullscreen';
  primaryInput: 'touch' | 'mouse' | 'pen' | 'mixed';
  supportsHover: boolean;
  reducedMotion: boolean;
  increasedContrast: boolean;
  forcedColors: boolean;
  storageTier: 'constrained' | 'standard' | 'expanded';
  computeTier: 'constrained' | 'standard' | 'high';
  online: boolean;
}
```

Capabilities must be detected conservatively. User agent detection may supplement feature detection but may not be the sole authority for security or support decisions.

## 4. Framework7 boundary

Framework7 may own:

- App and View containers;
- Pages, navigation stacks and route transitions;
- panels, sheets, popovers, dialogs and toolbars;
- pull-to-refresh and platform-adaptive component chrome;
- safe-area and viewport integration;
- phone/tablet navigation patterns;
- platform-appropriate feedback and gesture plumbing.

Framework7 must not own:

- normalized social entities;
- protocol capability policy;
- search ranking;
- persistence schemas;
- embedding generation;
- local personalization;
- authorization decisions;
- moderation policy;
- long-lived cross-feature business state.

Wrap Framework7 components in Mangane design-system primitives where consistent behavior is required. Avoid importing Framework7 components throughout the entire application without a boundary.

## 5. Application modules

Target feature modules:

- `home`
- `explore`
- `search`
- `gist`
- `composer`
- `conversations`
- `notifications`
- `profiles`
- `bookmarks`
- `lists`
- `moderation`
- `settings`
- `accounts`
- `offline`

Each module should expose application commands and selectors rather than direct store internals.

## 6. Protocol capability architecture

The current application supports related but non-identical APIs. Preserve this through explicit capability negotiation.

```ts
interface BackendCapabilities {
  protocolFamily: 'akkoma' | 'pleroma' | 'mastodon-compatible';
  supportsQuotePosts: boolean;
  supportsEmojiReactions: boolean;
  supportsChats: boolean;
  supportsEditing: boolean;
  supportsTranslation: boolean;
  supportsSearchV2: boolean;
  supportsStreaming: boolean;
  supportsContentTypes: string[];
}
```

Feature code asks for capabilities. Adapter code translates normalized commands into backend-specific requests. Unknown capabilities must fail safely and visibly rather than be guessed.

## 7. State architecture

Do not perform a risky one-step rewrite of all Redux state. Introduce boundaries first:

1. inventory current slices, selectors, persistence, and side effects;
2. create domain-facing selectors and commands;
3. isolate server state with query abstractions where appropriate;
4. isolate durable local state behind repositories;
5. remove direct component access to legacy store shapes;
6. migrate module by module.

State categories:

- remote server state;
- canonical normalized local records;
- transient UI state;
- durable user preferences;
- pending mutation/outbox state;
- derived search and intelligence data.

These categories must not be stored and invalidated identically.

## 8. Worker architecture

CPU- and IO-heavy work must run outside the main rendering thread where browser support permits.

Suggested workers:

- indexing worker;
- embedding/model worker;
- search worker;
- media-processing worker;
- sync/reconciliation worker.

Workers communicate through typed request/response envelopes with cancellation, deadlines, schema versioning, and structured errors.

```ts
interface WorkerRequest<T> {
  id: string;
  type: string;
  schemaVersion: number;
  deadlineAt?: number;
  payload: T;
}
```

No worker may receive access tokens unless strictly required. Search and model workers should operate on normalized local records or projections.

## 9. Offline and mutation model

Network reads may be cached according to visibility and retention rules. Mutations use an outbox with idempotency metadata where the backend permits.

Outbox entries require:

- stable operation ID;
- account scope;
- dependency ordering;
- retry classification;
- attempt count and next attempt time;
- user-visible state;
- conflict policy;
- final failure path.

Automatic retries are permitted only for operations proven safe. Exponential backoff requires jitter and upper bounds. Authentication, authorization, validation, and permanent client errors are not blindly retried.

## 10. Error model

Use typed errors across boundaries:

- authentication;
- authorization;
- validation;
- capability unavailable;
- network unavailable;
- rate limited;
- conflict;
- storage quota;
- model unavailable;
- index unavailable;
- corrupt local data;
- migration required;
- operation cancelled.

UI maps typed errors to actionable messages. Logs must not include tokens, draft content, private posts, embeddings, or complete user profiles.

## 11. Feature flags and migrations

Major replacements must ship behind flags or compatibility seams. Flags require:

- owner;
- purpose;
- default state;
- rollout criteria;
- rollback criteria;
- removal date or phase;
- tests for both paths during migration.

Data migrations must be resumable and idempotent. Never destroy the previous representation before the new representation passes verification.

## 12. Security boundaries

- Treat remote HTML and rich content as hostile.
- Sanitize before rendering and test bypass cases.
- Keep authentication tokens out of search projections and model inputs.
- Validate account scope on every local repository query.
- Prevent cross-account cache and semantic-profile leakage.
- Restrict URL fetching and previews against SSRF-style unsafe destinations where client or proxy infrastructure is involved.
- Apply content visibility and block rules before exposure, not merely as ranking penalties.
- Avoid existence leaks through search, autocomplete, notifications, or cached records.

## 13. Performance budgets

Initial budgets to validate during implementation:

- first interactive shell should remain responsive on a mid-range mobile device;
- input and scrolling should target 60 fps under ordinary load;
- local prefix results should appear within approximately 50 ms for warm indexes;
- hybrid results should target under 300 ms warm on standard devices, with progressive rendering when deeper stages take longer;
- long tasks over 50 ms on the main thread should be treated as defects unless unavoidable and documented;
- memory and index growth require corpus-based benchmarks, not assumptions.

Budgets are targets, not claims. Update them with measured device profiles.

## 14. Testing requirements

Every migrated module requires:

- unit tests for domain and application behavior;
- integration tests across adapters and repositories;
- offline and retry tests;
- migration tests from representative prior schemas;
- accessibility tests;
- reduced-motion tests where motion exists;
- cross-account isolation tests;
- capability matrix tests;
- failure and cancellation tests;
- visual regression coverage for foundational components.

## 15. Migration strategy

Recommended sequence:

1. repository inventory and canonical status;
2. runtime environment and design tokens;
3. Framework7 shell and navigation behind a flag;
4. protocol/application boundaries;
5. local canonical store and outbox;
6. individual surface migrations;
7. intelligence subsystem prototypes;
8. search and Explore integration;
9. composer intelligence;
10. removal of legacy presentation and duplicate icon systems.

At every stage, the application must remain buildable, testable, and deployable.