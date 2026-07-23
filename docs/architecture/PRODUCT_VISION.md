# Mangane Product Vision and Experience Principles

Status: **Accepted target**

Last updated: 2026-07-23

## 1. Purpose

Mangane is a high-quality social reading, discovery, conversation, and publishing application for the Fediverse. It must make decentralized social software feel approachable, coherent, fast, intelligent, and humane without centralizing the user's identity, behavioral profile, or information diet.

Mangane is not merely a reskin of an inherited frontend. It is being redesigned as an adaptive PWA with a durable local data layer and a local intelligence system. The application should help people understand information, find relevant conversations, communicate with context, and control what they see without turning participation into homework.

## 2. Product promise

Mangane should provide:

- a calm, readable, content-first social experience;
- trustworthy search that handles exact terms and conceptual intent;
- useful Explore and Search synthesis without obscuring sources;
- local personalization that is visible, controllable, deletable, and account-scoped;
- context-aware composition that helps rather than lectures;
- semantic filtering that can reduce concepts rather than only block exact words;
- strong offline and degraded behavior;
- platform-appropriate interaction while retaining one recognizable Mangane identity;
- comprehensive accessibility and reduced-motion support;
- transparent explanations for intelligent ranking and filtering decisions.

## 3. Experience inspirations and limits

### 3.1 Facebook Paper

Borrow:

- editorial hierarchy;
- content-led navigation;
- tactile card movement;
- contextual controls that appear when needed;
- immersive media and story presentation;
- physics-informed transitions;
- strong spatial continuity between feed, card, detail, and conversation.

Do not copy:

- opaque gesture-only navigation;
- hidden actions without accessible alternatives;
- excessive motion;
- a design that treats every post as a full-screen story;
- historical skeuomorphism or nostalgia for its own sake.

### 3.2 Artifact

Borrow:

- restrained intelligent assistance;
- high-density information presented clearly;
- topic and source organization;
- reading-focused visual hierarchy;
- unobtrusive personalization controls;
- concise explanations and summaries linked to evidence.

Do not copy:

- centralized behavioral profiling;
- dependence on server-side recommendation infrastructure;
- news-only assumptions;
- intelligence features that hide uncertainty or source boundaries.

### 3.3 Neeva Gist

Borrow:

- structured synthesis at the top of Explore and Search;
- clear separation between overview, evidence, entities, topics, and source links;
- composable cards rather than one undifferentiated answer;
- scannable information architecture;
- citations and pathways back to original content.

Do not copy:

- a search-engine answer-box model that replaces social conversation;
- overconfident synthesis;
- summaries without provenance;
- visual repetition that makes every query look identical.

### 3.4 Apple Human Interface Guidelines

Use Apple HIG as the default quality baseline for hierarchy, touch targets, motion, typography, accessibility, focus, menus, sheets, safe areas, and state transitions. This does not mean impersonating iOS or hiding the fact that Mangane is a web application.

On Android, Windows, Linux, and desktop browsers, adapt interaction conventions, density, navigation, pointer behavior, and chrome where appropriate while retaining Mangane's product identity.

## 4. Product principles

### 4.1 Content before chrome

Controls must support reading and conversation rather than compete with them. Persistent toolbars should be limited. Secondary actions should appear contextually but remain keyboard- and screen-reader-accessible.

### 4.2 Intelligence without burden

Mangane should automate expensive analysis where reliable and present only actionable output. Posting must not feel like completing an assignment. Composer assistance should be dismissible, concise, and proportional to risk or ambiguity.

### 4.3 Exactness and meaning are both necessary

Search must support exact handles, hashtags, URLs, quotes, identifiers, names, and error codes while also finding conceptually related posts. Semantic search alone is unacceptable; full-text search alone is insufficient.

### 4.4 Local by default

Remote servers provide social content and protocol capabilities. The user's device builds the intelligence layer whenever feasible. No cloud behavioral profile is required for core functionality.

### 4.5 Explain rather than manipulate

Ranking, filtering, synthesis, and composer recommendations must preserve evidence. The user should be able to learn why something appeared, why it was reduced, and what data influenced the decision.

### 4.6 Separate relevance from personalization

Canonical relevance asks whether content matches the query or context. Personal utility asks whether it is useful to this user now. These must remain separate internally so personalization does not masquerade as objective truth.

### 4.7 Progressive capability

Mangane must remain useful when advanced capabilities are absent. It should degrade from full hybrid intelligence to lexical search, then to remote search plus local filtering, without becoming unusable.

### 4.8 Protocol capability, not protocol leakage

Akkoma, Pleroma, Mastodon-compatible, and future protocol differences must be represented through capability contracts. Presentation components must not contain scattered backend-specific conditionals.

### 4.9 Accessibility is architectural

WCAG 2.2 AA is the minimum target. Touch targets should normally be at least 44 by 44 CSS pixels. All gestures require visible or keyboard alternatives. Dynamic reranking must not steal focus or unpredictably move content being read.

### 4.10 Privacy includes derived data

Embeddings, inferred topics, entity affinities, interaction histories, and semantic profiles are user data. They require deletion, export boundaries, account scoping, retention policy, and rebuild behavior.

## 5. Primary product surfaces

### Home

A readable timeline with strong conversation context, media treatment, local filtering, and stable position restoration. Home should not become an algorithmic Explore feed by default.

### Explore

A discovery surface for trending and personally relevant topics, entities, conversations, media, communities, and accounts. Popular content should be selected with interest and diversity constraints, not merely global engagement.

### Search

A hybrid retrieval experience with instant lexical results, semantic expansion after a short debounce or submission, entity and topic facets, Gist-style synthesis, source evidence, and query-mode controls such as Balanced, Exact, and Conceptual.

### Gist

A structured, evidence-backed synthesis component used where sufficient source material exists. It may contain an overview, key points, entity cards, topic groupings, contrasting perspectives, and links to original posts. It must display uncertainty and never invent consensus.

### Composer

A lightweight publishing surface with optional context assistance. It can examine the draft, replied-to post, thread, and relevant replies to identify missing context, ambiguity, tone risks, duplication, or entity confusion. It must avoid moralizing and never block ordinary posting except for clear technical or safety constraints.

### Conversation

A thread-oriented reading surface that preserves branch structure, reply context, participants, and chronology. Intelligence may summarize long branches or surface missing antecedents but must not flatten disagreement into a single interpretation.

### Notifications

Grouped, understandable activity with controls for relevance, repetition, and safety. Intelligent grouping may reduce noise, but every event remains inspectable.

### Profile

A human-readable identity and activity surface that respects backend capabilities. Local topic and relationship notes must not be exposed publicly unless explicitly authored for publication.

## 6. Navigation model

### Phone

- Home
- Explore
- central Compose action
- Notifications
- Profile

Search is prominent within Explore and available globally. Deep surfaces use push navigation, sheets, or full-screen modals according to task and platform.

### Tablet

Use sidebar or split-view navigation with list-detail continuity. Avoid simply stretching the phone layout.

### Desktop

Use a restrained multi-column layout: navigation, primary content, and contextual detail where width allows. Pointer hover may reveal secondary actions, but touch-equivalent controls must remain available.

## 7. Non-goals

Mangane is not intended to:

- become a centralized social network;
- require an external AI account for core search or personalization;
- turn every post into a story card;
- maximize engagement time at the expense of user intent;
- infer or expose sensitive traits for advertising;
- use intelligence to manufacture emotional urgency;
- conceal sources behind generated text;
- imitate native system interfaces so closely that security context becomes ambiguous.

## 8. Success criteria

Mangane succeeds when users can:

- install it and use it reliably as a PWA;
- move between phone, tablet, and desktop layouts without relearning the product;
- find exact and conceptual information quickly;
- understand why intelligent results appeared;
- control personalization and semantic filters;
- read long conversations without losing context;
- compose with helpful but low-burden assistance;
- continue using core features offline or with intelligence disabled;
- delete local intelligence data completely;
- trust that the interface is not silently centralizing their behavior.
