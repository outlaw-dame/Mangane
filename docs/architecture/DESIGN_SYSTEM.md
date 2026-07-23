# Mangane Adaptive Editorial Design System

Status: **Accepted target**

Last updated: 2026-07-23

## 1. Design objective

Mangane should feel like a modern editorial social application: calm, tactile, intelligent, and content-led. It combines the spatial and editorial qualities of Facebook Paper, the restraint of Artifact, the structured synthesis of Neeva Gist, and Apple HIG-level interaction quality.

Framework7 provides adaptive application primitives. Mangane's design system defines product identity and prevents Framework7 defaults or inherited component styles from becoming the final visual language.

## 2. Design principles

- Content dominates chrome.
- Hierarchy is created with typography, spacing, grouping, and motion before borders.
- Cards are used for meaningful editorial objects, not as universal containers.
- Motion explains spatial relationships and state changes.
- Intelligence appears as structured context, not magical decoration.
- Platform adaptation changes behavior and density without fragmenting identity.
- Every gesture has an accessible visible alternative.
- Selected states use shape, weight, label, and color—not color alone.
- Dense information must remain scannable.
- The application must remain coherent in light, dark, increased contrast, forced colors, and reduced motion.

## 3. Typography

Target families:

- body and UI: SF Pro Text where available, with system-ui fallbacks;
- editorial/display: Plus Jakarta Sans where appropriate;
- code and identifiers: system monospace.

Typography roles should be tokenized rather than specified ad hoc:

- display;
- page title;
- section title;
- card title;
- body;
- compact body;
- metadata;
- label;
- control;
- code/identifier.

Line length for reading surfaces should normally remain approximately 45–75 characters. Dynamic Type and browser text scaling must not break navigation or hide controls.

## 4. Color

Use semantic tokens:

- canvas;
- elevated canvas;
- primary surface;
- secondary surface;
- primary text;
- secondary text;
- tertiary text;
- separator;
- accent;
- selected;
- positive;
- caution;
- destructive;
- information;
- focus ring;
- overlay.

Do not encode meaning using raw brand colors inside features. Instance branding may influence accents and identity surfaces but cannot reduce contrast or make system states ambiguous.

Intelligence surfaces should not default to purple gradients or sparkles. Use ordinary information design with restrained iconography and explicit labels.

## 5. Spacing and geometry

Use a documented spacing scale based on 4 CSS-pixel increments, with common semantic tokens for compact, standard, comfortable, and editorial spacing.

Corner radii should be role-based:

- compact controls;
- buttons/chips;
- cards;
- sheets;
- media;
- circular avatars/actions.

Avoid excessive nesting of rounded rectangles. A card inside a card inside a sheet is usually a hierarchy failure.

## 6. Icon system

### Canonical family

Use **Phosphor** for Mangane product icons.

Weight policy:

- regular: default controls and actions;
- fill: selected navigation or active saved state;
- bold: optically necessary emphasis, used sparingly;
- duotone: larger editorial, empty-state, Gist, or intelligence illustrations;
- thin/light: only at larger sizes where contrast and legibility are verified.

Use Framework7 icons only for deeply platform-integrated affordances such as certain back, disclosure, or component chrome treatments.

Do not visibly mix Tabler, Iconoir, Feather, Bootstrap Icons, Line Awesome, and Phosphor across product surfaces. Legacy sets must be inventoried and migrated through a semantic icon adapter.

### Semantic icon registry

Components request semantic names, not library components directly:

```ts
type ManganeIconName =
  | 'home'
  | 'explore'
  | 'compose'
  | 'notifications'
  | 'profile'
  | 'search'
  | 'hybrid-search'
  | 'gist'
  | 'topic'
  | 'entity'
  | 'context'
  | 'semantic-filter'
  | 'interpolator'
  | 'local-intelligence'
  | 'why-this-result'
  | 'reply'
  | 'repost'
  | 'like'
  | 'bookmark'
  | 'share';
```

Custom icons should follow Phosphor's grid, optical weight, corner language, and state system.

## 7. Navigation

### Phone

Bottom navigation contains Home, Explore, Compose, Notifications, and Profile. Active tabs use filled icons plus accessible labels. Search is prominent within Explore and globally reachable.

### Tablet

Use split view or sidebar with persistent contextual detail where useful. Maintain clear collapse behavior when width changes.

### Desktop

Use a restrained multi-column layout. The third column is contextual, not mandatory. Avoid turning the product into a dashboard full of panels.

Navigation state must survive route restoration, PWA relaunch, and account switching without leaking one account's position into another where inappropriate.

## 8. Cards and editorial objects

Card types should be explicit:

- post card;
- media/story card;
- conversation card;
- Gist card;
- entity card;
- topic card;
- source card;
- recommendation/explanation card.

Not every post becomes a story. Promote media or high-interest editorial objects only when content supports it.

Cards should expose a predictable anatomy:

- identity/source;
- headline or primary text;
- supporting content;
- media;
- metadata;
- actions;
- optional explanation.

## 9. Gist design

A Gist is a modular synthesis surface, not a chatbot response.

Potential modules:

- concise overview;
- key points;
- source count and freshness;
- entity carousel/list;
- topic clusters;
- contrasting claims;
- notable posts;
- source links;
- why this Gist appeared.

Requirements:

- clear source boundaries;
- citations close to claims;
- skeleton and partial states;
- insufficient-evidence state;
- expand/collapse without losing query context;
- no generated content presented with the same style as source quotations.

## 10. Motion

Use motion to communicate:

- card-to-detail continuity;
- stack depth;
- sheet origin;
- navigation direction;
- insertion/removal;
- selected state;
- refresh and synchronization.

Motion rules:

- use spring-like motion only when it improves spatial understanding;
- cap overshoot and avoid playful bounce in serious contexts;
- never delay critical actions for animation;
- avoid simultaneous independent motions across large portions of the screen;
- preserve scroll and focus;
- provide reduced-motion replacements using fades or instant state changes.

No feature may depend solely on parallax, tilt, swipe, or physics.

## 11. Gestures and haptics

Gestures may include swipe actions, card expansion, pull-to-refresh, media paging, and sheet dismissal. Every gesture requires a button, menu, keyboard command, or other equivalent.

PWA haptic support is limited and inconsistent. Use haptics only where available and never as the sole feedback channel.

## 12. Composer design

The composer should remain lightweight:

- primary text field;
- audience/visibility;
- attachments and content options;
- context strip for reply/thread;
- optional intelligence status;
- clear publish action.

Composer context appears progressively. Do not show a checklist of writing lessons. Surface at most the most actionable insight first, with additional context behind expansion.

## 13. Search and Explore design

Search states:

- empty/recent;
- typing/prefix results;
- hybrid loading;
- results with facets;
- Gist available;
- insufficient local index;
- offline lexical-only;
- remote fallback;
- error/rebuild.

Filters should use readable chips, segmented controls, or sheets rather than dense advanced-search forms by default.

Explainability may appear as a concise “Why this result” affordance. It should not clutter every result with permanent diagnostic text.

## 14. Accessibility

Mandatory requirements:

- WCAG 2.2 AA minimum;
- 44×44 target guideline for primary touch actions;
- logical headings and landmarks;
- visible focus;
- correct labels and state announcements;
- keyboard navigation for all actions;
- no focus loss during route transitions or reranking;
- screen-reader alternatives for visual Gist groupings and charts;
- captions/alt text handling for media;
- color-independent selected, error, and status states;
- reduced-motion behavior tested, not assumed.

## 15. Component governance

Every shared component requires:

- purpose and non-goals;
- variants and states;
- responsive behavior;
- accessibility contract;
- motion behavior;
- loading, empty, offline, and error states;
- examples or stories;
- tests;
- migration notes when replacing legacy components.

Do not create one-off copies of foundational controls. Exceptions must be documented.

## 16. Legacy migration

The repository currently includes multiple icon and component systems. Migration must:

1. inventory actual usage;
2. define semantic mappings;
3. build adapters;
4. migrate high-visibility surfaces first;
5. test optical alignment and RTL behavior;
6. remove unused packages only after code search and build verification;
7. document intentional exceptions.

The design-system phase is complete only when new code cannot casually introduce another icon family or un-tokenized foundational style.