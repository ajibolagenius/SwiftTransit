import { routeGuards } from '@/features/auth/guards';

describe('routeGuards', () => {
  it('sends signed-out users to onboarding and sign in only', () => {
    expect(routeGuards({ status: 'signed-out' })).toEqual({
      onboarding: true,
      signIn: true,
      registration: false,
      customer: false,
      courier: false,
    });
  });

  it('sends a signed-in user without a profile to registration only', () => {
    const g = routeGuards({ status: 'signed-in', session: null, role: null });
    expect(g).toMatchObject({
      registration: true,
      signIn: false,
      onboarding: false,
      customer: false,
      courier: false,
    });
  });

  it.each(['customer', 'courier'] as const)('opens only the %s area for that role', (role) => {
    const g = routeGuards({ status: 'signed-in', session: null, role });
    expect(g.customer).toBe(role === 'customer');
    expect(g.courier).toBe(role === 'courier');
    expect(g.registration || g.signIn || g.onboarding).toBe(false);
  });

  it('opens nothing while loading', () => {
    expect(Object.values(routeGuards({ status: 'loading' })).some(Boolean)).toBe(false);
  });
});
