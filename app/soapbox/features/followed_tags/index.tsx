import React from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { featureTag, fetchFeaturedTags, fetchTags, followTag, unfeatureTag, unfollowTag } from 'soapbox/actions/tags';
import Icon from 'soapbox/components/icon';
import ScrollableList from 'soapbox/components/scrollable_list';
import SubNavigation from 'soapbox/components/sub_navigation';
import { Button, Column, Spinner, Text } from 'soapbox/components/ui';
import { useAppDispatch, useAppSelector } from 'soapbox/hooks';

import type { FeaturedTagEntity } from 'soapbox/services/featured-tags';

const messages = defineMessages({
  heading: { id: 'column.tags', defaultMessage: 'Hashtags' },
  addFeatured: { id: 'featured_tags.add', defaultMessage: 'Feature hashtag' },
  featuredHeading: { id: 'featured_tags.heading', defaultMessage: 'Featured hashtags' },
});

interface IFollowButton {
  id: string,
}

const FollowButton: React.FC<IFollowButton> = ({ id }) => {
  const isFollow = useAppSelector(state => state.tags.list.find((tag) => tag.name === id));
  const dispatch = useAppDispatch();

  return (
    <Button theme='ghost' classNames='text-xs gap-1 flex-row-reverse' style={{ background: 'transparent' }} onClick={() => dispatch((isFollow ? unfollowTag : followTag)(id))}>
      <Icon src={isFollow ? require('@tabler/icons/minus.svg') : require('@tabler/icons/plus.svg')} />
      {isFollow ? <FormattedMessage id='hashtag_timeline.unfollow' defaultMessage='Unfollow' /> : <FormattedMessage id='hashtag_timeline.follow' defaultMessage='Follow' />}
    </Button>
  );
};

const FeaturedHashtags = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const [name, setName] = React.useState('');
  const { featured, loading, suggestions } = useAppSelector((state) => ({
    featured: state.tags.featured.toJS() as FeaturedTagEntity[],
    loading: state.tags.featuredLoading,
    suggestions: state.tags.featuredSuggestions.toArray(),
  }));

  React.useEffect(() => {
    dispatch(fetchFeaturedTags());
  }, [dispatch]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    dispatch(featureTag(name));
    setName('');
  };

  return (
    <section className='p-3 bg-white dark:bg-slate-800 shadow-sm dark:shadow-inset rounded-lg' aria-labelledby='featured-hashtags-heading'>
      <h2 id='featured-hashtags-heading' className='font-semibold text-gray-900 dark:text-gray-100'>{intl.formatMessage(messages.featuredHeading)}</h2>
      <Text tag='p' size='sm' theme='muted'>
        <FormattedMessage id='featured_tags.explanation' defaultMessage='Show the topics you post about most. Server-backed tags appear publicly; Mangane-managed tags are available in Mangane when your server does not support them.' />
      </Text>

      <form className='mt-3 flex gap-2' onSubmit={submit}>
        <label className='sr-only' htmlFor='featured-hashtag-input'>{intl.formatMessage(messages.addFeatured)}</label>
        <input
          id='featured-hashtag-input'
          className='min-w-0 grow rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-slate-600'
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder='#topic'
          maxLength={101}
          autoCapitalize='none'
          autoCorrect='off'
        />
        <Button type='submit' theme='primary' disabled={loading || !name.trim()}>{intl.formatMessage(messages.addFeatured)}</Button>
      </form>

      {suggestions.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-2' aria-label={intl.formatMessage({ id: 'featured_tags.suggestions', defaultMessage: 'Suggested hashtags' })}>
          {suggestions.filter((suggestion) => !featured.some((tag) => tag.name.toLocaleLowerCase() === suggestion.toLocaleLowerCase())).map((suggestion) => (
            <Button key={suggestion} theme='ghost' onClick={() => dispatch(featureTag(suggestion))}>#{suggestion}</Button>
          ))}
        </div>
      )}

      {loading && featured.length === 0 ? <Spinner /> : (
        <div className='mt-3 flex flex-col gap-2'>
          {featured.length === 0 && <Text theme='muted'><FormattedMessage id='featured_tags.empty' defaultMessage='No featured hashtags yet.' /></Text>}
          {featured.map((tag) => (
            <div key={`${tag.source}:${tag.id}`} className='flex items-center justify-between gap-3 rounded-md border border-gray-200 p-3 dark:border-slate-700'>
              <div className='min-w-0'>
                <Button theme='link' to={`/tag/${encodeURIComponent(tag.name)}`}>#{tag.name}</Button>
                <Text tag='p' size='xs' theme='muted'>
                  {tag.source === 'server'
                    ? <FormattedMessage id='featured_tags.public' defaultMessage='Published on your profile' />
                    : <FormattedMessage id='featured_tags.mangane_only' defaultMessage='Managed by Mangane; your server does not publish this tag' />}
                </Text>
              </div>
              <Button theme='ghost' disabled={loading} onClick={() => dispatch(unfeatureTag(tag))}>
                <FormattedMessage id='featured_tags.remove' defaultMessage='Remove' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const FollowedHashtags = () => {
  const intl = useIntl();
  const [tags, setTags] = React.useState<any>(null);
  const dispatch = useAppDispatch();
  const { tags: serverTags, loading } = useAppSelector((state) => ({ tags: state.tags.list, loading: state.tags.loading }));

  React.useEffect(() => {
    if (!loading && !tags) setTags(serverTags);
  }, [serverTags, tags, loading]);

  React.useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  return (
    <Column label={intl.formatMessage(messages.heading)} transparent withHeader={false}>
      <div className='px-4 pt-4 sm:p-0'><SubNavigation message={intl.formatMessage(messages.heading)} /></div>
      <div className='flex flex-col gap-4 p-2 sm:p-0'>
        <FeaturedHashtags />
        {!tags ? <Spinner /> : (
          <ScrollableList className='flex flex-col gap-2' scrollKey='followed_hashtags' emptyMessage={<FormattedMessage id='column.tags.empty' defaultMessage="You don't follow any hashtag yet." />}>
            {tags.map((tag: any) => (
              <div key={tag.name} className='p-3 bg-white dark:bg-slate-800 shadow-sm dark:shadow-inset rounded-lg'>
                <div className='flex items-center grow pl-2'><Text tag='span' weight='semibold'>#{tag.name}</Text></div>
                <hr className='bg-gray-100 dark:border-slate-800 mt-1 mb-2' />
                <div className='flex items-center gap-1 grow shrink justify-between mt-1 text-sm'>
                  <FollowButton id={tag.name} />
                  <Button theme='primary' to={`/tag/${tag.name}`}><div className='flex items-center text-xs'><FormattedMessage id='column.tags.see' defaultMessage='See' />&nbsp;<Icon src={require('@tabler/icons/arrow-right.svg')} /></div></Button>
                </div>
              </div>
            ))}
          </ScrollableList>
        )}
      </div>
    </Column>
  );
};

export default FollowedHashtags;
