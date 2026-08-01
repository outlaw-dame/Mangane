import type { Status } from 'soapbox/types/entities';

export type QuoteApprovalPolicy = 'public' | 'followers' | 'nobody';
export type QuoteState =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'revoked'
  | 'deleted'
  | 'unauthorized'
  | 'blocked_account'
  | 'blocked_domain'
  | 'muted_account';

const KNOWN_STATES = new Set<QuoteState>([
  'pending',
  'accepted',
  'rejected',
  'revoked',
  'deleted',
  'unauthorized',
  'blocked_account',
  'blocked_domain',
  'muted_account',
]);

const getValue = (value: any, key: string): any => value?.get?.(key) ?? value?.[key];

const asApiVersion = (instance: any): number => {
  const value = instance?.api_versions?.mastodon ?? instance?.getIn?.(['api_versions', 'mastodon']);
  const version = Number(value);
  return Number.isFinite(version) ? version : 0;
};

export const supportsMastodonQuotePosts = (instance: any): boolean => asApiVersion(instance) >= 7;

const normalizeQuoteState = (value: unknown): QuoteState => {
  return typeof value === 'string' && KNOWN_STATES.has(value as QuoteState)
    ? value as QuoteState
    : 'unauthorized';
};

/**
 * Convert Mastodon's consent-aware Quote wrapper into Mangane's existing
 * quoted-status reference while retaining the authorization state.
 */
export const normalizeMastodonQuoteStatus = (status: Record<string, any>): Record<string, any> => {
  if (!status || typeof status !== 'object') return status;

  const quote = status.quote;
  if (!quote || typeof quote !== 'object' || (
    !Object.prototype.hasOwnProperty.call(quote, 'state')
    && !Object.prototype.hasOwnProperty.call(quote, 'quoted_status')
  )) {
    return status;
  }

  const state = normalizeQuoteState(quote.state);
  const quotedStatus = quote.quoted_status;

  status.quote_state = state;
  status.quoted_status_id = typeof quote.quoted_status_id === 'string'
    ? quote.quoted_status_id
    : quotedStatus?.id ?? null;

  // Only accepted quotes are exposed through the canonical quote relation.
  // Blocked, muted, pending, revoked, unknown, and deleted states fail closed.
  status.quote = state === 'accepted' && quotedStatus?.id ? quotedStatus : null;

  return status;
};

const collectionSize = (value: any): number => {
  if (Array.isArray(value)) return value.length;
  if (typeof value?.size === 'number') return value.size;
  return 0;
};

export class QuotePostValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'QuotePostValidationError';
    this.code = code;
  }
}

/** Convert the inherited quote_id field to Mastodon's API-v7 field. */
export const normalizeQuoteCreateParams = (
  params: Record<string, any>,
  instance: any,
  editing = false,
): Record<string, any> => {
  const normalized = { ...params };

  if (editing) {
    delete normalized.quote_id;
    delete normalized.quoted_status_id;
    return normalized;
  }

  if (!normalized.quote_id || !supportsMastodonQuotePosts(instance)) return normalized;

  if (collectionSize(normalized.media_ids) > 0) {
    throw new QuotePostValidationError(
      'quote_media_unsupported',
      'Mastodon quote posts cannot include media attachments.',
    );
  }

  if (normalized.poll) {
    throw new QuotePostValidationError(
      'quote_poll_unsupported',
      'Mastodon quote posts cannot include polls.',
    );
  }

  normalized.quoted_status_id = String(normalized.quote_id);
  delete normalized.quote_id;
  return normalized;
};

export interface QuotePermission {
  allowed: boolean,
  approval: 'automatic' | 'manual' | 'denied' | 'unknown' | 'legacy',
}

export const getQuotePermission = (
  status: Status | Record<string, any>,
  strictMastodonPolicy = false,
): QuotePermission => {
  const approval = getValue(status, 'quote_approval');
  const currentUser = getValue(approval, 'current_user');

  if (currentUser === 'automatic' || currentUser === 'manual') {
    return { allowed: true, approval: currentUser };
  }

  if (currentUser === 'denied' || currentUser === 'unknown') {
    return { allowed: false, approval: currentUser };
  }

  return strictMastodonPolicy
    ? { allowed: false, approval: 'unknown' }
    : { allowed: true, approval: 'legacy' };
};
