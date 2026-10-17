import { fireEvent, render, screen } from '@testing-library/react-native';
import { Home, Package, User, Wallet } from 'lucide-react-native';

import type { ReactElement } from 'react';
import { wrapper } from '@/testing/providers';

import { RoleTabs } from '@/components/role-tabs';
import '@/lib/i18n'; // initialises the real English resources for useTranslation

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// mock-prefixed so the hoisted jest.mock factory may reach them (jest out-of-scope guard)
const mockState = { routes: [{ key: 'k1', name: 'home' }], index: 0 };
const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');

  const Tabs = ({ tabBar }: { tabBar: (props: unknown) => React.ReactNode }) =>
    React.createElement(
      React.Fragment,
      null,
      tabBar({ state: mockState, navigation: { navigate: mockNavigate } }),
    );
  (Tabs as unknown as { Screen: unknown }).Screen = () => null;

  return { Tabs, useRouter: () => ({ push: mockPush }) };
});

const renderWith = (element: ReactElement) => render(element, { wrapper });

const tabs = [
  { name: 'home', title: 'home' as const, icon: Home },
  { name: 'orders', title: 'orders' as const, icon: Package },
  { name: 'wallet', title: 'wallet' as const, icon: Wallet },
  { name: 'profile', title: 'profile' as const, icon: User },
];

beforeEach(() => {
  mockState.routes = [
    { key: 'k1', name: 'home' },
    { key: 'k2', name: 'orders' },
    { key: 'k3', name: 'wallet' },
    { key: 'k4', name: 'profile' },
  ];
  mockState.index = 0;
  mockNavigate.mockClear();
  mockPush.mockClear();
});

describe('RoleTabs', () => {
  // covers: AC-10
  it('shows the translated tab labels from the route state', async () => {
    await renderWith(<RoleTabs tabs={tabs} />);

    for (const label of ['Home', 'Orders', 'Wallet', 'Profile']) expect(screen.getByText(label)).toBeTruthy();
  });

  // covers: AC-10
  it('selects the route the navigator reports as active', async () => {
    mockState.index = 2;
    await renderWith(<RoleTabs tabs={tabs} />);

    expect(screen.getByRole('button', { name: 'Wallet', selected: true })).toBeTruthy();
  });

  // covers: AC-10
  it('navigates to the tapped route', async () => {
    await renderWith(<RoleTabs tabs={tabs} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Orders' }));
    expect(mockNavigate).toHaveBeenCalledWith('orders');
  });

  // covers: AC-10
  it('pushes the centre action route for a customer', async () => {
    await renderWith(<RoleTabs tabs={tabs} fab={{ label: 'actionSheet', route: '/action' }} />);

    await fireEvent.press(screen.getByRole('button', { name: 'What would you like to do?' }));
    expect(mockPush).toHaveBeenCalledWith('/action');
  });

  // covers: AC-11
  it('shows no centre action for a courier', async () => {
    await renderWith(<RoleTabs tabs={tabs} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('drops routes with no tab config', async () => {
    mockState.routes = [
      { key: 'k1', name: 'home' },
      { key: 'kx', name: 'mystery' },
    ];
    await renderWith(<RoleTabs tabs={tabs} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('Home')).toBeTruthy();
  });
});
