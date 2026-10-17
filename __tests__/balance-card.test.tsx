import { fireEvent, render, screen } from '@testing-library/react-native';

import { BalanceCard } from '@/components/ui/balance-card';

// Urbanist has no U+20A6. iOS substitutes a naira glyph whose ink is wider than its advance, so an
// unspaced "\u20a64" collides. The component separates symbol from digits with U+2009, which Urbanist does have.
describe('BalanceCard currency symbol', () => {
  it('puts a thin space between the naira sign and the amount', async () => {
    const { getByText } = await render(
      <BalanceCard label="Current balance" amount={'\u20a643,050.00'} actionLabel="Top up" />,
    );

    expect(getByText('\u20a6\u200943,050.00')).toBeTruthy();
  });

  it('leaves an amount with no leading symbol untouched', async () => {
    const { getByText } = await render(
      <BalanceCard label="Current balance" amount="43,050.00" actionLabel="Top up" />,
    );

    expect(getByText('43,050.00')).toBeTruthy();
  });

  it('does not add a second space when the symbol is already separated', async () => {
    const { getByText } = await render(
      <BalanceCard label="Current balance" amount={'\u20a6\u002043,050.00'} actionLabel="Top up" />,
    );

    expect(getByText('\u20a6\u002043,050.00')).toBeTruthy();
  });
});

describe('BalanceCard layout and action', () => {
  // covers: AC-1
  it('shows the label and the formatted amount', async () => {
    await render(
      <BalanceCard label="Current balance" amount={'\u20a6\u200943,050.00'} actionLabel="Top up" />,
    );

    expect(screen.getByText('Current balance')).toBeTruthy();
    expect(screen.getByText('\u20a6\u200943,050.00')).toBeTruthy();
  });

  // covers: AC-6
  it('exposes the top up action as a named button', async () => {
    await render(<BalanceCard label="Current balance" amount="\u20a6\u20091,200.00" actionLabel="Top up" />);
    expect(screen.getByRole('button', { name: 'Top up' })).toBeTruthy();
  });

  it('fires the top up handler', async () => {
    const onActionPress = jest.fn();
    await render(
      <BalanceCard
        label="Current balance"
        amount="\u20a6\u20091,200.00"
        actionLabel="Top up"
        onActionPress={onActionPress}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Top up' }));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it('still renders the card with no action wired', async () => {
    await render(<BalanceCard label="Current balance" amount="\u20a6\u20091,200.00" actionLabel="Top up" />);
    expect(screen.getByRole('button', { name: 'Top up' })).toBeTruthy();
  });
});
