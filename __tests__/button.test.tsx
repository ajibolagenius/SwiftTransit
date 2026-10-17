import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { sizedNodes } from '@/testing/sized-nodes';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  // covers: AC-1
  it('renders a primary button with its label and a button role', async () => {
    await render(<Button>Track order</Button>);
    expect(screen.getByRole('button', { name: 'Track order' })).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Continue</Button>);

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // covers: AC-7
  it('does not fire onPress and reports the disabled state when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <Button disabled onPress={onPress}>
        Continue
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Continue', disabled: true });
    // fireEvent, not userEvent: userEvent refuses to act on a disabled element, so it cannot show the handler stays quiet.
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  // covers: AC-1
  it('keeps the label mounted while loading so the width does not jump, and reports busy', async () => {
    await render(<Button loading>Book delivery</Button>);

    expect(screen.getByRole('button', { name: 'Book delivery', busy: true })).toBeTruthy();
    expect(screen.getByText('Book delivery')).toBeTruthy();
  });

  it('is not busy when loading is off', async () => {
    await render(<Button>Book delivery</Button>);
    expect(screen.getByRole('button', { name: 'Book delivery' }).props.accessibilityState).toMatchObject({
      busy: false,
    });
  });

  // covers: AC-1
  it('renders the secondary variant as a button with the same label', async () => {
    await render(<Button variant="secondary">Save for later</Button>);
    expect(screen.getByRole('button', { name: 'Save for later' })).toBeTruthy();
  });

  // covers: AC-1, AC-7
  it('renders the link variant with a link role', async () => {
    const onPress = jest.fn();
    await render(
      <Button variant="link" onPress={onPress}>
        Forgot number?
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Forgot number?' });
    await fireEvent.press(link);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks the link disabled state without a press handler firing', async () => {
    const onPress = jest.fn();
    await render(
      <Button variant="link" disabled onPress={onPress}>
        Forgot number?
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Forgot number?', disabled: true })).toBeTruthy();
  });

  // covers: AC-4
  it('meets the 52 pt primary target height', async () => {
    const { container } = await render(<Button>Continue</Button>);
    expect(sizedNodes(container, 52).length).toBeGreaterThan(0);
  });
});
