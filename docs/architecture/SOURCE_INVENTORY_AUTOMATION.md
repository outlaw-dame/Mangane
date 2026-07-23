# Source Inventory Automation

Status: **Current Phase 0 evidence tooling**

Last updated: 2026-07-23

## Purpose

Phase 0 requires a complete inventory of server-state, persistence, network, HTML-sink, observability, worker, notification, and streaming call sites. External repository search is not accepted as the sole evidence source because indexing can be missing, delayed, or incomplete.

`scripts/architecture-inventory.js` performs a deterministic, read-only scan of repository source files. It does not classify a call site as safe and it does not replace manual review. It produces the candidate set that the canonical inventory documents must reconcile.

## Commands

Generate machine-readable JSON:

```sh
node scripts/architecture-inventory.js > /tmp/mangane-architecture-inventory.json
```

Generate reviewable Markdown:

```sh
node scripts/architecture-inventory.js --markdown > /tmp/mangane-architecture-inventory.md
```

Run the focused tests:

```sh
npx jest scripts/__tests__/architecture-inventory.test.js --runInBand
```

The output intentionally contains no timestamp, machine path, or environment-specific value. Identical source trees must generate identical output.

## Current categories

The scanner identifies candidate call sites for:

- React Query queries, mutations, cache reads/writes, invalidation, cancellation, removal, reset, and clear operations;
- `localStorage`, `sessionStorage`, IndexedDB, and localForage;
- Axios and Fetch transports;
- `innerHTML` and `dangerouslySetInnerHTML` sinks;
- Sentry integration;
- service-worker, Cache Storage, and notification behavior;
- WebSocket and EventSource streams.

The rules are deliberately narrow enough to remain reviewable. A missing match is not proof that a behavior is absent. New APIs or aliases discovered during reconciliation must be added with a regression test.

## Evidence workflow

1. Generate JSON from the exact PR or release commit being inspected.
2. Preserve the commit SHA separately in the review or CI artifact metadata; do not inject it into deterministic output.
3. Reconcile every finding into the relevant canonical inventory document.
4. Record owner, authority scope, lifecycle, privacy, invalidation, cancellation, tests, and migration status.
5. Treat unmatched manual findings as scanner gaps and add fixtures before expanding the production rule.
6. Treat scanner findings that are tests, comments, or false positives as reviewed exclusions with a reason; do not silently delete them.
7. Compare output before and after each modernization phase to detect newly introduced direct legacy access.

## Security and privacy properties

- The tool reads files only; it performs no network requests.
- Symlinks are skipped to avoid escaping the repository tree.
- dependency, coverage, and build-output directories are skipped.
- source contents and secrets are never copied into the report; only category, repository-relative path, match count, and line numbers are emitted.
- errors are fail-fast rather than converted into an incomplete-success result.

## Phase 0 limitation

This automation removes dependence on external search indexing, but Phase 0 remains incomplete until the generated candidate set has been executed against the full repository, manually reconciled, and reflected in the canonical matrices and risk register. The existence of the scanner must not be used as evidence that the inventory itself is complete.
