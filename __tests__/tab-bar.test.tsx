import { fireEvent, render, screen } from '@testing-library/react-native';
import { Home, Package, User, Wallet } from 'lucide-react-native';

import { sizedNodes } from '@/testing/sized-nodes';
import { wrapper } from '@/testing/providers';
import type { ReactElement } from 'react';
import { TabBar, type TabBarItem } from '@/components/ui/tab-bar';

const items: TabBarItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'profile', label: 'Profile', icon: User },
];

const renderWith = (element: ReactElement) => render(element, { wrapper });

describe('TabBar', () => {
  // covers: AC-1
  it('renders every tab label', async () => {
    await renderWith(<TabBar items={items} activeKey="home" onSelect={jest.fn()} />);
    for (const label of ['Home', 'Orders', 'Wallet', 'Profile']) expect(screen.getByText(label)).toBeTruthy();
  });

  // covers: AC-6
  it('marks only the active tab as selected', async () => {
    await renderWith(<TabBar items={items} activeKey="orders" onSelect={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Orders', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Home' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  // covers: AC-10
  it('reports the tapped tab key', async () => {
    const onSelect = jest.fn();
    await renderWith(<TabBar items={items} activeKey="home" onSelect={onSelect} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Wallet' }));
    expect(onSelect).toHaveBeenCalledWith('wallet');
  });

  // covers: AC-11
  it('raises the centre action and fires its own handler', async () => {
    const onSelect = jest.fn();
    const onFab = jest.fn();
    const { container } = await renderWith(
      <TabBar
        items={items}
        activeKey="home"
        onSelect={onSelect}
        fab={{ label: 'New delivery', onPress: onFab }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'New delivery' }));
    expect(onFab).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(sizedNodes(container, 52)).toHaveLength(1);
  });

  it('splits four tabs around the centre action', async () => {
    await renderWith(
      <TabBar
        items={items}
        activeKey="home"
        onSelect={jest.fn()}
        fab={{ label: 'New delivery', onPress: jest.fn() }}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  // covers: AC-11
  it('shows no centre action when none is asked for', async () => {
    await renderWith(<TabBar items={items} activeKey="home" onSelect={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  // covers: AC-5
  it('keeps tab icons decorative', async () => {
    await renderWith(<TabBar items={items} activeKey="home" onSelect={jest.fn()} />);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
  });
});
