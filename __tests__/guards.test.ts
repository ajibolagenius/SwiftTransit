import { routeGuards } from '@/features/auth/guards';

describe('routeGuards', () => {
  it('sends a new signed-out user to onboarding and sign in only', () => {
    expect(routeGuards({ status: 'signed-out' }, false)).toEqual({
      onboarding: true,
      signIn: true,
      registration: false,
      customer: false,
      courier: false,
    });
  });

  // covers: AC-1
  it('skips onboarding for a returning signed-out user who already saw it', () => {
    expect(routeGuards({ status: 'signed-out' }, true)).toMatchObject({
      onboarding: false,
      signIn: true,
    });
  });

  it('sends a signed-in user without a profile to registration only', () => {
    const g = routeGuards({ status: 'signed-in', session: null, role: null }, true);
    expect(g).toMatchObject({
      registration: true,
      signIn: false,
      onboarding: false,
      customer: false,
      courier: false,
    });
  });

  // covers: AC-9
  it('does not route a user whose profile read failed to registration', () => {
    const g = routeGuards({ status: 'signed-in', session: null, role: null, profileError: true }, true);
    expect(g.registration).toBe(false);
  });

  it.each(['customer', 'courier'] as const)('opens only the %s area for that role', (role) => {
    const g = routeGuards({ status: 'signed-in', session: null, role }, true);
    expect(g.customer).toBe(role === 'customer');
    expect(g.courier).toBe(role === 'courier');
    expect(g.registration || g.signIn || g.onboarding).toBe(false);
  });

  it('opens nothing while loading', () => {
    expect(Object.values(routeGuards({ status: 'loading' }, false)).some(Boolean)).toBe(false);
  });
});
