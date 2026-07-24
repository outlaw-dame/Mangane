# Sentry Runtime and Redaction Inventory

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document records the source-backed Phase 0 reconciliation of Sentry and crash-reporting behavior. It distinguishes dependency and build-configuration presence from verified runtime activation, consent, capture, redaction, retention, and opt-out behavior.

It does not claim that Sentry is initialized, disabled, safe, consented, or production-ready where source evidence has not been established.

## Verified current evidence

| Concern | Source | Verified behavior | Status |
|---|---|---|---|
| Browser SDK dependencies | `package.json` | `@sentry/browser`, `@sentry/react`, and `@sentry/tracing` are direct runtime dependencies at version range `^7.2.0` | Verified-current |
| Build configuration input | `app/soapbox/build_config.js` | `SENTRY_DSN` is read from `process.env` and exported through the application build configuration | Verified-current |
| Webpack environment exposure | `webpack/configuration.js`, `webpack/shared.js` | The inspected webpack environment path explicitly exports `NODE_ENV`; complete propagation and embedding behavior for `SENTRY_DSN` remains unverified | Partial |
| Root failure surface | `app/soapbox/components/error_boundary.tsx` | A root error boundary exists and provides an emergency browser reset path; whether it reports exceptions to Sentry is unverified | Partial |
| Indexed code search | repository search for `Sentry.init` | The available repository search index returned no matching source files for this initialization term | Inconclusive |
| Runtime initialization | Complete repository tree and call-site inventory not yet established | No source-backed conclusion may yet be made about `Sentry.init`, enabled environments, integrations, sampling, release metadata, or transport behavior | Unknown |
| Event redaction | Complete repository tree and call-site inventory not yet established | No verified `beforeSend`, `beforeBreadcrumb`, denylist, allowlist, URL sanitizer, header sanitizer, or body sanitizer has yet been established | Blocked |
| Consent and opt-out | Complete repository tree and call-site inventory not yet established | User consent, administrator control, privacy disclosure, and runtime opt-out behavior remain unverified | Blocked |
| Capture call sites | Complete repository tree and call-site inventory not yet established | `captureException`, `captureMessage`, scoped context, tags, breadcrumbs, attachments, and manual event construction remain unverified | Unknown |

## Search limitations and disposition

The available repository code-search index returned no match for the inspected `Sentry.init` initialization term. That result is not treated as proof of absence because index coverage, generated files, dynamic imports, aliases, and unindexed paths have not been ruled out.

The dependency and DSN terms are not absent: `@sentry/react` is directly declared in `package.json`, and `SENTRY_DSN` is read and exported in `app/soapbox/build_config.js`.

Therefore:

- dependency and build-configuration presence are verified;
- runtime activation remains unknown;
- telemetry safety remains blocked;
- Phase 1 work must not assume Sentry is active or safe;
- production telemetry must remain disabled unless a later implementation explicitly establishes the required policy, redaction, consent, tests, and operational controls.

## Security conclusions

The presence of Sentry dependencies and a DSN configuration signal is not proof that telemetry is active. It is also not proof that telemetry is safe.

Until runtime initialization and every capture boundary are enumerated, the following remain release blockers:

- authorization, cookie, password, MFA, OAuth-code, client-secret, access-token, refresh-token, and session values reaching events or breadcrumbs;
- Axios configuration, headers, request bodies, response bodies, redirect URLs, or server error payloads being serialized without explicit redaction;
- account, instance, moderation, draft, notification, private-message, or search data being attached without a documented allowlist and privacy basis;
- attacker-controlled objects reaching generic serializers, breadcrumbs, or exception normalization;
- production telemetry operating without explicit environment policy, sampling, retention, consent, and opt-out behavior;
- redaction failure emitting an event rather than dropping it.

## Required runtime inventory

The next complete source inspection must enumerate:

1. all imports from `@sentry/browser`, `@sentry/react`, and `@sentry/tracing`;
2. all initialization sites and environment gates;
3. all integrations, transports, tracing, profiling, replay, and breadcrumb sources;
4. every manual capture call and error-boundary integration;
5. all scoped tags, users, contexts, extras, attachments, and transaction names;
6. release, environment, DSN, source-map, and build-artifact injection;
7. `beforeSend`, `beforeBreadcrumb`, event processors, and custom serializers;
8. consent, privacy disclosure, administrator configuration, and user opt-out;
9. retry, offline queueing, unload behavior, and retention;
10. tests proving forbidden values never leave the browser.

## Required redaction contract

A production-capable crash-reporting boundary must:

- use an explicit allowlist for event fields;
- remove authorization and cookie headers case-insensitively;
- sanitize query strings, fragments, paths, referrers, and redirect targets;
- recursively redact classified fields from nested objects and arrays;
- avoid invoking custom getters, `toJSON`, or attacker-controlled serialization hooks;
- bound depth, width, string length, and total event size;
- strip request and response bodies by default;
- pseudonymize or omit account and instance identifiers unless strictly necessary;
- drop the event on redaction or serialization failure;
- record only non-sensitive diagnostics needed to investigate the redaction failure.

## Mandatory adversarial tests

The completed implementation must prove that seeded forbidden values do not appear in:

- events, exceptions, messages, breadcrumbs, transactions, spans, tags, users, contexts, extras, and attachments;
- Axios timeout, cancellation, retry, malformed-response, redirect, and authentication errors;
- Redux actions and state-derived error context;
- React Query keys, variables, cached errors, and mutation metadata;
- push, notification, service-worker, stream, and share-target failures;
- source maps, generated HTML, client bundles, CI logs, snapshots, fixtures, and uploaded artifacts.

Tests must cover mixed-case keys, aliases, cycles, arrays, deep nesting, custom errors, hostile getters, custom `toJSON`, oversized values, Unicode confusables, and partial redaction failure.

## Completion gate

This inventory records the verified baseline and the unresolved release blockers. It does not close the broader Phase 0 telemetry gate.

The gate remains open until runtime initialization, all capture paths, event schemas, environment behavior, consent, opt-out, source-map handling, retention, redaction, failure behavior, and adversarial tests are directly verified, or telemetry is explicitly removed and its build/runtime inputs are proven absent.

Dependency presence or an unused DSN must not be treated as evidence that telemetry is active. Absence of a discovered call site in a partial search must not be treated as proof that telemetry is absent.
