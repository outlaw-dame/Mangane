import type { AxiosError, AxiosInstance } from 'axios';

export type FeaturedTagSource = 'server' | 'mangane';

export interface FeaturedTagEntity {
  id: string,
  name: string,
  url: string | null,
  statuses_count: string,
  last_status_at: string | null,
  source: FeaturedTagSource,
  federated: boolean,
}

const MAX_FEATURED_TAGS = 10;
const MAX_TAG_LENGTH = 100;
const UNSUPPORTED_STATUSES = new Set([404, 405, 410, 501]);
const TAG_PATTERN = /^[\p{L}\p{M}\p{N}_]+$/u;

const normalizeTagName = (value: string): string => {
  const name = value.trim().replace(/^#+/, '').normalize('NFC');

  if (!name || name.length > MAX_TAG_LENGTH || !TAG_PATTERN.test(name) || /^\p{N}+$/u.test(name)) {
    throw new Error('Invalid hashtag');
  }

  return name;
};

const normalizeServerTag = (tag: Record<string, unknown>): FeaturedTagEntity => ({
  id: String(tag.id ?? tag.name ?? ''),
  name: normalizeTagName(String(tag.name ?? '')),
  url: typeof tag.url === 'string' ? tag.url : null,
  statuses_count: String(tag.statuses_count ?? '0'),
  last_status_at: typeof tag.last_status_at === 'string' ? tag.last_status_at : null,
  source: 'server',
  federated: true,
});

const localTag = (name: string): FeaturedTagEntity => ({
  id: `mangane:${name.toLocaleLowerCase()}`,
  name,
  url: null,
  statuses_count: '0',
  last_status_at: null,
  source: 'mangane',
  federated: false,
});

const normalizeLocalFeaturedTags = (values: unknown): FeaturedTagEntity[] => {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  return values.slice(0, MAX_FEATURED_TAGS).flatMap((value) => {
    if (typeof value !== 'string') return [];
    try {
      const name = normalizeTagName(value);
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) return [];
      seen.add(key);
      return [localTag(name)];
    } catch {
      return [];
    }
  });
};

const isUnsupportedFeaturedTagsError = (error: unknown): boolean => {
  const status = (error as AxiosError | undefined)?.response?.status;
  return typeof status === 'number' && UNSUPPORTED_STATUSES.has(status);
};

const fetchOwnFeaturedTags = async(client: AxiosInstance, localNames: unknown): Promise<FeaturedTagEntity[]> => {
  try {
    const { data } = await client.get('/api/v1/featured_tags');
    if (!Array.isArray(data)) throw new Error('Invalid featured hashtag response');
    return data.map(normalizeServerTag);
  } catch (error) {
    if (!isUnsupportedFeaturedTagsError(error)) throw error;
    return normalizeLocalFeaturedTags(localNames);
  }
};

const fetchAccountFeaturedTags = async(client: AxiosInstance, accountId: string): Promise<FeaturedTagEntity[]> => {
  const { data } = await client.get(`/api/v1/accounts/${encodeURIComponent(accountId)}/featured_tags`);
  if (!Array.isArray(data)) throw new Error('Invalid featured hashtag response');
  return data.map(normalizeServerTag);
};

const fetchFeaturedTagSuggestions = async(client: AxiosInstance): Promise<string[]> => {
  try {
    const { data } = await client.get('/api/v1/featured_tags/suggestions');
    if (!Array.isArray(data)) throw new Error('Invalid featured hashtag suggestion response');
    return data.flatMap((tag) => {
      try {
        return [normalizeTagName(String(tag?.name ?? ''))];
      } catch {
        return [];
      }
    }).slice(0, MAX_FEATURED_TAGS);
  } catch (error) {
    if (!isUnsupportedFeaturedTagsError(error)) throw error;
    return [];
  }
};

const featureTag = async(client: AxiosInstance, nameInput: string, current: FeaturedTagEntity[]): Promise<FeaturedTagEntity[]> => {
  const name = normalizeTagName(nameInput);
  const hasLocalAuthority = current.some(({ source }) => source === 'mangane');

  if (!hasLocalAuthority) {
    try {
      const { data } = await client.post('/api/v1/featured_tags', { name });
      const created = normalizeServerTag(data);
      return [...current.filter(({ name: existing }) => existing.toLocaleLowerCase() !== name.toLocaleLowerCase()), created];
    } catch (error) {
      if (!isUnsupportedFeaturedTagsError(error)) throw error;
    }
  }

  return normalizeLocalFeaturedTags([
    ...current.map(({ name: existing }) => existing).filter((existing) => existing.toLocaleLowerCase() !== name.toLocaleLowerCase()),
    name,
  ]);
};

const unfeatureTag = async(client: AxiosInstance, tag: FeaturedTagEntity, current: FeaturedTagEntity[]): Promise<FeaturedTagEntity[]> => {
  if (tag.source === 'server') {
    await client.delete(`/api/v1/featured_tags/${encodeURIComponent(tag.id)}`);
    return current.filter(({ id }) => id !== tag.id);
  }

  return normalizeLocalFeaturedTags(current.map(({ name }) => name).filter((name) => name.toLocaleLowerCase() !== tag.name.toLocaleLowerCase()));
};

export {
  MAX_FEATURED_TAGS,
  featureTag,
  fetchAccountFeaturedTags,
  fetchFeaturedTagSuggestions,
  fetchOwnFeaturedTags,
  isUnsupportedFeaturedTagsError,
  normalizeLocalFeaturedTags,
  normalizeTagName,
  unfeatureTag,
};
