import React from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionProps {
  children: React.ReactNode;
}

/**
 * React Router remains the only navigation authority. This keyed presentation
 * wrapper makes the configured shell transition observable on each navigation.
 */
const RouteTransition: React.FC<RouteTransitionProps> = ({ children }) => {
  const location = useLocation();
  const routeKey = location.key || `${location.pathname}:${location.search}`;

  return (
    <div
      key={routeKey}
      className='f7-shell__route-transition'
      data-route-path={location.pathname}
      data-testid='f7-route-transition'
    >
      {children}
    </div>
  );
};

export default RouteTransition;
