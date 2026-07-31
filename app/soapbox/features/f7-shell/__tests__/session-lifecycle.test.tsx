import { render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';

import { useAccountSwitch } from '../hooks/use-account-switch';
import { useRouteState } from '../hooks/use-route-state';
import { useSessionRestore } from '../hooks/use-session-restore';

let mockAccount: { url: string; staff?: boolean; admin?: boolean } | undefined = {
  url: 'https://social.example/@alice',
};

jest.mock('soapbox/hooks', () => ({
  useOwnAccount: () => mockAccount,
}));

const Lifecycle: React.FC = () => {
  // Preserve the production ordering to guard against the original race.
  useAccountSwitch();
  useSessionRestore();
  useRouteState();
  return null;
};

describe('F7 session lifecycle', () => {
  beforeEach(() => {
    mockAccount = { url: 'https://social.example/@alice' };
    sessionStorage.clear();
  });

  it('captures the prior route before the initial root persistence effect', async() => {
    sessionStorage.setItem('mangane:f7-shell:last-route', JSON.stringify({
      path: '/notifications',
      timestamp: Date.now(),
    }));
    const history = createMemoryHistory({ initialEntries: ['/'] });

    render(<Router history={history}><Lifecycle /></Router>);

    await waitFor(() => expect(history.location.pathname).toBe('/notifications'));
    expect(JSON.parse(sessionStorage.getItem('mangane:f7-shell:last-route')!)).toMatchObject({
      path: '/notifications',
    });
  });

  it('clears route state and returns home when the active account changes', async() => {
    const history = createMemoryHistory({ initialEntries: ['/bookmarks'] });
    const rendered = render(<Router history={history}><Lifecycle /></Router>);
    await waitFor(() => expect(sessionStorage.getItem('mangane:f7-shell:last-route')).not.toBeNull());

    mockAccount = { url: 'https://social.example/@bob' };
    rendered.rerender(<Router history={history}><Lifecycle /></Router>);

    await waitFor(() => expect(history.location.pathname).toBe('/'));
    expect(JSON.parse(sessionStorage.getItem('mangane:f7-shell:last-route')!)).toMatchObject({
      path: '/',
    });
  });
});
