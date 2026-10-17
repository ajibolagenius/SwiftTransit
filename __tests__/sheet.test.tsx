import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { ReactElement } from 'react';
import { wrapper } from '@/testing/providers';

import { Sheet } from '@/components/ui/sheet';

const renderWith = (element: ReactElement) => render(element, { wrapper });

describe('Sheet', () => {
  // covers: AC-1
  it('shows nothing while closed', async () => {
    await renderWith(
      <Sheet open={false} onDismiss={jest.fn()} title="What would you like to do?" dismissLabel="Close">
        <Text>New delivery</Text>
      </Sheet>,
    );

    expect(screen.queryByText('New delivery')).toBeNull();
    expect(screen.queryByRole('header')).toBeNull();
  });

  // covers: AC-1
  it('shows the title and its content when open', async () => {
    await renderWith(
      <Sheet open onDismiss={jest.fn()} title="What would you like to do?" dismissLabel="Close">
        <Text>New delivery</Text>
      </Sheet>,
    );

    expect(screen.getByRole('header', { name: 'What would you like to do?' })).toBeTruthy();
    expect(screen.getByText('New delivery')).toBeTruthy();
  });

  // covers: AC-3
  it('dismisses when the scrim is tapped', async () => {
    const onDismiss = jest.fn();
    await renderWith(
      <Sheet open onDismiss={onDismiss} title="Book a courier" dismissLabel="Close sheet">
        <Text>Pick-up</Text>
      </Sheet>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Close sheet' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('treats the open sheet as a modal island for screen readers', async () => {
    const { container } = await renderWith(
      <Sheet open onDismiss={jest.fn()} title="Book a courier" dismissLabel="Close sheet" />,
    );

    const modalRoot = container.queryAll((node) => node.props.accessibilityViewIsModal === true);
    expect(modalRoot).toHaveLength(1);
  });
});
