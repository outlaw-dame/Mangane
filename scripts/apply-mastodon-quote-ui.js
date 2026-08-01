'use strict';

const fs = require('fs');
const path = require('path');

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
  if (count !== 1) throw new Error(`${file}: expected one replacement target, found ${count}`);
  write(file, current.replace(before, after));
};

write('app/soapbox/features/status/components/quote-controls.tsx', `import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import {
  fetchQuotePreferences,
  fetchStatusQuotes,
  revokeStatusQuote,
  updateDefaultQuotePolicy,
  updateStatusQuotePolicy,
} from 'soapbox/actions/quotes';
import StatusContainer from 'soapbox/containers/status_container';
import { useAppDispatch, useAppSelector } from 'soapbox/hooks';
import { supportsMastodonQuotePosts } from 'soapbox/utils/mastodon-quotes';

import type { Status } from 'soapbox/types/entities';
import type { QuoteApprovalPolicy } from 'soapbox/utils/mastodon-quotes';

const messages = defineMessages({
  heading: { id: 'quotes.controls.heading', defaultMessage: 'Quote controls' },
  viewQuotes: { id: 'quotes.controls.view', defaultMessage: 'View quotes ({count})' },
  hideQuotes: { id: 'quotes.controls.hide', defaultMessage: 'Hide quotes' },
  empty: { id: 'quotes.controls.empty', defaultMessage: 'No quotes yet.' },
  loadMore: { id: 'quotes.controls.load_more', defaultMessage: 'Load more' },
  loading: { id: 'quotes.controls.loading', defaultMessage: 'Loading…' },
  retry: { id: 'quotes.controls.retry', defaultMessage: 'Try again' },
  loadError: { id: 'quotes.controls.load_error', defaultMessage: 'Quotes could not be loaded.' },
  postPolicy: { id: 'quotes.controls.post_policy', defaultMessage: 'Who can quote this post' },
  defaultPolicy: { id: 'quotes.controls.default_policy', defaultMessage: 'Default for future posts' },
  publicPolicy: { id: 'quotes.policy.public', defaultMessage: 'Anyone' },
  followersPolicy: { id: 'quotes.policy.followers', defaultMessage: 'Followers only' },
  nobodyPolicy: { id: 'quotes.policy.nobody', defaultMessage: 'Nobody' },
  saving: { id: 'quotes.controls.saving', defaultMessage: 'Saving…' },
  saveError: { id: 'quotes.controls.save_error', defaultMessage: 'The quote policy could not be saved.' },
  revoke: { id: 'quotes.controls.revoke', defaultMessage: 'Revoke quote' },
  revoking: { id: 'quotes.controls.revoking', defaultMessage: 'Revoking…' },
});

const POLICIES: QuoteApprovalPolicy[] = ['public', 'followers', 'nobody'];
const getValue = (value: any, key: string): any => value?.get?.(key) ?? value?.[key];

interface IQuoteControls {
  status: Status,
}

const QuoteControls: React.FC<IQuoteControls> = ({ status }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const me = useAppSelector(state => state.me);
  const supported = useAppSelector(state => supportsMastodonQuotePosts(state.instance));
  const ownStatus = status.getIn(['account', 'id']) === me;
  const [expanded, setExpanded] = useState(false);
  const [quoteIds, setQuoteIds] = useState<string[]>([]);
  const [next, setNext] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState<'post' | 'default' | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [revokingId, setRevokingId] = useState<string>();
  const approval = status.quote_approval;
  const initialPostPolicy = (getValue(approval, 'automatic') || getValue(approval, 'policy') || 'public') as QuoteApprovalPolicy;
  const [postPolicy, setPostPolicy] = useState<QuoteApprovalPolicy>(POLICIES.includes(initialPostPolicy) ? initialPostPolicy : 'public');
  const [defaultPolicy, setDefaultPolicy] = useState<QuoteApprovalPolicy>('public');

  useEffect(() => {
    if (!supported || !me || !ownStatus) return;
    dispatch(fetchQuotePreferences()).then(preferences => {
      const policy = preferences?.['posting:default:quote_policy'];
      if (POLICIES.includes(policy)) setDefaultPolicy(policy);
    }).catch(() => undefined);
  }, [dispatch, me, ownStatus, supported]);

  const loadQuotes = useCallback(async(params: Record<string, any> = {}, append = false) => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await dispatch(fetchStatusQuotes(status.id, params));
      const ids = result.statuses.map((item: any) => String(item.id)).filter(Boolean);
      setQuoteIds(current => append ? Array.from(new Set([...current, ...ids])) : ids);
      setNext(result.next);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch, status.id]);

  const toggleExpanded = useCallback(() => {
    setExpanded(value => {
      const nextValue = !value;
      if (nextValue && quoteIds.length === 0 && !loading) void loadQuotes();
      return nextValue;
    });
  }, [loadQuotes, loading, quoteIds.length]);

  const savePostPolicy = useCallback(async(policy: QuoteApprovalPolicy) => {
    setPostPolicy(policy);
    setSaving('post');
    setSaveError(false);
    try {
      await dispatch(updateStatusQuotePolicy(status.id, policy));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(null);
    }
  }, [dispatch, status.id]);

  const saveDefaultPolicy = useCallback(async(policy: QuoteApprovalPolicy) => {
    setDefaultPolicy(policy);
    setSaving('default');
    setSaveError(false);
    try {
      await dispatch(updateDefaultQuotePolicy(policy));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(null);
    }
  }, [dispatch]);

  const revoke = useCallback(async(quotingStatusId: string) => {
    setRevokingId(quotingStatusId);
    try {
      await dispatch(revokeStatusQuote(status.id, quotingStatusId));
      setQuoteIds(current => current.filter(id => id !== quotingStatusId));
    } finally {
      setRevokingId(undefined);
    }
  }, [dispatch, status.id]);

  const policyOptions = useMemo(() => POLICIES.map(policy => (
    <option key={policy} value={policy}>
      {intl.formatMessage(policy === 'public' ? messages.publicPolicy : policy === 'followers' ? messages.followersPolicy : messages.nobodyPolicy)}
    </option>
  )), [intl]);

  if (!supported || !me || !['public', 'unlisted'].includes(status.visibility)) return null;

  return (
    <section className='mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900' aria-labelledby={\`quote-controls-\${status.id}\`}>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 id={\`quote-controls-\${status.id}\`} className='text-sm font-semibold text-gray-900 dark:text-white'>
          {intl.formatMessage(messages.heading)}
        </h2>
        <button type='button' className='min-h-[44px] rounded-lg px-3 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20' onClick={toggleExpanded} aria-expanded={expanded}>
          {intl.formatMessage(expanded ? messages.hideQuotes : messages.viewQuotes, { count: status.quotes_count || 0 })}
        </button>
      </div>

      {ownStatus && (
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          <label className='text-sm text-gray-700 dark:text-gray-300'>
            <span className='mb-1 block font-medium'>{intl.formatMessage(messages.postPolicy)}</span>
            <select className='min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-slate-800' value={postPolicy} disabled={saving !== null} onChange={event => void savePostPolicy(event.target.value as QuoteApprovalPolicy)}>
              {policyOptions}
            </select>
          </label>
          <label className='text-sm text-gray-700 dark:text-gray-300'>
            <span className='mb-1 block font-medium'>{intl.formatMessage(messages.defaultPolicy)}</span>
            <select className='min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-slate-800' value={defaultPolicy} disabled={saving !== null} onChange={event => void saveDefaultPolicy(event.target.value as QuoteApprovalPolicy)}>
              {policyOptions}
            </select>
          </label>
          {saving && <p className='text-sm text-gray-500' role='status'>{intl.formatMessage(messages.saving)}</p>}
          {saveError && <p className='text-sm text-danger-600' role='alert'>{intl.formatMessage(messages.saveError)}</p>}
        </div>
      )}

      {expanded && (
        <div className='mt-4 space-y-3' aria-live='polite'>
          {loadError && (
            <div className='rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/20 dark:text-danger-300'>
              <p>{intl.formatMessage(messages.loadError)}</p>
              <button type='button' className='mt-2 min-h-[44px] font-medium underline' onClick={() => void loadQuotes()}>{intl.formatMessage(messages.retry)}</button>
            </div>
          )}
          {!loadError && !loading && quoteIds.length === 0 && <p className='text-sm text-gray-500'>{intl.formatMessage(messages.empty)}</p>}
          {quoteIds.map(id => (
            <div key={id} className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
              <StatusContainer id={id} hideActionBar={false} />
              {ownStatus && (
                <div className='mt-2 flex justify-end'>
                  <button type='button' className='min-h-[44px] rounded-lg px-3 text-sm font-medium text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20' disabled={revokingId === id} onClick={() => void revoke(id)}>
                    {intl.formatMessage(revokingId === id ? messages.revoking : messages.revoke)}
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && <p className='text-sm text-gray-500' role='status'>{intl.formatMessage(messages.loading)}</p>}
          {next && !loading && (
            <button type='button' className='min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-slate-800' onClick={() => void loadQuotes({ max_id: new URL(next, window.location.origin).searchParams.get('max_id') }, true)}>
              {intl.formatMessage(messages.loadMore)}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default QuoteControls;
`);

replaceExact(
  'app/soapbox/features/status/index.tsx',
  "import DetailedStatus from './components/detailed-status';\n",
  "import DetailedStatus from './components/detailed-status';\nimport QuoteControls from './components/quote-controls';\n",
);
replaceExact(
  'app/soapbox/features/status/index.tsx',
  `              <StatusActionBar\n                status={actualStatus}\n                onDelete={onDeleteStatus}\n              />`,
  `              <StatusActionBar\n                status={actualStatus}\n                onDelete={onDeleteStatus}\n              />\n              <QuoteControls status={actualStatus} />`,
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
  `    if (actualStatus.quote) {\n      if (actualStatus.pleroma.get('quote_visible', true) === false) {\n        return (\n          <div className='quoted-status-tombstone'>\n            <p><FormattedMessage id='statuses.quote_tombstone' defaultMessage='Post is unavailable.' /></p>\n          </div>\n        );\n      } else {\n        return <QuotedStatus statusId={actualStatus.quote as string} />;\n      }\n    }\n  }, [actualStatus.pleroma, actualStatus.quote]);`,
  `    if (actualStatus.quote) {\n      if (actualStatus.pleroma.get('quote_visible', true) === false) {\n        return (\n          <div className='quoted-status-tombstone rounded-lg border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700'>\n            <p><FormattedMessage id='statuses.quote_tombstone' defaultMessage='Quoted post is unavailable.' /></p>\n          </div>\n        );\n      } else {\n        return <QuotedStatus statusId={actualStatus.quote as string} />;\n      }\n    }\n\n    if (actualStatus.quote_state) {\n      const quoteStateMessages: Record<string, React.ReactNode> = {\n        pending: <FormattedMessage id='statuses.quote_pending' defaultMessage='Quote approval is pending.' />,\n        rejected: <FormattedMessage id='statuses.quote_rejected' defaultMessage='The author did not approve this quote.' />,\n        revoked: <FormattedMessage id='statuses.quote_revoked' defaultMessage='The author revoked this quote.' />,\n        deleted: <FormattedMessage id='statuses.quote_deleted' defaultMessage='The quoted post was deleted.' />,\n        blocked_account: <FormattedMessage id='statuses.quote_blocked_account' defaultMessage='The quoted account is blocked.' />,\n        blocked_domain: <FormattedMessage id='statuses.quote_blocked_domain' defaultMessage='The quoted domain is blocked.' />,\n        muted_account: <FormattedMessage id='statuses.quote_muted_account' defaultMessage='The quoted account is muted.' />,\n        unauthorized: <FormattedMessage id='statuses.quote_unauthorized' defaultMessage='This quoted post is not available to you.' />,\n      };\n      return (\n        <div className='quoted-status-tombstone rounded-lg border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700' role='status'>\n          <p>{quoteStateMessages[actualStatus.quote_state] || quoteStateMessages.unauthorized}</p>\n        </div>\n      );\n    }\n  }, [actualStatus.pleroma, actualStatus.quote, actualStatus.quote_state]);`,
);

replaceExact(
  'app/soapbox/utils/notification.ts',
  `  'update',\n] as const;`,
  `  'update',\n  'quote',\n  'quoted_update',\n] as const;`,
);
replaceExact(
  'app/soapbox/features/notifications/components/notification.tsx',
  `  update: require('@tabler/icons/pencil.svg'),\n};`,
  `  update: require('@tabler/icons/pencil.svg'),\n  quote: require('@tabler/icons/quote.svg'),\n  quoted_update: require('@tabler/icons/quote.svg'),\n};`,
);
replaceExact(
  'app/soapbox/features/notifications/components/notification.tsx',
  `  update: {\n    id: 'notification.update',\n    defaultMessage: '{name} edited a post you interacted with',\n  },\n});`,
  `  update: {\n    id: 'notification.update',\n    defaultMessage: '{name} edited a post you interacted with',\n  },\n  quote: {\n    id: 'notification.quote',\n    defaultMessage: '{name} quoted your post',\n  },\n  quoted_update: {\n    id: 'notification.quoted_update',\n    defaultMessage: 'A post quoted by {name} was updated',\n  },\n});`,
);

replaceExact(
  'docs/architecture/MASTODON_QUOTE_POSTS.md',
  `## Remaining presentation work\n\nThe API, capability, creation, and normalization boundaries are implemented. Later UI slices may add a posting-default quote-policy selector, per-post interaction-policy sheet, quotes-list surface, explicit pending/revoked placeholders, and a one-tap revoke control from quote notifications. They must reuse this authority and preserve fail-closed behavior.`,
  `## Presentation work\n\nThe status detail surface now provides quote listing with pagination, per-post policy controls for the author, account-default quote policy controls, and quote revocation. Timeline rendering presents explicit pending, rejected, revoked, deleted, blocked, muted, and unauthorized states without exposing nested content. Quote and quoted-update notifications have dedicated labels and icons. Quote authoring is disabled when Mastodon reports denied, unknown, or absent authoritative permission metadata.`,
);

write('app/soapbox/features/status/components/__tests__/quote-controls.test.tsx', `import React from 'react';\n\nimport { normalizeMastodonQuoteStatus } from 'soapbox/utils/mastodon-quotes';\n\ndescribe('quote controls contract', () => {\n  it('keeps unavailable quote content fail closed for presentation', () => {\n    const status: any = { quote: { state: 'revoked', quoted_status: { id: 'secret' } } };\n    normalizeMastodonQuoteStatus(status);\n    expect(status.quote).toBeNull();\n    expect(status.quote_state).toBe('revoked');\n  });\n\n  it('exposes accepted quote content to the canonical renderer', () => {\n    const status: any = { quote: { state: 'accepted', quoted_status: { id: 'visible' } } };\n    normalizeMastodonQuoteStatus(status);\n    expect(status.quote.id).toBe('visible');\n  });\n});\n`);
