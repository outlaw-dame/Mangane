import classnames from 'classnames';
import { List as ImmutableList } from 'immutable';
import React, { useState } from 'react';

import Blurhash from 'soapbox/components/blurhash';
import Icon from 'soapbox/components/icon';
import SemanticIcon from 'soapbox/components/ui/icon/semantic-icon';
import { HStack, Stack, Text } from 'soapbox/components/ui';
import { normalizeAttachment } from 'soapbox/normalizers';
import { resolveCreatorAttribution } from 'soapbox/utils/embed-creator';
import { embedProviderLabel, resolveSafeEmbed } from 'soapbox/utils/embed-policy';
import { sanitizeUrl } from 'soapbox/utils/url-policy';

import type { Card as CardEntity, Attachment } from 'soapbox/types/entities';

const trim = (text: string, len: number): string => {
  const cut = text.indexOf(' ', len);
  if (cut === -1) return text;
  return text.substring(0, cut) + (text.length > len ? '…' : '');
};

interface ICard {
  card: CardEntity,
  maxTitle?: number,
  maxDescription?: number,
  onOpenMedia: (attachments: ImmutableList<Attachment>, index: number) => void,
  compact?: boolean,
  defaultWidth?: number,
  cacheWidth?: (width: number) => void,
  horizontal?: boolean,
}

const Card: React.FC<ICard> = ({
  card,
  defaultWidth = 467,
  maxTitle = 120,
  maxDescription = 200,
  compact = false,
  cacheWidth,
  onOpenMedia,
  horizontal,
}): JSX.Element => {
  const [width, setWidth] = useState(defaultWidth);
  const [embedActive, setEmbedActive] = useState(false);
  const trimmedTitle = trim(card.title, maxTitle);
  const trimmedDescription = trim(card.description, maxDescription);
  const safeCardUrl = sanitizeUrl(card.url);
  const safeCardImage = sanitizeUrl(card.image, 'media');
  const safeEmbed = resolveSafeEmbed({
    embedUrl: sanitizeUrl(card.embed_url, 'media'),
    pageUrl: safeCardUrl,
    providerName: card.provider_name,
    title: trimmedTitle,
  });
  const creator = resolveCreatorAttribution({
    authorName: card.author_name,
    authorUrl: card.author_url,
    pageUrl: safeCardUrl,
    providerUrl: card.provider_url,
  });

  const setRef: React.RefCallback<HTMLElement> = element => {
    if (!element) return;
    cacheWidth?.(element.offsetWidth);
    setWidth(element.offsetWidth);
  };

  const ratio = Math.min(Math.max(9 / 16, (card.width / card.height) || 16 / 9), 4);
  const interactive = card.type !== 'link';
  const isHorizontal = typeof horizontal === 'boolean' ? horizontal : interactive;
  const className = classnames('status-card', {
    horizontal: isHorizontal,
    compact,
    interactive,
  }, `status-card--${card.type}`);
  const height = compact ? width / (16 / 9) : width / ratio;

  const openPhoto = () => {
    const imageUrl = sanitizeUrl(card.embed_url, 'media');
    if (!imageUrl) return;
    onOpenMedia(ImmutableList([normalizeAttachment({
      type: 'image',
      url: imageUrl,
      description: trimmedTitle,
      meta: { original: { width: card.width, height: card.height } },
    })]), 0);
  };

  const openExternal = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (safeCardUrl) window.open(safeCardUrl, '_blank', 'noopener,noreferrer');
  };

  const activateEmbed = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (card.type === 'photo') return openPhoto();
    if (safeEmbed) setEmbedActive(true);
    else openExternal(event);
  };

  const title = interactive ? (
    <a onClick={(event) => event.stopPropagation()} href={safeCardUrl || undefined} title={trimmedTitle} rel='nofollow noopener noreferrer' target='_blank'>
      <span>{trimmedTitle}</span>
    </a>
  ) : <span title={trimmedTitle}>{trimmedTitle}</span>;

  const creatorTag = creator && (
    creator.url ? (
      <a
        href={creator.url}
        target='_blank'
        rel='nofollow noopener noreferrer'
        onClick={(event) => event.stopPropagation()}
        className='inline-flex max-w-full items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-200 dark:hover:bg-primary-900/50'
        aria-label={`Creator: ${creator.name}`}
      >
        <SemanticIcon name='profile' size={16} className='shrink-0' />
        <span className='truncate'>Creator · {creator.name}</span>
      </a>
    ) : (
      <span
        className='inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-gray-200'
        aria-label={`Creator metadata: ${creator.name}`}
        title='Creator name supplied by the embed provider; no trusted creator link was available.'
      >
        <SemanticIcon name='profile' size={16} className='shrink-0' />
        <span className='truncate'>Creator · {creator.name}</span>
      </span>
    )
  );

  const description = (
    <Stack space={2} className='flex-1 overflow-hidden p-4'>
      {creatorTag}
      {trimmedTitle && <Text weight='bold'>{title}</Text>}
      {trimmedDescription && <Text>{trimmedDescription}</Text>}
      <HStack space={1} alignItems='center'>
        <Text tag='span' theme='muted'><Icon src={require('@tabler/icons/link.svg')} /></Text>
        <Text tag='span' theme='muted' size='sm'>{card.provider_name || (safeEmbed ? embedProviderLabel(safeEmbed.provider) : '')}</Text>
      </HStack>
    </Stack>
  );

  const canvas = <Blurhash className='absolute w-full h-full inset-0 -z-10' hash={card.blurhash} />;
  const thumbnail = (
    <div
      style={{
        backgroundImage: safeCardImage ? `url(${JSON.stringify(safeCardImage)})` : undefined,
        width: isHorizontal ? width : undefined,
        height: isHorizontal ? height : undefined,
      }}
      className='status-card__image-image'
    />
  );

  if (interactive) {
    const iconVariant = card.type === 'photo' ? require('@tabler/icons/zoom-in.svg') : require('@tabler/icons/player-play.svg');
    const media = embedActive && safeEmbed ? (
      <div className='status-card__image relative overflow-hidden bg-black' style={{ minHeight: height }} onClick={(event) => event.stopPropagation()}>
        <iframe
          src={safeEmbed.src}
          title={safeEmbed.title}
          className='absolute inset-0 h-full w-full border-0'
          sandbox='allow-scripts allow-same-origin allow-presentation allow-popups'
          allow={safeEmbed.allow}
          referrerPolicy='no-referrer'
          loading='lazy'
          allowFullScreen
        />
        <button
          type='button'
          className='absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-xl leading-none text-white shadow-md'
          onClick={(event) => { event.stopPropagation(); setEmbedActive(false); }}
          aria-label='Close embedded content'
        >
          <span aria-hidden='true'>×</span>
        </button>
      </div>
    ) : (
      <div className='status-card__image'>
        {canvas}
        {thumbnail}
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='rounded-full bg-white/95 p-2 shadow-lg dark:bg-slate-900/95'>
            <HStack space={3} alignItems='center'>
              <button type='button' onClick={activateEmbed} className='appearance-none text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white' aria-label={safeEmbed ? `Play ${embedProviderLabel(safeEmbed.provider)} embed` : 'Open media'}>
                <Icon src={iconVariant} className='h-6 w-6 text-inherit' />
              </button>
              {isHorizontal && safeCardUrl && (
                <a onClick={(event) => event.stopPropagation()} href={safeCardUrl} target='_blank' rel='nofollow noopener noreferrer' className='text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white' aria-label='Open original page'>
                  <Icon src={require('@tabler/icons/external-link.svg')} className='h-5 w-5 text-inherit' />
                </a>
              )}
            </HStack>
          </div>
        </div>
      </div>
    );

    return <div className={className} ref={setRef}>{media}{description}</div>;
  }

  const image = card.image ? (
    <div className={classnames('status-card__image', 'w-full rounded-l md:w-auto md:h-auto flex-none md:flex-auto', { 'h-auto': isHorizontal, 'h-[200px]': !isHorizontal })}>
      {canvas}{thumbnail}
    </div>
  ) : (
    <div className='status-card__image status-card__image--empty'><Icon src={require('@tabler/icons/file-text.svg')} /></div>
  );

  return (
    <a href={safeCardUrl || undefined} className={className} target='_blank' rel='nofollow noopener noreferrer' ref={setRef} onClick={(event) => event.stopPropagation()}>
      {image}{description}
    </a>
  );
};

export default Card;
