import { act, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';

import RouteTransition from '../components/route-transition';

describe('F7 route transition', () => {
  it('keys a real content wrapper to React Router navigation', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const { container } = render(
      <Router history={history}>
        <RouteTransition><p>content</p></RouteTransition>
      </Router>,
    );

    const first = screen.getByTestId('f7-route-transition');
    expect(first).toHaveAttribute('data-route-path', '/');

    act(() => history.push('/notifications'));

    const second = screen.getByTestId('f7-route-transition');
    expect(second).toHaveAttribute('data-route-path', '/notifications');
    expect(second).not.toBe(first);
    expect(container.querySelectorAll('.f7-shell__route-transition')).toHaveLength(1);
  });
});
