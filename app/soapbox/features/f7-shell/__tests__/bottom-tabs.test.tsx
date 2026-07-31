import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import F7BottomTabs from '../components/bottom-tabs';

jest.mock('framework7-react', () => ({
  Toolbar: ({ children }: React.PropsWithChildren) => <nav>{children}</nav>,
}));

jest.mock('soapbox/hooks', () => ({
  useAppSelector: () => 3,
}));

describe('F7 bottom tabs', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/mangane/');
  });

  it('delegates real link destinations to the basename-aware router', () => {
    render(
      <BrowserRouter basename='/mangane'>
        <F7BottomTabs />
      </BrowserRouter>,
    );

    expect(screen.getByRole('link', { name: /Home/i })).toHaveAttribute('href', '/mangane/');
    expect(screen.getByRole('link', { name: /Search/i })).toHaveAttribute('href', '/mangane/search');
    expect(screen.getByRole('link', { name: /Alerts/i })).toHaveAttribute('href', '/mangane/notifications');
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', '/mangane/settings');
  });
});
