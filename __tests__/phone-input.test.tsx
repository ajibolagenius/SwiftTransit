import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhoneInput } from '@/components/ui/phone-input';

type PhoneProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  helper?: string;
  dialCode?: string;
  countryLabel?: string;
  onPressCountry?: () => void;
};

async function setup(overrides: Partial<PhoneProps> = {}) {
  const props: PhoneProps = { label: 'Phone number', value: '', onChangeText: jest.fn(), ...overrides };
  await render(<PhoneInput {...props} />);
  return props;
}

const field = () => screen.getByLabelText('Phone number, +234');

describe('PhoneInput', () => {
  // covers: AC-1
  it('defaults the country code to Nigeria', async () => {
    await setup();
    expect(screen.getByText('+234')).toBeTruthy();
  });

  // covers: AC-6
  it('names the field with both the label and the dial code', async () => {
    await setup();
    expect(screen.getByLabelText('Phone number, +234')).toBeTruthy();
  });

  it('types the national number through to the caller', async () => {
    const props = await setup();
    await fireEvent.changeText(field(), '8030000000');
    expect(props.onChangeText).toHaveBeenCalledWith('8030000000');
  });

  it('caps the national number at 14 digits', async () => {
    await setup();
    expect(field().props.maxLength).toBe(14);
  });

  it('uses a phone keypad and telephone autofill', async () => {
    await setup();
    expect(field().props.keyboardType).toBe('phone-pad');
    expect(field().props.autoComplete).toBe('tel-national');
  });

  it('shows the helper line while the field is clean', async () => {
    await setup({ helper: 'We send the code here' });
    expect(screen.getByText('We send the code here')).toBeTruthy();
  });

  // covers: AC-7
  it('replaces the helper with an announced error when invalid', async () => {
    await setup({ helper: 'We send the code here', error: 'Number too short' });

    expect(screen.getByText('Number too short').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByText('We send the code here')).toBeNull();
  });

  // covers: AC-1, AC-6
  it('opens the country picker when a handler is wired', async () => {
    const onPressCountry = jest.fn();
    await setup({ countryLabel: 'Nigeria', onPressCountry });

    await fireEvent.press(screen.getByRole('button', { name: 'Nigeria' }));
    expect(onPressCountry).toHaveBeenCalledTimes(1);
  });

  // covers: AC-6
  it('disables the code selector when there is no picker to open', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'Country code +234', disabled: true })).toBeTruthy();
  });

  it('accepts a different dial code', async () => {
    await setup({ dialCode: '+233', countryLabel: 'Ghana' });
    expect(screen.getByText('+233')).toBeTruthy();
    expect(screen.getByLabelText('Phone number, +233')).toBeTruthy();
  });
});
