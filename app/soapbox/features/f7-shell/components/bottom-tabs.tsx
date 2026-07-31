/**
 * Phase 3A — Phone bottom tab navigation for the F7 shell.
 *
 * Provides the same navigation targets as the legacy ThumbNavigation
 * but using Framework7's Toolbar component for proper safe-area handling.
 */
import classNames from 'classnames';
import { Toolbar } from 'framework7-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { SemanticIcon } from 'soapbox/components/ui';
import { useAppSelector } from 'soapbox/hooks';

interface ITabLink {
  active: boolean,
  children: React.ReactNode,
  label: string,
  to: string,
}

/**
 * React Router owns href generation so BrowserRouter's configured basename is
 * preserved for normal clicks, copied links, context-menu navigation, and new
 * tabs. The Framework7 tab-link classes retain the shell presentation.
 */
const TabLink: React.FC<ITabLink> = ({ active, children, label, to }) => (
  <Link
    className={classNames('link tab-link', { 'tab-link-active': active })}
    to={to}
    aria-current={active ? 'page' : undefined}
  >
    {children}
    <span className='tabbar-label'>{label}</span>
  </Link>
);

const F7BottomTabs: React.FC = () => {
  const { pathname } = useLocation();
  const notificationCount = useAppSelector((state) => state.notifications.get('unread'));

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
      <TabLink active={homeActive} label='Home' to='/'>
        <SemanticIcon name='home' size={24} weight={homeActive ? 'fill' : 'regular'} />
      </TabLink>
      <TabLink active={searchActive} label='Search' to='/search'>
        <SemanticIcon name='search' size={24} weight={searchActive ? 'bold' : 'regular'} />
      </TabLink>
      <TabLink active={notificationsActive} label='Alerts' to='/notifications'>
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
      </TabLink>
      <TabLink active={settingsActive} label='Settings' to='/settings'>
        <SemanticIcon name='settings' size={24} weight={settingsActive ? 'fill' : 'regular'} />
      </TabLink>
    </Toolbar>
  );
};

export { TabLink };
export default F7BottomTabs;