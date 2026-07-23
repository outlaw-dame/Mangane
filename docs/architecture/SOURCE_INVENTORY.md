# Mangane Verified Source Architecture Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

This document records source-level findings verified directly from the current repository. It complements [`CURRENT_STATE.md`](./CURRENT_STATE.md). It does not describe the accepted target architecture unless explicitly stated.

## 1. Application bootstrap

### Build entry

Webpack's shared configuration defines a single application entry:

```text
app/application.ts
```

`app/application.ts`:

1. loads polyfills;
2. imports the web manifest;
3. includes image assets through webpack context;
4. loads React Datepicker CSS and the global application Sass entry;
5. dynamically loads `app/soapbox/main` after polyfills complete.

### React mount

`app/soapbox/main.tsx` mounts the application through React 17's `ReactDOM.render` into the `#soapbox` element.

The production runtime installs `@lcdp/offline-plugin/runtime`. When an update is ready it dispatches a Redux snackbar, waits for the user to select Update, sets a service-worker updating flag, applies the update, and reloads after activation.

In development, a separate `/share_target.js` service worker is registered at root scope for debugging.

### Current status

| Concern | Current implementation | Phase status |
|---|---|---|
| Build system | webpack 5 | current, later migration decision required |
| UI runtime | React 17 | current, compatibility constraint |
| Root mount | `ReactDOM.render` | current, later React migration |
| Global styles | Sass plus imported third-party CSS | current, migrating in Phase 2 |
| Manifest | webpack-imported `manifest.json` | current, audit in Phase 4 |
| Production SW runtime | `@lcdp/offline-plugin/runtime` | current, high-priority audit |

## 2. Root provider and application initialization

`app/soapbox/containers/soapbox.tsx` defines the highest-level provider hierarchy:

```text
Redux Provider
  -> React Query QueryClientProvider
    -> head/theme/metadata layer
      -> initial-data loader
        -> router/application mount
```

The module performs synchronous preloading and onboarding-status checks at module initialization.

Initial backend loading currently dispatches, in order:

1. authenticated current-account fetch;
2. instance loading and feature detection;
3. Soapbox/Mangane configuration loading;
4. optional verification configuration loading.

The root blocks normal rendering while account identity, locale messages, initial data, or service-worker updating state remain unresolved.

### Risk and migration implications

- Initialization is coupled to Redux thunks and root rendering.
- Backend feature detection is part of startup rather than an isolated protocol-capability service.
- Error handling intentionally marks initial loading complete even when `loadInitial()` rejects; later surfaces must therefore tolerate partially loaded state.
- Module-level synchronous dispatches complicate isolated testing and future app-shell composition.
- Framework7 introduction must preserve locale loading, instance feature detection, onboarding, service-worker update blocking, and global modal/notification containers.

## 3. Router architecture

The current router uses React Router 5 with:

- `BrowserRouter`;
- `Switch`, `Route`, `Redirect`;
- `react-router-scroll-4` for scroll restoration;
- a root basename derived from `FE_SUBDIRECTORY`;
- public, authentication, onboarding, waitlist, and application route branches.

The top-level router handles:

- public landing;
- login and registration;
- verification;
- password reset/edit;
- invitations;
- waitlist and onboarding;
- transition into the main `UI` feature.

The main UI router is centralized in `app/soapbox/features/ui/index.tsx`. It contains a large route and redirect matrix for:

- Home and federated timelines;
- conversations;
- hashtags;
- lists and bookmarks;
- notifications and search;
- recommendations and directory;
- moderation lists and filters;
- profiles, followers, following, media, favourites, pins, and posts;
- composer and scheduled posts;
- settings, export/import, security, administration, developer, and migration surfaces;
- Mastodon, Pleroma FE, Gab, and Soapbox legacy URL compatibility.

Routes are frequently gated by backend capability flags from `useFeatures()`.

### Verified compatibility constraint

The source explicitly warns that Mastodon and Pleroma reserve backend route basenames. New frontend routes must avoid collisions and provide compatibility redirects when needed.

### Migration implications

Phase 3 must not replace routing with a small hand-authored list. It requires:

- a generated or audited route manifest;
- compatibility redirects preserved and tested;
- backend-reserved basename tests;
- exact deep-link and browser-history behavior;
- scroll restoration equivalence;
- feature-gated route equivalence;
- authentication/public-route parity;
- modal-route state preservation.

## 4. Redux architecture

### Store

`app/soapbox/store.ts` uses Redux Toolkit `configureStore` with:

- the application root reducer;
- Redux Thunk;
- error middleware;
- sound middleware;
- Redux DevTools enabled unconditionally in the store configuration.

### State shape

The root reducer uses `redux-immutable` and an `Immutable.Record` state root. The current reducer registry contains more than fifty state domains, including:

- accounts, statuses, relationships and account metadata;
- timelines, contexts, conversations and notifications;
- compose, pending and scheduled statuses;
- search, trends, trending statuses and suggestions;
- lists, filters, mutes, blocks-related state and reports;
- instance, backend configuration, feature-oriented state and authentication;
- onboarding, verification, administration, backups and security;
- groups-related reducers, even though several group UI routes are commented out;
- modals, dropdowns, sidebar, hover cards, alerts and other UI state.

### Logout behavior

On `AUTH_LOGGED_OUT`, the root reducer rebuilds most state while preserving this whitelist:

```text
instance
soapbox
custom_emojis
auth
```

In production it also assigns `location.href = '/login'`.

### Risks

- The root state combines server entities, session/auth state, backend configuration, user preferences, mutations, and transient UI state.
- Immutable.js shapes are part of many reducer and selector contracts.
- Redux DevTools behavior requires production verification.
- Logout clears the Redux state graph but does not itself prove React Query, service-worker cache, browser persistence, object URLs, or other module caches are cleared.
- Preserving `auth` through logout requires inspection to determine exactly which authentication records remain and whether this is intentional multi-account behavior.
- Group reducers and commented routes indicate possible dormant or partially retained functionality that must be classified before removal.

## 5. React Query architecture

The application creates one global React Query client with:

- `refetchOnWindowFocus: false`;
- `staleTime: 60 seconds`;
- `cacheTime: Infinity`.

### Risks

- Infinite cache lifetime makes account and instance scope of every query key security-relevant.
- Redux logout does not automatically clear the QueryClient.
- Query ownership is currently mixed with Redux ownership and must be inventoried query by query.
- A single global client may be safe only if every key includes sufficient account/instance scope and logout/account-switch invalidation is comprehensive.

### Required Phase 0 follow-up

Inventory all files under `app/soapbox/queries/` and classify:

- query keys;
- account and instance scope;
- cache invalidation;
- mutation behavior;
- duplication with Redux entities;
- use of infinite cache entries;
- logout and account-switch behavior.

## 6. Service worker and offline architecture

### Production generation

`webpack/production.js` configures `@lcdp/offline-plugin` with automatic update checks.

The production service worker:

- uses the cache name `soapbox`;
- has a custom entry at `app/soapbox/service_worker/entry.ts`;
- pre-caches application assets;
- treats locale, polyfill, chunk, font, image, and SVG assets as optional caches;
- excludes maps, compressed files, reports, instance customization, legacy font formats, sounds, and large emoji/crypto asset groups;
- maps navigation requests for known backend route prefixes back to the network/backend;
- uses the frontend root as the app shell.

The custom service-worker entry currently imports:

- web push notification handling;
- share-target handling.

### Backend navigation bypass list

The current cache map recognizes many backend prefixes, including API, OAuth, media, proxy, socket, inbox, objects, activities, Pleroma, internal and administrative paths.

### Confirmed concerns

- Cache name is global and not visibly account-scoped in webpack configuration.
- The inspected configuration primarily concerns assets and navigation; authenticated API-response behavior still requires service-worker runtime inspection.
- Update behavior reloads the whole page after user-approved activation.
- Service-worker push/share handlers require separate data-validation and account-scope review.
- Development and production service-worker behavior differ.
- The inherited cache name and app-shell policy must be migrated without trapping users on incompatible assets.

## 7. Theme, accessibility and presentation settings

The root head layer currently:

- sets document language;
- toggles a global `dark` class;
- writes theme color metadata;
- injects generated theme CSS variables;
- applies body classes for reduced motion, underlined links, dyslexic font and demetrication.

Current reduced-motion behavior uses a negative class convention: `no-reduce-motion` is applied when reduced motion is not requested.

### Implications

- Existing user accessibility preferences must be preserved during design-system migration.
- The generated theme-variable contract is part of instance customization and cannot be discarded casually.
- Dark mode and theme generation are coupled to Redux-backed settings/configuration.
- Phase 2 requires mapping existing tokens and classes before adding new design tokens.

## 8. Keyboard and interaction architecture

The main UI defines a broad keyboard command map for:

- help and new post;
- search;
- reply, favourite, reaction, boost and mention;
- open and profile navigation;
- list movement;
- navigation to common destinations;
- sensitive/hidden content toggles;
- media opening.

### Implications

The Framework7 shell and redesigned surfaces must preserve or deliberately migrate these keyboard affordances. A visually modern shell that loses existing keyboard navigation would be a regression.

## 9. Initial subsystem status table

| Subsystem | Current owner/location | Current status | Target handling |
|---|---|---|---|
| Bootstrap | `app/application.ts`, `app/soapbox/main.tsx` | current | wrap, then migrate |
| Root providers | `containers/soapbox.tsx` | current | split into stable application boundaries |
| Routing | root container + `features/ui/index.tsx` | current, highly centralized | compatibility manifest and Framework7 bridge |
| Redux | `store.ts`, `reducers/index.ts` | current, broad mixed ownership | isolate in Phases 1 and 7 |
| React Query | `queries/client.ts` | current, global infinite cache | audit keys and scope; define authority |
| Theme | root head + generated CSS | current | map into design tokens |
| Service worker | webpack OfflinePlugin + custom entry | current, high-risk legacy | audit/harden in Phase 4 |
| Push/share target | service-worker modules | current | retain behind validated contracts |
| Keyboard shortcuts | main UI | current | preserve and test |
| Framework7 | absent | accepted target | Phase 3 |
| Phosphor | absent | accepted target | Phase 2 |
| Local canonical store | absent/unverified | accepted target | Phase 5 |
| Hybrid local search | absent/unverified | accepted target | Phases 12–17 |

## 10. Mandatory remaining inventories

Phase 0 remains incomplete. Required next inspections include:

1. every React Query module and key;
2. authentication token creation, persistence, refresh and deletion;
3. API client creation, interceptors, retry behavior and error normalization;
4. feature-detection implementation and cache lifetime;
5. localForage and any other browser persistence call sites;
6. web-push and share-target service-worker modules;
7. HTML sanitization and every `dangerouslySetInnerHTML` path;
8. external URL, redirect, preview and proxy handling;
9. media upload, object URL and metadata processing;
10. Sentry initialization, consent and redaction;
11. icon-library and shared-component call sites;
12. Sass/Tailwind ownership and generated theme variables;
13. Jest setup, integration tests and CI workflows;
14. dependency licenses, advisories and reachable legacy packages;
15. documentation/history/roadmap reconciliation;
16. complete route manifest and capability matrix.

No later phase should treat any item above as settled until its inventory is committed.