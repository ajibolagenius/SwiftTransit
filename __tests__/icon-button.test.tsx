import { fireEvent, render, screen } from '@testing-library/react-native';

import { sizedNodes } from '@/testing/sized-nodes';
import { IconButton } from '@/components/ui/icon-button';
import { icons } from '@/components/ui/rune-icon';

describe('IconButton', () => {
  // covers: AC-5
  it('exposes the action name on an icon only control', async () => {
    await render(<IconButton accessibilityLabel="Add package" />);
    expect(screen.getByRole('button', { name: 'Add package' })).toBeTruthy();
  });

  // covers: AC-5
  it('adds no announced node for the icon itself', async () => {
    await render(<IconButton icon={icons.Plus} accessibilityLabel="Add package" />);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<IconButton accessibilityLabel="Go back" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // covers: AC-7
  it('reports disabled and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<IconButton accessibilityLabel="Go back" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Go back', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });

  // covers: AC-4
  it('meets the 44 pt circular target', async () => {
    const { container } = await render(<IconButton accessibilityLabel="Go back" />);
    expect(sizedNodes(container, 44).length).toBeGreaterThan(0);
  });

  it('honours an explicit size override', async () => {
    const { container } = await render(<IconButton accessibilityLabel="Compose" size={52} />);
    expect(sizedNodes(container, 52).length).toBeGreaterThan(0);
  });
});
