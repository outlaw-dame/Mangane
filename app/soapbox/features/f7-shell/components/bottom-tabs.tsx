/**
 * Phase 3A — Phone bottom tab navigation for the F7 shell.
 *
 * Provides the same navigation targets as the legacy ThumbNavigation
 * but using Framework7's Toolbar component for proper safe-area handling.
 */
import { Toolbar, Link } from 'framework7-react';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { SemanticIcon } from 'soapbox/components/ui';
import { useAppSelector } from 'soapbox/hooks';

const frontendBasename = (process.env.FE_SUBDIRECTORY || '').replace(/\/+$/, '');

const externalHref = (path: string): string => `${frontendBasename}${path}` || '/';

const F7BottomTabs: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const notificationCount = useAppSelector((state) => state.notifications.get('unread'));

  const navigate = (path: string): React.MouseEventHandler<HTMLAnchorElement> => (event) => {
    event.preventDefault();
    history.push(path);
  };

  const homeActive = pathname === '/';
  const searchActive = pathname.startsWith('/search');
  const notificationsActive = pathname.startsWith('/notifications');
  const settingsActive = pathname.startsWith('/settings');

  return (
    <Toolbar
      bottom
      tabbar
      className='f7-shell__bottom-tabs'
    >
      <Link
        tabLink
        href={externalHref('/')}
        tabLinkActive={homeActive}
        onClick={navigate('/')}
        text='Home'
      >
        <SemanticIcon name='home' size={24} weight={homeActive ? 'fill' : 'regular'} />
      </Link>
      <Link
        tabLink
        href={externalHref('/search')}
        tabLinkActive={searchActive}
        onClick={navigate('/search')}
        text='Search'
      >
        <SemanticIcon name='search' size={24} weight={searchActive ? 'bold' : 'regular'} />
      </Link>
      <Link
        tabLink
        href={externalHref('/notifications')}
        tabLinkActive={notificationsActive}
        onClick={navigate('/notifications')}
        text='Alerts'
      >
        <span className='f7-shell__tab-icon'>
          <SemanticIcon name='notifications' size={24} weight={notificationsActive ? 'fill' : 'regular'} />
          {notificationCount > 0 && (
            <span
              className='f7-shell__notification-badge'
              aria-label={`${notificationCount} unread notifications`}
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </span>
      </Link>
      <Link
        tabLink
        href={externalHref('/settings')}
        tabLinkActive={settingsActive}
        onClick={navigate('/settings')}
        text='Settings'
      >
        <SemanticIcon name='settings' size={24} weight={settingsActive ? 'fill' : 'regular'} />
      </Link>
    </Toolbar>
  );
};

export { externalHref };
export default F7BottomTabs;