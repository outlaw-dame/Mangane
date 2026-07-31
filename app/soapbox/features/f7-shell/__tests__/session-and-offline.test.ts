import { clearRouteState, getLastRoute, saveRoute } from '../hooks/use-route-state';

describe('F7 Shell Session State', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('getLastRoute', () => {
    it('returns null when no saved state exists', () => {
      expect(getLastRoute()).toBeNull();
    });

    it('returns only a validated pathname when saved state is valid', () => {
      const state = { path: '/notifications', timestamp: Date.now() };
      sessionStorage.setItem('mangane:f7-shell:last-route', JSON.stringify(state));
      const result = getLastRoute();
      expect(result).toEqual({ path: '/notifications' });
    });

    it('never persists query strings or fragments that may contain secrets', () => {
      saveRoute('/email-confirmation?token=super-secret#private-fragment');

      expect(sessionStorage.getItem('mangane:f7-shell:last-route')).toBeNull();

      saveRoute('/notifications');
      expect(JSON.parse(sessionStorage.getItem('mangane:f7-shell:last-route')!)).toEqual({
        path: '/notifications',
        timestamp: expect.any(Number),
      });
    });

    it.each([
      { path: 'https://attacker.example', timestamp: Date.now() },
      { path: '//attacker.example', timestamp: Date.now() },
      { path: '/safe?token=secret', timestamp: Date.now() },
      { path: '/safe#fragment', timestamp: Date.now() },
      { path: '/safe\u0000route', timestamp: Date.now() },
      { path: '/safe', timestamp: 'now' },
      { path: '/safe', timestamp: Date.now() + 10 * 60 * 1000 },
      { path: '/safe', timestamp: Date.now(), extra: true },
    ])('rejects and clears untrusted persisted state %#', (state) => {
      sessionStorage.setItem('mangane:f7-shell:last-route', JSON.stringify(state));

      expect(getLastRoute()).toBeNull();
      expect(sessionStorage.getItem('mangane:f7-shell:last-route')).toBeNull();
    });

    it('returns null and clears when saved state is too old', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const state = { path: '/settings', timestamp: oldTimestamp };
      sessionStorage.setItem('mangane:f7-shell:last-route', JSON.stringify(state));
      expect(getLastRoute()).toBeNull();
      expect(sessionStorage.getItem('mangane:f7-shell:last-route')).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      sessionStorage.setItem('mangane:f7-shell:last-route', 'not json');
      expect(getLastRoute()).toBeNull();
      expect(sessionStorage.getItem('mangane:f7-shell:last-route')).toBeNull();
    });
  });

  describe('clearRouteState', () => {
    it('removes the saved route', () => {
      const state = { path: '/bookmarks', timestamp: Date.now() };
      sessionStorage.setItem('mangane:f7-shell:last-route', JSON.stringify(state));
      clearRouteState();
      expect(sessionStorage.getItem('mangane:f7-shell:last-route')).toBeNull();
    });

    it('does not throw when no state exists', () => {
      expect(() => clearRouteState()).not.toThrow();
    });
  });
});
