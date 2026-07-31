import type { AxiosInstance } from 'axios';

export type DiscoveryPackProvider = 'mastodon' | 'pixelfed' | 'loops';

export interface DiscoveryPackAccount {
  id: string,
  acct: string,
  displayName: string,
  avatar: string | null,
  state: 'accepted' | 'pending' | 'rejected' | 'unknown',
  itemId: string | null,
}

export interface DiscoveryPack {
  id: string,
  provider: DiscoveryPackProvider,
  ownerId: string | null,
  url: string | null,
  name: string,
  description: string,
  language: string | null,
  sensitive: boolean,
  discoverable: boolean,
  topic: string | null,
  itemCount: number,
  accounts: DiscoveryPackAccount[],
  canApplyAll: boolean,
  isOwner: boolean,
}

export interface DiscoveryPackInput {
  name: string,
  description?: string,
  language?: string | null,
  sensitive?: boolean,
  discoverable?: boolean,
  topic?: string | null,
  accountIds?: string[],
}

const MAX_ACCOUNTS = 25;
const MAX_NAME = 50;
const MAX_DESCRIPTION = 500;
const UNSUPPORTED = new Set([404, 405, 410, 501]);

const asString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const asBoolean = (value: unknown, fallback = false): boolean => typeof value === 'boolean' ? value : fallback;
const asNumber = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;

const validateInput = (input: DiscoveryPackInput): DiscoveryPackInput => {
  const name = input.name.trim();
  const description = (input.description || '').trim();
  const accountIds = [...new Set((input.accountIds || []).map(String))];

  if (!name || name.length > MAX_NAME) throw new Error('Invalid collection name');
  if (description.length > MAX_DESCRIPTION) throw new Error('Invalid collection description');
  if (accountIds.length > MAX_ACCOUNTS) throw new Error('A collection can contain at most 25 accounts');

  return { ...input, name, description, accountIds };
};

const normalizeAccount = (raw: any, state: DiscoveryPackAccount['state'] = 'unknown', itemId: string | null = null): DiscoveryPackAccount => ({
  id: asString(raw?.id ?? raw?.profile_id),
  acct: asString(raw?.acct ?? raw?.username),
  displayName: asString(raw?.display_name ?? raw?.name ?? raw?.username),
  avatar: asString(raw?.avatar ?? raw?.avatar_static) || null,
  state,
  itemId,
});

const normalizeMastodonCollection = (raw: any, accounts: any[] = []): DiscoveryPack => ({
  id: asString(raw?.id),
  provider: 'mastodon',
  ownerId: asString(raw?.account_id) || null,
  url: asString(raw?.url) || null,
  name: asString(raw?.name),
  description: asString(raw?.description),
  language: asString(raw?.language) || null,
  sensitive: asBoolean(raw?.sensitive),
  discoverable: asBoolean(raw?.discoverable, true),
  topic: asString(raw?.tag?.name) || null,
  itemCount: asNumber(raw?.item_count, accounts.length),
  accounts: accounts.slice(0, MAX_ACCOUNTS).map((account) => normalizeAccount(account)),
  canApplyAll: false,
  isOwner: false,
});

const normalizeLoopsKit = (raw: any, accounts: any[] = []): DiscoveryPack => ({
  id: asString(raw?.id),
  provider: 'loops',
  ownerId: asString(raw?.creator?.id) || null,
  url: asString(raw?.url ?? raw?.remote_url) || null,
  name: asString(raw?.title),
  description: asString(raw?.description),
  language: null,
  sensitive: asBoolean(raw?.is_sensitive),
  discoverable: asBoolean(raw?.is_discoverable, true),
  topic: Array.isArray(raw?.hashtags) ? asString(raw.hashtags[0]) || null : null,
  itemCount: asNumber(raw?.approved_accounts ?? raw?.total_accounts, accounts.length),
  accounts: accounts.slice(0, MAX_ACCOUNTS).map((account) => normalizeAccount(account)),
  canApplyAll: true,
  isOwner: Boolean(raw?.is_owner),
});

const normalizePixelfedKit = (raw: any): DiscoveryPack => ({
  id: asString(raw?.id ?? raw?.slug),
  provider: 'pixelfed',
  ownerId: asString(raw?.creator_id) || null,
  url: asString(raw?.url) || null,
  name: asString(raw?.name ?? raw?.title),
  description: asString(raw?.description),
  language: asString(raw?.language) || null,
  sensitive: asBoolean(raw?.sensitive),
  discoverable: asBoolean(raw?.discoverable, true),
  topic: asString(raw?.topic ?? raw?.tag) || null,
  itemCount: asNumber(raw?.item_count ?? raw?.accounts?.length),
  accounts: Array.isArray(raw?.accounts) ? raw.accounts.slice(0, MAX_ACCOUNTS).map((account: any) => normalizeAccount(account)) : [],
  // Pixelfed deployments do not yet expose one verified, stable apply contract.
  canApplyAll: false,
  isOwner: Boolean(raw?.is_owner),
});

const isUnsupported = (error: any): boolean => UNSUPPORTED.has(error?.response?.status);

export const supportsMastodonCollections = (instance: any): boolean => asNumber(instance?.api_versions?.mastodon ?? instance?.getIn?.(['api_versions', 'mastodon'])) >= 10;

export const fetchMastodonCollections = async(client: AxiosInstance, accountId: string): Promise<DiscoveryPack[]> => {
  const { data } = await client.get(`/api/v1/accounts/${encodeURIComponent(accountId)}/collections`);
  const collections = Array.isArray(data?.collections) ? data.collections : Array.isArray(data) ? data : [];
  return collections.map((collection: any) => normalizeMastodonCollection(collection, collection.accounts));
};

export const fetchMastodonCollection = async(client: AxiosInstance, id: string): Promise<DiscoveryPack> => {
  const { data } = await client.get(`/api/v1/collections/${encodeURIComponent(id)}`);
  return normalizeMastodonCollection(data?.collection ?? data, data?.accounts ?? []);
};

export const createMastodonCollection = async(client: AxiosInstance, value: DiscoveryPackInput): Promise<DiscoveryPack> => {
  const input = validateInput(value);
  const { data } = await client.post('/api/v1/collections', {
    name: input.name,
    description: input.description,
    language: input.language || undefined,
    sensitive: Boolean(input.sensitive),
    discoverable: input.discoverable !== false,
    tag_name: input.topic || undefined,
    account_ids: input.accountIds,
  });
  return normalizeMastodonCollection(data?.collection ?? data, data?.accounts ?? []);
};

export const updateMastodonCollection = async(client: AxiosInstance, id: string, value: DiscoveryPackInput): Promise<DiscoveryPack> => {
  const input = validateInput(value);
  const { data } = await client.patch(`/api/v1/collections/${encodeURIComponent(id)}`, {
    name: input.name,
    description: input.description,
    language: input.language || undefined,
    sensitive: Boolean(input.sensitive),
    discoverable: input.discoverable !== false,
    tag_name: input.topic || undefined,
  });
  return normalizeMastodonCollection(data?.collection ?? data, data?.accounts ?? []);
};

export const deleteMastodonCollection = async(client: AxiosInstance, id: string): Promise<void> => {
  await client.delete(`/api/v1/collections/${encodeURIComponent(id)}`);
};

export const addMastodonCollectionAccount = async(client: AxiosInstance, id: string, accountId: string): Promise<void> => {
  await client.post(`/api/v1/collections/${encodeURIComponent(id)}/items`, { account_id: accountId });
};

export const removeMastodonCollectionAccount = async(client: AxiosInstance, id: string, itemId: string): Promise<void> => {
  await client.delete(`/api/v1/collections/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`);
};

export const revokeMastodonCollectionInclusion = async(client: AxiosInstance, id: string, itemId: string): Promise<void> => {
  await client.post(`/api/v1/collections/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}/revoke`);
};

export const fetchLoopsStarterKits = async(client: AxiosInstance): Promise<DiscoveryPack[]> => {
  const { data } = await client.get('/api/v1/starter-kits/my-kits');
  return (Array.isArray(data?.data) ? data.data : []).map((kit: any) => normalizeLoopsKit(kit));
};

export const fetchLoopsStarterKit = async(client: AxiosInstance, id: string): Promise<DiscoveryPack> => {
  const [{ data: detail }, { data: accounts }] = await Promise.all([
    client.get(`/api/v1/starter-kits/details/${encodeURIComponent(id)}`),
    client.get(`/api/v1/starter-kits/details/${encodeURIComponent(id)}/accounts`),
  ]);
  return normalizeLoopsKit(detail?.data ?? detail, accounts?.data ?? accounts ?? []);
};

export const applyLoopsStarterKit = async(client: AxiosInstance, id: string): Promise<{ followed: number, alreadyFollowing: number }> => {
  const { data } = await client.post(`/api/v1/starter-kits/details/${encodeURIComponent(id)}/use`);
  return { followed: asNumber(data?.followed_count), alreadyFollowing: asNumber(data?.already_following_count) };
};

export const fetchPixelfedStarterKits = async(client: AxiosInstance): Promise<DiscoveryPack[]> => {
  try {
    const { data } = await client.get('/api/v1/starter-kits');
    const kits = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return kits.map(normalizePixelfedKit);
  } catch (error) {
    if (!isUnsupported(error)) throw error;
    return [];
  }
};

export { MAX_ACCOUNTS, MAX_DESCRIPTION, MAX_NAME, isUnsupported as isUnsupportedDiscoveryPackError, validateInput as validateDiscoveryPackInput };
