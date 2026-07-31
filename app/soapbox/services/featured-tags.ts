import type { AxiosInstance, AxiosError } from 'axios';

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

interface StoredFeaturedTags {
  version: 1,
  tags: string[],
}

const MAX_FEATURED_TAGS = 10;
const MAX_TAG_LENGTH = 100;
const STORAGE_PREFIX = 'mangane:featured-tags:v1:';
const UNSUPPORTED_STATUSES = new Set([404, 405, 410, 501]);
const TAG_PATTERN = /^[\p{L}\p{M}\p{N}_]+$/u;

const normalizeTagName = (value: string): string => {
  const name = value.trim().replace(/^#+/, '').normalize('NFC');

  if (!name || name.length > MAX_TAG_LENGTH || !TAG_PATTERN.test(name) || /^\p{N}+$/u.test(name)) {
    throw new Error('Invalid hashtag');
  }

  return name;
};

const storageKey = (accountScope: string): string => `${STORAGE_PREFIX}${encodeURIComponent(accountScope)}`;

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

const isUnsupportedFeaturedTagsError = (error: unknown): boolean => {
  const status = (error as AxiosError | undefined)?.response?.status;
  return typeof status === 'number' && UNSUPPORTED_STATUSES.has(status);
};

const readLocalFeaturedTags = (accountScope: string): FeaturedTagEntity[] => {
  try {
    const raw = localStorage.getItem(storageKey(accountScope));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<StoredFeaturedTags>;
    if (parsed.version !== 1 || !Array.isArray(parsed.tags)) return [];

    const seen = new Set<string>();
    return parsed.tags.slice(0, MAX_FEATURED_TAGS).flatMap((value) => {
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
  } catch {
    return [];
  }
};

const writeLocalFeaturedTags = (accountScope: string, tags: FeaturedTagEntity[]): FeaturedTagEntity[] => {
  const normalized = tags.slice(0, MAX_FEATURED_TAGS).map(({ name }) => normalizeTagName(name));
  const value: StoredFeaturedTags = { version: 1, tags: normalized };
  localStorage.setItem(storageKey(accountScope), JSON.stringify(value));
  return normalized.map(localTag);
};

const fetchOwnFeaturedTags = async(client: AxiosInstance, accountScope: string): Promise<FeaturedTagEntity[]> => {
  try {
    const { data } = await client.get('/api/v1/featured_tags');
    if (!Array.isArray(data)) throw new Error('Invalid featured hashtag response');
    return data.map(normalizeServerTag);
  } catch (error) {
    if (!isUnsupportedFeaturedTagsError(error)) throw error;
    return readLocalFeaturedTags(accountScope);
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

const featureTag = async(
  client: AxiosInstance,
  accountScope: string,
  nameInput: string,
  current: FeaturedTagEntity[],
): Promise<FeaturedTagEntity[]> => {
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

  const next = [...current.filter(({ name: existing }) => existing.toLocaleLowerCase() !== name.toLocaleLowerCase()), localTag(name)];
  return writeLocalFeaturedTags(accountScope, next);
};

const unfeatureTag = async(
  client: AxiosInstance,
  accountScope: string,
  tag: FeaturedTagEntity,
  current: FeaturedTagEntity[],
): Promise<FeaturedTagEntity[]> => {
  if (tag.source === 'server') {
    await client.delete(`/api/v1/featured_tags/${encodeURIComponent(tag.id)}`);
    return current.filter(({ id }) => id !== tag.id);
  }

  return writeLocalFeaturedTags(accountScope, current.filter(({ name }) => name.toLocaleLowerCase() !== tag.name.toLocaleLowerCase()));
};

export {
  MAX_FEATURED_TAGS,
  featureTag,
  fetchAccountFeaturedTags,
  fetchFeaturedTagSuggestions,
  fetchOwnFeaturedTags,
  isUnsupportedFeaturedTagsError,
  normalizeTagName,
  readLocalFeaturedTags,
  unfeatureTag,
};
