import { fireEvent, render, screen } from '@testing-library/react-native';

import { OtpInput } from '@/components/ui/otp-input';

type OtpProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
};

async function setup(overrides: Partial<OtpProps> = {}) {
  const props: OtpProps = { label: 'Code from SMS', value: '', onChange: jest.fn(), ...overrides };
  await render(<OtpInput {...props} />);
  return props;
}

const field = () => screen.getByLabelText('Code from SMS');

describe('OtpInput', () => {
  // covers: AC-1
  it('offers one accessible field for the six code boxes', async () => {
    await setup();
    expect(screen.getAllByLabelText('Code from SMS')).toHaveLength(1);
  });

  it('keeps the typed digits off the accessibility tree (the boxes are decoration)', async () => {
    await setup({ value: '48' });
    expect(screen.queryByText('4')).toBeNull();
    expect(screen.getAllByText('4', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('strips anything that is not a digit before handing the code up', async () => {
    const props = await setup();
    await fireEvent.changeText(field(), 'a1-2c3');
    expect(props.onChange).toHaveBeenCalledWith('123');
  });

  it('cuts input at six digits', async () => {
    const props = await setup();
    await fireEvent.changeText(field(), '123456789');
    expect(props.onChange).toHaveBeenCalledWith('123456');
  });

  // covers: AC-2
  it('reports completion only when all six digits are in', async () => {
    const onComplete = jest.fn();
    await setup({ onComplete });

    await fireEvent.changeText(field(), '12345');
    expect(onComplete).not.toHaveBeenCalled();

    await fireEvent.changeText(field(), '123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  // covers: AC-7
  it('shows and announces the invalid code message', async () => {
    await setup({ value: '123456', error: 'Wrong code' });
    expect(screen.getByText('Wrong code').props.accessibilityLiveRegion).toBe('polite');
  });

  it('stays numeric and autofill ready', async () => {
    await setup();
    expect(field().props.keyboardType).toBe('number-pad');
    expect(field().props.autoComplete).toBe('sms-otp');
  });

  it('does not grab the keyboard on mount', async () => {
    await setup();
    expect(field().props.autoFocus).not.toBe(true);
  });

  // iOS drops a view under 0.01 alpha from hit testing and from the accessibility tree, so an
  // opacity 0 field can be neither tapped nor read. Only a device can prove that, so this guards
  // the one thing the class list can say wrong. See /debug 2026-10-17.
  it('hides the field through text color, never through opacity', async () => {
    await setup();
    const className: string = field().props.className ?? '';
    expect(className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
    expect(className).toMatch(/text-transparent/);
  });
});
