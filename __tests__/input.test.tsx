import { fireEvent, render, screen } from '@testing-library/react-native';

import { Input } from '@/components/ui/input';
import { icons } from '@/components/ui/rune-icon';

describe('Input', () => {
  // covers: AC-1, AC-6
  it('shows the label and names the field after it', async () => {
    await render(<Input label="Email address" value="" onChangeText={jest.fn()} />);

    expect(screen.getByText('Email address')).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
  });

  it('types through to the caller', async () => {
    const onChangeText = jest.fn();
    await render(<Input label="Email address" value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Email address'), 'ade@example.com');
    expect(onChangeText).toHaveBeenCalledWith('ade@example.com');
  });

  it('shows the helper line when there is no error', async () => {
    await render(<Input label="Email" value="" helper="We never share it" onChangeText={jest.fn()} />);
    expect(screen.getByText('We never share it')).toBeTruthy();
  });

  // covers: AC-7
  it('replaces the helper with the error text when invalid', async () => {
    await render(
      <Input
        label="Email"
        value=""
        helper="We never share it"
        error="Enter a valid email"
        onChangeText={jest.fn()}
      />,
    );

    expect(screen.getByText('Enter a valid email')).toBeTruthy();
    expect(screen.queryByText('We never share it')).toBeNull();
  });

  // covers: AC-7
  it('announces the error to a screen reader as a live region', async () => {
    await render(<Input label="Email" value="" error="Required" onChangeText={jest.fn()} />);
    expect(screen.getByText('Required').props.accessibilityLiveRegion).toBe('polite');
  });

  // covers: AC-7
  it('reports the disabled state when not editable', async () => {
    await render(<Input label="Tracking number" value="ST-1042" editable={false} onChangeText={jest.fn()} />);

    const field = screen.getByLabelText('Tracking number');
    expect(field.props.accessibilityState).toMatchObject({ disabled: true });
    expect(field.props.editable).toBe(false);
  });

  it('keeps the leading icon out of the accessibility tree', async () => {
    await render(<Input label="Email" icon={icons.Mail} value="" onChangeText={jest.fn()} />);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
  });
});
