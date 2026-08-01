import {
  QuotePostValidationError,
  getQuotePermission,
  normalizeMastodonQuoteStatus,
  normalizeQuoteCreateParams,
  supportsMastodonQuotePosts,
} from '../mastodon-quotes';

const instance = (version: number) => ({ api_versions: { mastodon: version } });

describe('Mastodon quote posts', () => {
  it('detects Mastodon API version 7', () => {
    expect(supportsMastodonQuotePosts(instance(7))).toBe(true);
    expect(supportsMastodonQuotePosts(instance(6))).toBe(false);
  });

  it('converts quote_id to quoted_status_id', () => {
    expect(normalizeQuoteCreateParams({ status: 'Comment', quote_id: '42' }, instance(7))).toEqual({
      status: 'Comment',
      quoted_status_id: '42',
    });
  });

  it('keeps quote_id for legacy implementations', () => {
    expect(normalizeQuoteCreateParams({ status: 'Comment', quote_id: '42' }, instance(6))).toEqual({
      status: 'Comment',
      quote_id: '42',
    });
  });

  it('does not attempt to change a quote while editing', () => {
    expect(normalizeQuoteCreateParams({ status: 'Edit', quote_id: '42' }, instance(7), true)).toEqual({ status: 'Edit' });
  });

  it('rejects Mastodon quotes with media or polls', () => {
    expect(() => normalizeQuoteCreateParams({ quote_id: '42', media_ids: ['1'] }, instance(7))).toThrow(QuotePostValidationError);
    expect(() => normalizeQuoteCreateParams({ quote_id: '42', poll: { options: ['a', 'b'] } }, instance(7))).toThrow(QuotePostValidationError);
  });

  it('normalizes accepted Mastodon quote wrappers', () => {
    const quoted = { id: 'quoted', account: { id: 'account' } };
    const status: any = { quote: { state: 'accepted', quoted_status: quoted } };
    normalizeMastodonQuoteStatus(status);
    expect(status.quote).toBe(quoted);
    expect(status.quote_state).toBe('accepted');
    expect(status.quoted_status_id).toBe('quoted');
  });

  it.each(['pending', 'rejected', 'revoked', 'deleted', 'unauthorized', 'blocked_account', 'blocked_domain', 'muted_account'])(
    'does not expose quoted content in %s state',
    (state) => {
      const status: any = { quote: { state, quoted_status: { id: 'quoted' } } };
      normalizeMastodonQuoteStatus(status);
      expect(status.quote).toBeNull();
      expect(status.quote_state).toBe(state);
    },
  );

  it('fails closed on unknown quote states and policies', () => {
    const status: any = { quote: { state: 'future-state', quoted_status: { id: 'quoted' } } };
    normalizeMastodonQuoteStatus(status);
    expect(status.quote).toBeNull();
    expect(status.quote_state).toBe('unauthorized');
    expect(getQuotePermission({ quote_approval: { current_user: 'unknown' } }, true).allowed).toBe(false);
    expect(getQuotePermission({}, true).allowed).toBe(false);
  });

  it('allows automatic and manual approval states', () => {
    expect(getQuotePermission({ quote_approval: { current_user: 'automatic' } }, true)).toEqual({ allowed: true, approval: 'automatic' });
    expect(getQuotePermission({ quote_approval: { current_user: 'manual' } }, true)).toEqual({ allowed: true, approval: 'manual' });
  });
});
