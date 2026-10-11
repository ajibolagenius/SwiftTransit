const mockLocales: { languageCode: string | null }[] = [];

jest.mock('expo-localization', () => ({ getLocales: () => mockLocales }));

function loadI18n(languageCode: string | null) {
  mockLocales.splice(0, mockLocales.length, { languageCode });
  let i18n!: typeof import('i18next').default;
  jest.isolateModules(() => {
    i18n = require('@/lib/i18n').default;
  });
  return i18n;
}

describe('i18n', () => {
  // covers: AC-5
  it('serves English strings from locales/en.json', () => {
    expect(loadI18n('en').t('screens.home')).toBe('Home');
  });

  // covers: AC-5
  it('falls back to English for a device language without translations', () => {
    expect(loadI18n('yo').t('screens.orders')).toBe('Orders');
  });

  it('falls back to English when the device reports no language', () => {
    expect(loadI18n(null).t('app.tagline')).toBe('Send Anything, Anywhere, Anytime');
  });

  it('interpolates values without HTML escaping', () => {
    expect(loadI18n('en').t('placeholder.design', { file: 'auth/Welcome & Sign In' })).toBe(
      'Design reference: auth/Welcome & Sign In',
    );
  });
});
