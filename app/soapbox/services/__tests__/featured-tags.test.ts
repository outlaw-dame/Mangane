import MockAdapter from 'axios-mock-adapter';

import { baseClient } from 'soapbox/api';

import {
  featureTag,
  fetchAccountFeaturedTags,
  fetchOwnFeaturedTags,
  normalizeLocalFeaturedTags,
  normalizeTagName,
  unfeatureTag,
} from '../featured-tags';

describe('featured hashtag service', () => {
  it('normalizes valid hashtag names and rejects unsafe input', () => {
    expect(normalizeTagName('##Café')).toBe('Café');
    expect(() => normalizeTagName('two words')).toThrow('Invalid hashtag');
    expect(() => normalizeTagName('1234')).toThrow('Invalid hashtag');
  });

  it('preserves server tags and merges distinct Mangane-managed tags', async() => {
    const client = baseClient();
    const mock = new MockAdapter(client);
    mock.onGet('/api/v1/featured_tags').reply(200, [{ id: '1', name: 'Cats', url: 'https://example.com/@alice/tagged/Cats', statuses_count: '4', last_status_at: null }]);

    await expect(fetchOwnFeaturedTags(client, ['LocalOnly', 'cats'])).resolves.toEqual([
      expect.objectContaining({ id: '1', name: 'Cats', source: 'server', federated: true }),
      expect.objectContaining({ name: 'LocalOnly', source: 'mangane', federated: false }),
    ]);
  });

  it('uses validated Mangane settings when the endpoint is unsupported', async() => {
    const client = baseClient();
    const mock = new MockAdapter(client);
    mock.onGet('/api/v1/featured_tags').reply(404);

    await expect(fetchOwnFeaturedTags(client, ['Art', 'art', 'two words', 3])).resolves.toEqual([
      expect.objectContaining({ name: 'Art', source: 'mangane', federated: false }),
    ]);
  });

  it('keeps server tags server-owned when POST falls back locally', async() => {
    const client = baseClient();
    const mock = new MockAdapter(client);
    mock.onPost('/api/v1/featured_tags').reply(405);
    const current = [{
      id: '1',
      name: 'Cats',
      url: 'https://example.com/@alice/tagged/Cats',
      statuses_count: '4',
      last_status_at: null,
      source: 'server' as const,
      federated: true,
    }];

    await expect(featureTag(client, 'Art', current)).resolves.toEqual([
      expect.objectContaining({ id: '1', name: 'Cats', source: 'server', federated: true }),
      expect.objectContaining({ name: 'Art', source: 'mangane', federated: false }),
    ]);
  });

  it('falls back to Mangane tags when adding through an unsupported server', async() => {
    const client = baseClient();
    const mock = new MockAdapter(client);
    mock.onPost('/api/v1/featured_tags').reply(404);

    await expect(featureTag(client, 'Art', [])).resolves.toEqual([
      expect.objectContaining({ name: 'Art', source: 'mangane', federated: false }),
    ]);
  });

  it('removes local tags without calling the server or dropping server tags', async() => {
    const client = baseClient();
    const mock = new MockAdapter(client);
    const local = normalizeLocalFeaturedTags(['Design'])[0];
    const server = {
      id: '1',
      name: 'Cats',
      url: null,
      statuses_count: '4',
      last_status_at: null,
      source: 'server' as const,
      federated: true,
    };

    await expect(unfeatureTag(client, local, [server, local])).resolves.toEqual([server]);
    expect(mock.history.delete).toHaveLength(0);
  });

  it('loads another account featured tags only from the public server endpoint', async() => {
    const client = baseClient();
    const mock = new MockAdapter(client);
    mock.onGet('/api/v1/accounts/42/featured_tags').reply(200, [{ id: '9', name: 'Music', statuses_count: 2 }]);

    await expect(fetchAccountFeaturedTags(client, '42')).resolves.toEqual([
      expect.objectContaining({ name: 'Music', source: 'server', federated: true }),
    ]);
  });
});
