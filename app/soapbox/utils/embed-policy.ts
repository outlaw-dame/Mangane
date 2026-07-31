export type EmbedProvider = 'youtube' | 'vimeo' | 'peertube' | 'mastodon' | 'pixelfed' | 'loops' | 'fediverse' | 'unknown';

export interface SafeEmbed {
  provider: EmbedProvider,
  src: string,
  title: string,
  allow: string,
}

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com']);
const VIMEO_HOSTS = new Set(['player.vimeo.com']);
const FEDIVERSE_PROVIDERS = new Map<string, EmbedProvider>([
  ['mastodon', 'mastodon'],
  ['pixelfed', 'pixelfed'],
  ['loops', 'loops'],
  ['peertube', 'peertube'],
]);

const parseHttps = (value: string | null | undefined): URL | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

const providerFromName = (name: string): EmbedProvider => {
  const normalized = name.toLocaleLowerCase();
  for (const [needle, provider] of FEDIVERSE_PROVIDERS) {
    if (normalized.includes(needle)) return provider;
  }
  return 'unknown';
};

export const resolveSafeEmbed = ({
  embedUrl,
  pageUrl,
  providerName,
  title,
}: {
  embedUrl: string | null | undefined,
  pageUrl: string | null | undefined,
  providerName: string | null | undefined,
  title: string | null | undefined,
}): SafeEmbed | null => {
  const embed = parseHttps(embedUrl);
  const page = parseHttps(pageUrl);
  if (!embed) return null;

  let provider: EmbedProvider = 'unknown';
  if (YOUTUBE_HOSTS.has(embed.hostname)) provider = 'youtube';
  else if (VIMEO_HOSTS.has(embed.hostname)) provider = 'vimeo';
  else {
    const namedProvider = providerFromName(providerName || '');
    const sameOrigin = Boolean(page && page.origin === embed.origin);
    if (sameOrigin && namedProvider !== 'unknown') provider = namedProvider;
    else if (sameOrigin && /\/(?:embed|videos\/embed|media|p)\//i.test(embed.pathname)) provider = 'fediverse';
  }

  if (provider === 'unknown') return null;

  return {
    provider,
    src: embed.toString(),
    title: title?.trim() || `${provider} embedded content`,
    allow: 'accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture; web-share',
  };
};

export const embedProviderLabel = (provider: EmbedProvider): string => {
  switch (provider) {
    case 'youtube': return 'YouTube';
    case 'vimeo': return 'Vimeo';
    case 'peertube': return 'PeerTube';
    case 'mastodon': return 'Mastodon';
    case 'pixelfed': return 'Pixelfed';
    case 'loops': return 'Loops';
    case 'fediverse': return 'Fediverse';
    default: return 'External';
  }
};
