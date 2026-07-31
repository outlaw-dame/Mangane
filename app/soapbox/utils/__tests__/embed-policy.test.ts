import { resolveSafeEmbed } from '../embed-policy';

describe('embed policy', () => {
  it('accepts privacy-enhanced YouTube embeds', () => {
    expect(resolveSafeEmbed({
      embedUrl: 'https://www.youtube-nocookie.com/embed/abc123',
      pageUrl: 'https://www.youtube.com/watch?v=abc123',
      providerName: 'YouTube',
      title: 'Video',
    })).toEqual(expect.objectContaining({ provider: 'youtube' }));
  });

  it('accepts same-origin PeerTube embeds', () => {
    expect(resolveSafeEmbed({
      embedUrl: 'https://video.example/videos/embed/abc',
      pageUrl: 'https://video.example/w/abc',
      providerName: 'PeerTube',
      title: 'Video',
    })).toEqual(expect.objectContaining({ provider: 'peertube' }));
  });

  it('rejects insecure and cross-origin unknown embeds', () => {
    expect(resolveSafeEmbed({ embedUrl: 'http://evil.example/embed/1', pageUrl: 'https://example.com/post/1', providerName: 'Unknown', title: '' })).toBeNull();
    expect(resolveSafeEmbed({ embedUrl: 'https://evil.example/embed/1', pageUrl: 'https://example.com/post/1', providerName: 'Mastodon', title: '' })).toBeNull();
  });
});
