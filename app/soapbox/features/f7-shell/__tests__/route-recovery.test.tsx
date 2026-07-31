import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router, useLocation } from 'react-router-dom';

import RouteErrorBoundary from '../components/route-error-boundary';

const Broken: React.FC = () => {
  throw new Error('route failed');
};

const RouteContent: React.FC = () => {
  const location = useLocation();
  return location.pathname === '/broken' ? <Broken /> : <p>Home restored</p>;
};

describe('F7 route recovery', () => {
  it('clears the error boundary before navigating home', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const history = createMemoryHistory({ initialEntries: ['/broken'] });
    render(
      <Router history={history}>
        <RouteErrorBoundary>
          <RouteContent />
        </RouteErrorBoundary>
      </Router>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    expect(history.location.pathname).toBe('/');
    expect(screen.getByText('Home restored')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
