import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { IntlProvider } from 'react-intl';

import PWAInstallBanner, { BeforeInstallPromptEvent } from '../pwa-install-banner';

const renderBanner = () => render(
  <IntlProvider locale='en'>
    <PWAInstallBanner />
  </IntlProvider>,
);

const installEvent = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: 'web' });
  return event;
};

const dispatchWindowEvent = (event: Event) => {
  act(() => {
    window.dispatchEvent(event);
  });
};

describe('PWAInstallBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Chrome/124',
    });
  });

  it('defers the browser prompt until the user activates Install', async() => {
    renderBanner();
    const event = installEvent();
    dispatchWindowEvent(event);

    const install = await screen.findByRole('button', { name: 'Install' });
    expect(event.defaultPrevented).toBe(true);
    expect(event.prompt).not.toHaveBeenCalled();

    fireEvent.click(install);
    await waitFor(() => expect(event.prompt).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Install Mangane' })).not.toBeInTheDocument());
  });

  it('persists an explicit dismissal and does not nag on remount', async() => {
    const first = renderBanner();
    dispatchWindowEvent(installEvent());
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    first.unmount();

    renderBanner();
    dispatchWindowEvent(installEvent());
    expect(screen.queryByRole('region', { name: 'Install Mangane' })).not.toBeInTheDocument();
  });

  it('offers accessible Add to Home Screen guidance on iOS', async() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    renderBanner();

    expect(await screen.findByText(/Share, then Add to Home Screen/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Install Mangane' })).toHaveAttribute('aria-live', 'polite');
  });

  it('hides when installation completes in another browser surface', async() => {
    renderBanner();
    dispatchWindowEvent(installEvent());
    expect(await screen.findByRole('region', { name: 'Install Mangane' })).toBeInTheDocument();

    dispatchWindowEvent(new Event('appinstalled'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Install Mangane' })).not.toBeInTheDocument());
  });
});
