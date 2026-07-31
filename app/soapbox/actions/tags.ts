import { changeSettingImmediate, getSettings } from 'soapbox/actions/settings';
import { isLoggedIn } from 'soapbox/utils/auth';
import { getFeatures } from 'soapbox/utils/features';

import api, { getNextLink } from '../api';
import {
  featureTag as featureTagRequest,
  fetchAccountFeaturedTags as fetchAccountFeaturedTagsRequest,
  fetchFeaturedTagSuggestions as fetchFeaturedTagSuggestionsRequest,
  fetchOwnFeaturedTags as fetchOwnFeaturedTagsRequest,
  unfeatureTag as unfeatureTagRequest,
} from '../services/featured-tags';

import type { FeaturedTagEntity } from '../services/featured-tags';
import type { AppDispatch, RootState } from 'soapbox/store';

const TAG_FETCH_REQUEST = 'TAG_FETCH_REQUEST';
const TAG_FETCH_SUCCESS = 'TAG_FETCH_SUCCESS';
const TAG_FETCH_FAIL = 'TAG_FETCH_FAIL';
const TAG_FOLLOW_REQUEST = 'TAG_FOLLOW_REQUEST';
const TAG_FOLLOW_SUCCESS = 'TAG_FOLLOW_SUCCESS';
const TAG_FOLLOW_FAIL = 'TAG_FOLLOW_FAIL';
const TAG_UNFOLLOW_REQUEST = 'TAG_UNFOLLOW_REQUEST';
const TAG_UNFOLLOW_SUCCESS = 'TAG_UNFOLLOW_SUCCESS';
const TAG_UNFOLLOW_FAIL = 'TAG_UNFOLLOW_FAIL';
const FEATURED_TAGS_FETCH_REQUEST = 'FEATURED_TAGS_FETCH_REQUEST';
const FEATURED_TAGS_FETCH_SUCCESS = 'FEATURED_TAGS_FETCH_SUCCESS';
const FEATURED_TAGS_FETCH_FAIL = 'FEATURED_TAGS_FETCH_FAIL';
const FEATURED_TAGS_UPDATE_REQUEST = 'FEATURED_TAGS_UPDATE_REQUEST';
const FEATURED_TAGS_UPDATE_SUCCESS = 'FEATURED_TAGS_UPDATE_SUCCESS';
const FEATURED_TAGS_UPDATE_FAIL = 'FEATURED_TAGS_UPDATE_FAIL';
const FEATURED_TAG_SUGGESTIONS_SUCCESS = 'FEATURED_TAG_SUGGESTIONS_SUCCESS';
const ACCOUNT_FEATURED_TAGS_SUCCESS = 'ACCOUNT_FEATURED_TAGS_SUCCESS';

const localFeaturedTagNames = (state: RootState): unknown => getSettings(state).get('featuredTags');
const persistLocalFeaturedTags = (dispatch: AppDispatch, tags: FeaturedTagEntity[]) => {
  if (tags.some(({ source }) => source === 'mangane')) {
    dispatch(changeSettingImmediate(['featuredTags'], tags.map(({ name }) => name)));
  }
};

const fetchTags = () => async(dispatch: AppDispatch, getState: () => RootState) => {
  if (!isLoggedIn(getState)) return;
  const features = getFeatures(getState().instance);
  if (!features.followTags) return;

  dispatch({ type: TAG_FETCH_REQUEST, skipLoading: true });
  try {
    let next = null;
    let tags = [];
    do {
      const response = await api(getState).get(next || '/api/v1/followed_tags');
      tags = [...tags, ...response.data];
      next = getNextLink(response);
    } while (next);
    dispatch({ type: TAG_FETCH_SUCCESS, tags, skipLoading: true });
  } catch (err) {
    dispatch({ type: TAG_FETCH_FAIL, err, skipLoading: true, skipAlert: true });
  }
};

const followTag = (tagId: string) => async(dispatch: AppDispatch, getState: () => RootState) => {
  if (!isLoggedIn(getState) || !getFeatures(getState().instance).followTags) return;
  dispatch({ type: TAG_FOLLOW_REQUEST });
  try {
    const { data } = await api(getState).post(`/api/v1/tags/${tagId}/follow`);
    dispatch({ type: TAG_FOLLOW_SUCCESS, tag: data });
  } catch (err) {
    dispatch({ type: TAG_FOLLOW_FAIL, err });
  }
};

const unfollowTag = (tagId: string) => async(dispatch: AppDispatch, getState: () => RootState) => {
  if (!isLoggedIn(getState) || !getFeatures(getState().instance).followTags) return;
  dispatch({ type: TAG_UNFOLLOW_REQUEST });
  try {
    const { data } = await api(getState).post(`/api/v1/tags/${tagId}/unfollow`);
    dispatch({ type: TAG_UNFOLLOW_SUCCESS, tag: data });
  } catch (err) {
    dispatch({ type: TAG_UNFOLLOW_FAIL, err });
  }
};

const fetchFeaturedTags = () => async(dispatch: AppDispatch, getState: () => RootState) => {
  if (!isLoggedIn(getState)) return;
  dispatch({ type: FEATURED_TAGS_FETCH_REQUEST, skipLoading: true });

  try {
    const tags = await fetchOwnFeaturedTagsRequest(api(getState), localFeaturedTagNames(getState()));
    const suggestions = await fetchFeaturedTagSuggestionsRequest(api(getState));
    dispatch({ type: FEATURED_TAGS_FETCH_SUCCESS, tags, skipLoading: true });
    dispatch({ type: FEATURED_TAG_SUGGESTIONS_SUCCESS, suggestions, skipLoading: true });
  } catch (err) {
    dispatch({ type: FEATURED_TAGS_FETCH_FAIL, err, skipLoading: true });
  }
};

const fetchAccountFeaturedTags = (accountId: string) => async(dispatch: AppDispatch, getState: () => RootState) => {
  try {
    const tags = await fetchAccountFeaturedTagsRequest(api(getState), accountId);
    dispatch({ type: ACCOUNT_FEATURED_TAGS_SUCCESS, accountId, tags, skipLoading: true });
  } catch (err) {
    dispatch({ type: FEATURED_TAGS_FETCH_FAIL, err, accountId, skipLoading: true, skipAlert: true });
  }
};

const featureTag = (name: string) => async(dispatch: AppDispatch, getState: () => RootState) => {
  if (!isLoggedIn(getState)) return;
  dispatch({ type: FEATURED_TAGS_UPDATE_REQUEST });

  try {
    const current = getState().tags.featured.toJS() as FeaturedTagEntity[];
    const tags = await featureTagRequest(api(getState), name, current);
    persistLocalFeaturedTags(dispatch, tags);
    dispatch({ type: FEATURED_TAGS_UPDATE_SUCCESS, tags });
  } catch (err) {
    dispatch({ type: FEATURED_TAGS_UPDATE_FAIL, err });
  }
};

const unfeatureTag = (tag: FeaturedTagEntity) => async(dispatch: AppDispatch, getState: () => RootState) => {
  if (!isLoggedIn(getState)) return;
  dispatch({ type: FEATURED_TAGS_UPDATE_REQUEST });

  try {
    const current = getState().tags.featured.toJS() as FeaturedTagEntity[];
    const tags = await unfeatureTagRequest(api(getState), tag, current);
    if (tag.source === 'mangane') dispatch(changeSettingImmediate(['featuredTags'], tags.map(({ name }) => name)));
    dispatch({ type: FEATURED_TAGS_UPDATE_SUCCESS, tags });
  } catch (err) {
    dispatch({ type: FEATURED_TAGS_UPDATE_FAIL, err });
  }
};

export {
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
  featureTag,
  fetchAccountFeaturedTags,
  fetchFeaturedTags,
  fetchTags,
  followTag,
  unfeatureTag,
  unfollowTag,
};