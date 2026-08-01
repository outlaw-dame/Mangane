import api, { getNextLink } from 'soapbox/api';
import { importFetchedAccount, importFetchedStatus, importFetchedStatuses } from 'soapbox/actions/importer';

import type { AppDispatch, RootState } from 'soapbox/store';
import type { APIEntity } from 'soapbox/types/entities';
import type { QuoteApprovalPolicy } from 'soapbox/utils/mastodon-quotes';

const assertPolicy = (policy: string): QuoteApprovalPolicy => {
  if (policy !== 'public' && policy !== 'followers' && policy !== 'nobody') {
    throw new TypeError('Invalid quote approval policy');
  }
  return policy;
};

export const fetchStatusQuotes = (statusId: string, params: Record<string, any> = {}) =>
  async(dispatch: AppDispatch, getState: () => RootState) => {
    const response = await api(getState).get(
      `/api/v1/statuses/${encodeURIComponent(statusId)}/quotes`,
      { params },
    );
    const statuses = Array.isArray(response.data) ? response.data : [];
    dispatch(importFetchedStatuses(statuses));
    return { statuses, next: getNextLink(response) };
  };

export const revokeStatusQuote = (statusId: string, quotingStatusId: string) =>
  async(dispatch: AppDispatch, getState: () => RootState): Promise<APIEntity> => {
    const { data } = await api(getState).post(
      `/api/v1/statuses/${encodeURIComponent(statusId)}/quotes/${encodeURIComponent(quotingStatusId)}/revoke`,
    );
    dispatch(importFetchedStatus(data));
    return data;
  };

export const updateStatusQuotePolicy = (statusId: string, policy: QuoteApprovalPolicy) =>
  async(dispatch: AppDispatch, getState: () => RootState): Promise<APIEntity> => {
    const form = new FormData();
    form.append('quote_approval_policy', assertPolicy(policy));

    const { data } = await api(getState).put(
      `/api/v1/statuses/${encodeURIComponent(statusId)}/interaction_policy`,
      form,
    );
    dispatch(importFetchedStatus(data));
    return data;
  };

export const updateDefaultQuotePolicy = (policy: QuoteApprovalPolicy) =>
  async(dispatch: AppDispatch, getState: () => RootState): Promise<APIEntity> => {
    const form = new FormData();
    form.append('source[quote_policy]', assertPolicy(policy));

    const { data } = await api(getState).patch('/api/v1/accounts/update_credentials', form);
    dispatch(importFetchedAccount(data));
    return data;
  };

export const fetchQuotePreferences = () =>
  async(_dispatch: AppDispatch, getState: () => RootState): Promise<Record<string, any>> => {
    const { data } = await api(getState).get('/api/v1/preferences');
    return data;
  };
