import React, { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';

import * as BuildConfig from 'soapbox/build_config';
import { isIOS, isInstalledPWA } from 'soapbox/utils/pwa';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
}

type InstallMode = 'browser' | 'ios';

const DISMISSAL_KEY = `soapbox${BuildConfig.FE_SUBDIRECTORY}:pwa-install-dismissed:v1`;

const isDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISSAL_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistDismissal = (): void => {
  try {
    window.localStorage.setItem(DISMISSAL_KEY, 'true');
  } catch {
    // Storage denial must not break or trap the install surface.
  }
};

/** Accessible, user-controlled PWA installation discovery for browser and iOS flows. */
const PWAInstallBanner: React.FC = () => {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState(false);

  useEffect(() => {
    if (isInstalledPWA() || isDismissed()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      const installPrompt = event as BeforeInstallPromptEvent;
      event.preventDefault();
      setInstallError(false);
      setPromptEvent(installPrompt);
      setMode('browser');
    };
    const handleInstalled = () => {
      setPromptEvent(null);
      setMode(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    if (isIOS()) setMode('ios');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    persistDismissal();
    setPromptEvent(null);
    setMode(null);
  };

  const install = async() => {
    if (!promptEvent) return;
    setInstallError(false);
    const currentPrompt = promptEvent;
    setPromptEvent(null);
    try {
      await currentPrompt.prompt();
      const choice = await currentPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setMode(null);
      } else {
        dismiss();
      }
    } catch {
      setInstallError(true);
      setMode('browser');
    }
  };

  if (!mode) return null;

  return (
    <section
      className='pwa-install-banner'
      aria-label='Install Mangane'
      aria-live='polite'
    >
      <div className='pwa-install-banner__copy'>
        <strong>
          <FormattedMessage id='pwa.install.title' defaultMessage='Install Mangane' />
        </strong>
        <span>
          {mode === 'ios' ? (
            <FormattedMessage
              id='pwa.install.ios'
              defaultMessage='For faster access and offline support, open Share, then Add to Home Screen.'
            />
          ) : (
            <FormattedMessage
              id='pwa.install.browser'
              defaultMessage='Add Mangane to this device for faster access and offline support.'
            />
          )}
        </span>
        {installError && (
          <span role='status'>
            <FormattedMessage
              id='pwa.install.error'
              defaultMessage='Installation could not start. You can still install from your browser menu.'
            />
          </span>
        )}
      </div>
      <div className='pwa-install-banner__actions'>
        {mode === 'browser' && promptEvent && (
          <button type='button' className='pwa-install-banner__primary' onClick={install}>
            <FormattedMessage id='pwa.install.action' defaultMessage='Install' />
          </button>
        )}
        <button type='button' className='pwa-install-banner__secondary' onClick={dismiss}>
          <FormattedMessage id='pwa.install.dismiss' defaultMessage='Not now' />
        </button>
      </div>
    </section>
  );
};

export default PWAInstallBanner;
