/**
 * Phase 3B — Route state persistence hook.
 *
 * Tracks the current route in sessionStorage (scoped to the current tab)
 * so that page refresh and PWA relaunch can restore the last known route.
 * Used for session restoration in Slice 3D.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { isSafeRoutePath } from '../route-path';

const STORAGE_KEY = 'mangane:f7-shell:last-route';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

interface SavedRouteState {
  path: string;
  timestamp: number;
}

const removeInvalidState = (): null => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable; there is nothing else to clear.
  }
  return null;
};

/** Persist a validated pathname without query strings or fragments. */
export function saveRoute(path: string): void {
  if (!isSafeRoutePath(path)) {
    removeInvalidState();
    return;
  }

  try {
    const state: SavedRouteState = { path, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable or full.
  }
}

/**
 * Persists the current route path to sessionStorage on every navigation.
 * Returns the last persisted route (for restoration on mount).
 */
export function useRouteState(): string | null {
  const location = useLocation();

  useEffect(() => {
    saveRoute(location.pathname);
  }, [location.pathname]);

  return null;
}

/**
 * Retrieves the last saved route for session restoration.
 * Returns null if no saved state or if it's too old (> 24 hours).
 */
export function getLastRoute(): { path: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const state: unknown = JSON.parse(raw);
    if (
      typeof state !== 'object'
      || state === null
      || Array.isArray(state)
      || Object.keys(state).length !== 2
      || !('path' in state)
      || !('timestamp' in state)
      || !isSafeRoutePath(state.path)
      || typeof state.timestamp !== 'number'
      || !Number.isFinite(state.timestamp)
    ) return removeInvalidState();

    const age = Date.now() - state.timestamp;
    if (age > MAX_AGE_MS || age < -MAX_FUTURE_SKEW_MS) return removeInvalidState();

    return { path: state.path };
  } catch {
    return removeInvalidState();
  }
}

/**
 * Clears saved route state. Called on account switch.
 */
export function clearRouteState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
