'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const replaceExact = (file, before, after) => {
  const current = read(file);
  const count = current.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly one replacement target, found ${count}`);
  write(file, current.replace(before, after));
};

replaceExact(
  'app/soapbox/utils/features.ts',
  "import { custom } from 'soapbox/custom';\n",
  "import { custom } from 'soapbox/custom';\nimport { supportsMastodonQuotePosts } from 'soapbox/utils/mastodon-quotes';\n",
);

replaceExact(
  'app/soapbox/utils/features.ts',
  `    quotePosts: any([\n      (v.software === PLEROMA || v.software === AKKOMA) && v.build === SOAPBOX && gte(v.version, '2.4.50'),\n      features.includes('quote_posting'),\n      instance.feature_quote === true,\n    ]),`,
  `    quotePosts: any([\n      supportsMastodonQuotePosts(instance),\n      (v.software === PLEROMA || v.software === AKKOMA) && v.build === SOAPBOX && gte(v.version, '2.4.50'),\n      features.includes('quote_posting'),\n      instance.feature_quote === true,\n    ]),`,
);

replaceExact(
  'app/soapbox/actions/statuses.ts',
  "import { shouldHaveCard } from 'soapbox/utils/status';\n",
  "import { normalizeQuoteCreateParams } from 'soapbox/utils/mastodon-quotes';\nimport { shouldHaveCard } from 'soapbox/utils/status';\n",
);

replaceExact(
  'app/soapbox/actions/statuses.ts',
  `const createStatus = (params: Record<string, any>, idempotencyKey: string, statusId: string | null) => {\n  return (dispatch: AppDispatch, getState: () => RootState) => {\n    dispatch({ type: STATUS_CREATE_REQUEST, params, idempotencyKey, editing: !!statusId });\n\n    return api(getState).request({\n      url: statusId === null ? '/api/v1/statuses' : \`/api/v1/statuses/\${statusId}\`,\n      method: statusId === null ? 'post' : 'put',\n      data: params,`,
  `const createStatus = (params: Record<string, any>, idempotencyKey: string, statusId: string | null) => {\n  return (dispatch: AppDispatch, getState: () => RootState) => {\n    let requestParams: Record<string, any>;\n\n    try {\n      requestParams = normalizeQuoteCreateParams(params, getState().instance, Boolean(statusId));\n    } catch (error) {\n      dispatch({ type: STATUS_CREATE_FAIL, error, params, idempotencyKey, editing: !!statusId });\n      return Promise.reject(error);\n    }\n\n    dispatch({ type: STATUS_CREATE_REQUEST, params: requestParams, idempotencyKey, editing: !!statusId });\n\n    return api(getState).request({\n      url: statusId === null ? '/api/v1/statuses' : \`/api/v1/statuses/\${statusId}\`,\n      method: statusId === null ? 'post' : 'put',\n      data: requestParams,`,
);

replaceExact(
  'app/soapbox/actions/statuses.ts',
  `      dispatch({ type: STATUS_CREATE_SUCCESS, status, params, idempotencyKey });`,
  `      dispatch({ type: STATUS_CREATE_SUCCESS, status, params: requestParams, idempotencyKey });`,
);

replaceExact(
  'app/soapbox/actions/statuses.ts',
  `      dispatch({ type: STATUS_CREATE_FAIL, error, params, idempotencyKey, editing: !!statusId });`,
  `      dispatch({ type: STATUS_CREATE_FAIL, error, params: requestParams, idempotencyKey, editing: !!statusId });`,
);

replaceExact(
  'app/soapbox/actions/importer/index.ts',
  "import { getFilters } from 'soapbox/selectors';\n",
  "import { getFilters } from 'soapbox/selectors';\nimport { normalizeMastodonQuoteStatus } from 'soapbox/utils/mastodon-quotes';\n",
);

replaceExact(
  'app/soapbox/actions/importer/index.ts',
  `export function importFetchedStatus(status: APIEntity, idempotencyKey?: string) {\n  return (dispatch: AppDispatch) => {\n    // Skip broken statuses`,
  `export function importFetchedStatus(status: APIEntity, idempotencyKey?: string) {\n  return (dispatch: AppDispatch) => {\n    normalizeMastodonQuoteStatus(status);\n\n    // Skip broken statuses`,
);

replaceExact(
  'app/soapbox/actions/importer/index.ts',
  `    function processStatus(status: APIEntity) {\n      // Skip broken statuses`,
  `    function processStatus(status: APIEntity) {\n      normalizeMastodonQuoteStatus(status);\n\n      // Skip broken statuses`,
);

replaceExact(
  'app/soapbox/normalizers/status.ts',
  `  quote: null as EmbeddedEntity<any>,\n  reblog: null as EmbeddedEntity<any>,`,
  `  quote: null as EmbeddedEntity<any>,\n  quote_approval: null as ImmutableMap<string, any> | null,\n  quote_state: null as string | null,\n  quoted_status_id: null as string | null,\n  quotes_count: 0,\n  reblog: null as EmbeddedEntity<any>,`,
);

replaceExact(
  'app/soapbox/components/status-action-bar.tsx',
  "import { getReactForStatus, reduceEmoji } from 'soapbox/utils/emoji_reacts';\n",
  "import { getReactForStatus, reduceEmoji } from 'soapbox/utils/emoji_reacts';\nimport { getQuotePermission, supportsMastodonQuotePosts } from 'soapbox/utils/mastodon-quotes';\n",
);

replaceExact(
  'app/soapbox/components/status-action-bar.tsx',
  `  const quotePosts = useMemo(() => features.quotePosts && soapboxConfig.quotePosts, [features, soapboxConfig]);`,
  `  const mastodonQuotePosts = useAppSelector(state => supportsMastodonQuotePosts(state.instance));\n  const quotePermission = useMemo(() => getQuotePermission(status, mastodonQuotePosts), [status, mastodonQuotePosts]);\n  const quotePosts = useMemo(() => features.quotePosts && soapboxConfig.quotePosts, [features, soapboxConfig]);`,
);

replaceExact(
  'app/soapbox/components/status-action-bar.tsx',
  `      disabled: status.visibility !== 'public' && status.visibility !== 'unlisted',`,
  `      disabled: !quotePermission.allowed || (status.visibility !== 'public' && status.visibility !== 'unlisted'),`,
);

replaceExact(
  'app/soapbox/components/status-action-bar.tsx',
  `  ], [intl, status.reblogged, handleReblogClick, handleQuoteClick, status.visibility]);`,
  `  ], [intl, status.reblogged, handleReblogClick, handleQuoteClick, status.visibility, quotePermission.allowed]);`,
);

replaceExact(
  'app/soapbox/components/status.tsx',
  "import QuotedStatus from 'soapbox/features/status/containers/quoted_status_container';\n",
  "import QuotePlaceholder from 'soapbox/components/quote-placeholder';\nimport QuotedStatus from 'soapbox/features/status/containers/quoted_status_container';\n",
);

replaceExact(
  'app/soapbox/components/status.tsx',
  `    if (actualStatus.quote) {\n      if (actualStatus.pleroma.get('quote_visible', true) === false) {\n        return (\n          <div className='quoted-status-tombstone'>\n            <p><FormattedMessage id='statuses.quote_tombstone' defaultMessage='Post is unavailable.' /></p>\n          </div>\n        );\n      } else {\n        return <QuotedStatus statusId={actualStatus.quote as string} />;\n      }\n    }\n  }, [actualStatus.pleroma, actualStatus.quote]);`,
  `    if (actualStatus.quote) {\n      if (actualStatus.pleroma.get('quote_visible', true) === false) {\n        return <QuotePlaceholder state='unauthorized' />;\n      } else {\n        return <QuotedStatus statusId={actualStatus.quote as string} />;\n      }\n    }\n\n    if (actualStatus.quote_state) {\n      return <QuotePlaceholder state={actualStatus.quote_state} />;\n    }\n  }, [actualStatus.pleroma, actualStatus.quote, actualStatus.quote_state]);`,
);

write('app/soapbox/utils/mastodon-quotes.ts', `import type { Status } from 'soapbox/types/entities';\n\nexport type QuoteApprovalPolicy = 'public' | 'followers' | 'nobody';\nexport type QuoteState =\n  | 'pending'\n  | 'accepted'\n  | 'rejected'\n  | 'revoked'\n  | 'deleted'\n  | 'unauthorized'\n  | 'blocked_account'\n  | 'blocked_domain'\n  | 'muted_account';\n\nconst DISPLAYABLE_STATES = new Set<QuoteState>(['accepted', 'blocked_account', 'blocked_domain', 'muted_account']);\nconst KNOWN_STATES = new Set<QuoteState>([\n  'pending',\n  'accepted',\n  'rejected',\n  'revoked',\n  'deleted',\n  'unauthorized',\n  'blocked_account',\n  'blocked_domain',\n  'muted_account',\n]);\n\nconst getValue = (value: any, key: string): any => value?.get?.(key) ?? value?.[key];\n\nconst asApiVersion = (instance: any): number => {\n  const value = instance?.api_versions?.mastodon ?? instance?.getIn?.(['api_versions', 'mastodon']);\n  const version = Number(value);\n  return Number.isFinite(version) ? version : 0;\n};\n\nexport const supportsMastodonQuotePosts = (instance: any): boolean => asApiVersion(instance) >= 7;\n\nconst normalizeQuoteState = (value: unknown): QuoteState => {\n  return typeof value === 'string' && KNOWN_STATES.has(value as QuoteState)\n    ? value as QuoteState\n    : 'unauthorized';\n};\n\n/**\n * Convert Mastodon's Quote wrapper into Mangane's existing quoted-status reference\n * while retaining the authorization state needed for safe placeholders.\n */\nexport const normalizeMastodonQuoteStatus = (status: Record<string, any>): Record<string, any> => {\n  if (!status || typeof status !== 'object') return status;\n\n  const quote = status.quote;\n  if (!quote || typeof quote !== 'object' || (!Object.prototype.hasOwnProperty.call(quote, 'state') && !Object.prototype.hasOwnProperty.call(quote, 'quoted_status'))) {\n    return status;\n  }\n\n  const state = normalizeQuoteState(quote.state);\n  const quotedStatus = quote.quoted_status;\n\n  status.quote_state = state;\n  status.quoted_status_id = typeof quote.quoted_status_id === 'string' ? quote.quoted_status_id : quotedStatus?.id ?? null;\n  status.quote = DISPLAYABLE_STATES.has(state) && quotedStatus?.id ? quotedStatus : null;\n\n  return status;\n};\n\nconst collectionSize = (value: any): number => {\n  if (Array.isArray(value)) return value.length;\n  if (typeof value?.size === 'number') return value.size;\n  return 0;\n};\n\nexport class QuotePostValidationError extends Error {\n  readonly code: string;\n\n  constructor(code: string, message: string) {\n    super(message);\n    this.name = 'QuotePostValidationError';\n    this.code = code;\n  }\n}\n\n/** Convert the inherited quote_id field to Mastodon's API v7 quoted_status_id. */\nexport const normalizeQuoteCreateParams = (params: Record<string, any>, instance: any, editing = false): Record<string, any> => {\n  const normalized = { ...params };\n\n  if (editing) {\n    delete normalized.quote_id;\n    delete normalized.quoted_status_id;\n    return normalized;\n  }\n\n  if (!normalized.quote_id || !supportsMastodonQuotePosts(instance)) return normalized;\n\n  if (collectionSize(normalized.media_ids) > 0) {\n    throw new QuotePostValidationError('quote_media_unsupported', 'Mastodon quote posts cannot include media attachments.');\n  }\n\n  if (normalized.poll) {\n    throw new QuotePostValidationError('quote_poll_unsupported', 'Mastodon quote posts cannot include polls.');\n  }\n\n  normalized.quoted_status_id = String(normalized.quote_id);\n  delete normalized.quote_id;\n  return normalized;\n};\n\nexport interface QuotePermission {\n  allowed: boolean,\n  approval: 'automatic' | 'manual' | 'denied' | 'unknown' | 'legacy',\n}\n\nexport const getQuotePermission = (status: Status | Record<string, any>, strictMastodonPolicy = false): QuotePermission => {\n  const approval = getValue(status, 'quote_approval');\n  const currentUser = getValue(approval, 'current_user');\n\n  if (currentUser === 'automatic' || currentUser === 'manual') {\n    return { allowed: true, approval: currentUser };\n  }\n\n  if (currentUser === 'denied' || currentUser === 'unknown') {\n    return { allowed: false, approval: currentUser };\n  }\n\n  return strictMastodonPolicy\n    ? { allowed: false, approval: 'unknown' }\n    : { allowed: true, approval: 'legacy' };\n};\n`);

write('app/soapbox/actions/quotes.ts', `import api, { getNextLink } from 'soapbox/api';\nimport { importFetchedAccount, importFetchedStatus, importFetchedStatuses } from 'soapbox/actions/importer';\nimport type { AppDispatch, RootState } from 'soapbox/store';\nimport type { APIEntity } from 'soapbox/types/entities';\nimport type { QuoteApprovalPolicy } from 'soapbox/utils/mastodon-quotes';\n\nconst assertPolicy = (policy: string): QuoteApprovalPolicy => {\n  if (policy !== 'public' && policy !== 'followers' && policy !== 'nobody') {\n    throw new TypeError('Invalid quote approval policy');\n  }\n  return policy;\n};\n\nexport const fetchStatusQuotes = (statusId: string, params: Record<string, any> = {}) =>\n  async(dispatch: AppDispatch, getState: () => RootState) => {\n    const response = await api(getState).get(`/api/v1/statuses/${encodeURIComponent(statusId)}/quotes`, { params });\n    const statuses = Array.isArray(response.data) ? response.data : [];\n    dispatch(importFetchedStatuses(statuses));\n    return { statuses, next: getNextLink(response) };\n  };\n\nexport const revokeStatusQuote = (statusId: string, quotingStatusId: string) =>\n  async(dispatch: AppDispatch, getState: () => RootState): Promise<APIEntity> => {\n    const { data } = await api(getState).post(\n      `/api/v1/statuses/${encodeURIComponent(statusId)}/quotes/${encodeURIComponent(quotingStatusId)}/revoke`,\n    );\n    dispatch(importFetchedStatus(data));\n    return data;\n  };\n\nexport const updateStatusQuotePolicy = (statusId: string, policy: QuoteApprovalPolicy) =>\n  async(dispatch: AppDispatch, getState: () => RootState): Promise<APIEntity> => {\n    const { data } = await api(getState).put(\n      `/api/v1/statuses/${encodeURIComponent(statusId)}/interaction_policy`,\n      { quote_approval_policy: assertPolicy(policy) },\n    );\n    dispatch(importFetchedStatus(data));\n    return data;\n  };\n\nexport const updateDefaultQuotePolicy = (policy: QuoteApprovalPolicy) =>\n  async(dispatch: AppDispatch, getState: () => RootState): Promise<APIEntity> => {\n    const { data } = await api(getState).patch('/api/v1/accounts/update_credentials', {\n      'source[quote_policy]': assertPolicy(policy),\n    });\n    dispatch(importFetchedAccount(data));\n    return data;\n  };\n\nexport const fetchQuotePreferences = () =>\n  async(_dispatch: AppDispatch, getState: () => RootState): Promise<Record<string, any>> => {\n    const { data } = await api(getState).get('/api/v1/preferences');\n    return data;\n  };\n`);

write('app/soapbox/components/quote-placeholder.tsx', `import React from 'react';\nimport { FormattedMessage } from 'react-intl';\n\ninterface IQuotePlaceholder {\n  state?: string | null,\n}\n\nconst QuotePlaceholder: React.FC<IQuotePlaceholder> = ({ state }) => {\n  let message = <FormattedMessage id='statuses.quote_unavailable' defaultMessage='Quoted post is unavailable.' />;\n\n  if (state === 'pending') {\n    message = <FormattedMessage id='statuses.quote_pending' defaultMessage='Waiting for the author to approve this quote.' />;\n  } else if (state === 'rejected' || state === 'revoked') {\n    message = <FormattedMessage id='statuses.quote_revoked' defaultMessage='The author did not allow this quote.' />;\n  } else if (state === 'deleted') {\n    message = <FormattedMessage id='statuses.quote_deleted' defaultMessage='The quoted post was deleted.' />;\n  } else if (state === 'blocked_account' || state === 'blocked_domain' || state === 'muted_account') {\n    message = <FormattedMessage id='statuses.quote_hidden' defaultMessage='Quoted post hidden by your moderation settings.' />;\n  }\n\n  return (\n    <div className='quoted-status-tombstone' role='note'>\n      <p>{message}</p>\n    </div>\n  );\n};\n\nexport default QuotePlaceholder;\n`);

write('app/soapbox/utils/__tests__/mastodon-quotes.test.ts', `import {\n  QuotePostValidationError,\n  getQuotePermission,\n  normalizeMastodonQuoteStatus,\n  normalizeQuoteCreateParams,\n  supportsMastodonQuotePosts,\n} from '../mastodon-quotes';\n\nconst instance = (version: number) => ({ api_versions: { mastodon: version } });\n\ndescribe('Mastodon quote posts', () => {\n  it('detects Mastodon API version 7', () => {\n    expect(supportsMastodonQuotePosts(instance(7))).toBe(true);\n    expect(supportsMastodonQuotePosts(instance(6))).toBe(false);\n  });\n\n  it('converts the legacy compose field to quoted_status_id', () => {\n    expect(normalizeQuoteCreateParams({ status: 'Comment', quote_id: '42' }, instance(7))).toEqual({\n      status: 'Comment',\n      quoted_status_id: '42',\n    });\n  });\n\n  it('keeps quote_id for non-Mastodon quote implementations', () => {\n    expect(normalizeQuoteCreateParams({ status: 'Comment', quote_id: '42' }, instance(6))).toEqual({\n      status: 'Comment',\n      quote_id: '42',\n    });\n  });\n\n  it('does not attempt to change a quote while editing', () => {\n    expect(normalizeQuoteCreateParams({ status: 'Edit', quote_id: '42' }, instance(7), true)).toEqual({ status: 'Edit' });\n  });\n\n  it('rejects Mastodon quote posts with media or polls', () => {\n    expect(() => normalizeQuoteCreateParams({ quote_id: '42', media_ids: ['1'] }, instance(7))).toThrow(QuotePostValidationError);\n    expect(() => normalizeQuoteCreateParams({ quote_id: '42', poll: { options: ['a', 'b'] } }, instance(7))).toThrow(QuotePostValidationError);\n  });\n\n  it('normalizes accepted Mastodon quote wrappers', () => {\n    const quoted = { id: 'quoted', account: { id: 'account' } };\n    const status: any = { quote: { state: 'accepted', quoted_status: quoted } };\n    normalizeMastodonQuoteStatus(status);\n    expect(status.quote).toBe(quoted);\n    expect(status.quote_state).toBe('accepted');\n    expect(status.quoted_status_id).toBe('quoted');\n  });\n\n  it('retains non-displayable quote states without exposing the post', () => {\n    const status: any = { quote: { state: 'revoked', quoted_status: { id: 'quoted' } } };\n    normalizeMastodonQuoteStatus(status);\n    expect(status.quote).toBeNull();\n    expect(status.quote_state).toBe('revoked');\n  });\n\n  it('fails closed on unknown quote states and policies', () => {\n    const status: any = { quote: { state: 'future-state', quoted_status: { id: 'quoted' } } };\n    normalizeMastodonQuoteStatus(status);\n    expect(status.quote).toBeNull();\n    expect(status.quote_state).toBe('unauthorized');\n    expect(getQuotePermission({ quote_approval: { current_user: 'unknown' } }, true).allowed).toBe(false);\n    expect(getQuotePermission({}, true).allowed).toBe(false);\n  });\n\n  it('allows automatic and manual approval states', () => {\n    expect(getQuotePermission({ quote_approval: { current_user: 'automatic' } }, true)).toEqual({ allowed: true, approval: 'automatic' });\n    expect(getQuotePermission({ quote_approval: { current_user: 'manual' } }, true)).toEqual({ allowed: true, approval: 'manual' });\n  });\n});\n`);

write('docs/architecture/MASTODON_QUOTE_POSTS.md', `# Mastodon quote posts compatibility\n\nStatus: **Runtime compatibility implemented; policy-management UI remains incremental**\n\nLast updated: 2026-07-31\n\n## Purpose\n\nMangane already supported the older Pleroma, Akkoma, Fedibird, and Rebased quote shapes through \`quote_id\` and embedded quoted statuses. Mastodon 4.5 introduced a consent-aware quote protocol and Mastodon API version 7 with different request and response contracts. This document records the shared compatibility boundary.\n\n## Implemented API surface\n\n- \`POST /api/v1/statuses\` using \`quoted_status_id\` when \`api_versions.mastodon >= 7\`;\n- \`GET /api/v1/statuses/:id/quotes\`;\n- \`POST /api/v1/statuses/:id/quotes/:quoting_status_id/revoke\`;\n- \`PUT /api/v1/statuses/:id/interaction_policy\`;\n- \`PATCH /api/v1/accounts/update_credentials\` using \`source[quote_policy]\`;\n- \`GET /api/v1/preferences\` for \`posting:default:quote_policy\`;\n- status fields \`quote\`, \`quote_approval\`, \`quotes_count\`, and the normalized quote state;\n- notification types remain forward-compatible because Mangane stores the server-provided notification type and imports its status normally.\n\n## Compatibility rules\n\nMastodon quote wrappers are normalized into the existing canonical quoted-status relationship only for displayable states. Pending, rejected, revoked, deleted, unauthorized, blocked, muted, and unknown states retain a safe placeholder rather than exposing content without approval. Unknown states fail closed as unauthorized.\n\nMastodon API v7 creation converts Mangane's inherited \`quote_id\` compose field to \`quoted_status_id\`. Older Pleroma/Akkoma/Rebased quote implementations keep \`quote_id\`. Editing removes quote identifiers because Mastodon does not allow changing or removing the quoted post through status editing.\n\nMastodon does not permit media attachments or polls on a quote post. Mangane rejects those combinations before sending the request instead of silently discarding user content.\n\nThe action bar uses \`quote_approval.current_user\` on Mastodon. \`automatic\` and \`manual\` permit authoring; \`denied\`, \`unknown\`, and missing policy metadata on a Mastodon API-v7 status fail closed. Legacy quote implementations retain their existing capability behavior.\n\nThe server-provided \`.quote-inline\` compatibility paragraph continues to be removed by the existing reviewed HTML transformation before rendering, preventing duplicate quoted links.\n\n## Security and privacy\n\n- Quote authorization is never inferred from visibility alone when Mastodon policy metadata is authoritative.\n- Revocation and interaction-policy changes remain authenticated server operations; local state is updated only from the returned status.\n- Status IDs are URL encoded before use in quote endpoints.\n- Unknown quote states and policies do not expose the nested status.\n- Existing filters, blocks, mutes, domain policy, visibility checks, and canonical status rendering remain authoritative.\n- No second quote store, status renderer, composer, or retry queue is introduced.\n\n## Remaining product slices\n\nThe API and normalization boundary is implemented. Later presentation work may add a dedicated quote-policy selector in posting defaults, a per-post interaction-policy sheet, a quotes list surface, and a one-tap revoke control from quote notifications. Those surfaces must reuse the actions defined here and preserve the same fail-closed policy behavior.\n\n## Primary references\n\n- Mastodon client quote implementation guide: <https://docs.joinmastodon.org/client/quotes/>\n- Mastodon status methods: <https://docs.joinmastodon.org/methods/statuses/>\n- Mastodon Quote entity: <https://docs.joinmastodon.org/entities/Quote/>\n- Mastodon QuoteApproval entity: <https://docs.joinmastodon.org/entities/QuoteApproval/>\n- Mastodon ActivityPub quote extension: <https://docs.joinmastodon.org/spec/activitypub/>\n`);

replaceExact(
  'docs/architecture/README.md',
  `## Architecture documents\n`,
  `## Architecture documents\n\n- [Mastodon quote posts compatibility](./MASTODON_QUOTE_POSTS.md) — API v7 authoring, consent policy, normalization, revocation, and safe fallback behavior.\n`,
);

for (const candidate of [
  'scripts/generate-documentation-authority-registry.js',
  'scripts/regenerate-documentation-authority-registry.js',
  'scripts/documentation-authority-registry.js',
]) {
  if (fs.existsSync(path.join(root, candidate))) {
    execFileSync(process.execPath, [candidate], { cwd: root, stdio: 'inherit' });
    break;
  }
}

console.log('Applied Mastodon quote-post support.');
