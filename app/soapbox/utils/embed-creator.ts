import { sanitizeUrl } from 'soapbox/utils/url-policy';

export type CreatorAttribution = {
  name: string,
  url: string | null,
  proof: 'linked-metadata' | 'name-only-metadata',
};

type CreatorInput = {
  authorName?: unknown,
  authorUrl?: unknown,
  pageUrl?: string | null,
  providerUrl?: unknown,
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const MAX_CREATOR_NAME_LENGTH = 120;

const normalizeName = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARACTERS, '').replace(/\s+/g, ' ').trim().slice(0, MAX_CREATOR_NAME_LENGTH);
};

const trustedHostFamily = (hostname: string): string | null => {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') return 'youtube';
  if (host === 'vimeo.com' || host === 'player.vimeo.com') return 'vimeo';
  return null;
};

const sharesCreatorAuthority = (candidate: URL, page: URL | null, provider: URL | null): boolean => {
  for (const authority of [page, provider]) {
    if (!authority) continue;
    if (candidate.origin === authority.origin) return true;
    const candidateFamily = trustedHostFamily(candidate.hostname);
    if (candidateFamily && candidateFamily === trustedHostFamily(authority.hostname)) return true;
  }
  return false;
};

const parseSafeHttpsUrl = (value: unknown): URL | null => {
  if (typeof value !== 'string') return null;
  const safe = sanitizeUrl(value);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

/**
 * Resolve creator attribution from normalized preview-card metadata.
 *
 * A creator link is only exposed when its origin matches the canonical page or
 * provider authority. Name-only metadata is still displayed, but deliberately
 * remains unlinked and is not presented as a verified account relationship.
 */
export const resolveCreatorAttribution = ({
  authorName,
  authorUrl,
  pageUrl,
  providerUrl,
}: CreatorInput): CreatorAttribution | null => {
  const name = normalizeName(authorName);
  if (!name) return null;

  const candidate = parseSafeHttpsUrl(authorUrl);
  const page = parseSafeHttpsUrl(pageUrl);
  const provider = parseSafeHttpsUrl(providerUrl);

  if (candidate && sharesCreatorAuthority(candidate, page, provider)) {
    return { name, url: candidate.toString(), proof: 'linked-metadata' };
  }

  return { name, url: null, proof: 'name-only-metadata' };
};
