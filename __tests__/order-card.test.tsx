import { fireEvent, render, screen } from '@testing-library/react-native';

import { OrderCard } from '@/components/ui/order-card';

const props = {
  title: 'Laptop to Ikoyi',
  trackingId: 'ST-1042',
  trackingLabel: 'Tracking',
  etaLabel: 'Arrives',
  etaValue: '35 min',
};

describe('OrderCard', () => {
  // covers: AC-1
  it('shows the title and both metadata pairs', async () => {
    await render(<OrderCard {...props} />);

    expect(screen.getByText('Laptop to Ikoyi')).toBeTruthy();
    expect(screen.getByText('Tracking')).toBeTruthy();
    expect(screen.getByText('ST-1042')).toBeTruthy();
    expect(screen.getByText('Arrives')).toBeTruthy();
    expect(screen.getByText('35 min')).toBeTruthy();
  });

  // covers: AC-6
  it('announces the whole card as one labelled control', async () => {
    await render(<OrderCard {...props} />);
    expect(
      screen.getByRole('button', { name: 'Laptop to Ikoyi, Tracking ST-1042, Arrives 35 min' }),
    ).toBeTruthy();
  });

  it('opens the order on tap', async () => {
    const onPress = jest.fn();
    await render(<OrderCard {...props} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // covers: AC-1, AC-6
  it('offers the overflow menu only when it has a label and an action', async () => {
    const onOverflowPress = jest.fn();
    const { rerender } = await render(<OrderCard {...props} />);
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();

    await rerender(<OrderCard {...props} overflowLabel="More options" onOverflowPress={onOverflowPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    expect(onOverflowPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the card itself as the only navigation control when overflow is absent', async () => {
    await render(<OrderCard {...props} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
