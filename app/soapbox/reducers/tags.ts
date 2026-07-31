import { List as ImmutableList, Map as ImmutableMap, Record as ImmutableRecord, fromJS } from 'immutable';

import {
  ACCOUNT_FEATURED_TAGS_SUCCESS,
  FEATURED_TAG_SUGGESTIONS_SUCCESS,
  FEATURED_TAGS_FETCH_FAIL,
  FEATURED_TAGS_FETCH_REQUEST,
  FEATURED_TAGS_FETCH_SUCCESS,
  FEATURED_TAGS_UPDATE_FAIL,
  FEATURED_TAGS_UPDATE_REQUEST,
  FEATURED_TAGS_UPDATE_SUCCESS,
  TAG_FETCH_FAIL,
  TAG_FETCH_REQUEST,
  TAG_FETCH_SUCCESS,
  TAG_FOLLOW_FAIL,
  TAG_FOLLOW_REQUEST,
  TAG_FOLLOW_SUCCESS,
  TAG_UNFOLLOW_FAIL,
  TAG_UNFOLLOW_REQUEST,
  TAG_UNFOLLOW_SUCCESS,
} from 'soapbox/actions/tags';
import { normalizeTag } from 'soapbox/normalizers';

import type { AnyAction } from 'redux';
import type { FeaturedTagEntity } from 'soapbox/services/featured-tags';
import type { APIEntity, Tag } from 'soapbox/types/entities';

const TagRecord = ImmutableRecord({
  list: ImmutableList<Tag>(),
  loading: true,
  featured: ImmutableList<FeaturedTagEntity>(),
  featuredLoading: false,
  featuredSuggestions: ImmutableList<string>(),
  featuredByAccount: ImmutableMap<string, ImmutableList<FeaturedTagEntity>>(),
});

type State = ReturnType<typeof TagRecord>;

const importTags = (state: State, tags: APIEntity[]): State => state.withMutations((s) => {
  s.set('list', ImmutableList(tags.map((tag) => normalizeTag(tag))));
  s.set('loading', false);
});

const addTag = (state: State, tag: APIEntity): State => state.withMutations((s) => {
  s.set('list', state.list.push(normalizeTag(tag)));
  s.set('loading', false);
});

const removeTag = (state: State, entity: APIEntity): State => {
  const tag = normalizeTag(entity);
  return state.withMutations((s) => {
    s.set('list', state.list.filter((item) => item.name !== tag.name));
    s.set('loading', false);
  });
};

export default function tags(state = TagRecord(), action: AnyAction): State {
  switch (action.type) {
    case TAG_FETCH_REQUEST:
    case TAG_FOLLOW_REQUEST:
    case TAG_UNFOLLOW_REQUEST:
      return state.set('loading', true);
    case TAG_FETCH_SUCCESS:
      return importTags(state, action.tags);
    case TAG_FOLLOW_SUCCESS:
      return addTag(state, action.tag);
    case TAG_UNFOLLOW_SUCCESS:
      return removeTag(state, action.tag);
    case TAG_FETCH_FAIL:
    case TAG_FOLLOW_FAIL:
    case TAG_UNFOLLOW_FAIL:
      return state.set('loading', false);
    case FEATURED_TAGS_FETCH_REQUEST:
    case FEATURED_TAGS_UPDATE_REQUEST:
      return state.set('featuredLoading', true);
    case FEATURED_TAGS_FETCH_SUCCESS:
    case FEATURED_TAGS_UPDATE_SUCCESS:
      return state.set('featured', fromJS(action.tags)).set('featuredLoading', false);
    case FEATURED_TAG_SUGGESTIONS_SUCCESS:
      return state.set('featuredSuggestions', ImmutableList(action.suggestions));
    case ACCOUNT_FEATURED_TAGS_SUCCESS:
      return state.setIn(['featuredByAccount', action.accountId], fromJS(action.tags));
    case FEATURED_TAGS_FETCH_FAIL:
    case FEATURED_TAGS_UPDATE_FAIL:
      return state.set('featuredLoading', false);
    default:
      return state;
  }
}
