import { resolveCreatorAttribution } from '../embed-creator';

describe('resolveCreatorAttribution', () => {
  it('links same-origin Fediverse creator metadata', () => {
    expect(resolveCreatorAttribution({
      authorName: 'Alice',
      authorUrl: 'https://video.example/@alice',
      pageUrl: 'https://video.example/w/123',
      providerUrl: 'https://video.example',
    })).toEqual({
      name: 'Alice',
      url: 'https://video.example/@alice',
      proof: 'linked-metadata',
    });
  });

  it('accepts trusted YouTube host-family creator links', () => {
    expect(resolveCreatorAttribution({
      authorName: 'Example Channel',
      authorUrl: 'https://www.youtube.com/@example',
      pageUrl: 'https://youtu.be/abc123',
      providerUrl: 'https://www.youtube.com/',
    })?.proof).toBe('linked-metadata');
  });

  it('keeps untrusted cross-origin creator metadata unlinked', () => {
    expect(resolveCreatorAttribution({
      authorName: 'Impersonated Creator',
      authorUrl: 'https://attacker.example/profile',
      pageUrl: 'https://video.example/w/123',
      providerUrl: 'https://video.example',
    })).toEqual({
      name: 'Impersonated Creator',
      url: null,
      proof: 'name-only-metadata',
    });
  });

  it('rejects unsafe URLs and control-only names', () => {
    expect(resolveCreatorAttribution({
      authorName: '\u0000\u0007',
      authorUrl: 'javascript:alert(1)',
      pageUrl: 'https://video.example/w/123',
    })).toBeNull();
  });

  it('bounds and normalizes creator names', () => {
    const result = resolveCreatorAttribution({
      authorName: `  ${'A'.repeat(200)}  `,
      pageUrl: 'https://video.example/w/123',
    });
    expect(result?.name).toHaveLength(120);
    expect(result?.proof).toBe('name-only-metadata');
  });
});
