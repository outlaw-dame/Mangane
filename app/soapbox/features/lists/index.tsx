import React, { useEffect } from 'react';
import { defineMessages, useIntl, FormattedMessage } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { createSelector } from 'reselect';

import { deleteList, fetchLists } from 'soapbox/actions/lists';
import { openModal } from 'soapbox/actions/modals';
import Icon from 'soapbox/components/icon';
import ScrollableList from 'soapbox/components/scrollable_list';
import { CardHeader, CardTitle, IconButton, Spinner } from 'soapbox/components/ui';
import { useAppSelector } from 'soapbox/hooks';

import Column from '../ui/components/column';

import DiscoveryPacksPanel from './components/discovery-packs-panel';
import NewListForm from './components/new_list_form';

import type { RootState } from 'soapbox/store';

const messages = defineMessages({
  heading: { id: 'column.lists', defaultMessage: 'Lists' },
  subheading: { id: 'lists.subheading', defaultMessage: 'Your private lists' },
  add: { id: 'lists.new.create', defaultMessage: 'Add private list' },
  deleteHeading: { id: 'confirmations.delete_list.heading', defaultMessage: 'Delete list' },
  deleteMessage: { id: 'confirmations.delete_list.message', defaultMessage: 'Are you sure you want to permanently delete this list?' },
  deleteConfirm: { id: 'confirmations.delete_list.confirm', defaultMessage: 'Delete' },
  editList: { id: 'lists.edit', defaultMessage: 'Edit list' },
  deleteList: { id: 'lists.delete', defaultMessage: 'Delete list' },
});

const getOrderedLists = createSelector([(state: RootState) => state.lists], lists => {
  if (!lists) return lists;
  return lists.toList().filter((item) => !!item).sort((a: any, b: any) => a.get('title').localeCompare(b.get('title')));
});

const Lists: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const lists = useAppSelector((state) => getOrderedLists(state));

  useEffect(() => {
    dispatch(fetchLists());
  }, [dispatch]);

  if (!lists) return <Column><Spinner /></Column>;

  const handleEditClick = (id: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    dispatch(openModal('LIST_EDITOR', { listId: id }));
  };

  const handleDeleteClick = (id: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    dispatch(openModal('CONFIRM', {
      heading: intl.formatMessage(messages.deleteHeading),
      message: intl.formatMessage(messages.deleteMessage),
      confirm: intl.formatMessage(messages.deleteConfirm),
      onConfirm: () => dispatch(deleteList(id)),
    }));
  };

  const emptyMessage = <FormattedMessage id='empty_column.lists' defaultMessage="You don't have any private lists yet. When you create one, it will show up here." />;

  return (
    <Column icon='list-ul' label={intl.formatMessage(messages.heading)}>
      <div className='flex flex-col gap-6 py-4'>
        <DiscoveryPacksPanel />

        <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800' aria-labelledby='private-lists-heading'>
          <CardHeader>
            <CardTitle title={intl.formatMessage(messages.add)} />
          </CardHeader>
          <NewListForm />

          <div className='mt-6'>
            <h2 id='private-lists-heading' className='sr-only'>{intl.formatMessage(messages.subheading)}</h2>
            <CardHeader>
              <CardTitle title={intl.formatMessage(messages.subheading)} />
            </CardHeader>
            <ScrollableList scrollKey='lists' emptyMessage={emptyMessage} itemClassName='py-2'>
              {lists.map((list: any) => (
                <Link key={list.id} to={`/list/${list.id}`} className='flex items-center gap-1.5 rounded-lg p-2 text-black hover:bg-gray-100 dark:text-white dark:hover:bg-slate-700'>
                  <Icon src={require('@tabler/icons/list.svg')} fixedWidth />
                  <span className='flex-grow'>{list.title}</span>
                  <IconButton iconClassName='h-5 w-5' src={require('@tabler/icons/pencil.svg')} onClick={handleEditClick(list.id)} title={intl.formatMessage(messages.editList)} />
                  <IconButton iconClassName='h-5 w-5' src={require('@tabler/icons/trash.svg')} onClick={handleDeleteClick(list.id)} title={intl.formatMessage(messages.deleteList)} />
                </Link>
              ))}
            </ScrollableList>
          </div>
        </section>
      </div>
    </Column>
  );
};

export default Lists;
