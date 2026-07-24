# HTML Safety Matrix

Status: **Current / Phase 0 in progress**

Last updated: 2026-07-23

## Purpose

This document begins the required Phase 0 reconciliation of production HTML transformation and rendering paths. It is evidence, not a declaration that remote content is safe. Every sink must be traced from source data through normalization, transformation, sanitization, URL handling, rendering, and adversarial tests.

## Evidence standard

A rendering path is not classified as sanitized merely because it:

- passes through a helper that parses or rewrites HTML;
- originates from a federated server;
- has been used historically without a reported incident;
- adds `rel` or `target` attributes after insertion;
- removes selected compatibility markup.

Safety requires an explicit allowlist sanitizer, URL-scheme policy, attribute policy, and tests against malicious markup.

## Verified matrix entries

| Surface | Source value | Transformation | Render/DOM sink | Current URL handling | Sanitizer verified | Immediate risk / unknown | Required follow-up |
|---|---|---|---|---|---|---|---|
| Status body | `status.contentHtml` | Optional `addGreentext()` | `dangerouslySetInnerHTML` in `app/soapbox/components/status_content.tsx` | After insertion, anchors receive `rel="nofollow noopener"` and `target="_blank"`; mention and hashtag listeners are attached | **No** | Upstream normalization and sanitizer provenance are not yet verified. Post-insertion link mutation does not prevent unsafe elements, attributes, or schemes from entering the DOM. | Trace `contentHtml` construction through normalizers; identify sanitizer and configuration; verify allowed tags, attributes, URI schemes, CSS/SVG handling, and malformed markup behavior; add adversarial tests. |
| Status content warning | `status.spoilerHtml` | No transformation visible at sink | `dangerouslySetInnerHTML` in `Spoiler` within `status_content.tsx` | No sink-local URL policy | **No** | Sanitizer provenance is unknown. | Trace `spoilerHtml` construction and apply the same sanitizer and URL-policy verification as status bodies. |
| Plain-text conversion | Arbitrary `html` argument | Regex replacement, then browser HTML parse | `wrapper.innerHTML`, followed by `textContent` return in `app/soapbox/utils/html.ts` | Not applicable to returned text | **Not a sanitizer** | The helper explicitly notes it may receive unsafe HTML. Its output is text, but callers and parsing side effects still require inventory. | Inventory all callers; verify no returned value is later trusted as sanitized HTML; test malformed tags, entities, SVG/MathML, and extreme input size. |
| Compatibility stripping | Arbitrary `html` argument | Browser parse; removes `.quote-inline` and `.recipients-inline` nodes | `node.innerHTML`, then returns serialized HTML in `app/soapbox/utils/html.ts` | None | **No** | Returns HTML after narrow element removal. It preserves unrelated active or unsafe markup and must never be treated as sanitization. | Inventory all callers and downstream sinks; require sanitization after transformation unless input is already proven sanitized; add regression tests proving dangerous unrelated markup survives so callers cannot misunderstand the contract. |

## Verified status-body behavior

`StatusContent` currently:

1. receives normalized `Status` data;
2. selects `status.contentHtml`;
3. optionally rewrites it through `addGreentext()`;
4. renders it with `dangerouslySetInnerHTML`;
5. walks inserted anchors after render;
6. adds `rel="nofollow noopener"`, opens ordinary links in a new tab, and installs mention/hashtag click behavior.

This improves some navigation behavior but is not a complete content-safety boundary. It does not itself prove filtering of scripts, event-handler attributes, dangerous URL schemes, SVG/MathML payloads, style-based attacks, malformed markup, or sanitizer bypasses.

## Required sink fields

Every remaining production sink must record:

- source entity and field;
- whether the value is local, administrator-authored, instance-provided, remote-user-authored, or third-party fetched;
- normalization and transformation chain;
- sanitizer package, version, configuration, and ownership;
- allowed tags and attributes;
- allowed URI schemes and URL normalization;
- link `rel`, referrer, target, and opener behavior;
- SVG, MathML, CSS, iframe, embed, and custom-element behavior;
- CSP and sandbox assumptions;
- accessibility consequences;
- test coverage and adversarial corpus;
- account/instance isolation and cache implications;
- target implementation phase and rollback plan.

## Next inspection queue

The source-inventory reconciliation identified these high-priority files for source-level classification:

- `app/soapbox/components/status.tsx`
- `app/soapbox/components/quoted-status.tsx`
- `app/soapbox/components/account.tsx`
- `app/soapbox/features/status/components/detailed-status.tsx`
- `app/soapbox/features/status/components/card.tsx`
- `app/soapbox/features/ui/components/profile_fields_panel.tsx`
- `app/soapbox/features/ui/components/profile_info_panel.tsx`
- `app/soapbox/features/admin/components/report.tsx`
- `app/soapbox/features/about/index.tsx`

The matrix is incomplete until every production `dangerouslySetInnerHTML` and `innerHTML` candidate is classified, scanner false positives are separated, sanitizer call sites are inventoried, and the complete data-flow chain is verified.

## Completion gate

This workstream remains blocked until:

- all production HTML sinks are enumerated;
- all source fields and trust boundaries are identified;
- sanitizer implementation and configuration are verified;
- URL and redirect policies are documented;
- preview, embed, custom-page, admin-authored, profile-field, status, quote, poll, and notification surfaces are covered;
- adversarial tests cover the accepted sanitizer and URL policy;
- no transformer is mislabeled as a sanitizer;
- unknowns are either resolved or explicitly accepted as release blockers.
